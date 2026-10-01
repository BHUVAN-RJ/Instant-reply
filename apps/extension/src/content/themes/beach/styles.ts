import type { CssSlot } from "../../theme/contract";
import { ICON_LABELS } from "../../theme/icons";
import { BAND, BOX, CARD, EDITOR, RULE, REFACTOR_CLASS, SKIN_CLASS, TOGGLE_CLASS, WINDOW, boxCursors, clearSendGroup, iconBase, svgCursor, svgUri as uri } from "../../theme/shared";
import { PALETTES, type Palette, type PaletteId } from "./palette";

// The beach look (DESIGN.md next to this file; mockups in docs/design/beach-style-v2.html). A round
// card with a thin leaf green edge; the To line is shallow lagoon water ending in a scalloped foam line;
// Send is a sea glass pebble, Refactor a wavy flower banner, the switch a plumeria bud that opens when
// on, toolbar icons sit on petals and the avatar wears a flower crown. Every colour comes from the
// palette on the box (`data-ir-variant`), which follows the time of day in California.

const ROUND = `"IR Fredoka", "Trebuchet MS", system-ui, sans-serif`;

const petals = (cx: number, cy: number, R: number, fill: string, stroke: string) =>
  Array.from({ length: 5 }, (_, i) => `<ellipse cx="${cx}" cy="${cy - R * 0.52}" rx="${R * 0.36}" ry="${R * 0.52}" transform="rotate(${i * 72} ${cx} ${cy})" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`).join("");
const plumeria = (p: Palette, cx: number, cy: number, R: number) => petals(cx, cy, R, p.cream, p.flower) + `<circle cx="${cx}" cy="${cy}" r="${R * 0.24}" fill="${p.flower2}"/>`;
const hibiscus = (p: Palette, cx: number, cy: number, R: number) => petals(cx, cy, R, p.flower, p.coralD) + `<circle cx="${cx}" cy="${cy}" r="${R * 0.18}" fill="${p.flower2}"/>`;
const leaflet = (p: Palette, cx: number, cy: number, R: number, a: number) => `<ellipse cx="${cx}" cy="${cy}" rx="${R}" ry="${R * 0.4}" transform="rotate(${a} ${cx} ${cy})" fill="${p.leaf}" stroke="${p.leafD}" stroke-width="1"/>`;

function wavyBanner(w: number, h: number): string {
  let d = `M2 ${h / 2}`;
  for (let x = 10; x <= w - 10; x += 4) d += ` L${x} ${(9 + 3 * Math.sin(x / 8)).toFixed(1)}`;
  d += ` L${w - 2} ${h / 2}`;
  for (let x = w - 10; x >= 10; x -= 4) d += ` L${x} ${(h - 9 + 3 * Math.sin(x / 8 + 1)).toFixed(1)}`;
  return d + "Z";
}
const BANNER = wavyBanner(160, 52);
const LENS = "M4 19 C24 2 146 2 166 19 C146 36 24 36 4 19Z";
const PEBBLE = "M14 7 C40 1 88 3 106 9 C118 15 116 33 102 37 C78 43 34 41 16 37 C4 33 2 13 14 7Z";
const NS = 'vector-effect="non-scaling-stroke"';

