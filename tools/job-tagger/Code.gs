// Job email tagger. Paste into a new project at script.google.com, set the Script Properties, run
// setup() once, then run() (docs/JOB_TAGGER.md, "Install"). setup() creates a Google Sheet named
// "Job tagger log" in Drive: the tagger's memory (what it handled, what it set, my corrections) and
// the place to review a dry run.
//
// Reads mail received since START and puts one label on job threads. Rules settle the clear cases;
// a cheap OpenRouter model decides the rest. Reading mail never marks it read. The only changes it
// ever makes to mail: adding and removing its five labels (setJobLabel), archiving "applied"
// threads (thank you for applying mail stays findable under Jobs/Applied, out of the inbox),
// starring mail that needs a reply, and putting back "unread" if Gmail ever flipped it while
// reading. DRY_RUN (the default) changes nothing in Gmail and only writes what it would do to the
// Log sheet.
//
// Script Properties:
//   OPENROUTER_KEY  required
//   MODEL           default deepseek/deepseek-v4-flash
//   DRY_RUN         "true" (default) or "false"
//   START           default 2026-09-30T00:00:00-07:00
//   TAGGER_TOKEN    shared secret for the extension's "To do done" button (doPost); the same value
//                   goes in apps/extension/.env.local as VITE_TAGGER_TOKEN

const LABELS = {
  "to do": "TO DO", // top level, so one click shows every to do
  "to respond": "REPLY NEEDED", // top level and red, so it is loud in the inbox
  "submitted": "Jobs/Submitted",
  "applied": "Jobs/Applied",
  "rejected": "Jobs/Rejected",
};
const CHOICES = [...Object.keys(LABELS), "none"];
const DEFAULT_MODEL = "deepseek/deepseek-v4-flash";
const DEFAULT_START = "2026-09-30T00:00:00-07:00";

// Same rules as drafting (PRIVATE_ROUTING in apps/extension/src/adapters/openrouter.ts, kept equal by
// a test): hosts that keep nothing, never train, and are not Chinese companies.
const PRIVATE_ROUTING = {
  zdr: true,
  data_collection: "deny",
  ignore: [
    "alibaba", "baidu", "deepseek", "minimax", "moonshotai", "nex-agi", "seed",
    "siliconflow", "stepfun", "streamlake", "tencent", "xiaomi", "z-ai",
  ],
};

const LOG = "Log";
const LOG_HEADER = ["at", "mode", "messageId", "threadId", "from", "subject", "label", "source", "reason"];
const CORRECTIONS = "Corrections";
const CORRECTIONS_HEADER = ["at", "threadId", "from", "subject", "snippet", "tagger", "you"];

const RUN_BUDGET_MS = 5 * 60 * 1000; // Apps Script stops a run at 6 minutes
const READ_BUDGET_MS = 3 * 60 * 1000; // reading stops here so the model always gets its turn
const MAX_MODEL_PER_RUN = 80;
const MODEL_BATCH = 8;
const BODY_CHARS = 2500;
const MAX_ERRORS = 3;
const CORRECTION_CHECK_MS = 60 * 60 * 1000;
const EXAMPLES = 20;

// ---------- Rules (no model, free) ----------

// Senders that are about jobs in general, not my applications: never labelled, never sent to the model.
const SKIP_SENDERS = [
  /^jobalerts-noreply@linkedin\.com$/,
  /^jobs-listings@linkedin\.com$/,
  /@jobright\.ai$/,
  /@match\.indeed\.com$/,
  /@indeed\.com$/,
  /@(mail\.|notifications\.)?joinhandshake\.com$/,
  /@brazen\.com$/,
  /@jobs2web\.com$/,
  /@noreply\d*\.jobs2web\.com$/,
  /@(.*\.)?glassdoor\.com$/,
  /@(.*\.)?ziprecruiter\.com$/,
  /@(.*\.)?wellfound\.com$/,
];

