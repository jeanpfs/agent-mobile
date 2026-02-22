# mobile-agent Skill Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a complete Agent Skill (for skills.sh) that enables AI agents to automate any mobile app on iOS/Android simulators via Maestro CLI, using accessibility tree snapshots with ref-based interactions.

**Architecture:** A skill directory with SKILL.md (agent instructions), TypeScript scripts (CLI actions run via `npx tsx`), and reference docs. Scripts wrap Maestro CLI commands — `maestro hierarchy` for snapshots (JSON output parsed into compact text with refs), and temporary YAML flow files for actions (tap, type, scroll). Each script is atomic, stateless, and outputs structured text.

**Tech Stack:** TypeScript, tsx (zero-config TS runner), Maestro CLI, Node.js child_process

---

### Task 1: Initialize project with package.json

**Files:**
- Create: `package.json`

**Step 1: Create package.json**

```json
{
  "name": "mobile-agent",
  "version": "1.0.0",
  "description": "AI agent skill for mobile app automation via Maestro",
  "license": "MIT",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=18"
  },
  "devDependencies": {
    "tsx": "^4.19.0"
  }
}
```

**Step 2: Install dependencies**

Run: `pnpm install`
Expected: `tsx` installed, `node_modules/` created, `pnpm-lock.yaml` generated

**Step 3: Commit**

```bash
git init && git add package.json pnpm-lock.yaml
git commit -m "chore: initialize project with tsx dependency"
```

---

### Task 2: Create shared utilities module

**Files:**
- Create: `scripts/utils.ts`

This module provides helpers used by all other scripts: error formatting, running Maestro commands, running temporary YAML flows, and detecting devices.

**Step 1: Create `scripts/utils.ts`**

```typescript
import { execSync, ExecSyncOptions } from "child_process"
import { writeFileSync, unlinkSync, mkdtempSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"

export interface MaestroError {
  code: string
  message: string
  suggestion: string
}

export function fail(error: MaestroError): never {
  console.error(`ERROR [${error.code}]: ${error.message}`)
  console.error(`Suggestion: ${error.suggestion}`)
  process.exit(1)
}

export function succeed(message: string): void {
  console.log(`OK: ${message}`)
}

export function runCommand(cmd: string, options?: ExecSyncOptions): string {
  try {
    return execSync(cmd, {
      encoding: "utf-8",
      timeout: 30_000,
      ...options,
    }).trim()
  } catch (e: any) {
    if (e.status === 127) {
      fail({
        code: "NO_MAESTRO",
        message: "Maestro CLI not found in PATH",
        suggestion: "Install Maestro: curl -Ls install.maestro.dev | bash",
      })
    }
    throw e
  }
}

export function runFlow(yamlContent: string, device?: string): string {
  const dir = mkdtempSync(join(tmpdir(), "mobile-agent-"))
  const flowPath = join(dir, "flow.yaml")
  writeFileSync(flowPath, yamlContent, "utf-8")
  try {
    const deviceFlag = device ? `--device ${device}` : ""
    return runCommand(`maestro ${deviceFlag} test ${flowPath}`)
  } finally {
    try { unlinkSync(flowPath) } catch {}
  }
}

export function detectPlatform(): "ios" | "android" {
  try {
    const booted = runCommand("xcrun simctl list devices booted")
    if (booted.includes("Booted")) return "ios"
  } catch {}
  try {
    const devices = runCommand("adb devices")
    const lines = devices.split("\n").filter((l) => l.includes("\tdevice"))
    if (lines.length > 0) return "android"
  } catch {}
  fail({
    code: "NO_DEVICE",
    message: "No running iOS simulator or Android emulator found",
    suggestion: "Start a simulator/emulator with your app running, then retry",
  })
}

export function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {}
  const positional: string[] = []
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i]
    if (arg.startsWith("--")) {
      const key = arg.slice(2)
      const next = argv[i + 1]
      if (next && !next.startsWith("--")) {
        args[key] = next
        i++
      } else {
        args[key] = "true"
      }
    } else {
      positional.push(arg)
    }
  }
  positional.forEach((v, i) => (args[`_${i}`] = v))
  args._count = String(positional.length)
  return args
}
```

