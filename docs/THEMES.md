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
- The mockup kit (`docs/design/kit/`): how designs are drawn and iterated before any theme code. See
  "Mockups".
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
   come up with two or three ideas from the theme's world and write them down concretely: shape,
   colour with hex, size in pixels, every state, timing. Decide the variants, the rule that picks them,
   and the colour roles for each. Do not write theme code yet.
3. **Mock it up.** Copy `docs/design/kit/starter.html` to `docs/design/<id>/mockup.html` and draw the
   design with the kit: one option tab per direction you are weighing, real selectors, every section
   (reply box, compose window, states, cursors), the swoosh prototyped with the Refactor button, and
   sliders for any numbers that need feel. A separate lab page next to it is fine for a complex motion
   (Beach's `wave-tuning-lab.html`).
4. **Iterate with the user.** Open the mockup for them (it opens from disk), ask which option and what
   to change, revise, and repeat. Each round, update DESIGN.md to match the option being kept. When one
   direction is picked, delete the other options from the mockup (docs keep decisions, not
   explorations), and add a `Mockup:` line to DESIGN.md naming the file(s).
5. **Get approval.** Ask for a yes on DESIGN.md and the final mockup together. Only their yes sets
   `Status: approved YYYY-MM-DD`; never set it yourself. If they want changes, go back to step 4.
6. **Build.** Port the mockup's CSS into the pack's `styles.ts` (same selectors, now split by slot and
   using the helpers) and its swoosh into the pack's code, then register it in `content/themes/index.ts` and `src/theme-list.ts`.
   Once registered, the tests check it (and require the approved status, which is why registering
   comes after approval). Fonts go in `apps/extension/public/fonts`, open licence only.
7. **Test.** `npm test` and `npm run build` must pass. The tests check that DESIGN.md is approved, names
   a mockup that exists, and covers every slot, swoosh phase, cursor, colour role and variant; that every slot is filled or
   explicitly plain; that fonts exist and are used; that variants are only ones the pack ships; that
   the strong colour reads on white and dark; that comments are never red or wavy; that cursors are
   still and at most 32px; that To line rules sit under `BAND` and a `RULE` style exists; that the
   window design is scoped to the window; and that the stylesheet keeps its guardrails.
8. **Check in the preview.** Go through every section for your theme, every variant, light and dark,
   the To line band on and off, and `&wide`. Fix what looks wrong, in DESIGN.md first if it changes the
   design.
9. **Hand over.** Tell the user to reload the extension (`npm run build`, then reload it on
   chrome://extensions) and pick the theme in the popup to check it live in Gmail.

## Changing a theme

Start from the shipped look: `npm run mockup:snapshot -- <id>` writes it into
`docs/design/<id>/mockup.html` (add `--force` to replace an older one). Add your change as a second
option next to "Current", iterate with the user, then update DESIGN.md, get it approved, and only then
change the code. A variant never adds new shapes or motion
on its own: if it needs to, the change goes into DESIGN.md for every variant.

## Mockups

Mockups are how a design is shown, compared and tuned before it is built. Every theme keeps its final
mockup in `docs/design/<id>/` and names it on a `Mockup:` line in DESIGN.md (the tests check the files
exist).

The kit (`docs/design/kit/`): `mockup-kit.js`, `mockup-kit.css` (it reuses the preview's Gmail stand
in, so a mockup and the shipped theme sit on the same markup), and `starter.html`, a small working
example to copy. A mockup page is plain HTML that opens from disk:

- Each option is one `<style>` block written against the real selectors (`.ir-active-box`,
  `[data-ir-layout="window"]`, `[data-ir-head-style="rule"]`, `.ir-skin`, `.ir-toggle`, ...); the tabs
  in the bar switch between them. The kit already includes what every theme gets for free.
- `MockupKit.start({ title, options, variants, skin, labels, tune, swoosh, ornament })`: variants become
  `data-ir-variant`, `skin` is the markup behind the card, `tune` adds sliders (values persist and can
  be copied), `swoosh` has the contract's `before`, `during`, `after` with
  `ctx.ghost()`, `ctx.layer()` and `ctx.tune`.
- Sections: reply box (light and dark, comments placed, the Refactor button runs your swoosh, a thread
  that is off), compose window (new email and popped out reply), every state forced side by side, and
  the three cursors. The bar toggles the To line band, the "New" mark and how long the fake model
  thinks.

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
