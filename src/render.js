// Turns apply.config.js into everything else the kit needs:
//   rules()        → the server-side checks for each answer
//   renderScript() → apply.sh with your questions and pages spliced in
//   sheetColumns() → the Google Sheet columns, in order
// checkConfig() runs first and explains any mistake in the config.
// Anything optional in the config falls back to the defaults below.

export const JUNK = ["test", "testing", "asdf", "abc", "xyz", "na", "n/a", "none", "nothing", "idk", "dunno", "no",
  "nil", "null", "nope", "hi", "hello", "yes", "ok", "okay", "random", "blah", "lol", "hmm", ".", "..", "...", "-", "--"];
export const DISPOSABLE = ["mailinator.com", "yopmail.com", "guerrillamail.com", "10minutemail.com", "tempmail.com",
  "temp-mail.org", "trashmail.com", "sharklasers.com", "getnada.com", "dispostable.com", "maildrop.cc",
  "throwawaymail.com", "fakeinbox.com", "mintemail.com"];

// The fixed lines of the script. Override any of them with `messages` in the config.
export const DEFAULT_MESSAGES = {
  begin: "Type apply to begin, or help to look around.", // "apply" and "help" get the accent colour
  notFound: "Command not found. Try help.",
  goodbye: "See you.",
  firstQuestion: "Enter moves on. Choices take one key press.",
  reviewTitle: "Here's what you wrote.",
  reviewHint: "Press Enter to send, or type a number to edit that answer.",
  received: "✓ Received. Thank you.",
  nextTitle: "What happens next",
  idLabel: "Your application ID:",
  stopped: "Stopped. Nothing was sent.",
};
// 256-colour terminal codes: https://en.wikipedia.org/wiki/ANSI_escape_code#8-bit
export const DEFAULT_THEME = { accent: 141, error: 203, success: 114 };

// Junk lists plus whatever the config adds, shared by the script and the server.
export function checks(c) {
  const extra = c.checks || {};
  const low = (xs) => (xs || []).map((x) => String(x).trim().toLowerCase()).filter(Boolean);
  return {
    junk: [...new Set([...JUNK, ...low(extra.extraJunk)])],
    disposable: [...new Set([...DISPOSABLE, ...low(extra.extraDisposableDomains)])],
    maxLinks: extra.maxLinks ?? 8,
  };
}

const TYPES = ["text", "name", "email", "links", "choice"];
const BUILTINS = ["apply", "start", "./apply", "help", "site", "web", "website", "clear", "exit", "quit", "logout"];
// Keys the script and the sheet already use for session details.
const RESERVED = ["id", "submitted_at", "minutes", "token", "total", "commands", "eggs", "easter_eggs", "edits",
  "edits_from_review", "os", "shell", "term", "cols", "country", "status", "notes"];

