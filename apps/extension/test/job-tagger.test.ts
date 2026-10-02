import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { PRIVATE_ROUTING } from "../src/adapters/openrouter";

// The job tagger (tools/job-tagger/Code.gs) runs in Apps Script. These tests load it into a sandbox
// with stand ins for Gmail, the Sheet, Script Properties and OpenRouter.

const CODE = readFileSync(fileURLToPath(new URL("../../../tools/job-tagger/Code.gs", import.meta.url)), "utf8");
const ME = "me@usc.edu";

type Msg = { id: string; from: string; subject: string; body: string; date: string; unread?: boolean };

function fakeWorld(threadsIn: { id: string; labels?: string[]; messages: Msg[] }[], props: Record<string, string> = {}) {
  const labels = new Map<string, { getName: () => string }>();
  const label = (name: string) => {
    if (!labels.has(name)) labels.set(name, { getName: () => name });
    return labels.get(name)!;
  };
  for (const name of ["Jobs/To do", "Jobs/To respond", "Jobs/Submitted", "Jobs/Applied", "Jobs/Rejected"]) label(name);

  const writes: string[] = [];
  const threads = threadsIn.map((t) => {
    const own = new Set(t.labels ?? []);
    const messages = t.messages.map((m) => {
      let unread = m.unread ?? true;
      const msg = {
        getId: () => m.id,
        getFrom: () => m.from,
        getSubject: () => m.subject,
        getDate: () => new Date(m.date),
        getPlainBody: () => m.body,
        isUnread: () => unread,
        refresh: () => msg,
        markUnread: () => { writes.push(`unread ${m.id}`); unread = true; },
      };
      return msg;
    });
    return {
      own,
      getId: () => t.id,
      getMessages: () => messages,
      getLabels: () => [...own].map(label),
      addLabel: (l: { getName: () => string }) => { writes.push(`add ${t.id} ${l.getName()}`); own.add(l.getName()); },
      removeLabel: (l: { getName: () => string }) => { writes.push(`remove ${t.id} ${l.getName()}`); own.delete(l.getName()); },
    };
  });

  const sheets = new Map<string, unknown[][]>();
  const sheetApi = (name: string) => {
    const rows = () => sheets.get(name)!;
    return {
      getRange: (r: number, _c: number, _n: number, _w: number) => ({
        setValues: (values: unknown[][]) => values.forEach((v, i) => (rows()[r - 1 + i] = [...v])),
      }),
      setFrozenRows: () => {},
      getLastRow: () => rows().length,
      getDataRange: () => ({ getValues: () => rows().map((r) => [...r]) }),
      clearContents: () => rows().splice(0),
    };
  };

  const store = new Map(Object.entries({ OPENROUTER_KEY: "k", ...props }));
  const modelCalls: { model: string; provider: unknown; email: string }[] = [];
  let answer: (email: string) => string = (email) => (email.includes("not moving forward") ? "rejected" : "applied");

  const ctx = vm.createContext({
    Logger: { log: () => {} },
    Session: { getEffectiveUser: () => ({ getEmail: () => ME }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k: string) => store.get(k) ?? null,
        setProperty: (k: string, v: string) => void store.set(k, v),
      }),
    },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({
        getSheetByName: (n: string) => (sheets.has(n) ? sheetApi(n) : null),
        insertSheet: (n: string) => { sheets.set(n, []); return sheetApi(n); },
      }),
    },
    GmailApp: {
      getAliases: () => [],
      getUserLabelByName: (n: string) => labels.get(n) ?? null,
      createLabel: (n: string) => { writes.push(`create ${n}`); return label(n); },
      getThreadById: (id: string) => threads.find((t) => t.getId() === id) ?? null,
      search: (q: string, start: number) => {
        if (start > 0) return [];
        const m = q.match(/^label:(\S+)/);
        if (!m) return [...threads];
        return threads.filter((t) => [...t.own].some((n) => n.toLowerCase().replace(/[/ ]/g, "-") === m[1]));
      },
    },
    UrlFetchApp: {
      fetchAll: (requests: { payload: string }[]) =>
        requests.map((r) => {
          const body = JSON.parse(r.payload);
          const email = body.messages[1].content;
          modelCalls.push({ model: body.model, provider: body.provider, email });
          const content = JSON.stringify({ label: answer(email), reason: "test" });
          return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ choices: [{ message: { content } }] }) };
        }),
    },
  });
  vm.runInContext(CODE, ctx);
  const call = (fn: string, ...args: unknown[]) => (ctx[fn] as (...a: unknown[]) => unknown)(...args);
  const log = () => (sheets.get("Log") ?? []).slice(1).map((r) => ({ from: r[4], label: r[6], source: r[7], mode: r[1] }));
  return {
    call, writes, modelCalls, log, threads, store,
    setAnswer: (fn: (email: string) => string) => (answer = fn),
    corrections: () => (sheets.get("Corrections") ?? []).slice(1),
  };
}

