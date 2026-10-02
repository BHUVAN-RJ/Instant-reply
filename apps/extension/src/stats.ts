import type { AgentEvent, EventSink } from "@instant-reply/core";

// Usage counts shared with the person who handed out this copy: every Refactor and every send from a
// reply box that is on. Only counts leave the computer: a random install id, the name below, the kind,
// when, and a salted hash of the reply box's id so Refactors can be counted per email. Never any email
// text, address, subject or the API key. Events queue in storage and are sent to a Google Apps Script
// (docs/STATS.md); a failed send waits for the next event. Totals are also kept here for the popup.

export const STATS_OWNER = "Bhuvan";

export interface StatsEvent {
  id: string;
  at: number;
  kind: "refactor" | "sent";
  /** Salted hash of the reply box's thread id. */
  email: string;
  /** Refactor: which Refactor this is on the email (1, 2, ...). Sent: Refactors before this send. */
  refactors: number;
}

export interface StatsState {
  install: string;
  /** Name shown in the sheet. Empty means the name Gmail shows for the account. */
  name: string;
  /** Sharing can be turned off in the popup; totals still count. */
  sharing: boolean;
  totals: { refactors: number; sent: number };
  /** Refactors per email since its last send. */
  open: Record<string, number>;
  queue: StatsEvent[];
}

export const STATS_KEY = "stats";
const MAX_QUEUE = 500;

export interface StatsDeps {
  load(): Promise<Partial<StatsState> | undefined>;
  save(state: StatsState): Promise<void>;
  /** Apps Script web app URL; empty turns sharing off. */
  url: string;
  /** The name Gmail shows, used when no name is set. */
  fallbackName(): Promise<string>;
  fetch?: typeof fetch;
  now?: () => number;
  randomId?: () => string;
}

export interface Stats {
  sink: EventSink;
  record(kind: StatsEvent["kind"], threadId: string): Promise<void>;
  flush(): Promise<void>;
  get(): Promise<StatsState>;
  update(change: Partial<Pick<StatsState, "name" | "sharing">>): Promise<StatsState>;
}

async function hash(text: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
  return Array.from(bytes.slice(0, 8), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function createStats(deps: StatsDeps): Stats {
  const now = deps.now ?? Date.now;
  const randomId = deps.randomId ?? (() => crypto.randomUUID());
  const doFetch = deps.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  // Events can arrive together; every read and write of the state goes through this chain.
  let chain: Promise<unknown> = Promise.resolve();
  const serial = <T>(task: () => Promise<T>): Promise<T> => {
    const next = chain.then(task, task);
    chain = next.catch(() => undefined);
    return next;
  };

  async function load(): Promise<StatsState> {
    const stored = (await deps.load()) ?? {};
    const state: StatsState = {
      install: "",
      name: "",
      sharing: true,
      totals: { refactors: 0, sent: 0 },
      open: {},
      queue: [],
      ...stored,
    };
    if (!state.install) {
      state.install = randomId();
      await deps.save(state);
    }
    return state;
  }

  const sharingOn = (state: StatsState) => Boolean(deps.url) && state.sharing;

  async function record(kind: StatsEvent["kind"], threadId: string): Promise<void> {
    await serial(async () => {
      const state = await load();
      const email = await hash(`${state.install}:${threadId}`);
      let refactors: number;
      if (kind === "refactor") {
        refactors = (state.open[email] ?? 0) + 1;
        state.open[email] = refactors;
        state.totals.refactors += 1;
      } else {
        refactors = state.open[email] ?? 0;
        delete state.open[email];
        state.totals.sent += 1;
      }
      if (sharingOn(state)) {
        state.queue = [...state.queue, { id: randomId(), at: now(), kind, email, refactors }].slice(-MAX_QUEUE);
      }
      await deps.save(state);
    });
    await flush();
  }

  /** Sends the whole queue in one request; the queue is cleared only when the script took it. */
  async function flush(): Promise<void> {
    await serial(async () => {
      const state = await load();
      if (!sharingOn(state) || state.queue.length === 0) return;
      const sending = state.queue;
      const body = JSON.stringify({
        install: state.install,
        name: state.name.trim() || (await deps.fallbackName()) || "unknown",
        events: sending,
      });
      try {
        // text/plain keeps it a simple request; Apps Script answers through a redirect fetch follows.
        const response = await doFetch(deps.url, { method: "POST", headers: { "Content-Type": "text/plain" }, body });
        // Apps Script can answer a failure with an HTML error page and status 200; only its own JSON counts.
        const answer = response.ok ? await response.json().catch(() => null) : null;
        if (answer?.ok !== true) throw new Error(`stats endpoint answered ${response.status} without ok`);
      } catch (error) {
        console.warn("[instant-reply] stats not sent, will retry", error);
        return;
      }
      const sent = new Set(sending.map((e) => e.id));
      state.queue = state.queue.filter((e) => !sent.has(e.id));
      await deps.save(state);
    });
  }

  return {
    sink: {
      id: "stats",
      handle(event: AgentEvent) {
        if (event.type === "draft-created") return record("refactor", event.thread.id);
        if (event.type === "email-sent") return record("sent", event.threadId);
      },
    },
    record,
    flush,
    get: () => serial(load),
    update: (change) =>
      serial(async () => {
        const state = { ...(await load()), ...change };
        if (!state.sharing) state.queue = [];
        await deps.save(state);
        return state;
      }),
  };
}

/** Whether this build was made with a stats URL (VITE_STATS_URL). */
export const STATS_URL: string = import.meta.env.VITE_STATS_URL ?? "";
