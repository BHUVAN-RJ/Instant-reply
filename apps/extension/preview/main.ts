import { clearComments, commentCount, initComments } from "../src/content/comments";
import { writeBox } from "../src/content/editor";
import type { SwooshContext, ThemePack } from "../src/content/theme/contract";
import { tagIcons } from "../src/content/theme/icons";
import { boxLayout, ensureSkin, layoutSkin, themeOf } from "../src/content/theme/layout";
import { playSwoosh, startThinking } from "../src/content/theme/run";
import { ACTIVE_BOX_CLASS, BUSY_EDITOR_CLASS } from "../src/content/theme/shared";
import { buildStylesheet } from "../src/content/theme/stylesheet";
import { THEMES, themeById } from "../src/content/themes";

// The design preview: every theme pack on a stand in for Gmail's reply box, using the pack's real
// stylesheet, skin, ornament and swoosh (the same code gmail.ts runs). Shows the whole box on light and
// dark, every state of every button, the cursors, the colour roles, comments, and Refactor end to end
// with a fake model. Run with `npm run preview` (docs/THEMES.md).

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const themeSelect = $<HTMLSelectElement>("#theme");
const variantSelect = $<HTMLSelectElement>("#variant");
const showNewInput = $<HTMLInputElement>("#show-new");
const thinkingSelect = $<HTMLSelectElement>("#thinking");
const headBandInput = $<HTMLInputElement>("#head-band");
const app = $("#app");
const styleEl = document.head.appendChild(document.createElement("style"));

let pack: ThemePack = THEMES[0];
let boxCount = 0;

// Hover, press and focus can be forced with a class, so every state shows side by side.
const withForcedStates = (css: string) => css.replace(/:(hover|active|focus-visible)(?![\w-])/g, (_, s: string) => `:is(:${s}, .pv-${s})`);

const DRAFTS = [
  "Hi Alex,\n\nThursday works for me. I'll bring the updated slides and the numbers from last quarter, so we can go through them together.\n\nThanks,\nSam",
  "Hey Alex,\n\nThursday at 3 is perfect. I'll have the slides ready and send them over the night before so you can skim them first.\n\nSam",
  "Hi Alex,\n\nSounds good, Thursday it is. I'll bring the slides and a short summary of the numbers.\n\nBest,\nSam",
];
let draftIndex = 0;

const ICONS: [string, string][] = [
  ["Formatting options", "A"], ["Attach files", "📎"], ["Insert link", "🔗"], ["Insert emoji", "☺"],
  ["Insert files using Drive", "△"], ["Insert photo", "▣"], ["Insert signature", "✎"], ["Set up a time to meet", "▦"], ["More options", "⋮"],
];
const iconButtons = () => ICONS.map(([label, glyph]) => `<div role="button" data-tooltip="${label}"><span>${glyph}</span></div>`).join("");
const toggle = (on: boolean, extra = "") =>
  `<button type="button" class="ir-toggle ${extra}" data-active="${on}" aria-pressed="${on}"><span class="ir-dot"></span>Instant Reply</button>`;

const refactorLabel = (box: HTMLElement) => {
  const n = commentCount(box);
  return n ? `${pack.labels.refactor} (${n})` : pack.labels.refactor;
};

/** A reply box built like Gmail's. `on` dresses it in the theme; off is plain Gmail. */
function replyBox(on: boolean): string {
  const id = `pv${++boxCount}`;
  const text = "Hi Alex,<br><br>Can we move the review to Thursday? I still need to finish the slides.<br><br>Sam";
  return `
<div class="pv-msg"><div class="pv-av">A</div><div><div class="pv-from">Alex Rivera</div><div class="pv-snip">Quick one: are we still on for the quarterly review this week?</div></div></div>
<div class="aoI" data-compose-id="${id}">
  <div class="pv-avatar-col"><div class="pv-avatar-wrap"><div class="pv-avatar"></div></div></div>
  <div class="pv-card" data-ir-card>
    <div class="pv-head"><span>To</span><span class="pv-chip">Alex Rivera</span><span class="pv-grow"></span><div role="button" data-tooltip="Pop out reply">⤢</div></div>
    <table class="iN"><tbody><tr><td><div class="pv-editor" contenteditable="true" role="textbox" aria-label="Message Body">${text}</div></td></tr></tbody></table>
    <div class="J-Z" role="toolbar"><div role="listbox">Sans Serif</div><div class="J-Z-axR"></div><div role="button"><b>B</b></div><div role="button"><i>I</i></div><div role="button"><u>U</u></div><div class="J-Z-axR"></div><div role="button">≡</div></div>
    <div class="aDj"><table><tbody><tr>
      <td><div class="dC"><div class="T-I aoO" role="button">Send</div><div class="T-I hG" role="button"><span>▾</span></div></div>${on ? `<button type="button" class="ir-refactor"></button>` : toggle(false)}</td>
      <td class="pv-grow"><span class="pv-icons">${iconButtons()}</span></td>
      ${on ? `<td class="ir-toggle-cell">${toggle(true)}</td>` : ""}
      <td class="pv-discard"><div role="button" data-tooltip="Discard draft"><span>🗑</span></div></td>
    </tr></tbody></table></div>
  </div>
</div>`;
}