const at = "2026-10-01T10:00:00Z";
const greenhouse = (id: string, body: string): Msg => ({
  id, from: "Verkada <no-reply@us.greenhouse-mail.io>", subject: "Thank you for applying to Verkada", body, date: at,
});

describe("job tagger rules", () => {
  const { call } = fakeWorld([]);
  const decide = (from: string, subject: string, body = "", known = {}) =>
    JSON.parse(JSON.stringify(call("decideByRules", { from, subject, body }, { jobDomains: new Set(), learned: new Map(), ...known })));

  it("settles the clear cases without the model", () => {
    expect(decide("LinkedIn <jobs-noreply@linkedin.com>", "Bhuvan, your application was sent to ZealTech").label).toBe("applied");
    expect(decide("HackerRank <support@hackerrankforwork.com>", "Your HackerRank MathWorks Programming Challenge Invitation").label).toBe("to do");
    expect(decide("Coderbyte <do-not-reply@coderbyte.com>", "Assessment submitted for Netic AI").label).toBe("submitted");
    expect(decide("HireVue <interviews@hirevue.com>", "Video Interview with MathWorks").label).toBe("to do");
    expect(decide("Workday <stevens@otp.workday.com>", "Verify your candidate account").label).toBe("none");
  });

  it("skips mail that is not about my applications, without the model", () => {
    expect(decide("LinkedIn <jobalerts-noreply@linkedin.com>", "Software Engineer at MintMCP").skip).toBeTruthy();
    expect(decide("Jobright <noreply@jobright.ai>", "IBM just posted a 92% match role").skip).toBeTruthy();
    expect(decide("Grubhub <email@a.grubhub.com>", "Now serving BOGO lunch").skip).toBeTruthy();
    expect(decide("Friend <pal@gmail.com>", "bro, want to meet today?").skip).toBeTruthy();
    expect(decide("Friend <pal@gmail.com>", "new job at my place, great role").skip).toBeTruthy();
  });

  it("sends ambiguous job mail to the model", () => {
    expect(decide("Masimo <danaher@myworkday.com>", "Application Received").model).toBeTruthy();
    expect(decide("Trevor <trevor.allred@terros.na.teamtailor-mail.com>", "Follow-up Questions").model).toBeTruthy();
    expect(decide("Tony <tony@goaly.ai>", "Quick question", "", { jobDomains: new Set(["goaly.ai"]) }).model).toBeTruthy();
    expect(decide("Tony <tony@goaly.ai>", "Re: hello", "", { jobThread: true }).model).toBeTruthy();
    expect(decide("Recruiter <a@startup.io>", "Interview availability next week").model).toBeTruthy();
  });

  it("follows a sender rule learned from two matching corrections", () => {
    const learned = call("learnedSenders", [
      { from: "X <a@b.com>", you: "to do" },
      { from: "a@b.com", you: "to do" },
      { from: "c@d.com", you: "none" },
    ]) as Map<string, string>;
    expect(learned.get("a@b.com")).toBe("to do");
    expect(learned.has("c@d.com")).toBe(false);
    expect(decide("X <a@b.com>", "anything", "", { learned }).label).toBe("to do");
  });

  it("reads the model's answer or rejects it", () => {
    const parse = (t: string) => JSON.parse(JSON.stringify(call("parseAnswer", t) ?? null));
    expect(parse('{"label": "To Do", "reason": "OA link"}')).toEqual({ label: "to do", reason: "OA link" });
    expect(parse('Sure!\n```json\n{"label":"rejected","reason":"x"}\n```')).toEqual({ label: "rejected", reason: "x" });
    expect(parse("applied")).toEqual({ label: "applied", reason: "" });
    expect(parse('{"label": "urgent"}')).toBeNull();
    expect(parse("")).toBeNull();
  });

  it("uses the same private routing as drafting", () => {
    const { call: c } = fakeWorld([]);
    const body = JSON.parse(JSON.stringify(c("requestBody", "m", [])));
    expect(body.provider).toEqual(JSON.parse(JSON.stringify(PRIVATE_ROUTING)));
  });
});

