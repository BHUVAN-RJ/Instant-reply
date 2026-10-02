import { defineTheme, plain } from "../../theme/contract";
import { noOrnament } from "../../theme/shared";
import { haze, melt, newChip } from "./fx";
import { meta } from "./meta";
import { ROLES } from "./palette";
import { css } from "./styles";

// Undertone: made for a friend who wanted something subtle with a little flair. Reads as Gmail from
// across the room; up close, a gradient runs underneath. Design in DESIGN.md next to this file.

export default defineTheme<void>({
  meta,
  fonts: [
    { family: "IR Geist", file: "geist-500.woff2", weight: 500 },
    { family: "IR Geist", file: "geist-600.woff2", weight: 600 },
  ],
  labels: { refactor: "Refactor", working: "Refactoring" },
  pickVariant: () => "native",
  roles: () => ROLES,
  css,
  variantCss: () => plain("one variant; light and dark cards are handled by the tokens slot"),
  skin: '<i class="ir-u-card"></i><i class="ir-u-glow"></i><i class="ir-u-rule"></i>',
  ornament: noOrnament,
  swoosh: {
    before: haze,
    during: melt,
    after: newChip,
  },
});
