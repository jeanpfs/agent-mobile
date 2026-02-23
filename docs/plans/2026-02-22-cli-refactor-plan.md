# CLI Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform mobile-agent from `npx tsx scripts/*.ts` to a publishable npm CLI (`mobile-agent <command>`).

**Architecture:** Single entry point `src/cli.ts` dispatches subcommands to `src/commands/*.ts`. tsup bundles everything into `dist/cli.js` with shebang. Published via npm with `"bin": { "mobile-agent": "./dist/cli.js" }`.

**Tech Stack:** TypeScript, tsup (bundler), zero runtime dependencies.

---

### Task 1: Restructure project — move scripts/ to src/

**Files:**
- Move: `scripts/utils.ts` → `src/utils.ts`
- Move: `scripts/setup.ts` → `src/commands/setup.ts`
- Move: `scripts/snapshot.ts` → `src/commands/snapshot.ts`
- Move: `scripts/tap.ts` → `src/commands/tap.ts`
- Move: `scripts/type.ts` → `src/commands/type.ts`
- Move: `scripts/scroll.ts` → `src/commands/scroll.ts`
- Move: `scripts/screenshot.ts` → `src/commands/screenshot.ts`
- Move: `scripts/assert.ts` → `src/commands/assert.ts`
- Delete: `scripts/` directory (after moves)

**Step 1: Create directories and move files**

```bash
mkdir -p src/commands
git mv scripts/utils.ts src/utils.ts
git mv scripts/setup.ts src/commands/setup.ts
git mv scripts/snapshot.ts src/commands/snapshot.ts
git mv scripts/tap.ts src/commands/tap.ts
git mv scripts/type.ts src/commands/type.ts
git mv scripts/scroll.ts src/commands/scroll.ts
git mv scripts/screenshot.ts src/commands/screenshot.ts
git mv scripts/assert.ts src/commands/assert.ts
```

**Step 2: Fix imports in all command files**

Every command file imports from `"./utils.js"`. Change to `"../utils.js"` since commands are now one level deeper.

Files to update (all in `src/commands/`):
- `setup.ts`: `from "./utils.js"` → `from "../utils.js"`
- `snapshot.ts`: `from "./utils.js"` → `from "../utils.js"`
- `tap.ts`: `from "./utils.js"` → `from "../utils.js"`
- `type.ts`: `from "./utils.js"` → `from "../utils.js"`
- `scroll.ts`: `from "./utils.js"` → `from "../utils.js"`
- `screenshot.ts`: no change needed (imports from `child_process`, `fs`, `path` + `"./utils.js"` → `"../utils.js"`)
- `assert.ts`: `from "./utils.js"` → `from "../utils.js"`

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor: move scripts/ to src/commands/ structure"
```

---

### Task 2: Convert command files to exported functions

Each command file currently runs top-level code. Convert each to export a `run(args: string[])` function so `cli.ts` can call them.

**Files:**
- Modify: `src/commands/setup.ts`
- Modify: `src/commands/snapshot.ts`
- Modify: `src/commands/tap.ts`
- Modify: `src/commands/type.ts`
- Modify: `src/commands/scroll.ts`
- Modify: `src/commands/screenshot.ts`
- Modify: `src/commands/assert.ts`

**Step 1: Convert each command**

The pattern for every file: wrap all top-level code in `export function run(args: string[])`. Replace `parseArgs(process.argv)` with `parseArgs(["", "", ...args])` (parseArgs skips first 2 elements).

**setup.ts** — full converted code:

```ts
import { runCommand, detectPlatform, fail } from "../utils.js"

function checkMaestro(): string {
  try {
    const version = runCommand("maestro --version")
    return version
  } catch {
    fail({
      code: "NO_MAESTRO",
      message: "Maestro CLI not found",
      suggestion: "Install: curl -Ls install.maestro.dev | bash",
    })
  }
}

