# curl-hire

**Let engineers apply from the terminal.**

```
curl -sL apply.2os.ai | bash
```

That's a live one: [2os](https://2os.ai) hires its founding engineers with it. Run it, type `help`, and see how many hidden commands you find.

curl-hire gives your job opening the same kind of command. Applicants get a tiny shell with pages about the role, a few hidden commands, and about 5 minutes of quick questions. You get one row per applicant in a Google Sheet and a daily digest in Google Chat, Slack or Discord. It runs on Cloudflare Workers' free tier, so there's no server to maintain and nothing to pay.

```
 ___
|_  )  ___  ___
 / /  / _ \(_-<
/___| \___//__/

Second Order Systems · Founding Engineer (Forward Deployed)
Bengaluru · in person · ₹10–20 LPA fixed + up to 20% of outcome fees + ESOPs
https://2os.ai

No CV. No cover letter. About 5 minutes: mostly one-liners and quick picks.

Type apply to begin, or help to look around.

2os ~ $ whoami
Someone who reads the manual. Noted.
2os ~ $ apply
Enter moves on. Choices take one key press.

Proof · 3 of 17
Brag a little. What are you proudest of building?
Don't be modest. Failed projects count. Up to 280 characters.
› _
```

## Why a terminal

- **It filters for you.** People who live in a terminal get through in five minutes, and the rest mostly don't try. The mass-apply bots never find it.
- **It shows you how people poke at things.** The sheet records which hidden commands each applicant found and what they typed in the shell. `ls -la`, `cat .note` and `sudo` tell you something a cover letter never does.
- **It's honest.** Anyone can read the script before running it (`curl -sL apply.2os.ai`), and the header invites them to. It installs nothing and reads no files.
- **It's short.** One-liners and single-key choices, a review screen where any answer can be edited, and a confirmation with an application ID.

## Set it up

