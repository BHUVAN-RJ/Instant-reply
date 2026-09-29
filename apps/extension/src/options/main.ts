import { NOTES_SECTIONS, type ChatTurn } from "@instant-reply/core";
import type { Message, VoiceOverview, VoiceResponse } from "../messages";

// Settings page: shows the fixed prompt rules, the learned notes and the learning state, read only.
// The notes change only through the chat, which asks the agent to rewrite them as a whole.

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const send = (msg: Message) => chrome.runtime.sendMessage(msg) as Promise<VoiceResponse>;

const log = $<HTMLDivElement>("log");
const textarea = $<HTMLTextAreaElement>("message");
const sendButton = $<HTMLButtonElement>("send");
const learnStatus = $<HTMLParagraphElement>("learn-status");

/** Splits the notes into their "## " sections. */
function sections(notes: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  let current = "";
  for (const raw of notes.split("\n")) {
    const line = raw.trim();
    const heading = line.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      current = heading[1].trim();
      out.set(current, out.get(current) ?? []);
    } else if (line) {
      const item = line.replace(/^[-*]\s+/, "");
      if (!/^nothing yet\.?$/i.test(item)) out.set(current, [...(out.get(current) ?? []), item]);
    }
  }
  return out;
}

function list(target: HTMLElement, items: string[] | undefined, empty: string): void {
  target.replaceChildren();
  if (!items?.length) {
    target.append(Object.assign(document.createElement("p"), { className: "empty", textContent: empty }));
    return;
  }
  const ul = Object.assign(document.createElement("ul"), { className: "notes" });
  for (const item of items) ul.append(Object.assign(document.createElement("li"), { textContent: item }));
  target.append(ul);
}

function ago(at: number): string {
  if (!at) return "never";
  const minutes = Math.round((Date.now() - at) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(at).toLocaleDateString();
}

function stat(label: string, value: string): HTMLElement {
  const span = document.createElement("span");
  span.append(`${label} `, Object.assign(document.createElement("b"), { textContent: value }));
  return span;
}

function bubble(turn: Pick<ChatTurn, "role" | "content"> | { role: "note"; content: string }): void {
  log.append(Object.assign(document.createElement("div"), { className: `msg ${turn.role}`, textContent: turn.content }));
  log.scrollTop = log.scrollHeight;
}

function render(o: VoiceOverview, withChat = false): void {
  const { voice } = o;
  $("no-key").hidden = o.hasKey;
  const parts = sections(voice.notes);
  const [about, style, rules] = NOTES_SECTIONS;
  list($("about"), parts.get(about), "Nothing yet.");
  list($("style"), parts.get(style), "Nothing yet. It fills in as you revise and send drafts.");
  list($("yours"), parts.get(rules), "None yet. Ask in the chat to add one.");
  const other = [...parts].filter(([name]) => !(NOTES_SECTIONS as readonly string[]).includes(name)).flatMap(([, items]) => items);
  $("other-wrap").hidden = other.length === 0;
  list($("other"), other, "");
  $("knows-meta").textContent = voice.notes
    ? `Learned from ${voice.learnedCount ?? 0} changes. Updated ${ago(voice.updatedAt)}.`
    : "Nothing learned yet.";

  const base = $("base");
  base.replaceChildren(...o.baseRules.map((rule) => Object.assign(document.createElement("li"), { textContent: rule })));

  $<HTMLInputElement>("learning").checked = o.learning;
  $("stats").replaceChildren(
    stat("Waiting to be learned:", String(voice.pending.length)),
    stat("Learned so far:", String(voice.learnedCount ?? 0)),
    stat("Notes updated:", ago(voice.updatedAt)),
  );
  $<HTMLButtonElement>("learn-now").disabled = !o.hasKey;

  if (withChat) {
    log.replaceChildren();
    const chat = voice.chat ?? [];
    if (!chat.length) bubble({ role: "note", content: "No messages yet." });
    for (const turn of chat) bubble(turn);
  }
}

function failure(response: Extract<VoiceResponse, { ok: false }>): string {
  return response.error === "no-key" ? "Add your OpenRouter key in the toolbar popup first." : "Something went wrong. Try again in a moment.";
}

async function refresh(withChat = false): Promise<void> {
  const response = await send({ type: "voice-get" });
  if (response.ok) render(response.overview, withChat);
}

async function ask(text: string): Promise<void> {
  const message = text.trim();
  if (!message || sendButton.disabled) return;
  log.querySelector(".msg.note")?.remove();
  bubble({ role: "user", content: message });
  textarea.value = "";
  sendButton.disabled = true;
  sendButton.textContent = "Thinking...";
  try {
    const response = await send({ type: "voice-chat", message });
    if (response.ok) {
      bubble({ role: "assistant", content: response.reply ?? "Done." });
      if (response.changed) bubble({ role: "note", content: "Notes updated" });
      render(response.overview);
    } else {
      bubble({ role: "note", content: failure(response) });
    }
  } finally {
    sendButton.disabled = false;
    sendButton.textContent = "Send";
    textarea.focus();
  }
}

$<HTMLFormElement>("ask").addEventListener("submit", (event) => {
  event.preventDefault();
  void ask(textarea.value);
});
textarea.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    void ask(textarea.value);
  }
});
$("chips").addEventListener("click", (event) => {
  const chip = (event.target as HTMLElement).closest("button");
  if (chip) void ask(chip.textContent ?? "");
});

$<HTMLInputElement>("learning").addEventListener("change", async (event) => {
  const enabled = (event.target as HTMLInputElement).checked;
  const response = await send({ type: "set-learning", enabled });
  if (response.ok) render(response.overview);
  learnStatus.className = "status";
  learnStatus.textContent = enabled ? "Learning is on." : "Learning is off. Nothing new is collected, and what it knows still applies.";
});

$<HTMLButtonElement>("learn-now").addEventListener("click", async (event) => {
  const button = event.currentTarget as HTMLButtonElement;
  button.disabled = true;
  learnStatus.className = "status";
  learnStatus.textContent = "Reading your changes...";
  try {
    const response = await send({ type: "voice-learn" });
    if (response.ok) {
      render(response.overview);
      learnStatus.textContent = response.overview.voice.pending.length ? "Learned a batch. More are waiting." : "Up to date.";
    } else {
      learnStatus.className = "status error";
      learnStatus.textContent = failure(response);
    }
  } finally {
    button.disabled = false;
  }
});

$("forget").addEventListener("click", () => ($("confirm").hidden = false));
$("forget-no").addEventListener("click", () => ($("confirm").hidden = true));
$("forget-yes").addEventListener("click", async () => {
  $("confirm").hidden = true;
  const response = await send({ type: "voice-reset" });
  if (response.ok) render(response.overview, true);
  learnStatus.className = "status";
  learnStatus.textContent = "Forgotten. It starts learning again from your next changes.";
});

// Learning can finish in the background (after a draft or a send); keep the page current.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && ("voice" in changes || "settings" in changes)) void refresh();
});

void refresh(true);
