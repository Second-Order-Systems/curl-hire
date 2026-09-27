// ────────────────────────────────────────────────────────────────────
//  Your application, in one file.
//
//  Everything applicants see comes from here: the banner, the pages in the
//  little shell, the hidden commands, the questions and the final screen.
//  The Worker checks answers against the same rules, and the Google Sheet
//  gets one column per question.
//
//  Acme is made up. Swap in your own company, then `npm run preview` to see it.
//  Full reference: docs/CUSTOMIZE.md
//  A real one, in production: examples/2os.config.js
// ────────────────────────────────────────────────────────────────────

export default {
  company: {
    name: "Acme Robotics",
    website: "https://example.com", // shown in the banner and by `site`. "" hides both
    prompt: "acme",                  // the little shell shows:  acme ~ $
  },
  role: {
    title: "Founding Engineer",
    // One dim line under the title. Put the pay here: engineers notice when it's missing.
    details: "San Francisco · in person · $160–200k + 0.5–1.0% equity",
  },

  // Optional ASCII art, printed in the accent colour. Make one from text at
  // https://patorjk.com/software/taag, or delete it.
  logo: String.raw`
  __ _  ___ _ __ ___   ___
 / _' |/ __| '_ ' _ \ / _ \
| (_| | (__| | | | | |  __/
 \__,_|\___|_| |_| |_|\___|`,

  duration: "about 5 minutes", // shown next to `apply` in help
  intro: [
    "No CV. No cover letter. About 5 minutes: mostly one-liners and quick picks.",
    "We read every application, and we keep your answers plus a few session",
    "details, like time spent. Nothing else.",
  ],

  // Pages people open by typing the command. `help` lists them for you,
  // along with apply, site, clear and exit.
  pages: [
    {
      command: "role",
      summary: "what you'll do",
      body: `
Founding Engineer
→ Build the fleet software that runs our warehouse robots, in Rust and TypeScript
→ Ship features customers use the same week, then watch them on the floor
→ Own a customer site end to end, from the first install to the uptime number
San Francisco, in person, with some travel to customer warehouses.`,
    },
    {
      command: "pay",
      summary: "how you get paid",
      body: `
$160–200k base
+ 0.5–1.0% equity, 4-year vest, 1-year cliff
+ health, dental and vision, fully covered
The range is the range. We don't lowball and we don't negotiate against you.`,
    },
    {
      command: "stack",
      summary: "what we build with",
      body: `
Rust on the robots, TypeScript and Postgres in the cloud.
Everything runs in production in real warehouses, 24/7.
You'll touch all of it: firmware updates, the fleet API, and the dashboard ops teams live in.`,
    },
    {
      command: "why",
      summary: "why this role exists",
      body: `
We have 40 robots at 6 customer sites and a waitlist of 30 more.
The software is the bottleneck, not the hardware.
You'd be engineer number four.`,
    },
    {
      command: "about",
      summary: "who we are",
      body: `
Acme Robotics, San Francisco.
We make warehouse robots that small distributors can afford.
Seed-funded, profitable per robot, and hiring slowly on purpose.
More at https://example.com`,
    },
  ],
  helpFooter: "There are a few more. Engineers usually find them.",

  // Commands that aren't in help. Whichever ones someone finds are saved with
  // their application. `run` can be a list, and a trailing * matches anything after.
  // `id` is the name recorded in the sheet (defaults to the first `run`).
  hiddenCommands: [
    { run: "whoami", reply: "Someone who reads the manual. Noted." },
    { run: "ls", reply: "apply  role  pay  stack  why  about" },
    { run: ["ls -a", "ls -la", "ls -al"], reply: ".  ..  .note  apply  role  pay  stack  why  about", id: "ls-a" },
    { run: "cat .note", reply: "The best applications we've read were shorter than the limit. Say it plainly.", id: "note" },
    { run: "pwd", reply: "/home/you/next-chapter" },
    { run: "sudo*", reply: "Nice try. Access here is earned. Type apply." },
    { run: "rm *", reply: "Bold. Wrong machine." },
    { run: ["vim", "vi", "emacs", "nano"], reply: "No editor wars today. Type apply.", id: "editor" },
    { run: ["git blame", "git log"], reply: "Clean history. Let's keep it that way. Type apply.", id: "git" },
    { run: "hire me", reply: "That's the spirit. Type apply.", id: "hireme" },
  ],

  // The questions, in order. Types:
  //   text    free text, checked for junk (placeholders, keyboard mashing, copy-paste)
  //   name    a name or a place: needs letters, no links, no long numbers
  //   email   exactly one question must be this; one application per email
  //   links   URLs and @handles separated by spaces
  //   choice  2–9 options, answered with one key press
  // `label` shows on the review screen (18 characters fit) and names the sheet
  // column, unless you set `column`. min/words stop one-word answers.
  questions: [
    { key: "name", section: "You", type: "name", label: "Name",
      prompt: "What's your name?", max: 60, min: 2, words: 1 },
    { key: "email", section: "You", type: "email", label: "Email",
      prompt: "What's your email?", hint: "A human replies, not a bot.", max: 120 },

    { key: "built", section: "Proof", type: "text", label: "Proudest build",
      prompt: "Brag a little. What are you proudest of building?",
      hint: "Don't be modest. Failed projects count. Up to 280 characters.", max: 280, min: 40, words: 6 },
    { key: "broke", section: "Proof", type: "text", label: "Broke", column: "Something that broke",
      prompt: "Tell us about something that broke on your watch. What did you do?",
      hint: "Up to 280 characters.", max: 280, min: 30, words: 5 },
    { key: "last30", section: "Proof", type: "text", label: "Last 30 days",
      prompt: "What's one thing you shipped or learned in the last 30 days?", max: 120, min: 10, words: 2 },

    { key: "now", section: "Where you are", type: "choice", label: "Right now",
      prompt: "What are you mostly doing right now?",
      options: ["Studying", "Working a job", "Building my own thing", "Between things"] },
    { key: "online", section: "Where you are", type: "choice", label: "Most active on",
      prompt: "Where are you most active online?",
      options: ["GitHub", "X", "LinkedIn", "Tech Discords or communities", "Nowhere, I build quietly"] },
    { key: "links", section: "Where you are", type: "links", label: "Handles + links", required: false,
      prompt: "Share your handles and links.",
      hint: "GitHub, LinkedIn, X, YouTube, a blog, a demo. Separate with spaces. Optional.", max: 300 },
    { key: "onlinewhat", section: "Where you are", type: "text", label: "What you do there",
      column: "What they do there", required: false,
      prompt: "What do you usually do there?",
      hint: "One line, e.g. ship side projects and argue about Rust. Optional.", max: 120 },

    { key: "depth", section: "How you think", type: "text", label: "Know deeply", column: "Knows deeply",
      prompt: "Name one technical topic you know better than most people.",
      hint: "Just the topic. We'll dig in on the call.", max: 100, min: 3, words: 1 },
    { key: "ai", section: "How you think", type: "text", label: "AI code", column: "Doesn't trust AI code when",
      prompt: "When do you not trust code written by AI?", max: 140, min: 15, words: 3 },
    { key: "debug", section: "How you think", type: "text", label: "Debugging", column: "First move when prod breaks",
      prompt: "A robot stops mid-aisle at 2 am. What's the first thing you check?", max: 160, min: 15, words: 3 },

    { key: "twoyears", section: "What you want", type: "text", label: "In 2 years",
      prompt: "Where do you want to be in two years?", max: 120, min: 10, words: 2 },
    { key: "drive", section: "What you want", type: "choice", label: "Matters most",
      prompt: "What matters most to you right now?",
      options: ["Learning fast", "Owning something end to end", "Pay and equity", "Building toward my own startup"] },

    { key: "city", section: "Logistics", type: "name", label: "City",
      prompt: "Which city do you live in right now?", max: 60, min: 2, words: 1 },
    { key: "onsite", section: "Logistics", type: "choice", label: "In person",
      prompt: "Can you work in person in San Francisco?",
      options: ["Yes, I'm here", "Yes, I'd relocate", "No"] },
    { key: "start", section: "Logistics", type: "choice", label: "Start",
      prompt: "When could you start?",
      options: ["Right away", "Within a month", "In 1–3 months", "Later"] },
  ],

  // The final screen. The first step is a promise: only write one you'll keep.
  nextSteps: [
    "A human reads this, within a week",
    "If it's a fit, a 30-minute call",
    "Then a paid 1–2 day build trial",
    "Then an offer",
  ],
  closing: "While you wait, see what we're building: https://example.com",

  // The daily chat digest: these answers, one line per applicant, the first in bold.
  digest: ["name", "city", "now", "drive"],

  idPrefix: "ACME", // application IDs look like ACME-7K2M9QXD

  limits: {
    minSeconds: 45,     // refuse anything sent faster than this after `apply`
    maxSessionHours: 3, // sessions expire after this
    perHour: 5,         // submissions per network per hour
  },

  // Everything below is optional. The values shown are the defaults.

  // Junk checks, on top of the built-in lists (see docs/CUSTOMIZE.md).
  checks: {
    extraJunk: [],              // more answers to refuse as placeholders, e.g. "tbd"
    extraDisposableDomains: [], // more temporary-inbox domains to refuse
    maxLinks: 8,                // most links/handles one answer can hold
  },

  // Colours, as 256-colour terminal codes (0–255).
  theme: {
    accent: 141,  // logo, commands, option numbers, the application ID
    error: 203,   // "that answer needs work" messages
    success: 114, // the ✓ on the final screen
  },

  // The fixed lines of the script. Each must stay on one line.
  messages: {
    begin: "Type apply to begin, or help to look around.", // "apply" and "help" get the accent colour
    notFound: "Command not found. Try help.",
    goodbye: "See you.",
    firstQuestion: "Enter moves on. Choices take one key press.",
    reviewTitle: "Here's what you wrote.",
    reviewHint: "Press Enter to send, or type a number to edit that answer.",
    received: "✓ Received. Thank you.",
    nextTitle: "What happens next",
    idLabel: "Your application ID:",
    stopped: "Stopped. Nothing was sent.",
  },
};
