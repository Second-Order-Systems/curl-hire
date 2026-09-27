// ────────────────────────────────────────────────────────────────────
//  Your application, in one file.
//
//  Everything applicants see comes from here: the banner, the pages in the
//  little shell, the hidden commands, the questions and the final screen.
//  The Worker checks answers against the same rules, and the Google Sheet
//  gets one column per question. Edit, then `npm run preview` to see it.
//
//  Full reference: docs/CUSTOMIZE.md
//  A real one, in production: examples/2os.config.js
// ────────────────────────────────────────────────────────────────────

export default {
  company: {
    name: "Acme",                  // TODO: your company
    website: "https://example.com", // TODO: shown in the banner and by `site`. "" to hide
    prompt: "acme",                 // the little shell shows:  acme ~ $
  },
  role: {
    title: "Founding Engineer",     // TODO
    details: "Remote · $120–160k + equity", // TODO: one line under the title. "" to hide
  },

  // Optional ASCII art, printed in the accent colour. Generate one at
  // https://patorjk.com/software/taag or delete it.
  logo: String.raw`
  __ _  ___ _ __ ___   ___
 / _' |/ __| '_ ' _ \ / _ \
| (_| | (__| | | | | |  __/
 \__,_|\___|_| |_| |_|\___|`,

  duration: "about 5 minutes",       // shown next to `apply` in help
  intro: [
    "No CV. No cover letter. About 5 minutes: mostly one-liners and quick picks.",
    "We read every application, and we keep your answers plus a few session",
    "details, like time spent. Nothing else.",
  ],

  // Pages people can open by typing the command. `help` lists them for you.
  pages: [
    {
      command: "role",
      summary: "what you'll do",
      body: `
Founding Engineer
→ TODO: what they'll build
→ TODO: who they'll work with
→ TODO: what they'll own`,
    },
    {
      command: "pay",
      summary: "how you get paid",
      body: `
TODO: salary range
+ TODO: equity
Say the number. Engineers notice when you don't.`,
    },
    {
      command: "stack",
      summary: "what we build with",
      body: `
TODO: languages, infra, the interesting parts.`,
    },
    {
      command: "about",
      summary: "who we are",
      body: `
TODO: one paragraph about the company.
More at https://example.com`,
    },
  ],
  helpFooter: "There are a few more. Engineers usually find them.",

  // Commands that aren't in help. Whichever ones someone finds are saved with
  // their application. `run` can be a list, and a trailing * matches anything after.
  hiddenCommands: [
    { run: "whoami", reply: "Someone who reads the manual. Noted." },
    { run: "ls", reply: "apply  role  pay  stack  about" },
    { run: ["ls -a", "ls -la", "ls -al"], reply: ".  ..  .note  apply  role  pay  stack  about", id: "ls-a" },
    { run: "cat .note", reply: "The best applications we've read were shorter than the limit. Say it plainly.", id: "note" },
    { run: "pwd", reply: "/home/you/next-chapter" },
    { run: "sudo*", reply: "Nice try. Access here is earned. Type apply." },
    { run: "rm *", reply: "Bold. Wrong machine." },
    { run: ["vim", "vi", "emacs", "nano"], reply: "No editor wars today. Type apply.", id: "editor" },
    { run: "hire me", reply: "That's the spirit. Type apply.", id: "hireme" },
  ],

  // The questions, in order. Types:
  //   text    free text, checked for junk (placeholders, keyboard mashing, copy-paste)
  //   name    a name or a place: needs letters, no links, no long numbers
  //   email   exactly one question must be this; one application per email
  //   links   URLs and @handles separated by spaces, up to 8
  //   choice  2–9 options, answered with one key press
  // label is used on the review screen (keep it under 18 characters) and as
  // the sheet column, unless you set `column`.
  questions: [
    { key: "name", section: "You", type: "name", label: "Name",
      prompt: "What's your name?", max: 60, min: 2, words: 1 },
    { key: "email", section: "You", type: "email", label: "Email",
      prompt: "What's your email?", hint: "A human replies, not a bot.", max: 120 },

    { key: "built", section: "Proof", type: "text", label: "Proudest build",
      prompt: "Brag a little. What are you proudest of building?",
      hint: "Don't be modest. Failed projects count. Up to 280 characters.", max: 280, min: 40, words: 6 },
    { key: "broke", section: "Proof", type: "text", label: "Something broke",
      prompt: "Tell us about something that broke on your watch. What did you do?",
      hint: "Up to 280 characters.", max: 280, min: 30, words: 5 },
    { key: "last30", section: "Proof", type: "text", label: "Last 30 days",
      prompt: "What's one thing you shipped or learned in the last 30 days?", max: 120, min: 10, words: 2 },
    { key: "links", section: "Proof", type: "links", label: "Links", required: false,
      prompt: "Where can we see your work?",
      hint: "GitHub, a blog, a demo, @handles. Separate with spaces. Optional.", max: 300 },

    { key: "depth", section: "How you think", type: "text", label: "Knows deeply",
      prompt: "Name one technical topic you know better than most people.",
      hint: "Just the topic. We'll dig in on the call.", max: 100, min: 3, words: 1 },
    { key: "ai", section: "How you think", type: "text", label: "Distrusts AI code",
      prompt: "When do you not trust code written by AI?", max: 140, min: 15, words: 3 },

    { key: "now", section: "Where you are", type: "choice", label: "Right now",
      prompt: "What are you mostly doing right now?",
      options: ["Studying", "Working a job", "Building my own thing", "Between things"] },
    { key: "city", section: "Where you are", type: "name", label: "City",
      prompt: "Which city do you live in right now?", max: 60, min: 2, words: 1 },
    { key: "start", section: "Where you are", type: "choice", label: "Start",
      prompt: "When could you start?",
      options: ["Right away", "Within a month", "In 1–3 months", "Later"] },
  ],

  // The final screen. The first step is a promise: only write one you'll keep.
  nextSteps: [
    "A human reads this, within a week",
    "If it's a fit, a short call",
    "Then a paid build trial",
    "Then an offer",
  ],
  closing: "While you wait, see what we're building: https://example.com",

  // The daily chat digest shows these answers, one line per applicant (first one in bold).
  digest: ["name", "city", "now"],

  idPrefix: "ACME", // application IDs look like ACME-7K2M9QXD
  limits: {
    minSeconds: 45,     // refuse anything sent faster than this after starting
    maxSessionHours: 3, // sessions expire after this
    perHour: 5,         // submissions per network per hour
  },
};
