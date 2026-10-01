// Gmail's toolbar buttons, found by tooltip so a theme can swap their icons. Gmail's buttons stay in
// place and keep working; only their icon is swapped. Matched by the start of the tooltip, so English only.

export type IconName = "format" | "attach" | "link" | "emoji" | "drive" | "photo" | "signature" | "meet" | "more" | "trash";

export const ICON_LABELS: [string, IconName][] = [
  ["Formatting options", "format"],
  ["Attach files", "attach"],
  ["Insert link", "link"],
  ["Insert emoji", "emoji"],
  ["Insert files using Drive", "drive"],
  ["Insert photo", "photo"],
  ["Insert signature", "signature"],
  ["Set up a time to meet", "meet"],
  ["More options", "more"],
  ["Discard draft", "trash"],
];

/** Tags the toolbar buttons in a reply box so the styles can find them. Outermost match wins. */
export function tagIcons(box: HTMLElement): void {
  for (const el of box.querySelectorAll<HTMLElement>("[data-tooltip], [aria-label]")) {
    if (el.dataset.irIcon) continue;
    const label = el.dataset.tooltip ?? el.getAttribute("aria-label") ?? "";
    const match = ICON_LABELS.find(([prefix]) => label.startsWith(prefix));
    if (!match || el.parentElement?.closest(`[data-ir-icon="${match[1]}"]`)) continue;
    // Only real buttons: Gmail also labels whole toolbars, like the formatting bar. The "Aa" button
    // carries its tooltip on a plain wrapper, so a labelled wrapper hands the tag to the button inside.
    const isButton = (e: Element) => e.getAttribute("role") === "button" || e.tagName === "BUTTON";
    const target = isButton(el) ? el : el.getAttribute("role") ? null : el.querySelector<HTMLElement>('[role="button"], button');
    if (!target || target.dataset.irIcon) continue;
    target.dataset.irIcon = match[1];
  }
}
