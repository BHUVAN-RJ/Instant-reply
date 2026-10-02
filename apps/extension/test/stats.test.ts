import { describe, expect, it, vi } from "vitest";
import { createStats, type StatsDeps, type StatsState } from "../src/stats";

// Usage counts: what is counted, what is sent, and that a failed send is kept for later.

function setup(overrides: Partial<StatsDeps> = {}) {
  let stored: Partial<StatsState> | undefined;
  let n = 0;
  const posts: { url: string; body: any }[] = [];
  const fetch = vi.fn(async (url: string, init: RequestInit) => {
    posts.push({ url, body: JSON.parse(String(init.body)) });
    return new Response('{"ok":true}', { status: 200 });
  });
  const stats = createStats({
    url: "https://script.google.com/macros/s/x/exec",
    load: async () => stored && structuredClone(stored),
    save: async (state) => void (stored = structuredClone(state)),
    fallbackName: async () => "Sam Lee",
    fetch: fetch as unknown as typeof globalThis.fetch,
    now: () => 1000,
    randomId: () => `id-${++n}`,
    ...overrides,
  });
  return { stats, posts, fetch, state: () => stored as StatsState };
}

describe("stats", () => {
  it("counts Refactors per email and sends counts only", async () => {
    const { stats, posts, state } = setup();
    await stats.record("refactor", "thread-a");
    await stats.record("refactor", "thread-a");
    await stats.record("refactor", "thread-b");
    await stats.record("sent", "thread-a");

    const events = posts.flatMap((p) => p.body.events);
    expect(events.map((e: any) => [e.kind, e.refactors])).toEqual([
      ["refactor", 1],
      ["refactor", 2],
      ["refactor", 1],
      ["sent", 2],
    ]);
    expect(events[0].email).toBe(events[1].email);
    expect(events[0].email).not.toBe(events[2].email);
    expect(events[0].email).not.toContain("thread");
    expect(posts[0].body).toMatchObject({ install: "id-1", name: "Sam Lee" });
    expect(state().totals).toEqual({ refactors: 3, sent: 1 });
    expect(state().queue).toEqual([]);
  });

  it("starts the count again for the next reply in the same thread", async () => {
    const { stats, posts } = setup();
    await stats.record("refactor", "t");
    await stats.record("sent", "t");
    await stats.record("sent", "t");
    expect(posts.at(-1)!.body.events.at(-1)).toMatchObject({ kind: "sent", refactors: 0 });
  });

  it("keeps events when sending fails and sends them with the next one", async () => {
    let fail = true;
    const { stats, posts } = setup({
      fetch: (async (_url: string, init: RequestInit) => {
        if (fail) throw new Error("offline");
        posts.push({ url: "", body: JSON.parse(String(init.body)) });
        return new Response('{"ok":true}');
      }) as unknown as typeof fetch,
    });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await stats.record("refactor", "t");
    expect((await stats.get()).queue).toHaveLength(1);
    fail = false;
    await stats.record("sent", "t");
    expect(posts).toHaveLength(1);
    expect(posts[0].body.events).toHaveLength(2);
    expect((await stats.get()).queue).toEqual([]);
  });

  it("keeps events when Apps Script answers with an error page", async () => {
    const { stats } = setup({
      fetch: (async () => new Response("<html>Error</html>", { status: 200 })) as unknown as typeof fetch,
    });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await stats.record("refactor", "t");
    expect((await stats.get()).queue).toHaveLength(1);
  });

  it("sends nothing when sharing is off or there is no URL, but still counts", async () => {
    const off = setup();
    await off.stats.update({ sharing: false });
    await off.stats.record("refactor", "t");
    expect(off.fetch).not.toHaveBeenCalled();
    expect(off.state().totals.refactors).toBe(1);

    const noUrl = setup({ url: "" });
    await noUrl.stats.record("refactor", "t");
    expect(noUrl.fetch).not.toHaveBeenCalled();
    expect(noUrl.state().queue).toEqual([]);
  });

  it("uses the typed name over Gmail's", async () => {
    const { stats, posts } = setup();
    await stats.update({ name: "Sammy" });
    await stats.record("refactor", "t");
    expect(posts[0].body.name).toBe("Sammy");
  });

  it("listens to the agent's draft and send events", async () => {
    const { stats, state } = setup();
    await stats.sink.handle({ type: "draft-created", thread: { id: "t" } as any, boxText: "", draft: "", at: 1 });
    await stats.sink.handle({ type: "email-sent", threadId: "t", sentText: "", at: 2 });
    await stats.sink.handle({ type: "thread-activated", threadId: "t", at: 3 });
    expect(state().totals).toEqual({ refactors: 1, sent: 1 });
  });
});
