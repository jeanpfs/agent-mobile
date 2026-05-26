---
name: agent-mobile
description: Automate mobile apps on iOS simulators and Android emulators using LLM-guided interactions. Use when the user asks to test, validate, interact with, or automate any mobile app running in a simulator or emulator. Works with native iOS, Android, React Native, Flutter, and any framework. Captures accessibility tree snapshots, taps elements, types text, scrolls, and takes screenshots via Maestro.
---

# agent-mobile

Automate any mobile app running in an iOS Simulator or Android Emulator. You interact with apps through accessibility tree snapshots (compact text with element refs) and deterministic actions (tap, type, scroll).

## Goal

$ARGUMENTS

## Prerequisites

Before using any command, verify the environment:

```bash
agent-mobile setup
```

This checks: Maestro CLI installed, simulator/emulator running, app accessible. If it fails, follow the error suggestions.

**Install agent-mobile** (if missing):
```bash
npm install -g github:jeanpfs/agent-mobile
```

**Install Maestro** (if missing):
```bash
curl -Ls install.maestro.dev | bash
```

## Core Workflow

Always follow this loop:

1. **Snapshot** — Capture current UI state
2. **Decide** — Analyze the snapshot, identify target elements by ref
3. **Act** — Execute one action (tap, type, scroll)
4. **Snapshot** — Re-capture to verify the result
5. **Repeat** — Continue until the goal is achieved

**CRITICAL**: Always snapshot before acting. Refs are invalidated after any action that changes the UI. Never reuse refs from a previous snapshot.

## Commands

### snapshot — Capture UI state

```bash
agent-mobile snapshot [--platform ios|android] [--max 50]
```

Returns a compact text representation of the screen:

```
Screen: (12 elements)

- header "Welcome" [ref=m1]
- textbox "Email" [ref=m2]
- textbox "Password" [ref=m3]
- button "Sign In" [ref=m4]
- link "Forgot password?" [ref=m5]
```

Each `[ref=mN]` is a unique identifier for that element, valid only for this snapshot.

### tap — Tap an element

```bash
agent-mobile tap <ref>
```

Example: `agent-mobile tap m4` taps the "Sign In" button.

### type — Type text into a field

```bash
agent-mobile type <ref> "<text>"
```

Example: `agent-mobile type m2 "user@example.com"` types into the Email field. The script taps the field first to focus it, then inputs the text.

### scroll — Scroll the screen

```bash
agent-mobile scroll <direction>
```

Directions: `up`, `down`, `left`, `right`. Default: `down`. Use when elements aren't visible in the current snapshot.

### screenshot — Capture screen image

```bash
agent-mobile screenshot [--output path.png]
```

Saves a PNG screenshot. Use for visual verification when the text snapshot isn't sufficient.

### assert — Verify text on screen

```bash
agent-mobile assert "<expected text>"
```

Returns `PASS` if text is found, `FAIL` with visible texts for debugging.

### logs — Capture device logs

Capture device logs over a time period. Useful for debugging failed requests, crashes, or unexpected behavior.

```bash
agent-mobile logs start
agent-mobile logs stop
```

Start before performing actions that might fail. Stop after to inspect errors, network failures, or crash traces.

## Best Practices

1. **Always snapshot first** — Never act without a fresh snapshot
2. **One action at a time** — Tap, then snapshot, then decide next action
3. **Validate after actions** — Use assert or snapshot to confirm results
4. **Handle missing elements** — If an element isn't visible, scroll first
5. **Report clearly** — When something fails, show the user the error and current screen state
6. **Use logs for debugging** — When an action fails unexpectedly, use `logs start` before retrying to capture device logs
7. **Stop on input failure** — If `type` or `inputText` fails twice on the same field (custom components, OTP inputs, masked fields), **do not keep retrying or inventing workarounds**. Instead: stop, show the user the text that needs to be entered, and ask them to input it manually. Only continue after the user confirms they are done.

## Additional resources

- For error codes, platform-specific notes, and troubleshooting, see [reference.md](reference.md)
