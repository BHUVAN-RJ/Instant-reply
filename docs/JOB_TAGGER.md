# Job email tagger

Status (2026-10-06): live. A Google Apps Script (`tools/job-tagger/Code.gs`) runs every 10 minutes in the user's USC Google account and labels job mail; tests in `apps/extension/test/job-tagger.test.ts` (Code.gs loaded into a sandbox with fake Gmail, Sheet, Properties and OpenRouter). The extension's "Done" button (`apps/extension/src/content/todo-button.ts`) is built but not connected yet.

## Where things stand (2026-10-06)

- Running: `setup`, `startSchedule`, `run`, `archiveApplied` were run on 2026-10-03 after the 10 minute trigger had been missing (it ran once by hand on 2026-10-01, then never). Script Properties: `OPENROUTER_KEY`, `DRY_RUN=false`, `SHEET_ID` (the "Job tagger log" sheet). The copy in Apps Script is pasted by hand: after any change to Code.gs, copy it (`pbcopy < tools/job-tagger/Code.gs`), paste over the editor contents, save, and if the web app is deployed, Deploy > Manage deployments > Edit > New version.
- Labels in Gmail: `TO DO` (top level, green), `REPLY NEEDED` (top level, red; the user wants no strong colours, so remove it in Gmail if asked), `Jobs/Applied`, `Jobs/Rejected`, `Jobs/Submitted`; the parent `Jobs` is still red. The Gmail connector can rename and recolour labels but cannot remove a colour; that is done by hand in Gmail (label menu > Label color > Remove color). The user's own old labels "To respond", "Job Applications", "Job Applications/Job Rejects" and "GCSP" are not used by the script.
- Waiting on the user for the "Done" button: paste the latest Code.gs, add Script Property `TAGGER_TOKEN` (same value as `VITE_TAGGER_TOKEN` in `apps/extension/.env.local`, gitignored), deploy as a web app (Execute as Me, access Anyone), and send the URL. Then add `VITE_TAGGER_URL=<url>` to `apps/extension/.env.local`, `npm run build`, reload the extension, hard refresh Gmail, and check the button live.
- Not seen on real mail yet: `REPLY NEEDED` (no recruiter reply since the start date) and `Jobs/Submitted`. Rules, `TO DO`, `Jobs/Applied` and `Jobs/Rejected` were checked against a dry run on 2026-10-01 and looked right to the user.
- Gmail Multiple Inboxes sections `label:to-do` and `label:reply-needed` above the inbox: suggested, not confirmed as set up.
- Learning is limited on purpose: the last 20 corrections go into the prompt as examples and two matching corrections for a sender become a sender rule. No retraining and no rewriting of the rules or the prompt.
- Privacy: never search or read the user's mailbox through the Gmail connector without asking first, and then headers only where possible.

## Goal

Read job related email from 2026-09-30 onward (and everything new after that), and tag it so the two things that matter stand out:

1. **To do**: the application asks me to do something. Online assessment (OA), coding challenge, take home, video interview, pre-interview questions, a form (EEO, personal info, additional info), "complete your application", scheduling.
2. **To respond**: a person wrote and expects a reply (recruiter questions, availability, follow ups).

Everything else stays as it is. Hard rules:

- Only job related email is touched: adding or removing the tagger's own labels, archiving `Jobs/Applied` threads, starring mail that gets `REPLY NEEDED` (both asked for on 2026-10-03). Never delete, send, or change read state.
- An email I have not opened stays unread after the tagger reads it.
- When I fix a tag (remove it or add it by hand), the tagger learns from that.

## What the inbox looks like (sampled 2026-10-01, read only)

From the threads since 2026-09-30 and the existing "To respond" label:

