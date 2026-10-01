import { SKIN_CLASS } from "./shared";

// Fits a theme's skin to a reply card. Shared by gmail.ts and the design preview, so a theme looks the
// same in both.

export function setIfChanged(el: HTMLElement, prop: string, value: string): void {
  if (el.style.getPropertyValue(prop) !== value) el.style.setProperty(prop, value);
}

/** The box's skin element, created from the theme's markup on first use. */
export function ensureSkin(box: HTMLElement, markup: string): HTMLElement {
  let skin = box.querySelector<HTMLElement>(`:scope > .${SKIN_CLASS}`);
  if (!skin) {
    skin = document.createElement("div");
    skin.className = SKIN_CLASS;
    skin.setAttribute("aria-hidden", "true");
    skin.innerHTML = markup;
    box.prepend(skin);
  }
  return skin;
}

/**
 * Sizes the skin to the card, sets `--ir-head` to the height above the body table, and marks everything
 * in the card above the body as `data-ir-head` (the To line). Writes only on change.
 */
export function layoutSkin(box: HTMLElement, card: HTMLElement, skin: HTMLElement): void {
  const b = box.getBoundingClientRect(), c = card.getBoundingClientRect();
  setIfChanged(skin, "left", `${c.left - b.left}px`);
  setIfChanged(skin, "top", `${c.top - b.top}px`);
  setIfChanged(skin, "width", `${c.width}px`);
  setIfChanged(skin, "height", `${c.height}px`);
  const body = card.querySelector<HTMLElement>("table.iN");
  const bodyTop = body?.getBoundingClientRect().top ?? c.top;
  setIfChanged(skin, "--ir-head", `${Math.max(0, bodyTop - c.top)}px`);
  for (const child of card.children) {
    if (!(child instanceof HTMLElement) || child === body) continue;
    const isHead = child.getBoundingClientRect().bottom <= bodyTop + 1;
    if (isHead !== child.hasAttribute("data-ir-head")) child.toggleAttribute("data-ir-head", isHead);
  }
}

export type BoxLayout = "card" | "window";

/**
 * "window" for a box inside a Gmail window (a new email, or a reply popped out): no rounded card, no
 * avatar next to it, 600px or so wide. "card" for the usual reply inline in a thread.
 */
export function boxLayout(box: HTMLElement): BoxLayout {
  return box.closest('[role="dialog"]') ? "window" : "card";
}

/**
 * Light or dark, from the first real background at or above `el` (a window's box is transparent and
 * shows the window behind it), so edges and icons stay visible.
 */
export function themeOf(el: HTMLElement): { theme: "light" | "dark"; paper: string } {
  for (let node: HTMLElement | null = el; node; node = node.parentElement) {
    const bg = getComputedStyle(node).backgroundColor;
    if (!bg || bg === "transparent") continue;
    const [r = 255, g = 255, b = 255, a = 1] = (bg.match(/[\d.]+/g) ?? []).map(Number);
    if (a === 0) continue;
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return { theme: luminance < 0.4 ? "dark" : "light", paper: bg };
  }
  return { theme: "light", paper: "#fff" };
}