export function checkConfig(c) {
  const problems = [];
  const need = (ok, msg) => { if (!ok) problems.push(msg); };

  need(c && typeof c === "object", "apply.config.js must export an object");
  if (problems.length) throw configError(problems);
  need(c.company?.name, "company.name is missing");
  need(c.company?.prompt && /^[\w.-]{1,20}$/.test(c.company.prompt),
    "company.prompt must be a short word (letters, digits, - _ .), e.g. \"acme\"");
  need(c.role?.title, "role.title is missing");
  need(/^[A-Z0-9]{1,8}$/.test(c.idPrefix || ""), "idPrefix must be 1–8 capital letters or digits, e.g. \"ACME\"");
  need(Array.isArray(c.questions) && c.questions.length > 0, "questions must be a non-empty list");
  need(Array.isArray(c.nextSteps), "nextSteps must be a list of lines");

  const keys = new Set();
  for (const [i, q] of (c.questions || []).entries()) {
    const at = `questions[${i}]${q?.key ? ` (${q.key})` : ""}`;
    if (!q || typeof q !== "object") { problems.push(`${at} must be an object`); continue; }
    need(/^[a-z][a-z0-9_]{0,30}$/.test(q.key || ""), `${at}: key must be lowercase letters, digits or _, starting with a letter`);
    need(!keys.has(q.key), `${at}: key "${q.key}" is used twice`);
    need(!RESERVED.includes(q.key), `${at}: key "${q.key}" is reserved, pick another`);
    keys.add(q.key);
    need(TYPES.includes(q.type), `${at}: type must be one of ${TYPES.join(", ")}`);
    need(q.label, `${at}: label is missing`);
    need(q.prompt, `${at}: prompt is missing`);
    if (q.type === "choice") {
      need(Array.isArray(q.options) && q.options.length >= 2 && q.options.length <= 9,
        `${at}: a choice needs 2 to 9 options (applicants answer with one key press)`);
      for (const o of q.options || []) need(typeof o === "string" && o && !o.includes("|"), `${at}: options must be text without "|"`);
    } else {
      need(Number.isInteger(q.max) && q.max > 0, `${at}: max (the character limit) must be a positive number`);
      need((q.min || 0) <= (q.max || 0), `${at}: min is bigger than max`);
    }
  }
  if (c.questions?.length) {
    need(c.questions.some((q) => q.type === "email"), "one question needs type \"email\": it's how you reply, and it keeps it to one application per person");
    need(c.questions.filter((q) => q.type === "email").length <= 1, "only one question can have type \"email\"");
  }
  for (const k of c.digest || []) need(keys.has(k), `digest lists "${k}", which isn't a question key`);
  if (!problems.length) {
    const seen = new Set();
    for (const [, label] of sheetColumns(c)) {
      need(!seen.has(label), `two sheet columns would both be called "${label}". Give one question a different label or column`);
      seen.add(label);
    }
  }

  const cmds = new Set();
  for (const p of c.pages || []) {
    need(/^[a-z][a-z0-9-]{0,15}$/.test(p.command || ""), `page "${p.command}": command must be one lowercase word`);
    need(!BUILTINS.includes(p.command), `page "${p.command}": that command is built in, pick another`);
    need(!cmds.has(p.command), `page "${p.command}" is listed twice`);
    need(typeof p.body === "string", `page "${p.command}": body is missing`);
    cmds.add(p.command);
  }
  for (const [k, v] of Object.entries(c.messages || {})) {
    need(k in DEFAULT_MESSAGES, `messages.${k} isn't a message the script uses (${Object.keys(DEFAULT_MESSAGES).join(", ")})`);
    need(typeof v === "string" && v.trim() && !v.includes("\n"), `messages.${k} must be one line of text`);
  }
  for (const [k, v] of Object.entries(c.theme || {})) {
    need(k in DEFAULT_THEME, `theme.${k} isn't a colour the script uses (${Object.keys(DEFAULT_THEME).join(", ")})`);
    need(Number.isInteger(v) && v >= 0 && v <= 255, `theme.${k} must be a 256-colour code from 0 to 255`);
  }
  const ck = c.checks || {};
  need(ck.maxLinks === undefined || (Number.isInteger(ck.maxLinks) && ck.maxLinks >= 1 && ck.maxLinks <= 20),
    "checks.maxLinks must be a number from 1 to 20");
  for (const k of ["extraJunk", "extraDisposableDomains"]) {
    need(ck[k] === undefined || (Array.isArray(ck[k]) && ck[k].every((x) => typeof x === "string" && !/\s/.test(x.trim()))),
      `checks.${k} must be a list of single words`);
  }
  for (const h of c.hiddenCommands || []) {
    const runs = [].concat(h.run || []);
    need(runs.length > 0 && runs.every((r) => typeof r === "string" && r.trim()), "each hidden command needs run: \"text\" or a list of them");
    need(typeof h.reply === "string", `hidden command "${runs[0]}" needs a reply`);
    for (const r of runs) need(!/[*?[\]]/.test(r.replace(/\*$/, "")), `hidden command "${r}": only a trailing * is allowed as a wildcard`);
  }

  if (problems.length) throw configError(problems);
  return c;
}

function configError(problems) {
  return new Error("apply.config.js needs fixing:\n  - " + problems.join("\n  - "));
}

