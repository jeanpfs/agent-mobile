import { detectPlatform, fail, parseArgs, getHierarchy, parseHierarchy, saveSnapshot } from "./utils.js"
import type { HierarchyNode, ParsedElement } from "./utils.js"

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

const args = parseArgs(process.argv)
if (!args["platform"]) detectPlatform()
const maxElements = parseInt(args["max"] || "50", 10)

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
