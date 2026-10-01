# Themes

Instant Reply rests on two things: **getting all the information** (the thread, the box, comments,
the voice; `packages/core` and `content/gmail.ts`) and **making it look pretty** (theme packs). They
are kept apart so a theme can change everything you see without touching what the extension does.

This guide is for anyone, human or agent, adding or changing a theme. Its companions:

- `docs/themes/DESIGN_LANGUAGE.md`: how to design one. The canvas (inline replies and Gmail's compose
  window), colour roles, shape and motion language, states, cursors, the swoosh, variants, a design
  process, and mistakes already made. Read it before designing anything.
- `docs/themes/DESIGN_TEMPLATE.md`: the form every theme fills in as its `DESIGN.md`.
- `apps/extension/src/content/themes/fragpunk/DESIGN.md` and `.../beach/DESIGN.md`: two approved,
  very different themes. Read both; they solve every slot two ways.
- The preview: `npm run preview` from the repo root, then open the printed address (port 5199 unless it
  is taken). It runs every registered theme's real code on a stand in for Gmail. See "The preview".

## What a theme pack is

A folder in `apps/extension/src/content/themes/<id>/`:

| File | What it holds |
| --- | --- |
| `DESIGN.md` | The design, one section per element. Written and approved **before** any code. |
| `meta.ts` | Id, name and variant ids. The popup reads only this. |
| `index.ts` | The pack: `defineTheme({...})`, following `content/theme/contract.ts`. |
| `styles.ts` | One CSS string per slot, and `variantCss` for per variant colours. |
| anything else | The swoosh animation, palettes, glyphs, whatever the theme needs. |

The contract (`content/theme/contract.ts`) lists what every pack must provide. All of it is required;
TypeScript fails the build if anything is missing.

- **CSS slots:** tokens, card, head, body, formatBar, pinnedRow, window, toggle, refactor, send, icons,
  discard, avatar, caret, cursor, selection, comments, swoosh. A slot that should stay as Gmail draws it
  uses `plain("why")`.
- **Labels:** the Refactor button at rest and while working.
- **Variants:** every variant id in `meta.ts`, `pickVariant(now)` and `variantCss(id)`. Variants belong
  to the pack (time of day palettes, moods, seasons), change colours only, and all follow the same
  DESIGN.md.
- **Colour roles:** `roles(variant)` returns edge, accent, strong and onStrong. `strong` (selection, the
  hand, the text cursor, focus rings) must reach 3:1 on white and on dark; the tests check it.
