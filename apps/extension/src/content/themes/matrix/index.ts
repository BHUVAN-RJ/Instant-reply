import { defineTheme, plain } from "../../theme/contract";
import { after, before, during } from "./fx";
import { meta } from "./meta";
import { ROLES } from "./palette";
import { ornament } from "./rain";
import { css } from "./styles";

// Matrix: faint code rain across the card in a HUD frame, shell buttons in VT323, and a Refactor that
// traces the old text, stops dead like bullet time and decodes the draft out of falling code. Design in
// DESIGN.md next to this file; mockup in docs/design/matrix/mockup.html.

export default defineTheme<void>({
  meta,
  fonts: [
    { family: "IR Terminal", file: "vt323.woff2" },
    { family: "IR OCR", file: "ocr-a.woff2" },
  ],
  labels: { refactor: "Refactor", working: "Tracing" },
  pickVariant: () => "phosphor",
  roles: () => ROLES,
  css,
  variantCss: () => plain("one variant; light and dark cards are handled by the tokens slot"),
  skin:
    '<i class="ir-mx-edge"></i><i class="ir-mx-paper"></i><div class="ir-mx-rain"><canvas></canvas></div>' +
    '<i class="ir-mx-seg ir-mx-seg-a"></i><i class="ir-mx-seg ir-mx-seg-b"></i><i class="ir-mx-ticks ir-mx-ticks-a"></i><i class="ir-mx-ticks ir-mx-ticks-b"></i>' +
    '<i class="ir-mx-rule"></i><div class="ir-mx-band"><canvas></canvas></div>',
  ornament,
  swoosh: { before, during, after },
});
