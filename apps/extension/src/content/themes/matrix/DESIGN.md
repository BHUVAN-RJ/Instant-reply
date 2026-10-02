# Matrix: design

Status: approved 2026-10-01

Mockup: docs/design/matrix/mockup.html

The mockup was iterated with the user over several rounds (fonts and buttons in a buttons lab, six
frames, four scans and three swooshes); this document records what was picked.

## Idea

The reply box is a page with the Matrix showing faintly through it. Across the whole card, behind the
writing, the code rain falls: half width katakana mirrored as in the film, digits and a few symbols, a
slightly stronger head and a fading trail, all kept faint so the writing is always readable. The rain
loops lightly, pours for a moment when the box wakes up, and answers every key you type with a fresh
stream above the caret. Refactor is the big scene: a long green trace reads your old text letter by
letter while the rain pours, the world stops dead like bullet time, your words fall off the page as
code, and streams of code run down the page decoding the new draft, the "New" mark with it. It is for
the user's own inbox. It avoids the film's logo and title lettering, characters, faces and anything that copies a
specific frame; red appears only as the pill the user takes (see the switch).

This bends one house rule on purpose, at the user's request: "nothing moves on its own at rest". The
faint rain loops slowly on its own (0.3 of its full speed), speeds up for a moment
when the box wakes and when you type, pours while the model thinks, and stops dead for the swoosh. With
reduced motion it is a still frame.

## Variants

One variant, `phosphor`. Light and dark Gmail are not variants: the tokens swap the deep green ink for
phosphor on dark cards.

## Fonts and colours

- VT323 (SIL Open Font Licence) as "IR Terminal" for the buttons and the "New" mark: a CRT terminal
  face. Capitals, 0.08em apart, never bold: Refactor and the "New" mark at 23px (30px for "New"), Send
  at 22px, the switch at 18px. Picked in the buttons lab on 2026-10-01 over twelve other faces.
- OCR-A as "IR OCR" for small text (pin numbers, the note's hint and Delete, the font menu) and the
  Latin letters and digits in the rain, as on the film's posters. Public domain (the OCR-A font project
  on SourceForge).
- Both bundled in `public/fonts` (`vt323.woff2`, `ocr-a.woff2`). Fallbacks: `"VT323", ui-monospace,
  monospace` and `"OCR A Std", "OCR A Extended", ui-monospace, monospace`. The rain's katakana come from
  the system's Japanese face, mirrored; the film's own code face was never released and is not copied.
- Palette: black glass `#020a04`, terminal `#06140a`, dim green `#0f5c22`, mid green `#009e2a`,
  phosphor `#00ff41`, head white `#d9ffe0` (`#e6ffe9` on canvas), deep green ink `#0d2412`. Pills: blue
  `#3f78ff` to `#0a2780`, red `#ff3346` to `#6e0410`. Comment blue `#2b6cff`, stale grey `#8d8a93`.
- Glow `0 0 6px rgba(0,255,65,.55)`, hot glow `0 0 14px rgba(0,255,65,.85)`, scanlines 1px of
  `rgba(0,0,0,.24)` every 3px.
- Light cards: deep green glyphs and a mid green edge on white. Dark cards: phosphor. The swoosh is
  the same on both.

Colour roles (variant `phosphor`):

- edge: deep green `#0d2412` on light cards, phosphor `#00ff41` on dark (16.4:1 on white, 11.8:1 on
  `#202124`)
- accent: phosphor `#00ff41`
- strong: mid green `#009e2a` (3.5:1 on white, 4.5:1 on `#202124`)
- onStrong: black `#000000` (5.9:1 on `#009e2a`)

## Slots

### Tokens (`tokens`)

`--mx-glass`, `--mx-term`, `--mx-dim`, `--mx-mid`, `--mx-ph`, `--mx-white`, `--mx-edge` (deep green or
phosphor), `--mx-line` (mid green or phosphor), `--mx-code` (`#00a82d` or phosphor, for code drawn over
the text), `--mx-glow`, `--mx-glow-hot`, `--mx-scan`, `--mx-mono` (the OCR-A stack); dark values under
`[data-ir-theme="dark"]`. `--ir-paper` is read from Gmail.

