import { describe, expect, it } from "vitest";
import { EMPTY_VOICE, forgetOldData, type Store, type ThreadSession, type VoiceProfile } from "../src";

const DAY = 24 * 60 * 60 * 1000;
const NOW = 100 * DAY;
const old = NOW - 31 * DAY;
const fresh = NOW - 2 * DAY;

function memoryStore(sessions: ThreadSession[], voice: VoiceProfile): Store & { sessions: Map<string, ThreadSession>; voice(): VoiceProfile } {
  const map = new Map(sessions.map((s) => [s.threadId, s]));
  let v = voice;
  return {
    sessions: map,
    voice: () => v,
    getSession: async (id) => map.get(id),
    saveSession: async (s) => void map.set(s.threadId, s),
    deleteSession: async (id) => void map.delete(id),
    listSessions: async () => [...map.values()],
    getVoice: async () => v,
    saveVoice: async (next) => void (v = next),
  };
}

const turns = (at: number) => [
  { role: "user" as const, content: "box", createdAt: at },
  { role: "assistant" as const, content: "draft", createdAt: at },
];

describe("forgetOldData", () => {
  it("drops turns older than 30 days and keeps newer ones", async () => {
    const store = memoryStore([{ threadId: "a", active: true, history: [...turns(old), ...turns(fresh)], updatedAt: fresh }], EMPTY_VOICE);
    await forgetOldData(store, NOW);
    expect(store.sessions.get("a")!.history.map((t) => t.createdAt)).toEqual([fresh, fresh]);
  });

  it("deletes a thread with nothing recent, but keeps a thread turned off as just the flag", async () => {
    const store = memoryStore(
      [
        { threadId: "on", active: true, history: turns(old), updatedAt: old },
        { threadId: "off", active: false, history: turns(old), threadToneNotes: "warm", updatedAt: old },
      ],
      EMPTY_VOICE,
    );
    await forgetOldData(store, NOW);
    expect(store.sessions.has("on")).toBe(false);
    expect(store.sessions.get("off")).toEqual({ threadId: "off", active: false, history: [], updatedAt: old });
  });

  it("drops old waiting signals and chat turns, and keeps the learned notes", async () => {
    const voice: VoiceProfile = {
      notes: "## About you",
      pending: [
        { kind: "sent-diff", draft: "d", sent: "s", at: old },
        { kind: "sent-diff", draft: "d", sent: "s", at: fresh },
      ],
      chat: turns(old),
      updatedAt: old,
    };
    const store = memoryStore([], voice);
    await forgetOldData(store, NOW);
    expect(store.voice().notes).toBe("## About you");
    expect(store.voice().pending.map((p) => p.at)).toEqual([fresh]);
    expect(store.voice().chat).toEqual([]);
  });

  it("writes nothing when nothing is old", async () => {
    const session: ThreadSession = { threadId: "a", active: true, history: turns(fresh), updatedAt: fresh };
    const store = memoryStore([session], EMPTY_VOICE);
    await forgetOldData(store, NOW);
    expect(store.sessions.get("a")).toBe(session);
    expect(store.voice()).toBe(EMPTY_VOICE);
  });
});