- **Volume**: about 50 job related emails in one evening of applying. Most are confirmations.
- **Confirmations** ("Thank you for applying", "Your application was sent to X", "Application received"), almost all from applicant tracking systems (ATS):
  `no-reply@us.greenhouse-mail.io`, `no-reply@hire.lever.co`, `no-reply@ashbyhq.com`, `*@myworkday.com`, `notification@smartrecruiters.com`, `successfactors@*`, `notifications@app.bamboohr.com`, `noreply@ripplehire.com`, `jobs+*@adp.com`, `*.teamtailor-mail.com`, `noreply@mail.amazon.jobs`, `notification@careers.intusurg.com`, `jobs-noreply@linkedin.com` (Easy Apply).
- **Rejections** come from the same senders ("we will not be moving forward", "after careful consideration"), e.g. CyberCoders and Amazon on 2026-09-30.
- **To do** examples already labelled "To respond" by hand:
  - Assessment platforms: HackerRank (`support@hackerrankforwork.com`), HireVue (`interviews@hirevue.com`), Coderbyte, CoderPad, ModernHire (BlackRock), `tal.net` (BlackRock pre-interview assessment), Goldman Sachs and Barclays assessments, Optiver, Maven Securities "online test not completed".
  - Forms: Stellantis "Additional Information Needed" (ADP), Remitly "Request for Personal Information", EEO self-identification forms (Intelliswift, Mitchell Martin), MathWorks "Action needed to complete your application", McKinsey "please complete your draft application".
  - Screens: Akraya "AI-driven screening", Canonical "written interview".
- **To respond** examples: Terros "Follow-up Questions" (a recruiter, via Teamtailor), Goaly and Canonical recruiters following up, availability requests.
- **Noise that looks job related but is not about my applications**: job alerts (`jobalerts-noreply@linkedin.com`, `noreply@jobright.ai`, `donotreply@match.indeed.com`, `*@jobs2web.com` talent communities), Handshake events and messages, career fair registrations (`notifications@brazen.com`), account created, OTP and "verify your candidate account" emails.
- **Existing labels**: "To respond" (141 threads, mixes job and personal email), "Job Applications" (262) and "Job Applications/Job Rejects" (84), the last two used until about March 2026. These are ready made examples for the classifier.

Takeaway: the sender tells us "this is an application email" very reliably, but not which kind. The same Workday or Greenhouse address sends the confirmation, the rejection and the assessment invite. Telling those apart needs the subject and body, which is where a model earns its keep. People (recruiters) write from company domains, so "To respond" needs the body and thread too.

## Proposed pipeline

```
new mail ──► 1. gate (rules, free) ──► not job related: stop, never read further
                     │
                     ▼ job related
              2. classify (LLM, subject + body + thread)
                     │
                     ▼
              3. label (add our label only)
                     │
                     ▼
              4. learn from my fixes (label added or removed by me)
```

### 1. Gate: is this job related?

Cheap rules on headers only (sender, subject, `List-Unsubscribe`), no body:

- **Yes** if the sender is a known ATS or assessment platform (lists above, plus iCIMS, Jobvite, Taleo, Workable, JazzHR, Breezy, Recruitee, Gem, CodeSignal, Codility, Karat, Pymetrics, Harver, TestGorilla, Mercer Mettl, Spark Hire, Willo, VidCruiter), or the subject matches application words ("application", "applying", "assessment", "interview", "candidate", "next steps", "position", "role").
- **Yes** if the thread is one I already replied to and it was job related, or the sender's domain matches a company I have a tagged application with (catches recruiters writing from their own domain).
- **No** for known alert and newsletter senders (job alerts, Handshake, Jobright, Indeed match, talent communities), OTP and account verification.
- **Unsure** (a person writing from an unknown domain, nothing obvious): send headers and the first lines to the model with a yes/no question.

Sender lists live in data, not code, so learning can grow them.

### 2. Classify

One label per thread, picked by the model from the latest message plus the thread:

