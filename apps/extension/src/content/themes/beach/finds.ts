import type { Palette } from "./palette";

// Beach finds the wave leaves on the sand, drawn on a canvas centred on 0,0 at size r.
// One find per wave also carries the word "New" (drawNewMark).

export type FindKind = "starfish" | "starfish2" | "starfish3" | "glowstar" | "bottle" | "crab" | "turtle" | "hermit" | "octopus" | "jellyfish" | "newcard";

export interface Find {
  kind: FindKind;
  x: number;
  y: number;
  r: number;
  /** Footprint radius used when placing it. */
  rad: number;
  rot: number;
  /** Which way a crab or hermit crab walks off. */
  dir: 1 | -1;
  isNew?: boolean;
  /** When the water uncovered it. */
  t0?: number;
}

type Ctx = CanvasRenderingContext2D;

function smoothPoly(ctx: Ctx, pts: [number, number][]): void {
  const n = pts.length, mid = (a: number[], b: number[]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const m = mid(pts[n - 1], pts[0]);
  ctx.beginPath(); ctx.moveTo(m[0], m[1]);
  for (let i = 0; i < n; i++) { const p = pts[i], q = mid(p, pts[(i + 1) % n]); ctx.quadraticCurveTo(p[0], p[1], q[0], q[1]); }
  ctx.closePath();
}

function starfish(ctx: Ctx, r: number, fill: string, line: string, dot: string, glow?: string): void {
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.42 : r; pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 14; }
  smoothPoly(ctx, pts); ctx.fillStyle = fill; ctx.fill();
  ctx.shadowBlur = 0; ctx.lineWidth = 1.4; ctx.strokeStyle = line; ctx.stroke();
  ctx.fillStyle = dot;
  for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5; for (let k = 1; k <= 3; k++) { ctx.beginPath(); ctx.arc(Math.cos(a) * r * k * 0.22, Math.sin(a) * r * k * 0.22, 1.1, 0, 6.3); ctx.fill(); } }
}

function bottle(ctx: Ctx, r: number): void {
  const w = r * 2.3, h = r * 0.95;
  ctx.fillStyle = "rgba(120,210,200,.75)"; ctx.strokeStyle = "#3a9c93"; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w * 0.72, h, h * 0.45); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(-w / 2 + w * 0.7, -h * 0.2, w * 0.22, h * 0.4, 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#a8743f"; ctx.fillRect(-w / 2 + w * 0.9, -h * 0.22, w * 0.1, h * 0.44);
  ctx.fillStyle = "#fff4dc"; ctx.strokeStyle = "#d6b27c"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(-w * 0.36, -h * 0.22, w * 0.4, h * 0.44, 3); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-w * 0.4, -h * 0.3); ctx.lineTo(w * 0.05, -h * 0.3); ctx.stroke();
}

function crab(ctx: Ctx, r: number, now: number, moving: boolean): void {
  const wig = moving ? Math.sin(now / 40) * 3 : Math.sin(now / 300) * 0.8;
  ctx.strokeStyle = "#b8321f"; ctx.lineWidth = 1.6; ctx.lineCap = "round";
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(s * r * 0.6, r * (0.05 + k * 0.2)); ctx.lineTo(s * r * 1.25, r * (0.2 + k * 0.28) + (k % 2 ? wig : -wig)); ctx.stroke(); }
  ctx.fillStyle = "#e8503a";
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * r * 0.5, -r * 0.2); ctx.lineTo(s * r * 1.05, -r * 0.75); ctx.stroke(); ctx.beginPath(); ctx.arc(s * r * 1.1, -r * 0.85, r * 0.34, 0, 6.3); ctx.fill(); ctx.stroke(); }
  ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.66, 0, 0, 6.3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#fff"; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * r * 0.3, -r * 0.62, r * 0.2, 0, 6.3); ctx.fill(); }
  ctx.fillStyle = "#1b1b1b"; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * r * 0.3 + 1, -r * 0.62, r * 0.09, 0, 6.3); ctx.fill(); }
}

function turtle(ctx: Ctx, r: number, now: number, moving: boolean): void {
  const sw = moving ? Math.sin(now / 90) * 0.5 : Math.sin(now / 500) * 0.1;
  ctx.fillStyle = "#6fbf73"; ctx.strokeStyle = "#3d7d44"; ctx.lineWidth = 1.2;
  const fl = (x: number, y: number, a: number) => { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, 0, r * 0.48, r * 0.2, 0, 0, 6.3); ctx.fill(); ctx.stroke(); ctx.restore(); };
  fl(-r * 0.78, -r * 0.4, -0.6 + sw); fl(r * 0.78, -r * 0.4, 0.6 - sw); fl(-r * 0.6, r * 0.62, 0.5 - sw); fl(r * 0.6, r * 0.62, -0.5 + sw);
  ctx.beginPath(); ctx.ellipse(0, -r * 1.02, r * 0.3, r * 0.34, 0, 0, 6.3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#1b1b1b"; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * r * 0.13, -r * 1.1, 1.3, 0, 6.3); ctx.fill(); }
  ctx.fillStyle = "#8a6a3c"; ctx.strokeStyle = "#5e4524"; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.72, r * 0.86, 0, 0, 6.3); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "#c9a36a"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(0, 0, r * 0.3, r * 0.36, 0, 0, 6.3); ctx.stroke();
  for (let k = 0; k < 6; k++) { const a = (k * Math.PI) / 3 + 0.5; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.36); ctx.lineTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.84); ctx.stroke(); }
}