**Step 2: Commit**

```bash
git add scripts/utils.ts
git commit -m "feat: add shared utilities module"
```

---

### Task 3: Create setup script

**Files:**
- Create: `scripts/setup.ts`

**Step 1: Create `scripts/setup.ts`**

```typescript
import { runCommand, detectPlatform, fail } from "./utils.js"

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

const maestroVersion = checkMaestro()
const platform = detectPlatform()
const devices = listDevices(platform)

console.log(`Maestro: ${maestroVersion}`)
console.log(`Platform: ${platform}`)
console.log(`Devices: ${devices.join(", ")}`)
console.log(`Status: READY`)
```

**Step 2: Test manually**

Run: `npx tsx scripts/setup.ts`
Expected (with simulator running): Output showing Maestro version, platform, devices, and `Status: READY`
Expected (no simulator): `ERROR [NO_DEVICE]: ...`

**Step 3: Commit**

```bash
git add scripts/setup.ts
git commit -m "feat: add setup script for dependency checking"
```

---

### Task 4: Create snapshot script (core feature)

**Files:**
- Create: `scripts/snapshot.ts`

This is the most important script. It runs `maestro hierarchy`, parses the JSON tree, and outputs a compact text representation with refs.

**Step 1: Create `scripts/snapshot.ts`**

```typescript
import { runCommand, detectPlatform, fail, parseArgs } from "./utils.js"

interface HierarchyNode {
  attributes: Record<string, string>
  children?: HierarchyNode[]
}

interface Element {
  role: string
  label: string
  ref: string
  depth: number
}

function normalizeRole(node: HierarchyNode): string | null {
  const attrs = node.attributes
  const cls = attrs["className"] || attrs["class"] || ""
  const clickable = attrs["clickable"] === "true"
  const resourceId = attrs["resource-id"] || ""
  const accessibilityRole = attrs["accessibilityRole"] || ""
  const role = attrs["role"] || ""

  if (accessibilityRole === "button" || role === "button" || (clickable && cls.toLowerCase().includes("button"))) return "button"
  if (accessibilityRole === "link" || role === "link") return "link"
  if (cls.toLowerCase().includes("edittext") || cls.toLowerCase().includes("textinput") || cls.toLowerCase().includes("textfield") || accessibilityRole === "textbox" || role === "textbox") return "textbox"
  if (cls.toLowerCase().includes("checkbox") || accessibilityRole === "checkbox" || role === "checkbox") return "checkbox"
  if (cls.toLowerCase().includes("switch") || accessibilityRole === "switch" || role === "switch") return "switch"
  if (cls.toLowerCase().includes("image") || accessibilityRole === "image" || role === "image") return "image"
  if (accessibilityRole === "header" || role === "header") return "header"

  const text = attrs["text"] || attrs["accessibilityText"] || attrs["label"] || ""
  if (text && clickable) return "button"
  if (text) return "text"

  return null
}

function getLabel(node: HierarchyNode): string {
  const attrs = node.attributes
  return (
    attrs["text"] ||
    attrs["accessibilityText"] ||
    attrs["accessibilityLabel"] ||
    attrs["label"] ||
    attrs["hintText"] ||
    attrs["placeholder"] ||
    attrs["content-desc"] ||
    ""
  ).trim()
}

function isVisible(node: HierarchyNode): boolean {
  const attrs = node.attributes
  if (attrs["visible"] === "false") return false
  if (attrs["enabled"] === "false") return false
  const bounds = attrs["bounds"]
  if (bounds) {
    const match = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/)
    if (match) {
      const [, x1, y1, x2, y2] = match.map(Number)
      if (x2 - x1 <= 0 || y2 - y1 <= 0) return false
    }
  }
  return true
}

function flattenTree(node: HierarchyNode, depth: number, elements: Element[], counter: { value: number }): void {
  if (!isVisible(node)) return

  const role = normalizeRole(node)
  const label = getLabel(node)

  if (role && label) {
    counter.value++
    elements.push({
      role,
      label,
      ref: `m${counter.value}`,
      depth,
    })
  }

  if (node.children) {
    for (const child of node.children) {
      flattenTree(child, depth + 1, elements, counter)
    }
  }
}

function formatSnapshot(elements: Element[], maxElements: number): string {
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

const args = parseArgs(process.argv)
const platform = (args["platform"] as "ios" | "android") || detectPlatform()
const maxElements = parseInt(args["max"] || "50", 10)

let rawJson: string
try {
  rawJson = runCommand("maestro hierarchy")
} catch (e: any) {
  fail({
    code: "HIERARCHY_FAILED",
    message: `Failed to get UI hierarchy: ${e.message}`,
    suggestion: "Ensure the app is running and responsive in the simulator/emulator",
  })
}

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

const elements: Element[] = []
flattenTree(tree, 0, elements, { value: 0 })

if (elements.length === 0) {
  console.log("Screen: (empty or no accessible elements)")
  console.log("\nNo interactive elements found. The app may lack accessibility labels.")
} else {
  console.log(`Screen: (${elements.length} elements)\n`)
  console.log(formatSnapshot(elements, maxElements))
}
```

