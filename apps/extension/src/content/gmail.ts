import type { Thread, ThreadSession } from "@instant-reply/core";
import { SESSION_PREFIX, createChromeStore } from "../adapters/chrome-store";
import type { DraftResponse, Message } from "../messages";
import { LOOK_KEY, asLook, getLook, type Look } from "../look";
import { beachSweep } from "./beach/fx";
import { PALETTES, californiaPalette, type PaletteId } from "./beach/palette";
import { buildBeachStyles } from "./beach/styles";
import { clearComments, commentCount, initComments, syncComments, takeComments } from "./comments";
import { readBox, readSignature, writeBox } from "./editor";
import { noteSeen } from "../identity";
import { stamp, sweep } from "./fx";
import { tagIcons } from "./icons";
import { ACTIVE_BOX_CLASS, BUSY_EDITOR_CLASS, REFACTOR_CLASS, SKIN_CLASS, TOGGLE_CLASS, buildStyles } from "./styles";
import { renderedText } from "./text";
import { readMessages } from "./thread";

// Runs inside Gmail:
// - An "Instant Reply" switch in every reply box turns the agent on or off for that thread (every
//   thread starts on). Off, it sits next to Send; on, it moves right, just before Discard.
// - While a thread is on, its reply boxes are dressed in the chosen look and get a Refactor button next
//   to Send. Refactor sends the box and the whole thread to the agent and animates the draft into the
//   box. Nothing is ever sent by the extension.
// - Two looks, picked in the toolbar popup: FragPunk (styles.ts, fx.ts: glitch sweep and a New! sticker)
//   and Beach (beach/: a wave over sand, palettes by California time).
// - When a thread that is on gets sent, the sent text goes to the agent, which compares it with its
//   last draft to learn the user's voice (core/learn.ts).
// Still to do: compose windows (new emails).

let look: Look = "fragpunk";
/** "Refactor!" (FragPunk) or "Refactor" (Beach), with the number of comments waiting in the box. */
function refactorLabel(box?: HTMLElement | null): string {
  const base = look === "beach" ? "Refactor" : "Refactor!";
  const count = box ? commentCount(box) : 0;
  return count ? `${base} (${count})` : base;
}

const styleEl = document.createElement("style");

/** Swaps the stylesheet and drops everything drawn in the old look; the next sync redraws it. */
function applyLook(next: Look): void {
  look = next;
  styleEl.textContent =
    look === "beach"
      ? buildBeachStyles({ fredoka: chrome.runtime.getURL("fonts/fredoka-600.woff2"), pacifico: chrome.runtime.getURL("fonts/pacifico.woff2") })
      : buildStyles(chrome.runtime.getURL("fonts/permanent-marker.woff2"));
  document.querySelectorAll(`.${SKIN_CLASS}`).forEach((el) => el.remove());
  document.querySelectorAll<HTMLButtonElement>(`.${REFACTOR_CLASS}:not(:disabled)`).forEach((b) => (b.textContent = refactorLabel(b.closest<HTMLElement>(".ir-active-box"))));
  scheduleSync();
}

function injectStyles(): void {
  document.head.append(styleEl);
  void getLook().then(applyLook);
}

/** The beach palette follows California time; it is held still while a wave runs in that box. */
function paintPalette(box: HTMLElement, palette: PaletteId): void {
  if (box.dataset.irPal !== palette) box.dataset.irPal = palette;
  const avatar = document.querySelector<HTMLElement>(`[data-ir-avatar="${box.dataset.composeId}"]`);
  for (const el of [avatar, avatar?.parentElement?.hasAttribute("data-ir-avatar-wrap") ? avatar.parentElement : null]) {
    if (el && el.dataset.irPal !== palette) el.dataset.irPal = palette;
  }
}

// --- Thread state -------------------------------------------------------------

const store = createChromeStore();

// Active flags per thread, kept in sync with storage so every box and tab agrees.
// Reads go straight to storage; writes go through the service worker so plugins hear them.
const activeCache = new Map<string, boolean>();

