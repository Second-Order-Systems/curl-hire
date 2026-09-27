// The config behind 2os's founding engineer application. Try it: curl -sL apply.2os.ai | bash
// To start from it: cp examples/2os.config.js apply.config.js

export default {
  company: {
    name: "Second Order Systems",
    website: "https://2os.ai",
    prompt: "2os",
  },
  role: {
    title: "Founding Engineer (Forward Deployed)",
    details: "Bengaluru · in person · ₹10–20 LPA fixed + up to 20% of outcome fees + ESOPs",
  },
  logo: String.raw`
 ___
|_  )  ___  ___
 / /  / _ \(_-<
/___| \___//__/`,
  duration: "about 5 minutes",
  intro: [
    "No CV. No cover letter. About 5 minutes: mostly one-liners and quick picks.",
    "We read every application, and we keep your answers plus a few session",
    "details, like time spent. Nothing else.",
  ],

  pages: [
    {
      command: "role",
      summary: "what you'll do",
      body: `
Founding Engineer (Forward Deployed)
→ Build Dystil, our core platform, in Rust, Python and TypeScript
→ Build AI agents and automations on it for our customers
→ Own the customer engagement end to end, from first conversation to the impact number
Bengaluru, in person, with some travel to client sites.`,
    },
    {
      command: "pay",
      summary: "how you get paid",
      body: `
₹10–20 LPA fixed
+ up to 20% of the outcome fees our customers pay us on the deployments you lead
+ meaningful ESOPs
The more impact you ship, the more you're rewarded. No ceiling.`,
    },
    {
      command: "stack",
      summary: "what we build with",
      body: `
Dystil's core: Rust, Python, TypeScript.
Agents run in production inside our customers' businesses.
You'll touch all of it: the platform, the agents, and the customer on the other end.`,
    },
    {
      command: "why",
      summary: "why we pay this way",
      body: `
Salary pays engineers for their time. Bonuses pay them for a rating.
ESOPs pay them for loyalty.
Almost nothing pays them for the impact they create for a business.
Our customers pay us on how much we move their P&L. Now our engineers get paid on it too.`,
    },
    {
      command: "about",
      summary: "who we are",
      body: `
Second Order Systems (2os.ai), Bengaluru.
We build AI that runs real business operations, and we price on the P&L impact we create.
Funded by our customers, not investors.
More at https://2os.ai`,
    },
  ],
  helpFooter: "There are a few more. Engineers usually find them.",

  hiddenCommands: [
    { run: "whoami", reply: "Someone who reads the manual. Noted." },
    { run: "ls", reply: "apply  role  pay  stack  why  about" },
    { run: ["ls -a", "ls -la", "ls -al"], reply: ".  ..  .note  apply  role  pay  stack  why  about", id: "ls-a" },
    { run: "cat .note", reply: "The best applications we've read were shorter than the limit. Say it plainly.", id: "note" },
    { run: "pwd", reply: "/home/you/next-chapter" },
    { run: "sudo*", reply: "Nice try. Access here is earned. Type apply." },
    { run: "rm *", reply: "Bold. Wrong machine." },
    { run: ["vim", "vi", "emacs", "nano"], reply: "No editor wars today. Type apply.", id: "editor" },
    { run: "hire me", reply: "That's the spirit. Type apply.", id: "hireme" },
  ],

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
    { key: "workflow", section: "How you think", type: "text", label: "Workflow", column: "Workflow to automate",
      prompt: "Name one workflow in a real business that you would automate.", max: 160, min: 15, words: 3 },

    { key: "twoyears", section: "What you want", type: "text", label: "In 2 years",
      prompt: "Where do you want to be in two years?", max: 120, min: 10, words: 2 },
    { key: "drive", section: "What you want", type: "choice", label: "Matters most",
      prompt: "What matters most to you right now?",
      options: ["Learning fast", "Owning something end to end", "Earning on my impact", "Building toward my own startup"] },

    { key: "city", section: "Logistics", type: "name", label: "City",
      prompt: "Which city do you live in right now?", max: 60, min: 2, words: 1 },
    { key: "bengaluru", section: "Logistics", type: "choice", label: "Bengaluru",
      prompt: "Can you work in person in Bengaluru?",
      options: ["Yes, I'm here", "Yes, I'd relocate", "No"] },
    { key: "start", section: "Logistics", type: "choice", label: "Start",
      prompt: "When could you start?",
      options: ["Right away", "Within a month", "In 1–3 months", "Later"] },
  ],

  nextSteps: [
    "A human reads this, within a week",
    "If it's a fit, a short call",
    "Then a paid 1–2 day build trial",
    "Then an offer",
  ],
  closing: "While you wait, see what we're building: https://2os.ai",

  digest: ["name", "city", "now", "drive"],
  idPrefix: "2OS",
  limits: { minSeconds: 45, maxSessionHours: 3, perHour: 5 },
};