function hermit(ctx: Ctx, r: number, now: number, moving: boolean): void {
  const wig = moving ? Math.sin(now / 45) * 2 : 0;
  ctx.strokeStyle = "#c2412d"; ctx.lineWidth = 1.5; ctx.lineCap = "round";
  for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(-r * 0.45, r * 0.25 + k * r * 0.15); ctx.lineTo(-r * 1.1, r * 0.5 + k * r * 0.25 + (k % 2 ? wig : -wig)); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(-r * 0.5, 0); ctx.lineTo(-r * 0.8, -r * 0.5); ctx.moveTo(-r * 0.4, -r * 0.05); ctx.lineTo(-r * 0.55, -r * 0.6); ctx.stroke();
  ctx.fillStyle = "#1b1b1b"; ctx.beginPath(); ctx.arc(-r * 0.8, -r * 0.52, 1.6, 0, 6.3); ctx.fill(); ctx.beginPath(); ctx.arc(-r * 0.55, -r * 0.62, 1.6, 0, 6.3); ctx.fill();
  ctx.fillStyle = "#e8503a"; ctx.beginPath(); ctx.arc(-r * 0.95, r * 0.08, r * 0.24, 0, 6.3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#f2c38b"; ctx.strokeStyle = "#b9814a"; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.moveTo(r * 0.55, -r * 0.95); ctx.lineTo(r * 0.95, -r * 0.2); ctx.arc(r * 0.15, 0, r * 0.78, -0.25, Math.PI * 1.55); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "#c98f5c"; ctx.beginPath();
  for (let a = 0; a < Math.PI * 4; a += 0.15) { const rr = r * 0.62 * (1 - a / (Math.PI * 4.4)); ctx.lineTo(r * 0.15 + Math.cos(a) * rr, Math.sin(a) * rr); }
  ctx.stroke();
}

function octopus(ctx: Ctx, r: number, now: number): void {
  const t = now / 200;
  ctx.strokeStyle = "#a24fc2"; ctx.lineWidth = r * 0.18; ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (let k = 0; k < 6; k++) {
    const bx = -r * 0.5 + k * r * 0.2; ctx.beginPath(); ctx.moveTo(bx, r * 0.1);
    for (let s = 1; s <= 6; s++) ctx.lineTo(bx + (k - 2.5) * s * r * 0.08 + Math.sin(t + k + s * 0.8) * r * 0.12, r * 0.1 + s * r * 0.15);
    ctx.stroke();
  }
  ctx.fillStyle = "#c46fe0"; ctx.beginPath(); ctx.ellipse(0, -r * 0.28, r * 0.66, r * 0.62, 0, 0, 6.3); ctx.fill();
  ctx.fillStyle = "#e3a6f2"; ctx.beginPath(); ctx.ellipse(-r * 0.22, -r * 0.55, r * 0.16, r * 0.1, -0.5, 0, 6.3); ctx.fill();
  for (const s of [-1, 1]) { ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(s * r * 0.24, -r * 0.2, r * 0.17, 0, 6.3); ctx.fill(); ctx.fillStyle = "#1b1b1b"; ctx.beginPath(); ctx.arc(s * r * 0.24 + 1, -r * 0.18, r * 0.08, 0, 6.3); ctx.fill(); }
}

function jellyfish(ctx: Ctx, r: number, now: number): void {
  const pulse = 1 + Math.sin(now / 260) * 0.07, t = now / 240;
  ctx.strokeStyle = "rgba(150,120,230,.75)"; ctx.lineWidth = 1.4; ctx.lineCap = "round";
  for (let k = 0; k < 5; k++) { const bx = -r * 0.5 + k * r * 0.25; ctx.beginPath(); ctx.moveTo(bx, 0); for (let s = 1; s <= 6; s++) ctx.lineTo(bx + Math.sin(t + k + s) * r * 0.12, s * r * 0.2); ctx.stroke(); }
  ctx.fillStyle = "rgba(196,176,255,.72)"; ctx.strokeStyle = "rgba(120,96,210,.9)";
  ctx.beginPath(); ctx.ellipse(0, 0, r * 0.85 * pulse, (r * 0.72) / pulse, 0, Math.PI, 0);
  for (let k = 0; k <= 6; k++) ctx.lineTo(r * 0.85 * pulse * (1 - k / 3), k % 2 ? r * 0.14 : 0);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.beginPath(); ctx.ellipse(-r * 0.3, -r * 0.38, r * 0.18, r * 0.1, -0.5, 0, 6.3); ctx.fill();
}

function newText(ctx: Ctx, x: number, y: number, size: number, fill: string, stroke?: string): void {
  ctx.font = `400 ${size}px "IR Pacifico", "Brush Script MT", cursive`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  if (stroke) { ctx.lineWidth = Math.max(2, size * 0.24); ctx.strokeStyle = stroke; ctx.lineJoin = "round"; ctx.strokeText("New", x, y); }
  ctx.fillStyle = fill; ctx.fillText("New", x, y);
}

/** A card half buried in the sand, reading New. */
function newCard(ctx: Ctx, r: number, pal: Palette): void {
  const w = r * 2.6, h = r * 1.7;
  ctx.fillStyle = "#fff8ea"; ctx.strokeStyle = "#a0703f"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#c65b3a";
  for (let x = -w / 2 + 4; x < w / 2 - 8; x += 8) { ctx.beginPath(); ctx.moveTo(x, -h / 2 + 3); ctx.lineTo(x + 7, -h / 2 + 3); ctx.lineTo(x + 3.5, -h / 2 + 8); ctx.fill(); }
  newText(ctx, 0, -h * 0.1, h * 0.42, "#0b6fa4");
  ctx.fillStyle = pal.sand;
  ctx.beginPath(); ctx.moveTo(-w / 2 - 7, h / 2 + 4);
  for (let x = -w / 2 - 7; x <= w / 2 + 7; x += 3) ctx.lineTo(x, h * 0.2 + Math.sin(x * 0.3) * 2 + Math.abs(x) * 0.1);
  ctx.lineTo(w / 2 + 7, h / 2 + 4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = pal.grain[2];
  for (let k = 0; k < 22; k++) ctx.fillRect(Math.sin(k * 3.1) * w * 0.52, h * 0.28 + Math.abs(Math.cos(k * 1.7)) * h * 0.22, 1.3, 1.3);
}

export function drawFind(ctx: Ctx, kind: FindKind, r: number, now: number, moving: boolean, pal: Palette): void {
  switch (kind) {
    case "starfish": return starfish(ctx, r, "#ff7a59", "#cf4f33", "#ffd2bd");
    case "starfish2": return starfish(ctx, r, "#ffab40", "#d9822b", "#fff0c9");
    case "starfish3": return starfish(ctx, r, "#ff6f9a", "#d24a74", "#ffd6e3");
    case "glowstar": return starfish(ctx, r, "#ffd98a", "#e0a93f", "#fff6d8", "#ffcf5a");
    case "bottle": return bottle(ctx, r);
    case "crab": return crab(ctx, r, now, moving);
    case "turtle": return turtle(ctx, r, now, moving);
    case "hermit": return hermit(ctx, r, now, moving);
    case "octopus": return octopus(ctx, r, now);
    case "jellyfish": return jellyfish(ctx, r, now);
    case "newcard": return newCard(ctx, r, pal);
  }
}

/** The word "New" on the find that carries it this wave. The card already has it. */
export function drawNewMark(ctx: Ctx, kind: FindKind, r: number, now: number): void {
  if (kind === "crab") {
    // a little sign held up in the right claw
    const cx = r * 1.1, cy = -r * 0.85, sx = cx + r * 0.15, sy = cy - r * 1.75, w = r * 2, h = r * 0.9;
    ctx.strokeStyle = "#8a5a2b"; ctx.lineWidth = Math.max(1.5, r * 0.1); ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(sx, sy + h / 2); ctx.stroke();
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(0.08 + Math.sin(now / 180) * 0.05);
    ctx.fillStyle = "#fff8ea"; ctx.strokeStyle = "#8a5a2b"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 3); ctx.fill(); ctx.stroke();
    newText(ctx, 0, 1, h * 0.62, "#e8503a"); ctx.restore();
    ctx.fillStyle = "#e8503a"; ctx.strokeStyle = "#b8321f"; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.34, 0, 6.3); ctx.fill(); ctx.stroke();
  } else if (kind === "bottle") {
    const w = r * 2.3, h = r * 0.95;
    ctx.fillStyle = "#fff4dc"; ctx.strokeStyle = "#d6b27c"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(-w * 0.41, -h * 0.3, w * 0.52, h * 0.6, 3); ctx.fill(); ctx.stroke();
    newText(ctx, -w * 0.15, 1, h * 0.44, "#c0392b");
    ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-w * 0.4, -h * 0.36); ctx.lineTo(w * 0.05, -h * 0.36); ctx.stroke();
  } else if (kind === "starfish") {
    newText(ctx, 0, r * 0.06, r * 0.5, "#fff8ea", "#b8321f");
  } else if (kind === "glowstar") {
    newText(ctx, 0, r * 0.06, r * 0.5, "#0b1e3a", "#fff6d8");
  } else if (kind === "hermit") {
    ctx.save(); ctx.translate(r * 0.2, -r * 0.15); ctx.rotate(-0.2);
    const w = r * 1.3, h = r * 0.62;
    ctx.fillStyle = "#fff8ea"; ctx.strokeStyle = "#b9814a"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 2); ctx.fill(); ctx.stroke();
    newText(ctx, 0, 1, h * 0.72, "#c2412d"); ctx.restore();
  }
}