async function isThreadActive(threadId: string): Promise<boolean> {
  if (!activeCache.has(threadId)) {
    activeCache.set(threadId, (await store.getSession(threadId))?.active ?? true);
  }
  return activeCache.get(threadId)!;
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (LOOK_KEY in changes) applyLook(asLook(changes[LOOK_KEY].newValue));
  for (const [key, change] of Object.entries(changes)) {
    if (!key.startsWith(SESSION_PREFIX)) continue;
    const session = change.newValue as ThreadSession | undefined;
    activeCache.set(key.slice(SESSION_PREFIX.length), session?.active ?? true);
  }
  scheduleSync();
});

/** Gmail keeps old views in the DOM, so only visible elements count. */
function firstVisible(selector: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(selector)) if (el.offsetParent !== null) return el;
  return null;
}

function visibleThreadHeading(): HTMLElement | null {
  return firstVisible("h2.hP[data-thread-perm-id]");
}

/** The account email, taken from the tab title ("Inbox - you@example.com - Gmail"). */
function userEmail(): string {
  return document.title.match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/)?.[0] ?? "";
}

// --- On/off switch -------------------------------------------------------------

function renderToggle(button: HTMLButtonElement, threadId: string, active: boolean): void {
  button.dataset.threadId = threadId;
  button.dataset.active = String(active);
  button.setAttribute("aria-pressed", String(active));
  button.title = active ? "Turn off Instant Reply for this thread" : "Turn on Instant Reply for this thread";
}

function createToggle(threadId: string, active: boolean): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = TOGGLE_CLASS;
  const dot = document.createElement("span");
  dot.className = "ir-dot";
  button.append(dot, "Instant Reply");
  renderToggle(button, threadId, active);
  button.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const id = button.dataset.threadId;
    if (!id) return;
    const message: Message = { type: "set-active", threadId: id, active: button.dataset.active !== "true" };
    const session: ThreadSession = await chrome.runtime.sendMessage(message);
    renderToggle(button, id, session.active);
  });
  return button;
}

// --- Reply boxes ----------------------------------------------------------------

/** Reply boxes carry their thread in a hidden "rt" input ("#thread-f:<id>"); empty for new emails. */
function replyThreadId(box: HTMLElement): string | null {
  const rt = box.querySelector<HTMLInputElement>('input[name="rt"]')?.value;
  return rt ? rt.replace(/^#/, "") : null;
}

function boxEditor(box: HTMLElement): HTMLElement | null {
  return box.querySelector<HTMLElement>('[contenteditable="true"][role="textbox"]');
}

/** The account's full name, from the Google Account button ("Google Account: Name\n(email)"). */
function accountName(): string {
  const label = document.querySelector('[aria-label^="Google Account:"]')?.getAttribute("aria-label") ?? "";
  return label.replace(/^Google Account:\s*/, "").split("\n")[0].replace(/\s*\(?[\w.+-]+@[\w.-]+\)?\s*$/, "").trim();
}

async function collectThread(box: HTMLElement, threadId: string, editor: HTMLElement): Promise<Thread> {
  const email = userEmail();
  const userName = accountName() || undefined;
  const userSignature = readSignature(editor) || undefined;
  void noteSeen({ seenName: userName, seenSignature: userSignature });
  const heading = visibleThreadHeading();
  const messages = heading?.dataset.threadPermId === threadId ? await readMessages(heading, email) : [];
  // Fallback: the quoted history Gmail keeps for the reply.
  const quoted = box.querySelector<HTMLInputElement>('input[name="uet"]')?.value ?? "";
  return {
    id: threadId,
    source: "gmail",
    subject: box.querySelector<HTMLInputElement>('input[name="subject"]')?.value ?? "",
    userEmail: email,
    userName,
    userSignature,
    messages,
    fallbackText: messages.length || !quoted ? undefined : renderedText(new DOMParser().parseFromString(quoted, "text/html").body),
  };
}

function flash(button: HTMLButtonElement, text: string, ms = 2500): void {
  button.textContent = text;
  setTimeout(() => (button.textContent = refactorLabel(button.closest<HTMLElement>(".ir-active-box"))), ms);
}

async function refactor(box: HTMLElement, button: HTMLButtonElement): Promise<void> {
  const threadId = replyThreadId(box);
  const editor = boxEditor(box);
  if (!threadId || !editor) return;
  const boxText = readBox(editor);
  if (!boxText) return flash(button, "Type something first");

  button.disabled = true;
  button.textContent = "Refactoring";
  editor.classList.add(BUSY_EDITOR_CLASS);
  // The palette is read when Refactor is pressed and held for the whole wave.
  const palette = californiaPalette();
  box.dataset.irPalLock = "";
  paintPalette(box, palette);
  try {
    const message: Message = { type: "draft", request: { thread: await collectThread(box, threadId, editor), boxText, comments: takeComments(box) } };
    const response: DraftResponse = await chrome.runtime.sendMessage(message);
    editor.classList.remove(BUSY_EDITOR_CLASS);
    if (response.ok) {
      const write = () => writeBox(editor, response.draft);
      if (look === "beach") {
        await beachSweep(box, editor, write, PALETTES[palette]);
      } else {
        await sweep(box, editor, write);
        stamp(box, editor);
      }
      clearComments(box);
      button.textContent = refactorLabel(box);
    } else if (response.error === "no-key") {
      flash(button, "Add your OpenRouter key", 4000);
      await chrome.runtime.sendMessage({ type: "open-settings" } satisfies Message);
    } else {
      console.error("[instant-reply]", response.detail);
      flash(button, "Failed, see console", 4000);
    }
  } catch (error) {
    console.error("[instant-reply]", error);
    flash(button, "Failed, see console", 4000);
  } finally {
    editor.classList.remove(BUSY_EDITOR_CLASS);
    button.disabled = false;
    delete box.dataset.irPalLock;
  }
}

function createRefactorButton(box: HTMLElement): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = REFACTOR_CLASS;
  button.textContent = refactorLabel(box);
  button.title = "Send this box to Instant Reply instead of the recipient";
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!button.disabled) void refactor(box, button);
  });
  return button;
}

