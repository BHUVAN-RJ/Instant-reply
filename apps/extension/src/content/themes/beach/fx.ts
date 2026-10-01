import { ghostOf, sizeCanvas, unionIn, type Area } from "../../theme/shared";
import type { Palette } from "./palette";
import { drawFind, drawNewMark, type Find, type FindKind } from "./finds";

// The beach Refactor animation. Seen from above: the thread above the box is the sea. Sand fades into
// the writing area, one wave runs down over it and washes the old text away, then pulls back up and
// leaves the new draft on wet sand, along with a few beach finds (with the New mark, one of them carries
// the word "New"). That is the swoosh's "during". Its "after" is the settle: the sand dries, critters
// wander off, everything fades, and the real editor, already holding the draft, is all that is left.
//
// The waterline is uneven: the area is split into thin columns and each gets its own arrival time,
// reach and retreat time, shaped by one of six presets picked at random, never the same twice in a row.
// Numbers are the "Beach v1" set tuned in docs/design/wave-tuning-lab.html.

const WAVE_MS = 2800;
const UNEVEN = 0.6;
const RUN_UP = 0.36;
const HANG = 0.05;
const SCALLOP = 8;
const LOBE = 44;
const FOAM = 1.5;
const SAND_IN_MS = 140;
const DRY_MS = 2200;
const HOLD_MS = 1600;
const FADE_MS = 700;
const FINDS_MIN = 2;
const FINDS_MAX = 4;
const FIND_SIZE: [number, number] = [10, 17];
const NEW_SIZE = 24;
const TEXT_CLEARANCE = 10;
const FIND_GAP = 23;
const STEP = 6;

type Ctx = CanvasRenderingContext2D;

interface Preset { name: string; pattern: "slant" | "surge"; dir?: "ltr" | "rtl"; slope?: number; c?: number; w?: number }
const PRESETS: Preset[] = [
  { name: "left to right", pattern: "slant", dir: "ltr", slope: 0.8 },
  { name: "right to left", pattern: "slant", dir: "rtl", slope: 0.8 },
  { name: "right nudges ahead", pattern: "slant", dir: "rtl", slope: 0.3 },
  { name: "centre first", pattern: "surge", c: 0.5, w: 0.26 },
  { name: "left half centre", pattern: "surge", c: 0.27, w: 0.2 },
  { name: "right half centre", pattern: "surge", c: 0.73, w: 0.2 },
];
let lastPreset = -1;

const POOL: FindKind[] = ["starfish", "starfish2", "starfish3", "bottle", "crab", "turtle", "hermit", "octopus", "jellyfish"];
const SPAN: Partial<Record<FindKind, number>> = { bottle: 1.5, crab: 1.55, turtle: 1.45, hermit: 1.3, octopus: 1.2, jellyfish: 1.3 };
const MOVERS = new Set<FindKind>(["crab", "turtle", "hermit"]);
const NEW_CARRIERS: FindKind[] = ["crab", "bottle", "starfish", "hermit", "newcard"];
const NEW_SPAN: Partial<Record<FindKind, number>> = { crab: 2.6, bottle: 1.5, starfish: 1.15, hermit: 1.45, newcard: 1.75 };

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const easeSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeBack = (t: number) => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const hexA = (hex: string, a: number) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
const n3 = (u: number, s: number[], f: number[]) => 0.5 + 0.5 * (Math.sin(u * f[0] + s[0]) * 0.55 + Math.sin(u * f[1] + s[1]) * 0.3 + Math.sin(u * f[2] + s[2]) * 0.15);
const bell = (u: number, c: number, w: number) => Math.exp(-Math.pow((u - c) / w, 2));

// ----- the shape of the wave -----

interface Column { du: number; dd: number; hold: number; R: number }

