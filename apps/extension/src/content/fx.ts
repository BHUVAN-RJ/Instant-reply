import { ACID, CYAN, INK, MAG } from "./palette";

// The Refactor animation. When the draft arrives an ink block of thin glitch rows sweeps the editor left
// to right: the draft is already written underneath, and a snapshot of the old text is torn away row by
// row behind the block's jittering front. Then a "New!" sticker slams on and peels off like a poster.

const SWEEP_MS = 600;
const TRAIL = 520;
const ROWS = 24;
const SPREAD = 0.06; // how far apart the rows start, as a share of the sweep
const FRONT_JITTER = 6;
const CORE = 0.55; // share of the trail that is one solid block across every row
const FRINGE = 26; // acid lip on the front of each row
const BLACK_ROWS = 0.75;
const BLACK_WIDTH = 0.55;
const ECHOES: [dx: number, alpha: number, tint: string][] = [
  [-70, 0.35, MAG],
  [-140, 0.25, CYAN],
];
const ROW_COLORS = [ACID, MAG, INK, ACID, CYAN, MAG, ACID, INK, MAG, ACID, CYAN];
const LIGHT = [ACID, MAG, CYAN, ACID, MAG];

export const reducedMotion = (): boolean => matchMedia("(prefers-reduced-motion: reduce)").matches;

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const rand = (a: number, b: number) => a + Math.random() * (b - a);

interface Row {
  delay: number;
  tail: number;
  color: string;
}

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** A rect relative to `host`, covering both of the given viewport rects. */
function unionIn(host: HTMLElement, a: DOMRect, b: DOMRect): Box {
  const h = host.getBoundingClientRect();
  const left = Math.min(a.left, b.left), top = Math.min(a.top, b.top);
  return {
    left: left - h.left,
    top: top - h.top,
    width: Math.max(a.right, b.right) - left,
    height: Math.max(a.bottom, b.bottom) - top,
  };
}

