import { runFlow, fail, succeed, parseArgs, detectPlatform, findCachedByRef, escapeYamlString } from "../utils.js"

export function run(args: string[]) {
  const parsed = parseArgs(args)
  const refArg = parsed["_0"]
  const text = parsed["_1"]

  if (!refArg || !text) {
    fail({
      code: "MISSING_ARG",
      message: "Missing ref or text",
      suggestion: 'Usage: agent-mobile type <ref> "<text>" (e.g., m2 "hello@test.com")',
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

  let tapSelector: string
  if (match.resourceId) {
    tapSelector = `\n    id: "${escapeYamlString(match.resourceId)}"`
  } else if (match.label) {
    tapSelector = ` "${escapeYamlString(match.label)}"`
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
- eraseText: 100
- inputText: "${escapeYamlString(text)}"
`

  try {
    runFlow(flow)
    succeed(`Typed "${text}" into ${refArg} (${match.role} "${match.label}")`)
  } catch (e: any) {
    fail({
      code: "TYPE_FAILED",
      message: `Failed to type into ${refArg}: ${e.message}`,
      suggestion: "Element may not be a text input. Check snapshot for correct ref.",
    })
  }
}
