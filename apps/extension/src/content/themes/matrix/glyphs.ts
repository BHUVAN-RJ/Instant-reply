import type { IconName } from "../../theme/icons";
import { svgCursor, svgUri } from "../../theme/shared";
import { DEEP, GLASS, PH, WHITE } from "./palette";

// Pixel art for the Matrix theme (DESIGN.md, "Toolbar icons", "Discard" and "Cursor"): toolbar glyphs
// built from 2px squares on a 20px grid, and the classic arrow drawn pixel by pixel.

type Rect = [x: number, y: number, w: number, h: number];
const path = (rects: Rect[]) => rects.map(([x, y, w, h]) => `M${x} ${y}h${w}v${h}h${-w}z`).join("");

const TRIANGLE: Rect[] = Array.from({ length: 6 }, (_, i) => [8 - i, 3 + 2 * i, 4 + 2 * i, 2] as Rect);

const ICONS: Record<IconName, Rect[]> = {
  format: [[8, 2, 4, 2], [6, 4, 2, 4], [12, 4, 2, 4], [4, 8, 2, 7], [14, 8, 2, 7], [6, 10, 8, 2], [2, 17, 16, 2]],
  attach: [[7, 2, 6, 2], [5, 4, 2, 11], [13, 4, 2, 11], [7, 15, 6, 2], [9, 6, 2, 8]],
  link: [[1, 6, 8, 2], [1, 12, 8, 2], [1, 6, 2, 8], [11, 6, 8, 2], [11, 12, 8, 2], [17, 6, 2, 8], [6, 9, 8, 2]],
  emoji: [[5, 2, 10, 2], [5, 16, 10, 2], [2, 5, 2, 10], [16, 5, 2, 10], [3, 3, 2, 2], [15, 3, 2, 2], [3, 15, 2, 2], [15, 15, 2, 2], [7, 7, 2, 2], [11, 7, 2, 2], [6, 11, 2, 2], [8, 13, 4, 2], [12, 11, 2, 2]],
  drive: [...TRIANGLE, [2, 15, 16, 2]],
  photo: [[2, 4, 16, 2], [2, 14, 16, 2], [2, 4, 2, 12], [16, 4, 2, 12], [7, 9, 2, 2], [5, 11, 6, 3], [11, 11, 2, 3], [12, 7, 2, 2]],
  signature: [[2, 13, 2, 2], [4, 11, 2, 2], [6, 13, 2, 2], [8, 11, 2, 2], [10, 13, 2, 2], [11, 9, 2, 2], [13, 7, 2, 2], [15, 5, 2, 2], [17, 3, 2, 2], [2, 17, 16, 1]],
  meet: [[2, 4, 16, 2], [2, 16, 16, 2], [2, 4, 2, 14], [16, 4, 2, 14], [6, 2, 2, 3], [12, 2, 2, 3], [6, 8, 2, 2], [9, 8, 2, 2], [12, 8, 2, 2], [6, 11, 2, 2], [9, 11, 2, 2]],
  more: [[8, 2, 4, 4], [8, 8, 4, 4], [8, 14, 4, 4]],
  trash: [[3, 4, 14, 2], [7, 2, 6, 2], [4, 7, 2, 11], [14, 7, 2, 11], [4, 16, 12, 2], [8, 8, 1, 7], [11, 8, 1, 7]],
};

export const ICON_NAMES = Object.keys(ICONS) as IconName[];

/** A toolbar glyph in one colour, as a CSS url(). */
export const glyph = (name: IconName, fill: string): string =>
  svgUri(`<path d="${path(ICONS[name])}" fill="${fill}" shape-rendering="crispEdges"/>`, "0 0 20 20");

/** Deep green on light cards, phosphor on dark ones and on hover (Discard lights up head white). */
export const glyphRules = (box: string, names: IconName[]): string =>
  names
    .map((n) => [
      `${box} [data-ir-icon="${n}"]::after { background-image: ${glyph(n, DEEP)}; }`,
      `${box}[data-ir-theme="dark"] [data-ir-icon="${n}"]::after { background-image: ${glyph(n, PH)}; }`,
      `${box} [data-ir-icon="${n}"]:hover::after { background-image: ${glyph(n, n === "trash" ? WHITE : PH)}; }`,
    ].join("\n"))
    .join("\n");

// --- cursors -----------------------------------------------------------------------------------------

// The classic arrow, one character per pixel: X edge, . fill.
const ARROW = [
  "X", "XX", "X.X", "X..X", "X...X", "X....X", "X.....X", "X......X", "X.......X", "X........X",
  "X.........X", "X......XXXXX", "X...X..X", "X..XX..X", "X.X  X..X", "XX   X..X", "X     X..X", "      X..X", "       XX",
];
const PX = 1.5;

/** Pixel art with a one pixel halo around it, so it reads on white and on dark. */
function sprite(rows: string[], edge: string, fill: string, halo: string): string {
  const cells = rows.flatMap((r, y) => [...r].map((c, x) => ({ x, y, c })).filter((q) => q.c !== " "));
  const on = new Set(cells.map((q) => `${q.x},${q.y}`));
  const rect = (x: number, y: number, color: string) => `<rect x="${(x + 1) * PX}" y="${(y + 1) * PX}" width="${PX}" height="${PX}" fill="${color}"/>`;
  let out = "";
  for (const q of cells) for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
    const key = `${q.x + dx},${q.y + dy}`;
    if (!on.has(key)) { on.add(key); out += rect(q.x + dx, q.y + dy, halo); }
  }
  for (const q of cells) out += rect(q.x, q.y, q.c === "X" ? edge : fill);
  return `<g shape-rendering="crispEdges">${out}</g>`;
}

const IBEAM = "M7 3h12v3h-4v14h4v3H7v-3h4V6H7z";

export const CURSORS = {
  arrow: svgCursor(sprite(ARROW, PH, GLASS, "#000"), 32, 2, 2, "default"),
  hand: svgCursor(sprite(ARROW, "#000", PH, "#fff"), 32, 2, 2, "pointer"),
  text: svgCursor(`<path d="${IBEAM}" fill="none" stroke="#000" stroke-width="3"/><path d="${IBEAM}" fill="${PH}" stroke="${GLASS}" stroke-width="1"/>`, 32, 13, 13, "text"),
};
