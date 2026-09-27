// Plays a whole application against a running server, the way an applicant would.
//   npm run dev                  (in one terminal, with .dev.vars copied from .dev.vars.example)
//   npm run smoke                (in another)
// It makes up valid answers for whatever questions are in apply.config.js, so it's a quick
// check after you change them. It answers instantly, so the server needs MIN_SECONDS=0.
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import config from "../apply.config.js";

const origin = (process.argv[2] || "http://localhost:8787").replace(/\/$/, "");
const res = await fetch(origin + "/").catch((e) => { console.error(`Can't reach ${origin}: ${e.message}. Is \`npm run dev\` running?`); process.exit(1); });
const script = await res.text();
if (!res.ok || !script.startsWith("#!")) { console.error(`${origin} didn't return the script:\n${script.slice(0, 300)}`); process.exit(1); }

const ORDINALS = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth",
  "eleventh", "twelfth", "thirteenth", "fourteenth", "fifteenth", "sixteenth", "seventeenth", "eighteenth", "nineteenth", "twentieth"];
const FILLER = "about building reliable software for real people with careful testing and honest reviews every single week".split(" ");

function answer(q, i) {
  switch (q.type) {
    case "choice": return "1"; // one key press, no Enter
    case "email": return `smoke-${Date.now()}@example.com\n`;
    case "links": return "github.com/example @example\n";
    case "name": return (q.max >= 12 ? "Ada Lovelace" : "Ada") + "\n";
    default: {
      const words = ["My", ORDINALS[i % 20], "answer", ...FILLER];
      let s = words.slice(0, 3).join(" ");
      for (const w of words.slice(3)) {
        if (s.length >= (q.min || 0) && s.split(" ").length >= (q.words || 0) && s.length > 30) break;
        if ((s + " " + w).length > q.max) break;
        s += " " + w;
      }
      return s + "\n";
    }
  }
}

const input = ["help\n", "whoami\n", "apply\n", ...config.questions.map(answer), "\n"].join("");
const dir = mkdtempSync(join(tmpdir(), "curl-hire-"));
writeFileSync(join(dir, "tty"), input);

// Run the fetched script as `curl | bash` would, with answers typed from a file.
const out = spawnSync("bash", [], {
  input: script, encoding: "utf8", env: { ...process.env, CURL_HIRE_TTY: join(dir, "tty"), CURL_HIRE_API: origin },
});
const id = (out.stdout.match(new RegExp(`application ID:\\s*(${config.idPrefix}-[A-Z0-9]+)`)) || [])[1];
console.log(out.stdout.split("\n").slice(-14).join("\n"));
if (!id) {
  console.error("✗ No application ID came back. Full output:\n" + out.stdout + out.stderr);
  process.exit(1);
}
console.log(`✓ Submitted ${id} to ${origin}`);
