import { runFlow, fail, succeed, parseArgs, detectPlatform, findCachedByRef } from "../utils.js"

export function run(args: string[]) {
  const parsed = parseArgs(["", "", ...args])
  const refArg = parsed["_0"]

  if (!refArg) {
    fail({
      code: "MISSING_ARG",
      message: "No ref provided",
      suggestion: "Usage: agent-mobile tap <ref> (e.g., m3)",
    })
  }

  if (!/^m\d+$/.test(refArg)) {
    fail({
      code: "INVALID_REF",
      message: `Invalid ref format: ${refArg}`,
      suggestion: "Refs should be like m1, m2, m3. Run snapshot first.",
    })
  }

  detectPlatform()
  const match = findCachedByRef(refArg)

  let selector: string
  if (match.resourceId) {
    selector = `\n    id: "${match.resourceId}"`
  } else if (match.label) {
    selector = ` "${match.label}"`
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
    succeed(`Tapped ${refArg} (${match.role} "${match.label}")`)
  } catch (e: any) {
    fail({
      code: "TAP_FAILED",
      message: `Failed to tap ${refArg}: ${e.message}`,
      suggestion: "Element may not be tappable or visible. Try scrolling or re-snapshot.",
    })
  }
}
