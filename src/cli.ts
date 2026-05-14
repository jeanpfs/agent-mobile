import { run as setup } from "./commands/setup.js"
import { run as snapshot } from "./commands/snapshot.js"
import { run as tap } from "./commands/tap.js"
import { run as type } from "./commands/type.js"
import { run as scroll } from "./commands/scroll.js"
import { run as screenshot } from "./commands/screenshot.js"
import { run as assert } from "./commands/assert.js"
import { run as logs } from "./commands/logs.js"
import { fail } from "./utils.js"

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
  logs,
}

if (!command || command === "--help" || command === "-h") {
  console.log(`agent-mobile - Mobile app automation for AI agents

Usage: agent-mobile <command> [options]

Commands:
  setup                      Check Maestro, platform, and devices
  snapshot [--max N]          Capture UI accessibility tree
  tap <ref>                  Tap element by ref (e.g., m3)
  type <ref> "<text>"        Type text into element
  scroll [direction]         Scroll up/down/left/right (default: down)
  screenshot [--output path] Capture screen as PNG
  assert "<text>"            Verify text exists on screen
  logs start                 Start capturing device logs
  logs stop                  Stop capture and show logs

Examples:
  agent-mobile snapshot
  agent-mobile tap m4
  agent-mobile type m2 "user@example.com"
  agent-mobile assert "Welcome"`)
  process.exit(0)
}

const handler = commands[command]
if (!handler) {
  console.error(`Unknown command: ${command}`)
  console.error(`Run 'agent-mobile --help' for available commands`)
  process.exit(1)
}

try {
  handler(args)
} catch (e: any) {
  fail({
    code: "INTERNAL_ERROR",
    message: String(e?.message || e),
    suggestion: "This is an unexpected error. Re-run with the same arguments to reproduce, or report it.",
  })
}
