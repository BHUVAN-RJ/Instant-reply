import { CSS_SLOTS, type ThemePack } from "./contract";
import { BOX, BUSY_EDITOR_CLASS, REFACTOR_CLASS, SKIN_CLASS, TOGGLE_CLASS, WINDOW } from "./shared";

// Builds one stylesheet from a theme pack: its fonts, the shared mechanics every theme needs, its slots in
// order, its variants, and last the rules no theme may override.

/** Layout mechanics shared by every theme. Looks belong to the slots, not here. */
const BASE = `
${BOX} { position: relative; isolation: isolate; }
/* The card's own background, radius and shadow are cleared; the skin behind it draws the edge. */
${BOX} [data-ir-card] { border-radius: 0 !important; box-shadow: none !important; background: transparent !important; border-color: transparent !important; }
.${SKIN_CLASS} { position: absolute; z-index: -1; pointer-events: none; }
/* In a window the skin fills the box and must not spill past it: Gmail's window scrolls, and anything
   sticking out would add a scrollbar. */
${WINDOW} > .${SKIN_CLASS} { overflow: hidden; }
.ir-toggle-cell { vertical-align: middle; padding: 0 10px 0 6px; white-space: nowrap; }
.${TOGGLE_CLASS}, .${REFACTOR_CLASS} { cursor: pointer; white-space: nowrap; vertical-align: middle; }
.${REFACTOR_CLASS}:disabled { cursor: progress; }
.${BUSY_EDITOR_CLASS} { pointer-events: none; }
.ir-pin { position: absolute; z-index: 9; cursor: pointer; }
.ir-note { position: absolute; z-index: 10; width: 290px; box-sizing: border-box; }
.ir-note textarea { display: block; width: 100%; box-sizing: border-box; border: 0; outline: 0; resize: none; background: transparent; color: inherit; font: 14px/1.4 system-ui, sans-serif; }
.ir-note-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 4px; }
.ir-note-delete { cursor: pointer; }
.ir-note-delete[hidden] { display: none; }
`;

/** Reduced motion: nothing Instant Reply dresses moves. Written last so no theme can undo it. */
const GUARDRAILS = `
@media (prefers-reduced-motion: reduce) {
  ${BOX}, ${BOX} *, ${BOX} *::before, ${BOX} *::after, .${TOGGLE_CLASS}, .${REFACTOR_CLASS}, [data-ir-avatar], [data-ir-avatar-wrap] {
    animation: none !important; transition: none !important;
  }
}
`;

export function fontFaces(pack: ThemePack, url: (file: string) => string): string {
  return pack.fonts
    .map((f) => `@font-face { font-family: "${f.family}"; src: url("${url(f.file)}") format("woff2");${f.weight ? ` font-weight: ${f.weight};` : ""} font-display: swap; }`)
    .join("\n");
}

export function buildStylesheet(pack: ThemePack, url: (file: string) => string): string {
  return [
    fontFaces(pack, url),
    BASE,
    ...CSS_SLOTS.map((slot) => `/* --- ${slot} --- */\n${pack.css[slot]}`),
    ...pack.meta.variants.map((v) => `/* --- variant ${v} --- */\n${pack.variantCss(v)}`),
    GUARDRAILS,
  ].join("\n");
}