// Applicant tracking systems: always job related, but the same address sends confirmations,
// rejections and invites, so the model picks the label.
const ATS_SENDERS = [
  /greenhouse(-mail)?\.io$/, /@hire\.lever\.co$/, /@ashbyhq\.com$/, /@myworkday\.com$/,
  /workday\.com$/, /@smartrecruiters\.com$/, /successfactors/, /@app\.bamboohr\.com$/,
  /@ripplehire\.com$/, /^jobs\+.*@adp\.com$/, /teamtailor-mail\.com$/, /@mail\.amazon\.jobs$/,
  /icims\.com$/, /jobvite\.com$/, /taleo\.net$/, /@workablemail\.com$/, /workable\.com$/,
  /jazzhr\.com$/, /applytojob\.com$/, /breezy\.hr$/, /recruitee\.com$/, /@(.*\.)?gem\.com$/,
  /@careers\./, /@recruiting\./, /@talent\./, /^careers@/, /^recruiting@/, /^jobs@/,
  /^talent@/, /^hr@/, /^humanresources@/,
];

// Assessment and interview platforms: an invite or reminder is a to do, a receipt is submitted.
const ASSESSMENT_SENDERS = [
  /hackerrank(forwork)?\.com$/, /codesignal\.com$/, /coderbyte\.com$/, /coderpad\.io$/,
  /codility\.com$/, /hirevue\.com$/, /modernhire\.com$/, /karat\.(com|io)$/, /testgorilla\.com$/,
  /mettl\.com$/, /imocha\.io$/, /sparkhire\.com$/, /willo\.video$/, /vidcruiter\.com$/,
  /harver\.com$/, /pymetrics\.(ai|com)$/, /\.tal\.net$/, /hackerearth\.com$/, /canditech\.io$/,
];

const SUBMITTED_WORDS = /\b(submitted|completed|thank you for completing|thanks for completing|received your (test|assessment|submission|responses|answers)|submission received)\b/i;
const INVITE_WORDS = /\b(invit|complete|reminder|take|start|assessment|challenge|interview|test)\w*/i;
const ACCOUNT_WORDS = /\b(one[- ]time pass(word|code)|passcode|verification code|verify your (email|account|candidate account)|confirm your email|activate your account|account (has been )?created|creating (an )?account|reset your password|password reset)\b/i;
const LINKEDIN_SENT = /your application was sent to/i;
// Strict on purpose: anything matching is read by the model, so generic words ("job", "role",
// "opportunity") that fill newsletters and personal mail are left out.
const JOB_WORDS = /\b(application|applying|applied|candidate|candidacy|interview\w*|assessment|recruiter|recruiting|hiring team|talent acquisition|next steps?|coding (challenge|test)|take[- ]home|online test|offer letter)\b/i;
// Personal and school mail domains never count as "a company I applied to".
const SHARED_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "outlook.com", "hotmail.com", "live.com", "icloud.com",
  "me.com", "aol.com", "proton.me", "protonmail.com", "usc.edu",
]);

/** "Name <a@b.com>" -> "a@b.com" */
function senderAddress(from) {
  const m = String(from || "").match(/<([^>]+)>/);
  return (m ? m[1] : String(from || "")).trim().toLowerCase();
}

function senderDomain(address) {
  return address.split("@")[1] || "";
}

const matchesAny = (patterns, address) => patterns.some((p) => p.test(address));

/**
 * Decides what it can without a model.
 * mail: { from, subject, body }; known: { jobThread, jobDomains:Set, learned:Map(address -> label) }
 * Returns { label, source, reason } (label may be "none"), { skip: reason } (not job related: no
 * label, nothing read further), or { model: reason } (job related, the model picks).
 */
