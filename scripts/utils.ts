import { execSync, ExecSyncOptions } from "child_process"
import { writeFileSync, unlinkSync, mkdtempSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"

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
  const dir = mkdtempSync(join(tmpdir(), "mobile-agent-"))
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