function columnPlan(P: Preset, W: number, H: number, xs: number[]): Column[] {
  const ph = () => [rand(0, 6.3), rand(0, 6.3), rand(0, 6.3)];
  const s = { a: ph(), b: ph(), c: ph() };
  return xs.map((x) => {
    const u = x / W;
    let up: number, down: number, reach: number;
    if (P.pattern === "slant") {
      const d = P.dir === "ltr" ? u : 1 - u, slope = P.slope ?? 0.8;
      up = clamp(0.9 * slope * d + 0.25 * UNEVEN * n3(u, s.a, [9, 17, 29]));
      down = clamp(0.8 * slope * (1 - d) + 0.25 * UNEVEN * n3(u, s.b, [9, 17, 29]));
      reach = clamp(0.7 * UNEVEN * n3(u, s.c, [6, 13, 27]));
    } else {
      const b = bell(u, P.c ?? 0.5, P.w ?? 0.26);
      up = clamp((1 - b) * 0.8 + 0.25 * UNEVEN * n3(u, s.a, [9, 17, 31]));
      down = clamp((1 - b) * 0.7 + 0.25 * UNEVEN * n3(u, s.b, [9, 17, 31]));
      reach = clamp(b * 0.8 + 0.25 * UNEVEN * n3(u, s.c, [7, 15, 29]));
    }
    return { du: 0.18 * up, dd: 0.16 * down, hold: HANG * n3(u, s.c, [3, 7, 13]), R: H * (1.06 + 0.26 * reach) };
  });
}

/** One column's water edge over the whole wave: wait, run down, hang, drain back past the top. */
function colTide(t: number, c: Column): { b: number; up: boolean } {
  const ta = c.du, tu = ta + RUN_UP, td0 = tu + c.hold, te = Math.max(1 - c.dd, td0 + 0.08);
  if (t < ta) return { b: -16, up: true };
  if (t < tu) return { b: -16 + (c.R + 16) * easeOut((t - ta) / RUN_UP), up: true };
  if (t < td0) return { b: c.R, up: true };
  return { b: c.R - (c.R + 18) * easeSine(clamp((t - td0) / (te - td0))), up: false };
}

/** Small scale swash texture on the edge: rounded tongues, sharp cusps. */
function texture(phi: number, x: number, b: number, now: number): number {
  return b + SCALLOP * Math.pow(Math.abs(Math.sin((x / LOBE) * Math.PI + phi + now / 1500)), 0.55) + 2.5 * Math.sin(x * 0.031 + now / 520 + phi * 2) + 1.5 * Math.sin(x * 0.067 - now / 300);
}

// ----- state of one run -----

interface Particle { x: number; y: number; vx: number; vy: number; r: number; life: number; c?: string }
interface Lace { x: number; d: number; rx: number; ry: number; a: number }
interface Caustic { x: number; y: number; r: number; p: number }
interface State {
  phi: number; xs: number[]; mr: number[]; wet: (number | null | undefined)[][]; rows: number;
  bs: number[]; ups: boolean[]; edge: number[]; done: boolean;
  grain: HTMLCanvasElement; wetC: HTMLCanvasElement; sheenC: HTMLCanvasElement;
  lace: Lace[]; caustics: Caustic[]; spray: Particle[]; grit: Particle[]; finds: Find[];
}

function grainCanvas(W: number, H: number, pal: Palette): HTMLCanvasElement {
  const c = document.createElement("canvas"), d = devicePixelRatio || 1;
  c.width = Math.round(W * d); c.height = Math.round(H * d);
  const g = c.getContext("2d")!; g.scale(d, d);
  g.fillStyle = pal.sand; g.fillRect(0, 0, W, H);
  for (let i = 0; i < (W * H) / 30; i++) { g.fillStyle = pal.grain[(Math.random() * 3) | 0]; g.globalAlpha = rand(0.35, 0.9); g.fillRect(rand(0, W), rand(0, H), rand(0.8, 1.8), rand(0.8, 1.8)); }
  g.globalAlpha = 0.5;
  for (let i = 0; i < 14; i++) { g.fillStyle = pal.grain[2]; g.beginPath(); g.ellipse(rand(0, W), rand(0, H), rand(1.5, 3), rand(1, 2), rand(0, 3), 0, 6.3); g.fill(); }
  return c;
}

