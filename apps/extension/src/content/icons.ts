import { ACID, INK, MAG, PAPER } from "./palette";

// Replacement glyphs for the reply toolbar while a thread is on. Gmail's buttons stay in place and keep
// working; only their icon is swapped. Matched by the start of their tooltip, so this is English only.

type IconName = "format" | "attach" | "link" | "emoji" | "photo" | "more" | "trash";

export const ICON_LABELS: [string, IconName][] = [
  ["Formatting options", "format"],
  ["Attach files", "attach"],
  ["Insert link", "link"],
  ["Insert emoji", "emoji"],
  ["Insert photo", "photo"],
  ["More options", "more"],
  ["Discard draft", "trash"],
];

// `{acc}` is the accent fill: acid at rest, magenta on hover (acid again for the discard button).
const GLYPHS: Record<IconName, string> = {
  format: `<path fill="{ink}" fill-rule="evenodd" d="M9.5 2.5h5l4.5 13h-4l-.9-2.8H9.9L9 15.5H5zM10.9 9.5h2.4L12.1 5.6z"/><path fill="{acc}" stroke="{ink}" stroke-width="1.6" d="M4 18h16.5l-1.2 3.5H2.8z"/>`,
  attach: `<path fill="none" stroke="{ink}" stroke-width="2.4" d="M16.5 4.5L6 15l3 3 10.5-10.5-3-3L7.5 13.5"/><path fill="{acc}" stroke="{ink}" stroke-width="1.6" d="M13 16l6.5-6.5 1.5 1.5L14.5 17.5z"/>`,
  link: `<path fill="none" stroke="{ink}" stroke-width="2.4" d="M10.5 15.5L7.5 18.5 3.5 14.5 8.5 9.5 10.5 11.5M13.5 8.5l3-3 4 4-5 5-2-2"/><path fill="{acc}" stroke="{ink}" stroke-width="1.6" d="M8 14.5L14.5 8l1.5 1.5L9.5 16z"/>`,
  emoji: `<path fill="{acc}" stroke="{ink}" stroke-width="2" d="M8 2.5h8l5.5 5.5v8L16 21.5H8L2.5 16V8z"/><path fill="none" stroke="{ink}" stroke-width="2" d="M6.5 8.5l3.2 3.2M9.7 8.5l-3.2 3.2"/><path fill="none" stroke="{ink}" stroke-width="2.4" d="M13.5 11.2l4-2"/><path fill="none" stroke="{ink}" stroke-width="1.8" d="M6.5 15.2l2.2 1.8 2.2-1.8 2.2 1.8 2.2-1.8 2.2 1.8"/>`,
  photo: `<g transform="rotate(-7 12 12)"><rect x="3.5" y="4.5" width="17" height="15" fill="{bg}" stroke="{ink}" stroke-width="2.2"/><path fill="{acc}" stroke="{ink}" stroke-width="1.6" d="M4.5 18.5l5.5-7 3.5 4.5 2-2.2 4 4.7z"/><path fill="{ink}" d="M15.5 6.5h3l-1.6 2.6h2l-3.6 4.2 1-3h-1.9z"/></g>`,
  more: `<path fill="{ink}" d="M10.5 3h5.5l-2 4H8.5zM10.5 10h5.5l-2 4H8.5zM10.5 17h5.5l-2 4H8.5z"/>`,
  trash: `<path fill="none" stroke="{ink}" stroke-width="2.4" d="M3.5 7h17M9 7l1.2-3.5h3.6L15 7M5.5 7l1.8 14h9.4L18.5 7"/><path fill="{acc}" stroke="{ink}" stroke-width="1.6" d="M9 10.5h2l2.5 8h-2z"/>`,
};

function dataUri(name: IconName, accent: string, ink: string, bg: string): string {
  const glyph = GLYPHS[name].replaceAll("{acc}", accent).replaceAll("{ink}", ink).replaceAll("{bg}", bg);
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

/** Tags the toolbar buttons in a reply box so the styles can find them. Outermost match wins. */
export function tagIcons(box: HTMLElement): void {
  for (const el of box.querySelectorAll<HTMLElement>("[data-tooltip], [aria-label]")) {
    if (el.dataset.irIcon) continue;
    // Only real buttons: Gmail also labels whole toolbars, like the formatting bar.
    if (el.getAttribute("role") !== "button" && el.tagName !== "BUTTON") continue;
    const label = el.dataset.tooltip ?? el.getAttribute("aria-label") ?? "";
    const match = ICON_LABELS.find(([prefix]) => label.startsWith(prefix));
    if (!match || el.parentElement?.closest(`[data-ir-icon="${match[1]}"]`)) continue;
    el.dataset.irIcon = match[1];
  }
}