function decideByRules(mail, known) {
  const address = senderAddress(mail.from);
  const subject = String(mail.subject || "");
  const head = `${subject}\n${String(mail.body || "").slice(0, 400)}`;

  const learned = known.learned && known.learned.get(address);
  if (learned) return { label: learned, source: "learned", reason: "you corrected this sender before" };

  if (matchesAny(SKIP_SENDERS, address)) return { skip: "job alerts or job board" };

  const atsLike = matchesAny(ATS_SENDERS, address) || matchesAny(ASSESSMENT_SENDERS, address);
  if (ACCOUNT_WORDS.test(subject)) {
    return atsLike || known.jobThread
      ? { label: "none", source: "rule", reason: "account or passcode email" }
      : { skip: "account or passcode email" };
  }

  if (address === "jobs-noreply@linkedin.com") {
    if (LINKEDIN_SENT.test(subject)) return { label: "applied", source: "rule", reason: "LinkedIn Easy Apply sent" };
    return { model: "LinkedIn application update" };
  }

  if (matchesAny(ASSESSMENT_SENDERS, address)) {
    if (SUBMITTED_WORDS.test(subject)) return { label: "submitted", source: "rule", reason: "assessment platform receipt" };
    if (INVITE_WORDS.test(subject)) return { label: "to do", source: "rule", reason: "assessment platform invite" };
    return { model: "assessment platform" };
  }

  if (matchesAny(ATS_SENDERS, address)) return { model: "applicant tracking system" };
  if (known.jobThread) return { model: "thread already tagged as a job" };
  if (known.jobDomains && known.jobDomains.has(senderDomain(address))) return { model: "company I applied to" };
  if (JOB_WORDS.test(head)) return { model: "job words" };
  return { skip: "not job related" };
}

/**
 * Sender rules learned from corrections: when my last two corrections for one address agree,
 * that address always gets that label ("none" included).
 * corrections: [{ from, you }] oldest first.
 */
function learnedSenders(corrections) {
  const byAddress = new Map();
  for (const c of corrections) {
    const address = senderAddress(c.from);
    if (!byAddress.has(address)) byAddress.set(address, []);
    byAddress.get(address).push(c.you);
  }
  const learned = new Map();
  for (const [address, labels] of byAddress) {
    const last = labels.slice(-2);
    if (last.length === 2 && last[0] === last[1] && CHOICES.includes(last[0])) learned.set(address, last[0]);
  }
  return learned;
}

// ---------- Model ----------

const SYSTEM_PROMPT = `You sort emails about my job applications. Pick exactly one label.

to do: the email asks me to complete a step myself: an online assessment, coding challenge, take home, video or AI interview, questionnaire, a form (EEO, personal information, additional information, documents), finish or complete an application, or book a time with a scheduling link. Reminders about such a step count too.
to respond: a real person (recruiter, hiring manager, interviewer) wrote to me and expects a written reply: a question, a request for availability, "are you still interested". Not automated mail.
submitted: a receipt that something I did went through: assessment submitted, interview recorded, form received. Not the first "we got your application" email.
applied: confirms my application was received or sent. Nothing for me to do.
rejected: my application is closed: not moving forward, position filled, decided on other candidates.
none: about jobs but none of the above (a status update with nothing to do, job alerts, events, newsletters, marketing), or not about my job applications at all.

If an application confirmation also asks me to take an assessment or fill a form, it is "to do". If a rejection also suggests other roles, it is "rejected".

Answer with JSON only: {"label": "<one label>", "reason": "<at most 10 words>"}`;

