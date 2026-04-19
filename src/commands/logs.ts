import { spawn } from "child_process"
import { existsSync, readFileSync, writeFileSync, unlinkSync, openSync, closeSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"
import { fail, succeed, detectPlatform } from "../utils.js"

const LOGS_FILE = join(tmpdir(), "agent-mobi-logs.txt")
const PID_FILE = join(tmpdir(), "agent-mobi-logs.pid")
const MAX_LINES = 200

function startLogs() {
  if (existsSync(PID_FILE)) {
    const existingPid = readFileSync(PID_FILE, "utf-8").trim()
    try {
      process.kill(parseInt(existingPid), 0)
      fail({
        code: "LOGS_ALREADY_RUNNING",
        message: "Log capture is already running",
        suggestion: "Run 'agent-mobi logs stop' first to get the captured logs",
      })
    } catch {
      try { unlinkSync(PID_FILE) } catch {}
      try { unlinkSync(LOGS_FILE) } catch {}
    }
  }

  const platform = detectPlatform()

  let cmd: string
  let args: string[]
  if (platform === "ios") {
    cmd = "xcrun"
    args = ["simctl", "spawn", "booted", "log", "stream", "--level", "debug", "--style", "compact"]
  } else {
    cmd = "adb"
    args = ["logcat", "-v", "time"]
  }

  const out = openSync(LOGS_FILE, "w")
  const child = spawn(cmd, args, {
    detached: true,
    stdio: ["ignore", out, out],
  })

  child.on("error", (err) => {
    try { closeSync(out) } catch {}
    try { unlinkSync(LOGS_FILE) } catch {}
    fail({
      code: "LOGS_SPAWN_FAILED",
      message: `Failed to start log capture: ${err.message}`,
      suggestion: platform === "ios"
        ? "Ensure 'xcrun' is available (install Xcode command line tools)"
        : "Ensure 'adb' is available (install Android platform-tools)",
    })
  })

  child.unref()
  closeSync(out)
  writeFileSync(PID_FILE, String(child.pid), "utf-8")
  succeed(`Log capture started (${platform}, PID ${child.pid}). Run 'agent-mobi logs stop' to view logs.`)
}

function stopLogs() {
  if (!existsSync(PID_FILE)) {
    fail({
      code: "LOGS_NOT_RUNNING",
      message: "No log capture is running",
      suggestion: "Run 'agent-mobi logs start' first",
    })
  }

  const pid = parseInt(readFileSync(PID_FILE, "utf-8").trim())

  try {
    process.kill(pid, "SIGTERM")
  } catch {}

  const waiter = new Int32Array(new SharedArrayBuffer(4))
  const deadline = Date.now() + 500
  while (Date.now() < deadline) {
    try {
      process.kill(pid, 0)
    } catch {
      break
    }
    Atomics.wait(waiter, 0, 0, 50)
  }

  try { unlinkSync(PID_FILE) } catch {}

  if (!existsSync(LOGS_FILE)) {
    console.log("(no logs captured)")
    return
  }

  const content = readFileSync(LOGS_FILE, "utf-8")
  try { unlinkSync(LOGS_FILE) } catch {}

  const lines = content.split("\n").filter((l) => l.trim())

  if (lines.length === 0) {
    console.log("(no logs captured)")
    return
  }

  if (lines.length > MAX_LINES) {
    console.log(`Logs: (showing last ${MAX_LINES} of ${lines.length} lines)\n`)
    console.log(lines.slice(-MAX_LINES).join("\n"))
  } else {
    console.log(`Logs: (${lines.length} lines)\n`)
    console.log(lines.join("\n"))
  }
}

export function run(args: string[]) {
  const subcommand = args[0]

  if (subcommand === "start") {
    startLogs()
  } else if (subcommand === "stop") {
    stopLogs()
  } else {
    fail({
      code: "INVALID_SUBCOMMAND",
      message: `Unknown logs subcommand: ${subcommand || "(none)"}`,
      suggestion: "Usage: agent-mobi logs start | agent-mobi logs stop",
    })
  }
}
