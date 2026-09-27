import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { renderScript } from "../src/render.js";

export const TEMPLATE = readFileSync(new URL("../src/apply.sh", import.meta.url), "utf8");
// Stock macOS bash is 3.2, and applicants run the script with whatever bash they have.
export const BASH = process.platform === "darwin" ? "/bin/bash" : "bash";

// Renders the script with `main` removed, so tests can call its functions directly.
export function scriptLibrary(config, origin = "https://apply.example.com") {
  const script = renderScript(TEMPLATE, config, origin).replace(/\nmain "\$@"; exit \$\?\n$/, "\n");
  const file = join(mkdtempSync(join(tmpdir(), "curl-hire-")), "lib.sh");
  writeFileSync(file, script);
  return file;
}

export function bash(lib, code, input = "") {
  return execFileSync(BASH, ["-c", `source "$1"; ${code}`, "bash", lib], {
    input, encoding: "utf8",
    env: { ...process.env, CURL_HIRE_TTY: "/dev/null", LC_ALL: process.platform === "darwin" ? "en_US.UTF-8" : "C.UTF-8" },
  });
}
