import type { ThreadSession, VoiceProfile } from "./contracts";
import type { Store } from "./ports";

// Email text is kept for 30 days, then forgotten: drafts and box text in each thread's history, voice
// signals still waiting to be learned, and the settings page chat. The learned notes stay, since they are
// the point of learning. A thread turned off stays off: its session shrinks to the flag.

export const RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The session without turns older than `cutoff`; null when nothing worth keeping is left. */
export function pruneSession(session: ThreadSession, cutoff: number): ThreadSession | null {
  const history = session.history.filter((turn) => turn.createdAt >= cutoff);
  if (history.length > 0) return history.length === session.history.length ? session : { ...session, history };
  if (session.active) return null;
  return { threadId: session.threadId, active: false, history: [], updatedAt: session.updatedAt };
}

/** The voice without waiting signals or chat turns older than `cutoff`. */
export function pruneVoice(voice: VoiceProfile, cutoff: number): VoiceProfile {
  const pending = voice.pending.filter((signal) => signal.at >= cutoff);
  const chat = voice.chat?.filter((turn) => turn.createdAt >= cutoff);
  if (pending.length === voice.pending.length && chat?.length === voice.chat?.length) return voice;
  return { ...voice, pending, ...(chat ? { chat } : {}) };
}

/** Forgets everything older than the retention period. Needs a store that can list and delete sessions. */
export async function forgetOldData(store: Store, now: number, days = RETENTION_DAYS): Promise<void> {
  const cutoff = now - days * DAY_MS;
  if (store.listSessions && store.deleteSession) {
    for (const session of await store.listSessions()) {
      const kept = pruneSession(session, cutoff);
      if (!kept) await store.deleteSession(session.threadId);
      else if (JSON.stringify(kept) !== JSON.stringify(session)) await store.saveSession(kept);
    }
  }
  const voice = await store.getVoice();
  const kept = pruneVoice(voice, cutoff);
  if (kept !== voice) await store.saveVoice(kept);
}