**Step 2: Test manually**

Run: `npx tsx scripts/snapshot.ts`
Expected (with app running): Text output with elements and refs like `- button "Login" [ref=m1]`

**Step 3: Commit**

```bash
git add scripts/snapshot.ts
git commit -m "feat: add snapshot script with accessibility tree parsing"
```

---

### Task 5: Create tap script

**Files:**
- Create: `scripts/tap.ts`

**Step 1: Create `scripts/tap.ts`**

Maestro uses YAML flow files for actions. The tap script generates a temporary flow that taps by `text` or `id` extracted from the last snapshot. Since refs are abstract, the script re-runs `maestro hierarchy` to resolve the ref to the actual element attributes, then taps using those.

```typescript
import { runCommand, runFlow, fail, succeed, parseArgs, detectPlatform } from "./utils.js"

interface HierarchyNode {
  attributes: Record<string, string>
  children?: HierarchyNode[]
}

function findElementByRef(node: HierarchyNode, targetRef: number, counter: { value: number }): HierarchyNode | null {
  const attrs = node.attributes
  const hasLabel =
    attrs["text"] || attrs["accessibilityText"] || attrs["accessibilityLabel"] ||
    attrs["label"] || attrs["content-desc"] || ""

  const visible = attrs["visible"] !== "false" && attrs["enabled"] !== "false"
  if (!visible) return null

  const role = attrs["clickable"] === "true" || attrs["accessibilityRole"] || attrs["role"] || ""
  if (hasLabel.trim() && (role || hasLabel.trim())) {
    counter.value++
    if (counter.value === targetRef) return node
  }

  if (node.children) {
    for (const child of node.children) {
      const found = findElementByRef(child, targetRef, counter)
      if (found) return found
    }
  }
  return null
}

const args = parseArgs(process.argv)
const refArg = args["_0"]

if (!refArg) {
  fail({
    code: "MISSING_ARG",
    message: "No ref provided",
    suggestion: "Usage: npx tsx scripts/tap.ts <ref> (e.g., m3)",
  })
}

const refNum = parseInt(refArg.replace("m", ""), 10)
if (isNaN(refNum)) {
  fail({
    code: "INVALID_REF",
    message: `Invalid ref format: ${refArg}`,
    suggestion: "Refs should be like m1, m2, m3. Run snapshot first.",
  })
}

detectPlatform()

let rawJson: string
try {
  rawJson = runCommand("maestro hierarchy")
} catch (e: any) {
  fail({
    code: "HIERARCHY_FAILED",
    message: `Cannot resolve ref: ${e.message}`,
    suggestion: "Ensure the app is running",
  })
}

const tree: HierarchyNode = JSON.parse(rawJson)
const element = findElementByRef(tree, refNum, { value: 0 })

if (!element) {
  fail({
    code: "INVALID_REF",
    message: `Ref ${refArg} not found in current UI`,
    suggestion: "UI may have changed. Run snapshot again to get fresh refs.",
  })
}

const attrs = element.attributes
const text = attrs["text"] || attrs["accessibilityText"] || attrs["accessibilityLabel"] || attrs["label"] || attrs["content-desc"] || ""
const resourceId = attrs["resource-id"] || ""

let selector: string
if (resourceId) {
  selector = `\n    id: "${resourceId}"`
} else if (text) {
  selector = ` "${text}"`
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
  succeed(`Tapped ${refArg} (${text || resourceId})`)
} catch (e: any) {
  fail({
    code: "TAP_FAILED",
    message: `Failed to tap ${refArg}: ${e.message}`,
    suggestion: "Element may not be tappable or visible. Try scrolling or re-snapshot.",
  })
}
```

