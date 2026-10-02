# Security

Last reviewed 2026-10-01 (branch `theme-packs`). A read-through audit of the extension, the core and the Apps Scripts in `tools/`, followed by a few fixes. Update this file when permissions, storage, network destinations or message handling change.

## Threat model

The extension runs unpacked in the user's daily Chrome profile, next to Gmail, banking and work sessions. The audit asked how each of these could lead to stolen data, stolen sessions or actions taken as the user:

- (a) an attacker sends the user arbitrary email,
- (b) the user visits a malicious website,
- (c) an npm dependency is compromised,
- (d) a user level process runs on the Mac.

## How the extension is built, as it bears on security

- **Permissions**: only `storage`, plus the content script on `https://mail.google.com/*`. No host permissions, no OAuth, no Gmail API, no tokens.
- **Gmail data**: read from the page by the content script (`content/thread.ts`, `content/gmail.ts`, `content/editor.ts`).
- **Stored** (all `chrome.storage.local`, plaintext in the Chrome profile): the OpenRouter key (`settings`), per thread history of box text and drafts (`session:<threadId>`), voice notes and waiting signals (`voice`), name and signature (`identity`), usage counts (`stats`), look settings. Raw thread messages are never stored. Nothing in `storage.sync`.
- **Retention**: email text older than 30 days is deleted each time the service worker wakes (`packages/core/src/retention.ts`). See `docs/PLAN.md`.
- **Network**: OpenRouter chat completions (the thread, subject, the user's address, name, signature, voice notes, history and box text, with zero retention, no training routing), OpenRouter's key check (popup), and the usage counts Apps Script (install id, name, hashed thread id, counts; `docs/STATS.md`). All URLs are fixed; none is built from email or page content.
- **Messaging**: only `chrome.runtime.onMessage` in the service worker. No `externally_connectable`, `onMessageExternal`, `onConnect` or `window.postMessage` listeners, so web pages and other extensions cannot reach it.
- **Rendering**: drafts are escaped before going into the Gmail editor (`editor.ts` `writeBox`); the popup and settings page use `textContent` only. No `eval`, no remote code, default MV3 CSP.
- **Dependencies**: zero runtime dependencies. `npm audit` found 0 vulnerabilities. Build tools (Vite, crxjs and their dependencies) run at build time and write the bundle.

## Findings and decisions

Fixed:

- **Unneeded permissions removed.** `unlimitedStorage` (30 days of drafts is a few MB of the 10 MB quota), the `mail.google.com` host permission (already granted by the content script), and host permissions for `openrouter.ai`, `script.google.com` and `script.googleusercontent.com` (both services answer CORS requests, checked with curl; these permissions also gave cookie access to the user's OpenRouter account and Apps Script projects).
- **Data kept forever.** Now 30 day retention, see above.

Accepted (the user's call, not worth fixing now):

- **Local tampering.** The loaded `dist/` folder is gitignored, and Chrome grants new manifest permissions to an unpacked extension on restart without asking, so a local process could edit it. Accepted because such a process has other ways in anyway. A cheap check if wanted: `find dist -type f -exec shasum -a 256 {} + | sort > ~/.ir-dist.sha256` after a build, and the same piped into `diff - ~/.ir-dist.sha256` before starting Chrome.
- **Usage counts endpoint.** The Apps Script URL is in every built copy and takes posts from anyone, so junk rows (or strings starting with `=`, which `setValues` treats as formulas) can be written to the counts sheet. Only counts live there.
- **One off prompt injection.** Email text reaches the model, including text hidden from view. The model has no tools, drafts are plain text, and nothing is sent without the user pressing Send, so a bad draft is caught by reading it.

Open:

- **Learning poisoning.** A crafted email could get a rule into the voice notes, which then go into every draft. Learning corrects rules whose effect the user edits away, but two gaps remain: the learner is told to keep "Rules you asked for" and cannot tell a real user rule from a planted one, and a rule with a subtle effect is never corrected because unchanged sends are not signals. Cheap fixes: only the settings chat may write "Rules you asked for", and show a diff when the notes change.
- **Quoted reply fallback.** When the open conversation is not the reply box's thread (popped out replies), the thread is read from Gmail's hidden `uet` field, which holds the quoted history as HTML (`gmail.ts` `collectThread`). `renderedText` briefly attaches it to the live Gmail page, so images in it could load. Fix: strip images, frames, styles and attributes first.
- **Small hardening.** No `sender` checks in the service worker's message handler (only this extension's own pages and content script can send, so this matters only if the Gmail renderer is compromised); Refactor accepts synthetic clicks (`isTrusted` not checked); the content script can read the API key from `storage.local` even though it never does; usage sharing is on by default and falls back to the Gmail account name.
- **Plugins.** Plugins (`apps/extension/src/plugins/index.ts`) run in the service worker with the key, all storage and the network. Event sinks get full content (`draft-created` carries the thread and draft, `email-sent` the sent text), and context provider text goes into the prompt as trusted. Before job autopilot connects: give each plugin only the fields it needs, never act on email content without the user confirming, and pick a transport that adds no open door (importing core or native messaging over a local HTTP server or `externally_connectable`, with authentication either way).

Not verified: what Gmail's `uet` field holds and Gmail's current CSP (no live session), the Chrome profile files on disk, whether OpenRouter's hosts honour zero retention, the maintenance status of build dependencies, and the permission removal in real Chrome (checked with curl only; confirm a Refactor, saving the key and the usage counts after reloading).

Outside the extension: `tools/job-tagger` uses `GmailApp`, which needs full mail access, and lets a model pick labels, so a crafted email could get a wrong label. It cannot send or delete.
