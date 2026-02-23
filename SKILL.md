---
name: agent-mobi
description: >
  Automate mobile apps on iOS simulators and Android emulators using
  LLM-guided interactions. Use when the user asks to test, validate,
  interact with, or automate any mobile app running in a simulator
  or emulator. Works with native iOS, Android, React Native, Flutter,
  and any framework. Captures accessibility tree snapshots, taps
  elements, types text, scrolls, and takes screenshots via Maestro.
license: MIT
metadata:
  author: jeanpfs
  version: "1.0"
compatibility: >
  Requires Node.js >= 18, Maestro CLI installed, and an iOS Simulator
  or Android Emulator running with the target app.
allowed-tools: Bash(agent-mobi:*)
---

# agent-mobi

Automate any mobile app running in an iOS Simulator or Android Emulator. You interact with apps through accessibility tree snapshots (compact text with element refs) and deterministic actions (tap, type, scroll).

## Installation

```bash
npm install -g agent-mobi
```

## Prerequisites

Before using any command, verify the environment:

```bash
agent-mobi setup
```

This checks: Maestro CLI installed, simulator/emulator running, app accessible. If it fails, follow the error suggestions.

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
agent-mobi snapshot [--platform ios|android] [--max 50]
```

Returns a compact text representation of the screen:

```
Screen: (12 elements)

- header "Welcome" [ref=m1]
- textbox "Email" [ref=m2]
- textbox "Password" [ref=m3]
- button "Sign In" [ref=m4]
- link "Forgot password?" [ref=m5]
- text "Don't have an account?" [ref=m6]
- button "Sign Up" [ref=m7]
```

Each `[ref=mN]` is a unique identifier for that element, valid only for this snapshot.

### tap — Tap an element

```bash
agent-mobi tap <ref>
```

Example: `agent-mobi tap m4` taps the "Sign In" button.

### type — Type text into a field

```bash
agent-mobi type <ref> "<text>"
```

Example: `agent-mobi type m2 "user@example.com"` types into the Email field.

The script taps the field first to focus it, then inputs the text.

### scroll — Scroll the screen

```bash
agent-mobi scroll <direction>
```

Directions: `up`, `down`, `left`, `right`. Default: `down`.

Use scroll when elements aren't visible in the current snapshot.

### screenshot — Capture screen image

```bash
agent-mobi screenshot [--output path.png]
```

Saves a PNG screenshot. Use for visual verification when text snapshot isn't sufficient.

### assert — Verify text on screen

```bash
agent-mobi assert "<expected text>"
```

Returns `PASS` if text is found, `FAIL` with visible texts for debugging.

### logs — Capture device logs

Capture device logs over a time period. Useful for debugging failed requests, crashes, or unexpected behavior.

**Start capturing:**
```bash
agent-mobi logs start
```

**Stop and view captured logs:**
```bash
agent-mobi logs stop
```

The `start` command runs `adb logcat` (Android) or `xcrun simctl spawn booted log stream` (iOS) in the background. The `stop` command kills the capture process and displays the last 200 lines.

**When to use:** Start log capture before performing actions that might fail (form submissions, API calls, navigation). Stop after the action to inspect errors, network failures, or crash traces.

## Error Codes

| Code | Meaning | What to do |
|------|---------|------------|
| `NO_MAESTRO` | Maestro CLI not installed | Install: `curl -Ls install.maestro.dev \| bash` |
| `NO_DEVICE` | No simulator/emulator running | Ask user to start one |
| `INVALID_REF` | Ref not found in current UI | Run snapshot again |
| `TIMEOUT` | Action didn't complete in time | Retry or ask user |
| `TAP_FAILED` | Tap action failed | Element may not be tappable, try scroll |
| `TYPE_FAILED` | Type action failed | Check ref is a text input |
| `LOGS_ALREADY_RUNNING` | Log capture already active | Run `logs stop` first |
| `LOGS_NOT_RUNNING` | No active log capture | Run `logs start` first |

## Best Practices

1. **Always snapshot first** — Never act without a fresh snapshot
2. **One action at a time** — Tap, then snapshot, then decide next action
3. **Validate after actions** — Use assert or snapshot to confirm results
4. **Handle missing elements** — If an element isn't visible, scroll first
5. **Report clearly** — When something fails, show the user the error and current screen state
6. **Use logs for debugging** — When an action fails unexpectedly, use `logs start` before retrying to capture device logs

## Example Flow: Login Test

```bash
agent-mobi setup

agent-mobi snapshot

agent-mobi type m2 "test@example.com"

agent-mobi type m3 "password123"

agent-mobi tap m4

agent-mobi snapshot
agent-mobi assert "Welcome"
```

## Example Flow: Debugging a Failed Action

```bash
agent-mobi logs start

agent-mobi type m2 "test@example.com"
agent-mobi tap m4

agent-mobi logs stop
```

If the tap triggered an API call that failed, the logs will show network errors, server responses, or crash traces from the device.

See [references/REFERENCE.md](references/REFERENCE.md) for detailed technical documentation.