| Label | Meaning | Examples |
| --- | --- | --- |
| `TO DO` | I must do something with a link or a form | OA, HireVue, HackerRank, EEO form, "complete your (draft) application", personal info request, scheduling link |
| `Jobs/To respond` | A person expects a written reply | recruiter questions, availability, "are you still interested" |
| `Jobs/Submitted` | Receipt that an assessment or step I did went through | "Assessment submitted for Netic AI" (Coderbyte) |
| `Jobs/Applied` | Application confirmation only | "Thank you for applying" |
| `Jobs/Rejected` | Closed | "not moving forward" |
| (no label) | Job related but none of the above | "status update" with nothing in it, account created, OTP, verify your candidate account |

The model returns the category, a one line reason, and (for To do) a deadline if the email states one. The deadline is useful for ordering later.

### 3. Label

- Labels live under `Jobs/` so they never collide with the existing "To respond", "Job Applications" and "Job Rejects" labels (those stay as they are and are not used by the script). Created 2026-10-01: `TO DO` (Label_3, green, top level since 2026-10-03 so one click shows every to do), `REPLY NEEDED` (Label_4, red, top level; renamed from `Jobs/To respond` on 2026-10-03 so it is loud), `Jobs/Submitted` (Label_5, green), `Jobs/Applied` (Label_6, light grey), `Jobs/Rejected` (Label_7, dark grey). Code looks labels up by name, never by these ids.
- The tagger only ever calls "add label" and "remove label" with label ids it created. A single function holds the allowlist; nothing else can modify mail. Tests check this.
- Each message is processed once (remember its id). Reprocessing a thread happens only when a new message arrives in it.

### 4. Learn from my fixes

- When I remove a `Jobs/...` label, or move a thread from one to another, or add one by hand to an untagged thread, that is a correction: store the email's sender, subject, snippet, what the tagger said, what I said.
- Corrections feed the model as examples (the most recent and most similar ones) and, once enough pile up, turn into notes in the same way voice learning works today (`learn.ts`: the model rewrites a short notes file as a whole, never appended to). Repeated corrections for one sender turn into a sender rule ("always To do", "never job related").
- Bootstrap: the existing "To respond", "Job Applications" and "Job Rejects" labels give a few hundred examples on day one.

### "Put it on top"

Gmail does not let an extension or the API reorder the inbox. Two ways to get "To respond" and "To do" on top:

- **Multiple Inboxes** (Gmail settings, one time, by hand): sections above the normal inbox for `label:to-do` and `label:reply-needed`. Works in Gmail on the web with no code. Chosen 2026-10-01.
- A small panel injected by the extension above the inbox list, listing those threads. More work, and Gmail's DOM moves.

## Install

1. New project at script.google.com (USC account). Replace the editor's contents with `tools/job-tagger/Code.gs` and save.
2. Project Settings (gear) > Script Properties: add `OPENROUTER_KEY`. Optional: `MODEL` (default `deepseek/deepseek-v4-flash`), `START` (default `2026-09-30T00:00:00-07:00`). Leave `DRY_RUN` unset: it starts in dry run.
3. Pick `setup` in the function menu and Run. Accept the permissions (Gmail, the Sheet, external requests). It creates a Google Sheet "Job tagger log" in Drive (Log and Corrections tabs) and prints its link. That Sheet is the tagger's memory between runs and where a dry run is reviewed.
4. Pick `run` and Run. Dry run: nothing in Gmail changes; the Log tab of "Job tagger log" lists every email since START with the label it would get, from a rule or the model, and why. Not job related mail shows only the sender.
5. If the Log looks right, set `DRY_RUN` to `false` and Run `run` again: labels go on.
6. Run `startSchedule` once: it runs every 10 minutes from then on. `stopSchedule` stops it.
7. Gmail Settings > Inbox > Inbox type: Multiple Inboxes, sections `label:to-do` and `label:reply-needed`, above the inbox.

