#!/bin/sh
# usage: sh sheet.sh <promo id> <s1,s2,...>  -> out/stills/sheet-p<id>.png (3 per row, 360x640 each)
cd "$(dirname "$0")" && node render.mjs --only "$1" --stills "$2" 2>&1 | grep -v "^still\|^page ready" | grep -v "^\s*at " | tail -5
set -- "$1" "$2"; files=""; n=0
for t in $(echo "$2" | tr ',' ' '); do f=$(printf "out/stills/p%s-%.2fs.png" "$1" "$t"); files="$files -i $f"; n=$((n+1)); done
rows=$(( (n + 2) / 3 ))
ffmpeg -y -loglevel error $files -filter_complex "concat=n=$n:v=1:a=0,scale=360:640,tile=3x$rows" -frames:v 1 "out/stills/sheet-p$1.png" && echo "out/stills/sheet-p$1.png"
