// curl-hire: a terminal-only job application on Cloudflare Workers (free tier).
//
//   GET  /         → the interactive script (curl -sL <your domain> | bash)
//   GET  /start    → a signed session token
//   POST /submit   → checks every answer, stores one application per email, returns its ID
//   GET  /export   → every application as CSV (backup; needs Authorization: Bearer <EXPORT_TOKEN>)
//
// Each application is also appended to a Google Sheet (see google-sheet/Code.gs).
// Your questions, pages and copy live in apply.config.js, not here.

import config from "../apply.config.js";
import TEMPLATE from "./apply.sh";
import { checkConfig, rules, checks, sheetColumns, renderScript, runCommand } from "./render.js";
import { makeValidator } from "./validate.js";

checkConfig(config);

// The real gate (src/validate.js). Mirrors the checks in apply.sh, so editing the script gets nobody past them.
const RULES = rules(config);
const FIELDS = Object.keys(RULES);
const EMAIL = FIELDS.find((f) => RULES[f].kind === "email");
const COLUMNS = sheetColumns(config);
const DIGEST = (config.digest || []).map((k) => COLUMNS.find(([key]) => key === k)[1]);
const validate = makeValidator(RULES, checks(config));

const LIMITS = { minSeconds: 45, maxSessionHours: 3, perHour: 5, ...config.limits };

const scripts = new Map(); // rendered script per origin (workers.dev, custom domain, localhost)

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    // The script gets piped into bash, so never serve it over plain http.
    if (url.protocol === "http:" && !local) {
      url.protocol = "https:";
      return Response.redirect(url.toString(), 301);
    }
    const origin = url.origin;
    const run = runCommand(origin);

    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/apply.sh")) {
      const accept = request.headers.get("accept") || "";
      if (accept.includes("text/html")) return text(browserText(run));
      if (!scripts.has(origin)) scripts.set(origin, renderScript(TEMPLATE, config, origin));
      return new Response(scripts.get(origin), {
        headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
      });
    }
    if (url.pathname === "/start" || url.pathname === "/submit") {
      // Session tokens are signed with EXPORT_TOKEN. Without it they could be forged, so refuse.
      if (!env.EXPORT_TOKEN) return text("Applications aren't open yet: this site isn't fully set up.\n", 503);
    }
    if (request.method === "GET" && url.pathname === "/start") return text(await makeToken(env));
    if (request.method === "POST" && url.pathname === "/submit") return submit(request, env, ctx, run);
    if (request.method === "GET" && url.pathname === "/export") return exportCsv(request, env);

    return text(`Nothing here. To apply: ${run}\n`, 404);
  },
};

function browserText(run) {
  return `This application is terminal only.

Open a terminal and run:

    ${run}

Want to read the script first? Run: ${run.replace(/ \| bash$/, "")}
${config.company.website ? `\nAbout us: ${config.company.website}\n` : ""}`;
}

async function submit(request, env, ctx, run) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return text(`That request wasn't in the format we expect. Apply with: ${run}\n`, 400);
  }

  // Only submissions that came through the script, at human speed, get in.
  // MIN_SECONDS and MAX_PER_HOUR can be overridden in .dev.vars for local testing.
  const minSeconds = envNum(env.MIN_SECONDS, LIMITS.minSeconds);
  const maxSeconds = LIMITS.maxSessionHours * 60 * 60;
  const age = await tokenAge(env, String(form.get("token") ?? ""));
  if (age === null) {
    return text(`Applications only come in through the official script, and this one didn't. Apply with: ${run}\n`, 403);
  }
  if (age < minSeconds) {
    return text(`That came in ${age} second${age === 1 ? "" : "s"} after you started, and real applications take longer than ${minSeconds} seconds. Take a moment with your answers, then send again.\n`, 429);
  }
  if (age > maxSeconds) {
    return text(`This session is more than ${LIMITS.maxSessionHours} hours old and has expired, to keep things secure. Run the command again to apply.\n`, 403);
  }

  // Light rate limit per visitor. The IP is hashed and forgotten after an hour.
  const perHour = envNum(env.MAX_PER_HOUR, LIMITS.perHour);
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const rlKey = "rl:" + (await sha256(ip));
  const count = parseInt((await env.APPS.get(rlKey)) || "0", 10);
  if (count >= perHour) {
    return text(`There have been ${perHour} submissions from your network in the last hour, which is our limit to stop spam. Please try again in an hour.\n`, 429);
  }

  const answers = {};
  const stepSeconds = {};
  for (const f of FIELDS) {
    answers[f] = String(form.get(f) ?? "").trim();
    stepSeconds[f] = num(form.get(`t_${f}`));
  }
  const problem = validate(answers);
  if (problem) return text(problem + "\n", 422);

  // One application per email address.
  const appKey = "app:" + (await sha256(answers[EMAIL].toLowerCase()));
  if (await env.APPS.get(appKey)) {
    return text("We already have an application from this email, and we accept one per person. We read every application and will be in touch.\n", 409);
  }

  const id = `${config.idPrefix}-${randomId(8)}`;
  const app = {
    id,
    submitted_at: new Date().toISOString(),
    answers,
    meta: {
      total_seconds: num(form.get("total")),
      step_seconds: stepSeconds,
      commands: clip(form.get("commands"), 1500),
      easter_eggs: clip(form.get("eggs"), 200),
      edits_from_review: num(form.get("edits")),
      os: clip(form.get("os"), 40),
      shell: clip(form.get("shell"), 60),
      term: clip(form.get("term"), 60),
      cols: num(form.get("cols")),
      country: request.cf?.country || "",
    },
  };

  // Save to both places. Either one succeeding is enough to accept the application.
  let savedBackup = true;
  try {
    await env.APPS.put(appKey, JSON.stringify(app));
    await env.APPS.put(rlKey, String(count + 1), { expirationTtl: 3600 });
  } catch (e) {
    savedBackup = false;
    console.log("backup write failed", e);
  }
  if (env.SHEET_WEBHOOK_URL) {
    const toSheetNow = toSheet(env, app);
    if (savedBackup) ctx.waitUntil(toSheetNow);
    else if (!(await toSheetNow)) return text("We couldn't save that just now. Please try again in a minute.\n", 503);
  } else if (!savedBackup) {
    return text("We couldn't save that just now. Please try again in a minute.\n", 503);
  }

  return text(id + "\n");
}

