# Instant Reply: status and plan

Last updated 2026-09-29 (beach look built with a FragPunk/Beach switch).

## Product decisions (agreed)

- Chrome extension (Manifest V3), personal use, loaded unpacked. No Web Store.
- All data local (`chrome.storage.local`). No backend, no Gmail API, no OAuth. Threads are read from the page.
- LLM via OpenRouter; default model `z-ai/glm-5.3`, changeable in the popup.
- The Gmail reply box is the only chat surface. No side panel. The Refactor button sends the box to the agent; the draft is written back into the box. Never sends email.
- Every thread starts off. The on/off switch lives in the reply box itself, since replying is the only time you turn it on or off: next to Send while off, just before Discard while on. Discard always stays the last button.
- Flair only dresses the reply card while its thread is on; off means plain Gmail. No text or tags on the box, the look itself signals "on". Everything under it (text, icons, dropdowns, the caret) must stay visible, and colours follow Gmail's theme.
- The agent always gets the whole thread, the thread's own history, and the whole box (an instruction, or a previous draft with edits and change requests).
- Voice: no profile up front. Learned from revision requests and from hand edits made before sending. The settings page shows it read only; changes happen by chatting with the agent, which rewrites the notes as a whole (avoids drift).
- Architecture is plug and play: pure core with ports, Chrome host with adapters, other apps connect as plugins.

## Done