**Step 2: Test manually**

Run: `npx tsx scripts/tap.ts m1`
Expected: `OK: Tapped m1 (Login)` or appropriate error

**Step 3: Commit**

```bash
git add scripts/tap.ts
git commit -m "feat: add tap script with ref resolution"
```

---

### Task 6: Create type script

**Files:**
- Create: `scripts/type.ts`

**Step 1: Create `scripts/type.ts`**

The type script taps the target field first (to focus it), then inputs text.

```typescript
import { runCommand, runFlow, fail, succeed, parseArgs, detectPlatform } from "./utils.js"

interface HierarchyNode {
  attributes: Record<string, string>
  children?: HierarchyNode[]
}

function findElementByRef(node: HierarchyNode, targetRef: number, counter: { value: number }): HierarchyNode | null {
  const attrs = node.attributes
  const hasLabel =
    attrs["text"] || attrs["accessibilityText"] || attrs["accessibilityLabel"] ||
    attrs["label"] || attrs["content-desc"] || ""
  const visible = attrs["visible"] !== "false" && attrs["enabled"] !== "false"
  if (!visible) return null

  if (hasLabel.trim()) {
    counter.value++
    if (counter.value === targetRef) return node
  }

  if (node.children) {
    for (const child of node.children) {
      const found = findElementByRef(child, targetRef, counter)
      if (found) return found
    }
  }
  return null
}

const args = parseArgs(process.argv)
const refArg = args["_0"]
const text = args["_1"]

if (!refArg || !text) {
  fail({
    code: "MISSING_ARG",
    message: "Missing ref or text",
    suggestion: 'Usage: npx tsx scripts/type.ts <ref> "<text>" (e.g., m2 "hello@test.com")',
  })
}

const refNum = parseInt(refArg.replace("m", ""), 10)
if (isNaN(refNum)) {
  fail({
    code: "INVALID_REF",
    message: `Invalid ref format: ${refArg}`,
    suggestion: "Refs should be like m1, m2, m3. Run snapshot first.",
  })
}

detectPlatform()

let rawJson: string
try {
  rawJson = runCommand("maestro hierarchy")
} catch (e: any) {
  fail({
    code: "HIERARCHY_FAILED",
    message: `Cannot resolve ref: ${e.message}`,
    suggestion: "Ensure the app is running",
  })
}

const tree: HierarchyNode = JSON.parse(rawJson)
const element = findElementByRef(tree, refNum, { value: 0 })

if (!element) {
  fail({
    code: "INVALID_REF",
    message: `Ref ${refArg} not found in current UI`,
    suggestion: "UI may have changed. Run snapshot again to get fresh refs.",
  })
}

const attrs = element.attributes
const label = attrs["text"] || attrs["accessibilityText"] || attrs["accessibilityLabel"] || attrs["label"] || attrs["content-desc"] || ""
const resourceId = attrs["resource-id"] || ""

let tapSelector: string
if (resourceId) {
  tapSelector = `\n    id: "${resourceId}"`
} else if (label) {
  tapSelector = ` "${label}"`
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
  succeed(`Typed "${text}" into ${refArg} (${label || resourceId})`)
} catch (e: any) {
  fail({
    code: "TYPE_FAILED",
    message: `Failed to type into ${refArg}: ${e.message}`,
    suggestion: "Element may not be a text input. Check snapshot for correct ref.",
  })
}
```

