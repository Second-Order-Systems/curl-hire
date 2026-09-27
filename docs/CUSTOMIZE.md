# Customizing your application

Everything applicants see comes from [`apply.config.js`](../apply.config.js). The Worker reads it to build the script, to check answers, and to name the sheet columns, so you edit one file and all three stay in step.

If the config has a mistake, `npm test`, `npm run preview` and `npm run deploy` all stop and list what to fix.

After any change:

```bash
npm run preview | less   # read the finished script
npm test                 # the config is valid, and the script and server agree
npm run deploy
```

## Company and role

```js
company: {
  name: "Acme",
  website: "https://example.com", // shown in the banner and by `site`. "" hides both
  prompt: "acme",                 // the shell prompt:  acme ~ $
},
role: {
  title: "Founding Engineer",
  details: "Remote · $120–160k + equity", // one dim line under the title. "" hides it
},
```

The banner shows `name · title`, then `details`, then `website`.

**Put the pay in `details`.** Engineers notice when it's missing, and it saves both sides a call.

## Banner

| Option | What it does |
| --- | --- |
| `logo` | Optional ASCII art, printed in the accent colour. Use `` String.raw`...` `` so backslashes stay as they are. [patorjk.com/software/taag](https://patorjk.com/software/taag) makes one from text. |
| `intro` | A list of lines under the banner. Say how long it takes and what you keep. |
| `duration` | Shown next to `apply` in `help`, e.g. `"about 5 minutes"`. |

## Pages

Pages are what people open by typing a command in the little shell. `help` lists them automatically, along with `apply`, `site`, `clear` and `exit`.

```js
pages: [
  {
    command: "pay",             // one lowercase word
    summary: "how you get paid", // shown in help
    body: `
$120–160k
+ 0.5–1% equity`,
  },
],
helpFooter: "There are a few more. Engineers usually find them.", // under the help list
```

Good pages to have: `role`, `pay`, `stack`, `about`, and `why` if you do something unusual. Keep each to a few lines.

## Hidden commands

These are commands that aren't in `help`. Whichever ones an applicant finds are saved with their application, in the **Hidden commands found** column.

```js
hiddenCommands: [
  { run: "whoami", reply: "Someone who reads the manual. Noted." },
  { run: ["vim", "vi", "emacs", "nano"], reply: "No editor wars today.", id: "editor" },
  { run: "sudo*", reply: "Nice try. Type apply." },
]
```

| Field | Meaning |
| --- | --- |
| `run` | What someone types, or a list of alternatives. Matching ignores case and extra spaces. A trailing `*` matches anything after, so `"sudo*"` catches `sudo rm -rf /`. |
| `reply` | What the shell prints. It can span several lines. |
| `id` | The name recorded in the sheet. It defaults to the first `run` value, with symbols removed. |

Ideas that work well:
- an `ls` that lists your pages
- an `ls -la` that reveals a `.note`, with a `cat .note` that says something worth reading
- `sudo`, `rm`, editors, `hire me`

## Questions

Questions are asked in the order you list them.

```js
{ key: "built", section: "Proof", type: "text", label: "Proudest build",
  prompt: "Brag a little. What are you proudest of building?",
  hint: "Failed projects count. Up to 280 characters.",
  max: 280, min: 40, words: 6 },
```

| Field | Meaning |
| --- | --- |
| `key` | An internal name: lowercase letters, digits and `_`. Keep it the same after launch, because the stored answers are filed under it. |
| `type` | One of the types in the next table. |
| `label` | A short name used on the review screen (18 characters fit), in error messages and as the sheet column. |
| `column` | Optional. A different sheet column name. Use it when `label` is too short to be clear in the sheet, or to keep an existing sheet's columns. |
| `prompt` | The question, in bold. |
| `hint` | Optional. A dim line under the prompt. |
| `section` | Optional. Shown above the question as `Section · 3 of 12`. |
| `required` | Defaults to `true`. Set `false` to allow skipping with Enter. |
| `max` | The character limit, required for every type except `choice`. |
| `min`, `words` | The minimum characters and words. These are what stop one-word answers. |
| `options` | For `choice`: 2 to 9 options, without `\|`. |
| `prose` | For `text`: set `false` to turn off the "reads like real words" checks, e.g. for answers that are mostly numbers. |

### Types

| Type | Accepts | Refuses |
| --- | --- | --- |
| `text` | Free text | Placeholders (`test`, `idk`, `n/a`), keyboard mashing, 5+ repeated characters, mostly symbols, letter mixes that don't look like words, and the same answer as another question |
| `name` | A name or a place | Placeholders, no letters, emails and links, long numbers |
| `email` | One address | Malformed addresses and temporary inboxes. **Exactly one question must be this type.** It's where you reply, and it limits applications to one per person. |
| `links` | URLs and `@handles`, separated by spaces | Anything else, and more than 8 |
| `choice` | One key press, 1–9 | Anything outside the options |

### Writing good questions

- **Ask for proof, not adjectives.** "What are you proudest of building?" beats "Describe yourself".
- **Ask for a story.** "Something that broke on your watch" shows judgment in 280 characters.
- **Use `choice` for anything you'd filter on,** like location, start date or what they're doing now. Filters in the sheet then work cleanly.
- **Keep it under 15 questions and 5 minutes.** People finish short applications.
- **Keep `max` low.** The best answers are short, and a low limit tells people that.

### Changing questions after launch

- **Adding a question** creates a new column at the right of the sheet. Older rows have it blank.
- **Renaming a `label`** creates a new column under the new name. The old column keeps the old answers. To avoid that, set `column` to the old name.
- **Changing a `key`** stores answers under a new key. Avoid it once applications are coming in.

## Final screen

```js
nextSteps: [
  "A human reads this, within a week", // a promise: only write one you'll keep
  "If it's a fit, a short call",
  "Then an offer",
],
closing: "While you wait, see what we're building: https://example.com",
```

Each step is printed with `→` in front of it, under **What happens next**, followed by the application ID and `closing`.

## Digest, IDs and limits

```js
digest: ["name", "city", "now"], // question keys shown per applicant in the daily digest
idPrefix: "ACME",                 // IDs look like ACME-7K2M9QXD (1–8 capitals or digits)
limits: {
  minSeconds: 45,     // refuse anything sent faster than this after `apply`
  maxSessionHours: 3, // sessions expire after this
  perHour: 5,         // submissions per network per hour
},
```

A digest line looks like this, with the first field in bold:

```
• Ada Lovelace · Bengaluru · Working a job · 4.2 min · 2 hidden commands
```

The digest goes out at 7 pm in the Apps Script project's time zone. To change the time, edit `DIGEST_HOUR` in `Code.gs` and run `setup` again.

## Secrets and settings

These go in `.dev.vars` locally and are set with `npx wrangler secret put <NAME>` in production:

| Name | Needed | What it's for |
| --- | --- | --- |
| `EXPORT_TOKEN` | Yes | Signs session tokens and protects `/export`. Without it, the app refuses applications. |
| `SHEET_WEBHOOK_URL` | For the sheet | The Apps Script web app URL, ending in `/exec`. |
| `SHEET_SECRET` | For the sheet | The same value as `SECRET` in the Apps Script properties. |
| `MIN_SECONDS`, `MAX_PER_HOUR` | Local only | Override `limits` for testing. `.dev.vars.example` sets them for `npm run smoke`. |

## Going further

- **Colours** are set near the top of `src/apply.sh`: `A` is the accent, `R` errors and `G` success. They're 256-colour codes.
- **The junk and temporary-inbox lists** are `JUNK` and `DISPOSABLE` in `src/render.js`. Both the script and the server use them.
- **Changing the checks themselves** means editing `check_answer` in `src/apply.sh` and `src/validate.js` the same way. `npm test` fails if the two disagree on a set of sample answers.