function place(el: HTMLElement, r: Box): void {
  Object.assign(el.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
}

/** A still copy of the editor's current text, styled like the editor, to tear away. */
function ghostOf(editor: HTMLElement): HTMLElement {
  const cs = getComputedStyle(editor);
  const ghost = document.createElement("div");
  ghost.className = "ir-ghost";
  ghost.setAttribute("aria-hidden", "true");
  for (const prop of ["font", "lineHeight", "color", "padding", "direction", "textAlign", "letterSpacing", "wordSpacing"] as const) {
    ghost.style[prop] = cs[prop];
  }
  ghost.innerHTML = editor.innerHTML;
  return ghost;
}

function drawRows(ctx: CanvasRenderingContext2D, xs: number[], rows: Row[], h: number, dx: number, alpha: number, tint?: string): void {
  const n = rows.length, rh = h / n, core = TRAIL * CORE;
  ctx.globalAlpha = alpha;
  for (let i = 0; i < n; i++) {
    const x = xs[i] + dx, y = i * rh, rowH = rh + 1;
    const tailLen = (TRAIL - core) * (rows[i].tail + rand(0, 0.12));
    ctx.fillStyle = tint ?? rows[i].color;
    ctx.fillRect(x - core - tailLen, y, tailLen, rowH);
    if (tint) {
      ctx.fillRect(x - core, y, core, rowH);
      continue;
    }
    // Only some rows get black, and only the front part of their core.
    const black = ((i * 7) % n) / n < BLACK_ROWS;
    const bw = black ? core * BLACK_WIDTH : 0;
    ctx.fillStyle = LIGHT[i % LIGHT.length];
    ctx.fillRect(x - core, y, core - bw, rowH);
    ctx.fillStyle = INK;
    ctx.fillRect(x - bw, y, bw, rowH);
    ctx.fillStyle = ACID;
    ctx.fillRect(x - FRINGE - rand(0, 10), y, FRINGE + 10, rowH);
  }
  ctx.globalAlpha = 1;
}

function drawFrame(ctx: CanvasRenderingContext2D, xs: number[], rows: Row[], h: number): void {
  for (const [dx, alpha, tint] of ECHOES) drawRows(ctx, xs, rows, h, dx, alpha, tint);
  drawRows(ctx, xs, rows, h, 0, 1);
  const rh = h / rows.length;
  ctx.fillStyle = "rgba(13,11,18,.12)";
  const minX = Math.min(...xs) - TRAIL, maxX = Math.max(...xs);
  for (let y = 0; y < h; y += 4) ctx.fillRect(minX, y, maxX - minX, 1.5);
  xs.forEach((x, i) => {
    ctx.fillStyle = "#fff";
    ctx.fillRect(x - 1, i * rh, 3, rh + 1);
    ctx.fillStyle = MAG;
    ctx.fillRect(x + 3, i * rh, 2, rh + 1);
  });
}

/**
 * Runs `write` (which replaces the editor's text) under the sweep. `host` must be positioned;
 * the overlay lives inside it so it scrolls with the thread.
 */
export async function sweep(host: HTMLElement, editor: HTMLElement, write: () => void): Promise<void> {
  if (reducedMotion()) return write();
  const before = editor.getBoundingClientRect();
  const ghost = ghostOf(editor);
  write();
  const area = unionIn(host, before, editor.getBoundingClientRect());

  const canvas = document.createElement("canvas");
  canvas.className = "ir-sweep";
  canvas.setAttribute("aria-hidden", "true");
  place(ghost, area);
  place(canvas, area);
  const dpr = devicePixelRatio || 1;
  canvas.width = Math.round(area.width * dpr);
  canvas.height = Math.round(area.height * dpr);
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  host.append(ghost, canvas);

  const rows: Row[] = Array.from({ length: ROWS }, (_, i) => ({
    delay: Math.random() * SPREAD,
    tail: rand(0.15, 0.5),
    color: ROW_COLORS[(i * 3) % ROW_COLORS.length],
  }));
  const { width: w, height: h } = area;
  const distance = w + TRAIL + 180;

  await new Promise<void>((done) => {
    const t0 = performance.now();
    const frame = (now: number) => {
      const t = Math.min(1, (now - t0) / SWEEP_MS);
      const xs = rows.map((r) => -90 + ease(clamp01((t - r.delay) / (1 - SPREAD))) * distance + (t < 1 ? rand(-FRONT_JITTER, FRONT_JITTER) : 0));
      const rh = h / ROWS;
      const edge = xs.flatMap((x, i) => [`${x}px ${i * rh}px`, `${x}px ${(i + 1) * rh}px`]);
      ghost.style.clipPath = `polygon(${edge.join(",")}, 100% 100%, 100% 0)`;
      ctx.clearRect(0, 0, w, h);
      drawFrame(ctx, xs, rows, h);
      if (t < 1) requestAnimationFrame(frame);
      else done();
    };
    requestAnimationFrame(frame);
  });
  ghost.remove();
  canvas.remove();
}

/** The New! sticker: slams onto the top right of the editor, shakes the box, then peels off and drops. */
export function stamp(host: HTMLElement, editor: HTMLElement): void {
  if (reducedMotion()) return;
  const h = host.getBoundingClientRect(), e = editor.getBoundingClientRect();
  const sticker = document.createElement("div");
  sticker.className = "ir-stamp";
  sticker.setAttribute("aria-hidden", "true");
  sticker.innerHTML = '<div class="ir-sheet"><div class="ir-sheet-shadow"></div><div class="ir-face">New!</div></div>';
  sticker.style.top = `${e.top - h.top + 8}px`;
  sticker.style.right = `${h.right - e.right + 26}px`;
  host.append(sticker);
  const sheet = sticker.firstElementChild!;
  sheet.addEventListener("animationend", (event) => {
    if ((event as AnimationEvent).animationName === "ir-poster") sticker.remove();
  });
  setTimeout(() => {
    host.classList.remove("ir-shake");
    void host.offsetWidth;
    host.classList.add("ir-shake");
    setTimeout(() => host.classList.remove("ir-shake"), 300);
  }, 200);
}