describe("job tagger runs", () => {
  const world = () =>
    fakeWorld([
      { id: "t1", messages: [greenhouse("m1", "We received your application.")] },
      { id: "t2", messages: [greenhouse("m2", "We are not moving forward.")] },
      { id: "t3", messages: [{ id: "m3", from: "Grubhub <email@a.grubhub.com>", subject: "BOGO lunch", body: "deals", date: at }] },
      { id: "t4", messages: [{ id: "m4", from: "LinkedIn <jobs-noreply@linkedin.com>", subject: "Bhuvan, your application was sent to X", body: "", date: at }] },
      { id: "t5", messages: [greenhouse("m5", "old one")].map((m) => ({ ...m, date: "2026-09-20T10:00:00Z" })) },
      { id: "t6", messages: [{ id: "m6", from: `Me <${ME}>`, subject: "Re: application", body: "thanks", date: at }] },
    ]);

  it("dry run changes nothing in Gmail and logs what it would do", () => {
    const w = world();
    w.call("setup");
    w.call("runOnce", Date.now());
    expect(w.writes).toEqual([]);
    expect(w.log()).toEqual([
      { from: "Verkada <no-reply@us.greenhouse-mail.io>", label: "applied", source: "model", mode: "dry" },
      { from: "Verkada <no-reply@us.greenhouse-mail.io>", label: "rejected", source: "model", mode: "dry" },
      { from: "Grubhub <email@a.grubhub.com>", label: "", source: "skip", mode: "dry" },
      { from: "LinkedIn <jobs-noreply@linkedin.com>", label: "applied", source: "rule", mode: "dry" },
    ].reverse());
    // Only the two Greenhouse emails reach the model, both with private routing.
    expect(w.modelCalls).toHaveLength(2);
    expect(w.modelCalls.every((c) => c.model === "deepseek/deepseek-v4-flash" && JSON.stringify(c.provider) === JSON.stringify(PRIVATE_ROUTING))).toBe(true);
    // A second dry run replaces the first one's rows.
    w.call("runOnce", Date.now());
    expect(w.log()).toHaveLength(4);
  });

  it("live run only adds Jobs labels, keeps mail unread, and does not repeat itself", () => {
    const w = world();
    w.store.set("DRY_RUN", "false");
    w.call("setup");
    w.call("runOnce", Date.now());
    expect(w.writes.sort()).toEqual(["add t1 Jobs/Applied", "add t2 Jobs/Rejected", "add t4 Jobs/Applied"]);
    expect(w.threads.flatMap((t) => t.getMessages()).every((m) => m.isUnread())).toBe(true);
    w.call("runOnce", Date.now());
    expect(w.modelCalls).toHaveLength(2);
    expect(w.writes).toHaveLength(3);
  });

  it("moves a thread to its new label when a new message changes it", () => {
    const w = world();
    w.store.set("DRY_RUN", "false");
    w.call("runOnce", Date.now());
    const t1 = w.threads[0];
    (t1.getMessages() as unknown[]).push({
      getId: () => "m1b", getFrom: () => "Verkada <no-reply@us.greenhouse-mail.io>", getSubject: () => "Update",
      getDate: () => new Date(at), getPlainBody: () => "We are not moving forward.", isUnread: () => true,
      refresh() { return this; }, markUnread: () => {},
    });
    w.call("runOnce", Date.now());
    expect(w.writes.slice(-2)).toEqual(["remove t1 Jobs/Applied", "add t1 Jobs/Rejected"]);
  });

  it("learns when I move or remove a label", () => {
    const w = world();
    w.store.set("DRY_RUN", "false");
    w.call("runOnce", Date.now());
    w.threads[0].own.delete("Jobs/Applied");
    w.threads[0].own.add("Jobs/To do");
    w.threads[3].own.delete("Jobs/Applied");
    w.store.set("lastCorrectionCheck", "0");
    w.call("runOnce", Date.now());
    const fixes = w.corrections().map((r) => [r[1], r[5], r[6]]);
    expect(fixes.sort()).toEqual([["t1", "applied", "to do"], ["t4", "applied", "none"]]);
    // Counted once: the next check finds nothing new.
    w.store.set("lastCorrectionCheck", "0");
    w.call("runOnce", Date.now());
    expect(w.corrections()).toHaveLength(2);
  });

  it("refuses to touch any label that is not a Jobs label", () => {
    const w = world();
    expect(() => w.call("setJobLabel", w.threads[0], "To respond")).toThrow(/Refusing/);
    expect(w.writes).toEqual([]);
  });
});