function listDevices(platform: "ios" | "android"): string[] {
  if (platform === "ios") {
    const output = runCommand("xcrun simctl list devices booted")
    return output
      .split("\n")
      .filter((l) => l.includes("Booted"))
      .map((l) => l.trim().replace(/\s*\(Booted\).*/, ""))
  }
  const output = runCommand("adb devices")
  return output
    .split("\n")
    .filter((l) => l.includes("\tdevice"))
    .map((l) => l.split("\t")[0])
}

export function run(_args: string[]) {
  const maestroVersion = checkMaestro()
  const platform = detectPlatform()
  const devices = listDevices(platform)

  console.log(`Maestro: ${maestroVersion}`)
  console.log(`Platform: ${platform}`)
  console.log(`Devices: ${devices.join(", ")}`)
  console.log(`Status: READY`)
}
```

**snapshot.ts** — full converted code:

```ts
import { detectPlatform, fail, parseArgs, getHierarchy, parseHierarchy, saveSnapshot } from "../utils.js"
import type { HierarchyNode, ParsedElement } from "../utils.js"

function formatSnapshot(elements: ParsedElement[], maxElements: number): string {
  const limited = elements.slice(0, maxElements)
  const lines = limited.map((el) => {
    const indent = "  ".repeat(Math.min(el.depth, 3))
    return `${indent}- ${el.role} "${el.label}" [ref=${el.ref}]`
  })
  let output = lines.join("\n")
  if (elements.length > maxElements) {
    output += `\n\n(${elements.length - maxElements} more elements truncated)`
  }
  return output
}

export function run(args: string[]) {
  const parsed = parseArgs(["", "", ...args])
  if (!parsed["platform"]) detectPlatform()
  const maxElements = parseInt(parsed["max"] || "50", 10)

  const rawJson = getHierarchy()

  let tree: HierarchyNode
  try {
    tree = JSON.parse(rawJson)
  } catch {
    fail({
      code: "PARSE_ERROR",
      message: "Failed to parse Maestro hierarchy output",
      suggestion: "Maestro may have returned unexpected output. Try running 'maestro hierarchy' manually",
    })
  }

  const elements = parseHierarchy(tree)
  saveSnapshot(elements)

  if (elements.length === 0) {
    console.log("Screen: (empty or no accessible elements)")
    console.log("\nNo interactive elements found. The app may lack accessibility labels.")
  } else {
    console.log(`Screen: (${elements.length} elements)\n`)
    console.log(formatSnapshot(elements, maxElements))
  }
}
```

**tap.ts** — full converted code:

```ts
import { runFlow, fail, succeed, parseArgs, detectPlatform, findCachedByRef } from "../utils.js"

export function run(args: string[]) {
  const parsed = parseArgs(["", "", ...args])
  const refArg = parsed["_0"]

  if (!refArg) {
    fail({
      code: "MISSING_ARG",
      message: "No ref provided",
      suggestion: "Usage: mobile-agent tap <ref> (e.g., m3)",
    })
  }

  if (!/^m\d+$/.test(refArg)) {
    fail({
      code: "INVALID_REF",
      message: `Invalid ref format: ${refArg}`,
      suggestion: "Refs should be like m1, m2, m3. Run snapshot first.",
    })
  }

  detectPlatform()

  const match = findCachedByRef(refArg)

  let selector: string
  if (match.resourceId) {
    selector = `\n    id: "${match.resourceId}"`
  } else if (match.label) {
    selector = ` "${match.label}"`
  } else {
    fail({
      code: "NO_SELECTOR",
      message: `Element at ${refArg} has no text or id to select`,
      suggestion: "This element may need accessibility improvements",
    })
  }

  const flow = `appId: ""
---
- tapOn:${selector}
`

  try {
    runFlow(flow)
    succeed(`Tapped ${refArg} (${match.role} "${match.label}")`)
  } catch (e: any) {
    fail({
      code: "TAP_FAILED",
      message: `Failed to tap ${refArg}: ${e.message}`,
      suggestion: "Element may not be tappable or visible. Try scrolling or re-snapshot.",
    })
  }
}
```

**type.ts** — full converted code:

```ts
import { runFlow, fail, succeed, parseArgs, detectPlatform, findCachedByRef } from "../utils.js"