- **Skin:** the markup drawn behind the reply card (`.ir-skin`), sized to the card for you.
- **Ornament:** extra elements placed around the box (Beach's flower crown), or `noOrnament`.
- **Swoosh:** three phases around Refactor:
  - `before`: loops while the model thinks; returns a stop function.
  - `during`: shows the old text going and the draft arriving; calls `write` once; resolves when the
    draft is readable.
  - `after`: the settle and, when `ctx.showNew`, the "New" mark. "New" shows on the user's first three
    Refactors, then only if they turn it on in the popup, so the theme must look complete without it.

### Layouts and To line styles

The same reply box shows up in two layouts, and its To line in two styles. Every theme designs all of
them; the selectors are in `content/theme/shared.ts`:

| Selector | When | What the theme does |
| --- | --- | --- |
| `CARD` | a reply inline in a thread, inside Gmail's rounded card | the full design: card edge, avatar, buttons |
| `WINDOW` | a new email, or a reply popped out: Gmail's 600px window, no card, no avatar | the `window` slot: draw only inside the window, leave To and Subject on paper, compact switch and Refactor |
| `RULE` | the default for replies, and always in a window | a line between the To line (or Subject) and the body; the To line stays plain Gmail |
| `BAND` | only when the user ticks "Decorate the To line of replies" in the popup | the To line band (FragPunk's ink bar, Beach's lagoon water), and the To line's text colours |

Rules that recolour `[data-ir-head]` (the To line) must sit under `BAND`, never `BOX` or `CARD`: the
tests fail otherwise, because they would paint over the compose window's form fields.

### Helpers

`content/theme/shared.ts` has the class names and selectors (`BOX`, `CARD`, `WINDOW`, `BAND`, `RULE`,
`EDITOR`, `TEXT_FIELDS`, `CLICKABLE`), `boxCursors` (wires the arrow, hand and text cursor),
`iconBase` (hides Gmail's icons and gives each button a glyph layer), `clearSendGroup`, `svgUri`,
`svgCursor`, and for the swoosh `ghostOf`, `sizeCanvas`, `areaOf`, `unionIn`, `place`. Themes style
the class names; they never rename them. Reuse these before writing new ones.

What a theme gets for free and cannot break (`content/theme/stylesheet.ts`, `content/theme/run.ts`,
`content/theme/layout.ts`): layout mechanics, the skin sized to the card and clipped inside a window,
light or dark detection, reduced motion (nothing moves, the swoosh is skipped, the draft still lands),
and the draft being written exactly once even if a phase throws.

## Adding a theme

1. **Read first.** This guide, `docs/themes/DESIGN_LANGUAGE.md`, the contract, the template, and both
   existing DESIGN.md files, with the preview open on each theme.
2. **Design every element.** Copy the template to `themes/<id>/DESIGN.md` and keep `Status: draft`.
   For each slot, both layouts, both To line styles, the three cursors and the four swoosh phases,
   come up with two or three ideas from the theme's world, pick one, and write it down concretely:
   shape, colour with hex, size in pixels, every state, timing. Decide the variants, the rule that picks
   them, and the colour roles for each. Make sure it all reads as one look. A mockup page in
   `docs/design/<id>/` helps when motion is hard to describe. Do not write theme code yet.
3. **Get approval.** Show the user the DESIGN.md (and a mockup if you made one) and ask. Only their yes
   sets `Status: approved YYYY-MM-DD`; never set it yourself. If they want changes, change DESIGN.md and
   ask again.
4. **Build.** Write the pack, then register it in `content/themes/index.ts` and `src/theme-list.ts`.
   Once registered, the tests check it (and require the approved status, which is why registering
   comes after approval). Fonts go in `apps/extension/public/fonts`, open licence only.
5. **Test.** `npm test` and `npm run build` must pass. The tests check that DESIGN.md is approved and
   covers every slot, swoosh phase, cursor, colour role and variant; that every slot is filled or
   explicitly plain; that fonts exist and are used; that variants are only ones the pack ships; that
   the strong colour reads on white and dark; that comments are never red or wavy; that cursors are
   still and at most 32px; that To line rules sit under `BAND` and a `RULE` style exists; that the
   window design is scoped to the window; and that the stylesheet keeps its guardrails.
6. **Check in the preview.** Go through every section for your theme, every variant, light and dark,
   the To line band on and off, and `&wide`. Fix what looks wrong, in DESIGN.md first if it changes the
   design.
7. **Hand over.** Tell the user to reload the extension (`npm run build`, then reload it on
   chrome://extensions) and pick the theme in the popup to check it live in Gmail.

## Changing a theme

Change DESIGN.md first and get it approved, then the code. A variant never adds new shapes or motion
on its own: if it needs to, the change goes into DESIGN.md for every variant.

## The preview

`npm run preview`, then open `http://localhost:5199/?theme=<id>`. Query options: `variant=<id>` (or pick
"all variants" in the bar), `wide` (reply boxes at full page width, where pixel versus percentage bugs
show). The bar also toggles the "New" mark, the To line band, and how long the fake model thinks.
Sections:

- **Reply box:** light and dark, comments already placed (a numbered pin, a stale pin, an open note),
  Refactor end to end with a fake model, and a thread that is off (plain Gmail).
- **Compose window:** a new email and a popped out reply, light and dark.
- **States:** every state of the switch, Refactor, Send, icons and Discard, forced side by side.
- **Cursors:** the three cursors on white and dark, and areas to try them.
- **Colour roles:** each role's contrast, flagged when too weak.

## Rules for every theme

- Only dress reply boxes whose thread is on; off means plain Gmail.
- No text or tags on the box; the look itself says "on".
- Every Gmail text, icon, dropdown and the caret stays visible; colours follow Gmail's light or dark
  theme.
- Discard stays the last button.
- Comments are never red or wavy (that reads as a mistake).
- Nothing is ever written into the email; everything drawn is an overlay.
- In a window, draw only inside it, and leave To and Subject in Gmail's colours.
- The To line band stays optional; the rule is the default.
- Sizes of tears, jags and wobbles are in pixels, never percentages.
- The swoosh must make the swap unmistakable: the old text visibly goes, the new one arrives.

## Cost

Themes are bundled into the content script: the stylesheet is built once when the theme changes, and
the swoosh only runs during a Refactor. Each theme adds its CSS and animation code to the bundle (20 to
40 kB each today, before gzip). Past a handful of themes, load packs on demand instead.
