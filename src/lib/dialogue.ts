// All hardcoded Wisp dialogue in one place.
// Rust-side text (first-ever insight bubble) lives in src-tauri/src/commands.rs
// in the complete_onboarding function.

export const onboarding = {
  welcome: {
    heading: "Hey, I'm Wisp.",
    body: "I sit quietly in the corner of your screen. I watch how you work, not what you type, just the rhythm of it. Every now and then I'll share something I noticed.",
    footer: "Everything stays on your machine. No account. No cloud.",
    cta: "Let's go",
  },

  tier1: {
    heading: "What I always see",
    subtext: "These run automatically. They're what make everything else possible.",
    sensors: [
      {
        key: "keyboard",
        name: "Keyboard rhythm",
        desc: "Key-down and key-up timing only. Never which key you pressed.",
      },
      {
        key: "mouse",
        name: "Mouse movement",
        desc: "Speed and acceleration. Not where you clicked or what was under the cursor.",
      },
      {
        key: "click",
        name: "Click rate",
        desc: "How often you click, not what you clicked on.",
      },
      {
        key: "cpu",
        name: "CPU and RAM",
        desc: "Overall system load from the OS. Not broken down per app.",
      },
      {
        key: "windows",
        name: "Active windows",
        desc: "How many windows are open, not their names or contents.",
      },
    ],
    cta: "Got it",
  },

  screen: {
    heading: "Screen content",
    label: "Periodic screenshot sampling",
    desc: "Every few minutes Wisp takes a low-resolution screenshot, pulls out basic visual features like brightness and text density, then throws the image away. Nothing is ever stored.",
    risk: "Sensitive content on your screen could be briefly sampled.",
    yes: "Yes, opt in",
    no: "No thanks",
  },

  clipboard: {
    heading: "Clipboard activity",
    label: "Copy and paste detection",
    desc: "Wisp notices when you copy or paste, not what it was, just the act. This helps it understand context switching. Clipboard content is never read.",
    risk: "Clipboard events are tracked even when the content is sensitive.",
    yes: "Yes, opt in",
    no: "No thanks",
  },

  calendar: {
    heading: "Calendar",
    label: "Meeting detection",
    desc: "Wisp reads your calendar to know when you're in a meeting. That way it can interpret a burst of fast typing more accurately. Event titles and attendees are never stored.",
    risk: "Event metadata like title and time is briefly read.",
    yes: "Yes, opt in",
    no: "No thanks",
  },

  summary: {
    heading: "You're all set.",
    body: "Wisp will show up in the corner and start learning quietly. Give it a few days before expecting anything useful.",
    choicesLabel: "Your choices",
    choiceLabels: {
      screen: "Screen sampling",
      clipboard: "Clipboard activity",
      calendar: "Calendar",
    },
    settingsNote: "You can change any of this in Settings.",
    cta: "Start Wisp",
    ctaLoading: "Starting...",
  },
} as const;