/** What gmail.ts does to an active box: theme, variant, skin, icons, avatar, ornament. */
function dress(box: HTMLElement, variant: string): void {
  const card = box.querySelector<HTMLElement>("[data-ir-card]") ?? box;
  box.classList.remove(ACTIVE_BOX_CLASS);
  box.dataset.irLayout = boxLayout(box);
  // As in Gmail: a card's To line wears the band if turned on; otherwise, and always in a window, a rule.
  box.dataset.irHeadStyle = box.dataset.irLayout === "card" && headBandInput.checked ? "band" : "rule";
  const { theme, paper } = themeOf(card);
  box.dataset.irTheme = theme;
  box.style.setProperty("--ir-paper", paper);
  box.classList.add(ACTIVE_BOX_CLASS);
  box.dataset.irVariant = variant;
  const avatar = box.querySelector<HTMLElement>(".pv-avatar");
  if (avatar) {
    avatar.dataset.irAvatar = box.dataset.composeId!;
    avatar.dataset.irVariant = variant;
    avatar.parentElement!.setAttribute("data-ir-avatar-wrap", "");
    avatar.parentElement!.dataset.irVariant = variant;
  }
  tagIcons(box);
  layout(box);
  new ResizeObserver(() => layout(box)).observe(card);
  const button = box.querySelector<HTMLButtonElement>(".ir-refactor")!;
  button.textContent = refactorLabel(box);
  button.addEventListener("click", () => void refactor(box, button, variant));
}

function layout(box: HTMLElement): void {
  if (!box.isConnected) return;
  const card = box.querySelector<HTMLElement>("[data-ir-card]") ?? box;
  layoutSkin(box, card, ensureSkin(box, pack.skin));
  pack.ornament.place(box, box.querySelector<HTMLElement>("[data-ir-avatar]"));
  placeSeeds(box);
}

// --- comments shown without selecting anything: a live pin, a stale pin, an open note box ------------

function wordRange(editor: HTMLElement, word: string): Range | null {
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const at = (n as Text).data.indexOf(word);
    if (at < 0) continue;
    const r = document.createRange();
    r.setStart(n, at);
    r.setEnd(n, at + word.length);
    return r;
  }
  return null;
}

const seededRanges: Range[] = [];
function placeSeeds(box: HTMLElement): void {
  if (!("pvSeed" in box.dataset)) return;
  box.querySelectorAll(".pv-seed").forEach((el) => el.remove());
  const editor = box.querySelector<HTMLElement>('[role="textbox"]')!;
  const b = box.getBoundingClientRect();
  const pin = (range: Range | null, label: string, stale: boolean) => {
    const rect = range?.getClientRects()[0];
    if (!rect) return;
    const el = Object.assign(document.createElement("button"), { type: "button", className: `ir-pin pv-seed${stale ? " ir-stale" : ""}`, textContent: label });
    Object.assign(el.style, { left: `${rect.right - b.left + 2}px`, top: `${rect.top - b.top - 10}px` });
    box.append(el);
    return rect;
  };
  const thursday = wordRange(editor, "Thursday");
  const rect = pin(thursday, "1", false);
  pin(wordRange(editor, "slides"), "?", true);
  if (thursday && !seededRanges.includes(thursday)) seededRanges.push(thursday);
  if (typeof Highlight !== "undefined") CSS.highlights.set("ir-comment", new Highlight(...seededRanges.filter((r) => r.startContainer.isConnected)));
  if (rect && box.dataset.pvSeed === "note") {
    const note = document.createElement("div");
    note.className = "ir-note pv-seed";
    note.innerHTML = '<textarea rows="2" aria-label="Comment">Make this sound less like a request</textarea><div class="ir-note-row"><span class="ir-note-hint">Enter to pin, Esc to close</span><button type="button" class="ir-note-delete">Delete</button></div>';
    Object.assign(note.style, { left: `${rect.left - b.left}px`, top: `${rect.bottom - b.top + 8}px` });
    box.append(note);
  }
}

