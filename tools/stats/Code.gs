// Instant Reply usage counts. Paste into the Apps Script editor of a Google Sheet (Extensions > Apps
// Script), run setup() once, then deploy as a web app (docs/STATS.md). The extension POSTs
// { install, name, events: [{ id, at, kind, email, refactors }] } as text/plain JSON.

const EVENTS = "Events";
const SUMMARY = "Summary";
const HEADER = ["received", "at", "name", "install", "kind", "email", "refactors", "id"];

/** Creates the Events sheet and a Summary sheet of formulas. Safe to run again. */
function setup() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  const events = book.getSheetByName(EVENTS) || book.insertSheet(EVENTS);
  events.getRange(1, 1, 1, HEADER.length).setValues([HEADER]).setFontWeight("bold");
  events.setFrozenRows(1);

  const summary = book.getSheetByName(SUMMARY) || book.insertSheet(SUMMARY);
  summary.clear();
  summary.getRange("A1").setValue("Per person").setFontWeight("bold");
  // QUERY guesses each column's type and refuses avg or max on one it reads as text, so the rows are
  // rebuilt with the refactors column forced to numbers. IFERROR covers tables with no rows yet.
  const rows = `{${EVENTS}!C2:C, ${EVENTS}!E2:E, ${EVENTS}!F2:F, ARRAYFORMULA(IFERROR(${EVENTS}!G2:G * 1, 0)), ${EVENTS}!H2:H}`;
  const query = (sql, empty) => `=IFERROR(QUERY(${rows}, "${sql}", 0), "${empty}")`;
  summary.getRange("A2").setFormula(
    query("select Col1, count(Col5) where Col2 = 'refactor' group by Col1 label Col1 'name', count(Col5) 'refactors'", "No Refactors yet"),
  );
  summary.getRange("D2").setFormula(
    query("select Col1, count(Col5), avg(Col4) where Col2 = 'sent' group by Col1 label Col1 'name', count(Col5) 'emails sent', avg(Col4) 'refactors per sent email'", "No sends yet"),
  );
  summary.getRange("H1").setValue("Refactors per email").setFontWeight("bold");
  summary.getRange("H2").setFormula(
    query("select Col1, Col3, max(Col4) where Col2 = 'refactor' group by Col1, Col3 order by max(Col4) desc label Col1 'name', Col3 'email', max(Col4) 'refactors'", "No Refactors yet"),
  );
}

function doPost(e) {
  const payload = JSON.parse(e.postData.contents);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    // A retry after a lost answer resends events already written; skip ids seen in the last 6 hours.
    const cache = CacheService.getScriptCache();
    const fresh = (payload.events || []).filter((event) => event && event.id && !cache.get(event.id));
    if (fresh.length) {
      const received = new Date();
      const rows = fresh.map((event) => [
        received,
        new Date(event.at),
        String(payload.name || "unknown"),
        String(payload.install || ""),
        String(event.kind),
        String(event.email),
        Number(event.refactors) || 0,
        String(event.id),
      ]);
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(EVENTS);
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, HEADER.length).setValues(rows);
      fresh.forEach((event) => cache.put(event.id, "1", 21600));
    }
    return ContentService.createTextOutput(JSON.stringify({ ok: true, added: fresh.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
