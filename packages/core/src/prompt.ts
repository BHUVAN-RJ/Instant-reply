import type { ChatTurn, DraftComment, Thread, VoiceProfile } from "./contracts";
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
  "Sound like a real person writing a quick email, not an assistant: plain everyday words, short natural sentences, no filler. No corporate or AI sounding phrases (like \"I hope this email finds you well\", \"I wanted to reach out\", \"delve\", \"leverage\", \"seamless\", \"Please don't hesitate to\") and no jargon the thread does not already use. The user's own voice and rules below win over this one when they differ.",
  "Never use em dashes (\u2014) or a double hyphen (--) in place of one. Use a comma, period, colon or parentheses instead. A normal single hyphen is fine. This holds even if the user's notes say otherwise.",
  "Sign off as the user, by name. Never write a placeholder like [Your name]. Pick the sign-off from the situation: just the first name for casual emails, ongoing back and forth, and people the user already writes to; the full signature for first contact and formal or professional emails (recruiters, companies, applications, anyone who may need their details). If the signature is unknown, sign with the first name only, never the full name. Put the signature text exactly as given, never retyped or reformatted. How the user's notes say they sign off wins over all of this.",
  "The user may pin comments to exact passages of the box. Apply each comment to its passage (and only as far as the note asks), keep the rest of the text as it is unless a comment says otherwise, and never mention the comments in the email.",
  "The user talks to you through the reply box. What they send is either an instruction for a new reply, or your previous draft with their own edits and change requests mixed in. For a revision, keep their edits, apply their requests, and do not start over.",
];

function systemPrompt(input: PromptInput): string {
  const { thread } = input;
  const parts = [`You are Instant Reply, drafting emails on behalf of ${thread.userEmail || "the user"}.`, ...BASE_RULES];
  if (thread.userName) parts.push(`The user's name: ${thread.userName} (first name: ${firstName(thread.userName)}).`);
  if (thread.userSignature) parts.push(`The user's full signature, between the lines:\n---\n${thread.userSignature}\n---`);
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

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "";
}

/**
 * Backstop for the no em dash rule, applied to every draft: models slip them in even when told not to.
 * Em dashes, spaced en dashes and double hyphens become commas (a dash opening a line is dropped), and an
 * en dash between numbers or words becomes a plain hyphen. Single hyphens are left alone.
 */
export function stripDashes(text: string): string {
  return text
    .replace(/^([ \t]*)(?:\u2014|\u2013|-{2,})\s*/gm, "$1")
    .replace(/\s*(?:\u2014|-{2,})\s*|\s+\u2013\s+/g, ", ")
    .replace(/\u2013/g, "-")
    .replace(/,\s*([,.;:!?])/g, "$1");
}

/** Backstop for sign-offs: fills "[Your name]" style placeholders, or drops them when the name is unknown. */
export function fillNamePlaceholders(text: string, fullName?: string): string {
  const placeholder = /\[\s*(?:your|my|sender'?s?)?\s*(first|full)?\s*name\s*\]/gi;
  if (fullName) return text.replace(placeholder, (_m, kind: string | undefined) => (kind?.toLowerCase() === "full" ? fullName : firstName(fullName)));
  return text.replace(/^[ \t]*\[\s*(?:your|my)?\s*(?:first|full)?\s*name\s*\][ \t]*\n?/gim, "").replace(placeholder, "").trimEnd();
}

/** The box as the agent reads it: the text, then any comments pinned to passages of it. */
export function withComments(boxText: string, comments: DraftComment[] = []): string {
  const pinned = comments.filter((c) => c.quote.trim() && c.note.trim());
  if (!pinned.length) return boxText;
  const list = pinned.map((c, i) => `${i + 1}. On "${c.quote.trim()}": ${c.note.trim()}`).join("\n");
  return `${boxText}\n\nComments on parts of the text above:\n${list}`;
}
