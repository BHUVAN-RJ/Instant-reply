import type { SwooshContext } from "../../theme/contract";
import { areaOf, ghostOf, place, sizeCanvas } from "../../theme/shared";
import { CODE_LIGHT, PH, pickKana, pickMixed } from "./palette";
import { glyphAt, rainOf, trace } from "./rain";

// The Matrix swoosh (DESIGN.md, "Swoosh"). Before: the card's rain pours and a long read head traces the
// old text, each letter turning to code as it passes, while Refactor's label traces. During: bullet time
// (the rain stops dead), the old text turns green and falls apart as code, streams of code run down the
// writing area and the draft decodes where they pass, the "New" mark with it. After: the rain goes back to
// its light loop.

const READ_CPS = 36; // letters a second the read head moves
const HOT_TAIL = 8; // letters behind the head that are still code
const HEAD_LETTERS = 10; // length of the read head's line, in letters
const SEEN_MS = 260; // the old text holds green before it falls
const COL = 14; // px per falling stream
const FALL_MS = 750; // a stream's time across the writing area (give or take)
const LOCK_MS = 700; // a letter jumbles this long (to twice it) before it locks
const REGLITCH = 0.35; // share of letters that glitch once more after locking
const NEW_AT = 420; // ms into During when the "New" mark starts decoding
const NEW_HOLD = 1500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const frame = () => new Promise((r) => requestAnimationFrame(r));
const codeColour = (host: HTMLElement) => getComputedStyle(host).getPropertyValue("--mx-code").trim() || CODE_LIGHT;

/** A copy of the editor's text on paper over the writing area, every letter in its own fixed box. */
function copyLetters(host: HTMLElement, editor: HTMLElement, className: string): { copy: HTMLElement; letters: HTMLElement[] } {
  const copy = ghostOf(editor, `mx-ghost ${className}`);
  place(copy, areaOf(host, editor));
  host.append(copy);
  const walker = document.createTreeWalker(copy, NodeFilter.SHOW_TEXT), nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  for (const n of nodes) {
    const frag = document.createDocumentFragment();
    for (const part of n.data.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) {
        frag.append(part);
        continue;
      }
      const word = document.createElement("span");
      word.className = "mx-w";
      for (const ch of part) {
        const c = document.createElement("span");
        c.className = "mx-c";
        c.dataset.ch = c.textContent = ch;
        word.append(c);
      }
      frag.append(word);
    }
    n.replaceWith(frag);
  }
  const letters = [...copy.querySelectorAll<HTMLElement>(".mx-c")];
  const widths = letters.map((c) => c.getBoundingClientRect().width);
  letters.forEach((c, i) => (c.style.width = `${widths[i]}px`));
  return { copy, letters };
}

const flip = (c: HTMLElement) => {
  c.textContent = pickKana();
  c.classList.add("hot");
};
const unflip = (c: HTMLElement) => {
  c.textContent = c.dataset.ch ?? "";
  c.classList.remove("hot");
};

export function before({ host, editor }: SwooshContext): () => void {
  const rain = rainOf(host);
  rain?.pour(1.5);
  host.classList.add("mx-thinking");
  const button = host.querySelector<HTMLElement>(".ir-refactor");
  const stopTrace = button ? trace(button) : () => {};
  const { copy, letters } = copyLetters(host, editor, "mx-old");
  const head = document.createElement("i");
  head.className = "mx-readhead";
  copy.append(head);
  const hot: { c: HTMLElement; until: number }[] = [];
  let i = 0, pause = 0;
  const iv = setInterval(() => {
    if (pause > 0) return void pause--;
    while (hot.length && hot[0].until <= i) unflip(hot.shift()!.c);
    if (i < letters.length) {
      const c = letters[i], cr = copy.getBoundingClientRect(), r = c.getBoundingClientRect();
      flip(c);
      hot.push({ c, until: i + HOT_TAIL });
      const from = Math.max(0, r.right - cr.left - r.width * HEAD_LETTERS);
      Object.assign(head.style, { left: `${from}px`, top: `${r.bottom - cr.top}px`, width: `${r.right - cr.left - from}px` });
    }
    if (++i >= letters.length + 6) {
      i = 0;
      pause = 14;
    }
  }, 1000 / READ_CPS);
  return () => {
    clearInterval(iv);
    stopTrace();
    copy.remove();
    host.classList.remove("mx-thinking");
    rain?.release();
  };
}

interface Decoding {
  c: HTMLElement;
  x: number;
  y: number;
  rev: number;
  lock: number;
  re: number;
}

/** Starts a letter decoding at time t. */
function reveal(d: Decoding, t: number): void {
  if (d.rev >= 0) return;
  d.rev = t;
  d.lock = t + LOCK_MS * (0.8 + Math.random());
  d.re = Math.random() < REGLITCH ? d.lock + 80 + Math.random() * 420 : -1;
  d.c.classList.add("on");
}

/** Advances a decoding letter; true once it is locked for good. */
function step(d: Decoding, t: number): boolean {
  if (d.rev < 0) return false;
  if (t < d.lock) {
    if (Math.random() < 0.6) d.c.textContent = pickMixed();
    return false;
  }
  if (d.re > 0 && t >= d.re && t < d.re + 130) {
    d.c.classList.remove("locked");
    if (Math.random() < 0.6) d.c.textContent = pickMixed();
    return false;
  }
  if (!d.c.classList.contains("locked")) {
    d.c.textContent = d.c.dataset.ch ?? "";
    d.c.classList.add("locked");
  }
  return !(d.re > 0 && t < d.re + 130);
}