- Workspace: `packages/core` (pure, tested) and `apps/extension` (Chrome host). Build output at repo root `dist/`.
- Core: versioned contracts, ports (`Store`, `LlmProvider`, `ContextProvider`, `EventSink`), prompt builder, `createAgent` with per thread history (last 20 turns), context gathering with a 3 second timeout, fire and forget events. 3 tests.
- Extension adapters: chrome storage store, OpenRouter provider. Service worker is the composition root and the only reader of the API key.
- Gmail: on/off switch in each reply box (synced across boxes and tabs through storage), Refactor button next to Send.
- Refactor flow, verified working in Gmail: reads the box without the signature, clicks Expand all and reads every message (sender, recipients, date, cleaned body), sends to the agent, writes the draft back with undo support, stores the exchange.
- Popup: OpenRouter key (validated, masked) and model.
- Look and feel, first pass (FragPunk), in `content/styles.ts`, `content/fx.ts`, `content/icons.ts`, `content/palette.ts`. Tested live in Gmail and adjusted from screenshots:
  - Switch: dashed outline when off, tilted magenta sticker when on. Refactor: tilted torn acid sticker, "Refactor!" in Permanent Marker (bundled at `public/fonts`, Apache 2.0, exposed through `web_accessible_resources`).
  - Reply card: found as the outermost rounded ancestor of the editor (`td.I5` today) and marked `data-ir-card`; its own background, radius and shadow are cleared and a skin behind it draws the border (edge, acid sheet peeking out on the left, torn right edge with a magenta hard shadow, jagged bottom). The box (`div.aoI`) is wider than the card because it holds the avatar column, so the skin is sized to the card, not the box.
  - To line: everything in the card above `table.iN` is marked `data-ir-head`; a crooked ink bar is drawn behind it, its backgrounds are made transparent, text turns white and its icons are forced white. An acid rule under it marks where the writing area starts, and the caret is magenta.
  - Send and its schedule arrow are restyled in place (Gmail's blue fill, borders and focus ring cleared) as one joined ink sticker. Toolbar icons (attach, link, emoji, photo, more, discard) are swapped by tooltip text; only real buttons are tagged, not whole toolbars. Discard is 35% bigger.
  - The user's round avatar left of the card is found by probing the page just left of the card (it can sit outside the box) and cut into a tilted octagon with hard shadows; unmarked when the thread is turned off.
  - Theme: `data-ir-theme` light or dark is read from the card's background before it is cleared; edges and icons switch between ink and near white.
  - Refactor animation: old text flickers while waiting; the draft is written underneath and a snapshot of the old text is torn away by an ink glitch block (24 rows, 600ms), then a "New!" sticker slams on and peels off. Reduced motion skips it.
- Look and feel, built on the `beach-style` branch: the **beach style (design v2, final)** sits next to FragPunk. The popup has a "Look in Gmail" switch (FragPunk or Beach, FragPunk by default), stored under its own `look` key so the content script never reads the settings holding the API key; open Gmail tabs switch live. Beach is meant for the friend in California (inspiration from Moana only, no characters, logo or title lettering). Everything learned in the live tests above carries over. Reference mockups are saved in `docs/design/` (open the HTML files in a browser).
  - These are the finalized settings. The beach style is not changed until the user says to update it.
  - Palette follows California time (America/Los_Angeles), read when Refactor is pressed and held for the whole wave: 5 to 11 Lagoon, 11 to 17 Hibiscus Reef, 17 to 20 Tapa Sunset, otherwise Night Voyage. No setting to override it.
  - Reply card: round, with a thin leaf green edge. The To line is shallow lagoon water that ends in a scalloped foam line above the body, so the body reads as the beach the wave runs onto.
  - Buttons: Send is a sea glass pebble, with a small pebble as the schedule arrow. Refactor is a wavy flower banner with a plumeria at its end. The switch is a plumeria bud that opens into a flower when on. Toolbar icons sit on petal shapes, Discard is a sand pail, and the user's avatar wears a small flower crown. All colours come from the time of day palette.
  - Refactor animation: one wave, seen from above, runs down the reply box from the top (the thread above is the sea) over sand, washes the old text away, pulls back up and leaves the draft on wet sand, which dries; then the sand fades and the box is plain again.
  - The waterline is uneven: each thin column gets its own arrival, reach (always past the bottom) and retreat. Each Refactor picks one of six shapes at random, never the same twice in a row: left to right, right to left, right nudges ahead, centre first, left half centre, right half centre.
  - Beach finds: 2 to 4 per wave, picked at random from nine (three starfish colours, message in a bottle, crab that runs off a side, baby turtle that crawls up toward the sea, hermit crab that shuffles, octopus, jellyfish), placed at random on empty sand away from the text. They fade with the sand.
  - "New": no sticker. One find per wave carries the word, placed first and drawn bigger so it is readable, shrinking only when the draft leaves no room: a crab holding a "New" sign (it waits longer before running off), a bottle with a "New" note inside, a starfish with "New" on it, a hermit crab with a "New" tag on its shell, or a card half buried in the sand.
  - Numbers ("Beach v1"): wave 2800ms, unevenness 0.6, run up 0.36 of the wave, hang 0.05, scallop depth 8px and width 44px, foam 1.5x, sand fade in 140ms, dry 2200ms, hold 1600ms, fade out 700ms, finds 2 to 4 at 10 to 17px (the "New" carrier at 24px), 10px from text, 23px apart, critter speed 1x. Tuned against a 881px wide card, 187px body, 13.5px text at 1.2 line height; the real box sizes come from Gmail.
  - Code: `content/beach/` holds the palettes and California time rule (`palette.ts`), the stylesheet (`styles.ts`, colours per palette on `data-ir-pal`, shapes as inline SVG backgrounds), the wave (`fx.ts`, layers over the writing area: sand, the new text, the old text, the water) and the finds (`finds.ts`). Fredoka and Pacifico are bundled in `public/fonts` (Open Font License).
  - A friend's copy uses their own OpenRouter key, and their learning stays on their computer, separate from the user's.
- Plugin registry at `apps/extension/src/plugins/index.ts` (empty).
- Voice learning (core `learn.ts`, tested):
  - Signals: a revision request is recorded when Refactor is pressed on a box that differs from the last draft; a sent diff is recorded when a thread that is on is sent (Send pressed or Cmd/Ctrl+Enter, read on pointer down before Gmail clears the box) and the text differs from the last draft. Each draft counts once. Sends without a draft are ignored.
  - Every 3 waiting signals (up to 20 per run) the model rewrites the notes as a whole. The first run also mines older thread histories for revision requests, so drafts made before learning existed count.
  - Notes are Markdown with three sections: About you, How you write, Rules you asked for. They go into every draft prompt after the fixed base rules.
  - Learning can be turned off; what is already learned still applies.
- Settings page (options page, opened from the popup's "Your voice and prompts" button): the fixed base rules, what it knows about the user, the user's own rules, learning status (waiting, learned so far, last update), Learn now, Forget everything with an in-page confirm. A chat changes the notes or answers questions; the notes are never editable by hand. Per thread views are left out on purpose.

## Next

1. **Check learning live.** Confirm the Send hook fires on the real Send button and Cmd+Enter, and that notes read well after a few emails.
2. **Beach style, live check.** Switch to Beach and check in Gmail: the lagoon To line and foam over the real header, Send and its arrow as pebbles, the switch and Refactor shapes, icon petals, the avatar crown, and the wave over real drafts of different lengths. Merge `beach-style` into main once it looks right.
3. **Compose windows (new emails).** Switch in the compose footer, session keyed by draft id (`input[name="draft"]`), move history to the thread id after sending if possible.
4. **Job app connection.** Decide transport once the job app's stack is known: local bridge service, `externally_connectable` messages, native messaging, or importing `@instant-reply/core` directly. Then implement a `ContextProvider` (role, application status for recruiter threads) and an `EventSink` (update status on replies).
5. **Polish.** Keyboard shortcut for Refactor (Cmd+Shift+Enter), optional re-collapse after Expand all, extension icon, error messages surfaced in the UI instead of the console, localized Expand all label.

## Open questions

- Icon swaps match English tooltip text only. Gmail's formatting button ("Aa") has no tooltip in the DOM and keeps its own icon.
- Learning cadence: every 3 changes today; learning calls are costly and should use a good model, so a count threshold with a rate limit is being discussed.
- Per thread tone notes (`threadToneNotes`) exist in the contract but are not learned yet.
- What is the job app built with, and where does it run? Decides the transport in step 4.
- Should the API key be encrypted with a passphrase? Currently stored unencrypted in the extension's local storage, which web pages cannot read.
- When turning a thread off, history is kept. Is a "clear history" action wanted?
