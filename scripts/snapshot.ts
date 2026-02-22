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
if (!args["platform"]) detectPlatform()
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
