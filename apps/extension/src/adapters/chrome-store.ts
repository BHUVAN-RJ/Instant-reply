import { EMPTY_VOICE, type Store, type ThreadSession, type VoiceProfile } from "@instant-reply/core";

// Store port backed by chrome.storage.local. Everything stays on this computer.

export const SESSION_PREFIX = "session:";
const VOICE_KEY = "voice";

export function createChromeStore(): Store {
  return {
    async getSession(threadId) {
      const key = SESSION_PREFIX + threadId;
      return (await chrome.storage.local.get(key))[key] as ThreadSession | undefined;
    },
    async saveSession(session) {
      await chrome.storage.local.set({ [SESSION_PREFIX + session.threadId]: session });
    },
    async getVoice() {
      return ((await chrome.storage.local.get(VOICE_KEY))[VOICE_KEY] as VoiceProfile | undefined) ?? EMPTY_VOICE;
    },
    async saveVoice(voice) {
      await chrome.storage.local.set({ [VOICE_KEY]: voice });
    },
    async listSessions() {
      const all = await chrome.storage.local.get(null);
      return Object.entries(all).flatMap(([key, value]) => (key.startsWith(SESSION_PREFIX) ? [value as ThreadSession] : []));
    },
  };
}