/** The "New" mark: decodes in with the code, holds, fades. Returns a step for the swoosh's loop. */
function newMark(host: HTMLElement, editor: HTMLElement): (t: number) => boolean {
  const layer = document.createElement("div");
  layer.className = "mx-newlayer";
  layer.setAttribute("aria-hidden", "true");
  place(layer, areaOf(host, editor));
  const plate = document.createElement("div");
  plate.className = "mx-plate";
  const letters = [..."New"].map((ch) => {
    const s = document.createElement("span");
    s.className = "nc";
    s.dataset.ch = ch;
    s.textContent = pickKana();
    return s;
  });
  plate.append(...letters);
  layer.append(plate);
  host.append(layer);
  const lock = letters.map((_, i) => NEW_AT + 200 * (0.7 + i + Math.random() * 0.3));
  let done = false;
  return (t) => {
    if (t < NEW_AT) return true;
    plate.classList.add("show");
    letters.forEach((s, i) => {
      if (t < lock[i]) {
        if (Math.random() < 0.35) s.textContent = pickKana();
        s.className = "nc on";
      } else if (s.className !== "nc locked") {
        s.textContent = s.dataset.ch ?? "";
        s.className = "nc locked";
      }
    });
    if (!done && t >= Math.max(...lock)) {
      done = true;
      setTimeout(() => {
        plate.classList.add("gone");
        setTimeout(() => layer.remove(), 600);
      }, NEW_HOLD);
    }
    return !done;
  };
}

export async function during({ host, editor, showNew }: SwooshContext, write: () => void): Promise<void> {
  rainOf(host)?.freeze();
  const old = copyLetters(host, editor, "mx-old");
  write();
  await frame();
  old.copy.classList.add("mx-seen");
  await sleep(SEEN_MS);

  const origin = old.copy.getBoundingClientRect(), font = getComputedStyle(editor).font, code = codeColour(host);
  const parts = old.letters.map((c) => {
    const r = c.getBoundingClientRect();
    return { x: r.left - origin.left + r.width / 2, y: r.top - origin.top, ch: c.dataset.ch ?? "", d: ((r.left - origin.left) / origin.width) * 240 + Math.random() * 260,
      vx: (Math.random() - 0.5) * 30, vy: -Math.random() * 80, g: pickKana(), t: 0 };
  });
  const fresh = copyLetters(host, editor, "mx-dec");
  old.copy.remove();
  const canvas = document.createElement("canvas");
  canvas.className = "mx-fx";
  canvas.setAttribute("aria-hidden", "true");
  const area = areaOf(host, editor);
  place(canvas, area);
  host.append(canvas);
  const g = sizeCanvas(canvas, area.width, area.height), W = area.width, H = area.height;
  const dr = fresh.copy.getBoundingClientRect();
  const chars: Decoding[] = fresh.letters.map((c) => {
    const r = c.getBoundingClientRect();
    return { c, x: r.left - dr.left + r.width / 2, y: Math.min(H, r.bottom - dr.top), rev: -1, lock: 0, re: -1 };
  });
  const cols: { x: number; delay: number; fall: number; glyphs: string[]; next: number; head: number }[] = [];
  for (let x = 0; x < W; x += COL) cols.push({ x, delay: 260 + Math.random() * 380, fall: FALL_MS * (0.8 + Math.random() * 0.45), glyphs: Array.from({ length: 14 }, pickKana), next: 0, head: -1 });
  const mark = showNew ? newMark(host, editor) : null;

  try {
    await new Promise<void>((done) => {
      const t0 = performance.now();
      const draw = (now: number) => {
        const t = now - t0;
        g.clearRect(0, 0, W, H);
        // The old text falling apart as code
        let busy = false;
        for (const p of parts) {
          if (t < p.d) {
            g.font = font;
            g.fillStyle = code;
            g.textAlign = "center";
            g.textBaseline = "top";
            g.fillText(p.ch, p.x, p.y);
            busy = true;
            continue;
          }
          const a = (t - p.d) / 1000;
          if (a > 0.9) continue;
          busy = true;
          if (now > p.t) {
            p.g = pickKana();
            p.t = now + 70;
          }
          g.globalAlpha = 1 - a / 0.9;
          glyphAt(g, p.g, p.x + p.vx * a, p.y + p.vy * a + 1400 * a * a, 13, PH, 6);
          g.globalAlpha = 1;
        }
        // Streams of code running down the writing area
        for (const col of cols) {
          const pr = (t - col.delay) / col.fall;
          if (pr < 0) {
            busy = true;
            continue;
          }
          col.head = pr * (H + 220);
          if (col.head - 14 * 15 < H) busy = true;
          if (now > col.next) {
            col.glyphs = Array.from({ length: 14 }, pickKana);
            col.next = now + 60 + Math.random() * 70;
          }
          for (let k = 0; k < 14; k++) {
            const y = col.head - k * 15;
            if (y < -15 || y > H) continue;
            const al = 1 - k / 14;
            glyphAt(g, col.glyphs[k], col.x + COL / 2, y, 13, k === 0 ? "#e6ffe9" : `rgba(0,${Math.round(150 + 105 * al)},${Math.round(45 * al)},${al * 0.85})`, k === 0 ? 9 : 2);
          }
        }
        // The draft decoding where a stream has passed
        for (const d of chars) {
          const col = cols[Math.min(cols.length - 1, Math.floor(d.x / COL))];
          if (col && col.head >= d.y) reveal(d, t);
          if (!step(d, t)) busy = true;
        }
        if (mark && mark(t)) busy = true;
        if (!busy || t > 7000) return done();
        requestAnimationFrame(draw);
      };
      requestAnimationFrame(draw);
    });
    await sleep(120);
  } finally {
    canvas.remove();
    fresh.copy.remove();
  }
}

export function after({ host }: SwooshContext): void {
  rainOf(host)?.release();
}