// Toolbar glyphs, drawn in the palette's ink with an accent.
const GLYPHS: Record<string, string> = {
  format: '<path d="M6.5 15.5 12 4l5.5 11.5M8.6 11.2h6.8"/><path d="M3.5 19.5c1.7-1.4 3.3-1.4 5 0s3.3 1.4 5 0 3.3-1.4 5 0 1.5.9 2 .6" stroke="{acc}" stroke-width="2.2"/>',
  attach: '<circle cx="15" cy="4" r="1.8" fill="{acc}"/><path d="M15 5.8V14a5 5 0 0 1-10 0v-1.5"/><path d="M5 12.5 8.2 15"/>',
  link: '<path d="M10 14.5a3.5 3.5 0 0 1 0-5l2.5-2.5a3.5 3.5 0 0 1 5 5l-1 1"/><path d="M14 9.5a3.5 3.5 0 0 1 0 5L11.5 17a3.5 3.5 0 0 1-5-5l1-1"/><circle cx="12" cy="12" r="1.6" fill="{acc}"/>',
  emoji: '<circle cx="12" cy="12" r="5.6" fill="{acc}"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/><path d="M9.8 13.2a2.6 2.6 0 0 0 4.4 0" stroke-width="1.6"/><path d="M10.2 10.6h.01M13.8 10.6h.01" stroke-width="2.4"/>',
  photo: '<rect x="3.5" y="4" width="17" height="16" rx="2.5"/><circle cx="16" cy="8.6" r="1.9" fill="{acc}"/><path d="M8 18c.4-3 .3-5.6-.6-8"/><path d="M7.4 10c-1.4-.8-3 .2-3.2 1M7.4 10c1.2-1.2 3-.8 3.4.2M7.4 10c.2-1.6 1.8-2.4 2.8-2"/><path d="M3.5 17.5c3-1.8 6-1.8 9 0s5 1.4 8 0V20h-17z" fill="{acc}" stroke="none"/>',
  drive: '<path d="M9 4h6l6 10.5-3 5.5H6l-3-5.5z"/><path d="M9 4l6 10.5M3 14.5h12M18 20l-3-5.5" /><path d="M6 20l3-5.5h9" fill="{acc}" stroke="none" opacity=".9"/>',
  signature: '<path d="M3.5 15c1.6-5 3.6-9 5-8.2s-2 8 .2 8 3-4.4 4.6-4.4-.2 4 1.8 4 2.6-2 4.4-2"/><path d="M3.5 19.5c3-1.4 6-1.4 9 0s5 1.2 8 0" stroke="{acc}" stroke-width="2.2"/>',
  meet: '<rect x="3.5" y="5.5" width="17" height="15" rx="2.5"/><path d="M8 3.5v4M16 3.5v4M3.5 10h17"/><circle cx="14.5" cy="15" r="2.2" fill="{acc}"/>',
  more: '<circle cx="12" cy="5.5" r="1.6"/><circle cx="12" cy="12" r="2.2" fill="{acc}"/><circle cx="12" cy="18.6" r="1.2"/>',
  trash: '<path d="M6 5.5c0-2.4 12-2.4 12 0"/><path d="M4.5 8h15l-1.8 12.2a1.5 1.5 0 0 1-1.5 1.3H7.8a1.5 1.5 0 0 1-1.5-1.3z" fill="{acc}"/><path d="M4 8h16"/><path d="M9.5 12v5.5M14.5 12v5.5" stroke-width="1.6"/>',
};
const glyph = (name: string, p: Palette, acc: string) =>
  uri(`<g fill="none" stroke="${p.ink}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${GLYPHS[name].replaceAll("{acc}", acc)}</g>`, "0 0 24 24");

// Cursors (32px), one family: soft rounded shapes with a white outline, so they show on sand, water and
// dark cards. The arrow is sea glass like Send; over anything clickable it turns coral like the Refactor
// banner (in the strong select colour), with a plumeria at its tail; the text cursor is an I-beam in the
// same colour with a small plumeria on top.
const ARROW_PATH = "M5 3.5v19.5c0 1.2 1.3 1.7 2.2.9l4-3.7 3.2 7c.4.9 1.4 1.2 2.2.8l1.3-.6c.8-.4 1.2-1.4.8-2.2l-3.2-6.9h5.6c1.2 0 1.8-1.4.9-2.2L7.3 2.6C6.4 1.8 5 2.3 5 3.5z";
const roundArrow = (fill: string, edge: string) =>
  `<path d="${ARROW_PATH}" fill="none" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>` +
  `<path d="${ARROW_PATH}" fill="${fill}" stroke="${edge}" stroke-width="1.5" stroke-linejoin="round"/>`;
const cursorsFor = (p: Palette) => ({
  arrow: svgCursor(roundArrow(p.sea2, p.sea) + `<path d="M7.5 7v7" stroke="#fff" stroke-width="1.8" stroke-linecap="round" opacity=".7"/>`, 32, 5, 3, "default"),
  hand: svgCursor(roundArrow(p.select, p.coralD) + petals(21, 25, 7, p.cream, p.flower) + `<circle cx="21" cy="25" r="1.7" fill="${p.flower2}"/>`, 32, 5, 3, "pointer"),
  text: svgCursor(
    `<path d="M9 4h10M9 24h10M14 4v20" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/>` +
      `<path d="M9 4h10M9 24h10M14 4v20" fill="none" stroke="${p.select}" stroke-width="3" stroke-linecap="round"/>` +
      petals(22, 6, 5, p.cream, p.flower) + `<circle cx="22" cy="6" r="1.3" fill="${p.flower2}"/>`,
    28, 14, 14,
  ),
});

