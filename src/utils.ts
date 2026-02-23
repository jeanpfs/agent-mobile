import { execSync, ExecSyncOptions } from "child_process"
import { writeFileSync, readFileSync, unlinkSync, mkdtempSync, existsSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"

const SNAPSHOT_CACHE = join(tmpdir(), "agent-mobi-snapshot.json")

export interface MaestroError {
  code: string
  message: string
  suggestion: string
}

export function fail(error: MaestroError): never {
  console.error(`ERROR [${error.code}]: ${error.message}`)
  console.error(`Suggestion: ${error.suggestion}`)
  process.exit(1)
}

export function succeed(message: string): void {
  console.log(`OK: ${message}`)
}

export function runCommand(cmd: string, options?: ExecSyncOptions): string {
  try {
    const result = execSync(cmd, {
      encoding: "utf-8",
      timeout: 30_000,
      maxBuffer: 10 * 1024 * 1024,
      ...options,
    })
    return (result as string).trim()
  } catch (e: any) {
    if (e.status === 127) {
      fail({
        code: "NO_MAESTRO",
        message: "Maestro CLI not found in PATH",
        suggestion: "Install Maestro: curl -Ls install.maestro.dev | bash",
      })
    }
    throw e
  }
}

export function runFlow(yamlContent: string, device?: string): string {
  const dir = mkdtempSync(join(tmpdir(), "agent-mobi-"))
  const flowPath = join(dir, "flow.yaml")
  writeFileSync(flowPath, yamlContent, "utf-8")
  try {
    const deviceFlag = device ? `--device ${device}` : ""
    return runCommand(`maestro ${deviceFlag} test ${flowPath}`)
  } finally {
    try { unlinkSync(flowPath) } catch {}
  }
}

export function detectPlatform(): "ios" | "android" {
  try {
    const booted = runCommand("xcrun simctl list devices booted")
    if (booted.includes("Booted")) return "ios"
  } catch {}
  try {
    const devices = runCommand("adb devices")
    const lines = devices.split("\n").filter((l) => l.includes("\tdevice"))
    if (lines.length > 0) return "android"
  } catch {}
  fail({
    code: "NO_DEVICE",
    message: "No running iOS simulator or Android emulator found",
    suggestion: "Start a simulator/emulator with your app running, then retry",
  })
}

export function getHierarchy(): string {
  let raw: string
  try {
    raw = runCommand("maestro hierarchy")
  } catch (e: any) {
    fail({
      code: "HIERARCHY_FAILED",
      message: `Failed to get UI hierarchy: ${e.message}`,
      suggestion: "Ensure the app is running and responsive in the simulator/emulator",
    })
  }
  const jsonStart = raw.indexOf("{")
  if (jsonStart === -1) {
    fail({
      code: "PARSE_ERROR",
      message: "No JSON found in Maestro hierarchy output",
      suggestion: "Try running 'maestro hierarchy' manually to check the output",
    })
  }
  return raw.slice(jsonStart)
}

export interface HierarchyNode {
  attributes: Record<string, string>
  children?: HierarchyNode[]
}

export interface ParsedElement {
  role: string
  label: string
  ref: string
  depth: number
  node: HierarchyNode
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

function flattenTree(node: HierarchyNode, depth: number, elements: ParsedElement[], counter: { value: number }): void {
  if (!isVisible(node)) return

  const role = normalizeRole(node)
  const label = getLabel(node)

  if (role && label) {
    counter.value++
    elements.push({ role, label, ref: `m${counter.value}`, depth, node })
  }

  if (node.children) {
    for (const child of node.children) {
      flattenTree(child, depth + 1, elements, counter)
    }
  }
}

export function parseHierarchy(tree: HierarchyNode): ParsedElement[] {
  const elements: ParsedElement[] = []
  flattenTree(tree, 0, elements, { value: 0 })
  return elements
}

export function findByRef(elements: ParsedElement[], ref: string): ParsedElement | undefined {
  return elements.find((el) => el.ref === ref)
}

export function saveSnapshot(elements: ParsedElement[]): void {
  const data = elements.map(({ role, label, ref, depth, node }) => ({
    role, label, ref, depth,
    resourceId: node.attributes["resource-id"] || "",
  }))
  writeFileSync(SNAPSHOT_CACHE, JSON.stringify(data), "utf-8")
}

export interface CachedElement {
  role: string
  label: string
  ref: string
  depth: number
  resourceId: string
}

export function loadSnapshot(): CachedElement[] {
  if (!existsSync(SNAPSHOT_CACHE)) {
    fail({
      code: "NO_SNAPSHOT",
      message: "No snapshot cache found. Run snapshot first.",
      suggestion: "agent-mobi snapshot",
    })
  }
  return JSON.parse(readFileSync(SNAPSHOT_CACHE, "utf-8"))
}

export function findCachedByRef(ref: string): CachedElement {
  const elements = loadSnapshot()
  const match = elements.find((el) => el.ref === ref)
  if (!match) {
    fail({
      code: "INVALID_REF",
      message: `Ref ${ref} not found. Available: ${elements.map((e) => e.ref).join(", ")}`,
      suggestion: "Run snapshot again to get fresh refs.",
    })
  }
  return match
}

export function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {}
  const positional: string[] = []
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i]
    if (arg.startsWith("--")) {
      const key = arg.slice(2)
      const next = argv[i + 1]
      if (next && !next.startsWith("--")) {
        args[key] = next
        i++
      } else {
        args[key] = "true"
      }
    } else {
      positional.push(arg)
    }
  }
  positional.forEach((v, i) => (args[`_${i}`] = v))
  args._count = String(positional.length)
  return args
}
