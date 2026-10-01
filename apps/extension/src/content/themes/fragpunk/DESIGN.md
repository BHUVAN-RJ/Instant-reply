# FragPunk: design

Status: approved 2026-09-30

Mockup: docs/design/fragpunk/mockup.html (snapshot of the shipped look; the swoosh runs in the preview)

Inline replies built and checked live in Gmail on 2026-09-29. Cursors, selection, the compose window,
the To line rule and the pixel sized tears added and approved on 2026-09-30.

## Idea

A punk zine pasted over Gmail: flat fills, thick ink edges, torn paper outlines, hard offset shadows and
everything a few degrees off straight, in acid yellow, magenta and cyan on ink. Loud, fast and a little
rude, for the user's own inbox. It avoids anything that reads as an error (no red) and never covers the
words the user is writing.

## Variants

One variant, `ink`. Light and dark Gmail are not variants: the tokens slot swaps the ink edge for near
white on dark cards.

## Fonts and colours

- Permanent Marker (Apache 2.0) as "IR Marker", for labels, Send, Refactor and the "New!" sticker.
- Acid `#e6ff1f`, magenta `#ff2e88`, ink `#0d0b12`, cyan `#19e3ff`, paper `#f4f0fa`. Comment blue
  `#2b6cff`, stale grey `#8d8a93`.
- Colour roles: edge ink `#0d0b12`, accent acid `#e6ff1f`, strong magenta `#ff2e88`, onStrong white
  `#ffffff`.
- Light cards: ink edges and glyphs. Dark cards: paper edges and glyphs. The card's own background is
  read before it is cleared and shows through as `--ir-paper`.

## Slots

### Tokens (`tokens`)

`--ir-edge` is ink on light cards and paper on dark ones; `--ir-paper` is the card's own background.
Every edge, dashed outline and glyph uses them.

### Card (`card`)

A 3px edge in `--ir-edge`, straight on the left, torn on the right, jagged but level along the bottom.
The tears are 0 to 5px deep at any card width (a percentage showed as one broken looking 10px step on
a wide card).
An acid sheet peeks out behind the top left, tilted 0.9 degrees, and a magenta hard shadow sits 8px right
and 7px down. Gmail's grey border and rounded corners are cleared.

### To line (`head`)

Two styles. The **band** is optional and off by default (popup: "Decorate the To line of replies").
The **rule** is used without it, and always under Subject in a window.

Band:

A crooked ink bar behind the recipients line, sticking out past both sides of the card, torn at the
right end, tilting down on the right so the left, where the caret starts, stays clear. A magenta shadow
5px down right and an acid slab behind, peeking out above and below. The line's text and icons turn
white on it.

Rule: the To line stays plain Gmail; a crooked 5px ink strip with a 3px magenta hard shadow,
tilted 0.35 degrees, runs between it and the body, with 10px of room under it.

### Body (`body`)

6px of extra space under the bar, so the acid slab marks where the writing area starts. The body keeps
Gmail's own text colours.

### Formatting bar (`formatBar`)

A flat paper strip with a 2px edge and a magenta hard shadow, square, tilted 0.4 degrees. Buttons light
up acid with a 3px acid ring and tilt 3 degrees on hover and while pressed. Dropdown options use the
marker font.

### Pinned Send row (`pinnedRow`)

When Gmail pins the Send row to the window bottom, the row draws its own copy of the card edge (ink sides
and bottom, acid on the left, the magenta shadow) so the card still reads as one torn sheet.

### Compose window (`window`)

A new email or a reply popped out into Gmail's window (about 600px, Gmail's title bar, no card,
no avatar). Gmail's window is already the frame, so nothing is drawn outside it and nothing spills into a
scrollbar.

- A 6px acid band runs down the inside left edge; the rest of the box is paper.
- The To and Subject rows stay on paper in Gmail's own colours, since they are form fields (painting the
  ink bar behind them left a white input and grey labels). A crooked 5px ink strip with a 3px magenta
  hard shadow underlines them, tilted 0.35 degrees.
- The switch shrinks to its diamond sticker (34px square, no label; the tooltip still names it), and
  Refactor tightens to 11px padding and 15px text, so Gmail keeps room for its toolbar icons.
- 10px of room between the strip and the body text.
- Send, icons, Discard, the formatting bar, cursors, comments and the swoosh are the same as in a reply.

### Switch (`toggle`)

