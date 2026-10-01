import { ICON_LABELS, type IconName } from "../../theme/icons";
import { ACID, INK, MAG, PAPER } from "./palette";

// FragPunk glyphs for Gmail's toolbar buttons, in ink on light cards and near white on dark ones.

// `{acc}` is the accent fill: acid at rest, magenta on hover (acid again for the discard button).
// `{ink}` follows the card (ink on light, paper on dark); `{on}` is always ink, for details drawn on the accent.
// `{halo}` is a card coloured gap that keeps an ink line readable where it crosses the accent.
const GLYPHS: Record<IconName, string> = {
  format: `<path fill="{ink}" fill-rule="evenodd" d="M9.5 2.5h5l4.5 13h-4l-.9-2.8H9.9L9 15.5H5zM10.9 9.5h2.4L12.1 5.6z"/><path fill="{acc}" stroke="{ink}" stroke-width="1.6" d="M4 18h16.5l-1.2 3.5H2.8z"/>`,
  attach: `<path fill="{acc}" stroke="{ink}" stroke-width="1.6" d="M5 7.5l8.5-4 6.5 13.5-8.5 4z"/><path fill="none" stroke="{halo}" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round" d="M15 7.5L9 13.5a1.8 1.8 0 002.6 2.6l6.6-6.6a3.4 3.4 0 00-4.8-4.8L6.2 11.9a5 5 0 007.1 7.1L19 13.3"/><path fill="none" stroke="{on}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M15 7.5L9 13.5a1.8 1.8 0 002.6 2.6l6.6-6.6a3.4 3.4 0 00-4.8-4.8L6.2 11.9a5 5 0 007.1 7.1L19 13.3"/>`,
  link: `<g transform="rotate(-40 12 12)"><rect x="1.5" y="8.2" width="10" height="7.6" fill="none" stroke="{ink}" stroke-width="2.3"/><rect x="12.5" y="8.2" width="10" height="7.6" fill="{acc}" stroke="{ink}" stroke-width="2.3"/><path stroke="{ink}" stroke-width="2.3" d="M8 12h8"/></g>`,
  emoji: `<path fill="{acc}" stroke="{ink}" stroke-width="2" d="M8 2.5h8l5.5 5.5v8L16 21.5H8L2.5 16V8z"/><path fill="none" stroke="{on}" stroke-width="2" d="M6.5 8.5l3.2 3.2M9.7 8.5l-3.2 3.2"/><path fill="none" stroke="{on}" stroke-width="2.4" d="M13.5 11.2l4-2"/><path fill="none" stroke="{on}" stroke-width="1.8" d="M6.5 15.2l2.2 1.8 2.2-1.8 2.2 1.8 2.2-1.8 2.2 1.8"/>`,
  drive: `<path fill="{acc}" stroke="{ink}" stroke-width="1.8" d="M2.5 16l4 5h12l3-5z"/><path fill="none" stroke="{ink}" stroke-width="2.3" d="M8.5 3h7l6 13M8.5 3L2.5 16M8.5 3l6.5 13"/>`,
  photo: `<g transform="rotate(-7 12 12)"><rect x="3.5" y="4.5" width="17" height="15" fill="{bg}" stroke="{ink}" stroke-width="2.2"/><path fill="{acc}" stroke="{ink}" stroke-width="1.6" d="M4.5 18.5l5.5-7 3.5 4.5 2-2.2 4 4.7z"/><path fill="{ink}" d="M15.5 6.5h3l-1.6 2.6h2l-3.6 4.2 1-3h-1.9z"/></g>`,
  signature: `<path fill="{acc}" stroke="{ink}" stroke-width="1.6" d="M2.5 18h19l-1 3.3H2z"/><path fill="none" stroke="{ink}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M3 14.5C5 8 7 4.5 8.2 5.5s-2.4 9-.4 9 3-5 4.6-5-.4 4.4 1.6 4.4 2.6-2.4 4.4-2.4"/><path fill="{ink}" d="M17.5 4l3 3-3.8 3.8-3.4.4.4-3.4z"/>`,
  meet: `<g transform="rotate(-5 12 12)"><rect x="3.5" y="5" width="17" height="15.5" fill="{bg}" stroke="{ink}" stroke-width="2.2"/><path fill="{acc}" stroke="{ink}" stroke-width="1.6" d="M3.5 5h17v4.5h-17z"/><path stroke="{ink}" stroke-width="2.4" d="M8 2.5v4.5M16 2.5v4.5"/><path fill="{ink}" d="M11.5 12.5h5v5h-5z"/></g>`,
  more: `<path fill="{ink}" d="M10.5 3h5.5l-2 4H8.5zM10.5 10h5.5l-2 4H8.5zM10.5 17h5.5l-2 4H8.5z"/>`,
  trash: `<path fill="none" stroke="{ink}" stroke-width="2.4" d="M3.5 7h17M9 7l1.2-3.5h3.6L15 7M5.5 7l1.8 14h9.4L18.5 7"/><path fill="{acc}" stroke="{ink}" stroke-width="1.6" d="M9 10.5h2l2.5 8h-2z"/>`,
};

function dataUri(name: IconName, accent: string, ink: string, bg: string): string {
  const glyph = GLYPHS[name].replaceAll("{acc}", accent).replaceAll("{ink}", ink).replaceAll("{bg}", bg).replaceAll("{on}", INK).replaceAll("{halo}", bg === "transparent" ? PAPER : bg);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke-linecap="square" stroke-linejoin="miter">${glyph}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** Per icon rules for light and dark reply cards, scoped by the caller to active reply boxes. */
export function iconCss(scope: string): string {
  const themes: [string, string, string][] = [["light", INK, "#fff"], ["dark", PAPER, "transparent"]];
  return themes.flatMap(([theme, ink, bg]) =>
    ICON_LABELS.map(([, name]) => {
      const hover = name === "trash" ? ACID : MAG;
      const sel = `${scope}[data-ir-theme="${theme}"] [data-ir-icon="${name}"]`;
      // On hover the icon sits on an acid (or magenta) block, so it is always drawn in ink there.
      return `${sel}::after { background-image: ${dataUri(name, ACID, ink, bg)}; }
${sel}:hover::after { background-image: ${dataUri(name, hover, INK, "#fff")}; }`;
    }),
  ).join("\n");
}
