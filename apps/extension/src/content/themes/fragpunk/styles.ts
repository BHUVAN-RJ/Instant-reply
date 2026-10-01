import type { CssSlot } from "../../theme/contract";
import { BAND, BOX, CARD, EDITOR, RULE, REFACTOR_CLASS, SKIN_CLASS, TOGGLE_CLASS, WINDOW, boxCursors, clearSendGroup, iconBase, svgCursor } from "../../theme/shared";
import { iconCss } from "./icons";
import { ACID, INK, MAG, PAPER, TORN } from "./palette";

// FragPunk (DESIGN.md next to this file): flat fills, a thick ink edge, torn outlines, hard offset
// shadows and a slight tilt. Colours follow the card: `data-ir-theme` is set from its background.

const MARKER = `"IR Marker", "Permanent Marker", "Comic Sans MS", cursive`;
// Box outline: straight left, torn right, jagged but straight bottom. The tears are a few pixels deep at
// any width (a percentage would turn into one obvious 10px step on a wide card).
const SHEET = "polygon(0 0, calc(100% - 0px) 0%, calc(100% - 2px) 6%, calc(100% - 0px) 13%, calc(100% - 4px) 21%, calc(100% - 1px) 28%, calc(100% - 3px) 36%, calc(100% - 0px) 44%, calc(100% - 5px) 52%, calc(100% - 1px) 60%, calc(100% - 3px) 67%, calc(100% - 0px) 75%, calc(100% - 4px) 83%, calc(100% - 1px) 91%, calc(100% - 2px) 100%, 88% calc(100% - 1px), 76% calc(100% - 4px), 63% calc(100% - 0px), 51% calc(100% - 3px), 38% calc(100% - 1px), 26% calc(100% - 4px), 13% calc(100% - 0px), 1% calc(100% - 3px), 0 calc(100% - 1px))";

// Cursors (32px, the most every system shows), one family: acid shapes with a 2px ink edge and a magenta
// hard shadow down right. Over anything clickable the arrow swaps to magenta with an acid shadow, like the
// switch when it is on.
const hardShadowed = (d: string, fill: string, shadow: string) =>
  `<path transform="translate(2.5 2.5)" fill="${shadow}" d="${d}"/><path fill="${fill}" stroke="${INK}" stroke-width="2" stroke-linejoin="miter" d="${d}"/>`;
const ARROW_PATH = "M3 3v21l5.5-5 4 8.5 4-2-4-8H20z";
const IBEAM_PATH = "M8 3h14l-2.5 3.5H17v19h2.5L22 29H8l2.5-3.5H13v-19h-2.5z";
const CURSORS = {
  arrow: svgCursor(hardShadowed(ARROW_PATH, ACID, MAG), 32, 3, 3, "default"),
  hand: svgCursor(hardShadowed(ARROW_PATH, MAG, ACID), 32, 3, 3, "pointer"),
  text: svgCursor(hardShadowed(IBEAM_PATH, ACID, MAG), 32, 15, 16),
};

