// The server-side answer checks. apply.sh runs the same ones as people type,
// but only these count: editing the script gets nobody past them.

import { checks } from "./render.js";

const LINK = /^(@[A-Za-z0-9_.-]{1,40}|(https?:\/\/)?[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+(\/\S*)?)$/;

// RULES comes from rules(config) and CHECKS from checks(config), both in render.js.
export function makeValidator(RULES, CHECKS = checks({})) {
  const JUNK = new Set(CHECKS.junk);
  const DISPOSABLE = new Set(CHECKS.disposable);
  // Returns a message saying which answer was refused, why, and how to fix it. "" if all pass.
  return function validate(answers) {
    for (const [key, r] of Object.entries(RULES)) {
      const v = answers[key];
      const fail = (msg) => `${r.label}: ${msg}`;
      if (!v) {
        if (r.required) return fail("this one needs an answer. A sentence is enough.");
        continue;
      }
      const len = [...v].length;
      if (r.max && len > r.max) return fail(`too long. That's ${len} characters, and the limit is ${r.max}.`);
      if (r.options) {
        if (!r.options.includes(v)) return fail(`"${v}" isn't one of the options (${r.options.join(", ")}).`);
        continue;
      }
      const lv = v.toLowerCase();
      if (r.min && len < r.min) return fail(`too short. That's ${len} character${len === 1 ? "" : "s"}, and this one needs at least ${r.min}.`);
      const wc = v.split(/\s+/).filter(Boolean).length;
      if (r.words && wc < r.words) return fail(`too short. That's ${wc} word${wc === 1 ? "" : "s"}, and this one needs at least ${r.words}.`);

      if (r.kind === "name") {
        const what = r.label.toLowerCase();
        if (JUNK.has(lv)) return fail(`"${v}" looks like a placeholder, not a real ${what}.`);
        if (!/\p{L}/u.test(v)) return fail(`a ${what} needs letters, and "${v}" has none.`);
        if (/@|https?:/.test(v)) return fail(`just your ${what} here, without emails or links.`);
        if (/\d{3,}/.test(v)) return fail(`a ${what} shouldn't contain long numbers.`);
      }
      if (r.kind === "email") {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return fail("that isn't a valid email address. It should look like name@example.com, with no spaces.");
        const domain = lv.split("@").pop();
        if (DISPOSABLE.has(domain)) return fail(`temporary inboxes like ${domain} aren't accepted. Use an email you'll check, because that's where we'll reply.`);
      }
      if (r.kind === "links") {
        const parts = v.split(/\s+/).filter(Boolean);
        if (parts.length > CHECKS.maxLinks) return fail(`that's ${parts.length} links, and the limit is ${CHECKS.maxLinks}.`);
        const bad = parts.find((p) => !LINK.test(p));
        if (bad) return fail(`"${bad}" isn't a link or @handle. Use links like github.com/you or handles like @you, separated by spaces.`);
      }

      if (r.prose) {
        if (JUNK.has(lv)) return fail(`"${v}" reads like a placeholder, not an answer. Short is fine, but tell us something real.`);
        if (/(.)\1{4,}/u.test(v)) return fail("the same character is repeated 5 or more times in a row, which looks like filler.");
        const mash = lv.match(/asdf|qwert|zxcv|hjkl|lorem ipsum/);
        if (mash) return fail(`"${mash[0]}" looks like keyboard mashing or placeholder text.`);
        if (!/[^\x20-\x7E]/.test(v)) {
          const letters = (v.match(/[A-Za-z]/g) || []).length;
          const nonspace = v.replace(/[ \t]/g, "").length;
          if (letters * 2 < nonspace) return fail("that's mostly symbols or numbers. Answer in words, please.");
          if (letters >= 20) {
            const vowels = (v.match(/[AEIOUaeiou]/g) || []).length;
            if (vowels * 100 < letters * 15 || vowels * 100 > letters * 70) {
              return fail("that doesn't read like real words (the mix of letters looks random). If it's full of technical terms, add a few plain words around them.");
            }
          }
        }
        for (const [other, ro] of Object.entries(RULES)) {
          if (other !== key && ro.prose && answers[other] && answers[other].toLowerCase() === lv) {
            return fail(`that's the same answer as "${ro.label}". Each question needs its own answer.`);
          }
        }
      }
    }
    return "";
  };
}
