import type { AgentEvent, ChatTurn, DraftRequest, DraftResult, Thread, ThreadSession, VoiceProfile, VoiceSignal } from "./contracts";
import { EMPTY_VOICE } from "./contracts";
import { buildLearnMessages, buildVoiceChatMessages, normalizeText, parseVoiceChat, revisionSignalsFromHistory, stripFence } from "./learn";
import type { ContextProvider, EventSink, LlmProvider, Store } from "./ports";
import { buildMessages, fillNamePlaceholders, stripDashes, withComments } from "./prompt";

export interface AgentDeps {
  store: Store;
  llm: LlmProvider;
  contextProviders?: ContextProvider[];
  eventSinks?: EventSink[];
  /** Recent turns kept per thread so revisions make sense without growing forever. */
  maxHistoryTurns?: number;
  /** A slow or broken provider must never block a draft. */
  contextTimeoutMs?: number;
  /** Learn the user's voice from what they do with drafts. On unless the user turned it off. */
  learning?: boolean;
  /** Fold pending signals into the notes once this many are waiting. */
  learnAfter?: number;
  now?: () => number;
}

const MAX_PENDING = 40;
const SIGNALS_PER_LEARN = 20;
const VOICE_CHAT_TURNS = 20;

export interface Agent {
  getSession(threadId: string): Promise<ThreadSession | undefined>;
  setActive(threadId: string, active: boolean): Promise<ThreadSession>;
  draft(request: DraftRequest): Promise<DraftResult>;
  /** The user sent the reply box of a thread; compares it with the last draft. */
  recordSent(threadId: string, sentText: string): Promise<void>;
  getVoice(): Promise<VoiceProfile>;
  /** Folds waiting signals (and, the first time, older drafts) into the notes. */
  learn(): Promise<VoiceProfile>;
  /** The settings page chat: answers questions and rewrites the notes when asked. */
  chatAboutVoice(message: string): Promise<{ reply: string; changed: boolean; voice: VoiceProfile }>;
  /** Forgets everything learned and said about the voice. */
  resetVoice(): Promise<VoiceProfile>;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => (clearTimeout(timer), resolve(value)),
      (error) => (clearTimeout(timer), reject(error)),
    );
  });
}