**Step 2: Test manually**

Run: `npx tsx scripts/type.ts m2 "hello@test.com"`
Expected: `OK: Typed "hello@test.com" into m2 (Email)`

**Step 3: Commit**

```bash
git add scripts/type.ts
git commit -m "feat: add type script for text input"
```

---

### Task 7: Create scroll script

**Files:**
- Create: `scripts/scroll.ts`

**Step 1: Create `scripts/scroll.ts`**

```typescript
import { runFlow, fail, succeed, parseArgs, detectPlatform } from "./utils.js"

const VALID_DIRECTIONS = ["up", "down", "left", "right"] as const
type Direction = (typeof VALID_DIRECTIONS)[number]

const args = parseArgs(process.argv)
const direction = (args["_0"] || "down").toLowerCase() as Direction

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
```

**Step 2: Test manually**

Run: `npx tsx scripts/scroll.ts down`
Expected: `OK: Scrolled down`

**Step 3: Commit**

```bash
git add scripts/scroll.ts
git commit -m "feat: add scroll script"
```

---

### Task 8: Create screenshot script

**Files:**
- Create: `scripts/screenshot.ts`

**Step 1: Create `scripts/screenshot.ts`**

```typescript
import { execSync } from "child_process"
import { existsSync, mkdirSync } from "fs"
import { join, dirname } from "path"
import { fail, succeed, parseArgs, detectPlatform } from "./utils.js"

const args = parseArgs(process.argv)
const platform = (args["platform"] as "ios" | "android") || detectPlatform()
const outputPath = args["output"] || join(process.cwd(), `screenshot-${Date.now()}.png`)

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
```

**Step 2: Test manually**

Run: `npx tsx scripts/screenshot.ts`
Expected: `OK: Screenshot saved to /path/to/screenshot-<timestamp>.png`

**Step 3: Commit**

```bash
git add scripts/screenshot.ts
git commit -m "feat: add screenshot script"
```

---

### Task 9: Create assert script

**Files:**
- Create: `scripts/assert.ts`

**Step 1: Create `scripts/assert.ts`**

```typescript
import { runCommand, fail, parseArgs, detectPlatform } from "./utils.js"

interface HierarchyNode {
  attributes: Record<string, string>
  children?: HierarchyNode[]
}

function collectTexts(node: HierarchyNode, texts: string[]): void {
  const attrs = node.attributes
  const visible = attrs["visible"] !== "false"
  if (!visible) return

  const candidates = [
    attrs["text"],
    attrs["accessibilityText"],
    attrs["accessibilityLabel"],
    attrs["label"],
    attrs["content-desc"],
  ]
  for (const t of candidates) {
    if (t && t.trim()) texts.push(t.trim())
  }

  if (node.children) {
    for (const child of node.children) {
      collectTexts(child, texts)
    }
  }
}

const args = parseArgs(process.argv)
const expectedText = args["_0"]

if (!expectedText) {
  fail({
    code: "MISSING_ARG",
    message: "No text to assert",
    suggestion: 'Usage: npx tsx scripts/assert.ts "<expected text>"',
  })
}

detectPlatform()

let rawJson: string
try {
  rawJson = runCommand("maestro hierarchy")
} catch (e: any) {
  fail({
    code: "HIERARCHY_FAILED",
    message: `Cannot read UI: ${e.message}`,
    suggestion: "Ensure the app is running",
  })
}

const tree: HierarchyNode = JSON.parse(rawJson)
const texts: string[] = []
collectTexts(tree, texts)

const found = texts.some((t) => t.toLowerCase().includes(expectedText.toLowerCase()))

if (found) {
  console.log(`PASS: Found "${expectedText}" on screen`)
} else {
  console.log(`FAIL: "${expectedText}" not found on screen`)
  console.log(`Visible texts: ${texts.slice(0, 20).join(", ")}`)
  process.exit(1)
}
```