### Card (`card`)

The code rain fills the whole card, faintly, behind the writing:

- The paper: `--ir-paper`, shaped by the frame.
- The rain: a canvas over the paper (still under the text), 13px cells of mirrored katakana and digits.
  Each column is a stream 6 to 17 glyphs long with a slightly stronger head and a trail fading to
  nothing. Strength 0.14: trail mid green `#009e2a` (light) or phosphor (dark) at up to 14%,
  head deep green (light) or head white (dark) at up to 25%. No black and no glow, so the text always
  reads. It loops lightly at rest (0.3 of its full speed of 16 rows a second), pours (1.2) for 0.6s when
  the box wakes, restarts the stream above the caret on every key, pours (1.5) while the model thinks and
  stops dead for the swoosh; after a burst it eases back to the loop over about 0.55s.

The frame is the HUD (picked 2026-10-01 over box drawing, CRT, pixel, code edge and glass), a modern
heads-up display outline:

- The top left and bottom right corners are cut at 45 degrees, 16px; the paper and the rain take the
  same shape.
- A 1px line all round, mid green at 60% (phosphor on dark), following the cuts.
- A bright 72 by 3px segment in mid green (phosphor on dark) with a 6px glow, starting right after each
  cut: along the top from the top left cut, along the bottom towards the bottom right cut.
- Tick marks: a 132px row of 2px ticks every 8px, 7px above the top right; a 64px column of the same
  ticks, 7px left of the bottom left.

Gmail's own rounding and shadow are cleared. In a window there is no frame (see Compose window).

### To line (`head`)

The **rule** (default, and always under Subject in a window): a plain 1.5px line in mid green (phosphor
on dark) with a soft 5px glow, ending at the To line's bottom, 14px in from each side. No glyphs.

The **band** (optional, off by default): black glass with scanlines behind the To line, a 1px phosphor
bottom line with an 8px glow, and faint still rain fading in towards the right. The To line's text turns
phosphor and its chips become terminal green `#06140a` with a dim green inset line.

### Body (`body`)