/** Chat messages for one email. examples: corrections [{ from, subject, you }] newest last. */
function buildMessages(mail, examples) {
  let system = SYSTEM_PROMPT;
  if (examples && examples.length) {
    const lines = examples.map((e) => `- From: ${senderAddress(e.from)} | Subject: ${e.subject} -> ${e.you}`);
    system += `\n\nI corrected these before; follow the same judgement:\n${lines.join("\n")}`;
  }
  const body = String(mail.body || "").replace(/\s+/g, " ").trim().slice(0, BODY_CHARS);
  const user = [
    `From: ${mail.from}`,
    `Subject: ${mail.subject}`,
    `Date: ${mail.date}`,
    mail.iReplied ? "I have already replied in this thread." : "",
    "",
    body,
  ].filter((line, i) => line !== "" || i === 4).join("\n");
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

function requestBody(model, messages) {
  return { model, messages, max_tokens: 800, provider: PRIVATE_ROUTING };
}

/** Model text -> { label, reason } or null when no valid label is in it. */
function parseAnswer(text) {
  const raw = String(text || "");
  const json = raw.match(/\{[\s\S]*\}/);
  if (json) {
    try {
      const parsed = JSON.parse(json[0]);
      const label = String(parsed.label || "").trim().toLowerCase();
      if (CHOICES.includes(label)) return { label, reason: String(parsed.reason || "").slice(0, 120) };
    } catch (e) {
      // fall through to the plain text match
    }
  }
  const plain = raw.trim().toLowerCase().replace(/[^a-z ]/g, "");
  if (CHOICES.includes(plain)) return { label: plain, reason: "" };
  return null;
}

// ---------- Apps Script entry points ----------

/** Creates the Log and Corrections sheets and checks the Jobs/ labels exist. Safe to run again. */
function setup() {
  sheet(LOG, LOG_HEADER);
  sheet(CORRECTIONS, CORRECTIONS_HEADER);
  for (const name of Object.values(LABELS)) {
    if (!GmailApp.getUserLabelByName(name)) GmailApp.createLabel(name);
  }
  const cfg = config();
  Logger.log(`Log sheet: ${book().getUrl()}`);
  Logger.log(`Ready. Model ${cfg.model}, ${cfg.dryRun ? "DRY RUN (no labels change)" : "LIVE"}, from ${cfg.start.toISOString()}.`);
}

/**
 * Web app for the extension's "To do done" button (deploy: Execute as Me, access Anyone; the token
 * keeps others out). Body: { token, action: "status" | "done", thread } with Gmail's hex thread id.
 * status answers the thread's label key; done takes TO DO off and logs it as done, so the
 * correction check does not read it as the tagger being wrong.
 */
function doPost(e) {
  const reply = (body) => ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
  let req;
  try {
    req = JSON.parse(e.postData.contents);
  } catch (err) {
    return reply({ ok: false, error: "bad request" });
  }
  const token = PropertiesService.getScriptProperties().getProperty("TAGGER_TOKEN");
  if (!token || req.token !== token) return reply({ ok: false, error: "bad token" });
  const thread = /^[0-9a-f]{6,20}$/.test(String(req.thread)) ? GmailApp.getThreadById(req.thread) : null;
  if (!thread) return reply({ ok: false, error: "no thread" });

  if (req.action === "status") return reply({ ok: true, label: currentJobKey(thread) });
  if (req.action !== "done") return reply({ ok: false, error: "bad action" });

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (currentJobKey(thread) === "to do") {
      setJobLabel(thread, "");
      const last = thread.getMessages().slice(-1)[0];
      appendRows(LOG, LOG_HEADER, [[iso(), "live", last.getId(), thread.getId(), last.getFrom(), last.getSubject(), "", "done", "To do done (button)"]]);
    }
    return reply({ ok: true, label: currentJobKey(thread) });
  } finally {
    lock.releaseLock();
  }
}

/** One off: archives "applied" threads tagged before archiving existed. */
function archiveApplied() {
  const threads = GmailApp.search(`label:${searchName(LABELS.applied)} in:inbox`, 0, 500);
  for (const thread of threads) thread.moveToArchive();
  Logger.log(`Archived ${threads.length} applied threads.`);
}

/** Runs every 10 minutes once startSchedule() is run. */
function startSchedule() {
  stopSchedule();
  ScriptApp.newTrigger("run").timeBased().everyMinutes(10).create();
  Logger.log("Scheduled every 10 minutes.");
}

function stopSchedule() {
  for (const t of ScriptApp.getProjectTriggers()) {
    if (t.getHandlerFunction() === "run") ScriptApp.deleteTrigger(t);
  }
}

/** One pass: learn from my label changes, then tag new mail. */
function run() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return; // a previous run is still going
  try {
    runOnce(Date.now());
  } finally {
    lock.releaseLock();
  }
}

