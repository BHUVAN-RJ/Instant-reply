# Beach: design

Status: approved 2026-09-30

Mockup: docs/design/beach/mockup.html (kit snapshot of the shipped look), docs/design/beach-style-v2.html, docs/design/wave-tuning-lab.html

Design v2, built and checked live in Gmail on 2026-09-29 (mockups: `docs/design/beach-style-v2.html`,
wave numbers: `docs/design/wave-tuning-lab.html`). Cursors, selection, the compose window, the To line
rule, the small waves while thinking and the finds without a "New" carrier added and approved on
2026-09-30.

## Idea

A warm island beach seen from above, made for a friend in California. Inspiration from Moana only: no
characters, logo or title lettering. The thread above the reply is the sea, the To line is shallow
lagoon water, the body is the sand the wave runs onto. Soft, round, bright, a little playful. It avoids
anything harsh, and anything red or wavy on the text, which would read as a mistake.

## Variants

Four time of day palettes, picked by the clock in California (America/Los_Angeles) and held still for
a whole Refactor. There is no setting to override it.

- `lagoon`, 5 to 11: clear turquoise water, coral and yellow flowers.
- `hibiscus`, 11 to 17: deeper teal, pink hibiscus coral.
- `sunset`, 17 to 20: orange water, rose coral, olive leaves.
- `night`, otherwise: navy water that glows cyan, gold flowers, pale grey sand.

Only colours change between variants. Every shape, motion and number below is the same in all four.

## Fonts and colours

- Fredoka 600 as "IR Fredoka" for labels and Send; Pacifico as "IR Pacifico" for the "New" mark. Both
  Open Font License, bundled in public/fonts.
- Each palette defines sea, sea2, lt, ltSoft, coral, coralD, onCoral, leaf, leafD, cream, flower,
  flower2, ink, select (strong, for selection and cursors), the water colours (far, mid, deep, abyss, foam, glow), sand, wet sand and grain (see
  `palette.ts`). Comment blue `#1a8fd6`, stale grey `#9aa7a4`.
- Colour roles, per palette: edge is the leaf green, accent is the coral, strong is the select colour
  (see Selection), onStrong is white `#ffffff`.
- Light and dark Gmail: the card keeps its own background (`--ir-paper`); the palette colours are
  chosen to read on both.

## Slots

### Tokens (`tokens`)

Every colour comes from the variant's palette as `--b-*` variables on the box; the tokens slot only
holds leaf and ink fallbacks for the moment before a variant is painted.

### Card (`card`)

Round (22px corners) with a thin 2px leaf green edge. No shadow.

### To line (`head`)

Two styles. The **band** is optional and off by default (popup: "Decorate the To line of replies").
The **rule** is used without it, and always under Subject in a window.

Band:

Shallow lagoon water: a soft gradient from ltSoft to a lighter lt, rounded at the top, ending in a
scalloped foam line (22px wide scallops, white crest, a bubble on each). Text and icons in the palette
ink.

Rule: no water; the To line stays plain Gmail and the scalloped foam line alone runs between
it and the body, with 12px of room under it.

### Body (`body`)

12px of room under the foam line, so the body reads as the beach the wave runs onto. Gmail's text
colours are kept.

### Formatting bar (`formatBar`)

A lagoon strip (ltSoft) with a 2px leaf edge and round ends. On dark Gmail, where the bar's text is
light, the strip is a faint 14% lagoon tint instead, so its buttons stay readable. Buttons bloom into a flower2 petal shape
and lift 1px on hover and while pressed. Dropdown options in Fredoka and palette ink.

### Pinned Send row (`pinnedRow`)

Pinned to the window bottom, the Send row gets the card's leaf edge on its sides and bottom and the
same round bottom corners.

### Compose window (`window`)

A new email or a reply popped out into Gmail's window (about 600px, Gmail's title bar, no card,
no avatar, so no flower crown). Gmail's window is the frame; nothing is drawn outside it.

- The To and Subject rows stay on paper in Gmail's own colours (they are form fields). Where they end,
  the scalloped foam line marks the shore, in the palette's water colour with a white crest.
- A thin 2px leaf green edge runs down both inside edges.
- The switch shrinks to its lens with the bud or flower centred (44px, no label; the tooltip still
  names it), and Refactor and the Send pebble tighten (14px text, less padding), so the whole Send row
  fits 600px and Gmail keeps room for its toolbar icons.
- 12px of room between the foam line and the body text.
- Send, icons, Discard, the formatting bar, cursors, comments and the wave are the same as in a reply.

### Switch (`toggle`)

Off: a dashed leaf outline in a lens shape with a green leaf bud and "Instant Reply" in leafD. On: the
lens fills with flower2 and the bud opens into a plumeria. Hover: lifts and tilts 1 degree. On dark
cards the off switch turns lagoon light (text and dashed outline), since leaf green sinks into the grey.
Focus: a ring in the strong select colour.

### Refactor (`refactor`)

"Refactor" in white Fredoka on a wavy coral banner with a coralD edge and a plumeria with a leaf pinned
at its right end. Hover: lifts 2px and tilts. Press: sinks 1px. While the model works it reads
"Refactoring" at 85% opacity.

