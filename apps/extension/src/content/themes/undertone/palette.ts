// Undertone's colours (DESIGN.md, "Fonts and colours"). One variant; light and dark Gmail differ.

export interface Tones {
  blue: string;
  violet: string;
  cyan: string;
  /** Glyph lines on the card. */
  glyphInk: string;
  /** Refactor's label and the New chip. */
  labelInk: string;
  /** Send's fill runs from sendFrom to sendTo, with onSend text. */
  sendFrom: string;
  sendTo: string;
  onSend: string;
  glow: string;
}

export const LIGHT: Tones = {
  blue: "#4c6fff", violet: "#8b5cf6", cyan: "#22b8e0", glyphInk: "#3c4043", labelInk: "#2f3fb8",
  sendFrom: "#4c6fff", sendTo: "#7c4dff", onSend: "#ffffff", glow: "rgba(76, 111, 255, .38)",
};

export const DARK: Tones = {
  blue: "#8fa6ff", violet: "#b49cff", cyan: "#5fd4ee", glyphInk: "#e3e3e3", labelInk: "#c3ceff",
  sendFrom: "#8fa6ff", sendTo: "#b49cff", onSend: "#10163a", glow: "rgba(143, 166, 255, .32)",
};

/** Colour roles: Gmail's grey ink, the violet, the strong blue (4.2:1 on white, 3.9:1 on #202124). */
export const ROLES = { edge: "#5f6368", accent: "#8b5cf6", strong: "#4c6fff", onStrong: "#ffffff" };
