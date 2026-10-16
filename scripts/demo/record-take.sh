#!/usr/bin/env bash
# One take: records the simulator and the VHS terminal session in a single run.
# Usage: record-take.sh <take-dir>   -> <take-dir>/{phone.mp4,session.mp4,offset.txt}
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
TAKE="${1:?take dir}"; mkdir -p "$TAKE"; TAKE="$(cd "$TAKE" && pwd)"
UDID="$(cat /private/tmp/demo-agent-mobile-udid)"
xcrun simctl ui "$UDID" appearance light
xcrun simctl terminate "$UDID" com.apple.Preferences 2>/dev/null; xcrun simctl launch "$UDID" com.apple.springboard >/dev/null 2>&1; sleep 2
xcrun simctl launch "$UDID" com.apple.Preferences >/dev/null; sleep 14
xcrun simctl io "$UDID" recordVideo --codec=h264 --force "$TAKE/phone.mp4" >"$TAKE/rec.log" 2>&1 &
REC=$!
sleep 2
P=$(python3 -c 'import time;print(f"{time.time():.3f}")')
rm -f /private/tmp/demo-agent-mobile-vhs-start; cp "$HERE/agent.tape" "$TAKE/agent.tape"
(cd "$TAKE" && vhs agent.tape >vhs.log 2>&1); VRC=$?
kill -INT "$REC" 2>/dev/null; wait "$REC" 2>/dev/null
T=$(cat /private/tmp/demo-agent-mobile-vhs-start)
python3 -c "print(round($T+0.8-$P,3))" > "$TAKE/offset.txt"
echo "vhs rc=$VRC offset=$(cat "$TAKE/offset.txt")"
for f in session phone; do echo "$f: $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$TAKE/$f.mp4") s"; done
