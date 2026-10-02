import type { CssSlot } from "../../theme/contract";
import { BAND, BOX, EDITOR, RULE, REFACTOR_CLASS, SKIN_CLASS, TOGGLE_CLASS, WINDOW, boxCursors, clearSendGroup, iconBase, svgCursor, svgUri as uri } from "../../theme/shared";
import { DARK, LIGHT, type Tones } from "./palette";

// The Undertone look (DESIGN.md next to this file; mockup in docs/design/undertone/mockup.html). Gmail's
// own card with a gradient underglow; Refactor and Send are cut corner tiles; the switch is a spark;
// toolbar icons are thin line glyphs with one gradient accent each. The gradient only ever shows in thin
// lines, small marks and soft glows.

const FONT = `"IR Geist", system-ui, sans-serif`;

/** Corners cut at 45 degrees, top right and bottom left. */
const cut = (px: number) => `polygon(0 0, calc(100% - ${px}px) 0, 100% ${px}px, 100% 100%, ${px}px 100%, 0 calc(100% - ${px}px))`;

const gradDefs = (t: Tones) =>
  `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.blue}"/><stop offset=".6" stop-color="${t.violet}"/><stop offset="1" stop-color="${t.cyan}"/></linearGradient></defs>`;

/** The spark's small diamond, centred on (x, y). */
const diamond = (x: number, y: number, r = 2.2) => `<path d="M${x} ${y - r}l${r} ${r}-${r} ${r}-${r}-${r}z" fill="url(#g)" stroke="none"/>`;

// Toolbar glyphs: thin lines in Gmail's ink, one gradient accent each (a stroke, or the diamond).
const ACCENT = 'stroke="url(#g)" stroke-width="2"';
const GLYPHS: Record<string, string> = {
  format: `<path d="M6.5 15.5 12 4l5.5 11.5M8.6 11.2h6.8"/><path d="M4 20h16" ${ACCENT}/>`,
  attach: `<path d="M15.5 8v7.5a3.5 3.5 0 0 1-7 0V6.5a2.3 2.3 0 0 1 4.6 0v8.7a1.1 1.1 0 0 1-2.2 0V8.5"/>${diamond(19, 5, 1.7)}`,
  link: `<path d="M10 14.5a3.5 3.5 0 0 1 0-5l2.5-2.5a3.5 3.5 0 0 1 5 5l-1 1"/><path d="M14 9.5a3.5 3.5 0 0 1 0 5L11.5 17a3.5 3.5 0 0 1-5-5l1-1"/>${diamond(12, 12, 1.8)}`,
  emoji: `<circle cx="12" cy="12" r="8"/><path d="M8.8 13.8a3.6 3.6 0 0 0 6.4 0" ${ACCENT}/><path d="M9.5 10h.01M14.5 10h.01" stroke-width="2.6"/>`,
  drive: `<path d="M9 4h6l6 10.5-3 5.5H6l-3-5.5z"/><path d="M9 4l6 10.5"/><path d="M3.5 14.5h17" ${ACCENT}/>`,
  photo: `<path d="M3.5 4.5h12l5 5v10h-17z"/><path d="M4.5 17l4.5-4.5 3.5 3.5 2-2 5 4" ${ACCENT}/>${diamond(15.5, 8.5, 1.6)}`,
  signature: `<path d="M3.5 15c1.6-5 3.6-9 5-8.2s-2 8 .2 8 3-4.4 4.6-4.4-.2 4 1.8 4 2.6-2 4.4-2"/><path d="M3.5 20h17" ${ACCENT}/>`,
  meet: `<path d="M3.5 5.5h13l4 4v11h-17z"/><path d="M8 3.5v4M14 3.5v4M3.5 10h17"/>${diamond(14.5, 15.2)}`,
  more: `<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="19" r="1.4"/>${diamond(12, 12, 2.4)}`,
  trash: `<path d="M6 7l1.5 13h9L18 7"/><path d="M10 11v6M14 11v6"/><path d="M4 7h16M9 7l1-3h4l1 3" ${ACCENT}/>`,
};
const glyph = (name: string, t: Tones) =>
  uri(`${gradDefs(t)}<g fill="none" stroke="${t.glyphInk}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${GLYPHS[name]}</g>`, "0 0 24 24");