Off: a dashed outline in `--ir-edge` with a hollow diamond and "Instant Reply" in marker, at 80% opacity,
tilting 1 degree on hover. On: a torn magenta sticker with an ink edge, white text and an acid diamond,
tilted 2 degrees. Focus: a 3px magenta outline outside the off switch; on the torn on sticker the ring
is acid and sits 7px inside, since the torn outline would cut an outside ring off.

### Refactor (`refactor`)

"Refactor!" in marker on a torn acid sticker with an ink edge, tilted -2 degrees. Hover: it swings to 1
degree and grows 4%. Press: it stamps down 2px and shrinks. While the model works it reads "Refactoring"
with a progress cursor. Focus: a 3px magenta ring 7px inside the sticker.

### Send (`send`)

Send and its schedule arrow become one ink torn sticker, split by an acid seam, with acid text and an
acid hard shadow. Hover: the shadow grows and gains a magenta echo, the hovered half lifts and its text
turns white. Press: stamps down 2px.

### Toolbar icons (`icons`)

Chunky square cut glyphs in ink (paper on dark cards) with an acid accent. Details drawn on the acid
accent are always ink, and a line crossing the accent gets a card coloured halo, so every glyph reads on
light and dark cards. Hover: a torn acid block tilts in behind, the glyph turns ink with a magenta
accent, lifts and tilts 6 degrees.

- format: a letter A standing on an acid slab.
- attach: a paper clip over a tilted acid tag, with a card coloured halo where it crosses the tag.
- link: two chain links at 40 degrees, the right one filled acid.
- emoji: an acid octagon with X eyes, a slanted mouth and a zigzag grin, all in ink.
- drive: a Drive triangle with an acid base.
- photo: a tilted framed photo with an acid mountain and a lightning bolt sun.
- signature: a scrawled signature with a pen nib, over an acid underline.
- meet: a tilted calendar with an acid header and a filled ink day.
- more: three slanted ink bars stacked.

### Discard (`discard`)

A trash can glyph at 1.35 times the size, still the last button. Its hover block is magenta, with an
acid accent on the glyph.

### Avatar (`avatar`)

The round avatar is cut into a tilted octagon sticker (rotated -6 degrees) with a magenta hard shadow
down right and an acid one up left. No ornament.

### Caret (`caret`)

Magenta, so it is easy to spot against ink and paper.

### Cursor (`cursor`)

One family of flat stickers: acid shapes with a 2px ink edge and a magenta hard shadow 2.5px
down right, 32px, still, only over an active reply box.

- Arrow: a hard edged acid arrow. Hotspot at the tip.
- Hand: the same arrow in magenta with an acid shadow, like the switch when it is on. Over buttons,
  icons, links, dropdown options and comment pins.
- Text cursor: a chunky acid I-beam with wide flat serifs, same edge and shadow, over the writing area
  and the box's text fields. Hotspot at the centre.

Refactor keeps the progress cursor while it works.

### Selection (`selection`)

Magenta background with white text: loud like the rest, and clearly apart from the acid comment
highlight.

### Comments (`comments`)

The passage gets an acid highlighter streak at 60% with a straight 2px blue underline. The pin is a torn
blue sticker with an ink edge and its number in marker, tilted -8 degrees, swinging and growing on hover.
A stale pin turns grey and shows "?". The note box is a white sticker with an ink edge, magenta and acid
hard shadows, tilted 0.6 degrees; its Delete button is an acid block.

### Swoosh layers (`swoosh`)

The flicker keyframes for before, a still copy of the old text (`.ir-ghost`) and a canvas (`.ir-sweep`)
for during, and the shake and the "New!" sticker keyframes for after.

## Swoosh

### Before

The old text flickers out of register: it jumps 2px left and right three times every 0.3s with a
magenta and acid colour split, like a bad photocopy. Loops until the draft arrives.

### During

An ink block of 24 thin glitch rows sweeps the writing area left to right in 600ms. Each row starts a
little apart and trails acid, magenta, cyan and ink streaks with magenta and cyan echoes behind; the
front jitters and has a white and magenta edge. The draft is already written underneath and the old text
is torn away row by row behind the front.

### After

The box jolts on impact: a 260ms shake of a few pixels, on every Refactor, with or without the sticker.

### New mark

A "New!" sticker in 32px marker on acid, with an ink edge and a magenta shadow, slams onto the top right
of the writing area from three times its size, shakes the box, then its top right corner curls down,
it swings from the top left corner and drops off, 3.2s in all.

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
