import { test } from "node:test";
import assert from "node:assert/strict";
import example from "../examples/2os.config.js";
import defaultConfig from "../apply.config.js";
import { rules, checks } from "../src/render.js";
import { makeValidator } from "../src/validate.js";
import { scriptLibrary, bash } from "./helpers.js";

const RULES = rules(example);
const validate = makeValidator(RULES);

const good = {
  name: "Ada Lovelace", email: "ada@example.com",
  built: "A tiny compiler for a robot arm, which taught me more than any course did.",
  broke: "Our deploy script wiped staging. I rebuilt it from backups and added a dry run.",
  last30: "Shipped a Rust CLI for log search", now: "Working a job", online: "GitHub",
  links: "github.com/ada @ada https://ada.dev/post", onlinewhat: "Ship side projects and argue about Rust",
  depth: "Postgres internals", ai: "When it touches money or auth code",
  workflow: "Invoice matching for a small distributor", twoyears: "Leading a small product team",
  drive: "Learning fast", city: "Bengaluru", bengaluru: "Yes, I'm here", start: "Right away",
};

test("a real application passes", () => assert.equal(validate(good), ""));

test("the server refuses junk with a reason", () => {
  const cases = {
    name: ["test", "12", "Ada 12345", "ada@x.com"],
    email: ["nope", "a b@c.com", "x@mailinator.com"],
    built: ["asdf asdf asdf asdf asdf asdf asdf asdf asdf", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa b c d e f", "short"],
    links: ["not a link!", "a.com b.com c.com d.com e.com f.com g.com h.com i.com"],
    now: ["Sleeping"],
    ai: [good.workflow], // the same answer as another question
  };
  for (const [key, values] of Object.entries(cases)) {
    for (const v of values) {
      const msg = validate({ ...good, [key]: v });
      assert.ok(msg.startsWith(RULES[key].label + ":"), `${key}=${JSON.stringify(v)} → ${JSON.stringify(msg)}`);
    }
  }
  assert.match(validate({ ...good, built: "" }), /needs an answer/);
  assert.equal(validate({ ...good, links: "" }), "");
});

// The script checks answers as people type, and the server checks them again.
// They must agree, or people get refused at the end for answers the script accepted.
const custom = { ...defaultConfig, checks: { extraJunk: ["tbd", "wip"], extraDisposableDomains: ["spam.example"], maxLinks: 2 } };
for (const [name, config] of [["examples/2os.config.js", example], ["apply.config.js", defaultConfig], ["custom checks", custom]]) {
  test(`${name}: the script and the server accept and refuse the same answers`, () => {
    const R = rules(config);
    const lib = scriptLibrary(config);
    const inputs = [
      "Ada Lovelace", "x", "test", "tbd", "wip", "12345", "Ada 12345", "http://ada.dev", "Bengaluru", "São Paulo",
      "ada@example.com", "ada@mailinator.com", "ada@spam.example", "not an email", "github.com/ada @ada",
      "github.com/ada @ada ada.dev", "not a link!",
      "Built a Rust compiler plugin that sped up our builds by 40 percent", "asdf is my favourite word here",
      "zzzz qqqq xxxx ppppp tttt rrrr", "aaaaaa and more words here", "=SUM(A1:A9) + 1 * 2", "idk",
      "Shipped a thing", "one two", "Postgres", "🚀🚀🚀 shipped it for real this time",
    ];
    const keys = config.questions.filter((q) => q.type !== "choice").map((q) => q.key);
    const pairs = [];
    for (const key of keys) for (const v of inputs) if ([...v].length <= R[key].max) pairs.push([key, v]);

    const script = pairs.map(([key, v]) => {
      const i = config.questions.findIndex((q) => q.key === key);
      return `if check_answer ${i} ${JSON.stringify(v).replace(/\$/g, "\\$").replace(/`/g, "\\`")} >/dev/null; then echo pass; else echo fail; fi`;
    }).join("\n");
    const fromBash = bash(lib, script).trim().split("\n");
    assert.equal(fromBash.length, pairs.length);
    assert.ok(fromBash.includes("pass") && fromBash.includes("fail"));

    const ck = checks(config);
    pairs.forEach(([key, v], n) => {
      const server = makeValidator({ [key]: R[key] }, ck)({ [key]: v }) === "" ? "pass" : "fail";
      assert.equal(fromBash[n], server, `${key}=${JSON.stringify(v)}: script says ${fromBash[n]}, server says ${server}`);
    });
  });
}

test("custom checks: extra junk, extra inboxes, fewer links", () => {
  const R = rules(custom);
  const one = (key, value) => makeValidator({ [key]: R[key] }, checks(custom))({ [key]: value });
  assert.match(one("depth", "TBD"), /placeholder/);
  assert.match(one("email", "a@spam.example"), /temporary inboxes/);
  assert.match(one("links", "a.com b.com c.com"), /limit is 2/);
});
