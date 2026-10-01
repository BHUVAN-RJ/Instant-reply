import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildStylesheet } from "../src/content/theme/stylesheet";
import { THEMES } from "../src/content/themes";

// Writes a theme's shipped look into a mockup kit page (docs/design/<id>/mockup.html), so a change to a
// theme starts from what users see today. The swoosh lives in the theme's code; run it in the preview.
//   npm run mockup:snapshot -- <theme id> [--force]

const [id, flag] = process.argv.slice(2);
const pack = THEMES.find((t) => t.meta.id === id);
if (!pack) {
  console.error(`Unknown theme "${id}". Registered: ${THEMES.map((t) => t.meta.id).join(", ")}`);
  process.exit(1);
}
const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const out = join(root, "docs/design", pack.meta.id, "mockup.html");
if (existsSync(out) && flag !== "--force") {
  console.error(`${out} exists; pass --force to overwrite it.`);
  process.exit(1);
}
const css = buildStylesheet(pack, (file) => `../../../apps/extension/public/fonts/${file}`).replaceAll("</style", "<\\/style");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${pack.meta.name} mockup</title>
<!-- Snapshot of the shipped ${pack.meta.name} theme (npm run mockup:snapshot -- ${pack.meta.id}). To change the theme,
     add an option with your changes next to "current", compare, get approval, then port it to the pack.
     The Refactor animation is the theme's own code: run it in the preview (npm run preview). -->
<link rel="stylesheet" href="../kit/mockup-kit.css">
<style id="theme-current">
${css}
</style>
</head>
<body>
<script src="../kit/mockup-kit.js"></script>
<script>
MockupKit.start({
  title: ${JSON.stringify(pack.meta.name)},
  note: "The shipped look. The swoosh runs in the preview (npm run preview, ?theme=${pack.meta.id}).",
  options: [{ id: "current", label: "Current", style: "theme-current" }],
  variants: ${JSON.stringify(pack.meta.variants)},
  skin: ${JSON.stringify(pack.skin)},
  labels: ${JSON.stringify(pack.labels)},
});
</script>
</body>
</html>
`);
console.log(`Wrote ${out}`);
