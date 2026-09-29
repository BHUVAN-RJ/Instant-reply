import { ACTIVE_BOX_CLASS, BUSY_EDITOR_CLASS, REFACTOR_CLASS, SKIN_CLASS, TOGGLE_CLASS } from "../styles";
import { ICON_LABELS } from "../icons";
import { PALETTES, type Palette, type PaletteId } from "./palette";

// The beach look (design v2, docs/design/beach-style-v2.html). A round card with a thin leaf green edge;
// the To line is shallow lagoon water ending in a scalloped foam line; Send is a sea glass pebble,
// Refactor a wavy flower banner, the switch a plumeria bud that opens when on, toolbar icons sit on
// petals and the avatar wears a flower crown. Every colour comes from the palette on the box
// (`data-ir-pal`), which follows the time of day in California.

const BOX = `.${ACTIVE_BOX_CLASS}`;
const ROUND = `"IR Fredoka", "Trebuchet MS", system-ui, sans-serif`;

const uri = (body: string, viewBox: string, stretch = false) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"${stretch ? ' preserveAspectRatio="none"' : ""}>${body}</svg>`)}")`;

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
  more: '<circle cx="12" cy="5.5" r="1.6"/><circle cx="12" cy="12" r="2.2" fill="{acc}"/><circle cx="12" cy="18.6" r="1.2"/>',
  trash: '<path d="M6 5.5c0-2.4 12-2.4 12 0"/><path d="M4.5 8h15l-1.8 12.2a1.5 1.5 0 0 1-1.5 1.3H7.8a1.5 1.5 0 0 1-1.5-1.3z" fill="{acc}"/><path d="M4 8h16"/><path d="M9.5 12v5.5M14.5 12v5.5" stroke-width="1.6"/>',
};
const glyph = (name: string, p: Palette, acc: string) =>
  uri(`<g fill="none" stroke="${p.ink}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${GLYPHS[name].replaceAll("{acc}", acc)}</g>`, "0 0 24 24");

function paletteCss(id: PaletteId, p: Palette): string {
  const on = `[data-ir-pal="${id}"]`;
  const scallop = uri(`<path d="M0 0H22V4Q11 14 0 4Z" fill="${p.ltMix}"/><path d="M22 4Q11 14 0 4" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/><circle cx="6" cy="2.5" r="1" fill="#fff" opacity=".8"/>`, "0 0 22 14");
  const icons = ICON_LABELS.map(([, name]) => `${on}${BOX} [data-ir-icon="${name}"]::after { background-image: ${glyph(name, p, name === "trash" ? p.flower2 : p.lt)}; }
${on}${BOX} [data-ir-icon="${name}"]:hover::after { background-image: ${glyph(name, p, p.coral)}; }`).join("\n");
  return `
${on} { --b-sea: ${p.sea}; --b-sea2: ${p.sea2}; --b-lt-soft: ${p.ltSoft}; --b-lt-mix: ${p.ltMix}; --b-coral: ${p.coral}; --b-coral-d: ${p.coralD}; --b-on-coral: ${p.onCoral};
  --b-leaf: ${p.leaf}; --b-leaf-d: ${p.leafD}; --b-flower2: ${p.flower2}; --b-ink: ${p.ink}; }
${on} .${TOGGLE_CLASS} { background-image: ${uri(`<path d="${LENS}" fill="none" stroke="${p.leafD}" stroke-width="1.5" stroke-dasharray="5 3" ${NS}/>`, "0 0 170 38", true)}; }
${on} .${TOGGLE_CLASS}::before { background-image: ${uri(`<path d="M12 3C18 7 18 17 12 21C6 17 6 7 12 3Z" fill="${p.leaf}" stroke="${p.leafD}" stroke-width="1"/>`, "0 0 24 24")}; }
${on} .${TOGGLE_CLASS}[data-active="true"] { background-image: ${uri(`<path d="${LENS}" fill="${p.flower2}" stroke="${p.leafD}" stroke-width="1.5" ${NS}/>`, "0 0 170 38", true)}; }
${on} .${TOGGLE_CLASS}[data-active="true"]::before { background-image: ${uri(plumeria(p, 12, 12, 11), "0 0 24 24")}; }
${on} .${REFACTOR_CLASS} { background-image: ${uri(`<path d="${BANNER}" fill="${p.coral}" stroke="${p.coralD}" stroke-width="2" ${NS}/>`, "0 0 160 52", true)}; }
${on} .${REFACTOR_CLASS}::after { background-image: ${uri(leaflet(p, 22, 25, 10, 30) + plumeria(p, 16, 15, 13), "0 0 34 34")}; }
${on}${BOX} .dC .aoO { background-image: ${uri(`<path d="${PEBBLE}" fill="${p.sea2}" fill-opacity=".9" stroke="${p.sea}" stroke-width="1.5" ${NS}/><path d="M20 12C40 8 70 8 92 11" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".55" ${NS}/>`, "0 0 118 44", true)} !important; }
${on}${BOX} .dC .hG { background-image: ${uri(`<path d="M8 12C18 8 26 12 26 22C26 32 18 36 10 33C3 30 2 15 8 12Z" fill="${p.sea2}" fill-opacity=".75" stroke="${p.sea}" stroke-width="1.5" ${NS}/>`, "0 0 30 44", true)} !important; }
${on} .${SKIN_CLASS} .ir-foam { background-image: ${scallop}; }
[data-ir-avatar-wrap]${on}::after { background-image: ${uri(leaflet(p, 34, 22, 12, -10) + hibiscus(p, 14, 20, 13) + plumeria(p, 56, 16, 10), "0 0 70 40")}; }
[data-ir-avatar]${on} { box-shadow: 0 0 0 3px #fff, 0 0 0 5px ${p.leaf} !important; }
${icons}`;
}

