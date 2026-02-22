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