// ----- finds: where they go -----

type Rect = { x0: number; y0: number; x1: number; y1: number };

/** Line boxes of the new draft, relative to the area, padded so finds keep clear of the words. */
function textRects(layer: HTMLElement): Rect[] {
  const base = layer.getBoundingClientRect(), out: Rect[] = [];
  const walker = document.createTreeWalker(layer, NodeFilter.SHOW_TEXT), range = document.createRange();
  while (walker.nextNode()) {
    range.selectNodeContents(walker.currentNode);
    for (const r of range.getClientRects()) {
      if (r.width > 1) out.push({ x0: r.left - base.left - TEXT_CLEARANCE, y0: r.top - base.top - TEXT_CLEARANCE * 0.6, x1: r.right - base.left + TEXT_CLEARANCE, y1: r.bottom - base.top + TEXT_CLEARANCE * 0.6 });
    }
  }
  return out;
}

function fits(x: number, y: number, rad: number, W: number, H: number, rects: Rect[], placed: Find[]): boolean {
  if (x - rad < 4 || x + rad > W - 4 || y - rad < 4 || y + rad > H - 4) return false;
  if (rects.some((q) => x + rad > q.x0 && x - rad < q.x1 && y + rad > q.y0 && y - rad < q.y1)) return false;
  return !placed.some((p) => Math.hypot(p.x - x, p.y - y) < p.rad + rad + FIND_GAP);
}

/**
 * With the New mark, the "New" carrier goes first and biggest, shrinking only when the draft leaves no
 * room; then 1 to 3 more finds. Without it, 2 to 4 plain finds.
 */
function scatter(W: number, H: number, rects: Rect[], withNew: boolean): Find[] {
  const placed: Find[] = [];
  const carrier = withNew ? NEW_CARRIERS[(Math.random() * NEW_CARRIERS.length) | 0] : null;
  if (carrier) for (const scale of [1, 0.85, 0.7, 0.55]) {
    const r = NEW_SIZE * scale, rad = r * (NEW_SPAN[carrier] ?? 1.2);
    let done = false;
    for (let tries = 0; tries < 500 && !done; tries++) {
      const x = rand(rad, W - rad), y = rand(rad, H - rad);
      if (!fits(x, y, rad, W, H, rects, placed)) continue;
      placed.push({ kind: carrier, x, y: carrier === "crab" ? y + r * 0.9 : y, r, rad, rot: carrier === "crab" || carrier === "hermit" ? rand(-0.08, 0.08) : rand(-0.3, 0.3), dir: Math.random() < 0.5 ? -1 : 1, isNew: true });
      done = true;
    }
    if (done) break;
  }
  const want = Math.max(0, FINDS_MIN + ((Math.random() * (FINDS_MAX - FINDS_MIN + 1)) | 0) - (carrier ? 1 : 0));
  const kinds = POOL.filter((k) => k !== carrier).sort(() => Math.random() - 0.5).slice(0, want);
  for (const kind of kinds) {
    const r = rand(...FIND_SIZE), rad = r * (SPAN[kind] ?? 1.2);
    for (let tries = 0; tries < 300; tries++) {
      const x = rand(rad, W - rad), y = rand(rad, H - rad);
      if (!fits(x, y, rad, W, H, rects, placed)) continue;
      placed.push({ kind, x, y, r, rad, rot: MOVERS.has(kind) || kind === "octopus" || kind === "jellyfish" ? rand(-0.15, 0.15) : rand(-0.8, 0.8), dir: Math.random() < 0.5 ? -1 : 1 });
      break;
    }
  }
  // Movers are drawn last so they walk over the rest.
  return placed.sort((a, b) => Number(MOVERS.has(a.kind)) - Number(MOVERS.has(b.kind)));
}