function runOnce(startedAt) {
  const cfg = config();
  const props = PropertiesService.getScriptProperties();
  const log = readRows(LOG, LOG_HEADER);

  if (cfg.dryRun) {
    // Each dry run shows the full picture from START; drop the previous dry run's rows.
    writeRows(LOG, LOG_HEADER, log.filter((r) => r.mode !== "dry"));
  } else if (startedAt - Number(props.getProperty("lastCorrectionCheck") || 0) > CORRECTION_CHECK_MS) {
    checkCorrections(cfg, log);
    props.setProperty("lastCorrectionCheck", String(startedAt));
  }

  const liveLog = readRows(LOG, LOG_HEADER).filter((r) => r.mode === "live" || r.mode === "error");
  const seen = seenIds(liveLog);
  const tagged = latestLabelByThread(liveLog);
  const jobDomains = new Set(
    liveLog.filter((r) => LABELS[r.label]).map((r) => senderDomain(senderAddress(r.from)))
      .filter((d) => d && !SHARED_DOMAINS.has(d) && !matchesAny(ATS_SENDERS, `x@${d}`)),
  );
  const corrections = readRows(CORRECTIONS, CORRECTIONS_HEADER);
  const learned = learnedSenders(corrections);
  const examples = corrections.slice(-EXAMPLES);
  const me = myAddresses();

  const lastComplete = Number(props.getProperty(cfg.dryRun ? "never" : "lastCompleteRun") || 0);
  const since = Math.max(cfg.start.getTime(), lastComplete - 24 * 60 * 60 * 1000);
  const rows = [];
  const pending = [];
  let finished = true;

  for (const thread of searchThreads(since)) {
    if (Date.now() - startedAt > READ_BUDGET_MS || pending.length >= MAX_MODEL_PER_RUN) { finished = false; break; }
    const messages = thread.getMessages();
    const incoming = messages.filter((m) =>
      m.getDate().getTime() >= cfg.start.getTime() && !me.has(senderAddress(m.getFrom())) && !seen.has(m.getId()));
    if (!incoming.length) continue;

    const latest = incoming[incoming.length - 1];
    for (const older of incoming.slice(0, -1)) {
      rows.push(logRow(cfg, older, thread, "", "superseded", "a newer message in the thread decides"));
    }
    const mail = readMail(latest, messages, me);
    const known = {
      jobThread: Boolean(LABELS[tagged.get(thread.getId())]) || threadHasJobLabel(thread),
      jobDomains,
      learned,
    };
    const decision = decideByRules(mail, known);
    if (decision.skip) {
      // Not job related: only the sender is kept, so the message is not read again.
      rows.push([iso(), modeOf(cfg), latest.getId(), thread.getId(), mail.from, "", "", "skip", decision.skip]);
    } else if (decision.model) {
      pending.push({ message: latest, thread, mail, why: decision.model });
    } else {
      rows.push(apply(cfg, latest, thread, mail, decision.label, decision.source, decision.reason));
    }
  }

  for (let i = 0; i < pending.length; i += MODEL_BATCH) {
    if (Date.now() - startedAt > RUN_BUDGET_MS) { finished = false; break; }
    const batch = pending.slice(i, i + MODEL_BATCH);
    const answers = askModel(cfg, batch.map((p) => buildMessages(p.mail, examples)));
    batch.forEach((p, j) => {
      const a = answers[j];
      if (a.error) {
        rows.push([iso(), "error", p.message.getId(), p.thread.getId(), p.mail.from, p.mail.subject, "", "model", a.error]);
      } else {
        rows.push(apply(cfg, p.message, p.thread, p.mail, a.label, "model", a.reason));
      }
    });
  }

  appendRows(LOG, LOG_HEADER, rows);
  if (finished && !cfg.dryRun) props.setProperty("lastCompleteRun", String(startedAt));
  Logger.log(`${modeOf(cfg)}: ${rows.length} rows, ${pending.length} sent to the model${finished ? "" : ", more next run"}.`);
}

// ---------- Gmail ----------

/** The only place that changes mail labels. Touches nothing but the five Jobs/ labels. */
function setJobLabel(thread, name) {
  const allowed = Object.values(LABELS);
  if (name && !allowed.includes(name)) throw new Error(`Refusing to apply label ${name}`);
  for (const label of thread.getLabels()) {
    const current = label.getName();
    if (allowed.includes(current) && current !== name) thread.removeLabel(label);
  }
  if (name) thread.addLabel(GmailApp.getUserLabelByName(name));
}

