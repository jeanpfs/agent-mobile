---
name: agent-mobile
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
allowed-tools: Bash(agent-mobile:*)
---

# agent-mobile

Automate any mobile app running in an iOS Simulator or Android Emulator. You interact with apps through accessibility tree snapshots (compact text with element refs) and deterministic actions (tap, type, scroll).

## Installation

```bash
npm install -g agent-mobile
```

## Prerequisites

Before using any command, verify the environment:

```bash
agent-mobile setup
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
- text "Don't have an account?" [ref=m6]
- button "Sign Up" [ref=m7]
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

Example: `agent-mobile type m2 "user@example.com"` types into the Email field.

The script taps the field first to focus it, then inputs the text.

### scroll — Scroll the screen

```bash
agent-mobile scroll <direction>
```

Directions: `up`, `down`, `left`, `right`. Default: `down`.

Use scroll when elements aren't visible in the current snapshot.

### screenshot — Capture screen image

```bash
agent-mobile screenshot [--output path.png]
```

Saves a PNG screenshot. Use for visual verification when text snapshot isn't sufficient.

### assert — Verify text on screen

```bash
agent-mobile assert "<expected text>"
```

Returns `PASS` if text is found, `FAIL` with visible texts for debugging.

## Error Codes

| Code | Meaning | What to do |
|------|---------|------------|
| `NO_MAESTRO` | Maestro CLI not installed | Install: `curl -Ls install.maestro.dev \| bash` |
| `NO_DEVICE` | No simulator/emulator running | Ask user to start one |
| `INVALID_REF` | Ref not found in current UI | Run snapshot again |
| `TIMEOUT` | Action didn't complete in time | Retry or ask user |
| `TAP_FAILED` | Tap action failed | Element may not be tappable, try scroll |
| `TYPE_FAILED` | Type action failed | Check ref is a text input |

## Best Practices

1. **Always snapshot first** — Never act without a fresh snapshot
2. **One action at a time** — Tap, then snapshot, then decide next action
3. **Validate after actions** — Use assert or snapshot to confirm results
4. **Handle missing elements** — If an element isn't visible, scroll first
5. **Report clearly** — When something fails, show the user the error and current screen state

## Example Flow: Login Test

```bash
agent-mobile setup

agent-mobile snapshot

agent-mobile type m2 "test@example.com"

agent-mobile type m3 "password123"

agent-mobile tap m4

agent-mobile snapshot
agent-mobile assert "Welcome"
```

See [references/REFERENCE.md](references/REFERENCE.md) for detailed technical documentation.
