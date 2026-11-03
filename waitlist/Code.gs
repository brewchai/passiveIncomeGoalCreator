/**
 * Waitlist writer for butfirstfire.com. Appends one row per signup to the waitlist sheet.
 *
 * Deploy, once, from the sheet itself so the script is bound to it:
 *   1. Open https://docs.google.com/spreadsheets/d/1N98gMUxnpWqOO4PW4-TsBwVO1eyNvtljicirovDlX8g/edit
 *   2. Extensions → Apps Script. Delete whatever is in Code.gs and paste this whole file. Save.
 *   3. Deploy → New deployment → gear icon → Web app.
 *        Description: waitlist
 *        Execute as: Me
 *        Who has access: Anyone          (required: the browser posts here with no Google login)
 *      Deploy, then Authorize access, pick your account, Advanced → Go to project → Allow.
 *   4. Copy the Web app URL. It ends in /exec.
 *   5. Paste it into frontend/index.html as the value of WAITLIST_SHEET. Commit, push.
 *
 * Any later code change needs Deploy → Manage deployments → pencil → Version: New → Deploy,
 * or the live URL keeps running the old code.
 *
 * Test from a terminal (the 302 is normal, follow it):
 *   curl -sL -X POST "<exec url>" --data-urlencode "email=test@example.com" --data-urlencode "source=fire-planner-waitlist"
 *   → {"success":true}
 */

var HEADERS = ['timestamp', 'email', 'source', 'builderStep', 'page', 'currency'];

function doPost(e) {
  var p = (e && e.parameter) || {};
  var email = String(p.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json_({ success: false, error: 'bad email' });

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
    sheet.appendRow([
      new Date(),
      email,
      String(p.source || ''),
      String(p.builderStep || ''),
      String(p.page || ''),
      String(p.currency || '')
    ]);
  } finally {
    lock.releaseLock();
  }
  return json_({ success: true });
}

function doGet() {
  return json_({ ok: true, what: 'butfirstfire waitlist' });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
