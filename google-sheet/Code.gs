/**
 * curl-hire: applications → this Google Sheet, plus a quiet daily digest in Google Chat or Slack.
 *
 * You don't need to edit this file. The columns come from apply.config.js: the Worker sends
 * them with every application, and new questions show up as new columns on the right.
 *
 * Setup (once):
 *   1. Project Settings (gear icon): set Time zone to yours. The digest uses it.
 *   2. Project Settings → Script properties, add:
 *        SECRET            a long random password (the Worker's SHEET_SECRET is the same one)
 *        CHAT_WEBHOOK_URL  optional: a Google Chat, Slack or Discord incoming webhook URL
 *   3. Run the `setup` function once (Run button) and approve the permissions.
 *   4. Deploy → New deployment → Web app. Execute as: Me. Who has access: Anyone.
 *      Copy the web app URL (ends in /exec) for the Worker's SHEET_WEBHOOK_URL.
 */

const SHEET_NAME = 'Applications';
const DIGEST_HOUR = 19; // 7 pm, in the script's time zone. Run `setup` again after changing it.
const DIGEST_MAX_LINES = 10;

function doPost(e) {
  const props = PropertiesService.getScriptProperties();
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return reply_('bad request');
  }
  if (!props.getProperty('SECRET') || data.secret !== props.getProperty('SECRET')) {
    return reply_('forbidden');
  }
  const columns = data.columns || [];
  const row = data.row || {};
  if (!columns.length) return reply_('bad request');
  if (row.submitted_at) row.submitted_at = new Date(row.submitted_at);

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = getSheet_();
    const header = ensureHeader_(sheet, columns.map(([, label]) => label));
    const byLabel = {};
    columns.forEach(([key, label]) => { byLabel[label] = row[key]; });
    sheet.appendRow(header.map((label) => safe_(byLabel[label])));
    props.setProperty('DIGEST_LABELS', JSON.stringify(data.digest || []));
  } finally {
    lock.releaseLock();
  }
  return reply_('ok');
}

/** Posts one short summary a day, and only if someone new applied. */
function sendDigest() {
  const props = PropertiesService.getScriptProperties();
  const webhook = props.getProperty('CHAT_WEBHOOK_URL');
  if (!webhook) return;

  const since = new Date(Number(props.getProperty('DIGEST_AT') || 0));
  const now = new Date();
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  const col = (label) => header.indexOf(label);
  const submitted = col('Submitted');
  const rows = sheet.getRange(2, 1, lastRow - 1, header.length).getValues();
  const fresh = rows
    .filter((r) => r[submitted] instanceof Date && r[submitted] > since)
    .sort((a, b) => b[submitted] - a[submitted]);

  props.setProperty('DIGEST_AT', String(now.getTime()));
  if (fresh.length === 0) return; // stay quiet

  const discord = /discord(app)?\.com\/api\/webhooks/.test(webhook);
  const bold = (s) => (discord ? `**${s}**` : `*${s}*`);
  const labels = JSON.parse(props.getProperty('DIGEST_LABELS') || '[]').filter((l) => col(l) >= 0);
  const lines = fresh.slice(0, DIGEST_MAX_LINES).map((r) => {
    const parts = labels.map((l) => String(r[col(l)] || '').trim()).filter(Boolean);
    if (parts.length) parts[0] = bold(parts[0]);
    else parts.push(bold(r[col('ID')]));
    parts.push(`${r[col('Minutes')]} min`);
    const eggs = String(r[col('Hidden commands found')] || '').split(' ').filter(Boolean).length;
    if (eggs) parts.push(`${eggs} hidden command${eggs > 1 ? 's' : ''}`);
    return '• ' + parts.join(' · ');
  });
  if (fresh.length > DIGEST_MAX_LINES) lines.push(`…and ${fresh.length - DIGEST_MAX_LINES} more`);

  const url = SpreadsheetApp.getActiveSpreadsheet().getUrl();
  const text =
    bold(`${fresh.length} new application${fresh.length > 1 ? 's' : ''} today`) + ` (${rows.length} total)\n` +
    lines.join('\n') + '\n' +
    (discord ? `[Open the sheet](${url})` : `<${url}|Open the sheet>`);

  UrlFetchApp.fetch(webhook, {
    method: 'post',
    contentType: 'application/json; charset=UTF-8',
    payload: JSON.stringify(discord ? { content: text } : { text }),
  });
}

/** Run once: creates the tab and schedules the daily digest. */
function setup() {
  getSheet_();
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === 'sendDigest')
    .forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('sendDigest').timeBased().everyDays(1).atHour(DIGEST_HOUR).create();
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('DIGEST_AT')) props.setProperty('DIGEST_AT', String(Date.now()));
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
}

// Makes sure every label has a column. Existing columns keep their place (and any you
// added yourself are left alone); new ones go on the right. Returns the full header.
function ensureHeader_(sheet, labels) {
  const width = sheet.getLastColumn();
  const header = width ? sheet.getRange(1, 1, 1, width).getValues()[0].map(String) : [];
  const missing = labels.filter((l) => header.indexOf(l) < 0);
  if (missing.length) {
    sheet.getRange(1, header.length + 1, 1, missing.length).setValues([missing]).setFontWeight('bold');
    header.push(...missing);
    sheet.setFrozenRows(1);
  }
  return header;
}

// Applicants type free text; never let it run as a spreadsheet formula.
function safe_(v) {
  if (v === undefined || v === null) return '';
  if (v instanceof Date || typeof v === 'number') return v;
  const s = String(v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function reply_(msg) {
  return ContentService.createTextOutput(msg).setMimeType(ContentService.MimeType.TEXT);
}