export function run(args: string[]) {
  const parsed = parseArgs(["", "", ...args])
  const refArg = parsed["_0"]
  const text = parsed["_1"]

  if (!refArg || !text) {
    fail({
      code: "MISSING_ARG",
      message: "Missing ref or text",
      suggestion: 'Usage: mobile-agent type <ref> "<text>" (e.g., m2 "hello@test.com")',
    })
  }

  if (!/^m\d+$/.test(refArg)) {
    fail({
      code: "INVALID_REF",
      message: `Invalid ref format: ${refArg}`,
      suggestion: "Refs should be like m1, m2, m3. Run snapshot first.",
    })
  }

  detectPlatform()

  const match = findCachedByRef(refArg)

  let tapSelector: string
  if (match.resourceId) {
    tapSelector = `\n    id: "${match.resourceId}"`
  } else if (match.label) {
    tapSelector = ` "${match.label}"`
  } else {
    fail({
      code: "NO_SELECTOR",
      message: `Element at ${refArg} has no text or id`,
      suggestion: "This element needs accessibility labels",
    })
  }

  const flow = `appId: ""
---
- tapOn:${tapSelector}
- inputText: "${text.replace(/"/g, '\\"')}"
`

  try {
    runFlow(flow)
    succeed(`Typed "${text}" into ${refArg} (${match.role} "${match.label}")`)
  } catch (e: any) {
    fail({
      code: "TYPE_FAILED",
      message: `Failed to type into ${refArg}: ${e.message}`,
      suggestion: "Element may not be a text input. Check snapshot for correct ref.",
    })
  }
}
```

**scroll.ts** — full converted code:

```ts
import { runFlow, fail, succeed, parseArgs, detectPlatform } from "../utils.js"

const VALID_DIRECTIONS = ["up", "down", "left", "right"] as const
type Direction = (typeof VALID_DIRECTIONS)[number]

export function run(args: string[]) {
  const parsed = parseArgs(["", "", ...args])
  const direction = (parsed["_0"] || "down").toLowerCase() as Direction

  if (!VALID_DIRECTIONS.includes(direction)) {
    fail({
      code: "INVALID_DIRECTION",
      message: `Invalid direction: ${direction}`,
      suggestion: `Valid directions: ${VALID_DIRECTIONS.join(", ")}`,
    })
  }

  detectPlatform()

  const maestroDirection = direction.toUpperCase()
  const flow = `appId: ""
---
- swipe:
    direction: ${maestroDirection}
    duration: 500
`

  try {
    runFlow(flow)
    succeed(`Scrolled ${direction}`)
  } catch (e: any) {
    fail({
      code: "SCROLL_FAILED",
      message: `Failed to scroll ${direction}: ${e.message}`,
      suggestion: "Ensure the app is running and responsive",
    })
  }
}
```

**screenshot.ts** — full converted code:

```ts
import { execSync } from "child_process"
import { existsSync, mkdirSync } from "fs"
import { join, dirname } from "path"
import { fail, succeed, parseArgs, detectPlatform } from "../utils.js"

