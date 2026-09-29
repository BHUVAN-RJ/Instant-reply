import type { ChatTurn, Thread, VoiceProfile } from "./contracts";
import type { LlmMessage } from "./ports";

export interface PromptInput {
  thread: Thread;
  boxText: string;
  history: ChatTurn[];
  voice: VoiceProfile;
  threadToneNotes?: string;
  /** Output of context providers, labelled by provider id. */
  context: { id: string; text: string }[];
}

export function formatThread(thread: Thread): string {
  if (thread.messages.length === 0) return thread.fallbackText || "(new email, no thread yet)";
  return thread.messages
    .map((m, i) => {
      const user = m.fromUser ? " (the user)" : "";
      const to = m.to.length ? ` | To: ${m.to.join(", ")}` : "";
      return `[${i + 1}] From: ${m.from}${user}${to} | ${m.date}\n${m.body}`;
    })
    .join("\n\n");
}

/** Sent with every draft. Fixed: the user can add rules on top through the notes, not change these. */
export const BASE_RULES = [
  "Write only the email body, ready to send: greeting, content, sign-off. No subject line, no quoted history, no commentary, no markdown.",
  "Match the language and formality the thread calls for unless the user says otherwise.",
  "Never invent facts, dates, numbers or commitments that are not in the thread, the context below, or the user's words. If something essential is missing, leave a clear placeholder like [time].",
  "The user talks to you through the reply box. What they send is either an instruction for a new reply, or your previous draft with their own edits and change requests mixed in. For a revision, keep their edits, apply their requests, and do not start over.",
];

function systemPrompt(input: PromptInput): string {
  const { thread } = input;
  const parts = [`You are Instant Reply, drafting emails on behalf of ${thread.userEmail || "the user"}.`, ...BASE_RULES];
  if (input.voice.notes) parts.push(`What you know about the user and how they write (follow the rules they asked for):\n${input.voice.notes}`);
  if (input.threadToneNotes) parts.push(`Tone for this thread:\n${input.threadToneNotes}`);
  for (const { id, text } of input.context) parts.push(`Context from ${id}:\n${text}`);
  parts.push(`Subject: ${thread.subject || "(none)"}`);
  parts.push(`The thread so far, oldest first:\n\n${formatThread(thread)}`);
  return parts.join("\n\n");
}

export function buildMessages(input: PromptInput): LlmMessage[] {
  return [
    { role: "system", content: systemPrompt(input) },
    ...input.history.map(({ role, content }) => ({ role, content })),
    { role: "user", content: input.boxText },
  ];
}