// One flat row per application, keyed like COLUMNS. Used by the sheet and the CSV export.
function flatten(a) {
  const m = a.meta || {};
  return {
    id: a.id,
    submitted_at: a.submitted_at,
    minutes: Math.round(((m.total_seconds || 0) / 60) * 10) / 10,
    ...a.answers,
    easter_eggs: m.easter_eggs,
    commands: m.commands,
    edits: m.edits_from_review,
    os: m.os,
    country: m.country,
    status: "New",
    notes: "",
  };
}

async function exportCsv(request, env) {
  const auth = request.headers.get("authorization") || "";
  if (!env.EXPORT_TOKEN || auth !== `Bearer ${env.EXPORT_TOKEN}`) return text("Not allowed\n", 401);

  const apps = [];
  let cursor;
  do {
    const page = await env.APPS.list({ prefix: "app:", cursor });
    for (const k of page.keys) {
      const v = await env.APPS.get(k.name);
      if (v) apps.push(JSON.parse(v));
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  apps.sort((a, b) => String(a.submitted_at).localeCompare(String(b.submitted_at)));

  const cols = COLUMNS.filter(([k]) => k !== "status" && k !== "notes");
  const rows = [cols.map(([k]) => k)];
  for (const a of apps) {
    const row = flatten(a);
    rows.push(cols.map(([k]) => row[k]));
  }
  const csv = rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
  return new Response(csv, { headers: { "content-type": "text/csv; charset=utf-8" } });
}

// Appends the application to the Google Sheet through its Apps Script web app.
// KV above stays the backup copy, so a Sheets hiccup never loses an application.
async function toSheet(env, app) {
  try {
    // Apps Script answers with a redirect to the reply; following it lets us read "ok".
    const res = await fetch(env.SHEET_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ secret: env.SHEET_SECRET, columns: COLUMNS, digest: DIGEST, row: flatten(app) }),
    });
    const body = (await res.text()).trim();
    if (!res.ok || body !== "ok") {
      console.log("sheet write failed", res.status, body.slice(0, 200));
      return false;
    }
    return true;
  } catch (e) {
    console.log("sheet write failed", e);
    return false;
  }
}

// ── session tokens: "<unix seconds>.<signature>" ──
async function makeToken(env) {
  const ts = Math.floor(Date.now() / 1000).toString();
  return `${ts}.${await sign(env, ts)}`;
}
async function tokenAge(env, token) {
  const [ts, sig] = token.trim().split(".");
  if (!ts || !sig || !/^\d+$/.test(ts)) return null;
  if ((await sign(env, ts)) !== sig) return null;
  return Math.floor(Date.now() / 1000) - Number(ts);
}
async function sign(env, msg) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(`${env.EXPORT_TOKEN}:session`),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ── helpers ──
function text(body, status = 200) {
  return new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8" } });
}
function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function envNum(v, fallback) {
  const n = Number(v);
  return v !== undefined && v !== "" && Number.isFinite(n) ? n : fallback;
}
function clip(v, n) {
  const s = String(v ?? "").replace(/\s+/g, " ").trim();
  const chars = [...s];
  return chars.length > n ? chars.slice(0, n - 1).join("") + "…" : s;
}
function csvCell(v) {
  const s = String(v ?? "");
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function randomId(n) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
}
async function sha256(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
