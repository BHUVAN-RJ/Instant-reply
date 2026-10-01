// The theme contract. A theme pack decides how Instant Reply looks inside Gmail; it never decides what
// Instant Reply does. Reading the thread, the switch, Refactor, comments and learning live in gmail.ts
// and core, and are the same in every theme.
//
// Every slot is required. A theme that wants Gmail's own look for a slot says so with `plain("why")`,
// so nothing is left undesigned by accident. Each slot has a matching section in the theme's DESIGN.md
// (see docs/THEMES.md); the tests fail when either side is missing.

/** The CSS slots, in the order they are written into the stylesheet. */
export const CSS_SLOTS = [
  "tokens", // colours and edges for light and dark Gmail (`data-ir-theme`)
  "card", // the edge around the reply card, drawn by the skin behind it
  "head", // the To line: the optional band, and the rule under it (the default, and always in a window)
  "body", // the writing area around the text
  "formatBar", // Gmail's formatting bar
  "pinnedRow", // the Send row Gmail pins to the window bottom on long replies
  "window", // a box with no card: a new email, or a reply popped out into a window (`data-ir-layout="window"`)
  "toggle", // the on/off switch, off and on
  "refactor", // the Refactor button: rest, hover, press, busy
  "send", // Send and its schedule arrow
  "icons", // toolbar icons (attach, link, emoji, ...)
  "discard", // Discard, always the last button
  "avatar", // the user's avatar left of the card, and any ornament on it
  "caret", // the text caret
  "cursor", // the three cursors over the box: arrow, hand over anything clickable, text cursor over the writing area
  "selection", // selected text in the writing area
  "comments", // comment highlight, pins, stale pins, the note box
  "swoosh", // the layers and keyframes used by before, during and after
] as const;

export type CssSlot = (typeof CSS_SLOTS)[number];

/** Explicitly leaves a slot to Gmail. The reason is required and ends up in the stylesheet. */
export const plain = (reason: string): string => `/* plain: ${reason} */`;
export const PLAIN_PATTERN = /^\/\* plain: .{8,} \*\/$/;

export interface ThemeFont {
  /** The family name the theme's CSS uses, e.g. "IR Marker". */
  family: string;
  /** A file in public/fonts. */
  file: string;
  weight?: number;
}

/** What the popup needs to list a theme, without loading its styles or animations. */
export interface ThemeMeta {
  id: string;
  name: string;
  /** Every variant the pack ships. A theme with one look has one variant. */
  variants: readonly string[];
}

export interface SwooshContext {
  /** The reply box. Positioned, so layers placed inside it scroll with the thread. */
  host: HTMLElement;
  editor: HTMLElement;
  /** Held for the whole Refactor, from before to the end of after. */
  variant: string;
  /** Whether this Refactor carries the "New" mark (first three Refactors, or always if turned on). */
  showNew: boolean;
}

/**
 * The Refactor animation, in three phases. The runner skips all three when the user asks for reduced
 * motion, and makes sure the draft is written even if a phase throws.
 */
export interface Swoosh<S = unknown> {
  /** While the model thinks. Starts a loop over the old text; returns a function that stops it. */
  before(ctx: SwooshContext): () => void;
  /**
   * Swaps the old text for the draft: must call `write` exactly once, and show that the old text is
   * gone and the new one has arrived. Resolves once the draft is readable, with whatever `after` needs.
   */
  during(ctx: SwooshContext, write: () => void): Promise<S>;
  /** The settle, and the "New" mark when `ctx.showNew`. Cleans up after itself. */
  after(ctx: SwooshContext, state: S): void;
}

/** Extra elements a theme places around the box on every sync (e.g. a crown over the avatar). */
export interface Ornament {
  /** Called on every sync of an active box; `avatar` is null until it is found. Writes only on change. */
  place(box: HTMLElement, avatar: HTMLElement | null): void;
  /** Removes everything `place` added (the thread was turned off, or the theme changed). */
  clear(box: HTMLElement): void;
}

/**
 * The colour jobs every theme fills, per variant (docs/themes/DESIGN_LANGUAGE.md, "Colour roles").
 * Comment blue is not a role: it is shared so comments always read the same.
 */
export interface ColorRoles {
  /** Outlines, the card edge, glyph ink. */
  edge: string;
  /** The signature colour: what makes the theme recognisable at a glance (Refactor, hover backdrops). */
  accent: string;
  /** Selection, the hand and the text cursor. Must stand out on white and on dark cards (3:1 or more). */
  strong: string;
  /** Text on `strong` (3:1 or more against it). */
  onStrong: string;
}

export interface ThemePack<S = unknown> {
  meta: ThemeMeta;
  fonts: readonly ThemeFont[];
  labels: {
    /** The Refactor button at rest; the comment count is added after it. */
    refactor: string;
    /** The Refactor button while the model thinks. */
    working: string;
  };
  /** Which variant to show now. Read when a box is dressed, held still during a Refactor. */
  pickVariant(now: Date): string;
  /** The stylesheet, one entry per slot. */
  css: Record<CssSlot, string>;
  /** The colour roles of one variant. */
  roles(variant: string): ColorRoles;
  /** CSS for one variant, scoped to `[data-ir-variant="<id>"]`. */
  variantCss(variant: string): string;
  /**
   * Markup of the skin drawn behind the reply card (`.ir-skin`), sized to the card by gmail.ts. The head
   * slot styles it for both To line styles: the band, and the rule (see `BAND` and `RULE` in shared.ts).
   */
  skin: string;
  ornament: Ornament;
  swoosh: Swoosh<S>;
}

/** Keeps the swoosh's state type inside the pack. */
export const defineTheme = <S>(pack: ThemePack<S>): ThemePack => pack as unknown as ThemePack;