function apply(cfg, message, thread, mail, label, source, reason) {
  if (label === "none") {
    // Nothing new to tag: a label the thread already has stays, and the log says so, so the
    // correction check does not mistake it for a label I added.
    const kept = currentJobKey(thread);
    if (kept) return [iso(), modeOf(cfg), message.getId(), thread.getId(), mail.from, mail.subject, kept, source, `kept; ${reason}`];
  }
  if (!cfg.dryRun && LABELS[label]) {
    setJobLabel(thread, LABELS[label]);
    if (label === "applied") thread.moveToArchive();
    if (label === "to respond") message.star();
  }
  return [iso(), modeOf(cfg), message.getId(), thread.getId(), mail.from, mail.subject, label, source, reason];
}

/** Reads one message without leaving it read. */
function readMail(message, threadMessages, me) {
  const wasUnread = message.isUnread();
  const mail = {
    from: message.getFrom(),
    subject: message.getSubject(),
    date: message.getDate().toISOString(),
    body: message.getPlainBody(),
    iReplied: threadMessages.some((m) => me.has(senderAddress(m.getFrom()))),
  };
  if (wasUnread && !message.refresh().isUnread()) message.markUnread();
  return mail;
}

function searchThreads(sinceMs) {
  const query = `after:${Math.floor(sinceMs / 1000)} -in:sent -in:drafts -in:chats`;
  const threads = [];
  for (let start = 0; ; start += 100) {
    const page = GmailApp.search(query, start, 100);
    threads.push(...page);
    if (page.length < 100) break;
  }
  return threads.reverse(); // oldest first, so a cut off run resumes in order
}

/** The label key of the Jobs/ label on the thread, or "". */
function currentJobKey(thread) {
  for (const l of thread.getLabels()) {
    const key = Object.keys(LABELS).find((k) => LABELS[k] === l.getName());
    if (key) return key;
  }
  return "";
}

function threadHasJobLabel(thread) {
  return currentJobKey(thread) !== "";
}

function myAddresses() {
  const me = new Set([Session.getEffectiveUser().getEmail().toLowerCase()]);
  for (const alias of GmailApp.getAliases()) me.add(alias.toLowerCase());
  return me;
}

/**
 * Compares each thread's current Jobs/ label with the last one the tagger set. A difference (label
 * moved, removed, or added by hand) is my correction: saved, and logged so it counts once.
 */
function checkCorrections(cfg, log) {
  const live = log.filter((r) => r.mode === "live");
  const ours = latestLabelByThread(live);
  const lastRow = new Map(live.map((r) => [r.threadId, r]));
  const now = new Map(); // threadId -> label key from the current Gmail labels
  const since = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
  for (const [key, name] of Object.entries(LABELS)) {
    const search = `label:${searchName(name)} after:${since}`;
    for (const thread of GmailApp.search(search, 0, 500)) now.set(thread.getId(), key);
  }
  const fixes = [];
  const rows = [];
  const threads = new Set([...ours.keys(), ...now.keys()]);
  for (const threadId of threads) {
    const tagger = ours.get(threadId) || "none";
    const you = now.get(threadId) || "none";
    if (tagger === you) continue;
    if (!LABELS[tagger] && !lastRow.has(threadId)) {
      // A Jobs/ label on a thread the tagger never saw (older than START): not a correction.
      continue;
    }
    const thread = GmailApp.getThreadById(threadId);
    if (!thread) continue;
    const message = thread.getMessages().slice(-1)[0];
    const wasUnread = message.isUnread();
    const snippet = message.getPlainBody().replace(/\s+/g, " ").slice(0, 200);
    if (wasUnread && !message.refresh().isUnread()) message.markUnread();
    fixes.push([iso(), threadId, message.getFrom(), message.getSubject(), snippet, tagger, you]);
    rows.push([iso(), "live", message.getId(), threadId, message.getFrom(), message.getSubject(), you, "you", `was ${tagger}`]);
  }
  appendRows(CORRECTIONS, CORRECTIONS_HEADER, fixes);
  appendRows(LOG, LOG_HEADER, rows);
}

// ---------- OpenRouter ----------

