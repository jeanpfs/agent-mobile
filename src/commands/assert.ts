import { fail, parseArgs, detectPlatform, getHierarchy, parseHierarchy } from "../utils.js"
import type { HierarchyNode } from "../utils.js"

export function run(args: string[]) {
  const parsed = parseArgs(args)
  const expectedText = parsed["_0"]

  if (!expectedText) {
    fail({
      code: "MISSING_ARG",
      message: "No text to assert",
      suggestion: 'Usage: agent-mobile assert "<expected text>"',
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