export function createAgent(deps: AgentDeps): Agent {
  const { store, llm } = deps;
  const providers = deps.contextProviders ?? [];
  const sinks = deps.eventSinks ?? [];
  const maxHistoryTurns = deps.maxHistoryTurns ?? 20;
  const contextTimeoutMs = deps.contextTimeoutMs ?? 3000;
  const now = deps.now ?? Date.now;
  const learning = deps.learning ?? true;
  const learnAfter = deps.learnAfter ?? 3;

  /** Sinks run in the background; one failing sink never affects the agent or other sinks. */
  function emit(event: AgentEvent): void {
    for (const sink of sinks) {
      Promise.resolve()
        .then(() => sink.handle(event))
        .catch((error) => console.error(`[instant-reply] event sink ${sink.id} failed`, error));
    }
  }

  async function gatherContext(thread: Thread): Promise<{ id: string; text: string }[]> {
    const results = await Promise.allSettled(
      providers.map(async (p) => ({ id: p.id, text: await withTimeout(p.getContext(thread), contextTimeoutMs) })),
    );
    return results.flatMap((result, i) => {
      if (result.status === "rejected") {
        console.error(`[instant-reply] context provider ${providers[i].id} failed`, result.reason);
        return [];
      }
      return result.value.text ? [{ id: result.value.id, text: result.value.text }] : [];
    });
  }

  function emptySession(threadId: string): ThreadSession {
    return { threadId, active: true, history: [], updatedAt: 0 };
  }

  const loadVoice = () => store.getVoice().catch(() => EMPTY_VOICE);
  const lastDraft = (history: ChatTurn[]) => [...history].reverse().find((t) => t.role === "assistant");

  let learningNow: Promise<VoiceProfile> | null = null;

  async function learnOnce(): Promise<VoiceProfile> {
    const voice = await loadVoice();
    let pending = voice.pending;
    if (!voice.backfilled && store.listSessions) {
      const old = (await store.listSessions()).flatMap((s) => revisionSignalsFromHistory(s.history));
      // Signals captured since learning started are already pending; keep the older ones only.
      const seen = new Set(pending.map((p) => p.at));
      pending = [...old.filter((o) => !seen.has(o.at)), ...pending].sort((a, b) => a.at - b.at);
    }
    if (pending.length === 0) {
      const done = { ...voice, backfilled: true };
      await store.saveVoice(done);
      return done;
    }
    const batch = pending.slice(-SIGNALS_PER_LEARN);
    const notes = stripFence(await llm.complete(buildLearnMessages(voice.notes, batch)));
    if (!notes) throw new Error("learning returned empty notes");
    // Re-read so signals added while the model was thinking are kept.
    const latest = await loadVoice();
    const learnedAt = new Set(batch.map((b) => b.at));
    const next: VoiceProfile = {
      ...latest,
      notes,
      pending: latest.pending.filter((p) => !learnedAt.has(p.at)),
      learnedCount: (latest.learnedCount ?? 0) + batch.length,
      backfilled: true,
      updatedAt: now(),
    };
    await store.saveVoice(next);
    return next;
  }

  function learn(): Promise<VoiceProfile> {
    learningNow ??= learnOnce().finally(() => (learningNow = null));
    return learningNow;
  }

  async function addSignal(signal: VoiceSignal): Promise<void> {
    if (!learning) return;
    const voice = await loadVoice();
    const pending = [...voice.pending, signal].slice(-MAX_PENDING);
    await store.saveVoice({ ...voice, pending });
    if (pending.length >= learnAfter) {
      learn().catch((error) => console.error("[instant-reply] learning failed", error));
    }
  }

  return {
    getSession: (threadId) => store.getSession(threadId),

    async setActive(threadId, active) {
      const session = (await store.getSession(threadId)) ?? emptySession(threadId);
      session.active = active;
      session.updatedAt = now();
      await store.saveSession(session);
      emit({ type: active ? "thread-activated" : "thread-deactivated", threadId, at: session.updatedAt });
      return session;
    },

    async draft({ thread, boxText: text, comments }) {
      // Comments travel as part of the box, so history and learning see them like any change request.
      const boxText = withComments(text, comments);
      const session = (await store.getSession(thread.id)) ?? emptySession(thread.id);
      const [voice, context] = await Promise.all([store.getVoice().catch(() => EMPTY_VOICE), gatherContext(thread)]);

      const raw = await llm.complete(
        buildMessages({
          thread,
          boxText,
          history: session.history,
          voice,
          threadToneNotes: session.threadToneNotes,
          context,
        }),
      );
      const draft = fillNamePlaceholders(stripDashes(raw), thread.userName);

      const at = now();
      const previous = lastDraft(session.history);
      session.history = [
        ...session.history,
        { role: "user" as const, content: boxText, createdAt: at },
        { role: "assistant" as const, content: draft, createdAt: at },
      ].slice(-maxHistoryTurns);
      session.updatedAt = at;
      await store.saveSession(session);
      emit({ type: "draft-created", thread, boxText, draft, at });
      if (previous && normalizeText(previous.content) !== normalizeText(boxText)) {
        await addSignal({ kind: "revision-request", draft: previous.content, instruction: boxText, at });
      }
      return { draft };
    },

    async recordSent(threadId, sentText) {
      const at = now();
      emit({ type: "email-sent", threadId, sentText, at });
      const session = await store.getSession(threadId);
      const draft = session && lastDraft(session.history);
      if (!session || !draft || session.sentDraftAt === draft.createdAt) return;
      session.sentDraftAt = draft.createdAt;
      await store.saveSession(session);
      if (normalizeText(draft.content) !== normalizeText(sentText)) {
        await addSignal({ kind: "sent-diff", draft: draft.content, sent: sentText, at });
      }
    },

    getVoice: loadVoice,

    learn,

    async chatAboutVoice(message) {
      const voice = await loadVoice();
      const { reply, notes } = parseVoiceChat(await llm.complete(buildVoiceChatMessages(voice, message)));
      const at = now();
      const changed = notes !== null && notes !== voice.notes;
      const next: VoiceProfile = {
        ...voice,
        notes: changed ? notes : voice.notes,
        updatedAt: changed ? at : voice.updatedAt,
        chat: [
          ...(voice.chat ?? []),
          { role: "user" as const, content: message, createdAt: at },
          { role: "assistant" as const, content: reply, createdAt: at },
        ].slice(-VOICE_CHAT_TURNS),
      };
      await store.saveVoice(next);
      return { reply, changed, voice: next };
    },

    async resetVoice() {
      // Stays marked as backfilled, so old drafts are not learned again after a reset.
      const empty: VoiceProfile = { ...EMPTY_VOICE, pending: [], backfilled: true, updatedAt: now() };
      await store.saveVoice(empty);
      return empty;
    },
  };
}