function unearth(st: State, f: Find, now: number, pal: Palette): void {
  f.t0 = now;
  for (let i = 0; i < 16; i++) st.grit.push({ x: f.x + rand(-f.r, f.r), y: f.y + rand(-4, 4), vx: rand(-1.6, 1.6), vy: rand(-2.8, -0.8), r: rand(1, 2.2), c: pal.grain[(Math.random() * 3) | 0], life: 1 });
}

// ----- drawing -----

function drawSand(ctx: Ctx, W: number, H: number, st: State, pal: Palette, now: number, alpha: number): void {
  ctx.clearRect(0, 0, W, H);
  if (alpha <= 0) return;
  ctx.globalAlpha = alpha;
  ctx.drawImage(st.grain, 0, 0, W, H);

  // Wet sand and sheen: one pixel per cell in a tiny canvas, scaled up smoothly so there are no seams.
  const cols = st.xs.length, rows = st.rows;
  const wc = st.wetC.getContext("2d")!, wi = wc.createImageData(cols, rows);
  const sc = st.sheenC.getContext("2d")!, si = sc.createImageData(cols, rows);
  const wn = parseInt(pal.wet.slice(1), 16), sn = parseInt((pal.water.glow ?? "#ffffff").slice(1), 16);
  const sheenOn = st.edge.length > 0 && !st.done;
  for (let i = 0; i < cols; i++) {
    const col = st.wet[i], lim = st.mr[i] + 3, down = sheenOn && !st.ups[i], ey = sheenOn ? st.edge[i] : 0;
    for (let r = 0; r < rows; r++) {
      const y = r * 4, o = (r * cols + i) * 4;
      if (y <= lim) {
        const wt = col[r], a = wt == null ? 1 : 1 - clamp((now - wt) / DRY_MS);
        wi.data[o] = wn >> 16; wi.data[o + 1] = (wn >> 8) & 255; wi.data[o + 2] = wn & 255; wi.data[o + 3] = 255 * 0.85 * Math.max(0, a);
      }
      if (down && y >= ey - 2) {
        const d = y - ey, a = d < 7 ? 0.45 : d < 17 ? 0.22 : d < 31 ? 0.09 * (1 - (d - 17) / 14) : 0;
        si.data[o] = sn >> 16; si.data[o + 1] = (sn >> 8) & 255; si.data[o + 2] = sn & 255; si.data[o + 3] = 255 * a;
      }
    }
  }
  wc.putImageData(wi, 0, 0); sc.putImageData(si, 0, 0);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
  ctx.drawImage(st.wetC, -STEP / 2, 0, cols * STEP, rows * 4);
  if (sheenOn) ctx.drawImage(st.sheenC, -STEP / 2, 0, cols * STEP, rows * 4);

  for (const f of st.finds) {
    if (f.t0 == null) continue;
    const e = now - f.t0, p = clamp(e / 340);
    let x = f.x, y = f.y, moving = false;
    if (f.kind === "crab") { const m = clamp((e - (f.isNew ? 2600 : 700)) / 1500); moving = m > 0 && m < 1; x += f.dir * Math.pow(m, 1.6) * (f.dir > 0 ? W - f.x + 50 : f.x + 50); }
    if (f.kind === "turtle") { const m = clamp((e - 600) / 2600); moving = m > 0 && m < 1; y -= easeSine(m) * (f.y + 40); }
    if (f.kind === "hermit") { const m = clamp((e - 800) / 1300); moving = m > 0 && m < 1; x += f.dir * 34 * easeSine(m); }
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y);
    const s = easeBack(p);
    ctx.rotate(f.rot + (f.kind === "bottle" ? Math.sin(now / 260) * 0.05 : 0)); ctx.scale(s, s);
    ctx.fillStyle = "rgba(60,40,20,.14)"; ctx.beginPath(); ctx.ellipse(1.5, f.r * 0.75, f.r * 1.1, f.r * 0.35, 0, 0, 6.3); ctx.fill();
    const kind: FindKind = pal.water.glow && f.kind.startsWith("starfish") ? "glowstar" : f.kind;
    if (pal.water.glow && kind === "jellyfish") { ctx.shadowColor = pal.water.glow; ctx.shadowBlur = 12; }
    drawFind(ctx, kind, f.r, now, moving, pal);
    ctx.shadowBlur = 0;
    if (f.isNew) drawNewMark(ctx, kind, f.r, now);
    // a skin of sand slides off as it is unearthed
    const skin = 1 - clamp(e / 800);
    if (skin > 0) { ctx.globalAlpha = alpha * skin * 0.9; ctx.fillStyle = pal.wet; ctx.beginPath(); ctx.ellipse(0, f.r * 0.1, f.r * 1.25, f.r * (0.4 + 0.6 * skin), 0, 0, 6.3); ctx.fill(); }
    ctx.restore();
  }
  for (const g of st.grit) { g.x += g.vx; g.y += g.vy; g.vy += 0.18; g.life -= 0.03; if (g.life <= 0) continue; ctx.globalAlpha = alpha * g.life; ctx.fillStyle = g.c!; ctx.fillRect(g.x, g.y, g.r, g.r); }
  st.grit = st.grit.filter((g) => g.life > 0);
  ctx.globalAlpha = 1;
}