// --- Refactor with a fake model --------------------------------------------------------------------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function refactor(box: HTMLElement, button: HTMLButtonElement, variant: string): Promise<void> {
  if (button.disabled) return;
  const editor = box.querySelector<HTMLElement>('[role="textbox"]')!;
  const ctx: SwooshContext = { host: box, editor, variant, showNew: showNewInput.checked };
  const run = pack;
  button.disabled = true;
  button.textContent = run.labels.working;
  editor.classList.add(BUSY_EDITOR_CLASS);
  const stop = startThinking(run, ctx);
  await sleep(Number(thinkingSelect.value));
  stop();
  editor.classList.remove(BUSY_EDITOR_CLASS);
  delete box.dataset.pvSeed;
  box.querySelectorAll(".pv-seed").forEach((el) => el.remove());
  await playSwoosh(run, ctx, () => writeBox(editor, DRAFTS[draftIndex++ % DRAFTS.length]));
  clearComments(box);
  button.disabled = false;
  button.textContent = refactorLabel(box);
}

// --- sections ---------------------------------------------------------------------------------------

function section(title: string, note = ""): HTMLElement {
  const h = document.createElement("h2");
  h.innerHTML = `${title}${note ? ` <small>${note}</small>` : ""}`;
  app.append(h);
  const div = document.createElement("div");
  app.append(div);
  return div;
}

function gmail(mode: "light" | "dark", html: string, caption: string): HTMLElement {
  const wrap = document.createElement("div");
  wrap.innerHTML = `<p class="pv-cap">${caption}</p><div class="pv-gmail pv-${mode}">${html}</div>`;
  return wrap;
}

function boxesSection(variants: string[]): void {
  const out = section("Reply box", "Refactor runs the real swoosh with a fake model. Select text in a box to add a comment.");
  const cols = Object.assign(document.createElement("div"), { className: "pv-cols pv-boxes" });
  out.append(cols);
  let first = true;
  for (const v of variants) {
    for (const mode of ["light", "dark"] as const) {
      const el = gmail(mode, replyBox(true), `${v}, ${mode} Gmail`);
      cols.append(el);
      const box = el.querySelector<HTMLElement>(".aoI")!;
      box.dataset.pvSeed = first ? "note" : "pins";
      first = false;
      dress(box, v);
    }
  }
  cols.append(gmail("light", replyBox(false), "Thread off: plain Gmail"));
}

/** Gmail's 600px window: a new email, or a reply popped out of a thread. Same box, no card, no avatar. */
function windowBox(kind: "compose" | "popped", on: boolean): string {
  const id = `pv${++boxCount}`;
  const title = kind === "compose" ? "New Message" : "Re: Quarterly review";
  const head = kind === "compose"
    ? `<div class="pv-wrow"><span class="pv-wlabel">To</span><input class="pv-winput" value="alex.rivera@example.com" aria-label="To recipients"><span class="pv-wlabel">Cc Bcc</span></div>
       <div class="pv-wrow"><input class="pv-winput" placeholder="Subject" name="subject" aria-label="Subject"></div>`
    : `<div class="pv-wrow"><span class="pv-wlabel">↩ ▾</span><span>Alex Rivera (alex.rivera@example.com)</span></div>`;
  const text = kind === "compose" ? "Hi Alex,<br><br>Quick one: can you send me the deck before Thursday?<br><br>Sam" : "Hi Alex,<br><br>Can we move the review to Thursday? I still need to finish the slides.<br><br>Sam";
  return `
<div class="pv-window" role="dialog" aria-label="${title}">
  <div class="pv-wtitle"><span>${title}</span><span class="pv-wctl">_ ⤢ ✕</span></div>
  <div class="aoI" data-compose-id="${id}">
    ${head}
    <table class="iN"><tbody><tr><td><div class="pv-editor" contenteditable="true" role="textbox" aria-label="Message Body">${text}</div></td></tr></tbody></table>
    <div class="J-Z" role="toolbar"><div role="button">↶</div><div role="button">↷</div><div class="J-Z-axR"></div><div role="listbox">Sans Serif</div><div class="J-Z-axR"></div><div role="button"><b>B</b></div><div role="button"><i>I</i></div><div role="button"><u>U</u></div></div>
    <div class="aDj"><table><tbody><tr>
      <td><div class="dC"><div class="T-I aoO" role="button">Send</div><div class="T-I hG" role="button"><span>▾</span></div></div>${on ? `<button type="button" class="ir-refactor"></button>` : toggle(false)}</td>
      <td class="pv-grow"><span class="pv-icons">${iconButtons()}</span></td>
      ${on ? `<td class="ir-toggle-cell">${toggle(true)}</td>` : ""}
      <td class="pv-discard"><div role="button" data-tooltip="Discard draft"><span>🗑</span></div></td>
    </tr></tbody></table></div>
  </div>
</div>`;
}

