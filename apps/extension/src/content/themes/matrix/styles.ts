import type { CssSlot } from "../../theme/contract";
import { BAND, BOX, EDITOR, RULE, REFACTOR_CLASS, SKIN_CLASS, TOGGLE_CLASS, WINDOW, boxCursors, clearSendGroup, iconBase } from "../../theme/shared";
import { CURSORS, ICON_NAMES, glyphRules } from "./glyphs";
import { CODE_LIGHT, DEEP, GLASS, HOT_LIGHT, MID, OCR, PH, TERMINAL, WHITE } from "./palette";

// The Matrix look (DESIGN.md next to this file; mockup in docs/design/matrix/mockup.html). Faint code
// rain across the whole card inside a HUD frame, shell buttons in VT323, pixel glyphs and cursors.
// Colours follow the card: `data-ir-theme` is set from its background.

const SKIN = `.${SKIN_CLASS}`;
const SCAN = "repeating-linear-gradient(0deg, rgba(0, 0, 0, .24) 0 1px, transparent 1px 3px)";
/** The HUD outline: the top left and bottom right corners cut at 45 degrees. */
const HUD = "polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)";
const TICKS = (deg: number) => `repeating-linear-gradient(${deg}deg, var(--mx-line) 0 2px, transparent 2px 8px)`;
/** Light cards: Gmail's light theme (the box is only marked dark). */
const LIGHT = `${BOX}:not([data-ir-theme="dark"])`;
const FOCUS = `outline: 2px solid ${MID}; outline-offset: 2px;`;

