import { execSync } from "child_process"
import { existsSync, mkdirSync } from "fs"
import { join, dirname } from "path"
import { fail, succeed, parseArgs, detectPlatform } from "./utils.js"

const args = parseArgs(process.argv)
const platform = (args["platform"] as "ios" | "android") || detectPlatform()
const outputPath = args["output"] || join(process.cwd(), `screenshot-${Date.now()}.png`)

const outputDir = dirname(outputPath)
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true })
}

try {
  if (platform === "ios") {
    execSync(`xcrun simctl io booted screenshot "${outputPath}"`, {
      encoding: "utf-8",
      timeout: 15_000,
    })
  } else {
    execSync(`adb exec-out screencap -p > "${outputPath}"`, {
      encoding: "utf-8",
      timeout: 15_000,
      shell: "/bin/bash",
    })
  }

  if (!existsSync(outputPath)) {
    fail({
      code: "SCREENSHOT_FAILED",
      message: "Screenshot file was not created",
      suggestion: "Check that the simulator/emulator is running",
    })
  }

  succeed(`Screenshot saved to ${outputPath}`)
} catch (e: any) {
  fail({
    code: "SCREENSHOT_FAILED",
    message: `Failed to take screenshot: ${e.message}`,
    suggestion: "Ensure the simulator/emulator is running and responsive",
  })
}
