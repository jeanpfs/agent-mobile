#!/usr/bin/env bash
# One-time setup for recording the agent-mobile demo. Prints the simulator UDID.
#
# Needs: Xcode command line tools, Maestro (curl -Ls install.maestro.dev | bash), Node, Claude Code, VHS, ffmpeg,
#        gifsicle, ImageMagick. It creates only objects prefixed "demo-agent-mobile".
#
# After it, create an isolated Claude Code config dir at /private/tmp/demo-agent-mobile-cc: no personal skills, hooks or
# status line, your credentials, and these allow rules so no permission prompt appears in the recording:
#   Skill, Bash(agent-mobile:*), Bash(maestro:*), Bash(xcrun simctl:*), Bash(which:*), Bash(ls:*), Bash(cat:*), Read
# Delete that dir when you are done (it holds a copy of your credentials).
set -euo pipefail

CLI_DIR=/private/tmp/demo-agent-mobile-cli
PROJ_DIR=/private/tmp/demo-agent-mobile-proj

# 1. The CLI in a private prefix (does not touch global npm). record.sh/agent.tape put its bin dir on PATH.
npm install --prefix "$CLI_DIR" "${AGENT_MOBILE_PKG:-maestro-agent-mobile@1.0.4}"

# 2. The skill, project-local, for Claude Code only.
mkdir -p "$PROJ_DIR"
mkdir -p "$PROJ_DIR/.claude/skills/agent-mobile"
cp "$CLI_DIR/node_modules/maestro-agent-mobile/SKILL.md" "$PROJ_DIR/.claude/skills/agent-mobile/SKILL.md"

# 3. A throwaway simulator: iPhone 17 Pro on the newest available iOS runtime.
DEVICE_TYPE="${DEVICE_TYPE:-com.apple.CoreSimulator.SimDeviceType.iPhone-17-Pro}"
RUNTIME="${RUNTIME:-$(xcrun simctl list runtimes -j | python3 -c 'import json,sys; r=[x for x in json.load(sys.stdin)["runtimes"] if x["platform"]=="iOS" and x["isAvailable"]]; print(r[-1]["identifier"])')}"
UDID=$(xcrun simctl create demo-agent-mobile-iphone "$DEVICE_TYPE" "$RUNTIME")
xcrun simctl boot "$UDID"
xcrun simctl bootstatus "$UDID" -b >/dev/null
# Clean status bar (9:41, full bars) so the real time does not show in the recording.
xcrun simctl status_bar "$UDID" override --time 9:41 --batteryState charged --batteryLevel 100 --cellularBars 4 --wifiBars 3
echo "$UDID" > /private/tmp/demo-agent-mobile-udid
echo "simulator: $UDID"
echo "Cleanup: xcrun simctl delete $UDID; rm -rf $CLI_DIR $PROJ_DIR /private/tmp/demo-agent-mobile-cc /private/tmp/demo-agent-mobile-udid"
