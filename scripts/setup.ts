import { runCommand, detectPlatform, fail } from "./utils.js"

function checkMaestro(): string {
  try {
    const version = runCommand("maestro --version")
    return version
  } catch {
    fail({
      code: "NO_MAESTRO",
      message: "Maestro CLI not found",
      suggestion: "Install: curl -Ls install.maestro.dev | bash",
    })
  }
}

function listDevices(platform: "ios" | "android"): string[] {
  if (platform === "ios") {
    const output = runCommand("xcrun simctl list devices booted")
    return output
      .split("\n")
      .filter((l) => l.includes("Booted"))
      .map((l) => l.trim().replace(/\s*\(Booted\).*/, ""))
  }
  const output = runCommand("adb devices")
  return output
    .split("\n")
    .filter((l) => l.includes("\tdevice"))
    .map((l) => l.split("\t")[0])
}

const maestroVersion = checkMaestro()
const platform = detectPlatform()
const devices = listDevices(platform)

console.log(`Maestro: ${maestroVersion}`)
console.log(`Platform: ${platform}`)
console.log(`Devices: ${devices.join(", ")}`)
console.log(`Status: READY`)
