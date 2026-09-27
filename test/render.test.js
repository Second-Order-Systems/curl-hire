import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import defaultConfig from "../apply.config.js";
import example from "../examples/2os.config.js";
import { checkConfig, renderScript, sheetColumns, runCommand } from "../src/render.js";
import { TEMPLATE, BASH, scriptLibrary, bash } from "./helpers.js";

const clone = (c) => ({ ...structuredClone({ ...c, logo: undefined }), logo: c.logo });

for (const [name, config] of [["apply.config.js", defaultConfig], ["examples/2os.config.js", example]]) {
  test(`${name}: passes checkConfig and renders valid bash`, () => {
    checkConfig(config);
    const file = join(mkdtempSync(join(tmpdir(), "curl-hire-")), "apply.sh");
    writeFileSync(file, renderScript(TEMPLATE, config, "https://apply.example.com"));
    execFileSync(BASH, ["-n", file]);
  });
}

test("config text can't run as code in the script", () => {
  const c = clone(defaultConfig);
  const nasty = `it's $(touch /tmp/pwned) \`id\` "quoted" $HOME \\ | ; & ${"'"}`;
  c.pages[0].body = nasty;
  c.hiddenCommands = [{ run: "x", reply: nasty }];
  c.role.details = nasty;
  const lib = scriptLibrary(checkConfig(c));
  assert.equal(bash(lib, `page role`), nasty + "\n");
  assert.equal(bash(lib, `hidden x; echo "$EGGS"`), nasty + "\nx\n");
  assert.equal(bash(lib, `printf '%s' "$DETAILS"`), nasty);
});

test("hidden commands: lists, trailing wildcards, case", () => {
  const lib = scriptLibrary(example);
  assert.equal(bash(lib, `hidden 'sudo make me a sandwich'; echo "$EGGS"`), "Nice try. Access here is earned. Type apply.\nsudo\n");
  assert.equal(bash(lib, `hidden 'ls -la'; echo "$EGGS"`), ".  ..  .note  apply  role  pay  stack  why  about\nls-a\n");
  assert.equal(bash(lib, `hidden 'rmdir' || echo none`), "none\n");
});

test("help lists pages with aligned summaries", () => {
  const out = bash(scriptLibrary(example), "page help");
  assert.match(out, /^apply   start your application \(about 5 minutes\)\nrole    what you'll do\n/);
  assert.match(out, /There are a few more/);
});

test("runCommand drops https:// but keeps http://localhost", () => {
  assert.equal(runCommand("https://apply.example.com"), "curl -sL apply.example.com | bash");
  assert.equal(runCommand("http://localhost:8787"), "curl -sL http://localhost:8787 | bash");
});

test("sheet columns: session details, one per question, then Status and Notes", () => {
  const cols = sheetColumns(example).map(([, l]) => l);
  assert.deepEqual(cols.slice(0, 4), ["ID", "Submitted", "Minutes", "Name"]);
  assert.ok(cols.includes("Doesn't trust AI code when"));
  assert.deepEqual(cols.slice(-2), ["Status", "Notes"]);
});

test("messages and theme reach the script", () => {
  const c = clone(defaultConfig);
  c.messages = { begin: "Press apply, or help if you're lost.", received: "Got it!" };
  c.theme = { accent: 33 };
  const lib = scriptLibrary(checkConfig(c));
  assert.equal(bash(lib, `A='<'; N='>'; begin_line`), "Press <apply>, or <help> if you're lost.\n");
  assert.equal(bash(lib, `printf '%s|%s|%s' "$MSG_RECEIVED" "$MSG_GOODBYE" "$ACCENT"`), "Got it!|See you.|33");
});

test("checkConfig explains mistakes", () => {
  const bad = clone(defaultConfig);
  bad.questions = [...bad.questions, { key: "email", type: "choice", label: "Again", prompt: "?", options: ["a|b", "c"] }];
  bad.idPrefix = "acme";
  bad.digest = ["nope"];
  bad.pages = [...bad.pages, { command: "help", body: "" }];
  bad.theme = { accent: 300, glow: 1 };
  bad.messages = { recieved: "typo", begin: "two\nlines" };
  bad.checks = { maxLinks: 0, extraJunk: ["two words"] };
  assert.throws(() => checkConfig(bad), (e) => {
    for (const bit of ["idPrefix", "used twice", 'without "|"', "digest lists", "built in", "theme.accent", "theme.glow",
      "messages.recieved", "messages.begin", "checks.maxLinks", "checks.extraJunk"]) assert.match(e.message, new RegExp(bit.replace(/[|()]/g, "\\$&")));
    return true;
  });
});