export function buildBeachStyles(fonts: { fredoka: string; pacifico: string }): string {
  return `
@font-face { font-family: "IR Fredoka"; src: url("${fonts.fredoka}") format("woff2"); font-weight: 600; font-display: swap; }
@font-face { font-family: "IR Pacifico"; src: url("${fonts.pacifico}") format("woff2"); font-display: swap; }

/* On/off switch: a lens with a bud that opens into a plumeria when on */
.${TOGGLE_CLASS} {
  position: relative; display: inline-flex; align-items: center; height: 36px; padding: 1px 20px 0 38px; margin-left: 10px; vertical-align: middle;
  border: 0; background: transparent center / 100% 100% no-repeat; color: var(--b-leaf-d, #1d6e49);
  font: 600 13px/1 ${ROUND}; cursor: pointer; white-space: nowrap; transition: transform .15s;
}
.${TOGGLE_CLASS}:hover { transform: translateY(-1px) rotate(-1deg); }
.${TOGGLE_CLASS} .ir-dot { display: none; }
.${TOGGLE_CLASS}::before { content: ""; position: absolute; left: 12px; top: 50%; width: 22px; height: 22px; margin-top: -11px; background: center / contain no-repeat; }
.${TOGGLE_CLASS}:focus-visible { outline: 3px solid var(--b-sea2, #19b3c9); outline-offset: 3px; border-radius: 18px; }

/* Refactor: a wavy flower banner with a plumeria pinned at its end */
.${REFACTOR_CLASS} {
  position: relative; display: inline-flex; align-items: center; height: 44px; padding: 1px 40px 0 20px; margin-left: 10px; vertical-align: middle;
  border: 0; background: transparent center / 100% 100% no-repeat; color: var(--b-on-coral, #fff); text-shadow: 0 1px 0 var(--b-coral-d, #d9573a);
  font: 600 15px/1 ${ROUND}; cursor: pointer; white-space: nowrap; transition: transform .15s;
}
.${REFACTOR_CLASS}::after { content: ""; position: absolute; right: -6px; top: 50%; width: 34px; height: 34px; margin-top: -17px; background: center / contain no-repeat; }
.${REFACTOR_CLASS}:hover:not(:disabled) { transform: translateY(-2px) rotate(-1.5deg); }
.${REFACTOR_CLASS}:disabled { cursor: progress; opacity: .85; }
.${REFACTOR_CLASS}:focus-visible { outline: 3px solid var(--b-sea2, #19b3c9); outline-offset: 3px; border-radius: 12px; }

/* The card: round, thin leaf green edge. The To line is lagoon water ending in a scalloped foam line. */
${BOX} { position: relative; isolation: isolate; }
${BOX} [data-ir-card] { border-radius: 0 !important; box-shadow: none !important; background: transparent !important; }
.${SKIN_CLASS} { position: absolute; z-index: -1; pointer-events: none; }
.${SKIN_CLASS} > i { position: absolute; }
.${SKIN_CLASS} .ir-card { inset: -2px; border: 2px solid var(--b-leaf); border-radius: 22px; background: var(--ir-paper); }
.${SKIN_CLASS} .ir-lagoon { left: 0; right: 0; top: 0; height: var(--ir-head, 0px); border-radius: 20px 20px 0 0; background: linear-gradient(180deg, var(--b-lt-soft), var(--b-lt-mix)); }
.${SKIN_CLASS} .ir-foam { left: 0; right: 0; top: var(--ir-head, 0px); height: 14px; background: repeat-x 0 0 / 22px 14px; }
${BOX} [data-ir-head], ${BOX} [data-ir-head] * { color: var(--b-ink) !important; background-color: transparent !important; }
${BOX} [data-ir-card] > table.iN { border-top: 12px solid transparent !important; }
${BOX} [contenteditable="true"][role="textbox"] { caret-color: var(--b-coral); }
.ir-toggle-cell { vertical-align: middle; padding: 0 10px 0 6px; white-space: nowrap; }

/* Send and its schedule arrow: sea glass pebbles. Gmail's own fill, borders and focus ring are cleared. */
${BOX} .dC, ${BOX} .dC * { background-color: transparent !important; border-color: transparent !important; box-shadow: none !important; outline: none !important; }
${BOX} .dC .T-I { background: transparent center / 100% 100% no-repeat !important; border: 0 !important; border-radius: 0 !important; margin: 0 !important; }
${BOX} .dC .aoO { color: #fff !important; font: 600 15px/1 ${ROUND} !important; letter-spacing: 0 !important; padding: 0 24px !important; text-shadow: 0 1px 0 var(--b-sea); }
${BOX} .dC .hG { margin-left: 3px !important; }
${BOX} .dC .hG * { filter: brightness(0) invert(1); }
${BOX} .dC .T-I:focus-visible { outline: 3px solid var(--b-sea2) !important; outline-offset: 2px; }

/* Toolbar icons: beach glyphs on petal shapes */
${BOX} [data-ir-icon] { position: relative; background-image: none !important; }
${BOX} [data-ir-icon] > * { opacity: 0 !important; }
${BOX} [data-ir-icon]:hover { background-color: transparent !important; }
${BOX} [data-ir-icon]::before { content: ""; position: absolute; inset: 2px; background: var(--b-lt-soft); border-radius: 62% 38% 62% 38% / 62% 38% 62% 38%; pointer-events: none; transition: background .12s; }
${BOX} [data-ir-icon]:hover::before { background: var(--b-flower2); }
${BOX} [data-ir-icon]::after { content: ""; position: absolute; left: 50%; top: 50%; width: 21px; height: 21px; margin: -10.5px 0 0 -10.5px; background: center / contain no-repeat; pointer-events: none; }
${BOX} [data-ir-icon="trash"] { transform: scale(1.3); margin: 0 6px 0 8px; }

/* The user's avatar wears a flower crown */
[data-ir-avatar-wrap] { position: relative; }
[data-ir-avatar-wrap]::after { content: ""; position: absolute; left: -14px; top: -18px; width: 64px; height: 36px; background: center / contain no-repeat; pointer-events: none; }

/* Waiting for the model: the old text bobs gently, like it is floating */
.${BUSY_EDITOR_CLASS} { pointer-events: none; animation: ir-bob 1.4s ease-in-out infinite; }
@keyframes ir-bob { 50% { transform: translateY(-2px); opacity: .6; } }

/* The wave's layers, laid over the writing area */
.ir-beach-layer { position: absolute; pointer-events: none; box-sizing: border-box; overflow: hidden; }
.ir-beach-sand { z-index: 6; }
.ir-beach-text { z-index: 7; background: transparent; }
.ir-beach-water { z-index: 8; }

${(Object.entries(PALETTES) as [PaletteId, Palette][]).map(([id, p]) => paletteCss(id, p)).join("\n")}

@media (prefers-reduced-motion: reduce) {
  .${BUSY_EDITOR_CLASS} { animation: none; }
  .${REFACTOR_CLASS}, .${TOGGLE_CLASS} { transition: none; }
}
`;
}