/** Everything that changes with the time of day palette, scoped to `[data-ir-variant="<id>"]`. */
export function variantCss(id: string): string {
  const p = PALETTES[id as PaletteId];
  const on = `[data-ir-variant="${id}"]`;
  const scallop = uri(`<path d="M0 0H22V4Q11 14 0 4Z" fill="${p.ltMix}"/><path d="M22 4Q11 14 0 4" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/><circle cx="6" cy="2.5" r="1" fill="#fff" opacity=".8"/>`, "0 0 22 14");
  const icons = ICON_LABELS.map(([, name]) => `${on}${BOX} [data-ir-icon="${name}"]::after { background-image: ${glyph(name, p, name === "trash" ? p.flower2 : p.lt)}; }
${on}${BOX} [data-ir-icon="${name}"]:hover::after { background-image: ${glyph(name, p, p.coral)}; }`).join("\n");
  return `
${on} { --b-sea: ${p.sea}; --b-sea2: ${p.sea2}; --b-lt: ${p.lt}; --b-lt-soft: ${p.ltSoft}; --b-lt-mix: ${p.ltMix}; --b-coral: ${p.coral}; --b-coral-d: ${p.coralD}; --b-on-coral: ${p.onCoral};
  --b-leaf: ${p.leaf}; --b-leaf-d: ${p.leafD}; --b-flower2: ${p.flower2}; --b-ink: ${p.ink}; --b-select: ${p.select}; }
${on} .${TOGGLE_CLASS} { background-image: ${uri(`<path d="${LENS}" fill="none" stroke="${p.leafD}" stroke-width="1.5" stroke-dasharray="5 3" ${NS}/>`, "0 0 170 38", true)}; }
${on} .${TOGGLE_CLASS}::before { background-image: ${uri(`<path d="M12 3C18 7 18 17 12 21C6 17 6 7 12 3Z" fill="${p.leaf}" stroke="${p.leafD}" stroke-width="1"/>`, "0 0 24 24")}; }
${on} .${TOGGLE_CLASS}[data-active="true"] { background-image: ${uri(`<path d="${LENS}" fill="${p.flower2}" stroke="${p.leafD}" stroke-width="1.5" ${NS}/>`, "0 0 170 38", true)}; }
${on} .${TOGGLE_CLASS}[data-active="true"]::before { background-image: ${uri(plumeria(p, 12, 12, 11), "0 0 24 24")}; }
${on} .${REFACTOR_CLASS} { background-image: ${uri(`<path d="${BANNER}" fill="${p.coral}" stroke="${p.coralD}" stroke-width="2" ${NS}/>`, "0 0 160 52", true)}; }
${on} .${REFACTOR_CLASS}::after { background-image: ${uri(leaflet(p, 22, 25, 10, 30) + plumeria(p, 16, 15, 13), "0 0 34 34")}; }
${on}${BOX} .dC .aoO { background-image: ${uri(`<path d="${PEBBLE}" fill="${p.sea2}" fill-opacity=".9" stroke="${p.sea}" stroke-width="1.5" ${NS}/><path d="M20 12C40 8 70 8 92 11" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".55" ${NS}/>`, "0 0 118 44", true)} !important; }
${on}${BOX} .dC .hG { background-image: ${uri(`<path d="M8 12C18 8 26 12 26 22C26 32 18 36 10 33C3 30 2 15 8 12Z" fill="${p.sea2}" fill-opacity=".75" stroke="${p.sea}" stroke-width="1.5" ${NS}/>`, "0 0 30 44", true)} !important; }
${on} .${SKIN_CLASS} .ir-foam { background-image: ${scallop}; }
${on}${BOX} .ir-crown { background-image: ${uri(leaflet(p, 34, 22, 12, -10) + hibiscus(p, 14, 20, 13) + plumeria(p, 56, 16, 10), "0 0 70 40")}; }
/* Dark cards: the off switch's leaf green would sink into the grey, so it turns lagoon light */
${on}[data-ir-theme="dark"] .${TOGGLE_CLASS}:not([data-active="true"]) { color: ${p.lt}; background-image: ${uri(`<path d="${LENS}" fill="none" stroke="${p.lt}" stroke-width="1.5" stroke-dasharray="5 3" ${NS}/>`, "0 0 170 38", true)}; }
[data-ir-avatar]${on} { box-shadow: 0 0 0 3px #fff, 0 0 0 5px ${p.leaf} !important; }
${boxCursors(cursorsFor(p)).replaceAll(BOX, `${on}${BOX}`).trim()}
${icons}`;
}