**Step 2: Test manually**

Run: `npx tsx scripts/assert.ts "Login"`
Expected: `PASS: Found "Login" on screen` or `FAIL: ...`

**Step 3: Commit**

```bash
git add scripts/assert.ts
git commit -m "feat: add assert script for text validation"
```

---

### Task 10: Create SKILL.md

**Files:**
- Create: `SKILL.md`

**Step 1: Create `SKILL.md`**

The SKILL.md must follow the Agent Skills spec (agentskills.io). Frontmatter with name + description, body with agent instructions. Under 500 lines. References in separate files.

```markdown
---
name: mobile-agent
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
allowed-tools: Bash(npx tsx:*)
---

# mobile-agent

Automate any mobile app running in an iOS Simulator or Android Emulator. You interact with apps through accessibility tree snapshots (compact text with element refs) and deterministic actions (tap, type, scroll).

## Prerequisites

Before using any command, verify the environment:

` ``bash
npx tsx scripts/setup.ts
` ``

This checks: Maestro CLI installed, simulator/emulator running, app accessible. If it fails, follow the error suggestions.

**Install Maestro** (if missing):
` ``bash
curl -Ls install.maestro.dev | bash
` ``

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

` ``bash
npx tsx scripts/snapshot.ts [--platform ios|android] [--max 50]
` ``

Returns a compact text representation of the screen:

` ``
Screen: (12 elements)

- header "Welcome" [ref=m1]
- textbox "Email" [ref=m2]
- textbox "Password" [ref=m3]
- button "Sign In" [ref=m4]
- link "Forgot password?" [ref=m5]
- text "Don't have an account?" [ref=m6]
- button "Sign Up" [ref=m7]
` ``

Each `[ref=mN]` is a unique identifier for that element, valid only for this snapshot.

### tap — Tap an element

` ``bash
npx tsx scripts/tap.ts <ref>
` ``

Example: `npx tsx scripts/tap.ts m4` taps the "Sign In" button.

### type — Type text into a field

` ``bash
npx tsx scripts/type.ts <ref> "<text>"
` ``

Example: `npx tsx scripts/type.ts m2 "user@example.com"` types into the Email field.

The script taps the field first to focus it, then inputs the text.

### scroll — Scroll the screen

` ``bash
npx tsx scripts/scroll.ts <direction>
` ``

Directions: `up`, `down`, `left`, `right`. Default: `down`.

Use scroll when elements aren't visible in the current snapshot.

### screenshot — Capture screen image

` ``bash
npx tsx scripts/screenshot.ts [--output path.png]
` ``

Saves a PNG screenshot. Use for visual verification when text snapshot isn't sufficient.

### assert — Verify text on screen

` ``bash
npx tsx scripts/assert.ts "<expected text>"
` ``

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

` ``bash
# 1. Check environment
npx tsx scripts/setup.ts

# 2. Capture initial state
npx tsx scripts/snapshot.ts

# 3. Type email
npx tsx scripts/type.ts m2 "test@example.com"

# 4. Type password
npx tsx scripts/type.ts m3 "password123"

# 5. Tap login button
npx tsx scripts/tap.ts m4

# 6. Verify result
npx tsx scripts/snapshot.ts
npx tsx scripts/assert.ts "Welcome"
` ``

See [references/REFERENCE.md](references/REFERENCE.md) for detailed technical documentation.
```

**Step 2: Verify line count is under 500**

Run: `wc -l SKILL.md`
Expected: Under 500 lines

**Step 3: Commit**

```bash
git add SKILL.md
git commit -m "feat: add SKILL.md with agent instructions"
```

---

### Task 11: Create references/REFERENCE.md

**Files:**
- Create: `references/REFERENCE.md`

**Step 1: Create `references/REFERENCE.md`**

