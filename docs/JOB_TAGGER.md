# Job email tagger: research and proposed design

Status: built 2026-10-01 (`tools/job-tagger/Code.gs`, tests in `apps/extension/test/job-tagger.test.ts`), not installed yet. Install steps below; decisions at the end.

## Goal

Read job related email from 2026-09-30 onward (and everything new after that), and tag it so the two things that matter stand out:

1. **To do**: the application asks me to do something. Online assessment (OA), coding challenge, take home, video interview, pre-interview questions, a form (EEO, personal info, additional info), "complete your application", scheduling.
2. **To respond**: a person wrote and expects a reply (recruiter questions, availability, follow ups).

Everything else stays as it is. Hard rules:

- Only job related email is touched, and "touched" means adding or removing our own labels. Never archive, delete, move, send, star, or change read state.
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
| `Jobs/To do` | I must do something with a link or a form | OA, HireVue, HackerRank, EEO form, "complete your (draft) application", personal info request, scheduling link |
| `Jobs/To respond` | A person expects a written reply | recruiter questions, availability, "are you still interested" |
| `Jobs/Submitted` | Receipt that an assessment or step I did went through | "Assessment submitted for Netic AI" (Coderbyte) |
| `Jobs/Applied` | Application confirmation only | "Thank you for applying" |
| `Jobs/Rejected` | Closed | "not moving forward" |
| (no label) | Job related but none of the above | "status update" with nothing in it, account created, OTP, verify your candidate account |

The model returns the category, a one line reason, and (for To do) a deadline if the email states one. The deadline is useful for ordering later.

### 3. Label

- Labels live under `Jobs/` so they never collide with the existing "To respond", "Job Applications" and "Job Rejects" labels (those stay as they are and are used only as training examples). Created 2026-10-01: `Jobs/To do` (Label_3, red), `Jobs/To respond` (Label_4, orange), `Jobs/Submitted` (Label_5, green), `Jobs/Applied` (Label_6, light grey), `Jobs/Rejected` (Label_7, dark grey). Code looks labels up by name, never by these ids.
- The tagger only ever calls "add label" and "remove label" with label ids it created. A single function holds the allowlist; nothing else can modify mail. Tests check this.
- Each message is processed once (remember its id). Reprocessing a thread happens only when a new message arrives in it.

### 4. Learn from my fixes

- When I remove a `Jobs/...` label, or move a thread from one to another, or add one by hand to an untagged thread, that is a correction: store the email's sender, subject, snippet, what the tagger said, what I said.
- Corrections feed the model as examples (the most recent and most similar ones) and, once enough pile up, turn into notes in the same way voice learning works today (`learn.ts`: the model rewrites a short notes file as a whole, never appended to). Repeated corrections for one sender turn into a sender rule ("always To do", "never job related").
- Bootstrap: the existing "To respond", "Job Applications" and "Job Rejects" labels give a few hundred examples on day one.

### "Put it on top"

Gmail does not let an extension or the API reorder the inbox. Two ways to get "To respond" and "To do" on top:

- **Multiple Inboxes** (Gmail settings, one time, by hand): sections above the normal inbox for `label:jobs-to-do` and `label:jobs-to-respond`. Works in Gmail on the web with no code. Chosen 2026-10-01.
- A small panel injected by the extension above the inbox list, listing those threads. More work, and Gmail's DOM moves.

## Install

1. Create a Google Sheet named "Job tagger" in the USC account. Extensions > Apps Script. Replace the editor's contents with `tools/job-tagger/Code.gs` and save.
2. Project Settings (gear) > Script Properties: add `OPENROUTER_KEY`. Optional: `MODEL` (default `deepseek/deepseek-v4-flash`), `START` (default `2026-09-30T00:00:00-07:00`). Leave `DRY_RUN` unset: it starts in dry run.
3. Pick `setup` in the function menu and Run. Accept the permissions (Gmail, the Sheet, external requests). It makes the Log and Corrections tabs.
4. Pick `run` and Run. Dry run: nothing in Gmail changes; the Log tab lists every email since START with the label it would get, from a rule or the model, and why. Not job related mail shows only the sender.
5. If the Log looks right, set `DRY_RUN` to `false` and Run `run` again: labels go on.
6. Run `startSchedule` once: it runs every 10 minutes from then on. `stopSchedule` stops it.
7. Gmail Settings > Inbox > Inbox type: Multiple Inboxes, sections `label:jobs-to-do` and `label:jobs-to-respond`, above the inbox.