export const css: Record<CssSlot, string> = {
  tokens: `
/* Ink edges on light cards, paper edges on dark ones */
[data-ir-theme] { --ir-edge: ${INK}; --ir-paper: #fff; }
[data-ir-theme="dark"] { --ir-edge: ${PAPER}; }`,

  card: `
/* An edge in --ir-edge, an acid sheet peeking out on the left, a magenta hard shadow on the right, torn
   right edge, jagged straight bottom. The skin is sized to the card by gmail.ts. */
${BOX} .aDj { border-radius: 0 !important; }
.${SKIN_CLASS} > i { position: absolute; inset: -3px; clip-path: ${SHEET}; }
.${SKIN_CLASS} .ir-sh { background: ${MAG}; transform: translate(8px, 7px); }
.${SKIN_CLASS} .ir-under { background: ${ACID}; transform: translate(-7px, -4px) rotate(.9deg); }
.${SKIN_CLASS} .ir-ink { background: var(--ir-edge); }
.${SKIN_CLASS} .ir-paper { inset: 0; background: var(--ir-paper); }`,

  head: `
/* A crooked ink bar behind the recipients line, sticking out past both sides, torn right end, magenta hard
   shadow. It tilts down on the right, so the left, where the caret starts, stays clear. The line's text
   and icons turn light on it. */
.${SKIN_CLASS} > b { position: absolute; top: 0; left: -10px; right: -12px; height: var(--ir-head, 0px); transform: rotate(.9deg);
  clip-path: polygon(0 0, 100% 6%, 98.6% 50%, 100% 100%, 0 100%, .8% 50%); }
/* An acid slab behind the bar, tilted with it and peeking out above and below, so the bar reads as
   stuck on at an angle rather than a crooked line against the card's straight top edge. */
.${SKIN_CLASS} .ir-bar-acid { top: -12px; left: -14px; right: -22px; height: calc(var(--ir-head, 0px) + 18px); background: ${ACID}; }
.${SKIN_CLASS} .ir-bar-sh { background: ${MAG}; translate: 5px 5px; }
.${SKIN_CLASS} .ir-bar { background: ${INK}; }
${BAND} [data-ir-head], ${BAND} [data-ir-head] * { color: #fff !important; background-color: transparent !important; }
${BAND} [data-ir-head] [role="button"], ${BAND} [data-ir-head] img { filter: brightness(0) invert(1) !important; opacity: 1 !important; }
${BAND} [data-ir-head] [role="button"] img { filter: none !important; }
/* Without the band (the default, and always in a window under Subject): the To line stays plain and the
   same bar shrinks to a crooked 5px ink rule with a magenta hard shadow between it and the body. */
${RULE} > .${SKIN_CLASS} > b { top: calc(var(--ir-head, 0px) - 4px); left: 0; right: 0; height: 5px; transform: rotate(-.35deg); clip-path: none; }
${RULE} > .${SKIN_CLASS} .ir-bar-acid { display: none; }
${RULE} > .${SKIN_CLASS} .ir-bar-sh { translate: 3px 3px; }`,

  body: `
/* With the To line band, the acid slab under the bar marks where the writing area starts */
${BAND} [data-ir-card] > table.iN { border-top: 6px solid transparent !important; }
/* With the rule, 10px of room between it and the text */
${RULE} table.iN { border-top: 10px solid transparent !important; }`,

  formatBar: `
/* A flat paper strip with an ink edge and a magenta hard shadow, square, slightly tilted; its buttons
   light up acid on hover. */
${BOX} .J-Z[role="toolbar"] { border-radius: 0 !important; background: var(--ir-paper) !important; border: 2px solid var(--ir-edge);
  box-shadow: 4px 4px 0 ${MAG}; transform: rotate(-.4deg); }
${BOX} .J-Z[role="toolbar"] .J-Z-axR { background: var(--ir-edge) !important; width: 2px !important; }
${BOX} .J-Z[role="toolbar"] [role="button"], ${BOX} .J-Z[role="toolbar"] [role="listbox"] { border-radius: 0 !important; transition: transform .1s; }
${BOX} .J-Z[role="toolbar"] [role="button"]:hover, ${BOX} .J-Z[role="toolbar"] [role="listbox"]:hover,
${BOX} .J-Z[role="toolbar"] [aria-pressed="true"] { background-color: ${ACID} !important; box-shadow: 0 0 0 3px ${ACID} !important; transform: rotate(-3deg); }
${BOX} .J-Z[role="toolbar"] [role="option"] { font: 400 14px/1.4 ${MARKER} !important; color: var(--ir-edge) !important; }`,

  pinnedRow: `
/* When the reply runs past the bottom of the window, Gmail pins the Send row there (.aDj.ahe, fixed) and
   draws it as a rounded white panel over the card, hiding the border's sides and bottom. Pinned, the row
   gets its own copy of the border: ink sides and bottom, acid on the left, the magenta hard shadow. */
${BOX} .aDj.ahe { box-shadow: none !important; }
${BOX} .aDj.ahe::before { inset: 0 -3px -3px !important; border: 3px solid var(--ir-edge) !important; border-top: 0 !important;
  border-radius: 0 !important; box-shadow: 8px 7px 0 ${MAG}, -7px 4px 0 ${ACID} !important; }
${BOX} .aDj.ahe::after { inset: 0 !important; background: var(--ir-paper) !important; border-radius: 0 !important; }`,

  window: `
/* A new email or a popped out reply: Gmail's window is already the frame, so nothing is drawn outside it.
   An acid band runs down the inside left edge; the To and Subject rows stay on paper in Gmail's colours
   (they are form fields) and the head slot's rule underlines them. The switch
   shrinks to its diamond sticker and Refactor tightens, so Gmail keeps room for its toolbar icons. */
${WINDOW} > .${SKIN_CLASS} > i { inset: 0; clip-path: none; transform: none; }
${WINDOW} > .${SKIN_CLASS} .ir-sh, ${WINDOW} > .${SKIN_CLASS} .ir-ink { display: none; }
${WINDOW} > .${SKIN_CLASS} .ir-under { right: auto; width: 6px; background: ${ACID}; }
${WINDOW} > .${SKIN_CLASS} .ir-paper { left: 6px; }
${WINDOW} .${TOGGLE_CLASS} { width: 34px; padding: 0; gap: 0; justify-content: center; font-size: 0; margin-left: 8px; }
${WINDOW} .${TOGGLE_CLASS} .ir-dot { width: 11px; height: 11px; }
${WINDOW} .${REFACTOR_CLASS} { padding: 2px 11px 0; font-size: 15px; margin-left: 8px; }`,

  toggle: `
/* Dashed outline when off, a tilted torn magenta sticker when on */
.${TOGGLE_CLASS} {
  display: inline-flex; align-items: center; gap: 7px; height: 34px; padding: 2px 13px 0; margin-left: 10px;
  border: 2px dashed var(--ir-edge, ${INK}); border-radius: 0; background: transparent; color: var(--ir-edge, ${INK});
  font: 400 15px/1 ${MARKER}; opacity: .8; transition: transform .12s, opacity .12s;
}
.${TOGGLE_CLASS}:hover { opacity: 1; transform: rotate(-1deg); }
.${TOGGLE_CLASS} .ir-dot { width: 8px; height: 8px; border: 2px solid currentColor; transform: rotate(45deg); box-sizing: border-box; }
.${TOGGLE_CLASS}[data-active="true"] { opacity: 1; border: 2px solid ${INK}; background: ${MAG}; color: #fff; transform: rotate(2deg); clip-path: ${TORN}; }
.${TOGGLE_CLASS}[data-active="true"] .ir-dot { background: ${ACID}; border-color: ${INK}; }
.${TOGGLE_CLASS}:focus-visible { outline: 3px solid ${MAG}; outline-offset: 2px; }
/* The torn clip path would cut an outside ring off, so the on sticker draws its focus ring inside */
.${TOGGLE_CLASS}[data-active="true"]:focus-visible { outline: 3px solid ${ACID}; outline-offset: -7px; }`,

  refactor: `
/* A tilted torn acid sticker in Permanent Marker */
.${REFACTOR_CLASS} {
  display: inline-flex; align-items: center; height: 36px; padding: 2px 16px 0; margin-left: 10px;
  border: 2px solid ${INK}; border-radius: 0; background: ${ACID}; color: ${INK};
  font: 400 17px/1 ${MARKER}; transform: rotate(-2deg); clip-path: ${TORN}; transition: transform .12s;
}
.${REFACTOR_CLASS}:hover:not(:disabled) { transform: rotate(1deg) scale(1.04); }
.${REFACTOR_CLASS}:active:not(:disabled) { transform: rotate(-2deg) translate(2px, 2px) scale(.97); transition-duration: .04s; }
/* The torn clip path would cut an outside ring off, so the focus ring sits inside the sticker */
.${REFACTOR_CLASS}:focus-visible { outline: 3px solid ${MAG}; outline-offset: -7px; }`,

  send: `
/* Send and its schedule arrow restyled in place: one ink torn sticker split by an acid seam. */
${clearSendGroup()}
${BOX} .dC { transform: rotate(-2deg); filter: drop-shadow(3px 3px 0 ${ACID}); transition: filter .12s; }
${BOX} .dC .T-I { background-image: none !important; background-color: ${INK} !important; color: ${ACID} !important; border: 0 !important; border-radius: 0 !important; margin: 0 !important; transition: transform .12s, color .12s; }
${BOX} .dC .aoO { font: 400 17px/1 ${MARKER} !important; letter-spacing: 0 !important; padding: 0 16px !important;
  clip-path: polygon(0 4%, 12% 0, 40% 3%, 70% 0, 100% 2%, 100% 100%, 60% 96%, 30% 100%, 2% 97%, 0 55%); }
${BOX} .dC .hG { border-left: 2px solid ${ACID} !important; clip-path: polygon(0 2%, 60% 0, 100% 6%, 96% 60%, 100% 100%, 50% 96%, 0 100%); }
${BOX} .dC .hG * { filter: brightness(0) invert(1) sepia(1) saturate(8) hue-rotate(15deg); }
${BOX} .dC .T-I:focus-visible { background-color: #2a2533 !important; }
/* Send reacts: the group's acid shadow grows on hover, the hovered half lifts and lights up, a press stamps it down */
${BOX} .dC:hover { filter: drop-shadow(5px 5px 0 ${ACID}) drop-shadow(-2px -2px 0 ${MAG}); }
${BOX} .dC .T-I:hover { transform: translate(-1px, -2px) rotate(-1.5deg); color: #fff !important; }
${BOX} .dC .hG:hover * { filter: brightness(0) invert(1); }
${BOX} .dC .T-I:active { transform: translate(2px, 2px); transition-duration: .04s; }`,

  icons: `
/* FragPunk glyphs; a tilted torn acid block behind them on hover */
${iconBase()}
${BOX} [data-ir-icon]::before { inset: 1px; background: ${ACID}; clip-path: ${TORN}; transform: rotate(-4deg); opacity: 0; transition: opacity .1s; }
${BOX} [data-ir-icon]:hover::before { opacity: 1; }
${BOX} [data-ir-icon]::after { transition: transform .12s; }
${BOX} [data-ir-icon]:hover::after { transform: translateY(-1px) rotate(-6deg) scale(1.12); }
${BOX} [data-ir-icon]:active::after { transform: scale(.94); transition-duration: .04s; }
${iconCss(BOX)}`,

  discard: `
/* 35% bigger, easier to reach, still the last button; magenta block on hover */
${BOX} [data-ir-icon="trash"] { transform: scale(1.35); margin: 0 6px 0 8px; }
${BOX} [data-ir-icon="trash"]::before { background: ${MAG}; }`,

  avatar: `
/* Cut from a circle into a tilted octagon sticker with hard shadows */
[data-ir-avatar] { border-radius: 0 !important; transform: rotate(-6deg);
  clip-path: polygon(28% 0, 74% 3%, 100% 27%, 97% 73%, 72% 100%, 27% 97%, 0 72%, 3% 28%); }
[data-ir-avatar-wrap] { filter: drop-shadow(3px 3px 0 ${MAG}) drop-shadow(-2px -2px 0 ${ACID}); }`,

  caret: `
/* Magenta, so it is easy to spot */
${EDITOR} { caret-color: ${MAG}; }`,

  cursor: `
/* Acid arrow, magenta hand, acid I-beam, all with an ink edge and a hard shadow */
${boxCursors(CURSORS)}`,

  selection: `
/* Magenta with white text: loud, and apart from the acid comment highlight */
${EDITOR} ::selection, ${EDITOR}::selection { background: ${MAG}; color: #fff; }`,

  comments: `
/* The passage gets an acid highlighter streak with a blue underline (never red, which would read as a
   mistake), a torn blue pin with its number sits at its end, and the note box is a tilted paper sticker. */
::highlight(ir-comment) { background-color: rgba(230, 255, 31, .6); text-decoration: underline 2px #2b6cff; text-underline-offset: 3px; }
.ir-pin { min-width: 20px; height: 20px; padding: 2px 5px 0; border: 2px solid ${INK}; border-radius: 0;
  background: #2b6cff; color: #fff; font: 400 12px/1 ${MARKER}; clip-path: ${TORN}; transform: rotate(-8deg); transition: transform .12s; }
.ir-pin:hover { transform: rotate(4deg) scale(1.15); }
.ir-pin.ir-stale { background: #8d8a93; }
.ir-note { padding: 8px 10px; background: #fff; color: ${INK}; border: 2px solid ${INK}; box-shadow: 5px 5px 0 ${MAG}, -3px -3px 0 ${ACID}; transform: rotate(-.6deg); }
.ir-note-hint { font: 400 11px/1 ${MARKER}; opacity: .65; }
.ir-note-delete { border: 2px solid ${INK}; background: ${ACID}; color: ${INK}; font: 400 12px/1 ${MARKER}; padding: 3px 8px 1px; }`,

  swoosh: `
/* Before: the old text flickers out of register */
.ir-glitch { animation: ir-flicker .3s steps(3) infinite; }
@keyframes ir-flicker {
  33% { transform: translateX(-2px); text-shadow: 2px 0 ${MAG}; }
  66% { transform: translateX(2px); text-shadow: -2px 0 #c8e600; }
}

/* During: the sweep overlay */
.ir-ghost { position: absolute; z-index: 6; box-sizing: border-box; overflow: hidden; background: var(--ir-paper, #fff); pointer-events: none;
  text-shadow: -2px 0 rgba(255,46,136,.8), 2px 0 rgba(200,230,0,.9); }
.ir-sweep { position: absolute; z-index: 7; pointer-events: none; }

/* After: the box shakes on impact; with the New mark, the New! stamp slams in, its top right corner
   curls and lets go, it swings from the top left and drops */
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
@keyframes ir-slam { 20% { transform: translate(-4px, 2px); } 40% { transform: translate(4px, -2px); } 60% { transform: translate(-2px, 1px); } 80% { transform: translate(2px, 0); } }`,
};
