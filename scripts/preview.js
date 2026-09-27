// Prints the finished script, so you can read it or run it without deploying:
//   npm run preview                          → apply.config.js
//   node scripts/preview.js examples/2os.config.js
//   npm run preview | bash                   → try it (answers go to localhost:8787, or CURL_HIRE_API)
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { checkConfig, renderScript } from "../src/render.js";

const file = resolve(process.argv[2] || "apply.config.js");
const config = checkConfig((await import(pathToFileURL(file))).default);
const template = readFileSync(new URL("../src/apply.sh", import.meta.url), "utf8");
process.stdout.write(renderScript(template, config, process.env.ORIGIN || "http://localhost:8787"));
