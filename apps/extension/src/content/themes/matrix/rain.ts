import type { Ornament } from "../../theme/contract";
import { reducedMotion } from "../../theme/shared";
import { KANA, LETTERS, pickKana, pickLetter } from "./palette";

// The faint code rain across the card (DESIGN.md, "Card"), and the ornament that runs it: one rain per
// active box, on the canvas in the skin. It loops lightly at rest, pours for a moment when the box wakes
// and on every key, pours while the model thinks, and stops dead for the swoosh (bullet time).

const CELL = 13; // px per glyph
const SPEED = 16; // rows a second at full speed
const ALPHA = 0.14; // how visible the rain is on the card
const IDLE = 0.3; // speed at rest, as a share of full speed
const SETTLE_MS = 550; // how fast a burst eases back to the loop

const FONT = (px: number) => `${px}px "IR OCR", "Hiragino Sans", "Yu Gothic", "MS Gothic", monospace`;

/** One glyph, mirrored like the film's code, centred on x. */
export function glyphAt(g: CanvasRenderingContext2D, ch: string, x: number, y: number, size: number, fill: string, blur: number): void {
  g.save();
  g.translate(x, y);
  g.scale(-1, 1);
  g.font = FONT(size);
  g.textAlign = "center";
  g.textBaseline = "top";
  g.fillStyle = fill;
  g.shadowColor = "rgba(0,255,65,.9)";
  g.shadowBlur = blur;
  g.fillText(ch, 0, 0);
  g.restore();
}

interface Drop {
  y: number;
  v: number;
  len: number;
}

export class Rain {
  private g: CanvasRenderingContext2D | null;
  private e = 0;
  private holdUntil = 0;
  private raf = 0;
  private frozen = false;
  private w = 0;
  private h = 0;
  private cols = 0;
  private rows = 0;
  private grid: string[] = [];
  private drops: Drop[] = [];

  constructor(readonly canvas: HTMLCanvasElement, private readonly box: HTMLElement) {
    this.g = canvas.getContext("2d");
  }

  /** Fits the canvas to its box; returns false while it has no size yet. */
  fit(): boolean {
    const r = this.canvas.getBoundingClientRect();
    if (!r.width || !r.height || !this.g) return false;
    if (Math.abs(r.width - this.w) < 2 && Math.abs(r.height - this.h) < 2) return true;
    const d = devicePixelRatio || 1;
    this.w = r.width;
    this.h = r.height;
    this.canvas.width = Math.round(r.width * d);
    this.canvas.height = Math.round(r.height * d);
    this.g.setTransform(d, 0, 0, d, 0, 0);
    this.cols = Math.ceil(this.w / CELL);
    this.rows = Math.ceil(this.h / CELL);
    this.grid = Array.from({ length: this.cols * this.rows }, pickKana);
    this.drops = Array.from({ length: this.cols }, () => this.drop(true));
    // A still frame of rain already under way, so the card never starts empty.
    for (let k = 0; k < 80; k++) this.tick(16, 1);
    this.draw();
    return true;
  }

  private drop(anywhere: boolean): Drop {
    return { y: anywhere ? Math.random() * this.rows * 1.5 : -Math.random() * this.rows * 0.8, v: 0.55 + Math.random() * 0.8, len: 6 + ((Math.random() * 12) | 0) };
  }

  private tick(dt: number, e: number): void {
    for (const d of this.drops) {
      d.y += (d.v * e * SPEED * dt) / 1000;
      if (d.y - d.len > this.rows) Object.assign(d, this.drop(false));
    }
    for (let n = Math.round(6 * e); n > 0; n--) this.grid[(Math.random() * this.grid.length) | 0] = pickKana();
  }

