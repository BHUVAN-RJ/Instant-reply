# Instant Reply

Chrome extension for Gmail. Inside any thread, type a short instruction in the reply box ("ask for the invoice") and get a full reply drafted with the context of that thread, written in your own voice.

## How it works

- The Gmail reply box is the chat with the agent. Type an instruction, click **Refactor** (next to Send), and the draft replaces the box contents. To revise, edit or add a request in the box and click Refactor again. Cmd+Z restores what you typed. Nothing is ever sent automatically.
- **Thread session**: each thread has its own local history of instructions and drafts. Every thread starts off; the **Instant Reply** switch inside the reply box turns it on (it sits next to Send while off and moves just before Discard while on). While on, the reply box is dressed in the extension's look and gets the Refactor button; while off, Gmail looks untouched.
- **Setup**: click the extension's toolbar icon and paste an OpenRouter key. It is checked against OpenRouter, stored locally, and read only by the service worker. The popup also picks the look in Gmail (FragPunk or Beach) and opens the settings page.
- **Looks**: FragPunk (torn stickers, a glitch sweep and a New! sticker) or Beach (island shapes, palettes by the time of day in California, and a wave that runs over sand and leaves the draft plus a few beach finds, one of them carrying the word New). Switching applies to open Gmail tabs right away. Design reference in `docs/design/`.
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
                         Send capture for learning, FragPunk look (styles.ts, icons.ts, palette.ts, fx.ts)
  content/beach/         Beach look: palettes and California time (palette.ts), styles.ts,
                         the wave (fx.ts) and the beach finds (finds.ts)
  look.ts                which look is active (its own storage key, no access to the API key)
  public/fonts/          bundled fonts: Permanent Marker, Fredoka, Pacifico
  background/            composition root: wires core + adapters + plugins, holds the key
  plugins/index.ts       register ContextProviders and EventSinks from other apps here
  popup/                 OpenRouter key and model, look switch, link to the settings page
  options/               settings page: prompt rules, learned notes, learning controls, chat
```

To connect another app, implement a `ContextProvider` (it gives the agent facts about a thread) and/or an `EventSink` (it hears `thread-activated`, `draft-created`, ...) and add it in `apps/extension/src/plugins/index.ts`. Slow or failing plugins are skipped, never blocking a draft. Another Node or TypeScript app can also import `@instant-reply/core` directly and supply its own adapters.

See `docs/PLAN.md` for status and next steps, and `docs/gmail-dom.md` for the Gmail selectors.

## Develop

```
npm install
npm run build   # typecheck + build to dist/, load it unpacked in chrome://extensions
npm run dev     # rebuild on save
npm test        # core tests
```

After every build: reload the extension in `chrome://extensions`, then hard refresh Gmail (Cmd+Shift+R). The Gmail tab keeps running the old content script until refreshed.