function windowsSection(variant: string): void {
  const out = section("Compose window", "a new email and a reply popped out: Gmail's 600px window, no card, no avatar");
  const cols = Object.assign(document.createElement("div"), { className: "pv-cols pv-windows" });
  out.append(cols);
  for (const mode of ["light", "dark"] as const) {
    for (const kind of ["compose", "popped"] as const) {
      const el = gmail(mode, windowBox(kind, true), `${kind === "compose" ? "new email" : "popped out reply"}, ${variant}, ${mode} Gmail`);
      cols.append(el);
      dress(el.querySelector<HTMLElement>(".aoI")!, variant);
    }
  }
  cols.append(gmail("light", windowBox("compose", false), "Thread off: plain Gmail window"));
}

function statesSection(variant: string): void {
  const out = section("States", "every state forced side by side");
  const cols = Object.assign(document.createElement("div"), { className: "pv-cols" });
  out.append(cols);
  for (const mode of ["light", "dark"] as const) {
    const state = (label: string, html: string) => `<div class="pv-state">${html}<small>${label}</small></div>`;
    const send = (cls: string) => `<div class="dC ${cls}"><div class="T-I aoO ${cls}" role="button">Send</div><div class="T-I hG" role="button"><span>▾</span></div></div>`;
    const refactor = (cls: string, label = pack.labels.refactor, disabled = false) => `<button type="button" class="ir-refactor ${cls}"${disabled ? " disabled" : ""}>${label}</button>`;
    const icons = (cls: string) => ICONS.map(([l, g]) => `<div role="button" class="${cls}" data-tooltip="${l}"><span>${g}</span></div>`).join("");
    const discard = (cls: string) => `<div role="button" class="${cls}" data-tooltip="Discard draft"><span>🗑</span></div>`;
    const html = `<div class="aoI pv-states" data-compose-id="pvs-${mode}">
      <span class="pv-label">Switch</span><div class="pv-row">${state("off", toggle(false))}${state("off, hover", toggle(false, "pv-hover"))}${state("on", toggle(true))}${state("on, hover", toggle(true, "pv-hover"))}${state("focus", toggle(true, "pv-focus-visible"))}</div>
      <span class="pv-label">Refactor</span><div class="pv-row">${state("rest", refactor(""))}${state("hover", refactor("pv-hover"))}${state("press", refactor("pv-hover pv-active"))}${state("working", refactor("", pack.labels.working, true))}${state("2 comments", refactor("", `${pack.labels.refactor} (2)`))}${state("focus", refactor("pv-focus-visible"))}</div>
      <span class="pv-label">Send</span><div class="pv-row">${state("rest", send(""))}${state("hover", send("pv-hover"))}${state("press", send("pv-hover pv-active"))}${state("focus", send("pv-focus-visible"))}</div>
      <span class="pv-label">Icons</span><div class="pv-row">${state("rest", `<span class="pv-icons">${icons("")}</span>`)}${state("hover", `<span class="pv-icons">${icons("pv-hover")}</span>`)}</div>
      <span class="pv-label">Discard</span><div class="pv-row">${state("rest", `<span class="pv-discard">${discard("")}</span>`)}${state("hover", `<span class="pv-discard">${discard("pv-hover")}</span>`)}</div>
    </div>`;
    const el = gmail(mode, html, `${variant}, ${mode} Gmail`);
    cols.append(el);
    const box = el.querySelector<HTMLElement>(".aoI")!;
    box.dataset.irTheme = mode;
    box.style.setProperty("--ir-paper", mode === "light" ? "#ffffff" : "#2c2c2c");
    box.style.background = "var(--ir-paper)";
    box.classList.add(ACTIVE_BOX_CLASS);
    box.dataset.irVariant = variant;
    tagIcons(box);
  }
}

