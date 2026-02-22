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
