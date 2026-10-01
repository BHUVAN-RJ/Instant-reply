import type { Ornament } from "./contract";

// Names and helpers every theme shares. Class names are the handles gmail.ts puts on the page; themes
// style them but never rename them.

export const TOGGLE_CLASS = "ir-toggle";
export const REFACTOR_CLASS = "ir-refactor";
export const ACTIVE_BOX_CLASS = "ir-active-box";
export const BUSY_EDITOR_CLASS = "ir-busy";
export const SKIN_CLASS = "ir-skin";
/** An active reply box, the scope for nearly every rule. */
export const BOX = `.${ACTIVE_BOX_CLASS}`;
/** A box inline in a thread, inside Gmail's rounded card (the usual reply). */
export const CARD = `${BOX}:not([data-ir-layout="window"])`;
/** A box inside a Gmail window with no card: a new email, or a reply popped out. */
export const WINDOW = `${BOX}[data-ir-layout="window"]`;
/**
 * The To line comes in two styles (`data-ir-head-style` on the box). "band": a card whose To line wears
 * the theme's band (FragPunk's ink bar, Beach's lagoon water), turned on in the popup; every rule that
 * recolours or decorates the To line is scoped to this. "rule": just a line between the To line and the
 * body, the default for cards and always used in windows (under Subject).
 */
export const BAND = `${CARD}[data-ir-head-style="band"]`;
export const RULE = `${BOX}[data-ir-head-style="rule"]`;
/** The writing area inside a box. */
export const EDITOR = `${BOX} [contenteditable="true"][role="textbox"]`;
/** Where the text cursor shows inside a box: the writing area and Gmail's text fields. */
export const TEXT_FIELDS = `${BOX} input, ${BOX} textarea, ${EDITOR}`;
/** Everything clickable inside a box, for the hand cursor. */
export const CLICKABLE = [`${BOX} [role="button"]`, `${BOX} button:not(:disabled)`, `${BOX} a`, `${BOX} [role="link"]`, `${BOX} [role="option"]`, `${BOX} [role="listbox"]`, `${BOX} [data-ir-icon]`, `${BOX} .ir-pin`].join(", ");

/**
 * The three cursors of a box: the arrow over the box, the hand over anything clickable, the text cursor
 * over the writing area and text fields. Children of the writing area inherit its cursor.
 */
export const boxCursors = (c: { arrow: string; hand: string; text: string }): string => `
${BOX}, ${BOX} * { cursor: ${c.arrow}; }
${CLICKABLE} { cursor: ${c.hand}; }
${TEXT_FIELDS} { cursor: ${c.text}; }
${EDITOR} * { cursor: inherit; }`;

export const reducedMotion = (): boolean => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** An inline SVG as a CSS `url()`. */
export const svgUri = (body: string, viewBox: string, stretch = false): string =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"${stretch ? ' preserveAspectRatio="none"' : ""}>${body}</svg>`)}")`;

/** A custom mouse cursor from inline SVG (32px at most), falling back to a normal cursor. */
export const svgCursor = (body: string, size: number, hotX: number, hotY: number, fallback: "text" | "default" | "pointer" = "text"): string =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${body}</svg>`)}") ${hotX} ${hotY}, ${fallback}`;

/**
 * Hides Gmail's toolbar icons and gives each tagged button an `::after` to draw a glyph on and a
 * `::before` for its backdrop. For the icons slot of any theme that draws its own glyphs.
 */
export const iconBase = (size = 21): string => `
${BOX} [data-ir-icon] { position: relative; background-image: none !important; }
${BOX} [data-ir-icon] > * { opacity: 0 !important; }
${BOX} [data-ir-icon]:hover { background-color: transparent !important; }
${BOX} [data-ir-icon]::before { content: ""; position: absolute; pointer-events: none; }
${BOX} [data-ir-icon]::after { content: ""; position: absolute; left: 50%; top: 50%; width: ${size}px; height: ${size}px;
  margin: ${-size / 2}px 0 0 ${-size / 2}px; background: center / contain no-repeat; pointer-events: none; }`;

/** Clears Gmail's blue fill, borders and focus ring from Send and its schedule arrow. */
export const clearSendGroup = (): string =>
  `${BOX} .dC, ${BOX} .dC * { background-color: transparent !important; border-color: transparent !important; box-shadow: none !important; outline: none !important; }`;

/** For themes that put nothing extra around the box. */
export const noOrnament: Ornament = { place() {}, clear() {} };

export interface Area {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** A rect relative to `host`, covering both of the given viewport rects. */
export function unionIn(host: HTMLElement, a: DOMRect, b: DOMRect): Area {
  const h = host.getBoundingClientRect();
  const left = Math.min(a.left, b.left), top = Math.min(a.top, b.top);
  return { left: left - h.left, top: top - h.top, width: Math.max(a.right, b.right) - left, height: Math.max(a.bottom, b.bottom) - top };
}

/** The editor's rect relative to `host`. */
export function areaOf(host: HTMLElement, editor: HTMLElement): Area {
  const r = editor.getBoundingClientRect();
  return unionIn(host, r, r);
}

export function place(el: HTMLElement, r: Area): void {
  Object.assign(el.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
}

/** A still copy of the editor's text, styled like the editor, for a swoosh to animate. */
export function ghostOf(editor: HTMLElement, className: string): HTMLElement {
  const cs = getComputedStyle(editor);
  const ghost = document.createElement("div");
  ghost.className = className;
  ghost.setAttribute("aria-hidden", "true");
  for (const prop of ["font", "lineHeight", "color", "padding", "direction", "textAlign", "letterSpacing", "wordSpacing"] as const) ghost.style[prop] = cs[prop];
  ghost.innerHTML = editor.innerHTML;
  return ghost;
}

/** A canvas sized for the screen's pixel ratio, drawing in CSS pixels. */
export function sizeCanvas(c: HTMLCanvasElement, w: number, h: number): CanvasRenderingContext2D {
  const d = devicePixelRatio || 1;
  c.width = Math.round(w * d);
  c.height = Math.round(h * d);
  const ctx = c.getContext("2d")!;
  ctx.setTransform(d, 0, 0, d, 0, 0);
  return ctx;
}