/**
 * Reads the box the moment Send is pressed (button or Cmd/Ctrl+Enter), before Gmail clears it, and
 * hands it to the agent. Pointer down, not click: Gmail can close the box before the click lands.
 * The agent ignores sends with no draft to compare, and counts each draft once.
 */
function hookSend(box: HTMLElement, threadId: string, editor: HTMLElement): void {
  if (box.dataset.irSendHook) return;
  box.dataset.irSendHook = "";
  const report = () => {
    if (!activeCache.get(threadId)) return;
    const sentText = readBox(editor);
    if (sentText) void chrome.runtime.sendMessage({ type: "sent", threadId, sentText } satisfies Message);
  };
  box.addEventListener("pointerdown", (event) => {
    if (event.button === 0 && (event.target as Element).closest?.(".dC .T-I.aoO")) report();
  }, true);
  box.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && editor.contains(event.target as Node)) report();
  }, true);
}

function createSkin(): HTMLElement {
  const skin = document.createElement("div");
  skin.className = SKIN_CLASS;
  skin.setAttribute("aria-hidden", "true");
  skin.innerHTML =
    look === "beach"
      ? '<i class="ir-card"></i><i class="ir-lagoon"></i><i class="ir-foam"></i>'
      : '<i class="ir-sh"></i><i class="ir-under"></i><i class="ir-ink"></i><i class="ir-paper"></i><b class="ir-bar-acid"></b><b class="ir-bar-sh"></b><b class="ir-bar"></b>';
  return skin;
}

/**
 * The visible reply card: the outermost rounded element around the editor. The box itself is wider
 * (it holds the avatar column), so the skin is sized to the card. Marked once, because the styles then
 * square its corners and it would stop looking rounded.
 */
function replyCard(box: HTMLElement, editor: HTMLElement): HTMLElement {
  const marked = box.querySelector<HTMLElement>("[data-ir-card]");
  if (marked) return marked;
  let card: HTMLElement | null = null;
  for (let el = editor.parentElement; el && el !== box; el = el.parentElement) {
    if (parseFloat(getComputedStyle(el).borderTopLeftRadius) >= 8) card = el;
  }
  if (card) card.dataset.irCard = "";
  return card ?? box;
}

