import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { THEMES } from "../src/content/themes";

// Mockups are how a theme is designed and approved (docs/THEMES.md, "Mockups"). Every registered theme
// keeps a kit mockup, and every option in a kit mockup designs every element a theme must design:
// the kit's REQUIRED list, the same list its coverage panel shows (Send, every toolbar icon, Discard...).

const repo = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const kitJs = readFileSync(join(repo, "docs/design/kit/mockup-kit.js"), "utf8");
const REQUIRED: [string, string][] = JSON.parse(kitJs.match(/\/\*REQUIRED\*\/([\s\S]*?)\/\*END\*\//)![1]);

const strip = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const usesKit = (html: string) => html.includes("../kit/mockup-kit.js");

/** Each option of a kit mockup with its CSS (its own <style> block plus the shared ones). */
function optionsOf(html: string): { id: string; css: string }[] {
  const block = (id: string) => html.match(new RegExp(`<style id="${id}"[^>]*>([\\s\\S]*?)</style>`))?.[1] ?? "";
  const shared = [...html.matchAll(/<style data-mk-shared[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n");
  const start = html.slice(html.indexOf("MockupKit.start("));
  const ids = [...start.matchAll(/style:\s*"([^"]+)"/g)].map((m) => m[1]);
  return ids.map((id) => ({ id, css: strip(shared + "\n" + block(id)) }));
}

function missingIn(css: string): string[] {
  return REQUIRED.filter(([, pattern]) => !new RegExp(pattern).test(css)).map(([label]) => label);
}

describe("mockup kit", () => {
  it("lists what every theme must design, including Send and every toolbar icon", () => {
    const labels = REQUIRED.map(([label]) => label);
    for (const must of ["Send", "Send hover", "Send press", "Schedule arrow", "Discard", "Formatting bar", "Icon hover"]) expect(labels).toContain(must);
    for (const icon of ["formatting", "attach", "link", "emoji", "Drive", "photo", "signature", "meeting", "more"]) expect(labels).toContain(`Icon: ${icon}`);
  });

  it("has a starter whose every option designs every element", () => {
    const html = readFileSync(join(repo, "docs/design/kit/starter.html"), "utf8");
    const options = optionsOf(html);
    expect(options.length).toBeGreaterThan(0);
    for (const o of options) expect(missingIn(o.css), `starter option ${o.id}`).toEqual([]);
  });
});

describe.each(THEMES.map((t) => [t.meta.id] as const))("theme %s mockup", (id) => {
  const md = readFileSync(join(repo, "apps/extension/src/content/themes", id, "DESIGN.md"), "utf8");
  const files = [...(md.match(/^Mockup: (.+)$/m)?.[1] ?? "").matchAll(/docs\/design\/[\w./-]+\.html/g)].map((m) => m[0]);
  const kitMockups = files.filter((f) => existsSync(join(repo, f)) && usesKit(readFileSync(join(repo, f), "utf8")));

  it("is drawn with the mockup kit", () => {
    expect(kitMockups, `DESIGN.md names a kit mockup (Mockup: ${files.join(", ")})`).not.toEqual([]);
  });

  it("designs every element in every option, Send and the toolbar icons included", () => {
    for (const file of kitMockups) {
      for (const o of optionsOf(readFileSync(join(repo, file), "utf8"))) expect(missingIn(o.css), `${file} option ${o.id}`).toEqual([]);
    }
  });
});
