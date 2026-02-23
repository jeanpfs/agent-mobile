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
  setup                      Check Maestro, platform, and devices
  snapshot [--max N]          Capture UI accessibility tree
  tap <ref>                  Tap element by ref (e.g., m3)
  type <ref> "<text>"        Type text into element
  scroll [direction]         Scroll up/down/left/right (default: down)
  screenshot [--output path] Capture screen as PNG
  assert "<text>"            Verify text exists on screen

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