function trace(ctx: Ctx, xs: number[], ys: number[], back = false): void {
  if (back) for (let i = xs.length - 1; i >= 0; i--) ctx.lineTo(xs[i], ys[i]);
  else for (let i = 0; i < xs.length; i++) ctx.lineTo(xs[i], ys[i]);
}

function drawWater(ctx: Ctx, W: number, st: State, pal: Palette, now: number): void {
  const { xs, ups, edge: ys } = st, n = xs.length, w = pal.water, glow = w.glow;
  const maxY = Math.max(...ys), upFrac = ups.filter(Boolean).length / n;
  ctx.save();
  ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(W, -4); trace(ctx, xs, ys, true); ctx.closePath();
  const g = ctx.createLinearGradient(0, 0, 0, Math.max(20, maxY));
  g.addColorStop(0, hexA(w.deep, 0.92)); g.addColorStop(0.55, hexA(w.mid, 0.86)); g.addColorStop(1, hexA(w.far, 0.62));
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); ctx.clip();
  for (let j = 1; j <= 3; j++) {
    ctx.strokeStyle = hexA(w.foam, 0.38 - j * 0.08); ctx.lineWidth = 1.6 - j * 0.3;
    ctx.beginPath(); for (let i = 0; i < n; i++) ctx.lineTo(xs[i], ys[i] - j * 15 - 4 * Math.sin(xs[i] * 0.045 + now / 260 + j)); ctx.stroke();
  }
  ctx.strokeStyle = hexA(w.far, 0.22); ctx.lineWidth = 1;
  for (const c of st.caustics) {
    const cx = c.x + Math.sin(now / 700 + c.p) * 8, cy = c.y + Math.cos(now / 800 + c.p) * 6;
    if (cy > maxY) continue;
    ctx.beginPath(); ctx.ellipse(cx, cy, c.r, c.r * 0.6, c.p, 0, 6.3); ctx.stroke();
  }
  if (glow) for (let i = 0; i < 26; i++) { ctx.fillStyle = hexA(glow, rand(0.3, 0.9)); ctx.beginPath(); ctx.arc(rand(0, W), rand(0, maxY), rand(0.6, 1.6), 0, 6.3); ctx.fill(); }
  // lace left in the thin sheet wherever it is pulling back
  ctx.strokeStyle = hexA(w.foam, 0.8); ctx.lineWidth = 1;
  for (const c of st.lace) {
    const i = Math.min(n - 1, Math.round(c.x / STEP));
    if (ups[i]) continue;
    ctx.globalAlpha = 1 - c.d / 46;
    ctx.beginPath(); ctx.ellipse(c.x, ys[i] - c.d, c.rx, c.ry, c.a, 0, 6.3); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  ctx.save();
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 12; }
  ctx.strokeStyle = hexA(w.foam, 0.9); ctx.lineWidth = (2.2 + 1.8 * upFrac) * FOAM; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(xs[0], ys[0]); trace(ctx, xs, ys); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = w.foam;
  for (let i = 0; i < n; i++) {
    const u = ups[i];
    ctx.globalAlpha = rand(0.6, 1);
    ctx.beginPath(); ctx.arc(xs[i] + rand(-3, 3), ys[i] + (u ? -2 : 0) + rand(-(u ? 5 : 3), u ? 2 : 1.2), u ? rand(1.3, 3.6) : rand(0.8, 2), 0, 6.3); ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (upFrac > 0) { ctx.strokeStyle = hexA(w.abyss, 0.12 * upFrac); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(xs[0], ys[0] + 4); trace(ctx, xs, ys.map((y) => y + 4)); ctx.stroke(); }
  for (const d of st.spray) { d.x += d.vx; d.y += d.vy; d.vy += 0.16; d.life -= 0.04; if (d.life <= 0) continue; ctx.globalAlpha = d.life; ctx.fillStyle = glow ?? w.foam; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.3); ctx.fill(); }
  st.spray = st.spray.filter((d) => d.life > 0);
  ctx.restore();
}

