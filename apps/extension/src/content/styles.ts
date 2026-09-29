import { iconCss } from "./icons";
import { ACID, INK, MAG, PAPER, TORN } from "./palette";

// Everything Instant Reply draws inside Gmail, in the FragPunk look: flat fills, a thick ink edge,
// torn outlines, hard offset shadows and a slight tilt. Only the border around the reply card changes, and only
// while its thread is on. Colours follow the card: `data-ir-theme` is set from its background.

export const TOGGLE_CLASS = "ir-toggle";
export const REFACTOR_CLASS = "ir-refactor";
export const ACTIVE_BOX_CLASS = "ir-active-box";
export const BUSY_EDITOR_CLASS = "ir-busy";
export const SKIN_CLASS = "ir-skin";

const MARKER = `"IR Marker", "Permanent Marker", "Comic Sans MS", cursive`;
const BOX = `.${ACTIVE_BOX_CLASS}`;
// Box outline: straight left, torn right, jagged but straight bottom.
const SHEET = "polygon(0 0, 100% 0, 99.3% 38%, 100% 70%, 99.4% 100%, 72% 98.8%, 45% 100%, 18% 99%, 1% 98.6%, 0 48%)";

export function buildStyles(fontUrl: string): string {
  return `
@font-face { font-family: "IR Marker"; src: url("${fontUrl}") format("woff2"); font-display: swap; }

/* Theme: ink edges on light cards, paper edges on dark ones */
[data-ir-theme] { --ir-edge: ${INK}; --ir-paper: #fff; }
[data-ir-theme="dark"] { --ir-edge: ${PAPER}; }

/* On/off switch, next to Send in every reply box */
.${TOGGLE_CLASS} {
  display: inline-flex; align-items: center; gap: 7px; height: 34px; padding: 2px 13px 0; margin-left: 10px; vertical-align: middle;
  border: 2px dashed var(--ir-edge, ${INK}); border-radius: 0; background: transparent; color: var(--ir-edge, ${INK});
  font: 400 15px/1 ${MARKER}; cursor: pointer; white-space: nowrap; opacity: .8; transition: transform .12s, opacity .12s;
}
.${TOGGLE_CLASS}:hover { opacity: 1; transform: rotate(-1deg); }
.${TOGGLE_CLASS} .ir-dot { width: 8px; height: 8px; border: 2px solid currentColor; transform: rotate(45deg); box-sizing: border-box; }
.${TOGGLE_CLASS}[data-active="true"] { opacity: 1; border: 2px solid ${INK}; background: ${MAG}; color: #fff; transform: rotate(2deg); clip-path: ${TORN}; }
.${TOGGLE_CLASS}[data-active="true"] .ir-dot { background: ${ACID}; border-color: ${INK}; }
.${TOGGLE_CLASS}:focus-visible { outline: 3px solid ${MAG}; outline-offset: 2px; }

/* Refactor button */
.${REFACTOR_CLASS} {
  display: inline-flex; align-items: center; height: 36px; padding: 2px 16px 0; margin-left: 10px; vertical-align: middle;
  border: 2px solid ${INK}; border-radius: 0; background: ${ACID}; color: ${INK};
  font: 400 17px/1 ${MARKER}; cursor: pointer; white-space: nowrap;
  transform: rotate(-2deg); clip-path: ${TORN}; transition: transform .12s;
}
.${REFACTOR_CLASS}:hover:not(:disabled) { transform: rotate(1deg) scale(1.04); }
.${REFACTOR_CLASS}:disabled { cursor: progress; }
.${REFACTOR_CLASS}:focus-visible { outline: 3px solid ${MAG}; outline-offset: 2px; }

/* Reply card border: an edge in --ir-edge, an acid sheet peeking out on the left, a magenta hard shadow on
   the right, torn right edge, jagged straight bottom. The skin is sized to the card by gmail.ts. */
${BOX} { position: relative; isolation: isolate; }
${BOX} [data-ir-card] { border-radius: 0 !important; box-shadow: none !important; background: transparent !important; }
.${SKIN_CLASS} { position: absolute; z-index: -1; pointer-events: none; }
.${SKIN_CLASS} > i { position: absolute; inset: -3px; clip-path: ${SHEET}; }
.${SKIN_CLASS} .ir-sh { background: ${MAG}; transform: translate(8px, 7px); }
.${SKIN_CLASS} .ir-under { background: ${ACID}; transform: translate(-7px, -4px) rotate(-1.1deg); }
.${SKIN_CLASS} .ir-ink { background: var(--ir-edge); }
.${SKIN_CLASS} .ir-paper { inset: 0; background: var(--ir-paper); }

/* Top: a crooked ink bar behind the recipients line, sticking out past both sides, torn right end,
   magenta hard shadow. The line's text and icons turn light on it. */
.${SKIN_CLASS} > b { position: absolute; top: 0; left: -10px; right: -12px; height: var(--ir-head, 0px); transform: rotate(-.9deg);
  clip-path: polygon(0 0, 100% 6%, 98.6% 50%, 100% 100%, 0 100%, .8% 50%); }
.${SKIN_CLASS} .ir-bar-sh { background: ${MAG}; translate: 5px 5px; }
.${SKIN_CLASS} .ir-bar { background: ${INK}; }
${BOX} [data-ir-head], ${BOX} [data-ir-head] * { color: #fff !important; background-color: transparent !important; }
${BOX} [data-ir-head] [role="button"], ${BOX} [data-ir-head] img { filter: brightness(0) invert(1) !important; opacity: 1 !important; }
${BOX} [data-ir-head] [role="button"] img { filter: none !important; }

/* Body: an acid rule marks where the writing area starts, and the caret is magenta so it is easy to spot */
${BOX} [data-ir-card] > table.iN { border-top: 3px solid ${ACID} !important; }
${BOX} [contenteditable="true"][role="textbox"] { caret-color: ${MAG}; }
.ir-toggle-cell { vertical-align: middle; padding: 0 10px 0 6px; white-space: nowrap; }

/* Discard: bigger, easier to reach, still the last button */
${BOX} [data-ir-icon="trash"] { transform: scale(1.35); margin: 0 6px 0 8px; }

/* The sender's avatar: cut from a circle into a tilted octagon sticker with hard shadows */
[data-ir-avatar] { border-radius: 0 !important; transform: rotate(-6deg);
  clip-path: polygon(28% 0, 74% 3%, 100% 27%, 97% 73%, 72% 100%, 27% 97%, 0 72%, 3% 28%); }
[data-ir-avatar-wrap] { filter: drop-shadow(3px 3px 0 ${MAG}) drop-shadow(-2px -2px 0 ${ACID}); }

/* Send and its schedule arrow restyled in place: one ink torn sticker split by an acid seam.
   Gmail's own blue fill, borders and focus ring are cleared on the group and everything in it. */
${BOX} .dC { transform: rotate(-2deg); filter: drop-shadow(3px 3px 0 ${ACID}); }
${BOX} .dC, ${BOX} .dC * { background-color: transparent !important; border-color: transparent !important; box-shadow: none !important; outline: none !important; }
${BOX} .dC .T-I { background-image: none !important; background-color: ${INK} !important; color: ${ACID} !important; border: 0 !important; border-radius: 0 !important; margin: 0 !important; }
${BOX} .dC .aoO { font: 400 17px/1 ${MARKER} !important; letter-spacing: 0 !important; padding: 0 16px !important;
  clip-path: polygon(0 4%, 12% 0, 40% 3%, 70% 0, 100% 2%, 100% 100%, 60% 96%, 30% 100%, 2% 97%, 0 55%); }
${BOX} .dC .hG { border-left: 2px solid ${ACID} !important; clip-path: polygon(0 2%, 60% 0, 100% 6%, 96% 60%, 100% 100%, 50% 96%, 0 100%); }
${BOX} .dC .hG * { filter: brightness(0) invert(1) sepia(1) saturate(8) hue-rotate(15deg); }
${BOX} .dC .T-I:focus-visible { background-color: #2a2533 !important; }

/* Toolbar icons: FragPunk glyphs, a tilted torn acid block on hover (magenta for Discard) */
${BOX} [data-ir-icon] { position: relative; background-image: none !important; }
${BOX} [data-ir-icon] > * { opacity: 0 !important; }
${BOX} [data-ir-icon]:hover { background-color: transparent !important; }
${BOX} [data-ir-icon]::before {
  content: ""; position: absolute; inset: 1px; background: ${ACID}; clip-path: ${TORN};
  transform: rotate(-4deg); opacity: 0; transition: opacity .1s; pointer-events: none;
}
${BOX} [data-ir-icon="trash"]::before { background: ${MAG}; }
${BOX} [data-ir-icon]:hover::before { opacity: 1; }
${BOX} [data-ir-icon]::after {
  content: ""; position: absolute; left: 50%; top: 50%; width: 21px; height: 21px; margin: -10.5px 0 0 -10.5px;
  background: center / contain no-repeat; pointer-events: none;
}
${iconCss(BOX)}

/* Waiting for the model: the old text flickers out of register */
.${BUSY_EDITOR_CLASS} { pointer-events: none; animation: ir-flicker .3s steps(3) infinite; }
@keyframes ir-flicker {
  33% { transform: translateX(-2px); text-shadow: 2px 0 ${MAG}; }
  66% { transform: translateX(2px); text-shadow: -2px 0 #c8e600; }
}

/* The sweep overlay */
.ir-ghost { position: absolute; z-index: 6; box-sizing: border-box; overflow: hidden; background: var(--ir-paper, #fff); pointer-events: none;
  text-shadow: -2px 0 rgba(255,46,136,.8), 2px 0 rgba(200,230,0,.9); }
.ir-sweep { position: absolute; z-index: 7; pointer-events: none; }

/* The New! stamp: slams in, top right corner curls and lets go, swings from the top left, drops */
@property --ir-fold { syntax: "<length>"; inherits: true; initial-value: 0px; }
.ir-stamp { position: absolute; z-index: 8; pointer-events: none; animation: ir-stamp-in 3.2s forwards; }
.ir-sheet { position: relative; transform-origin: 6px 6px; --ir-fold: 0px; animation: ir-poster 3.2s forwards, ir-curl 3.2s forwards; }
.ir-sheet-shadow, .ir-face { clip-path: polygon(0 5%, 10% 0, 42% 4%, calc(100% - var(--ir-fold)) 0, 100% calc(6% + var(--ir-fold)), 98% 58%, 100% 100%, 60% 95%, 28% 100%, 2% 96%, 0 52%); }
.ir-sheet-shadow { position: absolute; inset: 0; transform: translate(5px, 5px); background: ${MAG}; }
.ir-face { position: relative; padding: 10px 22px 6px; background: ${ACID}; color: ${INK}; border: 3px solid ${INK}; font: 400 32px/1 ${MARKER}; white-space: nowrap; }
.ir-face::after { content: ""; position: absolute; top: -3px; right: -3px; width: var(--ir-fold); height: var(--ir-fold); background: linear-gradient(45deg, #9fb000, #c8e000); clip-path: polygon(0 0, 100% 100%, 0 100%); }
.ir-face::before { content: ""; position: absolute; top: -3px; right: -3px; z-index: 1; width: var(--ir-fold); height: var(--ir-fold);
  background: linear-gradient(to top right, transparent calc(50% - 1.5px), ${INK} calc(50% - 1.5px), ${INK} calc(50% + 1.5px), transparent calc(50% + 1.5px)); }
@keyframes ir-stamp-in {
  0% { opacity: 0; transform: rotate(-7deg) scale(2.8); animation-timing-function: cubic-bezier(.6,0,1,.6); }
  7%, 100% { opacity: 1; transform: rotate(-7deg) scale(1); }
}
@keyframes ir-curl { 0%, 38% { --ir-fold: 0px; } 50% { --ir-fold: 26px; } 56%, 100% { --ir-fold: 34px; } }
@keyframes ir-poster {
  0%, 50% { transform: rotate(0); opacity: 1; animation-timing-function: cubic-bezier(.5,0,.7,1); }
  58% { transform: rotate(24deg); animation-timing-function: ease-out; }
  63% { transform: rotate(15deg); animation-timing-function: ease-in-out; }
  68% { transform: rotate(21deg); animation-timing-function: ease-in-out; }
  73% { transform: rotate(18deg) translateY(0); opacity: 1; animation-timing-function: cubic-bezier(.55,0,.95,.45); }
  100% { transform: rotate(46deg) translate(40px, 330px); opacity: 0; }
}
.ir-shake { animation: ir-slam .26s linear; }
@keyframes ir-slam { 20% { transform: translate(-4px, 2px); } 40% { transform: translate(4px, -2px); } 60% { transform: translate(-2px, 1px); } 80% { transform: translate(2px, 0); } }

@media (prefers-reduced-motion: reduce) {
  .${BUSY_EDITOR_CLASS}, .ir-shake { animation: none; }
  .${REFACTOR_CLASS} { transition: none; }
}
`;
}
