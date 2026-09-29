import type { AgentEvent, Thread, ThreadSession, VoiceProfile } from "./contracts";

// The sockets the core plugs into. Each host app supplies its own implementations.

/** Persistence for sessions and the learned voice. */
export interface Store {
  getSession(threadId: string): Promise<ThreadSession | undefined>;
  saveSession(session: ThreadSession): Promise<void>;
  getVoice(): Promise<VoiceProfile>;
  saveVoice(voice: VoiceProfile): Promise<void>;
  /** Every stored session. Optional; used once to learn from drafts made before learning existed. */
  listSessions?(): Promise<ThreadSession[]>;
}

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Any chat model: OpenRouter, a local model, a test fake. */
export interface LlmProvider {
  complete(messages: LlmMessage[]): Promise<string>;
}

/**
 * Adds outside knowledge to a draft, e.g. a job app returning the role and
 * application status when the thread is with a recruiter it knows.
 */
export interface ContextProvider {
  id: string;
  /** Facts the agent should know for this thread, or null when not relevant. */
  getContext(thread: Thread): Promise<string | null>;
}

/** Receives agent events, e.g. to tell a job app that a recruiter was answered. */
export interface EventSink {
  id: string;
  handle(event: AgentEvent): void | Promise<void>;
}
