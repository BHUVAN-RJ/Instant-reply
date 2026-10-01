import { defineTheme, type Ornament } from "../../theme/contract";
import { washIn, type WaveRun } from "./fx";
import { meta } from "./meta";
import { PALETTES, californiaPalette, type PaletteId } from "./palette";
import { lap } from "./ripple";
import { css, variantCss } from "./styles";

// Beach: made for a friend in California (inspiration from Moana only, no characters, logo or title
// lettering). Design in DESIGN.md next to this file. The variant is the time of day palette.

const palette = (variant: string) => PALETTES[variant as PaletteId] ?? PALETTES.lagoon;

/**
 * The flower crown: its own element in the box, placed from the avatar's real position, since the
 * avatar's wrappers differ in size and offset (and some clip).
 */
const crown: Ornament = {
  place(box, avatar) {
    let el = box.querySelector<HTMLElement>(":scope > .ir-crown");
    if (!avatar) return el?.remove();
    if (!el) {
      el = Object.assign(document.createElement("i"), { className: "ir-crown" });
      el.setAttribute("aria-hidden", "true");
      box.append(el);
    }
    const a = avatar.getBoundingClientRect(), b = box.getBoundingClientRect();
    const left = `${Math.round(a.left - b.left + a.width / 2 - 32)}px`, top = `${Math.round(a.top - b.top - 17)}px`;
    if (el.style.left !== left) el.style.left = left;
    if (el.style.top !== top) el.style.top = top;
  },
  clear(box) {
    box.querySelector(":scope > .ir-crown")?.remove();
  },
};

export default defineTheme<WaveRun>({
  meta,
  fonts: [
    { family: "IR Fredoka", file: "fredoka-600.woff2", weight: 600 },
    { family: "IR Pacifico", file: "pacifico.woff2" },
  ],
  labels: { refactor: "Refactor", working: "Refactoring" },
  pickVariant: (now) => californiaPalette(now),
  roles: (variant) => {
    const p = palette(variant);
    return { edge: p.leaf, accent: p.coral, strong: p.select, onStrong: "#ffffff" };
  },
  css,
  variantCss,
  skin: '<i class="ir-card"></i><i class="ir-lagoon"></i><i class="ir-foam"></i>',
  ornament: crown,
  swoosh: {
    before: ({ host, editor, variant }) => lap(host, editor, palette(variant)),
    during: ({ host, editor, variant, showNew }, write) => washIn(host, editor, write, palette(variant), showNew),
    after: (_ctx, wave) => wave.settle(),
  },
});