About 15 minutes. You need [Node.js](https://nodejs.org) 20+ and a free [Cloudflare](https://dash.cloudflare.com/sign-up) account.

### 1. Make it yours

```bash
git clone https://github.com/Second-Order-Systems/curl-hire && cd curl-hire
npm install
```

Everything applicants see is in **[`apply.config.js`](apply.config.js)**: company, role, pay, the pages in the shell, hidden commands, questions and the final screen. Search it for `TODO`. The [config reference](docs/CUSTOMIZE.md) covers every option, and [`examples/2os.config.js`](examples/2os.config.js) is a complete one from production.

To see the result without deploying anything:

```bash
npm run preview | less                 # read the finished script
cp .dev.vars.example .dev.vars
npm run dev                            # a local server on :8787
curl -sL localhost:8787 | bash         # in a second terminal: apply to yourself
npm run smoke                          # or let it fill in every question for you
```

Applications you send locally stay on your machine, unless you put a sheet URL in `.dev.vars`.

### 2. Set up the Google Sheet (recommended)

Each application becomes a row, with **Status** and **Notes** columns for your team. Once a day, your chat gets a short summary, and only on days someone applied.

1. Create a Google Sheet, e.g. "Applications".
2. Open **Extensions → Apps Script**. Delete what's there, paste in [`google-sheet/Code.gs`](google-sheet/Code.gs), and save. You don't need to edit it: the columns come from your config.
3. Open **Project Settings** (the gear icon):
   - Set **Time zone** to yours. The digest goes out at 7 pm in that zone.
   - Under **Script properties**, add `SECRET`, a long random password (`openssl rand -hex 32` makes one).
   - Add `CHAT_WEBHOOK_URL` too, if you want the daily digest. Any of these works:
     - **Google Chat:** open the space's name → Apps & integrations → Webhooks → Add webhook.
     - **Slack:** create an [incoming webhook](https://api.slack.com/messaging/webhooks).
     - **Discord:** Channel settings → Integrations → Webhooks.
4. Back in the editor, pick `setup` in the function dropdown, click **Run**, and approve the permissions. This creates the Applications tab and schedules the digest.
5. Click **Deploy → New deployment → Web app**. Set Execute as: **Me** and Who has access: **Anyone**. Copy the URL ending in `/exec`.

"Anyone" only means the Worker can reach the web app without a Google login. Requests without your `SECRET` are refused.

To check that it works, run this. It should print `forbidden`:

```bash
curl -sL -H 'content-type: application/json' -d '{"secret":"wrong"}' "<your /exec URL>"
```

**Updating `Code.gs` later:** paste the new code, then use **Deploy → Manage deployments → ✏️ → Version: New version**. Don't create a "New deployment": that gets a new `/exec` URL, and the Worker would keep posting to the old one.

### 3. Deploy

```bash
npx wrangler login                          # opens Cloudflare in your browser, once
npx wrangler kv namespace create APPS       # paste the id it prints into wrangler.toml
npm run deploy
npx wrangler secret put EXPORT_TOKEN        # another long random password
npx wrangler secret put SHEET_WEBHOOK_URL   # the /exec URL from step 2
npx wrangler secret put SHEET_SECRET        # the same SECRET you set in Apps Script
```

Deploy prints your URL. Try it:

```bash
curl -sL curl-hire.<your-subdomain>.workers.dev | bash
```

Until `EXPORT_TOKEN` is set, the app politely refuses applications (right after `apply`, before anyone answers a question), so a half-finished setup never takes any in. Want a different name in the URL? Change `name` in `wrangler.toml` before deploying.

### 4. Use your own domain (optional)

`curl -sL apply.yourcompany.com | bash` reads better in a job post. If your domain is on Cloudflare, uncomment the `routes` block in `wrangler.toml`, put in your hostname, and run `npm run deploy` again. Cloudflare creates the DNS record, and the rest of your site is untouched.

The script always points back at whichever address served it, so you don't need to configure the domain anywhere else.

## Reading applications

**In the Google Sheet.** You get one row per applicant, with every answer, total minutes, hidden commands found, commands typed in the shell, how many answers they edited from the review screen, their OS and their country.

**As a CSV.** Every application is also kept in Cloudflare KV as a backup. If the sheet ever misses one, download everything:

```bash
curl -H "Authorization: Bearer <your EXPORT_TOKEN>" https://<your-app>/export > applications.csv
```

## What's built in

- **Only the script can submit.** It gets a signed session token when someone types `apply`. The server refuses direct POSTs, forged tokens and sessions older than 3 hours.
- **Human speed only.** Submissions less than 45 seconds after starting are refused with a polite message.
- **A rate limit.** Up to 5 submissions per network per hour. IPs are hashed and forgotten after an hour, and never stored with applications.
- **Junk checks at every step, repeated on the server.** These cover:
  - minimum lengths and word counts
  - real-looking names, cities, emails and links
  - keyboard mashing ("asdf", strings with no vowels) and runs of repeated characters
  - filler answers ("test", "idk", "n/a")
  - the same answer pasted into two questions
  - temporary inboxes

  Every refusal says what's wrong and how to fix it. Editing the script doesn't get anyone past these checks: the server refuses the same things, and a test keeps the two in agreement.
- **One application per email.** A second one from the same address is refused politely.
- **Two copies of everything.** Each application goes to the sheet and to Cloudflare KV. It's accepted if either one succeeds.
- **Formula-safe sheet.** Answers that start with `=`, `+`, `-` or `@` are stored as plain text.
- **No screenshot bait.** The app never echoes what someone typed as if it were its own output.
- **No surprise bills.** On Cloudflare's free plan, going over the limits (100,000 requests and 1,000 KV writes a day) makes requests fail. It never charges you.
- **Plain bash.** It runs on the bash 3.2 that ships with macOS and on any Linux. Windows needs WSL or Git Bash.

**If rows stop appearing in the sheet,** run `npx wrangler tail` and send a test application. Look for `sheet write failed`: it usually means `SHEET_SECRET` doesn't match `SECRET`, or `SHEET_WEBHOOK_URL` points at an old deployment. Nothing is lost in the meantime, because KV keeps every application and `/export` gets them back.

## FAQ

**Isn't `curl | bash` a bad habit to encourage?**
The script's header invites people to read it first, and the same command without `| bash` shows exactly what will run. The Worker only serves the script over HTTPS and redirects plain HTTP there. If you want to be strict, write `https://` in your job post. Engineers who read the script before running it are the ones you want.

**Can I use it for roles that aren't engineering?**
Yes, but think about who you'd filter out. The terminal is the point.

**What does it collect?**
Only what's listed under [Reading applications](#reading-applications). Applicants are told this on the first screen. You're responsible for handling applicant data under your local rules (GDPR, DPDP, etc.): tell people how long you keep it, and delete rows when asked.

**How do I change a question after launch?**
Edit `apply.config.js` and deploy. A new question shows up as a new column at the right of the sheet, and old rows keep their answers.

## Development

```bash
npm test         # renders both configs, checks bash syntax, script/server parity, the sheet code
npm run smoke    # a full application against `npm run dev`
```

The pieces:

| File | What it is |
| --- | --- |
| `apply.config.js` | Your application: the only file most people edit |
| `src/apply.sh` | The script template. The Worker fills in your config |
| `src/render.js` | Checks the config, then builds the script, the rules and the sheet columns from it |
| `src/validate.js` | The server-side answer checks |
| `src/worker.js` | The Cloudflare Worker: serves the script, signs sessions, stores applications |
| `google-sheet/Code.gs` | Apps Script that writes rows and sends the digest |

Issues and pull requests are welcome.

## Credits

Built by [Second Order Systems](https://2os.ai) to hire our founding engineers. If you use it, we'd love to see yours: open an issue with your `curl` command.

[MIT](LICENSE)
