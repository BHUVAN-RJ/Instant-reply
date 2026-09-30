import { describe, expect, it } from "vitest";
import {
  EMPTY_VOICE,
  createAgent,
  parseVoiceChat,
  type LlmMessage,
  type Store,
  type Thread,
  type ThreadSession,
  type VoiceProfile,
} from "../src";

function memoryStore(sessions: ThreadSession[] = []): Store & { voice: () => VoiceProfile } {
  const map = new Map(sessions.map((s) => [s.threadId, s]));
  let voice: VoiceProfile = EMPTY_VOICE;
  return {
    voice: () => voice,
    getSession: async (id) => structuredClone(map.get(id)),
    saveSession: async (s) => void map.set(s.threadId, structuredClone(s)),
    getVoice: async () => structuredClone(voice),
    saveVoice: async (v) => void (voice = structuredClone(v)),
    listSessions: async () => [...map.values()].map((s) => structuredClone(s)),
  };
}

const thread: Thread = { id: "t1", source: "test", subject: "Hi", userEmail: "me@example.com", messages: [] };
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("voice learning", () => {
  it("records a revision request when the box differs from the last draft", async () => {
    const store = memoryStore();
    let n = 0;
    const agent = createAgent({ store, llm: { complete: async () => `draft ${++n}` }, now: () => n });
    await agent.draft({ thread, boxText: "say yes" });
    await agent.draft({ thread, boxText: "draft 1" }); // unchanged: no signal
    await agent.draft({ thread, boxText: "draft 2 but warmer" });
    expect(store.voice().pending).toEqual([{ kind: "revision-request", draft: "draft 2", instruction: "draft 2 but warmer", at: 3 }]);
  });

  it("records a sent diff once per draft and ignores sends without a draft", async () => {
    const store = memoryStore();
    let clock = 0;
    const agent = createAgent({ store, llm: { complete: async () => "Hello there" }, now: () => ++clock });
    await agent.recordSent("t1", "no draft yet");
    expect(store.voice().pending).toHaveLength(0);
    await agent.draft({ thread, boxText: "greet" });
    await agent.recordSent("t1", "Hello  there"); // same after whitespace
    await agent.draft({ thread, boxText: "greet again" });
    await agent.recordSent("t1", "Hey!");
    await agent.recordSent("t1", "Hey! (sent twice)");
    expect(store.voice().pending.map((s) => s.kind)).toEqual(["revision-request", "sent-diff"]);
  });

  it("learns a sign-off the user fixed by hand before sending, and uses it in later drafts", async () => {
    const store = memoryStore();
    const prompts: LlmMessage[][] = [];
    const agent = createAgent({
      store,
      learnAfter: 1,
      llm: {
        complete: async (m) => {
          prompts.push(m);
          if (m[0].content.includes("You maintain the notes")) return "## Rules you asked for\n- Sign off with just Bhuvan.";
          return "Not interested, thanks.\n\nThank you,\nBhuvan Rajanahally Jayakumar";
        },
      },
    });
    await agent.draft({ thread, boxText: "decline" });
    await agent.recordSent("t1", "Not interested, thanks.\n\nThank you,\nBhuvan");
    await flush();
    await flush();

    const learnPrompt = prompts.find((m) => m[0].content.includes("You maintain the notes"))!;
    const shown = learnPrompt.map((m) => m.content).join("\n");
    expect(shown).toContain("Bhuvan Rajanahally Jayakumar");
    expect(shown).toMatch(/Thank you,\nBhuvan(?! Raj)/);
    expect(store.voice().notes).toContain("Sign off with just Bhuvan.");

    await agent.draft({ thread, boxText: "decline another" });
    const lastDraftPrompt = prompts.filter((m) => m[0].content.startsWith("You are Instant Reply")).at(-1)!;
    expect(lastDraftPrompt[0].content).toContain("Sign off with just Bhuvan.");
  });

  it("does nothing when learning is off", async () => {
    const store = memoryStore();
    const agent = createAgent({ store, llm: { complete: async () => "d" }, learning: false });
    await agent.draft({ thread, boxText: "a" });
    await agent.draft({ thread, boxText: "b" });
    expect(store.voice().pending).toHaveLength(0);
  });

  it("learns from pending signals and older sessions, then clears them", async () => {
    const old: ThreadSession = {
      threadId: "old",
      active: true,
      updatedAt: 1,
      history: [
        { role: "user", content: "reply yes", createdAt: 1 },
        { role: "assistant", content: "Dear Sir, yes.", createdAt: 1 },
        { role: "user", content: "less formal", createdAt: 2 },
        { role: "assistant", content: "Hey, yes!", createdAt: 2 },
      ],
    };
    const store = memoryStore([old]);
    const calls: LlmMessage[][] = [];
    const agent = createAgent({ store, llm: { complete: async (m) => (calls.push(m), "```\n## About you\n- Casual\n```") } });
    const voice = await agent.learn();
    expect(voice.notes).toBe("## About you\n- Casual");
    expect(voice.pending).toEqual([]);
    expect(voice.learnedCount).toBe(1);
    expect(calls[0][1].content).toContain("less formal");
    // Nothing left to learn: no further model call.
    await agent.learn();
    expect(calls).toHaveLength(1);
  });

  it("learns automatically once enough signals are waiting", async () => {
    const store = memoryStore();
    let learnCalls = 0;
    const agent = createAgent({
      store,
      learnAfter: 2,
      llm: { complete: async (m) => (m[0].content.includes("You maintain the notes") ? (learnCalls++, "## About you\n- x") : "d") },
    });
    for (const text of ["a", "b", "c"]) await agent.draft({ thread, boxText: text });
    await flush();
    await flush();
    expect(learnCalls).toBe(1);
    expect(store.voice().notes).toContain("- x");
  });

  it("changes notes only through chat, and answers questions without changing them", async () => {
    const store = memoryStore();
    const answers = [
      '{"reply": "You have no notes yet.", "notes": null}',
      'Sure! {"reply": "Added it.", "notes": "## Rules you asked for\\n- Sign off with Cheers"}',
    ];
    const agent = createAgent({ store, llm: { complete: async () => answers.shift()! } });
    const first = await agent.chatAboutVoice("what do you know?");
    expect(first).toMatchObject({ reply: "You have no notes yet.", changed: false });
    const second = await agent.chatAboutVoice("always sign off with Cheers");
    expect(second.changed).toBe(true);
    expect(second.voice.notes).toContain("Cheers");
    expect(second.voice.chat?.map((t) => t.role)).toEqual(["user", "assistant", "user", "assistant"]);
    const reset = await agent.resetVoice();
    expect(reset.notes).toBe("");
    expect(reset.backfilled).toBe(true);
  });

  it("treats an answer that is not JSON as a plain reply", () => {
    expect(parseVoiceChat("I could not parse that")).toEqual({ reply: "I could not parse that", notes: null });
  });
});
