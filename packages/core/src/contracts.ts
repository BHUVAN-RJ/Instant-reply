// Data shapes shared by every app that plugs into Instant Reply.
// Keep these plain JSON: they cross process and extension boundaries.

/** Bumped on any breaking change below, so connected apps can check compatibility. */
export const CONTRACT_VERSION = 1;

export interface ThreadMessage {
  from: string;
  to: string[];
  /** As shown by the source, e.g. "Sep 23, 2026, 11:10 PM". */
  date: string;
  body: string;
  /** True when the user wrote this message. */
  fromUser: boolean;
}

/** A conversation from any source (Gmail today). */
export interface Thread {
  id: string;
  /** Where the thread came from, e.g. "gmail". */
  source: string;
  subject: string;
  userEmail: string;
  /** Oldest first. */
  messages: ThreadMessage[];
  /** Raw text used when the source could not split the thread into messages. */
  fallbackText?: string;
}

/** One exchange with the agent inside a thread. */
export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
  createdAt: number;
}

/** Per-thread state, keyed by thread id. */
export interface ThreadSession {
  threadId: string;
  /** Starts false; the user turns the agent on per thread. */
  active: boolean;
  /** Tone learned for this specific thread, layered on top of the global voice. */
  threadToneNotes?: string;
  history: ChatTurn[];
  updatedAt: number;
  /** createdAt of the draft whose sent version was already learned from, so one send counts once. */
  sentDraftAt?: number;
}

/** The user's voice, learned over time. Starts empty; changed only through the agent. */
export interface VoiceProfile {
  /** Markdown with the sections in NOTES_SECTIONS. Rewritten as a whole, never patched. */
  notes: string;
  /** Correction signals not yet folded into notes. */
  pending: VoiceSignal[];
  updatedAt: number;
  /** How many signals have been folded into the notes so far. */
  learnedCount?: number;
  /** Past thread histories have been mined for revision requests once. */
  backfilled?: boolean;
  /** The settings page conversation about the notes. */
  chat?: ChatTurn[];
}

export const EMPTY_VOICE: VoiceProfile = { notes: "", pending: [], updatedAt: 0 };

export type VoiceSignal =
  /** User asked for a change to a draft ("less formal"). */
  | { kind: "revision-request"; instruction: string; draft: string; at: number }
  /** User hand-edited a draft before sending. */
  | { kind: "sent-diff"; draft: string; sent: string; at: number };

export interface DraftRequest {
  thread: Thread;
  /** Whatever is in the reply box: a fresh instruction, or a draft plus requested changes. */
  boxText: string;
}

export interface DraftResult {
  draft: string;
}

/** Everything the agent announces. Event sinks receive these. */
export type AgentEvent =
  | { type: "thread-activated"; threadId: string; at: number }
  | { type: "thread-deactivated"; threadId: string; at: number }
  | { type: "draft-created"; thread: Thread; boxText: string; draft: string; at: number }
  | { type: "email-sent"; threadId: string; sentText: string; at: number };