```markdown
# mobile-agent Technical Reference

## Maestro Hierarchy JSON Format

`maestro hierarchy` returns a nested JSON tree. Each node has:

` ``json
{
  "attributes": {
    "text": "Login",
    "accessibilityText": "",
    "hintText": "",
    "resource-id": "com.app:id/login_btn",
    "clickable": "true",
    "bounds": "[100,200][300,260]",
    "enabled": "true",
    "focused": "false",
    "checked": "false",
    "selected": "false",
    "className": "android.widget.Button",
    "visible": "true"
  },
  "children": []
}
` ``

## Role Normalization

The snapshot script maps raw attributes to normalized roles:

| Raw attribute / class | Normalized role |
|-----------------------|----------------|
| `clickable=true` + text | button |
| `EditText`, `TextInput`, `TextField` | textbox |
| `accessibilityRole=link` | link |
| `CheckBox` class | checkbox |
| `Switch` class | switch |
| `ImageView` or `accessibilityRole=image` | image |
| `accessibilityRole=header` | header |
| Has text, not clickable | text |

## Ref Assignment

Refs are assigned sequentially (m1, m2, m3...) by depth-first traversal. They are ephemeral — valid only for the snapshot in which they were assigned. Any UI change (navigation, animation, user input) invalidates all refs.

## Platform-Specific Notes

### iOS Simulator
- Device detection: `xcrun simctl list devices booted`
- Screenshots: `xcrun simctl io booted screenshot <path>`
- Hierarchy: `maestro hierarchy` (auto-detects booted simulator)

### Android Emulator
- Device detection: `adb devices`
- Screenshots: `adb exec-out screencap -p > <path>`
- Hierarchy: `maestro hierarchy` (auto-detects connected device)

## Troubleshooting

### No elements in snapshot
- App may lack accessibility labels
- For React Native: add `accessibilityLabel` props
- For Flutter: use `Semantics` widget
- For native: use `contentDescription` (Android) or `accessibilityLabel` (iOS)

### Refs not matching after action
- Expected behavior. Always re-snapshot after any action.
- Animations may cause transient states. Wait 1-2 seconds before snapshot.

### Maestro timeout
- Default timeout is 30 seconds
- Heavy apps may need more time on first launch
- Ensure the emulator has enough RAM allocated

### Multiple devices connected
- Maestro auto-selects the first available device
- To target specific device: run scripts with `--device <id>` flag support (future)
```

**Step 2: Commit**

```bash
mkdir -p references && git add references/REFERENCE.md
git commit -m "docs: add technical reference"
```

---

### Task 12: Create .gitignore and finalize repo

**Files:**
- Create: `.gitignore`

**Step 1: Create `.gitignore`**

```
node_modules/
*.png
.DS_Store
```

**Step 2: Final commit**

```bash
git add .gitignore
git commit -m "chore: add gitignore and finalize project structure"
```

---

### Task 13: Validate skill structure

**Step 1: Verify directory structure**

Run: `find . -not -path './node_modules/*' -not -path './.git/*' -not -name '.DS_Store' | sort`

Expected:
```
.
./SKILL.md
./package.json
./pnpm-lock.yaml
./scripts/assert.ts
./scripts/screenshot.ts
./scripts/scroll.ts
./scripts/setup.ts
./scripts/snapshot.ts
./scripts/tap.ts
./scripts/type.ts
./scripts/utils.ts
./references/REFERENCE.md
./PRD.md
./docs/plans/2026-02-22-mobile-agent-skill-design.md
./.gitignore
```

**Step 2: Verify SKILL.md frontmatter is valid**

Run: `head -20 SKILL.md`
Expected: Valid YAML frontmatter with `name: mobile-agent` and `description`

**Step 3: Verify name matches directory**

The `name` field in SKILL.md frontmatter must match the parent directory name. Our directory is `mobile-agent` and name is `mobile-agent`. ✓

**Step 4: Test setup script runs**

Run: `npx tsx scripts/setup.ts`
Expected: Either status output or a clear error message
