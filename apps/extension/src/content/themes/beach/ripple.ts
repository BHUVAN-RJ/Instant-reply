import { areaOf, sizeCanvas } from "../../theme/shared";
import type { Palette } from "./palette";

// The beach swoosh's "before": while the model thinks, small waves lap at the top edge of the writing
// area, the way the sea keeps touching the shore before the big wave comes. Two sets roll in turn, each
// reaching a little way down (never past the first line), with a foam edge, then draining back up.

const CYCLE_MS = 1900;
const REACH: [number, number] = [7, 20];
const FADE_IN_MS = 300;
const STEP = 6;

const hexA = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
};
const easeSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

/** How far down one set reaches at time `t` of its cycle: in fast, a short hang, out slow. */
function swash(t: number): number {
  if (t < 0.35) return easeSine(t / 0.35);
  if (t < 0.45) return 1;
  return 1 - easeSine((t - 0.45) / 0.55);
}

/** Starts the lapping over `editor`; returns a function that drains it and removes the layer. */
export function lap(host: HTMLElement, editor: HTMLElement, pal: Palette): () => void {
  const area = areaOf(host, editor);
  const canvas = document.createElement("canvas");
  canvas.className = "ir-beach-layer ir-beach-ripple";
  canvas.setAttribute("aria-hidden", "true");
  const H = Math.min(area.height, REACH[1] + 16);
  Object.assign(canvas.style, { left: `${area.left}px`, top: `${area.top}px`, width: `${area.width}px`, height: `${H}px` });
  host.append(canvas);
  const W = area.width;
  const ctx = sizeCanvas(canvas, W, H);
  const xs: number[] = [];
  for (let x = 0; x <= W + STEP; x += STEP) xs.push(Math.min(x, W));
  // Each set gets its own uneven reach across the width.
  const sets = [0, 0.5].map((offset) => ({ offset, phase: Math.random() * 6.3, lean: Math.random() * 6.3 }));
  const w = pal.water;

  const t0 = performance.now();
  let stopAt: number | null = null;
  let raf = 0;
  const frame = (now: number) => {
    const fade = stopAt == null ? Math.min(1, (now - t0) / FADE_IN_MS) : 1 - Math.min(1, (now - stopAt) / FADE_IN_MS);
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = fade;
    for (const s of sets) {
      const t = (((now - t0) / CYCLE_MS + s.offset) % 1 + 1) % 1;
      const k = swash(t);
      if (k <= 0.01) continue;
      const ys = xs.map((x) => {
        const u = x / W;
        const reach = REACH[0] + (REACH[1] - REACH[0]) * (0.5 + 0.5 * Math.sin(u * 7 + s.lean));
        return k * reach + 2.2 * Math.sin(x / 19 + s.phase + now / 400) - 2;
      });
      ctx.beginPath();
      ctx.moveTo(0, 0);
      xs.forEach((x, i) => ctx.lineTo(x, ys[i]));
      ctx.lineTo(W, 0);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, 0, 0, REACH[1]);
      g.addColorStop(0, hexA(w.mid, 0.55));
      g.addColorStop(1, hexA(w.far, 0.3));
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = hexA(w.foam, 0.9);
      ctx.lineWidth = 1.8;
      ctx.lineCap = "round";
      ctx.beginPath();
      xs.forEach((x, i) => (i ? ctx.lineTo(x, ys[i]) : ctx.moveTo(x, ys[i])));
      ctx.stroke();
      if (w.glow) {
        ctx.fillStyle = hexA(w.glow, 0.7);
        for (let i = 0; i < 6; i++) ctx.fillRect(Math.random() * W, Math.random() * Math.max(1, Math.min(...ys)), 1.4, 1.4);
      }
    }
    ctx.globalAlpha = 1;
    if (stopAt != null && now - stopAt >= FADE_IN_MS) return canvas.remove();
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => {
    if (stopAt != null) return;
    stopAt = performance.now();
    // A tab in the background gets no frames; remove the layer anyway.
    setTimeout(() => {
      cancelAnimationFrame(raf);
      canvas.remove();
    }, FADE_IN_MS + 200);
  };
}