/** The last cursor of each kind in the slot and the variant's CSS (variants override the slot). */
function cursorsOf(variant: string): Record<"default" | "pointer" | "text", string | null> {
  const css = pack.css.cursor + pack.variantCss(variant);
  const out = { default: null, pointer: null, text: null } as Record<"default" | "pointer" | "text", string | null>;
  for (const m of css.matchAll(/url\("(data:image\/svg\+xml,[^"]+)"\) \d+ \d+, (default|pointer|text)/g)) out[m[2] as "text"] = m[1];
  return out;
}

function cursorsSection(variant: string): void {
  const out = section("Cursors", "32px, still, only over an active reply box");
  const c = cursorsOf(variant);
  const tiles = Object.assign(document.createElement("div"), { className: "pv-cursors" });
  for (const [kind, label] of [["default", "Arrow"], ["pointer", "Hand"], ["text", "Text cursor"]] as const) {
    const src = c[kind];
    tiles.insertAdjacentHTML("beforeend", `<div class="pv-cursor"><div>${src ? `<img src="${src}" alt="">` : "none"}</div><div>${src ? `<img src="${src}" alt="">` : "none"}</div><p>${label}</p></div>`);
  }
  out.append(tiles);
  for (const mode of ["light", "dark"] as const) {
    const el = gmail(mode, `<div class="aoI pv-try" data-compose-id="pvc-${mode}"><div>Arrow: move here</div><div role="button">Hand: move here</div><div contenteditable="true" role="textbox">Text cursor: move here</div></div>`, `try them, ${mode}`);
    el.style.marginTop = "12px";
    out.append(el);
    const box = el.querySelector<HTMLElement>(".aoI")!;
    box.dataset.irTheme = mode;
    box.dataset.irVariant = variant;
    box.classList.add(ACTIVE_BOX_CLASS);
  }
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

function rolesSection(variants: string[]): void {
  const out = section("Colour roles", "strong must reach 3:1 on white and on dark");
  for (const v of variants) {
    const r = pack.roles(v);
    const row = Object.assign(document.createElement("div"), { className: "pv-swatches" });
    row.style.marginBottom = "12px";
    for (const [role, hex] of Object.entries(r)) {
      const onWhite = contrast(hex, "#ffffff"), onDark = contrast(hex, "#202124");
      const weak = role === "strong" && (onWhite < 3 || onDark < 3);
      const text = role === "strong" ? r.onStrong : contrast(hex, "#000000") > contrast(hex, "#ffffff") ? "#000" : "#fff";
      row.insertAdjacentHTML("beforeend", `<div class="pv-swatch"><div class="pv-chipc" style="background:${hex};color:${text}">${role}</div>
        <div class="pv-meta">${v} · ${hex}<br>on white ${onWhite.toFixed(1)}:1 · on dark ${onDark.toFixed(1)}:1${weak ? ' <span class="pv-bad">too weak</span>' : ""}</div></div>`);
    }
    out.append(row);
  }
}

// --- controls ---------------------------------------------------------------------------------------

function render(): void {
  pack = themeById(themeSelect.value);
  styleEl.textContent = withForcedStates(buildStylesheet(pack, (file) => `/fonts/${file}`));
  const now = pack.pickVariant(new Date());
  const current = variantSelect.value;
  variantSelect.innerHTML = [`<option value="auto">now (${now})</option>`, ...pack.meta.variants.map((v) => `<option value="${v}">${v}</option>`), '<option value="all">all variants</option>'].join("");
  variantSelect.value = [...variantSelect.options].some((o) => o.value === current) ? current : "auto";
  const variants = variantSelect.value === "all" ? [...pack.meta.variants] : [variantSelect.value === "auto" ? now : variantSelect.value];
  $("#design-path").textContent = `Design: apps/extension/src/content/themes/${pack.meta.id}/DESIGN.md`;
  app.innerHTML = "";
  seededRanges.length = 0;
  boxesSection(variants);
  windowsSection(variants[0]);
  statesSection(variants[0]);
  cursorsSection(variants[0]);
  rolesSection(variants);
}

themeSelect.innerHTML = THEMES.map((t) => `<option value="${t.meta.id}">${t.meta.name}</option>`).join("");
const fromUrl = new URLSearchParams(location.search);
// ?wide shows reply boxes at the full page width, like a wide Gmail window.
if (fromUrl.has("wide")) document.body.classList.add("pv-wide");
if (fromUrl.get("theme")) themeSelect.value = fromUrl.get("theme")!;
themeSelect.addEventListener("change", render);
variantSelect.addEventListener("change", render);
headBandInput.addEventListener("change", render);
initComments((box) => {
  const button = box.querySelector<HTMLButtonElement>(".ir-refactor");
  if (button && !button.disabled) button.textContent = refactorLabel(box);
});
render();
if (fromUrl.get("variant")) {
  variantSelect.value = fromUrl.get("variant")!;
  render();
}