export const css: Record<CssSlot, string> = {
  tokens: `
/* Deep green ink on light cards, phosphor on dark ones */
${BOX} { --mx-edge: ${DEEP}; --mx-line: ${MID}; --mx-code: ${CODE_LIGHT}; --mx-hot: ${HOT_LIGHT}; }
${BOX}[data-ir-theme="dark"] { --mx-edge: ${PH}; --mx-line: ${PH}; --mx-code: ${PH}; --mx-hot: ${WHITE}; }`,

  card: `
/* The HUD frame. Back to front: a 1px line following the cut corners, the paper, the faint code rain
   (drawn by the ornament, still under the text), bright segments after each cut and tick marks. */
${BOX} .aDj { border-radius: 0 !important; }
${SKIN} > * { position: absolute; }
${SKIN} > .ir-mx-edge { inset: -1px; z-index: 0; background: color-mix(in srgb, var(--mx-line) 60%, transparent); clip-path: ${HUD}; }
${SKIN} > .ir-mx-paper { inset: 0; z-index: 1; background: var(--ir-paper); clip-path: ${HUD}; }
${SKIN} > .ir-mx-rain { inset: 0; z-index: 2; overflow: hidden; clip-path: ${HUD}; animation: mx-power .6s ease-out both; }
${SKIN} > .ir-mx-rain > canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
${SKIN} > .ir-mx-seg { z-index: 3; width: 72px; height: 3px; background: var(--mx-line); box-shadow: 0 0 6px rgba(0, 255, 65, .6); }
${SKIN} > .ir-mx-seg-a { top: -2px; left: 15px; }
${SKIN} > .ir-mx-seg-b { bottom: -2px; right: 15px; }
${SKIN} > .ir-mx-ticks { z-index: 3; }
${SKIN} > .ir-mx-ticks-a { top: -7px; right: 0; width: 132px; height: 3px; background: ${TICKS(90)}; }
${SKIN} > .ir-mx-ticks-b { left: -7px; bottom: 26px; width: 3px; height: 64px; background: ${TICKS(0)}; }
/* While the model thinks the line breathes */
${BOX}.mx-thinking > ${SKIN} > .ir-mx-edge { animation: mx-breathe 1.2s ease-in-out infinite; }
@keyframes mx-breathe { 50% { filter: brightness(1.7) drop-shadow(0 0 6px ${PH}); } }
@keyframes mx-power { from { opacity: 0; } }`,

  head: `
/* The rule (default, and always under Subject in a window): a plain glowing hairline. */
${SKIN} > .ir-mx-rule, ${SKIN} > .ir-mx-band { display: none; z-index: 4; }
${RULE} > ${SKIN} > .ir-mx-rule { display: block; left: 14px; right: 14px; top: calc(var(--ir-head, 0px) - 2px); height: 1.5px; background: var(--mx-line); box-shadow: 0 0 5px rgba(0, 255, 65, .8); }
/* The band (opt in): black glass behind the recipients line with faint still rain, a phosphor bottom
   line, and the line's text and icons in phosphor. */
${BAND} > ${SKIN} > .ir-mx-band { display: block; left: 0; right: 0; top: 0; height: var(--ir-head, 0px); overflow: hidden; clip-path: ${HUD};
  background: ${SCAN}, ${GLASS}; border-bottom: 1px solid ${PH}; }
${BAND} > ${SKIN} > .ir-mx-band > canvas { position: absolute; inset: 0; width: 100%; height: 100%; -webkit-mask: linear-gradient(90deg, transparent 30%, #000); mask: linear-gradient(90deg, transparent 30%, #000); }
${BAND} [data-ir-head], ${BAND} [data-ir-head] * { color: ${PH} !important; }
${BAND} [data-ir-head] [role="button"], ${BAND} [data-ir-head] img { filter: brightness(0) invert(1) sepia(1) saturate(5) hue-rotate(70deg) !important; opacity: 1 !important; }`,

  body: `
/* Room between the rule and the text */
${RULE} table.iN { border-top: 10px solid transparent !important; }
/* Gmail paints the writing area white; clear it so the faint rain runs behind the text too. Only the
   containers: anything inside the email keeps its own colours. */
${BOX} table.iN, ${BOX} table.iN > tbody > tr > td, ${BOX} table.iN .Ar, ${BOX} table.iN .Au, ${BOX} table.iN .Am, ${EDITOR} { background-color: transparent !important; }`,

  formatBar: `
/* No fill: the bar sits on the paper between two dashed hairlines, like the shell buttons' underlines */
${BOX} .J-Z[role="toolbar"] { border-radius: 0 !important; background: transparent !important; box-shadow: none !important;
  border-top: 1px dashed color-mix(in srgb, var(--mx-line) 45%, transparent); border-bottom: 1px dashed color-mix(in srgb, var(--mx-line) 45%, transparent); }
${BOX} .J-Z[role="toolbar"] [role="button"], ${BOX} .J-Z[role="toolbar"] [role="listbox"] { border-radius: 0 !important; color: var(--mx-edge) !important; transition: background-color .12s, color .12s; }
${BOX} .J-Z[role="toolbar"] [role="listbox"] { font: 13px ${OCR} !important; }
${BOX} .J-Z[role="toolbar"] [role="button"]:hover, ${BOX} .J-Z[role="toolbar"] [role="listbox"]:hover { background-color: rgba(0, 255, 65, .14) !important; color: var(--mx-line) !important; }
${BOX} .J-Z[role="toolbar"] [role="button"]:active, ${BOX} .J-Z[role="toolbar"] [aria-pressed="true"] { background-color: rgba(0, 255, 65, .3) !important; }
${BOX} .J-Z[role="toolbar"] .J-Z-axR { background: color-mix(in srgb, var(--mx-line) 35%, transparent) !important; }
${BOX}[data-ir-theme="dark"] .J-Z[role="toolbar"] [role="button"] { filter: brightness(0) invert(1) sepia(1) saturate(5) hue-rotate(70deg); }
${BOX} .J-Z[role="toolbar"] [role="option"] { font: 13px ${OCR} !important; }`,

  pinnedRow: `
/* Pinned to the window bottom, the Send row gets its own paper and the HUD line on its sides and bottom,
   with the bottom right cut. */
${BOX} .aDj.ahe { box-shadow: none !important; }
${BOX} .aDj.ahe::before { inset: 0 -1px -1px !important; border-radius: 0 !important; box-shadow: none !important; border: 0 !important;
  background: color-mix(in srgb, var(--mx-line) 60%, transparent) !important; clip-path: polygon(0 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%); }
${BOX} .aDj.ahe::after { inset: 0 0 1px 1px !important; border-radius: 0 !important; background: var(--ir-paper) !important;
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%); }`,

  window: `
/* Gmail's window is the frame: no HUD line, segments or ticks, and the rain runs only below To and
   Subject so the form fields stay plain. The switch shrinks to its pill, Refactor tightens. */
${WINDOW} > ${SKIN} > .ir-mx-edge, ${WINDOW} > ${SKIN} > .ir-mx-seg, ${WINDOW} > ${SKIN} > .ir-mx-ticks { display: none; }
${WINDOW} > ${SKIN} > .ir-mx-paper, ${WINDOW} > ${SKIN} > .ir-mx-rain { clip-path: none; }
${WINDOW} > ${SKIN} > .ir-mx-rain { top: var(--ir-head, 0px); }
${WINDOW} .${TOGGLE_CLASS} { width: 34px; padding: 0; justify-content: center; font-size: 0; }
${WINDOW} .${TOGGLE_CLASS} .ir-dot { margin: 0; }
${WINDOW} .${REFACTOR_CLASS} { padding: 0 6px; margin-left: 8px; font-size: 18px; }
${WINDOW} .dC .T-I { font-size: 18px !important; }
${WINDOW} .dC .aoO { padding: 0 6px !important; }
${WINDOW} .dC .hG { margin-left: 3px !important; padding: 0 5px !important; }`,

  toggle: `
/* A shell line with the pills: blue while off, the red one once taken */
.${TOGGLE_CLASS} { display: inline-flex; align-items: center; height: 30px; padding: 0 8px 0 6px; margin-left: 8px; border: 0; border-radius: 0;
  border-bottom: 1px dashed color-mix(in srgb, currentColor 55%, transparent); background: transparent; color: inherit;
  font: 18px/1 ${TERMINAL}; letter-spacing: .08em; text-transform: uppercase; transition: color .12s, border-color .12s; }
${BOX} .${TOGGLE_CLASS} { color: var(--mx-edge); border-bottom-color: color-mix(in srgb, var(--mx-line) 70%, transparent); }
.${TOGGLE_CLASS}:hover, .${TOGGLE_CLASS}[data-active="true"] { color: var(--mx-line, ${MID}); border-bottom: 1px solid var(--mx-line, ${MID}); }
.${TOGGLE_CLASS}:focus-visible { ${FOCUS} }
.${TOGGLE_CLASS} .ir-dot { display: inline-block; position: relative; flex: none; width: 24px; height: 11px; margin-right: 9px; border-radius: 6px; transform: rotate(-18deg);
  background: linear-gradient(180deg, #b3ccff 0%, #3f78ff 36%, #1446c8 70%, #0a2780 100%); box-shadow: 0 1px 2px rgba(0, 0, 0, .5), inset 0 -1px 1px rgba(255, 255, 255, .3); transition: transform .15s; }
.${TOGGLE_CLASS} .ir-dot::after { content: ""; position: absolute; left: 4px; top: 2px; width: 9px; height: 3px; border-radius: 2px; background: rgba(255, 255, 255, .75); }
.${TOGGLE_CLASS}:hover .ir-dot { transform: rotate(-8deg) translateY(-1px); }
.${TOGGLE_CLASS}[data-active="true"] .ir-dot { transform: rotate(18deg); background: linear-gradient(180deg, #ffb0b0 0%, #ff3346 36%, #c40d22 70%, #6e0410 100%); }`,

  refactor: `
/* Shell: a dim $ prompt, the command, a dashed underline. Hover turns the $ into > with a blinking block;
   press sends the line forward like Enter; working, the > blinks while the label traces. */
.${REFACTOR_CLASS} { position: relative; display: inline-flex; align-items: center; height: 36px; padding: 0 10px; margin-left: 10px; border: 0; border-radius: 0; background: transparent;
  border-bottom: 1px dashed color-mix(in srgb, var(--mx-line, ${MID}) 70%, transparent); color: var(--mx-edge, ${DEEP});
  font: 23px/1 ${TERMINAL}; letter-spacing: .08em; text-transform: uppercase; transition: color .12s, border-color .12s, transform .05s; }
.${REFACTOR_CLASS}::before { content: "$"; margin-right: .35em; color: color-mix(in srgb, var(--mx-line, ${MID}) 55%, transparent); }
.${REFACTOR_CLASS}::after { content: ""; width: .5em; height: .85em; margin-left: .15em; background: currentColor; opacity: 0; }
.${REFACTOR_CLASS}:hover:not(:disabled) { color: var(--mx-line); border-bottom-style: solid; }
.${REFACTOR_CLASS}:hover:not(:disabled)::before { content: ">"; color: var(--mx-line); }
.${REFACTOR_CLASS}:hover:not(:disabled)::after { opacity: 1; animation: mx-blink 1.06s steps(1) infinite; }
.${REFACTOR_CLASS}:active:not(:disabled) { transform: translateX(3px); color: var(--mx-hot); border-bottom: 2px solid var(--mx-hot); transition-duration: .04s; }
.${REFACTOR_CLASS}:disabled::before { content: ">"; color: var(--mx-line); animation: mx-blink .5s steps(1) infinite; }
.${REFACTOR_CLASS}:focus-visible { ${FOCUS} }
@keyframes mx-blink { 50% { opacity: 0; } }`,

  send: `
/* Send and its schedule arrow as the same shell line as Refactor */
${clearSendGroup()}
${BOX} .dC .T-I { background-image: none !important; color: var(--mx-edge) !important; border-radius: 0 !important; border: 0 !important; margin: 0 !important;
  border-bottom: 1px dashed color-mix(in srgb, var(--mx-line) 70%, transparent) !important; font: 22px/1 ${TERMINAL} !important; letter-spacing: .08em !important;
  text-transform: uppercase; transition: color .12s, transform .05s; }
${BOX} .dC .aoO { padding: 0 10px !important; }
${BOX} .dC .aoO::before { content: "$" !important; display: inline-block !important; position: static !important; inset: auto !important; width: auto !important; height: auto !important;
  background: none !important; opacity: 1 !important; transform: none !important; margin-right: .35em; color: color-mix(in srgb, var(--mx-line) 55%, transparent); }
${BOX} .dC .aoO::after { content: "" !important; display: inline-block !important; position: static !important; inset: auto !important; width: .5em !important; height: .85em !important;
  margin-left: .15em; background: currentColor !important; opacity: 0; transform: none !important; }
${BOX} .dC .hG { margin-left: 6px !important; padding: 0 8px !important; }
${BOX} .dC .hG * { filter: brightness(0) invert(.25) sepia(1) saturate(6) hue-rotate(75deg); }
${BOX}[data-ir-theme="dark"] .dC .hG * { filter: brightness(0) invert(1) sepia(1) saturate(5) hue-rotate(70deg); }
${BOX} .dC .T-I:hover { color: var(--mx-line) !important; border-bottom-style: solid !important; }
${BOX} .dC .aoO:hover::before { content: ">" !important; color: var(--mx-line); }
${BOX} .dC .aoO:hover::after { opacity: 1 !important; animation: mx-blink 1.06s steps(1) infinite; }
${BOX} .dC .T-I:active { transform: translateX(3px); color: var(--mx-hot) !important; border-bottom: 2px solid var(--mx-hot) !important; transition-duration: .04s; }
${BOX} .dC .T-I:focus-visible { ${FOCUS} }
/* On light cards Send is the one real key: a pale green fill, a thin solid edge and a small shadow, the
   arrow joined to it, so it stands apart from Refactor's bare shell line. Dark cards keep the shell line. */
${LIGHT} .dC .T-I { height: 34px !important; background-color: color-mix(in srgb, #009e2a 10%, var(--ir-paper, #fff)) !important; border: 1px solid rgba(0, 158, 42, .55) !important; border-radius: 2px !important;
  box-shadow: 0 2px 0 rgba(0, 158, 42, .3), inset 0 1px 0 rgba(255, 255, 255, .7) !important; transition: background-color .12s, border-color .12s, transform .05s, box-shadow .05s; }
${LIGHT} .dC .aoO { padding: 0 12px !important; border-right: 0 !important; border-radius: 2px 0 0 2px !important; }
${LIGHT} .dC .hG { margin-left: 0 !important; border-left: 1px solid rgba(0, 158, 42, .35) !important; border-radius: 0 2px 2px 0 !important; }
${LIGHT} .dC .T-I:hover { background-color: color-mix(in srgb, #009e2a 18%, var(--ir-paper, #fff)) !important; border-color: ${MID} !important; border-bottom-style: solid !important; }
${LIGHT} .dC .T-I:active { transform: translateY(2px); box-shadow: none !important; background-color: color-mix(in srgb, #009e2a 26%, var(--ir-paper, #fff)) !important; color: var(--mx-hot) !important; border-bottom: 1px solid ${MID} !important; }`,

  icons: `
/* Pixel glyphs; on hover a black glass tile with a phosphor inset line, and three drops of rain falling
   through it at different speeds */
${iconBase(20)}
${BOX} [data-ir-icon] { overflow: hidden; border-radius: 0 !important; transition: box-shadow .12s; }
${BOX} [data-ir-icon]::before { inset: 0; z-index: 1; opacity: 0; background-repeat: no-repeat;
  background-image: linear-gradient(transparent, rgba(0, 255, 65, .8), ${WHITE}), linear-gradient(transparent, rgba(0, 255, 65, .7), ${WHITE}), linear-gradient(transparent, rgba(0, 255, 65, .6), ${WHITE});
  background-size: 2px 16px, 2px 22px, 2px 12px; background-position: 8px -16px, 16px -22px, 24px -12px; }
${BOX} [data-ir-icon]::after { z-index: 2; transition: transform .12s; }
${BOX} [data-ir-icon]:hover { box-shadow: inset 0 0 0 1px ${PH}, inset 0 0 10px rgba(0, 255, 65, .35), inset 0 0 0 40px ${GLASS} !important; }
${BOX} [data-ir-icon]:hover::before { animation: mx-drop .7s ease-in; }
${BOX} [data-ir-icon]:hover::after { transform: translateY(-1px); }
@keyframes mx-drop { 0% { opacity: 1; background-position: 8px -16px, 16px -36px, 24px -12px; } 100% { opacity: .9; background-position: 8px 34px, 16px 34px, 24px 40px; } }
${glyphRules(BOX, ICON_NAMES.filter((n) => n !== "trash"))}`,

  discard: `
/* A bigger pixel trash can, still the last button; on hover it lights head white and derezzes */
${BOX} [data-ir-icon="trash"]::after { width: 26px; height: 26px; margin: -13px 0 0 -13px; }
${BOX} [data-ir-icon="trash"]:hover::after { animation: mx-derez .3s steps(4); }
@keyframes mx-derez { 0% { clip-path: inset(0 0 60% 0); transform: translateX(-3px); } 25% { clip-path: inset(40% 0 20% 0); transform: translateX(3px); }
  50% { clip-path: inset(70% 0 0 0); transform: translateX(-2px); } 100% { clip-path: inset(0); transform: none; } }
${glyphRules(BOX, ["trash"])}`,

  avatar: `
/* The residual self image: cut square, coded green, ringed in phosphor; hover shows the real photo */
[data-ir-avatar] { border-radius: 2px !important; filter: grayscale(1) sepia(1) hue-rotate(65deg) saturate(3.4) brightness(.85) contrast(1.15);
  box-shadow: 0 0 0 1px #000, 0 0 0 3px ${PH}, 0 0 14px rgba(0, 255, 65, .6); transition: filter .35s; }
[data-ir-avatar-wrap]:hover [data-ir-avatar] { filter: none; }`,

  caret: `
/* Mid green on light cards, phosphor on dark */
${EDITOR} { caret-color: ${MID}; }
${BOX}[data-ir-theme="dark"] [contenteditable="true"][role="textbox"] { caret-color: ${PH}; }`,

  cursor: `
/* The classic pixel arrow in black glass and phosphor, the same arrow lit for anything clickable, and a
   phosphor I-beam */
${boxCursors(CURSORS)}`,

  selection: `
/* Mid green with black text, clearly apart from the blue comment wash */
${EDITOR} ::selection, ${EDITOR}::selection { background: ${MID}; color: #000; }`,

  comments: `
/* Comment blue for the passage (never red or wavy), square blue pins in OCR-A, a black glass note */
::highlight(ir-comment) { background-color: rgba(43, 108, 255, .18); text-decoration: underline 1px #2b6cff; }
.ir-pin { min-width: 18px; height: 18px; padding: 0 4px; border: 0; border-radius: 0; background: #2b6cff; color: #fff;
  font: 13px/18px ${OCR}; box-shadow: 0 0 6px rgba(43, 108, 255, .65); transition: transform .12s, box-shadow .12s; }
.ir-pin:hover { transform: translateY(-1px); box-shadow: 0 0 12px rgba(43, 108, 255, .9); }
.ir-pin.ir-stale { background: #8d8a93; box-shadow: none; }
.ir-note { padding: 10px 12px; border: 1px solid ${PH}; border-radius: 0; color: ${WHITE}; background: ${SCAN}, ${GLASS}; box-shadow: 0 0 8px rgba(0, 255, 65, .55); }
.ir-note-hint { font: 11px ${OCR}; color: #1fbf4c; }
.ir-note-delete { padding: 3px 9px; border: 1px solid ${PH}; border-radius: 0; background: transparent; color: ${PH}; font: 12px ${OCR}; }
.ir-note-delete:hover { background: ${PH}; color: #000; }`,

  swoosh: `
/* Copies of the text with every letter in its own fixed width box, so letters can turn to code without
   moving; the trace line; the canvas for the falling code; the "New" plate. */
.mx-ghost { position: absolute; z-index: 6; box-sizing: border-box; overflow: hidden; background: var(--ir-paper, #fff); pointer-events: none; }
.mx-ghost .mx-w { white-space: nowrap; }
.mx-ghost .mx-c { display: inline-block; text-align: center; }
.mx-ghost .mx-c.hot { color: var(--mx-code); text-shadow: 0 0 6px rgba(0, 255, 65, .75); transform: scaleX(-1); }
.mx-ghost.mx-seen .mx-c { color: var(--mx-code); transition: color .22s; }
.mx-dec .mx-c { visibility: hidden; }
.mx-dec .mx-c.on { visibility: visible; color: var(--mx-code); text-shadow: 0 0 5px rgba(0, 255, 65, .65); transform: scaleX(-1); }
.mx-dec .mx-c.locked { visibility: visible; color: inherit; text-shadow: none; transform: none; animation: mx-lock .45s ease-out; }
@keyframes mx-lock { from { color: var(--mx-code); text-shadow: 0 0 9px ${PH}; } }
.mx-readhead { position: absolute; height: 2px; background: linear-gradient(90deg, rgba(0, 255, 65, 0), ${PH} 45%, ${WHITE}); box-shadow: 0 0 8px rgba(0, 255, 65, .7); pointer-events: none; }
.mx-readhead::after { content: ""; position: absolute; right: -10px; bottom: 0; width: 7px; height: 15px; background: ${PH}; box-shadow: 0 0 6px rgba(0, 255, 65, .7); opacity: .85; }
.mx-fx, .mx-newlayer { position: absolute; z-index: 7; pointer-events: none; }
.mx-plate { position: absolute; top: 4px; right: 6px; display: flex; align-items: center; padding: 5px 10px; border: 1px solid ${PH}; color: ${PH};
  background: ${SCAN}, ${GLASS}; box-shadow: 0 0 8px rgba(0, 255, 65, .6); font: 30px/1 ${TERMINAL}; letter-spacing: .08em; text-transform: uppercase;
  text-shadow: 0 0 8px rgba(0, 255, 65, .8); opacity: 0; transition: opacity .2s; }
.mx-plate.show { opacity: 1; }
.mx-plate.gone { opacity: 0; transition: opacity .5s; }
.mx-plate .nc { display: inline-block; width: .55em; text-align: center; }
.mx-plate .nc.on { transform: scaleX(-1); opacity: .8; }`,
};