/** One answer per request, in order: { label, reason } or { error }. */
function askModel(cfg, messageLists) {
  const requests = messageLists.map((messages) => ({
    url: "https://openrouter.ai/api/v1/chat/completions",
    method: "post",
    contentType: "application/json",
    headers: { Authorization: `Bearer ${cfg.key}`, "X-Title": "Instant Reply job tagger" },
    payload: JSON.stringify(requestBody(cfg.model, messages)),
    muteHttpExceptions: true,
  }));
  return UrlFetchApp.fetchAll(requests).map((res) => {
    const status = res.getResponseCode();
    const text = res.getContentText();
    if (status === 404) return { error: `no private host serves ${cfg.model} right now` };
    if (status !== 200) return { error: `OpenRouter ${status}: ${text.slice(0, 150)}` };
    let content = "";
    try {
      content = JSON.parse(text).choices[0].message.content;
    } catch (e) {
      return { error: "unreadable OpenRouter reply" };
    }
    return parseAnswer(content) || { error: `no label in reply: ${String(content).slice(0, 80)}` };
  });
}

// ---------- Log helpers ----------

/** Message ids already handled; a message that failed MAX_ERRORS times is given up on. */
function seenIds(rows) {
  const seen = new Set();
  const errors = new Map();
  for (const r of rows) {
    if (r.mode === "error") {
      errors.set(r.messageId, (errors.get(r.messageId) || 0) + 1);
      if (errors.get(r.messageId) >= MAX_ERRORS) seen.add(r.messageId);
    } else {
      seen.add(r.messageId);
    }
  }
  return seen;
}

/** threadId -> the label key the latest decision gave it ("none" included). */
function latestLabelByThread(rows) {
  const latest = new Map();
  for (const r of rows) {
    if (r.mode === "error" || r.source === "superseded" || r.source === "skip") continue;
    latest.set(r.threadId, r.label || "none");
  }
  return latest;
}

function config() {
  const p = PropertiesService.getScriptProperties();
  const key = p.getProperty("OPENROUTER_KEY");
  if (!key) throw new Error("Set OPENROUTER_KEY in Project Settings > Script Properties.");
  return {
    key,
    model: p.getProperty("MODEL") || DEFAULT_MODEL,
    dryRun: (p.getProperty("DRY_RUN") || "true").toLowerCase() !== "false",
    start: new Date(p.getProperty("START") || DEFAULT_START),
  };
}

/** "Jobs/Applied" -> "jobs-applied", the form Gmail search uses for a label. */
const searchName = (name) => name.toLowerCase().replace(/[\/ ]/g, "-");
const modeOf = (cfg) => (cfg.dryRun ? "dry" : "live");
const iso = () => new Date().toISOString();

function logRow(cfg, message, thread, label, source, reason) {
  return [iso(), modeOf(cfg), message.getId(), thread.getId(), message.getFrom(), message.getSubject(), label, source, reason];
}

/** The log spreadsheet: the one this script is bound to, else one it created and remembers. */
function book() {
  const active = SpreadsheetApp.getActiveSpreadsheet && SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty("SHEET_ID");
  if (id) return SpreadsheetApp.openById(id);
  const created = SpreadsheetApp.create("Job tagger log");
  props.setProperty("SHEET_ID", created.getId());
  return created;
}

function sheet(name, header) {
  const b = book();
  let s = b.getSheetByName(name);
  if (!s) {
    s = b.insertSheet(name);
    s.getRange(1, 1, 1, header.length).setValues([header]);
    s.setFrozenRows(1);
  }
  return s;
}

/** Rows as objects keyed by the header. */
function readRows(name, header) {
  const values = sheet(name, header).getDataRange().getValues();
  return values.slice(1).map((v) => Object.fromEntries(header.map((h, i) => [h, String(v[i] ?? "")])));
}

function appendRows(name, header, rows) {
  if (!rows.length) return;
  const s = sheet(name, header);
  s.getRange(s.getLastRow() + 1, 1, rows.length, header.length).setValues(rows);
}

function writeRows(name, header, objects) {
  const s = sheet(name, header);
  s.clearContents();
  const rows = [header, ...objects.map((o) => header.map((h) => o[h]))];
  s.getRange(1, 1, rows.length, header.length).setValues(rows);
}
