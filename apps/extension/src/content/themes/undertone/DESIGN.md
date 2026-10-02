# Undertone: design

Status: approved 2026-10-01

Mockup: docs/design/undertone/mockup.html

Approved with its mockup on 2026-10-01. Named Undertone: it reads as Gmail on the surface, with a
gradient running underneath.

## Idea

Made for a friend who asked for something "as subtle as possible that gets the job done without being
obvious", but with some flair. From across the room it reads as Gmail: Gmail's own card, Gmail's
layout, Gmail's ink. Up close it is clearly its own thing, a modern tool look: a blue, violet and cyan
gradient used only in thin lines, small marks and soft glows; corners cut at 45 degrees instead of
rounded pills; Geist for its own labels. The one moment it performs is Refactor, where the old text melts
into ripples and the draft condenses out of them. It avoids Google logos and lettering, the Gemini
sparkle, filled colour blocks behind the writing, anything that moves at rest, and anything red or wavy
on the text.

## Variants

One variant, `native`. `pickVariant` always returns it. Light and dark Gmail are handled by the tokens
(through `data-ir-theme`), not by variants.

## Fonts and colours

- Geist (SIL Open Font License), bundled in public/fonts as "IR Geist", weights 500 and 600
  (`geist-500.woff2`, `geist-600.woff2`), for Refactor, Send, pins, the note box and the "New" mark.
  Fallback `system-ui, sans-serif`. Gmail's own text keeps Gmail's fonts.
- The gradient, light: blue `#4c6fff`, violet `#8b5cf6`, cyan `#22b8e0`, at 120 degrees. Dark: `#8fa6ff`,
  `#b49cff`, `#5fd4ee`.
- Send's fill is blue to violet only (`#4c6fff` to `#7c4dff`, white text, 4.2:1 and 4.8:1), since white
  on cyan would not read. Dark: `#8fa6ff` to `#b49cff` with `#10163a` text (7.6:1).
- Ink for glyphs: `#3c4043` light, `#e3e3e3` dark. Label ink: `#2f3fb8` light, `#c3ceff` dark. Off grey
  `#9aa0a6` (reads on both). Comment blue `#1a8fd6`, stale grey `#9aa0a6`.
- The card keeps Gmail's background (`--ir-paper`); tints are the gradient mixed into it.

Colour roles, per variant (`strong` needs 3:1 on white and on dark):