Room above the text for the rule. Gmail paints the writing area white; the theme clears that (only the
writing area's containers, never anything inside the email) so the faint rain runs behind the text as
well, as the user asked on 2026-10-01. The text keeps Gmail's colours and reads over the rain at 14%.

### Formatting bar (`formatBar`)

No fill: the bar sits on the paper between two 1px dashed hairlines in mid green at 45% (phosphor on
dark), like the shell buttons' underlines. Buttons and dividers are deep green (phosphor on dark); the font
menu is in IR OCR. Hover: a 14% green wash and the button turns mid green; pressed: a 30% wash. In real
Gmail the bar's icons are images, so they get `filter: brightness(0) invert(1) sepia(1) saturate(5)
hue-rotate(70deg)` on dark cards and stay Gmail's on light ones.

### Pinned Send row (`pinnedRow`)

When Gmail pins the Send row, the row gets its own paper and the HUD line on its sides and bottom (with
the bottom right cut and its bright segment), so the card still reads as one piece.

### Compose window (`window`)

Nothing is drawn outside the window. The same faint rain fills the box from below the To and Subject
rows down (so the form fields stay plain Gmail), with square corners and no edge. The rule runs under
Subject. The switch shrinks to its pill alone (34px wide; the tooltip names it); Refactor and Send
drop to 18px text with 6px padding, and the schedule arrow sits 3px from Send, so Gmail keeps room for
its toolbar icons. Typing feeds the rain the same way.

### Switch (`toggle`)

A shell line with the pills (the switch gets its own design round; the pills are placeholders).

- Off: no box, "INSTANT REPLY" in IR Terminal 18px, deep green (phosphor on dark cards), a 1px dashed
  mid green underline, and a glossy blue pill (24 by 11px, tilted -18 degrees) in front. Hover: the
  text turns mid green and the underline goes solid.
- On: the text and a solid underline in mid green (phosphor on dark), and the pill turns red and tilts
  to 18 degrees.
- Focus: 2px mid green outline 2px outside.
- In a window: the pill alone, 34px wide.

The red pill is the theme's only red. It is a capsule, never near text or comments, so it does not read
as an error; if it does in Gmail, it falls back to a phosphor pill with the same gloss.

### Refactor (`refactor`)

Shell (picked in the buttons lab on 2026-10-01): a command on a shell line. No box: a dim `$` prompt
(mid green at 55%), "REFACTOR" in IR Terminal 23px deep green (phosphor on dark cards), and a 1px dashed
underline in mid green at 70%. 36px tall, 10px padding.

- Hover: the `$` turns into `>`, the text and the underline turn mid green (phosphor on dark) and go
  solid, a block cursor (0.5em by 0.85em) blinks after the word (1.06s), and the label decodes (every
  letter scrambles through capitals and digits, then locks, left to right, 320ms).
- Press: the line jumps 3px forward, like Enter, with a 2px underline and the text in the hot colour
  (`#007a20` on light cards, head white on dark), 40ms.
- Working: label "TRACING". The prompt is a blinking `>` (0.5s) and the letters run a trace (cycling,
  locking into place one by one, holding, starting again). Not clickable.
- With comments: "REFACTOR (2)".
- Focus: 2px mid green outline 2px outside.
- In a window: 18px text, 6px padding.

### Send (`send`)

The same shell line as Refactor: Gmail's blue pill is cleared, "SEND" in IR Terminal 22px with the dim
`$` prompt and the dashed underline. The schedule arrow is its own short line 6px to the right.

- Hover (each half): text and underline turn mid green and solid; on Send the `$` turns into `>`, the
  block cursor blinks and "SEND" decodes.
- Press: 3px forward, 2px underline, hot colour.
- Focus: 2px mid green outline 2px outside.
- On light cards (asked for on 2026-10-01, so Send stands apart from Refactor): Send is the one real
  key. A solid pale green fill (mid green mixed 10% into the paper, so the rain stays behind it), a 1px solid mid green edge at 55%, 2px corners, a 2px mid
  green shadow below and a white inner highlight on top, 34px tall; the arrow is joined to it behind a
  1px divider. Hover: the fill goes to 18% and the edge to full mid green. Press: down 2px, the shadow
  gone, fill 26%, text in the hot colour. The `$` prompt, the blinking block and the decode stay. Dark
  cards keep the plain shell line.

### Toolbar icons (`icons`)

Pixel glyphs on a 20px grid built from 2px squares, like terminal bitmaps, drawn as `background-image`
SVGs: deep green `#0d2412` on light cards, phosphor on dark. Hover: a black glass tile with a phosphor
inset line and inner glow, the glyph turns phosphor and lifts 1px, and three drops of rain (2px streaks
12 to 22px long with white heads, at 8, 16 and 24px across) fall through the tile once at three
different speeds (700ms).

- format: a blocky letter A over a full width bar.
- attach: a paper clip as nested stepped loops.
- link: two open brackets joined by a bar, a chain link.
- emoji: a square face with stepped corners, two dot eyes and a stepped smile.
- drive: a stepped solid triangle on a base bar.
- photo: a frame with a stepped mountain and a square sun.
- signature: a zigzag squiggle with a stepped pen stroke rising to the right over a baseline.
- meet: a calendar with two rings, a thick top bar and a grid of five cells.
- more: three stacked 4px squares.

### Discard (`discard`)

A pixel trash can (lid, handle, walls and two slats) at 26px, still the last button. Hover: the same
black tile; the glyph turns head white and derezzes, sliced and shifted sideways in four steps (300ms).
No red.

### Avatar (`avatar`)

The residual self image: the photo is cut square (2px corners), coded green (`grayscale`, `sepia`,
`hue-rotate(65deg)`, `saturate(3.4)`), ringed with 1px black and 2px phosphor plus a 14px glow. No
overlay on it: in Gmail the avatar's wrapper is much bigger than the photo, so scanlines on it striped
the whole card. Hover: the photo goes back to its real colours (350ms). No ornament.

### Caret (`caret`)

Mid green `#009e2a` on light cards, phosphor on dark.

### Cursor (`cursor`)

Pixel shapes, still, with a halo so they read on white and on dark. Only over an active box.

- Arrow: the classic 12 by 19 pixel arrow (the standard shape, tail down and to the right), drawn at
  1.5px a pixel: black glass fill, phosphor edge, a 1 pixel black halo. 21 by 32px. Hotspot at the tip
  (2, 2).
- Hand: the same arrow lit: phosphor fill, black edge, a 1 pixel white halo. Over buttons, icons,
  links, options, the font menu and pins.
- Text cursor: a stepped I-beam (4px stem, 12px serifs), phosphor with a black outline. Hotspot at the
  centre (13, 13).

### Selection (`selection`)

Mid green `#009e2a` with black text; clearly apart from the blue comment wash.

### Comments (`comments`)

The passage gets an 18% comment blue wash with a straight 1px blue underline. The pin is an 18px square
blue block, its number in IR OCR white, a faint blue glow; hover lifts it 1px and turns the glow up.
A stale pin is grey with "?" and no glow. The note is a black glass panel with scanlines, a 1px phosphor
edge and glow, head white text, a green IR OCR hint, and a square outline Delete that fills phosphor
on hover.

### Swoosh layers (`swoosh`)

`.mx-ghost` (a copy of the text with every letter in its own fixed width box, `.mx-c`, so letters can
swap for code without moving), `.mx-c.hot` (mirrored green glyph), `.mx-readhead` (the trace line and
its block), `.mx-seen` (the old text turning green), `.mx-dec` with `.on` and `.locked` (the draft
decoding), a canvas for the falling code, `.mx-plate` for "New", and the keyframes `mx-breathe`,
`mx-blink`, `mx-lock`, `mx-power`, `mx-drop` and `mx-derez`.

## Swoosh

### Before

The trace (S1). While the model thinks, the card's rain pours at 1.5 times its speed, the card edge
breathes every 1.2s, and Refactor's label runs its trace. A copy of the old text lies over the writing
area on paper; a read head moves through it letter by letter at 36 letters a second: a 2px line under
the last ten letters, fading in from behind to a head white tip, with a 7 by 15px block after it. Each
letter it reaches turns into a mirrored green glyph and stays code until the head is eight letters past,
so the text stays readable. At the end it pauses (about 0.4s) and starts again. No glitches.

### During

Rain decodes (D1), about 2.5s. The card's rain stops dead (bullet time). The old text turns green
(220ms) and holds (260ms), then falls apart as code: each letter becomes a mirrored glyph that flickers
and drops with gravity, from the left with up to 260ms of scatter, fading over 0.9s. No black curtain:
the paper stays visible throughout. Streams of code (white heads, 14 glyph trails fading out) fall down
the writing area in 14px columns, each starting 260 to 640ms in and taking 600 to 940ms to cross. The
draft is written underneath first; a copy of it shows nothing until the stream in a letter's column
passes it, then that letter jumbles through mirrored code, capitals, small letters, digits and a few
symbols (a new one on most frames) for 0.7 to 1.4s before locking into the real letter, with a short
green glow as it locks; about a third glitch once more for 130ms within half a second. The swoosh ends
when every letter has locked and the streams have left.

### After

No effects. The swoosh ends when the draft (and the "New" mark) have decoded; no flicker, no ripple,
no burst. The card's rain simply goes back to its light loop.

### New mark

It arrives with the code rain, not after it: a black glass plate with scanlines and a phosphor edge at
the top right of the writing area appears as the new text starts coming in (420ms into During), and
"NEW" in IR Terminal 30px decodes in it like the draft's letters (mirrored glyphs that lock into N, E
and W one after another, about 200ms apart). It holds 1.5s, then fades (0.5s).
Without it, the swoosh ends when the last letter of the draft locks.

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