const glyphRules = (scope: string, t: Tones) =>
  Object.keys(GLYPHS).map((name) => `${scope} [data-ir-icon="${name}"]::after { background-image: ${glyph(name, t)}; }`).join("\n");

// Refactor's glyph: three lines of text and a circular arrow, in the gradient.
const refactorGlyph = (t: Tones) =>
  uri(`${gradDefs(t)}<g fill="none" stroke="url(#g)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 4.5h7M2.5 8h5M2.5 11.5h3.5"/><path d="M13.5 8.5a3 3 0 1 1-1.2-2.4"/><path d="M12.6 3.9l-.3 1.9 1.9.2"/></g>`, "0 0 16 16");

// Cursors (28px, still): a dark arrow with a white outline and the spark's diamond, the same arrow filled
// with the gradient over anything clickable, and a slim gradient I-beam.
const ARROW = "M5 3.5v17.8l4.6-4.2 3.4 7.2 3.2-1.5-3.3-7.1h6.3z";
const CURSORS = {
  arrow: svgCursor(`${gradDefs(LIGHT)}<path d="${ARROW}" fill="#1f1f1f" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/><path d="M19.5 3.5l2 2-2 2-2-2z" fill="url(#g)" stroke="#fff" stroke-width=".8"/>`, 28, 5, 3, "default"),
  hand: svgCursor(`${gradDefs(LIGHT)}<path d="${ARROW}" fill="url(#g)" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/>`, 28, 5, 3, "pointer"),
  text: svgCursor(
    `${gradDefs(LIGHT)}<path d="M10 4.5h8M10 23.5h8M14 4.5v19" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>` +
      `<path d="M10 4.5h8M10 23.5h8M14 4.5v19" fill="none" stroke="url(#g)" stroke-width="2.2" stroke-linecap="round"/>`,
    28, 14, 14, "text",
  ),
};

const tones = (t: Tones) => `
  --u-blue: ${t.blue}; --u-violet: ${t.violet}; --u-cyan: ${t.cyan}; --u-ink: ${t.labelInk};
  --u-send: linear-gradient(120deg, ${t.sendFrom}, ${t.sendTo}); --u-on-send: ${t.onSend}; --u-glow: ${t.glow};`;