8. "To do done" button (optional): add Script Property `TAGGER_TOKEN` (same value as `VITE_TAGGER_TOKEN` in `apps/extension/.env.local`), then Deploy > New deployment > Web app, Execute as Me, access Anyone; put the URL in `.env.local` as `VITE_TAGGER_URL` and `npm run build`. In Gmail, a thread tagged `TO DO` shows a floating square "Done" button (drag it anywhere; the spot is remembered). Clicking it glows green and takes the label off through the script, logged as done so it is not learned as a wrong tag. After changing the script, Deploy > Manage deployments > Edit > New version keeps the URL.

What it writes: its five labels on job threads (`REPLY NEEDED` also stars the email; `Jobs/Applied` threads are archived out of the inbox, decided 2026-10-03; Gmail brings a thread back to the inbox when a new message arrives) (one per thread, replaced when a newer message changes it; a "none" answer keeps the label already there), "unread" put back if reading ever cleared it, and rows in the Sheet. Corrections are checked hourly: a `Jobs/` label I move, remove or add by hand within 30 days is saved to Corrections, the last 20 go into the model prompt as examples, and two matching corrections for one sender become a rule for that sender. Reading stops after 3 minutes or 80 emails for the model, so the model always gets its turn; model calls go 8 at a time; whatever is left goes in the next run. A model error is retried on the next runs, up to 3 times.

## Where it runs

Options weighed on 2026-10-01: Gmail API from the extension (needs an OAuth client; the user expected USC to block it), Google Apps Script (chosen; a personal script on the USC account works), opening each email in the page and marking it unread again (fragile, ruled out), and plain Gmail filters (no model, no learning). The extension itself still reads only the open thread from the page; the tagger lives apart from it.

## Decisions

- Labels: `TO DO`, `REPLY NEEDED`, `Jobs/Submitted`, `Jobs/Applied`, `Jobs/Rejected`. The user's older labels are left alone.
- On top: Gmail Multiple Inboxes with sections for `TO DO` and `REPLY NEEDED`. `TO DO` and `REPLY NEEDED` are top level so one click shows them all (2026-10-03).
- Start: mail received from 2026-09-30 00:00 Pacific. Anything older is ignored, even when a new reply lands in an old thread (the new message itself is still tagged if it is from after the start).
- OTP and "verify your account" emails get no label. Assessment submitted receipts get `Jobs/Submitted`. Draft application reminders are `TO DO`.
- Where it runs: **Google Apps Script** (option B). Checked 2026-10-01: a personal script on the USC account read the inbox fine. No Cloud project or OAuth client. `GmailApp` reads bodies without marking mail read and adds or removes labels; a time trigger runs it every 5 to 10 minutes; OpenRouter is called with `UrlFetchApp`, the key kept in Script Properties. Corrections are found by comparing each tagged thread's current `Jobs/` label with the one the script set (kept in a log). 
- How it decides: rules settle the clear cases for free (sender and subject: LinkedIn "your application was sent", assessment platforms inviting, "Assessment submitted", alerts and OTP skipped); a cheap OpenRouter model decides the rest. No local model, no evaluation pass over the mailbox (decided 2026-10-01).
- Model: a cheap model on OpenRouter, default `deepseek/deepseek-v4-flash` ($0.042 in, $0.084 out per million tokens on 2026-10-01), with `z-ai/glm-5.3-flash` ($0.15 in, $0.50 out) as the alternative. Set in Script Properties, separate from the drafting model. At about 20 model calls a day this costs cents a month.
- Privacy on OpenRouter: paying alone does not guarantee no logging or training; each host has its own policy. Every request sends the same `PRIVATE_ROUTING` as drafting (`apps/extension/src/adapters/openrouter.ts`): `zdr: true`, `data_collection: "deny"`, and an `ignore` list of Chinese hosts, so email text only goes to hosts with zero data retention that do not train. If no host qualifies, the request fails and the email waits for the next run. Also turn on ZDR and turn off "may train" in the OpenRouter account privacy settings as a second guard.
