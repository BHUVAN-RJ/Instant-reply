# Instant Reply

- Read `docs/PLAN.md` first: decisions, what is done, what is next.
- Anything about looks (themes, buttons, the Refactor animation, variants): read `docs/THEMES.md` and `docs/themes/DESIGN_LANGUAGE.md` before touching code, and check work in the preview (`npm run preview`). Designs are drawn as mockups with the kit in `docs/design/kit/` and iterated with the user; the design goes into the theme's `DESIGN.md` and is approved, with its mockup, before any theme code.
- `npm test` (core tests and theme contract tests) and `npm run build` must pass before a change is done.