// ----- the run -----

function layer(tag: "canvas" | "div", className: string, area: Area): HTMLElement {
  const el = document.createElement(tag);
  el.className = `ir-beach-layer ${className}`;
  el.setAttribute("aria-hidden", "true");
  Object.assign(el.style, { left: `${area.left}px`, top: `${area.top}px`, width: `${area.width}px`, height: `${area.height}px` });
  return el;
}

const polyPts = (xs: number[], ys: number[]) => xs.map((x, i) => `${x}px ${ys[i]}px`).join(",");

/** A wave that has washed in, ready to settle. */
export interface WaveRun {
  /** Starts the settle: hold on wet sand, dry, fade out, clean up. */
  settle(): void;
}

/** If `settle` is never called, the wave settles on its own after this long. */
const SETTLE_FALLBACK_MS = 8000;

/**
 * Runs `write` (which puts the draft into the editor) under the wave. `host` must be positioned; the
 * layers live inside it so they scroll with the thread. Resolves when the wave has pulled back and the
 * draft is readable; the sand then waits for `settle` to dry and fade.
 */
export async function washIn(host: HTMLElement, editor: HTMLElement, write: () => void, pal: Palette, withNew: boolean): Promise<WaveRun> {
  await Promise.race([document.fonts.load('20px "IR Pacifico"'), new Promise((r) => setTimeout(r, 300))]).catch(() => {});
  const before = editor.getBoundingClientRect();
  const oldText = ghostOf(editor, "ir-beach-layer ir-beach-text");
  write();
  const area = unionIn(host, before, editor.getBoundingClientRect());
  const newText = ghostOf(editor, "ir-beach-layer ir-beach-text");
  const sand = layer("canvas", "ir-beach-sand", area) as HTMLCanvasElement;
  const water = layer("canvas", "ir-beach-water", area) as HTMLCanvasElement;
  for (const [el, z] of [[oldText, 7], [newText, 7]] as const) {
    Object.assign(el.style, { left: `${area.left}px`, top: `${area.top}px`, width: `${area.width}px`, height: `${area.height}px`, zIndex: String(z) });
  }
  newText.style.clipPath = "polygon(0 0, 0 0, 0 0)";
  host.append(sand, newText, oldText, water);

  const W = area.width, H = area.height;
  const sandCtx = sizeCanvas(sand, W, H), waterCtx = sizeCanvas(water, W, H);
  const xs: number[] = [];
  for (let x = 0; x <= W + STEP; x += STEP) xs.push(Math.min(x, W));
  let pick = (Math.random() * (PRESETS.length - 1)) | 0;
  if (pick >= lastPreset && lastPreset >= 0) pick++;
  lastPreset = pick;
  const plan = columnPlan(PRESETS[pick], W, H, xs), rows = Math.ceil(H / 4) + 2;
  const tiny = () => Object.assign(document.createElement("canvas"), { width: xs.length, height: rows });
  const st: State = {
    phi: rand(0, 6), xs, mr: xs.map(() => -30), wet: xs.map(() => new Array(rows)), rows,
    bs: [], ups: [], edge: [], done: false,
    grain: grainCanvas(W, H, pal), wetC: tiny(), sheenC: tiny(),
    lace: Array.from({ length: Math.round(W / 5) }, () => ({ x: rand(0, W), d: rand(3, 44), rx: rand(3, 9), ry: rand(1.5, 4), a: rand(-0.4, 0.4) })),
    caustics: Array.from({ length: 18 }, () => ({ x: rand(0, W), y: rand(0, H), r: rand(6, 14), p: rand(0, 6) })),
    spray: [], grit: [], finds: scatter(W, H, textRects(newText), withNew),
  };

  const t0 = performance.now();
  let settleAt: number | null = null;
  let revealed: (run: WaveRun) => void = () => {};
  const readable = new Promise<WaveRun>((resolve) => (revealed = resolve));
  const run: WaveRun = { settle: () => void (settleAt ??= performance.now()) };
  const frame = (now: number) => {
    const el = now - t0, t = Math.min(1, el / WAVE_MS);
    if (settleAt == null && el > WAVE_MS + SETTLE_FALLBACK_MS) settleAt = now;
    const settled = settleAt == null ? 0 : now - settleAt;
    const sandA = el < SAND_IN_MS ? el / SAND_IN_MS : settled > HOLD_MS ? 1 - clamp((settled - HOLD_MS) / FADE_MS) : 1;
    if (t < 1) {
      const cols = plan.map((c) => colTide(t, c));
      st.bs = cols.map((c) => c.b); st.ups = cols.map((c) => c.up);
      const raw = xs.map((x, i) => texture(st.phi, x, st.bs[i], now));
      const ys = raw.map((y, i) => (raw[Math.max(0, i - 1)] + 2 * y + raw[Math.min(xs.length - 1, i + 1)]) / 4);
      st.edge = ys;
      for (let i = 0; i < xs.length; i++) {
        st.mr[i] = Math.max(st.mr[i], ys[i]);
        const col = st.wet[i];
        for (let r = 0; r < rows; r++) { const y = r * 4; if (y < ys[i]) col[r] = null; else if (col[r] === null) col[r] = now; }
      }
      const reach = st.mr.slice(), top = ys.map((y, i) => Math.min(y, reach[i]));
      oldText.style.clipPath = `polygon(${polyPts(xs, reach)}, ${W}px ${H + 60}px, 0 ${H + 60}px)`;
      newText.style.clipPath = `polygon(${polyPts(xs, top)}, ${polyPts([...xs].reverse(), [...reach].reverse())})`;
      for (const f of st.finds) {
        if (f.t0 != null) continue;
        const c = Math.min(xs.length - 1, Math.round(f.x / STEP));
        if (!st.ups[c] && st.mr[c] > f.y - 4 && ys[c] < f.y - f.r) unearth(st, f, now, pal);
      }
      waterCtx.clearRect(0, 0, W, H);
      drawWater(waterCtx, W, st, pal, now);
    } else if (!st.done) {
      st.done = true;
      water.remove(); oldText.remove();
      newText.style.clipPath = "";
      for (const f of st.finds) if (f.t0 == null) unearth(st, f, now, pal);
      for (const col of st.wet) for (let r = 0; r < rows; r++) if (col[r] === null) col[r] = now;
      revealed(run);
    }
    drawSand(sandCtx, W, H, st, pal, now, sandA);
    newText.style.opacity = st.done ? String(sandA) : "1";
    if (settleAt == null || settled < HOLD_MS + FADE_MS) return void requestAnimationFrame(frame);
    sand.remove(); newText.remove();
  };
  requestAnimationFrame(frame);
  return readable;
}
