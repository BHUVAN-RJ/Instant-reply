import { describe, expect, it } from "vitest";
import {
  EMPTY_VOICE,
  createAgent,
  type AgentEvent,
  type LlmMessage,
  type Store,
  type Thread,
  type ThreadSession,
} from "../src";

function memoryStore(): Store {
  const sessions = new Map<string, ThreadSession>();
  let voice = EMPTY_VOICE;
  return {
    getSession: async (id) => sessions.get(id),
    saveSession: async (s) => void sessions.set(s.threadId, structuredClone(s)),
    getVoice: async () => voice,
    saveVoice: async (v) => void (voice = v),
  };
}

const thread: Thread = {
  id: "thread-f:1",
  source: "test",
  subject: "Demo",
  userEmail: "me@example.com",
  messages: [{ from: "Kenisha <k@example.com>", to: ["me@example.com"], date: "Sep 23", body: "Oct 1?", fromUser: false }],
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("agent", () => {
  it("drafts with thread, context and history, then records the turn", async () => {
    const calls: LlmMessage[][] = [];
    const events: AgentEvent[] = [];
    const agent = createAgent({
      store: memoryStore(),
      llm: { complete: async (messages) => (calls.push(messages), `draft ${calls.length}`) },
      contextProviders: [
        { id: "job-app", getContext: async () => "Applied for Demo Engineer" },
        { id: "irrelevant", getContext: async () => null },
        { id: "broken", getContext: async () => Promise.reject(new Error("down")) },
      ],
      eventSinks: [{ id: "spy", handle: (e) => void events.push(e) }],
    });

    expect(await agent.draft({ thread, boxText: "confirm Oct 1" })).toEqual({ draft: "draft 1" });
    const system = calls[0][0].content;
    expect(system).toContain("Oct 1?");
    expect(system).toContain("Context from job-app:\nApplied for Demo Engineer");
    expect(system).not.toContain("irrelevant");

    await agent.draft({ thread, boxText: "shorter" });
    expect(calls[1].map((m) => m.role)).toEqual(["system", "user", "assistant", "user"]);
    expect(calls[1][2].content).toBe("draft 1");

    await flush();
    expect(events.map((e) => e.type)).toEqual(["draft-created", "draft-created"]);
  });

  it("toggles threads and announces it", async () => {
    const events: AgentEvent[] = [];
    const agent = createAgent({
      store: memoryStore(),
      llm: { complete: async () => "" },
      eventSinks: [{ id: "spy", handle: (e) => void events.push(e) }],
    });
    expect((await agent.setActive("t", true)).active).toBe(true);
    expect((await agent.getSession("t"))?.active).toBe(true);
    await agent.setActive("t", false);
    await flush();
    expect(events.map((e) => e.type)).toEqual(["thread-activated", "thread-deactivated"]);
  });

  it("does not wait forever on a slow context provider", async () => {
    const agent = createAgent({
      store: memoryStore(),
      llm: { complete: async () => "ok" },
      contextProviders: [{ id: "slow", getContext: () => new Promise(() => {}) }],
      contextTimeoutMs: 20,
    });
    expect(await agent.draft({ thread, boxText: "hi" })).toEqual({ draft: "ok" });
  });
});