  private draw(): void {
    const g = this.g;
    if (!g) return;
    const dark = this.box.dataset.irTheme === "dark";
    g.clearRect(0, 0, this.w, this.h);
    for (let i = 0; i < this.cols; i++) {
      const d = this.drops[i], head = Math.floor(d.y);
      for (let k = 0; k < d.len; k++) {
        const row = head - k;
        if (row < 0 || row >= this.rows) continue;
        const a = k === 0 ? Math.min(1, ALPHA * 1.8) : ALPHA * (1 - k / d.len);
        const fill = dark ? (k === 0 ? `rgba(217,255,224,${a})` : `rgba(0,255,65,${a})`) : k === 0 ? `rgba(0,110,28,${a})` : `rgba(0,158,42,${a})`;
        glyphAt(g, this.grid[i * this.rows + row], i * CELL + CELL / 2, row * CELL, CELL, fill, 0);
      }
    }
  }

  private loop(): void {
    if (this.raf || this.frozen || !this.w || reducedMotion()) return;
    let last = performance.now();
    const frame = (now: number) => {
      if (!this.canvas.isConnected || this.frozen) {
        this.raf = 0;
        return;
      }
      const dt = Math.min(50, now - last);
      last = now;
      if (now > this.holdUntil) this.e = IDLE + (this.e - IDLE) * Math.exp(-dt / SETTLE_MS);
      this.tick(dt, this.e);
      this.draw();
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  /** Starts the light loop. */
  start(): void {
    if (this.e < IDLE) this.e = IDLE;
    this.loop();
  }

  /** A burst: up to `level` for `holdMs`, then easing back to the loop. */
  kick(level: number, holdMs = 0): void {
    if (this.frozen) return;
    this.e = Math.max(this.e, level);
    this.holdUntil = performance.now() + holdMs;
    this.loop();
  }

  /** Pours until released (while the model thinks). */
  pour(level: number): void {
    this.frozen = false;
    this.e = level;
    this.holdUntil = Infinity;
    this.loop();
  }

  /** Back to the light loop. */
  release(): void {
    this.frozen = false;
    this.holdUntil = 0;
    this.loop();
  }

  /** Bullet time: stops dead and stays until released. */
  freeze(): void {
    this.frozen = true;
    this.e = 0;
    this.holdUntil = 0;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  /** Restarts the stream in the column at x (canvas pixels): a key was typed there. */
  spawn(x: number): void {
    if (!this.cols) return;
    const i = Math.max(0, Math.min(this.cols - 1, Math.floor(x / CELL)));
    Object.assign(this.drops[i], { y: 0, v: 1.7 });
  }

  stop(): void {
    this.frozen = true;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }
}

/** The band behind the To line: faint still rain, drawn once per size. */
function drawBand(cv: HTMLCanvasElement | null): void {
  if (!cv) return;
  const r = cv.getBoundingClientRect(), key = `${r.width}x${r.height}`;
  if (!r.width || cv.dataset.mxSize === key) return;
  cv.dataset.mxSize = key;
  const d = devicePixelRatio || 1, g = cv.getContext("2d");
  if (!g) return;
  cv.width = Math.round(r.width * d);
  cv.height = Math.round(r.height * d);
  g.setTransform(d, 0, 0, d, 0, 0);
  let seed = 11;
  const rnd = () => ((seed = (Math.imul(seed ^ (seed >>> 15), 2246822507) + 0x6d2b79f5) | 0) >>> 0) / 4294967296;
  for (let x = 0; x < r.width; x += 11) {
    const len = 1 + ((rnd() * 4) | 0), top = ((rnd() * 4) | 0) * 10;
    for (let k = 0; k < len; k++) {
      const head = k === len - 1;
      glyphAt(g, KANA[(rnd() * KANA.length) | 0], x + 5, top + k * 10, 10, head ? "rgba(217,255,224,.55)" : `rgba(0,255,65,${0.12 + k * 0.06})`, head ? 5 : 0);
    }
  }
}

/** Labels decode on hover: each letter scrambles, then locks, left to right. */
export function scramble(el: HTMLElement, ms: number): void {
  if (el.dataset.mxScramble || el.childElementCount || (el as HTMLButtonElement).disabled) return;
  const word = el.textContent ?? "";
  if (!word.trim()) return;
  el.dataset.mxScramble = "1";
  const t0 = performance.now();
  const frame = (now: number) => {
    if ((el as HTMLButtonElement).disabled || !el.isConnected) {
      delete el.dataset.mxScramble;
      return;
    }
    const p = (now - t0) / ms;
    let out = "";
    for (let i = 0; i < word.length; i++) out += i < p * word.length || word[i] === " " ? word[i] : pickLetter();
    el.textContent = out;
    if (p < 1) requestAnimationFrame(frame);
    else {
      el.textContent = word;
      delete el.dataset.mxScramble;
    }
  };
  requestAnimationFrame(frame);
}

/** Refactor's label while the model thinks: letters lock into place one by one, again and again. */
export function trace(el: HTMLElement): () => void {
  const word = el.textContent ?? "";
  let locked = 0, tick = 0, hold = 0;
  const iv = setInterval(() => {
    if (hold > 0) hold--;
    else if (++tick % 3 === 0 && ++locked > word.length) {
      hold = 10;
      locked = 0;
    }
    let out = "";
    for (let i = 0; i < word.length; i++) out += i < locked || hold > 0 || word[i] === " " ? word[i] : LETTERS[(Math.random() * LETTERS.length) | 0];
    el.textContent = out;
  }, 45);
  return () => {
    clearInterval(iv);
    el.textContent = word;
  };
}

interface BoxState {
  rain: Rain;
  wiring: AbortController;
}

const boxes = new WeakMap<HTMLElement, BoxState>();

/** The rain of a box, for the swoosh. */
export const rainOf = (box: HTMLElement): Rain | undefined => boxes.get(box)?.rain;

/** Hooks typing and hover once per element; Gmail and gmail.ts add some of them after the box is dressed. */
function wire(box: HTMLElement, { rain, wiring }: BoxState): void {
  const once = (el: Element | null, type: string, fn: (e: Event) => void) => {
    if (!(el instanceof HTMLElement) || el.dataset.mxWired === type) return;
    el.dataset.mxWired = type;
    el.addEventListener(type, fn, { signal: wiring.signal });
    wiring.signal.addEventListener("abort", () => delete el.dataset.mxWired);
  };
  // Typing restarts the stream above the caret and gives the rain a short burst.
  once(box.querySelector('[contenteditable="true"][role="textbox"]'), "input", () => {
    const sel = getSelection(), at = sel && sel.rangeCount ? sel.getRangeAt(0).getBoundingClientRect() : null;
    if (at && at.left) rain.spawn(at.left - rain.canvas.getBoundingClientRect().left);
    rain.kick(1, 350);
  });
  once(box.querySelector(".ir-refactor"), "mouseenter", (e) => scramble(e.currentTarget as HTMLElement, 320));
  once(box.querySelector(".dC .aoO"), "mouseenter", (e) => scramble(e.currentTarget as HTMLElement, 260));
}

export const ornament: Ornament = {
  place(box) {
    const skin = box.querySelector<HTMLElement>(":scope > .ir-skin");
    const canvas = skin?.querySelector<HTMLCanvasElement>(".ir-mx-rain > canvas");
    if (!skin || !canvas) return;
    let state = boxes.get(box);
    if (state && state.rain.canvas !== canvas) {
      state.rain.stop();
      state.wiring.abort();
      state = undefined;
    }
    if (!state) {
      state = { rain: new Rain(canvas, box), wiring: new AbortController() };
      boxes.set(box, state);
      const rain = state.rain;
      requestAnimationFrame(() => {
        if (!rain.fit()) return;
        rain.start();
        rain.kick(1.2, 600); // wake up: a short pour that eases into the loop
      });
    } else if (state.rain.fit()) state.rain.start();
    wire(box, state);
    drawBand(skin.querySelector<HTMLCanvasElement>(".ir-mx-band > canvas"));
  },
  clear(box) {
    const state = boxes.get(box);
    if (!state) return;
    state.rain.stop();
    state.wiring.abort();
    boxes.delete(box);
  },
};