/** Light or dark, from the card's own background, so the ink edge and icons stay visible. */
function themeOf(el: HTMLElement): { theme: "light" | "dark"; paper: string } {
  const bg = getComputedStyle(el).backgroundColor;
  const [r = 255, g = 255, b = 255, a = 1] = (bg.match(/[\d.]+/g) ?? []).map(Number);
  if (a === 0) return { theme: "light", paper: "#fff" };
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return { theme: luminance < 0.4 ? "dark" : "light", paper: bg };
}

function setIfChanged(el: HTMLElement, prop: string, value: string): void {
  if (el.style.getPropertyValue(prop) !== value) el.style.setProperty(prop, value);
}

/**
 * Adds the border skin around the reply card, lays the crooked ink bar behind the recipients line
 * (everything in the card above the body table), and retags the toolbar icons. Writes only on change.
 */
function dressBox(box: HTMLElement, editor: HTMLElement): void {
  let skin = box.querySelector<HTMLElement>(`:scope > .${SKIN_CLASS}`);
  if (!skin) box.prepend((skin = createSkin()));
  const card = replyCard(box, editor);
  watchSize(card);
  const b = box.getBoundingClientRect(), c = card.getBoundingClientRect();
  setIfChanged(skin, "left", `${c.left - b.left}px`);
  setIfChanged(skin, "top", `${c.top - b.top}px`);
  setIfChanged(skin, "width", `${c.width}px`);
  setIfChanged(skin, "height", `${c.height}px`);

  const body = card.querySelector<HTMLElement>("table.iN");
  const bodyTop = body?.getBoundingClientRect().top ?? c.top;
  setIfChanged(skin, "--ir-head", `${Math.max(0, bodyTop - c.top)}px`);
  for (const child of card.children) {
    if (!(child instanceof HTMLElement) || child === body) continue;
    const isHead = child.getBoundingClientRect().bottom <= bodyTop + 1;
    if (isHead !== child.hasAttribute("data-ir-head")) child.toggleAttribute("data-ir-head", isHead);
  }
  tagIcons(box);
  syncComments(box);
  markAvatar(card, box.dataset.composeId ?? "");
  placeCrown(box);
}

/**
 * The beach flower crown: its own element in the box, placed from the avatar's real position, since the
 * avatar's wrappers differ in size and offset (and some clip). Removed in any other look.
 */
function placeCrown(box: HTMLElement): void {
  const avatar = document.querySelector<HTMLElement>(`[data-ir-avatar="${box.dataset.composeId}"]`);
  let crown = box.querySelector<HTMLElement>(":scope > .ir-crown");
  if (look !== "beach" || !avatar) return crown?.remove();
  if (!crown) {
    crown = Object.assign(document.createElement("i"), { className: "ir-crown" });
    crown.setAttribute("aria-hidden", "true");
    box.append(crown);
  }
  const a = avatar.getBoundingClientRect(), b = box.getBoundingClientRect();
  setIfChanged(crown, "left", `${Math.round(a.left - b.left + a.width / 2 - 32)}px`);
  setIfChanged(crown, "top", `${Math.round(a.top - b.top - 17)}px`);
}

/**
 * Off: next to Send, easy to find. On: right before Discard, which stays the last button where people
 * expect it, so the switch is not hit by accident.
 */
function placeToggle(box: HTMLElement, toggle: HTMLButtonElement, sendGroup: HTMLElement, active: boolean): void {
  const discardCell = box.querySelector('[data-tooltip^="Discard draft"]')?.closest("td");
  if (!active || !discardCell) {
    if (toggle.previousElementSibling !== sendGroup) sendGroup.after(toggle);
    box.querySelector(".ir-toggle-cell")?.remove();
    return;
  }
  let cell = box.querySelector<HTMLElement>(".ir-toggle-cell");
  if (cell?.nextElementSibling !== discardCell) {
    cell ??= Object.assign(document.createElement("td"), { className: "ir-toggle-cell" });
    discardCell.before(cell);
  }
  if (toggle.parentElement !== cell) cell.append(toggle);
}