export const css: Record<CssSlot, string> = {
  tokens: `
/* Light values by default, dark under data-ir-theme. On the switch too, which also shows on boxes that are off. */
${BOX}, .${TOGGLE_CLASS} {${tones(LIGHT)}
  --u-grad: linear-gradient(120deg, var(--u-blue), var(--u-violet) 55%, var(--u-cyan));
  --u-outline: #9aa0a6; --u-strong: #4c6fff;
}
${BOX} { --u-tint: color-mix(in srgb, var(--u-blue) 7%, var(--ir-paper)); --u-tint-hover: color-mix(in srgb, var(--u-blue) 13%, var(--ir-paper)); }
${BOX}[data-ir-theme="dark"], ${BOX}[data-ir-theme="dark"] .${TOGGLE_CLASS} {${tones(DARK)} }`,

  card: `
/* Gmail's own card, redrawn by the skin, and a gradient underglow along its bottom edge */
.${SKIN_CLASS} > .ir-u-card, .${SKIN_CLASS} > .ir-u-glow, .${SKIN_CLASS} > .ir-u-rule { position: absolute; }
.${SKIN_CLASS} > .ir-u-card { inset: 0; border-radius: 16px; background: var(--ir-paper); box-shadow: 0 1px 2px rgba(60, 64, 67, .3), 0 2px 6px 2px rgba(60, 64, 67, .15); }
${BOX}[data-ir-theme="dark"] > .${SKIN_CLASS} > .ir-u-card { box-shadow: 0 1px 3px rgba(0, 0, 0, .6); }
.${SKIN_CLASS} > .ir-u-glow { left: 28px; right: 28px; bottom: -1px; height: 2px; border-radius: 2px; background: var(--u-grad); box-shadow: 0 3px 16px 2px var(--u-glow); }`,

  head: `
/* Rule: a gradient hairline that fades at both ends. Band: a faint left to right wash. */
${RULE} > .${SKIN_CLASS} > .ir-u-rule { left: 16px; right: 16px; top: calc(var(--ir-head, 0px) - 1px); height: 1px; opacity: .6;
  background: linear-gradient(90deg, transparent, var(--u-blue) 18%, var(--u-violet) 60%, transparent); }
${BAND} > .${SKIN_CLASS} > .ir-u-rule { left: 0; right: 0; top: 0; height: var(--ir-head, 0px); border-radius: 16px 16px 0 0;
  background: linear-gradient(90deg, color-mix(in srgb, var(--u-blue) 9%, transparent), color-mix(in srgb, var(--u-violet) 6%, transparent) 70%, transparent);
  box-shadow: inset 0 -1px 0 color-mix(in srgb, var(--u-violet) 40%, transparent); }`,

  body: `
/* 8px of room under the rule */
${RULE} table.iN { border-top: 8px solid transparent !important; }`,

  formatBar: `
/* No grey fill: a gradient hairline along the top; buttons get the cut corner tile on hover and when pressed */
${BOX} .J-Z[role="toolbar"] { position: relative; background: transparent !important; border-radius: 0 !important; }
${BOX} .J-Z[role="toolbar"]::before { content: ""; position: absolute; left: 8px; right: 8px; top: 0; height: 1px; opacity: .5; pointer-events: none;
  background: linear-gradient(90deg, transparent, var(--u-blue) 20%, var(--u-violet) 60%, transparent); }
${BOX} .J-Z[role="toolbar"] .J-Z-axR { background: color-mix(in srgb, var(--u-violet) 35%, transparent) !important; }
${BOX} .J-Z[role="toolbar"] [role="button"], ${BOX} .J-Z[role="toolbar"] [role="listbox"] { border-radius: 0 !important; clip-path: ${cut(6)}; transition: background .12s; }
${BOX} .J-Z[role="toolbar"] [role="button"]:hover, ${BOX} .J-Z[role="toolbar"] [role="listbox"]:hover { background-color: color-mix(in srgb, var(--u-blue) 12%, transparent) !important; }
${BOX} .J-Z[role="toolbar"] [aria-pressed="true"] { background-color: color-mix(in srgb, var(--u-violet) 18%, transparent) !important; color: var(--u-ink) !important; }`,

  pinnedRow: `
/* Pinned to the window bottom, the Send row keeps the card's paper and round bottom */
${BOX} .aDj.ahe { background: var(--ir-paper) !important; border-radius: 0 0 16px 16px; }`,

  window: `
/* Gmail's window is the frame: a flat square card, no underglow, the rule under Subject, tighter buttons */
${WINDOW} > .${SKIN_CLASS} > .ir-u-card { border-radius: 0; box-shadow: none; }
${WINDOW} > .${SKIN_CLASS} > .ir-u-glow { display: none; }
${WINDOW} .${REFACTOR_CLASS} { height: 32px; padding: 0 12px 0 30px; font-size: 13px; }
${WINDOW} .${REFACTOR_CLASS}::after { left: 10px; }
${WINDOW} .dC .aoO { padding: 0 16px !important; }
${WINDOW} .${TOGGLE_CLASS} { margin-left: 4px; }`,

  toggle: `
/* A spark: a grey line with a diamond; on, the line fills with the gradient and the diamond slides to its
   end and glows. No visible label; the tooltip names it. */
.${TOGGLE_CLASS} { position: relative; width: 30px; height: 36px; padding: 0; margin-left: 8px; border: 0; font-size: 0; color: transparent;
  background: linear-gradient(var(--u-outline), var(--u-outline)) center / 26px 2px no-repeat; }
.${TOGGLE_CLASS}::before { content: ""; position: absolute; left: 2px; right: 2px; top: 50%; height: 2px; margin-top: -1px; border-radius: 2px; background: var(--u-grad);
  transform: scaleX(0); transform-origin: left; transition: transform .3s cubic-bezier(.2, 0, 0, 1); }
.${TOGGLE_CLASS} .ir-dot { position: absolute; left: 1px; top: 50%; width: 8px; height: 8px; margin-top: -4px; border-radius: 1px; background: var(--u-outline);
  transform: rotate(45deg); transition: left .3s cubic-bezier(.2, 0, 0, 1), background .2s, box-shadow .2s, transform .15s; }
.${TOGGLE_CLASS}[data-active="true"]::before { transform: scaleX(1); }
.${TOGGLE_CLASS}[data-active="true"] .ir-dot { left: 21px; background: var(--u-cyan); box-shadow: 0 0 8px 1px var(--u-glow); }
.${TOGGLE_CLASS}:hover .ir-dot { transform: rotate(45deg) scale(1.3); }
.${TOGGLE_CLASS}[data-active="true"]:hover .ir-dot { box-shadow: 0 0 12px 3px var(--u-glow); }
.${TOGGLE_CLASS}:focus-visible { outline: 2px solid var(--u-strong); outline-offset: 2px; border-radius: 4px; }`,

  refactor: `
/* A cut corner tile: the gradient as a hairline around a tinted inside, a gradient glyph on the left.
   While the model works the hairline spins. */
@property --u-ang { syntax: "<angle>"; inherits: false; initial-value: 0deg; }
.${REFACTOR_CLASS} { position: relative; isolation: isolate; display: inline-flex; align-items: center; height: 36px; padding: 0 16px 0 34px; margin-left: 8px;
  border: 0; border-radius: 0; background: var(--u-grad); clip-path: ${cut(10)}; color: var(--u-ink); font: 500 14px/1 ${FONT}; letter-spacing: -.005em;
  transition: transform .15s cubic-bezier(.2, 0, 0, 1); }
.${REFACTOR_CLASS}::before { content: ""; position: absolute; inset: 1.25px; z-index: -1; background: var(--u-tint); clip-path: ${cut(9.5)}; transition: background .15s; }
.${REFACTOR_CLASS}::after { content: ""; position: absolute; left: 12px; top: 50%; width: 16px; height: 16px; margin-top: -8px; background: ${refactorGlyph(LIGHT)} center / contain no-repeat; }
${BOX}[data-ir-theme="dark"] .${REFACTOR_CLASS}::after { background-image: ${refactorGlyph(DARK)}; }
.${REFACTOR_CLASS}:hover:not(:disabled) { transform: translateY(-1px); }
.${REFACTOR_CLASS}:hover:not(:disabled)::before { background: var(--u-tint-hover); }
.${REFACTOR_CLASS}:active:not(:disabled) { transform: scale(.97); transition-duration: .05s; }
.${REFACTOR_CLASS}:focus-visible { outline: 2px solid var(--u-strong); outline-offset: -5px; }
.${REFACTOR_CLASS}:disabled { color: color-mix(in srgb, var(--u-ink) 65%, transparent); animation: ir-u-spin 1.6s linear infinite;
  background: conic-gradient(from var(--u-ang), var(--u-blue), var(--u-violet), var(--u-cyan), transparent 70%, var(--u-blue)); }
@keyframes ir-u-spin { to { --u-ang: 360deg; } }`,

  send: `
/* Send: the same cut corner tile, filled blue to violet; the schedule arrow is a smaller tile beside it */
${clearSendGroup()}
${BOX} .dC .T-I { background: var(--u-send) !important; border: 0 !important; border-radius: 0 !important; margin: 0 !important; clip-path: ${cut(10)};
  transition: transform .15s cubic-bezier(.2, 0, 0, 1), filter .15s; }
${BOX} .dC .aoO { color: var(--u-on-send) !important; font: 500 14px/1 ${FONT} !important; letter-spacing: 0 !important; padding: 0 22px !important; }
${BOX} .dC .hG { margin-left: 3px !important; clip-path: ${cut(7)}; }
${BOX} .dC .hG * { filter: brightness(0) invert(1); }
${BOX}[data-ir-theme="dark"] .dC .hG * { filter: brightness(0); }
${BOX} .dC .T-I:hover { transform: translateY(-1px); filter: brightness(1.08) saturate(1.1); }
${BOX} .dC .T-I:active { transform: scale(.97); transition-duration: .05s; }
${BOX} .dC .T-I:focus-visible { outline: 2px solid var(--u-on-send) !important; outline-offset: -5px; }`,

  icons: `
/* Thin line glyphs in Gmail's ink with one gradient accent each; a tinted cut corner tile on hover */
${iconBase(20)}
${BOX} [data-ir-icon]::before { inset: 3px; background: transparent; clip-path: ${cut(6)}; transition: background .12s; }
${BOX} [data-ir-icon]:hover::before { background: color-mix(in srgb, var(--u-blue) 12%, transparent); }
${BOX} [data-ir-icon]::after { transition: transform .15s cubic-bezier(.2, 0, 0, 1); }
${BOX} [data-ir-icon]:hover::after { transform: translateY(-1px); }
${BOX} [data-ir-icon]:active::after { transform: scale(.94); transition-duration: .05s; }
${glyphRules(BOX, LIGHT)}
${glyphRules(`${BOX}[data-ir-theme="dark"]`, DARK)}`,

  discard: `
/* A bin with a gradient lid (its glyph is with the icons), 15% bigger, still the last button */
${BOX} [data-ir-icon="trash"] { transform: scale(1.15); margin-left: 6px; }
${BOX} [data-ir-icon="trash"]::after { background-image: ${glyph("trash", LIGHT)}; }
${BOX}[data-ir-theme="dark"] [data-ir-icon="trash"]::after { background-image: ${glyph("trash", DARK)}; }`,

  avatar: `
/* A thin violet ring on a paper gap, with a soft glow below */
[data-ir-avatar] { box-shadow: 0 0 0 2px var(--ir-paper, #fff), 0 0 0 3.5px #7c6cff, 0 6px 14px -4px rgba(124, 108, 255, .55) !important; }`,

  caret: `
/* Violet */
${EDITOR} { caret-color: var(--u-violet); }`,

  cursor: `
/* A dark arrow with the spark's diamond, a gradient arrow over anything clickable, a gradient I-beam */
${boxCursors(CURSORS)}`,

  selection: `
/* The strong blue under white text, apart from the pale comment wash */
${EDITOR} ::selection, ${EDITOR}::selection { background: #4c6fff; color: #fff; }`,

  comments: `
/* The shared comment blue with a straight underline (never red or wavy); pins and the note are cut corner tiles */
::highlight(ir-comment) { background-color: rgba(26, 143, 214, .12); text-decoration: underline 1px #1a8fd6; text-underline-offset: 3px; }
.ir-pin { min-width: 18px; height: 18px; padding: 0 5px; border: 0; background: #1a8fd6; color: #fff; font: 600 10.5px/18px ${FONT}; clip-path: ${cut(5)}; transition: transform .12s; }
.ir-pin:hover { transform: translateY(-1px); }
.ir-pin.ir-stale { background: #9aa0a6; }
.ir-note { padding: 10px 12px; color: inherit; border: 1px solid transparent; clip-path: ${cut(12)};
  background: linear-gradient(var(--ir-paper, #fff), var(--ir-paper, #fff)) padding-box, linear-gradient(120deg, ${LIGHT.blue}, ${LIGHT.violet} 55%, ${LIGHT.cyan}) border-box; }
.ir-note textarea { font-family: ${FONT}; }
.ir-note-hint { font: 500 11px/1 ${FONT}; opacity: .6; }
.ir-note-delete { border: 0; background: transparent; color: ${LIGHT.blue}; font: 500 12px/1 ${FONT}; padding: 5px 8px; }`,

  swoosh: `
/* The liquid copy of the text over the writing area (filtered through an SVG turbulence filter), and the
   New chip */
.ir-u-liquid { position: absolute; z-index: 6; overflow: hidden; pointer-events: none; box-sizing: border-box; background: var(--ir-paper); }
.ir-u-filter { position: absolute; width: 0; height: 0; }
.ir-u-new-layer { position: absolute; z-index: 7; pointer-events: none; }
.ir-u-new { position: absolute; right: 8px; top: 4px; padding: 4px 9px; font: 600 11px/1 ${FONT}; color: var(--u-ink); border: 1px solid transparent;
  background: linear-gradient(var(--u-tint), var(--u-tint)) padding-box, var(--u-grad) border-box; clip-path: ${cut(5)}; }`,
};