export const css: Record<CssSlot, string> = {
  tokens: `
/* Every colour comes from the time of day palette (see variantCss); these are only fallbacks. */
${BOX} { --b-leaf: #2e9d6a; --b-ink: #12384a; }`,

  card: `
/* Round, with a thin leaf green edge */
.${SKIN_CLASS} > i { position: absolute; }
.${SKIN_CLASS} .ir-card { inset: -2px; border: 2px solid var(--b-leaf); border-radius: 22px; background: var(--ir-paper); }`,

  head: `
/* The To line is shallow lagoon water ending in a scalloped foam line above the body */
.${SKIN_CLASS} .ir-lagoon { left: 0; right: 0; top: 0; height: var(--ir-head, 0px); border-radius: 20px 20px 0 0; background: linear-gradient(180deg, var(--b-lt-soft), var(--b-lt-mix)); }
.${SKIN_CLASS} .ir-foam { left: 0; right: 0; top: var(--ir-head, 0px); height: 14px; background: repeat-x 0 0 / 22px 14px; }
${BAND} [data-ir-head], ${BAND} [data-ir-head] * { color: var(--b-ink) !important; background-color: transparent !important; }
/* Without the band (the default, and always in a window under Subject): no water, only the scalloped foam
   line between the To line and the body, like the edge of the shore. */
${RULE} > .${SKIN_CLASS} .ir-lagoon { display: none; }
${RULE} > .${SKIN_CLASS} .ir-foam { top: calc(var(--ir-head, 0px) - 6px); }`,

  body: `
/* With the To line band, room under the foam line, so the body reads as the beach the wave runs onto */
${BAND} [data-ir-card] > table.iN { border-top: 12px solid transparent !important; }
/* With the foam line alone, 12px of room under it */
${RULE} table.iN { border-top: 12px solid transparent !important; }`,

  formatBar: `
/* A lagoon strip with a leaf edge; its buttons bloom on hover */
${BOX} .J-Z[role="toolbar"] { background: var(--b-lt-soft) !important; border: 2px solid var(--b-leaf); border-radius: 22px !important; }
${BOX} .J-Z[role="toolbar"] .J-Z-axR { background: var(--b-leaf) !important; opacity: .5; }
${BOX} .J-Z[role="toolbar"] [role="button"], ${BOX} .J-Z[role="toolbar"] [role="listbox"] { transition: transform .12s; }
${BOX} .J-Z[role="toolbar"] [role="button"]:hover, ${BOX} .J-Z[role="toolbar"] [role="listbox"]:hover,
${BOX} .J-Z[role="toolbar"] [aria-pressed="true"] { background-color: var(--b-flower2) !important; border-radius: 62% 38% 62% 38% / 62% 38% 62% 38% !important; transform: translateY(-1px); }
${BOX} .J-Z[role="toolbar"] [role="option"] { font: 600 14px/1.4 ${ROUND} !important; color: var(--b-ink) !important; }
/* Dark Gmail draws the bar's text light, so the strip turns into a faint lagoon tint instead of pale fill */
${BOX}[data-ir-theme="dark"] .J-Z[role="toolbar"] { background: color-mix(in srgb, var(--b-lt) 14%, transparent) !important; }`,

  pinnedRow: `
/* Pinned to the window bottom on long replies, the Send row gets the card's leaf edge and round bottom */
${BOX} .aDj.ahe { box-shadow: none !important; }
${BOX} .aDj.ahe::before { inset: 0 -2px -2px !important; border: 2px solid var(--b-leaf) !important; border-top: 0 !important; border-radius: 0 0 22px 22px !important; }
${BOX} .aDj.ahe::after { inset: 0 !important; background: var(--ir-paper) !important; border-radius: 0 0 20px 20px !important; }`,

  window: `
/* A new email or a popped out reply: Gmail's window is the frame. The To and Subject rows stay on paper
   in Gmail's colours (they are form fields); where they end, the head slot's foam line marks the shore, and
   a thin leaf edge runs down both inside edges. The switch shrinks to its flower lens and Refactor
   tightens, so Gmail keeps room for its toolbar icons. */
${WINDOW} > .${SKIN_CLASS} .ir-card { inset: 0; border: 0; border-left: 2px solid var(--b-leaf); border-right: 2px solid var(--b-leaf); border-radius: 0; }
${WINDOW} .${TOGGLE_CLASS} { width: 44px; padding: 0; font-size: 0; justify-content: center; margin-left: 8px; }
${WINDOW} .${TOGGLE_CLASS}::before { left: 50%; margin-left: -11px; }
${WINDOW} .${REFACTOR_CLASS} { padding: 1px 30px 0 12px; font-size: 14px; margin-left: 6px; }
${WINDOW} .dC .aoO { padding: 0 16px !important; }`,

  toggle: `
/* A lens with a bud that opens into a plumeria when on */
.${TOGGLE_CLASS} {
  position: relative; display: inline-flex; align-items: center; height: 36px; padding: 1px 20px 0 38px; margin-left: 10px;
  border: 0; background: transparent center / 100% 100% no-repeat; color: var(--b-leaf-d, #1d6e49);
  font: 600 13px/1 ${ROUND}; transition: transform .15s;
}
.${TOGGLE_CLASS}:hover { transform: translateY(-1px) rotate(-1deg); }
.${TOGGLE_CLASS} .ir-dot { display: none; }
.${TOGGLE_CLASS}::before { content: ""; position: absolute; left: 12px; top: 50%; width: 22px; height: 22px; margin-top: -11px; background: center / contain no-repeat; }
.${TOGGLE_CLASS}:focus-visible { outline: 3px solid var(--b-select, #e0512f); outline-offset: 3px; border-radius: 18px; }`,

  refactor: `
/* A wavy flower banner with a plumeria pinned at its end */
.${REFACTOR_CLASS} {
  position: relative; display: inline-flex; align-items: center; height: 44px; padding: 1px 40px 0 20px; margin-left: 10px;
  border: 0; background: transparent center / 100% 100% no-repeat; color: var(--b-on-coral, #fff); text-shadow: 0 1px 0 var(--b-coral-d, #d9573a);
  font: 600 15px/1 ${ROUND}; transition: transform .15s;
}
.${REFACTOR_CLASS}::after { content: ""; position: absolute; right: -6px; top: 50%; width: 34px; height: 34px; margin-top: -17px; background: center / contain no-repeat; }
.${REFACTOR_CLASS}:hover:not(:disabled) { transform: translateY(-2px) rotate(-1.5deg); }
.${REFACTOR_CLASS}:active:not(:disabled) { transform: translateY(1px) scale(.98); transition-duration: .05s; }
.${REFACTOR_CLASS}:disabled { opacity: .85; }
.${REFACTOR_CLASS}:focus-visible { outline: 3px solid var(--b-select, #e0512f); outline-offset: 3px; border-radius: 12px; }`,

  send: `
/* Send and its schedule arrow: sea glass pebbles */
${clearSendGroup()}
${BOX} .dC .T-I { background: transparent center / 100% 100% no-repeat !important; border: 0 !important; border-radius: 0 !important; margin: 0 !important; transition: transform .15s, filter .15s; }
${BOX} .dC .aoO { color: #fff !important; font: 600 15px/1 ${ROUND} !important; letter-spacing: 0 !important; padding: 0 24px !important; text-shadow: 0 1px 0 var(--b-sea); }
${BOX} .dC .hG { margin-left: 3px !important; }
${BOX} .dC .hG * { filter: brightness(0) invert(1); }
${BOX} .dC .T-I:focus-visible { outline: 3px solid var(--b-select) !important; outline-offset: 2px; }
/* Send reacts: the hovered pebble bobs up and brightens, a press sinks it */
${BOX} .dC .T-I:hover { transform: translateY(-2px) rotate(-1.5deg); filter: brightness(1.08) drop-shadow(0 3px 0 var(--b-sea)); }
${BOX} .dC .T-I:active { transform: translateY(1px); filter: brightness(.95); transition-duration: .05s; }`,

  icons: `
/* Beach glyphs on petal shapes (glyphs per palette in variantCss) */
${iconBase()}
${BOX} [data-ir-icon]::before { inset: 2px; background: var(--b-lt-soft); border-radius: 62% 38% 62% 38% / 62% 38% 62% 38%; transition: background .12s; }
${BOX} [data-ir-icon]:hover::before { background: var(--b-flower2); }
${BOX} [data-ir-icon]::after { transition: transform .15s; }
${BOX} [data-ir-icon]:hover::after { transform: translateY(-2px) rotate(-8deg) scale(1.1); }
${BOX} [data-ir-icon]:active::after { transform: scale(.94); transition-duration: .05s; }`,

  discard: `
/* A sand pail, 30% bigger, still the last button */
${BOX} [data-ir-icon="trash"] { transform: scale(1.3); margin: 0 6px 0 8px; }`,

  avatar: `
/* The user's avatar wears a flower crown (placed by the ornament) and a leaf ring (per palette) */
.ir-crown { position: absolute; z-index: 5; width: 64px; height: 36px; background: center / contain no-repeat; transform: rotate(-8deg); pointer-events: none; }`,

  caret: `
/* Coral, like the Refactor banner */
${EDITOR} { caret-color: var(--b-coral); }`,

  cursor: `
/* A sea glass arrow, a coral arrow with a plumeria over anything clickable, and a coral I-beam with a
   plumeria (in lagoon colours here, per palette in variantCss) */
${boxCursors(cursorsFor(PALETTES.lagoon))}`,

  selection: `
/* The palette's strong select colour (a deep coral, amber at night) under white text: clear on white and
   on dark cards, and apart from the blue comment wash */
${EDITOR} ::selection, ${EDITOR}::selection { background: var(--b-select); color: #fff; }`,

  comments: `
/* A soft lagoon blue wash with a straight blue underline (never red or wavy, which would read as a
   mistake), a blue petal pin with its number at the end, and a rounded note card with a leaf edge. */
::highlight(ir-comment) { background-color: rgba(25, 150, 220, .14); text-decoration: underline 2px #1a8fd6; text-underline-offset: 4px; }
.ir-pin { min-width: 20px; height: 20px; padding: 0 5px; border: 2px solid #fff; border-radius: 62% 38% 62% 38% / 62% 38% 62% 38%;
  background: #1a8fd6; color: #fff; font: 600 11px/16px ${ROUND}; box-shadow: 0 2px 0 #0f6aa3; transition: transform .15s; }
.ir-pin:hover { transform: translateY(-2px) rotate(-8deg) scale(1.12); }
.ir-pin.ir-stale { background: #9aa7a4; box-shadow: none; }
.ir-note { padding: 10px 12px; background: #fff; color: var(--b-ink, #1d2a30);
  border: 2px solid var(--b-leaf, #3f8f5a); border-radius: 18px; box-shadow: 0 6px 18px rgba(0, 60, 70, .18); }
.ir-note-hint { font: 600 11px/1 ${ROUND}; opacity: .6; }
.ir-note-delete { border: 0; border-radius: 999px; background: var(--b-flower2, #ffd9cf); color: var(--b-ink, #1d2a30); font: 600 12px/1 ${ROUND}; padding: 5px 10px; }`,

  swoosh: `
/* Before: small waves lap at the top of the writing area (a canvas). During and after: the wave's
   layers laid over the writing area: sand, the new text, the old text, the water. */
.ir-beach-layer { position: absolute; pointer-events: none; box-sizing: border-box; overflow: hidden; }
.ir-beach-sand { z-index: 6; }
.ir-beach-text { z-index: 7; background: transparent; }
.ir-beach-water, .ir-beach-ripple { z-index: 8; }`,
};
