import { defineTheme, plain } from "../../theme/contract";
import { noOrnament } from "../../theme/shared";
import { shake, stamp, sweep } from "./fx";
import { ACID, INK, MAG } from "./palette";
import { meta } from "./meta";
import { css } from "./styles";

// FragPunk: the first look. Design in DESIGN.md next to this file.

export default defineTheme<void>({
  meta,
  fonts: [{ family: "IR Marker", file: "permanent-marker.woff2" }],
  labels: { refactor: "Refactor!", working: "Refactoring" },
  pickVariant: () => "ink",
  roles: () => ({ edge: INK, accent: ACID, strong: MAG, onStrong: "#ffffff" }),
  css,
  variantCss: () => plain("one variant; light and dark cards are handled by the tokens slot"),
  skin: '<i class="ir-sh"></i><i class="ir-under"></i><i class="ir-ink"></i><i class="ir-paper"></i><b class="ir-bar-acid"></b><b class="ir-bar-sh"></b><b class="ir-bar"></b>',
  ornament: noOrnament,
  swoosh: {
    before({ editor }) {
      editor.classList.add("ir-glitch");
      return () => editor.classList.remove("ir-glitch");
    },
    during: ({ host, editor }, write) => sweep(host, editor, write),
    after({ host, editor, showNew }) {
      if (!showNew) return shake(host);
      stamp(host, editor);
      setTimeout(() => shake(host), 200);
    },
  },
});
