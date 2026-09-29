# Instant Reply

Chrome extension for Gmail. Inside any thread, type a short instruction in the reply box ("ask for the invoice") and get a full reply drafted with the context of that thread, written in your own voice.

## How it works

- The Gmail reply box is the chat with the agent. Type an instruction, click **Refactor** (next to Send), and the draft replaces the box contents. To revise, edit or add a request in the box and click Refactor again. Cmd+Z restores what you typed. Nothing is ever sent automatically.
- **Thread session**: each thread has its own local history of instructions and drafts. Every thread starts off; the **Instant Reply** switch inside the reply box turns it on (it sits next to Send while off and moves just before Discard while on). While on, the reply box is dressed in the extension's look and gets the Refactor button; while off, Gmail looks untouched.
- **Setup**: click the extension's toolbar icon and paste an OpenRouter key. It is checked against OpenRouter, stored locally, and read only by the service worker.
- **Voice**: starts empty and is learned from revision requests and from hand edits made before sending. Threads can carry their own tone on top of the global voice. The settings page shows the voice read-only; changes go through a chat with the agent so the notes are rewritten as a whole instead of patched.
- **Local only**: all data lives in `chrome.storage.local`. LLM calls go to OpenRouter (default model `z-ai/glm-5.3`).

## Architecture

Ports and adapters. The core knows nothing about Chrome or Gmail; hosts plug into it.

```
packages/core            pure TypeScript, runs anywhere
  contracts.ts           versioned JSON shapes: Thread, ThreadSession, DraftRequest, AgentEvent...
  ports.ts               sockets: Store, LlmProvider, ContextProvider, EventSink
  prompt.ts              thread + voice + context + history -> model messages
  agent.ts               createAgent(): draft, setActive, events, history

apps/extension           the Chrome host
  adapters/              chrome-store (Store), openrouter (LlmProvider)
  content/               Gmail source adapter: reads threads, on/off switch, Refactor button,
                         reply box look (styles.ts, icons.ts, palette.ts) and Refactor animation (fx.ts)
  public/fonts/          bundled display font
  background/            composition root: wires core + adapters + plugins, holds the key
  plugins/index.ts       register ContextProviders and EventSinks from other apps here
  popup/                 OpenRouter key and model
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
