// google-sheet/Code.gs runs on Google's servers. This runs it against a small fake of the
// Apps Script services, to check the columns, the secret and the digest.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import example from "../examples/2os.config.js";
import { sheetColumns } from "../src/render.js";

const CODE = readFileSync(new URL("../google-sheet/Code.gs", import.meta.url), "utf8");

function appsScript(props = {}) {
  const grid = [];
  const posted = [];
  const range = (r, c, h, w) => ({
    getValues: () => Array.from({ length: h }, (_, i) => Array.from({ length: w }, (_, j) => grid[r - 1 + i]?.[c - 1 + j] ?? "")),
    setValues: (v) => { v.forEach((row, i) => row.forEach((x, j) => { (grid[r - 1 + i] ||= [])[c - 1 + j] = x; })); return range(r, c, h, w); },
    setFontWeight: () => range(r, c, h, w),
  });
  const sheet = {
    getLastRow: () => grid.length,
    getLastColumn: () => Math.max(0, ...grid.map((r) => r.length)),
    getRange: range,
    appendRow: (row) => grid.push(row),
    setFrozenRows: () => {},
  };
  const store = { ...props };
  const ctx = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: () => sheet, insertSheet: () => sheet, getUrl: () => "https://sheet" }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => store[k] ?? null, setProperty: (k, v) => { store[k] = v; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: { MimeType: { TEXT: "text" }, createTextOutput: (s) => ({ setMimeType: () => s }) },
    UrlFetchApp: { fetch: (url, o) => posted.push({ url, body: JSON.parse(o.payload) }) },
    ScriptApp: {},
    Date,
  };
  vm.createContext(ctx);
  vm.runInContext(CODE, ctx);
  const post = (body) => ctx.doPost({ postData: { contents: JSON.stringify(body) } });
  return { ctx, grid, posted, store, post };
}

const columns = sheetColumns(example);
const row = (over = {}) => ({
  id: "2OS-AAAA1111", submitted_at: new Date().toISOString(), minutes: 4.2, name: "Ada Lovelace", city: "Bengaluru",
  now: "Working a job", drive: "Learning fast", built: "=HYPERLINK(\"evil\")", easter_eggs: "whoami sudo", status: "New", ...over,
});

test("refuses posts without the secret", () => {
  const s = appsScript({ SECRET: "s3cret" });
  assert.equal(s.post({ secret: "wrong", columns, row: row() }), "forbidden");
  assert.equal(s.grid.length, 0);
});

test("writes a header, then rows by column label, formula-safe", () => {
  const s = appsScript({ SECRET: "s3cret" });
  assert.equal(s.post({ secret: "s3cret", columns, digest: ["Name"], row: row() }), "ok");
  assert.equal(s.post({ secret: "s3cret", columns, digest: ["Name"], row: row({ name: "Grace Hopper" }) }), "ok");
  assert.deepEqual(s.grid[0], columns.map(([, l]) => l));
  const at = (label) => s.grid[0].indexOf(label);
  assert.equal(s.grid[1][at("Name")], "Ada Lovelace");
  assert.equal(s.grid[2][at("Name")], "Grace Hopper");
  assert.equal(s.grid[1][at("Proudest build")], "'=HYPERLINK(\"evil\")");
  assert.ok(s.grid[1][at("Submitted")] instanceof Date);
});

test("a new question becomes a new column on the right; old rows stay put", () => {
  const s = appsScript({ SECRET: "s" });
  s.post({ secret: "s", columns, row: row() });
  const more = [...columns.slice(0, -2), ["salary", "Salary"], ...columns.slice(-2)];
  s.post({ secret: "s", columns: more, row: row({ salary: "Negotiable" }) });
  assert.equal(s.grid[0].at(-1), "Salary");
  assert.equal(s.grid[0].length, columns.length + 1);
  assert.equal(s.grid[2].at(-1), "Negotiable");
  assert.equal(s.grid[1][s.grid[0].indexOf("Name")], "Ada Lovelace");
});

test("digest: one line per new applicant, quiet when nobody applied", () => {
  const s = appsScript({ SECRET: "s", CHAT_WEBHOOK_URL: "https://chat.googleapis.com/x", DIGEST_AT: "0" });
  s.post({ secret: "s", columns, digest: ["Name", "City", "Right now", "Matters most"], row: row() });
  s.ctx.sendDigest();
  assert.equal(s.posted.length, 1);
  assert.match(s.posted[0].body.text, /^\*1 new application today\* \(1 total\)\n• \*Ada Lovelace\* · Bengaluru · Working a job · Learning fast · 4\.2 min · 2 hidden commands\n<https:\/\/sheet\|Open the sheet>$/);
  s.ctx.sendDigest();
  assert.equal(s.posted.length, 1);
});

test("digest speaks Discord's format when given a Discord webhook", () => {
  const s = appsScript({ SECRET: "s", CHAT_WEBHOOK_URL: "https://discord.com/api/webhooks/1/x", DIGEST_AT: "0" });
  s.post({ secret: "s", columns, digest: ["Name"], row: row() });
  s.ctx.sendDigest();
  assert.match(s.posted[0].body.content, /^\*\*1 new application today\*\*.*\n• \*\*Ada Lovelace\*\* · 4\.2 min.*\n\[Open the sheet\]\(https:\/\/sheet\)$/s);
});