- edge: `#5f6368` (Gmail's grey ink, for glyph outlines)
- accent: `#8b5cf6` (the violet at the heart of the gradient)
- strong: `#4c6fff` (4.2:1 on white, 3.9:1 on `#202124`)
- onStrong: `#ffffff` (4.2:1 on `#4c6fff`)

## Slots

### Tokens (`tokens`)

On the box and on the switch (which also shows on boxes that are off): `--u-blue`, `--u-violet`,
`--u-cyan`, `--u-grad`, `--u-send`, `--u-on-send`, `--u-ink`, `--u-outline`, `--u-glow` (blue at 38%),
`--u-strong`, `--u-font`. On the box only, from the paper: `--u-tint` (blue 7% into `--ir-paper`) and
`--u-tint-hover` (13%). Under `[data-ir-theme="dark"]` the gradient, ink, Send and glow switch to their
dark values.

### Card (`card`)

The skin redraws Gmail's own card exactly: 16px corners, `--ir-paper`, Gmail's shadow
(`0 1px 2px rgba(60,64,67,.3), 0 2px 6px 2px rgba(60,64,67,.15)`, dark `0 1px 3px rgba(0,0,0,.6)`).
The "on" mark is an underglow: a 2px gradient line along the card's bottom edge, inset 28px from each
side, with a soft glow below it (`0 3px 16px 2px` in `--u-glow`).

### To line (`head`)

Rule (the default, and under Subject in a window): a 1px gradient hairline (transparent, blue at 18%,
violet at 60%, transparent) at 60% opacity, inset 16px, at the bottom of the To line. The To line itself
stays plain Gmail.

Band (only with "Decorate the To line of replies"): a faint wash behind the To line, blue 9% fading to
violet 6% and then to nothing at the right, with the card's top corners and a 1px violet line (40%)
along its bottom. Text and icons keep Gmail's colours, which read on the wash in both modes.

### Body (`body`)

8px of room under the rule. Gmail's writing area is otherwise untouched.

### Formatting bar (`formatBar`)

Gmail's grey fill goes; a 1px gradient hairline at 50% (fading at both ends) runs along its top instead.
Separators turn violet at 35%. Buttons and the font menu take the cut corner shape (6px chamfers): a blue
12% tile on hover, and violet 18% with label ink text when pressed (bold, italic, underline on). No fill
behind Gmail's text, so it stays readable in dark mode.

### Pinned Send row (`pinnedRow`)

Pinned to the window bottom, the Send row gets the card's paper and 16px bottom corners, so the card
still reads as one piece; the underglow stays on the card's bottom edge.

### Compose window (`window`)

Gmail's window is the frame: the skin's card is square and flat, and there is no underglow (it would sit
outside the window). To and Subject stay exactly as Gmail draws them; the gradient rule under Subject is
the only line. Refactor shrinks to 32px tall with 13px text and 10px less padding, Send loses 6px of
padding on each side, and the switch moves 4px closer, so the Send row fits 600px and Gmail keeps room
for its toolbar icons. Everything else (icons, Discard, comments, cursors, the liquid) is the same as in
a reply.

### Switch (`toggle`)

A spark: no visible label (the tooltip still names it), 30 by 36px hit area.

- Off: a 26px grey line (`#9aa0a6`, 2px) with an 8px grey diamond at its left end.
- On: the line fills left to right with the gradient (300ms, `cubic-bezier(.2,0,0,1)`) and the diamond
  slides to the right end, turns cyan and glows (`0 0 8px 1px` in `--u-glow`).
- Hover: the diamond grows 30%; when on, its glow widens.
- Focus: a 2px `strong` ring, 2px outside, 4px corners.

### Refactor (`refactor`)

Label "Refactor"; working label "Refactoring". A cut corner tile: 36px tall, top right and bottom left
corners cut at 45 degrees (10px). The gradient shows only as a 1.25px hairline around a `--u-tint`
inside; label in Geist 500 14px, `--u-ink`; a 16px gradient glyph on the left (three text lines and a
circular arrow). Padding 0 16px 0 34px.

- Hover: lifts 1px, the inside deepens to `--u-tint-hover`.
- Press: shrinks to 97% (50ms).
- Working: the hairline becomes a conic gradient that spins once every 1.6s; the label dims to 65%.
- With comments: "Refactor (2)".
- Focus: a 2px `strong` ring inside the tile (offset -5px, since the cut corners clip anything outside).

### Send (`send`)

Gmail's blue pill becomes the same cut corner tile as Refactor, filled: blue to violet (`--u-send`) with
white Geist 500 14px (dark: light gradient, `#10163a` text), 0 22px padding, 36px tall. The schedule
arrow is a smaller tile beside it, 3px apart, with 7px chamfers and the arrow in the same text colour.

- Hover (each tile on its own): lifts 1px and brightens (brightness 1.08, saturation 1.1).
- Press: shrinks to 97% (50ms).
- Focus: a 2px ring in the text colour inside the tile (offset -5px).

### Toolbar icons (`icons`)

Gmail's icons are hidden and redrawn: thin 1.7px line glyphs in Gmail's ink (`#3c4043`, `#e3e3e3` on
dark cards so they stay readable), 20px, each with one gradient accent: an underline stroke or the
spark's small diamond. Hover: a blue 12% cut corner tile (6px chamfers) appears behind the button and
the glyph lifts 1px; press shrinks it to 94%.

- format: a letter A over a gradient underline.
- attach: a paper clip with a gradient diamond at its top right.
- link: two linked rings with a gradient diamond where they meet.
- emoji: a round face with a gradient smile.
- drive: the Drive triangle with a gradient line across its base.
- photo: a frame with one corner cut, a gradient mountain line and a gradient diamond sun.
- signature: a handwritten squiggle over a gradient baseline.
- meet: a calendar with one corner cut and a gradient diamond on the day.
- more: two dots with a gradient diamond between them.

### Discard (`discard`)

A bin in the same line style with a gradient lid, 15% bigger than the other icons, still the last
button, with the same hover tile.

### Avatar (`avatar`)

A thin violet ring (`#7c6cff`, 1.5px) on a 2px paper gap, with a soft violet glow below
(`0 6px 14px -4px`). No ornament.

### Caret (`caret`)

Violet (`--u-violet`).

### Cursor (`cursor`)

28px, still, only over an active reply box, all with a white outline so they show on white and dark
cards.

- Arrow: a slim dark arrow (`#1f1f1f`) with a white outline and a small gradient diamond at its upper
  right, like the switch's spark. Hotspot at the tip.
- Hand: the same arrow filled with the gradient, white outline. Over buttons, icons, links, menus and
  pins.
- Text cursor: a slim I-beam drawn in the gradient over a white outline. Hotspot at the centre.

### Selection (`selection`)

The strong blue `#4c6fff` under white text: clear on white and dark cards, and apart from the pale
comment wash.

### Comments (`comments`)

- Highlight: comment blue at 12% with a straight 1px comment blue underline, 3px below the text.
- Pin: a small cut corner tile (5px chamfers), 18px tall, comment blue with its number in white Geist
  600 10.5px; lifts 1px on hover. Stale: grey `#9aa0a6` with "?".
- Note box: the paper with a 1px gradient hairline and 12px cut corners, Geist text; Delete is a blue
  text button.

### Swoosh layers (`swoosh`)

A copy of the writing area's text (the kit's ghost) on paper, its words in an inner wrapper so they can
fade on their own, filtered through an SVG turbulence filter (`feTurbulence` fractal noise, base
frequency 0.015 by 0.09, 2 octaves, then `feDisplacementMap`) added to the box for the Refactor and
removed after. The "New" chip is a layer over the writing area. Nothing filters the editor itself.

## Swoosh

### Before

Heat haze: a copy of the text sits over it and wavers gently, the displacement swinging between 0 and
3px every 1.9s. It stays readable. The Refactor hairline spins at the same time.

### During

Liquid, about 1.3s. The text melts: the displacement grows from the haze to 70px (accelerating) while
the words fade out, over 550ms. The draft is written underneath, and a copy of it condenses out of the
ripples: the displacement falls from 70px to 0 (ease out) while its words fade in, over 750ms. Then the
copy and the filter are removed, leaving the real editor holding the draft.

### After

Nothing to settle: the condensed draft is already sharp and still.

### New mark

A small cut corner chip, "New" in Geist 600 11px, label ink on `--u-tint` with a gradient hairline, at
the top right of the writing area. It drops in 3px and fades in (170ms), stays, and fades out after 2.8s
in all. Without it the liquid is complete on its own.

## Rules check

- [x] Only dresses reply boxes whose thread is on; off means plain Gmail (an off box shows only the grey
  spark).
- [x] No text or tags on the box; the look itself says "on".
- [x] Every Gmail text, icon, dropdown and the caret stays visible.
- [x] Works on light and dark Gmail.
- [x] Discard stays the last button.
- [x] Comments are never red or wavy.
- [x] Reduced motion: nothing moves, the draft still lands (the runner handles this).
- [x] Nothing is ever written into the email.
- [x] Every variant follows this document.