### Send (`send`)

Send is a sea glass pebble (sea2 at 90% with a sea edge and a white glint); the schedule arrow is a
small pebble beside it. Hover: the pebble bobs up 2px, tilts and brightens with a sea shadow. Press:
sinks 1px.

### Toolbar icons (`icons`)

Rounded line glyphs in palette ink with a lt accent, each on a ltSoft petal. Hover: the petal turns
flower2, the accent turns coral, the glyph lifts and tilts 8 degrees.

- format: a letter A over a little wave.
- attach: a paper clip with an accent bead at its tip.
- link: two linked rings with an accent dot where they meet.
- emoji: a sun with an accent face, rays all round.
- drive: a Drive shape with an accent lower edge.
- photo: a photo with a palm tree and an accent sand hill.
- signature: a signature over an accent wave.
- meet: a calendar with an accent day.
- more: three dots, the middle one accent.

### Discard (`discard`)

A sand pail with a flower2 fill, 1.3 times the size, still the last button.

### Avatar (`avatar`)

A white ring and a leaf green ring around the avatar, and a flower crown (hibiscus, leaf, plumeria)
tilted -8 degrees, placed from the avatar's real position.

### Caret (`caret`)

Coral, like the Refactor banner.

### Cursor (`cursor`)

One family of soft rounded shapes with a white outline (so they show on sand, water and dark
cards), 32px, still, only over an active reply box, coloured by the palette.

- Arrow: a rounded sea glass arrow (sea2 fill, sea edge, a white glint), like Send. Hotspot at the tip.
- Hand: the same arrow in the palette's strong select colour with a coralD edge and a plumeria at its
  tail, like the Refactor banner. Over buttons, icons, links, dropdown options and comment pins.
- Text cursor: a rounded I-beam in the select colour with a small plumeria at its top right. Hotspot at
  the centre of the stem.

### Selection (`selection`)

The palette's strong select colour under white text: deep coral `#e0512f` (lagoon), raspberry
`#d6245a` (hibiscus), rose `#d63d5e` (sunset), amber `#b8780f` (night). Clear on white and on dark cards,
and apart from the blue comment wash. (The first draft used the pale flower yellow, which barely showed
on white.)

### Comments (`comments`)

A soft lagoon blue wash at 14% with a straight 2px blue underline. The pin is a blue petal with a white
edge and its number in Fredoka, lifting and tilting on hover. A stale pin turns grey and shows "?". The
note box is a white card with a 2px leaf edge, 18px corners and a soft shadow; its Delete button is a
flower2 pill.

### Swoosh layers (`swoosh`)

Canvas and text layers laid over the writing area in order: sand, the new text, the old text, the water;
the small thinking waves sit on top.

## Swoosh

### Before

Small waves lap at the top edge of the writing area while the model thinks: two sets roll in
turn every 1.9s, each running 7 to 20px down (never past the first line) with an uneven edge, the
palette's water colours and a white foam line, then draining back. At night they sparkle. They fade in
over 300ms and fade out when the draft arrives.

### During

One wave, seen from above, runs down the reply box from the top over sand (sand fades in over 140ms),
washes the old text away, pulls back up and leaves the draft on wet sand: 2800ms. The waterline is
uneven: each 6px column gets its own arrival, reach (always past the bottom) and retreat, shaped by one
of six presets picked at random, never the same twice in a row (left to right, right to left, right
nudges ahead, centre first, left half centre, right half centre). Numbers are the "Beach v1" set:
unevenness 0.6, run up 0.36, hang 0.05, scallop 8px by 44px, foam 1.5 times. As the water pulls back it
uncovers 2 to 4 beach finds (starfish in three colours, message in a bottle, crab, baby turtle, hermit
crab, octopus, jellyfish), 10 to 17px, placed on empty sand at least 10px from the text and 23px apart.

### After

The draft sits on wet sand for 1600ms while the sand dries (2200ms) and the critters move: the crab
runs off a side, the turtle crawls up toward the sea, the hermit crab shuffles. Then sand and finds fade
out over 700ms and only the real editor, already holding the draft, is left.

### New mark

No sticker. One find carries the word "New" in Pacifico, placed first and drawn bigger (24px) so it is
readable, shrinking only when the draft leaves no room: a crab holding a "New" sign (it waits longer
before running off), a bottle with a "New" note inside, a starfish with "New" on it, a hermit crab with
a "New" tag on its shell, or a card half buried in the sand. Without the mark, the wave leaves
2 to 4 plain finds instead.

## Rules check

- [x] Only dresses reply boxes whose thread is on; off means plain Gmail.
- [x] No text or tags on the box; the look itself says "on".
- [x] Every Gmail text, icon, dropdown and the caret stays visible.
- [x] Works on light and dark Gmail.
- [x] Discard stays the last button.
- [x] Comments are never red or wavy.
- [x] Reduced motion: nothing moves, the draft still lands (the runner handles this).
- [x] Nothing is ever written into the email.
- [x] Every variant follows this document.
