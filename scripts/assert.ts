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
