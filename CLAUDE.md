# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**agent-mobi** is a mobile app automation CLI for AI agents. It enables LLM-guided interaction with iOS Simulators and Android Emulators via Maestro. The core interface is text-based accessibility tree snapshots with sequential element refs (m1, m2, m3…), avoiding visual/coordinate-based interaction.

## Commands

```bash
pnpm build          # Compile TypeScript with tsup → dist/cli.js
agent-mobi setup    # Verify Maestro, detect platform, list devices
```

No test or lint scripts exist — this CLI requires real devices/simulators to test.

## Architecture

Single-purpose CLI with a **command-dispatch + shared utilities** pattern:

```
src/cli.ts           Entry point; parses argv and dispatches to commands
src/commands/        One file per command (snapshot, tap, type, scroll, screenshot, assert, logs)
src/utils.ts         All shared logic: shell execution, Maestro YAML runner, hierarchy parsing,
                     element normalization, ref assignment, snapshot caching, error handling
```

**Data flow:**
1. `snapshot` → calls `maestro hierarchy` → parses raw accessibility tree → normalizes roles → assigns sequential refs → caches to `/tmp/agent-mobi-snapshot.json`
2. `tap` / `type` → loads cached snapshot, looks up ref → generates Maestro YAML flow → executes via `maestro test`
3. `assert` → fetches fresh hierarchy → searches all element labels for text match
4. `logs` → spawns `xcrun simctl spawn` (iOS) or `adb logcat` (Android) as a background process → saves PID and output path to temp files → displays on `stop`

**Key design decisions:**
- Refs are ephemeral — invalidated after any UI-changing action; always re-snapshot before the next command
- All actions delegate to Maestro YAML flows (via `runFlow()` in `utils.ts`)
- Platform detection tries `xcrun` first (iOS), then `adb` (Android)
- Temp files: `/tmp/agent-mobi-snapshot.json`, `/tmp/agent-mobi-logs.txt`, `/tmp/agent-mobi-*.yaml`

## Error Handling

`utils.ts` exports a structured `MaestroError` type with `code`, `message`, and `suggestion`. The `fail()` function prints the error and suggestion, then exits with code 1. Always include a `suggestion` when adding new errors.

Error codes in use: `NO_MAESTRO`, `NO_DEVICE`, `INVALID_REF`, `TIMEOUT`, `ASSERTION_FAILED`, `COMMAND_FAILED`.

## Stack

- TypeScript, Node.js ≥ 18, no runtime dependencies
- Build: `tsup` → ESM output with shebang (`#!/usr/bin/env node`)
- Automation backend: Maestro (must be installed separately)
- Platform CLIs: `xcrun simctl` (iOS), `adb` (Android)
