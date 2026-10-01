# Instant Reply design language

Read this before designing a theme, human or agent. It explains the canvas you are designing on, the
jobs every theme must do, and how to make a theme feel like one coherent thing. `docs/THEMES.md` is the
process; `DESIGN_TEMPLATE.md` is the form you fill in; this is how to think while filling it in.

Look at the two existing themes side by side in the preview while reading: `npm run preview`, then open
the printed address (`?theme=fragpunk`, `?theme=beach`).

## 1. What a theme is for

Instant Reply stands on two things: getting all the information (the thread, the box, the user's voice)
and making it look pretty. A theme is the second half. Its jobs, in order:

1. **Say "on" without words.** When a thread is on, the reply box is dressed; when it is off, Gmail is
   untouched. No labels, no badges. The look itself is the signal.
2. **Never cost readability.** The user's text, Gmail's icons, dropdowns and the caret stay visible and
   legible on light and dark Gmail. Decoration lives around and behind the writing, never on it.
3. **Make Refactor a moment.** The swoosh is the one place the theme performs: the old text visibly
   goes, the new draft arrives.
4. **Be one thing.** Every element, from the card edge to the cursor, comes from the same world.

## 2. The canvas

Gmail's reply box, as the extension sees it (measured roughly; check live):

```
 avatar   card (about 880px wide, rounded, white or dark grey)
 (40px)  ┌──────────────────────────────────────────────────────────────┐
  ( )    │ To  Alex Rivera                                       [pop]  │  To line, about 40px    (head)
         ├──────────────────────────────────────────────────────────────┤
         │ Hi Alex,                                                     │  body, 120px and up,     (body)
         │ Can we move the review to Thursday?                          │  13.5px Arial text
         │                                                              │
         │ [ Sans Serif | B I U | ≡ ]                                    │  formatting bar          (formatBar)
         │ [Send|▾] [Refactor]  A 📎 🔗 ☺ △ ▣ ✎ ▦ ⋮      [switch]  [🗑]  │  Send row, 36px buttons  (send, refactor,
         └──────────────────────────────────────────────────────────────┘   icons, toggle, discard)
```

What a theme may do to each part:

| Part | Handle | Restyle in place | Draw behind or over | Never |
| --- | --- | --- | --- | --- |
| Card edge | the skin (`.ir-skin`) sized to `[data-ir-card]` | | yes: any shape, shadow, sheet | move or resize the card |
| To line | `[data-ir-head]`, `--ir-head` on the skin | text and icon colour, only with the band on | yes: an optional band behind it | hide recipients |
| Body | `table.iN`, the editor | spacing above it | only during the swoosh | tint or cover the text at rest |
| Formatting bar | `.J-Z[role="toolbar"]` | yes | | reorder buttons |
| Send and arrow | `.dC`, `.T-I.aoO`, `.T-I.hG` | yes, fully | | change what it does |
| Refactor, switch | `.ir-refactor`, `.ir-toggle` | yes, fully (these are ours) | | add text beyond the label |
| Toolbar icons | `[data-ir-icon="<name>"]` | swap the glyph, add a backdrop | | move them |
| Discard | `[data-ir-icon="trash"]` | glyph, size | | move it off the end |
| Avatar | `[data-ir-avatar]`, `[data-ir-avatar-wrap]` | shape, ring, shadow | an ornament (Beach's crown) | replace the photo |
| Pinned Send row | `.aDj.ahe` | continue the card edge | | |

**The window layout.** The same box also appears inside Gmail's own window: a new email (Compose), or a
reply popped out of a thread. There it has no rounded card and no avatar; Gmail's title bar sits above
it, the To line becomes To and Subject rows (form fields), and the window is about 600px wide and
scrolls. The box carries `data-ir-layout="window"` (card replies do not), and every theme designs it in
the `window` slot:

```
 ┌──────────────────────────────────────────────┐
 │ New Message                         _  ⤢  ✕  │  Gmail's title bar: not ours
 ├──────────────────────────────────────────────┤
 │ To  alex@example.com                  Cc Bcc │  form fields: keep them on paper,
 │ Subject                                      │  in Gmail's colours; mark them with a line
 ├──────────────────────────────────────────────┤
 │ body                                         │
 │ [ formatting bar ]                           │
 │ [Send|▾] [Refactor] A 📎 ⋮       [sw]  [🗑]  │  compact switch and Refactor, or Gmail
 └──────────────────────────────────────────────┘  hides toolbar icons to make room
```

Rules for the window: draw only inside it (the skin is clipped to the box; anything outside would add a
scrollbar), never recolour the To and Subject rows (scope To line rules to `CARD`, not `BOX`), and make
the switch and Refactor compact. Use `CARD` and `WINDOW` from `theme/shared.ts` to target one layout.

**The To line has two styles.** The **band** behind the To line of an inline reply is the loudest thing
a theme draws, so it is off by default and the user turns it on in the popup ("Decorate the To line of
replies"). Without it the To line is plain Gmail and a **rule** separates it from the body (FragPunk's
crooked ink strip, Beach's foam line); the rule is also what a window shows under Subject. Design both in
the head slot: band rules under `BAND`, rule rules under `RULE` (`theme/shared.ts`).

**Size details in pixels, not percentages.** A torn edge drawn as a percentage of the width turns into
one obvious 10px step on a wide card and gives the trick away. Keep tears, jags and wobbles a few pixels
deep at any width.

Sizes to design for: a card 600 to 1000px wide, a body from about 120px to very long, Send 36px tall,
toolbar buttons about 32px with 20px glyphs, a 40px avatar. Test short and long drafts.

## 3. Colour roles

Every theme fills the same colour jobs, per variant (`roles()` in the pack; the tests check them):

| Role | Job | Rule |
| --- | --- | --- |
| `edge` | outlines, the card edge, glyph ink | readable against the card; on dark cards use a light edge (FragPunk swaps ink for paper through `data-ir-theme`) |
| `accent` | the signature colour: what makes the theme recognisable at a glance (Refactor, hover backdrops) | used on shapes, not on body text |
| `strong` | selection, the hand, the text cursor | 3:1 or more against white **and** against dark (`#202124`) |
| `onStrong` | text on `strong` | 3:1 or more against `strong` |
| paper (`--ir-paper`) | the card's own background, read from Gmail | never replaced, only shown through |
| comment blue | comment highlights and pins | shared by every theme so comments always read the same; never red, never wavy |

Pale colours (cream, pastel yellow, light gold) make good fills and terrible `strong` colours: Beach's
first selection colour was a pale yellow that barely showed on white. The preview's colour roles section
shows each role's contrast and flags weak ones.

## 4. Shape language

Pick **one** family of shapes and give every element a member of it. Decide the family first; the
elements follow.

| Element | FragPunk (torn sticker zine) | Beach (island from above) |
| --- | --- | --- |
| Family | flat fills, thick ink edges, torn outlines, hard offset shadows, a few degrees off straight | soft rounded shapes, thin leaf edges, white outlines, petals, water and sand |
| Card | torn sheet with an acid sheet behind and a magenta shadow | round card with a thin leaf edge |
| To line | crooked ink bar with an acid slab | shallow lagoon water ending in scalloped foam |
| Send | one ink torn sticker split by an acid seam | sea glass pebble |
| Refactor | torn acid sticker, tilted | wavy coral banner with a plumeria |
| Switch | dashed outline, then a torn magenta sticker | lens with a bud that opens into a flower |
| Icons | chunky square cut glyphs, torn acid block on hover | rounded line glyphs on petals |
| Discard | bigger trash can, magenta block | sand pail |
| Avatar | cut into a tilted octagon sticker | leaf ring and a flower crown |
| Cursors | acid shapes, ink edge, magenta hard shadow | rounded, white outline, sea glass and coral |
| Comments | acid highlighter streak, torn blue pin | lagoon blue wash, blue petal pin |

A good test: cover the labels and ask whether every element could only belong to this theme.

## 5. Type

- One display face for the theme's own labels (Refactor, the switch, Send, the "New" mark). Bundle it in
  `public/fonts` with an open licence and a fallback stack.
- The user's text, Gmail's recipient chips and menus keep Gmail's fonts. Never restyle the body text.
- Labels stay short: Refactor's label is one word (plus the comment count Instant Reply adds).

## 6. Motion language

Pick **one** verb for how things react and use it everywhere. FragPunk stamps and tilts (hover swings a
few degrees, press stamps down 2px). Beach floats (hover bobs up 1 to 2px, press sinks 1px).

- Hover: 120 to 150ms. Press: 40 to 50ms. Nothing bounces for longer than half a second at rest.
- Nothing moves on its own at rest. Motion answers the user, or it is the swoosh.
- Reduced motion switches everything off; the runner and the stylesheet guardrail do this for you, so the
  theme must still look complete when nothing moves.

## 7. States

Every interactive element needs every state designed. The preview's States section forces them side by
side; empty or identical states are the most common gap.

| Element | States |
| --- | --- |
| Switch | off, off hover, on, on hover, focus |
| Refactor | rest, hover, press, working (label changes, not clickable), with comments "(2)", focus |
| Send and arrow | rest, hover (each half), press, focus |
| Toolbar icons | rest, hover, pressed (formatting bar) |
| Discard | rest, hover |
| Comment pin | numbered, stale ("?", grey), hover |
| Note box | open with text, with Delete |

Focus must stay visible: draw focus rings in the `strong` role colour, which is guaranteed to read on
white and dark. Clip paths cut off anything outside the shape, so on a clipped element put the ring
inside it (FragPunk uses `outline-offset: -7px` on its torn stickers).

Check every state on dark Gmail too: an "off" state in a dark colour (Beach's leaf green switch) sinks
into a dark card and needs a lighter dark mode version.

## 8. Cursors

Cursors are what the user sees most, so they get their own design pass. Three, as one family with the
buttons: the **arrow** over the box, the **hand** over anything clickable, the **text cursor** over the
writing area and text fields. 32px at most, still (no animation), clear on white and on dark (outline
them), hotspot at the arrow tip and the centre of the I-beam. They only change over an active reply box.
`boxCursors()` in `theme/shared.ts` wires all three.

## 9. The swoosh

The theme's one performance, around the model's answer:

- **Before** (while the model thinks, one to many seconds): a calm loop that says "working" in the
  theme's language. It may touch the old text but keeps it readable. FragPunk: the text flickers out of
  register. Beach: small waves lap at the top edge.
- **During** (0.6 to 3s): the old text visibly goes and the new one arrives. Any motion works (a sweep
  from the left, a wave from the top, pages turning, a stamp), as long as the swap is unmistakable. The
  draft is already written underneath; the theme animates copies over it.
- **After**: the settle, and everything the swoosh drew is removed. It must feel finished without the
  "New" mark.
- **New mark**: the word "New", shown on the user's first three Refactors and then only if they turn it
  on. Make it part of the world (FragPunk's slammed sticker, Beach's crab holding a sign), not a badge.

## 10. Variants

Variants belong to the pack: time of day, seasons, moods. They change **colours only**, never shapes or
motion; if a variant needs new shapes, the change goes into DESIGN.md for every variant. Each variant
fills the colour roles and passes the same contrast checks. Document the rule that picks one.

## 11. How to design a theme

1. **World.** Write the idea in a paragraph: where it comes from, the feeling, who it is for, and what to
   avoid (logos, characters, anything that reads as an error).
2. **Family.** Decide the shape family, the motion verb, the display font and the colour roles.
3. **Ideas per element.** For every row of the canvas table, both layouts (card and window), both To
   line styles (band and rule), the three cursors and the four swoosh phases, sketch two or three ideas
   from the world, then pick one. Keep the rejected ones out of the docs.
4. **Write DESIGN.md** from the template, concretely: shapes, colours with hex, sizes in pixels, every
   state, timings. Keep `Status: draft`.
5. **Approval.** Show the user DESIGN.md (and a mockup if the motion needs one). Only their yes sets
   `Status: approved`. Then build.
6. **Build and preview.** Implement, register the theme, then check every section of the preview:
   both Gmail modes, every variant, every state, both layouts, the band on and off, `&wide`, cursors,
   colour roles, Refactor with and without "New". If something has to change, change DESIGN.md first
   and tell the user.

## 12. Mistakes we have already made

- A pale selection colour that vanished on white (Beach, fixed with a strong role colour).
- Animated cursors: flaky across systems and tiring; cursors stay still.
- Clip paths that hid the focus ring (FragPunk switch and Refactor; fixed with an inside ring).
- Details drawn on the accent in the card's ink colour, which turns light on dark cards and vanishes on
  the accent (FragPunk's emoji face; fixed: details on the accent are always ink). A thick outline to fix
  a crossing line then turned the paper clip into a blob on light (fixed with a card coloured halo).
- Focus rings and off states in dark palette colours that disappear on dark cards (Beach's night focus
  ring and dark mode off switch; fixed with the strong colour and a light off state).
- A Send row wider than a narrow card (design for about 600px, not only 880px).
- Designing only the inline reply: in a new email the card skin wrapped Gmail's whole window, spilled
  past its edge into a scrollbar, painted the To and Subject fields dark (leaving a white input and grey
  labels), and the full size switch pushed six toolbar icons into Gmail's overflow menu. Fixed with the
  `window` layout and slot.
- Tears drawn as a percentage of the width (FragPunk's right edge): one obvious 10px step on a wide card
  that gave the trick away. Fixed with tears a few pixels deep.
- A pale fill behind Gmail text that turns light in dark mode (Beach's formatting bar): the text
  vanished. Fixed with a faint tint on dark cards.
- A full To line band by default: too much. It is now optional (off by default) with a plain rule as
  the default.
