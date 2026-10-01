import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NEW_MARK_INTRO, asNewMark, countShown, showsNew } from "../src/appearance";
import { CSS_SLOTS, PLAIN_PATTERN, type SwooshContext, type ThemePack } from "../src/content/theme/contract";
import { playSwoosh, startThinking } from "../src/content/theme/run";
import { buildStylesheet } from "../src/content/theme/stylesheet";
import { THEMES } from "../src/content/themes";
import { THEME_LIST } from "../src/theme-list";

// The theme contract, checked for every theme pack. A new theme must pass all of this before it ships;
// see docs/THEMES.md.

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const themeDir = (id: string) => join(root, "src/content/themes", id);
const templatePath = join(root, "../../docs/themes/DESIGN_TEMPLATE.md");
const url = (file: string) => `chrome-extension://test/fonts/${file}`;
const isPlain = (css: string) => PLAIN_PATTERN.test(css.trim());

// --- DESIGN.md --------------------------------------------------------------------------------------

const SWOOSH_PHASES = ["Before", "During", "After", "New mark"];
const TOP_SECTIONS = ["Idea", "Variants", "Fonts and colours", "Slots", "Swoosh", "Rules check"];

/** The text under a heading, up to the next heading of the same or a higher level. */
function section(md: string, heading: RegExp): string | null {
  const lines = md.split("\n");
  const start = lines.findIndex((l) => heading.test(l));
  if (start < 0) return null;
  const level = lines[start].match(/^#+/)![0].length;
  const end = lines.findIndex((l, i) => i > start && /^#+ /.test(l) && l.match(/^#+/)![0].length <= level);
  return lines.slice(start + 1, end < 0 ? undefined : end).join("\n").trim();
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const slotHeading = (slot: string) => new RegExp(`^### .+ \\(\`${slot}\`\\)\\s*$`);
const phaseHeading = (phase: string) => new RegExp(`^### ${escape(phase)}\\s*$`);

/** Filled means real words, not a placeholder. */
function filled(text: string | null): boolean {
  return !!text && text.replace(/\s+/g, " ").length >= 20 && !/\b(TODO|TBD)\b|<fill|\.\.\.$/i.test(text);
}

describe("design template", () => {
  const template = readFileSync(templatePath, "utf8");
  it("has a section for every slot and swoosh phase", () => {
    for (const s of TOP_SECTIONS) expect(section(template, new RegExp(`^## ${s}\\s*$`)), s).not.toBeNull();
    for (const slot of CSS_SLOTS) expect(section(template, slotHeading(slot)), slot).not.toBeNull();
    for (const phase of SWOOSH_PHASES) expect(section(template, phaseHeading(phase)), phase).not.toBeNull();
  });
});

describe.each(THEMES.map((t) => [t.meta.id, t] as const))("theme %s", (id, pack) => {
  const designPath = join(themeDir(id), "DESIGN.md");

  describe("DESIGN.md", () => {
    const md = existsSync(designPath) ? readFileSync(designPath, "utf8") : "";

    it("exists and was approved by the user", () => {
      expect(md, `missing ${designPath}`).not.toBe("");
      expect(md).toMatch(/^Status: approved \d{4}-\d{2}-\d{2}$/m);
    });

    it("names a mockup that exists", () => {
      const line = md.match(/^Mockup: (.+)$/m)?.[1] ?? "";
      const files = [...line.matchAll(/docs\/design\/[\w./-]+\.html/g)].map((m) => m[0]);
      expect(files.length, "a Mockup: line naming docs/design/... files").toBeGreaterThan(0);
      for (const file of files) expect(existsSync(join(root, "../..", file)), file).toBe(true);
    });

    it("fills every top section", () => {
      for (const s of TOP_SECTIONS) expect(filled(section(md, new RegExp(`^## ${s}\\s*$`))), `## ${s}`).toBe(true);
    });

    it("designs every slot", () => {
      for (const slot of CSS_SLOTS) expect(filled(section(md, slotHeading(slot))), `### ... (\`${slot}\`)`).toBe(true);
    });

    it("names its colour roles", () => {
      const colours = section(md, /^## Fonts and colours\s*$/) ?? "";
      for (const role of ["edge", "accent", "strong", "onStrong"]) expect(colours, role).toMatch(new RegExp(`\\b${role}\\b`));
    });

    it("designs every cursor", () => {
      const cursors = section(md, slotHeading("cursor")) ?? "";
      for (const kind of ["Arrow", "Hand", "Text cursor"]) expect(filled(cursors.match(new RegExp(`^- ${kind}: (.+)$`, "m"))?.[1] ?? null), kind).toBe(true);
    });

    it("designs every swoosh phase", () => {
      for (const phase of SWOOSH_PHASES) expect(filled(section(md, phaseHeading(phase))), `### ${phase}`).toBe(true);
    });

    it("names every variant", () => {
      const variants = section(md, /^## Variants\s*$/) ?? "";
      for (const v of pack.meta.variants) expect(variants, v).toContain(`\`${v}\``);
    });

    it("ticks every rule", () => {
      const rules = section(md, /^## Rules check\s*$/) ?? "";
      expect(rules).toMatch(/- \[x\]/);
      expect(rules).not.toMatch(/- \[ \]/);
    });
  });

  describe("pack", () => {
    it("fills every slot, or leaves it plain with a reason", () => {
      for (const slot of CSS_SLOTS) {
        const css = pack.css[slot];
        expect(css.trim(), slot).not.toBe("");
        if (!isPlain(css)) expect(css.replace(/\/\*[\s\S]*?\*\//g, "").trim(), `${slot} has only comments; use plain()`).not.toBe("");
      }
    });

    it("scopes its window design to the window layout", () => {
      const css = pack.css.window;
      if (!isPlain(css)) expect(css).toContain('[data-ir-layout="window"]');
      // Card rules that recolour the To line would paint over a window's form fields.
      for (const slot of ["head", "card"] as const) {
        expect(pack.css[slot], `${slot} recolours [data-ir-head] in every layout`).not.toMatch(/\.ir-active-box \[data-ir-head\]/);
      }
    });

    it("designs both To line styles: the optional band and the rule", () => {
      // Every rule that recolours the To line applies only while the band is on (popup, off by default).
      for (const slot of CSS_SLOTS) {
        for (const line of pack.css[slot].split("\n").filter((l) => l.includes("[data-ir-head]"))) {
          expect(line, `${slot}: ${line.slice(0, 80)}`).toContain('[data-ir-head-style="band"]');
        }
      }
      // The rule between the To line and the body is the default, and always used in a window.
      if (!isPlain(pack.css.head)) expect(pack.css.head).toContain('[data-ir-head-style="rule"]');
    });

    it("has labels and a skin", () => {
      expect(pack.labels.refactor.trim()).not.toBe("");
      expect(pack.labels.working.trim()).not.toBe("");
      expect(pack.skin.trim()).not.toBe("");
    });

    it("only picks variants it ships, at every hour of the year", () => {
      expect(pack.meta.variants.length).toBeGreaterThan(0);
      for (let h = 0; h < 24 * 365; h += 7) {
        expect(pack.meta.variants).toContain(pack.pickVariant(new Date(Date.UTC(2026, 0, 1) + h * 3600_000)));
      }
    });

    it("fills the colour roles so strong colours read on white and dark", () => {
      for (const v of pack.meta.variants) {
        const r = pack.roles(v);
        for (const [role, hex] of Object.entries(r)) expect(hex, `${v} ${role}`).toMatch(/^#[0-9a-f]{6}$/i);
        expect(contrast(r.strong, "#ffffff"), `${v} strong on white`).toBeGreaterThanOrEqual(3);
        expect(contrast(r.strong, "#202124"), `${v} strong on dark`).toBeGreaterThanOrEqual(3);
        expect(contrast(r.onStrong, r.strong), `${v} text on strong`).toBeGreaterThanOrEqual(3);
      }
    });

    it("styles every variant", () => {
      for (const v of pack.meta.variants) expect(pack.variantCss(v).trim(), v).not.toBe("");
      if (pack.meta.variants.length > 1) {
        for (const v of pack.meta.variants) expect(pack.variantCss(v), v).toContain(`[data-ir-variant="${v}"]`);
      }
    });

    it("bundles its fonts and uses them", () => {
      // Used in the stylesheet, or on a canvas in the theme's code.
      const code = readdirSync(themeDir(id)).filter((f) => f.endsWith(".ts")).map((f) => readFileSync(join(themeDir(id), f), "utf8")).join("\n");
      const sheet = buildStylesheet(pack, url);
      for (const font of pack.fonts) {
        expect(existsSync(join(root, "public/fonts", font.file)), font.file).toBe(true);
        const used = sheet.split(`"${font.family}"`).length > 2 || code.split(`"${font.family}"`).length > 2;
        expect(used, `${font.family} declared but unused`).toBe(true);
      }
    });
  });

  describe("rules every theme keeps", () => {
    const sheet = buildStylesheet(pack, url);

    it("builds a stylesheet with balanced braces", () => {
      const bare = sheet.replace(/\/\*[\s\S]*?\*\//g, "").replace(/"[^"]*"/g, "");
      expect(bare.split("{").length).toBe(bare.split("}").length);
    });

    it("ends with the reduced motion guardrail", () => {
      expect(sheet.lastIndexOf("prefers-reduced-motion: reduce")).toBeGreaterThan(sheet.lastIndexOf("/* --- "));
    });

    it("styles the caret and selection of the writing area", () => {
      const { caret, selection } = pack.css;
      if (!isPlain(caret)) expect(caret).toContain("caret-color");
      if (!isPlain(selection)) expect(selection).toContain("::selection");
    });

    it("designs all three cursors, still and at most 32px", () => {
      const cursor = pack.css.cursor;
      if (isPlain(cursor)) return;
      for (const fallback of ["default", "pointer", "text"]) {
        expect(cursor, `${fallback} cursor`).toMatch(new RegExp(`cursor: url\\("[^"]+"\\) \\d+ \\d+, ${fallback}`));
      }
      expect(cursor).not.toMatch(/animation|@keyframes/);
      const all = cursor + pack.meta.variants.map((v) => pack.variantCss(v)).join("");
      for (const m of all.matchAll(/url\("data:image\/svg\+xml,([^"]+)"\) \d+ \d+, (?:default|pointer|text)/g)) {
        const size = decodeURIComponent(m[1]).match(/<svg[^>]* width="(\d+)" height="(\d+)"/);
        expect(size, "cursor svg needs a width and height").not.toBeNull();
        expect(Math.max(Number(size![1]), Number(size![2]))).toBeLessThanOrEqual(32);
      }
    });

    it("marks comments without red or wavy lines", () => {
      const css = pack.css.comments;
      if (isPlain(css)) return;
      for (const handle of ["::highlight(ir-comment)", ".ir-pin", ".ir-stale", ".ir-note"]) expect(css, handle).toContain(handle);
      const mark = css.slice(css.indexOf("::highlight(ir-comment)"));
      const rule = mark.slice(0, mark.indexOf("}"));
      expect(rule).not.toMatch(/wavy/);
      for (const color of colors(rule)) expect(isRed(color), `${color} reads as a mistake`).toBe(false);
    });

    it("never hides Instant Reply's own controls", () => {
      expect(sheet).not.toMatch(/\.ir-(toggle|refactor)\s*\{[^}]*display:\s*none/);
    });

    it("keeps Discard the last button (never reorders the toolbar)", () => {
      expect(sheet).not.toMatch(/\border:\s*-?\d/);
      expect(sheet).not.toMatch(/flex-direction:\s*row-reverse/);
    });
  });
});

describe("theme list", () => {
  it("offers the same themes, in the same order, as the content script", () => {
    expect(THEME_LIST.map((m) => m.id)).toEqual(THEMES.map((t) => t.meta.id));
    for (const pack of THEMES) expect(THEME_LIST.find((m) => m.id === pack.meta.id)).toBe(pack.meta);
  });

  it("has unique ids", () => {
    expect(new Set(THEMES.map((t) => t.meta.id)).size).toBe(THEMES.length);
  });
});

// --- colour helpers ---------------------------------------------------------------------------------

function colors(css: string): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (const m of css.matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)) {
    const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join("") : m[1];
    out.push([0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number]);
  }
  for (const m of css.matchAll(/rgba?\(([^)]+)\)/g)) out.push(m[1].split(",").slice(0, 3).map(Number) as [number, number, number]);
  return out;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colours. */
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function isRed([r, g, b]: [number, number, number]): boolean {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max === 0 || (max - min) / max < 0.35) return false;
  let hue = max === r ? ((g - b) / (max - min)) * 60 : max === g ? (2 + (b - r) / (max - min)) * 60 : (4 + (r - g) / (max - min)) * 60;
  if (hue < 0) hue += 360;
  return hue < 20 || hue > 340;
}

// --- the swoosh runner ------------------------------------------------------------------------------

describe("swoosh runner", () => {
  let reduce = false;
  beforeEach(() => {
    reduce = false;
    vi.stubGlobal("matchMedia", () => ({ matches: reduce }));
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  const ctx = { host: {}, editor: {}, variant: "v", showNew: true } as unknown as SwooshContext;
  const packWith = (swoosh: Partial<ThemePack["swoosh"]>): ThemePack =>
    ({ swoosh: { before: () => () => {}, during: async (_c: SwooshContext, w: () => void) => w(), after: () => {}, ...swoosh } }) as unknown as ThemePack;

  it("writes once even if during writes twice", async () => {
    const write = vi.fn();
    await playSwoosh(packWith({ during: async (_c, w) => (w(), w()) }), ctx, write);
    expect(write).toHaveBeenCalledTimes(1);
  });

  it("writes even if during forgets to", async () => {
    const write = vi.fn();
    await playSwoosh(packWith({ during: async () => undefined }), ctx, write);
    expect(write).toHaveBeenCalledTimes(1);
  });

  it("writes even if during or after throws", async () => {
    const write = vi.fn();
    await playSwoosh(packWith({ during: async () => { throw new Error("boom"); } }), ctx, write);
    await playSwoosh(packWith({ after: () => { throw new Error("boom"); } }), ctx, write);
    expect(write).toHaveBeenCalledTimes(2);
  });

  it("passes during's state to after", async () => {
    const after = vi.fn();
    await playSwoosh(packWith({ during: async (_c, w) => (w(), "state") as unknown as void, after }), ctx, () => {});
    expect(after).toHaveBeenCalledWith(ctx, "state");
  });

  it("skips every phase under reduced motion", async () => {
    reduce = true;
    const before = vi.fn(), during = vi.fn(), after = vi.fn(), write = vi.fn();
    const pack = packWith({ before, during, after });
    startThinking(pack, ctx)();
    await playSwoosh(pack, ctx, write);
    expect([before, during, after].map((f) => f.mock.calls.length)).toEqual([0, 0, 0]);
    expect(write).toHaveBeenCalledTimes(1);
  });

  it("survives a before that throws", () => {
    const stop = startThinking(packWith({ before: () => { throw new Error("boom"); } }), ctx);
    expect(() => stop()).not.toThrow();
  });
});

// --- the New mark -----------------------------------------------------------------------------------

describe("New mark", () => {
  it(`shows on the first ${NEW_MARK_INTRO} Refactors, then only when turned on`, () => {
    let mark = asNewMark(undefined);
    const seen: boolean[] = [];
    for (let i = 0; i < 6; i++) {
      seen.push(showsNew(mark));
      if (showsNew(mark)) mark = countShown(mark);
    }
    expect(seen).toEqual([true, true, true, false, false, false]);
    expect(showsNew({ ...mark, always: true })).toBe(true);
  });

  it("reads bad storage as a fresh start", () => {
    expect(asNewMark({ shown: "x", always: "yes" })).toEqual({ shown: 0, always: false });
    expect(asNewMark({ shown: -4 })).toEqual({ shown: 0, always: false });
  });
});
