// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { boxLayout, ensureSkin, layoutSkin, themeOf } from "../src/content/theme/layout";
import { buildStylesheet } from "../src/content/theme/stylesheet";
import { THEMES } from "../src/content/themes";

// The shared layout code that fits a theme to Gmail's reply boxes: inline in a thread (card) or in a
// Gmail window (a new email, or a reply popped out).

function build(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.querySelector<HTMLElement>("div.aoI")!;
}

describe("boxLayout", () => {
  it("is a card inline in a thread", () => {
    expect(boxLayout(build('<div class="nH"><div class="aoI"></div></div>'))).toBe("card");
  });

  it("is a window inside a Gmail dialog (new email or popped out reply)", () => {
    expect(boxLayout(build('<div role="dialog"><div><div class="aoI"></div></div></div>'))).toBe("window");
  });
});

describe("themeOf", () => {
  it("reads the first real background at or above the element", () => {
    const box = build('<div role="dialog" style="background-color: rgb(44, 44, 44)"><div class="aoI"></div></div>');
    expect(themeOf(box)).toEqual({ theme: "dark", paper: "rgb(44, 44, 44)" });
  });

  it("falls back to light paper when nothing has a background", () => {
    expect(themeOf(build('<div class="aoI"></div>'))).toEqual({ theme: "light", paper: "#fff" });
  });
});

describe("ensureSkin and layoutSkin", () => {
  it("creates the skin once from the theme's markup", () => {
    const box = build('<div class="aoI"><div data-ir-card></div></div>');
    const a = ensureSkin(box, "<i></i><b></b>");
    const b = ensureSkin(box, "<p>ignored</p>");
    expect(a).toBe(b);
    expect(box.querySelectorAll(":scope > .ir-skin")).toHaveLength(1);
    expect(a.innerHTML).toBe("<i></i><b></b>");
    expect(a.getAttribute("aria-hidden")).toBe("true");
  });

  it("sizes the skin to the card and sets the head height", () => {
    const box = build('<div class="aoI"><div data-ir-card><div class="head">To</div><table class="iN"></table></div></div>');
    const card = box.querySelector<HTMLElement>("[data-ir-card]")!;
    const head = card.querySelector<HTMLElement>(".head")!;
    const body = card.querySelector<HTMLElement>("table.iN")!;
    const rect = (x: number, y: number, w: number, h: number) => () => ({ left: x, top: y, right: x + w, bottom: y + h, width: w, height: h, x, y, toJSON() {} }) as DOMRect;
    box.getBoundingClientRect = rect(0, 0, 700, 400);
    card.getBoundingClientRect = rect(52, 10, 600, 380);
    head.getBoundingClientRect = rect(52, 10, 600, 40);
    body.getBoundingClientRect = rect(52, 50, 600, 200);
    const skin = ensureSkin(box, "");
    layoutSkin(box, card, skin);
    expect([skin.style.left, skin.style.top, skin.style.width, skin.style.height]).toEqual(["52px", "10px", "600px", "380px"]);
    expect(skin.style.getPropertyValue("--ir-head")).toBe("40px");
    expect(head.hasAttribute("data-ir-head")).toBe(true);
    expect(body.hasAttribute("data-ir-head")).toBe(false);
  });
});

describe("stylesheet in a window", () => {
  it.each(THEMES.map((t) => [t.meta.id, t] as const))("%s keeps its skin inside Gmail's window", (_id, pack) => {
    expect(buildStylesheet(pack, (f) => f)).toContain('.ir-active-box[data-ir-layout="window"] > .ir-skin { overflow: hidden; }');
  });
});