// ── server-side checks ──
export function rules(c) {
  const out = {};
  for (const q of c.questions) {
    out[q.key] = {
      label: q.label,
      required: q.required !== false,
      max: q.max || 0,
      min: q.min || 0,
      words: q.words || 0,
      kind: q.type,
      options: q.type === "choice" ? q.options : undefined,
      prose: q.type === "text" && q.prose !== false,
    };
  }
  return out;
}

// ── Google Sheet ──
export function sheetColumns(c) {
  return [
    ["id", "ID"], ["submitted_at", "Submitted"], ["minutes", "Minutes"],
    ...c.questions.map((q) => [q.key, q.column || q.label]),
    ["easter_eggs", "Hidden commands found"], ["commands", "Commands typed"], ["edits", "Edits from review"],
    ["os", "OS"], ["country", "Country"],
    ["status", "Status"], ["notes", "Notes"],
  ];
}

// ── the script ──
// Everything from the config is single-quoted, so no answer, page or reply can run as code.
export const q = (s) => `'${String(s ?? "").replace(/'/g, `'\\''`)}'`;
const arr = (name, items) => `${name}=(\n${items.map((s) => "  " + q(s)).join("\n")}\n)`;
const lines = (s) => String(s ?? "").replace(/^\n+|\s+$/g, "").split("\n");
const printLines = (s) => `printf '%s\\n' ${lines(s).map(q).join(" ")}`;
const tag = (s) => s.toLowerCase().replace(/[^a-z0-9-]+/g, "");
const norm = (s) => s.trim().toLowerCase().replace(/\s+/g, " ");

export function runCommand(origin) {
  return `curl -sL ${origin.startsWith("https://") ? origin.slice(8) : origin} | bash`;
}

export function renderScript(template, c, origin) {
  const Q = c.questions;
  const run = runCommand(origin);
  const msg = { ...DEFAULT_MESSAGES, ...c.messages };
  const theme = { ...DEFAULT_THEME, ...c.theme };
  const ck = checks(c);
  // The begin line, with "apply" and "help" in the accent colour.
  const begin = msg.begin.split(/\b(apply|help)\b/).filter(Boolean)
    .map((p) => (p === "apply" || p === "help" ? `"$A"${q(p)}"$N"` : q(p))).join("");
  const header = [
    "# ──────────────────────────────────────────────────────────────────",
    `#  ${c.company.name} · ${c.role.title}`,
    "#",
    "#  You're reading the script before running it. Good instinct.",
    "#",
    `#  What it does: shows a tiny shell, asks you ${Q.length} quick questions,`,
    `#  and sends your answers to ${origin}.`,
    "#  What it doesn't do: install anything, read your files, or keep",
    "#  running after you're done.",
    "#",
    `#  Run it:   ${run}`,
    "#",
    "#  Made with curl-hire: https://github.com/Second-Order-Systems/curl-hire",
    "# ──────────────────────────────────────────────────────────────────",
  ].join("\n");

  const pages = [
    { command: "help", body: helpPage(c) },
    ...(c.pages || []),
  ];
  const hidden = (c.hiddenCommands || []).map((h) => {
    const runs = [].concat(h.run).map(norm);
    const pattern = runs.map((r) => (r.endsWith("*") ? q(r.slice(0, -1)) + "*" : q(r))).join("|");
    return `    ${pattern}) ${printLines(h.reply)}; add_egg ${q(h.id || tag(runs[0].replace(/\*$/, "")) || "egg")} ;;`;
  });

  const config = [
    `API="\${CURL_HIRE_API:-${origin}}"`,
    `RUN=${q(run)}`,
    `ID_PREFIX=${q(c.idPrefix)}`,
    `PS_NAME=${q(c.company.prompt)}`,
    `TITLE=${q(`${c.company.name} · ${c.role.title}`)}`,
    `DETAILS=${q(c.role.details || "")}`,
    `WEBSITE=${q(c.company.website || "")}`,
    `ACCENT=${theme.accent}; ERROR=${theme.error}; SUCCESS=${theme.success}`,
    "",
    "# ── Messages ─────────────────────────────────────────────────────",
    `MSG_NOT_FOUND=${q(msg.notFound)}`,
    `MSG_GOODBYE=${q(msg.goodbye)}`,
    `MSG_FIRST=${q(msg.firstQuestion)}`,
    `MSG_REVIEW_TITLE=${q(msg.reviewTitle)}`,
    `MSG_REVIEW_HINT=${q(msg.reviewHint)}`,
    `MSG_RECEIVED=${q(msg.received)}`,
    `MSG_NEXT_TITLE=${q(msg.nextTitle)}`,
    `MSG_ID_LABEL=${q(msg.idLabel)}`,
    `MSG_STOPPED=${q(msg.stopped)}`,
    `begin_line() { printf '%s\\n' ${begin}; }`,
    "",
    "# ── The questions ────────────────────────────────────────────────",
    arr("KEYS", Q.map((x) => x.key)),
    arr("SECTION", Q.map((x) => x.section || "")),
    arr("LABEL", Q.map((x) => x.label)),
    arr("TYPE", Q.map((x) => x.type)),
    arr("PROMPT", Q.map((x) => x.prompt)),
    arr("HINT", Q.map((x) => x.hint || "")),
    arr("OPT", Q.map((x) => (x.type === "choice" ? x.options.join("|") : ""))),
    `LIMIT=(${Q.map((x) => x.max || 0).join(" ")})`,
    `REQ=(${Q.map((x) => (x.required === false ? 0 : 1)).join(" ")})`,
    "# Junk checks. The server repeats every one of these, so editing this script doesn't get around them.",
    `MIN=(${Q.map((x) => x.min || 0).join(" ")})        # minimum characters`,
    `MINW=(${Q.map((x) => x.words || 0).join(" ")})       # minimum words`,
    `PROSE=(${Q.map((x) => (x.type === "text" && x.prose !== false ? 1 : 0)).join(" ")})      # must read like real words`,
    `JUNK=${q(` ${ck.junk.join(" ")} `)}`,
    `DISPOSABLE=${q(` ${ck.disposable.join(" ")} `)}`,
    `MAX_LINKS=${ck.maxLinks}`,
    "",
    "# ── Pages for the little shell ───────────────────────────────────",
    `logo() {${c.logo && c.logo.trim() ? `\n  ${printLines(c.logo)}\n` : " :; "}}`,
    `intro() {\n  ${printLines((c.intro || []).join("\n"))}\n}`,
    `next_steps() {\n  ${printLines(c.nextSteps.map((s) => "→ " + s).join("\n"))}\n}`,
    `closing() {${c.closing ? `\n  ${printLines(c.closing)}\n` : " :; "}}`,
    `PAGES=${q(` ${pages.map((p) => p.command).join(" ")} `)}`,
    "page() {",
    '  case "$1" in',
    ...pages.map((p) => `    ${q(p.command)}) ${printLines(p.body)} ;;`),
    "  esac",
    "}",
    "",
    "# Hidden commands. Found ones are recorded with the application.",
    "hidden() {",
    '  case "$1" in',
    ...hidden,
    "    *) return 1 ;;",
    "  esac",
    "}",
  ].join("\n");

  return template
    .replace(/^#: .*\n(\n)?/gm, "")
    .replace("__HEADER__", () => header)
    .replace("__CONFIG__", () => config);
}

function helpPage(c) {
  const rows = [
    ["apply", `start your application${c.duration ? ` (${c.duration})` : ""}`],
    ...(c.pages || []).map((p) => [p.command, p.summary || ""]),
    ...(c.company.website ? [["site", "our website"]] : []),
    ["clear", "clear the screen"],
    ["exit", "leave"],
  ];
  const w = Math.max(...rows.map(([k]) => k.length)) + 3;
  const body = rows.map(([k, v]) => k.padEnd(w) + v).join("\n");
  return c.helpFooter ? `${body}\n\n${c.helpFooter}` : body;
}
