import type { SwooshContext } from "../../theme/contract";
import { areaOf, ghostOf, place } from "../../theme/shared";

// Liquid (DESIGN.md, "Swoosh"). A copy of the text over the writing area, on paper, is pushed through an
// SVG turbulence filter. Before: it wavers like heat haze. During: it melts (the displacement grows while
// the words fade), the draft is written underneath, and a copy of the draft condenses out of the
// ripples. The editor itself is never filtered.

const HAZE_PX = 3, HAZE_MS = 1900, MELT_PX = 70, MELT_MS = 550, FORM_MS = 750, NEW_MS = 2800;

interface Liquid {
  filter: SVGSVGElement;
  map: SVGFEDisplacementMapElement;
  copy: HTMLElement | null;
}

let count = 0;

function makeLiquid(host: HTMLElement): Liquid {
  const id = `ir-u-liquid-${++count}`;
  const filter = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  filter.setAttribute("class", "ir-u-filter");
  filter.setAttribute("aria-hidden", "true");
  filter.innerHTML = `<filter id="${id}" x="-5%" y="-10%" width="110%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.015 0.09" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="0" xChannelSelector="R" yChannelSelector="G"/></filter>`;
  host.append(filter);
  return { filter, map: filter.querySelector("feDisplacementMap")!, copy: null };
}

/** A copy of the editor's text on paper, its words in a wrapper so they can fade on their own. */
function copyText(host: HTMLElement, editor: HTMLElement, liquid: Liquid): HTMLElement {
  const copy = ghostOf(editor, "ir-u-liquid");
  copy.innerHTML = `<div>${copy.innerHTML}</div>`;
  copy.style.filter = `url(#${liquid.filter.querySelector("filter")!.id})`;
  place(copy, areaOf(host, editor));
  host.append(copy);
  return copy;
}

const words = (copy: HTMLElement) => copy.firstElementChild as HTMLElement;
const scale = (l: Liquid, px: number) => l.map.setAttribute("scale", px.toFixed(2));
const easeOut = (k: number) => 1 - Math.pow(1 - k, 3);

function tween(ms: number, step: (k: number) => void): Promise<void> {
  return new Promise((done) => {
    const t0 = performance.now();
    const frame = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      step(k);
      if (k < 1) requestAnimationFrame(frame);
      else done();
    };
    requestAnimationFrame(frame);
  });
}

function remove(l: Liquid): void {
  l.copy?.remove();
  l.filter.remove();
}

// The haze hands over to the melt: gmail.ts stops the thinking loop and starts "during" in the same
// tick, so the haze's copy is kept for one task and taken over; if no "during" comes (the model failed),
// it is removed.
const pending = new WeakMap<HTMLElement, Liquid>();

export function haze({ host, editor }: SwooshContext): () => void {
  const liquid = makeLiquid(host);
  liquid.copy = copyText(host, editor, liquid);
  let alive = true;
  const loop = (t: number) => {
    if (!alive) return;
    scale(liquid, (HAZE_PX / 2) * (1 + Math.sin((t / HAZE_MS) * Math.PI * 2)));
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  return () => {
    if (!alive) return;
    alive = false;
    pending.set(host, liquid);
    setTimeout(() => {
      if (pending.get(host) !== liquid) return;
      pending.delete(host);
      remove(liquid);
    }, 0);
  };
}

export async function melt({ host, editor }: SwooshContext, write: () => void): Promise<void> {
  const handed = pending.get(host);
  pending.delete(host);
  const liquid = handed ?? makeLiquid(host);
  try {
    if (!liquid.copy) liquid.copy = copyText(host, editor, liquid);
    const from = Number(liquid.map.getAttribute("scale")) || 0;
    const old = liquid.copy;
    await tween(MELT_MS, (k) => {
      scale(liquid, from + k * k * MELT_PX);
      words(old).style.opacity = String(1 - k);
    });
    write();
    old.remove();
    const fresh = (liquid.copy = copyText(host, editor, liquid));
    words(fresh).style.opacity = "0";
    await tween(FORM_MS, (k) => {
      scale(liquid, (from + MELT_PX) * (1 - easeOut(k)));
      words(fresh).style.opacity = String(easeOut(k));
    });
  } finally {
    remove(liquid);
  }
}

/** The "New" chip at the top right of the writing area. */
export function newChip({ host, editor, showNew }: SwooshContext): void {
  if (!showNew) return;
  const layer = document.createElement("div");
  layer.className = "ir-u-new-layer";
  layer.setAttribute("aria-hidden", "true");
  layer.innerHTML = '<span class="ir-u-new">New</span>';
  place(layer, areaOf(host, editor));
  host.append(layer);
  layer
    .animate([{ opacity: 0, transform: "translateY(-3px)" }, { opacity: 1, transform: "none", offset: 0.06 }, { opacity: 1, offset: 0.89 }, { opacity: 0 }], { duration: NEW_MS })
    .finished.finally(() => layer.remove());
}