export function run(args: string[]) {
  const parsed = parseArgs(["", "", ...args])
  const platform = (parsed["platform"] as "ios" | "android") || detectPlatform()
  const outputPath = parsed["output"] || join(process.cwd(), `screenshot-${Date.now()}.png`)

  const outputDir = dirname(outputPath)
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

  try {
    if (platform === "ios") {
      execSync(`xcrun simctl io booted screenshot "${outputPath}"`, {
        encoding: "utf-8",
        timeout: 15_000,
      })
    } else {
      execSync(`adb exec-out screencap -p > "${outputPath}"`, {
        encoding: "utf-8",
        timeout: 15_000,
        shell: "/bin/bash",
      })
    }

    if (!existsSync(outputPath)) {
      fail({
        code: "SCREENSHOT_FAILED",
        message: "Screenshot file was not created",
        suggestion: "Check that the simulator/emulator is running",
      })
    }

    succeed(`Screenshot saved to ${outputPath}`)
  } catch (e: any) {
    fail({
      code: "SCREENSHOT_FAILED",
      message: `Failed to take screenshot: ${e.message}`,
      suggestion: "Ensure the simulator/emulator is running and responsive",
    })
  }
}
```

**assert.ts** — full converted code:

```ts
import { fail, parseArgs, detectPlatform, getHierarchy, parseHierarchy } from "../utils.js"
import type { HierarchyNode } from "../utils.js"

export function run(args: string[]) {
  const parsed = parseArgs(["", "", ...args])
  const expectedText = parsed["_0"]

  if (!expectedText) {
    fail({
      code: "MISSING_ARG",
      message: "No text to assert",
      suggestion: 'Usage: mobile-agent assert "<expected text>"',
    })
  }

  detectPlatform()

  const rawJson = getHierarchy()
  const tree: HierarchyNode = JSON.parse(rawJson)
  const elements = parseHierarchy(tree)

  const labels = elements.map((el) => el.label)
  const found = labels.some((t) => t.toLowerCase().includes(expectedText.toLowerCase()))

  if (found) {
    console.log(`PASS: Found "${expectedText}" on screen`)
  } else {
    console.log(`FAIL: "${expectedText}" not found on screen`)
    console.log(`Visible texts: ${labels.slice(0, 20).join(", ")}`)
    process.exit(1)
  }
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "refactor: convert commands to exported run() functions"
```

---

### Task 3: Create CLI entry point

**Files:**
- Create: `src/cli.ts`

**Step 1: Create the CLI entry point**

```ts
import { run as setup } from "./commands/setup.js"
import { run as snapshot } from "./commands/snapshot.js"
import { run as tap } from "./commands/tap.js"
import { run as type } from "./commands/type.js"
import { run as scroll } from "./commands/scroll.js"
import { run as screenshot } from "./commands/screenshot.js"
import { run as assert } from "./commands/assert.js"

const command = process.argv[2]
const args = process.argv.slice(3)

const commands: Record<string, (args: string[]) => void> = {
  setup,
  snapshot,
  tap,
  type,
  scroll,
  screenshot,
  assert,
}

if (!command || command === "--help" || command === "-h") {
  console.log(`mobile-agent - Mobile app automation for AI agents

Usage: mobile-agent <command> [options]

Commands:
  setup                     Check Maestro, platform, and devices
  snapshot [--max N]        Capture UI accessibility tree
  tap <ref>                 Tap element by ref (e.g., m3)
  type <ref> "<text>"       Type text into element
  scroll [direction]        Scroll up/down/left/right (default: down)
  screenshot [--output path] Capture screen as PNG
  assert "<text>"           Verify text exists on screen

Examples:
  mobile-agent snapshot
  mobile-agent tap m4
  mobile-agent type m2 "user@example.com"
  mobile-agent assert "Welcome"`)
  process.exit(0)
}

const handler = commands[command]
if (!handler) {
  console.error(`Unknown command: ${command}`)
  console.error(`Run 'mobile-agent --help' for available commands`)
  process.exit(1)
}

handler(args)
```

**Step 2: Verify it works with tsx**

```bash
npx tsx src/cli.ts --help
npx tsx src/cli.ts setup
npx tsx src/cli.ts snapshot
```

**Step 3: Commit**

```bash
git add src/cli.ts
git commit -m "feat: add CLI entry point with subcommand dispatch"
```

---

### Task 4: Add tsup and update package.json for npm publishing

**Files:**
- Modify: `package.json`
- Create: `tsup.config.ts`

**Step 1: Install tsup and typescript**

```bash
pnpm add -D tsup typescript
```

**Step 2: Create tsup.config.ts**

```ts
import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/cli.ts"],
  format: "esm",
  target: "node18",
  banner: { js: "#!/usr/bin/env node" },
  clean: true,
})
```

**Step 3: Update package.json**

Replace current package.json with:

```json
{
  "name": "mobile-agent",
  "version": "1.0.0",
  "description": "Mobile app automation CLI for AI agents — works with any app on iOS Simulator or Android Emulator via Maestro",
  "license": "MIT",
  "type": "module",
  "bin": {
    "mobile-agent": "./dist/cli.js"
  },
  "files": [
    "dist",
    "SKILL.md",
    "references"
  ],
  "engines": {
    "node": ">=18"
  },
  "scripts": {
    "build": "tsup",
    "prepublishOnly": "tsup"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.0.0"
  }
}
```

Key changes: removed `"private": true`, added `bin`, `files`, `scripts.build`, `scripts.prepublishOnly`. Removed `tsx` from devDependencies.

**Step 4: Build and verify**

```bash
pnpm build
node dist/cli.js --help
node dist/cli.js setup
```

**Step 5: Commit**

```bash
git add package.json tsup.config.ts pnpm-lock.yaml dist/
git commit -m "feat: add tsup build and configure npm publishing"
```

---

### Task 5: Update SKILL.md for CLI usage

**Files:**
- Modify: `SKILL.md`

**Step 1: Update all command references**

Replace every `npx tsx scripts/X.ts` with `mobile-agent X` throughout SKILL.md.

Key changes:
- `allowed-tools: Bash(npx tsx:*)` → `allowed-tools: Bash(mobile-agent:*)`
- Setup: `npx tsx scripts/setup.ts` → `mobile-agent setup`
- Install Maestro section stays the same
- Add install instruction: `npm install -g mobile-agent`
- All command examples: `npx tsx scripts/snapshot.ts` → `mobile-agent snapshot`, etc.
- Example flow section: update all commands

**Step 2: Commit**

```bash
git add SKILL.md
git commit -m "docs: update SKILL.md for CLI usage"
```

---

### Task 6: Update README.md for CLI usage

**Files:**
- Modify: `README.md`

**Step 1: Update README**

- Installation section: `npm install -g mobile-agent`
- All command examples: use `mobile-agent <cmd>` instead of `npx tsx scripts/<cmd>.ts`
- Remove references to `tsx` as a user requirement
- Keep Maestro installation instructions as-is

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README for CLI usage"
```

