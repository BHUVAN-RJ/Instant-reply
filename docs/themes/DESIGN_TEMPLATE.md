# <Theme name>: design

Copy this file to `apps/extension/src/content/themes/<id>/DESIGN.md` and fill every section before
writing any code. Read `docs/themes/DESIGN_LANGUAGE.md` first: it explains the canvas, the colour roles,
shape and motion language, states, cursors and the swoosh. Check your work in the preview
(`npm run preview`). Write what each element looks like and how it moves, concretely enough that someone
could build it without asking. Replace every `<fill>`; the tests fail on any left behind.

Status: draft

Mockup: <fill: path(s) under docs/design/, e.g. docs/design/<id>/mockup.html>

The status line changes to `Status: approved YYYY-MM-DD` only when the user has read this design and
said yes. An agent never sets it on its own.

## Idea

<fill: one paragraph. What world does the theme come from, what should it feel like, what is it for (and
for whom), and what must it avoid (logos, characters, trademarked lettering, anything that reads as an
error).>

## Variants

<fill: every variant id in backticks (e.g. `lagoon`), what changes between them (palette, time of day,
mood), and the rule that picks one. A theme with one look has one variant. Every variant follows this
whole document; only what is listed here may differ between them.>

## Fonts and colours

<fill: the display font (bundled in public/fonts, open licence), the palette with hex values, and how
light and dark Gmail are handled.>

Colour roles, per variant (see the design language; `strong` needs 3:1 on white and on dark):

- edge: <fill>
- accent: <fill>
- strong: <fill>
- onStrong: <fill>

## Slots

### Tokens (`tokens`)

<fill: shared colour variables, and how they switch for light and dark cards.>

### Card (`card`)

<fill: the edge around the reply card: shape, thickness, colour, shadows.>

### To line (`head`)

<fill: both To line styles. The band: the optional decoration behind the recipients line of an inline
reply, and what colour its text and icons turn on it (off by default; the user turns it on in the
popup). The rule: the line between a plain To line and the body, the default for replies and always
used under Subject in a window.>

### Body (`body`)

<fill: spacing or backdrop around the writing area. The text itself always stays readable.>

### Formatting bar (`formatBar`)

<fill: Gmail's formatting bar, and its buttons on hover and when pressed.>

### Pinned Send row (`pinnedRow`)

<fill: how the Send row looks when Gmail pins it to the window bottom on long replies, so the card edge
still reads as one piece.>

### Compose window (`window`)

<fill: how the theme dresses a box inside Gmail's own window, which is a new email or a reply popped out
of a thread: about 600px wide, Gmail's title bar on top, To and Subject rows (form fields) instead of a
To line, no rounded card, no avatar. Say what replaces the card edge (drawn inside the window, never
outside it), how the To and Subject rows are marked while they stay on paper, and how the switch and
Refactor get smaller so Gmail keeps room for its toolbar icons.>

### Switch (`toggle`)

<fill: the on/off switch, off and on, hover and focus.>

### Refactor (`refactor`)

<fill: the Refactor button at rest, hover, press, and while the model is working. Its label.>

### Send (`send`)

<fill: Gmail's blue Send button and its schedule arrow, restyled to belong to the theme: shape, colour,
type, and how each reacts on hover, press and focus. Never leave Gmail's blue pill.>

### Toolbar icons (`icons`)

<fill: the glyph style shared by every icon, the backdrop behind it on hover, and how glyphs stay
readable on dark cards. Then one line per icon (the tests check each one):>

- format: <fill>
- attach: <fill>
- link: <fill>
- emoji: <fill>
- drive: <fill>
- photo: <fill>
- signature: <fill>
- meet: <fill>
- more: <fill>

### Discard (`discard`)

<fill: Discard, which is always the last button and a little bigger than the others.>

### Avatar (`avatar`)

<fill: the user's avatar next to the card, and any ornament placed on it.>

### Caret (`caret`)

<fill: the text caret colour.>

### Cursor (`cursor`)

Cursors get their own design pass: they are what the user sees most. All three are required, 32px at
most, still (no animation), only change over an active reply box, and must stay clear on white and on
dark cards. They should read as one family with the buttons.

- Arrow: <fill: shape, colours, outline, shadow; hotspot at the tip.>
- Hand: <fill: what the arrow becomes over anything clickable (buttons, icons, links, options, pins).>
- Text cursor: <fill: the I-beam over the writing area and text fields; it must still read as a text
  cursor. Hotspot at the centre.>

### Selection (`selection`)

<fill: selected text: background and text colour. It must look different from a comment highlight.>

### Comments (`comments`)

<fill: the comment highlight (never red, never wavy), the numbered pin, the grey "?" pin when its text
was edited away, and the note box.>

### Swoosh layers (`swoosh`)

<fill: the CSS layers and keyframes the three phases below need.>

## Swoosh

The one moment that has to feel like the theme: the old text goes, the new draft arrives.

### Before

<fill: what happens while the model thinks (can run for many seconds, loops until stopped). The old text
stays readable enough.>

### During

<fill: how the old text is visibly taken away and the new one revealed. It can be any motion (a wave from
the top, a sweep from the left, anything) as long as the swap is unmistakable. Duration.>

### After

<fill: the settle once the draft is readable, and how everything cleans up.>

### New mark

<fill: how the word "New" appears. It shows on the user's first three Refactors, then only if they turn
it on in the popup, so the theme must also look complete without it.>

## Rules check

- [ ] Only dresses reply boxes whose thread is on; off means plain Gmail.
- [ ] No text or tags on the box; the look itself says "on".
- [ ] Every Gmail text, icon, dropdown and the caret stays visible.
- [ ] Works on light and dark Gmail.
- [ ] Discard stays the last button.
- [ ] Comments are never red or wavy.
- [ ] Reduced motion: nothing moves, the draft still lands (the runner handles this).
- [ ] Nothing is ever written into the email.
- [ ] Every variant follows this document.