/**
 * The sender's round avatar to the left of the card. It can live outside the box, so it is found by
 * probing the page just left of the card's top. Marked once, and unmarked when the thread is turned off.
 */
function markAvatar(card: HTMLElement, owner: string): void {
  if (document.querySelector(`[data-ir-avatar="${owner}"]`)) return;
  const c = card.getBoundingClientRect();
  for (let x = c.left - 8; x > c.left - 80; x -= 6) {
    for (const el of document.elementsFromPoint(x, c.top + 24)) {
      if (!(el instanceof HTMLElement) || el.offsetWidth < 24 || el.offsetWidth > 64) continue;
      const radius = getComputedStyle(el).borderTopLeftRadius;
      if (!radius.endsWith("%") && parseFloat(radius) < el.offsetWidth / 2 - 1) continue;
      el.setAttribute("data-ir-avatar", owner);
      if (el.parentElement?.childElementCount === 1) el.parentElement.setAttribute("data-ir-avatar-wrap", "");
      return;
    }
  }
}

function unmarkAvatar(box: HTMLElement): void {
  const avatar = document.querySelector<HTMLElement>(`[data-ir-avatar="${box.dataset.composeId}"]`);
  avatar?.removeAttribute("data-ir-avatar");
  avatar?.parentElement?.removeAttribute("data-ir-avatar-wrap");
}

async function syncReplyBoxes(): Promise<void> {
  for (const box of document.querySelectorAll<HTMLElement>("div.aoI[data-compose-id]")) {
    const threadId = replyThreadId(box);
    const editor = boxEditor(box);
    const sendGroup = box.querySelector<HTMLElement>(".dC");
    if (!threadId || !editor || !sendGroup) continue;
    const active = await isThreadActive(threadId);

    // Read the theme while the card still shows its own background; once dressed it is transparent.
    if (!active || !box.dataset.irTheme) {
      const { theme, paper } = themeOf(replyCard(box, editor));
      if (box.dataset.irTheme !== theme) box.dataset.irTheme = theme;
      setIfChanged(box, "--ir-paper", paper);
    }

    let toggle = box.querySelector<HTMLButtonElement>(`.${TOGGLE_CLASS}`);
    if (!toggle) toggle = createToggle(threadId, active);
    else if (toggle.dataset.active !== String(active)) renderToggle(toggle, threadId, active);
    placeToggle(box, toggle, sendGroup, active);
    if (look === "beach" && !("irPalLock" in box.dataset)) paintPalette(box, californiaPalette());

    box.classList.toggle(ACTIVE_BOX_CLASS, active);
    const existing = box.querySelector(`.${REFACTOR_CLASS}`);
    if (!active) {
      existing?.remove();
      box.querySelector(`:scope > .${SKIN_CLASS}`)?.remove();
      box.querySelector(":scope > .ir-crown")?.remove();
      clearComments(box);
      unmarkAvatar(box);
      continue;
    }
    if (!existing) sendGroup.after(createRefactorButton(box));
    hookSend(box, threadId, editor);
    dressBox(box, editor);
  }
}

// --- Wiring -------------------------------------------------------------------------

// Gmail is a single page app; re-check on DOM changes, at most once per frame.
let scheduled = false;
function scheduleSync(): void {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    void syncReplyBoxes();
  });
}

// Some size changes (the formatting bar opening, the editor growing, the window resizing) add no nodes,
// so dressed cards are also watched for resizes.
const resized = new ResizeObserver(scheduleSync);
const watched = new WeakSet<Element>();
function watchSize(el: Element): void {
  if (watched.has(el)) return;
  watched.add(el);
  resized.observe(el);
}

injectStyles();
initComments((box) => {
  const button = box.querySelector<HTMLButtonElement>(`.${REFACTOR_CLASS}`);
  if (button && !button.disabled && button.textContent !== refactorLabel(box)) button.textContent = refactorLabel(box);
});
new MutationObserver(scheduleSync).observe(document.body, { childList: true, subtree: true });
addEventListener("resize", scheduleSync);
scheduleSync();