---

### Task 7: Update REFERENCE.md

**Files:**
- Modify: `references/REFERENCE.md`

**Step 1: Update any command references**

If there are any `npx tsx scripts/...` references, update to `mobile-agent ...`.

**Step 2: Commit**

```bash
git add references/REFERENCE.md
git commit -m "docs: update REFERENCE.md for CLI usage"
```

---

### Task 8: End-to-end test the built CLI

**Step 1: Build**

```bash
pnpm build
```

**Step 2: Link globally for testing**

```bash
pnpm link --global
```

**Step 3: Test all commands**

```bash
mobile-agent --help
mobile-agent setup
mobile-agent snapshot
mobile-agent tap m1
mobile-agent scroll down
mobile-agent assert "some text on screen"
mobile-agent screenshot --output /tmp/test-screenshot.png
```

**Step 4: Unlink after testing**

```bash
pnpm unlink --global
```

---

### Task 9: Clean up old scripts/ directory references

**Files:**
- Modify: `.gitignore` (add `dist/` if not already there)
- Delete: `scripts/` directory (should be empty after Task 1)

**Step 1: Update .gitignore**

Add `dist/` to `.gitignore` so built files aren't committed.

**Step 2: Verify scripts/ is gone**

```bash
ls scripts/ 2>&1 || echo "scripts/ already removed"
```

**Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: add dist/ to gitignore and clean up"
```
