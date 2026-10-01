# Instant Reply

Chrome extension for Gmail. Inside any thread, type a short instruction in the reply box ("ask for the invoice") and get a full reply drafted with the context of that thread, written in your own voice.

## How it works

- The Gmail reply box is the chat with the agent (inline replies, popped out replies and new emails all use the same box). Type an instruction, click **Refactor** (next to Send), and the draft replaces the box contents. To revise, edit or add a request in the box and click Refactor again. Cmd+Z restores what you typed. Nothing is ever sent automatically.
- **Thread session**: each thread has its own local history of instructions and drafts. Every thread starts on; the **Instant Reply** switch inside the reply box turns it off for that thread (it sits just before Discard while on and next to Send while off). While on, the reply box is dressed in the extension's look and gets the Refactor button; while off, Gmail looks untouched.
- **Setup**: click the extension's toolbar icon and paste an OpenRouter key. It is checked against OpenRouter, stored locally, and read only by the service worker. The popup also picks the theme in Gmail (FragPunk or Beach), whether drafts keep the "New" mark after the first three, whether replies get the theme's band behind the To line (off by default: a plain line separates it instead), and opens the settings page.
- **Themes**: FragPunk (torn stickers, a glitch sweep and a New! sticker) or Beach (island shapes, palettes by the time of day in California, small waves while thinking, and a wave that runs over sand and leaves the draft plus a few beach finds). Switching applies to open Gmail tabs right away. Each theme is a pack with an approved DESIGN.md next to its code and designs inline replies and Gmail's compose window. To add one: `docs/THEMES.md` (process, contract, tests), `docs/themes/DESIGN_LANGUAGE.md` (how to design), and the preview (`npm run preview`). Mockups in `docs/design/`.
- **Comments**: select any text in the reply box and a small note box opens under it. Enter pins the note: the passage gets a blue mark (drawn over the text, never written into the email) and a numbered pin; click a pin to edit or delete. Refactor shows how many are waiting, sends them with the box, and clears them once the new draft lands.
- **Writing rules**: drafts sound like a real person (plain words, no AI sounding phrases or jargon) and never use an em dash or a double hyphen; single hyphens are fine. Your learned voice wins on style; dashes are also removed in code.
- **Sign-off**: your name comes from your Google account and your signature from Gmail (or type both on the settings page under "How you sign"). Casual emails end with your first name, formal ones and first contact with your full signature. "[Your name]" placeholders never get through. Changing a sign-off by hand before sending is learned like any other edit.
- **Voice**: starts empty and is learned from revision requests (Refactor pressed on a changed draft) and from hand edits made before sending. Every few changes the model rewrites its notes about you (About you, How you write, Rules you asked for); the first run also learns from older threads. The settings page ("Your voice and prompts" in the popup) shows the fixed prompt rules and the notes read only, has a learning switch, Learn now and Forget everything, and a chat that answers questions or rewrites the notes. The notes are never edited by hand.
- **Local only**: all data lives in `chrome.storage.local`. LLM calls go to OpenRouter (default model `z-ai/glm-5.3`).

## Architecture

Ports and adapters. The core knows nothing about Chrome or Gmail; hosts plug into it.

```
packages/core            pure TypeScript, runs anywhere
  contracts.ts           versioned JSON shapes: Thread, ThreadSession, DraftRequest, AgentEvent...
  ports.ts               sockets: Store, LlmProvider, ContextProvider, EventSink
  prompt.ts              fixed base rules; thread + voice + context + history -> model messages
  learn.ts               voice learning prompts, voice chat parsing, signals from old history
  agent.ts               createAgent(): draft, setActive, recordSent, learn, chatAboutVoice, events

apps/extension           the Chrome host
  adapters/              chrome-store (Store), openrouter (LlmProvider)
  content/               Gmail source adapter: reads threads, on/off switch, Refactor button,
                         Send capture for learning (gmail.ts never names a theme)
  content/comments.ts    comments pinned to passages of the reply box (note box, marks, pins)
  content/theme/         the theme contract, shared helpers and selectors, stylesheet builder, skin layout, swoosh runner
  content/themes/        theme packs (fragpunk/, beach/), each with DESIGN.md, meta.ts, index.ts
  appearance.ts          active theme, the "New" mark and the To line band settings (own storage keys, no access to the API key)
  theme-list.ts          theme names for the popup, without their styles
  identity.ts            your name and signature for sign-offs (seen in Gmail, or typed on the settings page)
  public/fonts/          bundled fonts: Permanent Marker, Fredoka, Pacifico
  background/            composition root: wires core + adapters + plugins, holds the key
  plugins/index.ts       register ContextProviders and EventSinks from other apps here
  popup/                 OpenRouter key and model, theme switch, New mark and To line band checkboxes, link to the settings page
  preview/               theme design preview: every theme's real code on a stand in for Gmail (npm run preview)
  test/                  theme contract tests and layout tests (happy-dom)
  options/               settings page: how you sign, prompt rules, learned notes, learning controls, chat
```

To connect another app, implement a `ContextProvider` (it gives the agent facts about a thread) and/or an `EventSink` (it hears `thread-activated`, `draft-created`, ...) and add it in `apps/extension/src/plugins/index.ts`. Slow or failing plugins are skipped, never blocking a draft. Another Node or TypeScript app can also import `@instant-reply/core` directly and supply its own adapters.

See `docs/PLAN.md` for status and next steps, and `docs/gmail-dom.md` for the Gmail selectors.

## Develop

```
npm install
npm run build   # typecheck + build to dist/, load it unpacked in chrome://extensions
npm run dev     # rebuild on save
npm test        # core tests and the theme contract tests
npm run preview # theme design preview at localhost:5199 (?theme=<id>)
```

After every build: reload the extension in `chrome://extensions`, then hard refresh Gmail (Cmd+Shift+R). The Gmail tab keeps running the old content script until refreshed.
