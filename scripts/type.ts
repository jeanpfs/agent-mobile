import { runFlow, fail, succeed, parseArgs, detectPlatform, getHierarchy } from "./utils.js"

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

const rawJson = getHierarchy()
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
