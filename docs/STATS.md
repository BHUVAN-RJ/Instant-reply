# Usage counts

Copies of the extension handed to friends report two things to a Google Sheet:

- every **Refactor**, numbered per email (1st, 2nd, ... Refactor on that reply)
- every **send** from a reply box that is on, with how many Refactors that email took

That gives emails sent per person, Refactors per email, and Refactors per sent email.

## What is sent

One row per event: when, the name, a random install id, `refactor` or `sent`, a hash of the reply box's thread id (salted with the install id, so it cannot be matched to a Gmail thread or across friends), the Refactor count, and an event id. Never email text, subjects, addresses or the OpenRouter key.

Tell friends before handing it over. They can see their totals in the popup's **Usage** box, change the name shown, or untick "Share these counts with Bhuvan" (totals still count locally, nothing is sent).

## Set up the sheet (once)

1. Create a Google Sheet, then **Extensions > Apps Script**.
2. Replace the editor contents with `tools/stats/Code.gs` and save.
3. Pick `setup` in the function menu and **Run** (approve the access prompt). The sheet gets an **Events** tab and a **Summary** tab.
4. **Deploy > New deployment**, type **Web app**, Execute as **Me**, Who has access **Anyone**. Deploy and copy the web app URL (`https://script.google.com/macros/s/.../exec`).

After changing the script later, use **Deploy > Manage deployments > Edit > New version** so the URL stays the same.

## Build with the URL

```
echo 'VITE_STATS_URL=https://script.google.com/macros/s/.../exec' > apps/extension/.env.local
npm run build
```

`.env.local` is gitignored, so the URL stays out of the repo. Zip `dist/` and hand it out. A build without the URL shares nothing and the popup hides the Usage box.

Friends reloading an updated copy may be asked by Chrome to allow access to `script.google.com`; that is this.

## Check it works

Refactor once in Gmail, then look at the Events tab: a row should appear within a few seconds. If not, open `chrome://extensions`, click the service worker link under Instant Reply, and look for `[instant-reply] stats not sent`. Failed events wait in storage and go out with the next one.

## Reading the numbers

The Summary tab has: Refactors per person; emails sent and average Refactors per sent email per person; and Refactors per email (each hashed email with its highest Refactor number). Sends only count reply boxes with Instant Reply on.
