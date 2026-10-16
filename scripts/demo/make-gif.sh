#!/usr/bin/env bash
# Composes the README demo GIF from one take made by record-take.sh: terminal (session.mp4) | phone (phone.mp4),
# with ONE speed ramp applied to both panes. The phone video is time-aligned through offset.txt and its last
# frame is held (simctl only writes frames when the screen changes).
# Usage: make-gif.sh <take-dir> <out.gif>
# Env: RAMP = "start:end:speed ..." in terminal-session seconds (default below, tuned for a ~115 s take:
#   typing 2.5x, waiting 7x, 1.5-2x around the Appearance tap and the Dark flip, final answer at 1x).
# Needs ffmpeg, ffprobe, gifsicle.
set -euo pipefail
TAKE="$(cd "$1" && pwd)"; OUT="$2"
RAMP="${RAMP:-0:11.5:2.5 11.5:49:7 49:60:2 60:77:7 77:89:2 89:101:6 101:109.4:4 109.4:END:1}"
OFFSET="$(cat "$TAKE/offset.txt")"
D="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$TAKE/session.mp4")"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
FG=""; N=0; LABELS=""
for r in $RAMP; do
  IFS=: read -r s e v <<<"$r"; [ "$e" = END ] && e="$D"
  ps="$(python3 -c "print(round($OFFSET+$s,3))")"; pe="$(python3 -c "print(round($OFFSET+$e,3))")"
  FG+="[0:v]trim=start=$s:end=$e,setpts=(PTS-STARTPTS)/$v,fps=12,scale=940:720,setsar=1,format=rgb24[t$N];"
  FG+="[1:v]tpad=stop_mode=clone:stop_duration=60,trim=start=$ps:end=$pe,setpts=(PTS-STARTPTS)/$v,fps=12,scale=-2:720,setsar=1,format=rgb24,pad=332:720:(332-iw)/2:0:color=0x181825[p$N];"
  FG+="[t$N][p$N]hstack=inputs=2,setsar=1[s$N];"
  LABELS+="[s$N]"; N=$((N+1))
done
FG+="${LABELS}concat=n=$N:v=1:a=0,scale=1000:-2:flags=lanczos,fps=12[out]"
ffmpeg -v error -y -i "$TAKE/session.mp4" -i "$TAKE/phone.mp4" -filter_complex "$FG" \
  -map "[out]" -c:v libx264 -crf 12 -preset slow -pix_fmt yuv420p "$WORK/composed.mp4"
ffmpeg -v error -y -i "$WORK/composed.mp4" -vf "palettegen=stats_mode=full" "$WORK/palette.png"
ffmpeg -v error -y -i "$WORK/composed.mp4" -i "$WORK/palette.png" -lavfi "paletteuse=dither=sierra2_4a" -r 12 "$WORK/raw.gif"
gifsicle -O3 --lossy=25 "$WORK/raw.gif" -o "$OUT"
ls -l "$OUT"; ffprobe -v error -show_entries stream=width,height -of csv=p=0 "$OUT"
ffprobe -v error -show_entries format=duration -of csv=p=0 "$WORK/composed.mp4"