What it writes: the five `Jobs/` labels on job threads (one per thread, replaced when a newer message changes it; a "none" answer keeps the label already there), "unread" put back if reading ever cleared it, and rows in the Sheet. Corrections are checked hourly: a `Jobs/` label I move, remove or add by hand within 30 days is saved to Corrections, the last 20 go into the model prompt as examples, and two matching corrections for one sender become a rule for that sender. Up to 4.5 minutes per run, model calls 8 at a time; whatever is left goes in the next run. A model error is retried on the next runs, up to 3 times.

## Where it runs: the big decision

The extension today reads only the open thread from the page, with no Gmail API and no OAuth (a product decision in `docs/PLAN.md`). Tagging the whole inbox in the background does not fit that model:

| Option | How | Read state | Runs when | Cost |
| --- | --- | --- | --- | --- |
| A. Gmail API from the extension | `chrome.identity` OAuth, scope `gmail.modify`, poll `history.list` every few minutes | Reading with the API never marks mail read, so no "open then mark unread" dance | Chrome is open | Needs a Google Cloud project and OAuth client. USC (Google Workspace) may block unverified apps |
| B. Google Apps Script | A script in my Google account, time trigger every 5 to 10 minutes, `GmailApp` labels, calls OpenRouter | Reading does not mark read | Always, even with the laptop closed | Lives outside this repo's extension. Workspace may still restrict it, less often than A |
| C. Page only (no API) | The content script opens each email in Gmail's UI and marks it unread again | Opening marks read; must undo it, which is fragile and visible | Gmail tab open | Breaks on Gmail DOM changes; slow; the risk you described |
| D. Plain Gmail filters | Keyword filters only | Untouched | Always | No model, no learning, poor at telling confirmation from OA |

Recommendation: **A**, with the classifier in `packages/core` (pure, tested, same ports pattern) so it can move to B later if Workspace or "laptop closed" becomes a problem. C is the only option that risks messing with my email, so it is out.

## Fit with the codebase

- `packages/core`: new `triage.ts` (gate rules, classify prompt, parse result), contracts for `MailSummary`, `TriageResult`, `Correction`, a `MailSource` port (list new mail, get message, add or remove label, read label changes). Tests with fixtures made from the real examples above (sender, subject, snippet only).
- `apps/extension/src/adapters/gmail-api.ts`: implements `MailSource` with the Gmail REST API.
- Service worker: an alarm (`chrome.alarms`) runs the triage loop; it stays the only holder of the OpenRouter key.
- Popup or settings page: on/off switch, start date, what was tagged recently, corrections, Learn now. Neutral, not themed.
- Model calls: one short call per job email (subject plus trimmed body). About 50 a day at the volume seen.

## Decisions (2026-10-01)

- Labels: `Jobs/To do`, `Jobs/To respond`, `Jobs/Submitted`, `Jobs/Applied`, `Jobs/Rejected` (created). Existing labels untouched, used as examples.
- On top: Gmail Multiple Inboxes with sections for `Jobs/To do` and `Jobs/To respond`.
- Start: mail received from 2026-09-30 00:00 Pacific. Anything older is ignored, even when a new reply lands in an old thread (the new message itself is still tagged if it is from after the start).
- OTP and "verify your account" emails get no label. Assessment submitted receipts get `Jobs/Submitted`. Draft application reminders are `Jobs/To do`.
- Where it runs: **Google Apps Script** (option B). Checked 2026-10-01: a personal script on the USC account read the inbox fine. No Cloud project or OAuth client. `GmailApp` reads bodies without marking mail read and adds or removes labels; a time trigger runs it every 5 to 10 minutes; OpenRouter is called with `UrlFetchApp`, the key kept in Script Properties. Corrections are found by comparing each tagged thread's current `Jobs/` label with the one the script set (kept in a log). Option C (open in the page, mark unread) is no longer needed.
- How it decides: rules settle the clear cases for free (sender and subject: LinkedIn "your application was sent", assessment platforms inviting, "Assessment submitted", alerts and OTP skipped); a cheap OpenRouter model decides the rest. No local model, no evaluation pass over the mailbox (decided 2026-10-01).
- Model: a cheap model on OpenRouter, default `deepseek/deepseek-v4-flash` ($0.042 in, $0.084 out per million tokens on 2026-10-01), with `z-ai/glm-5.3-flash` ($0.15 in, $0.50 out) as the alternative. Set in Script Properties, separate from the drafting model. At about 20 model calls a day this costs cents a month.
- Privacy on OpenRouter: paying alone does not guarantee no logging or training; each host has its own policy. Every request sends the same `PRIVATE_ROUTING` as drafting (`apps/extension/src/adapters/openrouter.ts`): `zdr: true`, `data_collection: "deny"`, and an `ignore` list of Chinese hosts, so email text only goes to hosts with zero data retention that do not train. If no host qualifies, the request fails and the email waits for the next run. Also turn on ZDR and turn off "may train" in the OpenRouter account privacy settings as a second guard.
