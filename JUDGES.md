# Polter: Instructions for Judges

## Getting it running

1. Download the latest `-setup.exe` from [GitHub Releases](https://github.com/hyowonbernabe/Polter/releases/latest)
2. Run the installer. Next, next, done.
3. A small pixel ghost appears on your desktop and onboarding starts automatically.

## Setting up AI (you need this to see insight bubbles)

Polter uses an AI model to turn your behavioral patterns into written observations. Without a key, the ghost still moves around and reacts to your behavior, but it won't speak.

OpenRouter has free models, so this won't cost you anything:

1. Go to [openrouter.ai/keys](https://openrouter.ai/keys) and create a free account
2. Generate an API key
3. Paste it during onboarding when it asks, or later in Settings

OpenRouter gives you access to free models from various providers, so testing Polter costs nothing.

Important: free models on OpenRouter have rate limits imposed by their providers. If you get a rate limit error, that is an OpenRouter/provider issue, not a Polter issue. Wait a minute and it will resolve itself. The ghost, dashboard, and state tracking all continue working normally regardless of whether the AI responds.

## What happens on first launch

The onboarding flow walks you through what Polter collects and what it does not. You will see:

- A plain-language explanation of the signals it watches (keystroke timing, mouse rhythm, app switching)
- Optional permission screens for extra sensors (screen content, clipboard, calendar). You can skip all of these.
- A summary of your choices before anything starts collecting

After onboarding finishes, the ghost appears on your desktop. It starts in a "still learning" visual because it normally takes 30 days to build a full personal baseline. You will still see it react to your behavior right away.

## How to interact with the ghost

Pick it up by clicking and dragging. Let go to throw it. It bounces off the edges of your screen and settles back down. The faster you throw, the harder it hits.

The ghost's mood changes as you work. If you type steadily for a while, it calms down. If you start switching apps constantly, it gets restless. If you stop for a long time, it falls asleep.

Chat bubbles appear when Polter notices something about your behavior. Each bubble has two buttons: "tell me more" (expands the observation) and "ok" (dismisses it). Bubbles also auto-dismiss after 45 seconds if you ignore them.

## System tray

Look for the Polter icon in the bottom-right of your taskbar (you might need to click the arrow to expand the tray). Right-click it for:

- Open Dashboard
- Sleep / Wake
- Privacy Mode (pauses all data collection instantly)
- Settings
- Quit Polter

## The dashboard

Open it from the system tray. It shows:

- Your current behavioral state and how long you have been in it
- Total active time today and your longest focus block
- A 7-day activity chart (stacked bars for focus, deep work, and high-intensity time)
- How your time breaks down across all seven states this week
- Every insight Polter has ever said, in reverse chronological order
- A "What Polter knows" panel that shows, in plain language, exactly what it has collected and inferred during the current session

## Things worth knowing

The ghost runs as a transparent overlay that stays on top of your other windows. Clicks pass through everything except the ghost itself and any visible bubble. You can work normally without it getting in the way.

If you have not entered an API key, the ghost still tracks your state and populates the dashboard. It just will not generate chat bubbles. Everything else works.

Polter uses under 1% CPU and under 50MB of RAM. You should not notice any impact on your machine.

To close Polter completely, right-click the system tray icon and hit Quit. Closing the dashboard does not quit the app.

## If something seems off

Ghost not visible? Left-click the Polter tray icon to bring it back. It might have drifted to a screen edge or behind a window.

No bubbles appearing? Check that your API key is entered in Settings and that you have been actively working for at least 5 minutes. Polter will not speak until it has enough data to say something real.

App will not open? Polter only allows one instance at a time. Check if it is already running in the system tray.

## Requirements

- Windows 10 or 11
- No special permissions needed
- No account needed
- Internet connection only required if using OpenRouter for AI insights
