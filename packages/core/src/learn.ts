import type { ChatTurn, VoiceProfile, VoiceSignal } from "./contracts";
import type { LlmMessage } from "./ports";
import { BASE_RULES } from "./prompt";

// Voice learning: turns what the user does with drafts into notes, and lets the user change the
// notes only by talking to the agent. The notes are always rewritten as a whole, which avoids drift.

export const NOTES_SECTIONS = ["About you", "How you write", "Rules you asked for"] as const;

const NOTES_FORMAT = `Write the notes in Markdown with exactly these three sections, in this order:
## About you
Facts that help with emails: name, role, how they sign off, people and projects they mention. Only what the evidence shows.
## How you write
Tone, length, greetings and sign-offs, sentence style, words and phrases they use or avoid, how formal they are with different kinds of people.
## Rules you asked for
Explicit instructions the user has given, one per bullet.
Use short bullets starting with "- ". Keep the whole thing under 350 words. When a section has no evidence, give it the single bullet "- Nothing yet."`;

export function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function formatSignal(signal: VoiceSignal, i: number): string {
  if (signal.kind === "revision-request") {
    return `[${i + 1}] The assistant drafted:\n${signal.draft}\n\nThe user sent this back to be revised (their edits and change requests mixed in):\n${signal.instruction}`;
  }
  return `[${i + 1}] The assistant drafted:\n${signal.draft}\n\nWhat the user actually sent after editing it:\n${signal.sent}`;
}

/** Strips a ```markdown fence if the model wrapped its answer in one. */
export function stripFence(text: string): string {
  return text.replace(/^```[a-z]*\s*\n/i, "").replace(/\n```\s*$/, "").trim();
}

export function buildLearnMessages(notes: string, signals: VoiceSignal[]): LlmMessage[] {
  return [
    {
      role: "system",
      content: [
        "You maintain the notes Instant Reply keeps about how its user writes email.",
        "You get the current notes and new evidence: drafts the assistant wrote, and what the user did with them (sent them back with change requests, or edited them before sending).",
        "Update the notes so future drafts need fewer changes. Learn lasting preferences, not the one-off content of a single email. When new evidence contradicts an old note, the newer evidence wins. Keep everything in the old notes that is still true, including the rules the user asked for.",
        NOTES_FORMAT,
        "Output only the notes.",
      ].join("\n\n"),
    },
    {
      role: "user",
      content: `Current notes:\n${notes || "(none yet)"}\n\nNew evidence, oldest first:\n\n${signals.map(formatSignal).join("\n\n---\n\n")}`,
    },
  ];
}

export function buildVoiceChatMessages(voice: VoiceProfile, message: string): LlmMessage[] {
  const system = [
    "You are the settings assistant for Instant Reply, an agent that drafts the user's email replies in Gmail. The user is talking to you about what the agent knows about them and how it writes their emails.",
    `These base rules are sent with every draft. They are fixed and you cannot change them, but the user can add rules on top of them:\n${BASE_RULES.map((r) => `- ${r}`).join("\n")}`,
    "The notes below are the only thing you can change. They are sent with every draft. When the user asks to add, change or remove something, rewrite the notes as a whole and keep everything else that is still true. When the user only asks a question, answer it and leave the notes alone. Explicit instructions go under \"Rules you asked for\".",
    NOTES_FORMAT,
    `Current notes:\n${voice.notes || "(none yet)"}`,
    'Answer with one JSON object and nothing else: {"reply": "a short plain answer to the user, saying what you changed if anything", "notes": "the complete updated notes, or null when nothing changed"}',
  ].join("\n\n");
  const history = (voice.chat ?? []).slice(-10).map(({ role, content }) => ({ role, content }));
  return [{ role: "system", content: system }, ...history, { role: "user", content: message }];
}

export function parseVoiceChat(raw: string): { reply: string; notes: string | null } {
  const text = stripFence(raw);
  const start = text.indexOf("{"), end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const parsed = JSON.parse(text.slice(start, end + 1)) as { reply?: unknown; notes?: unknown };
      const reply = typeof parsed.reply === "string" && parsed.reply.trim() ? parsed.reply.trim() : "Done.";
      const notes = typeof parsed.notes === "string" && parsed.notes.trim() ? stripFence(parsed.notes) : null;
      return { reply, notes };
    } catch {
      // fall through: treat the whole answer as a reply that changes nothing
    }
  }
  return { reply: text, notes: null };
}

/** Each draft the user sent back with changes is a revision request, including ones from before learning existed. */
export function revisionSignalsFromHistory(history: ChatTurn[]): VoiceSignal[] {
  const signals: VoiceSignal[] = [];
  for (let i = 0; i + 1 < history.length; i++) {
    const draft = history[i], next = history[i + 1];
    if (draft.role !== "assistant" || next.role !== "user") continue;
    if (normalizeText(draft.content) === normalizeText(next.content)) continue;
    signals.push({ kind: "revision-request", draft: draft.content, instruction: next.content, at: next.createdAt });
  }
  return signals;
}
