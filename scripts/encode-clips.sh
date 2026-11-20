#!/usr/bin/env bash
# Turn generated originals (Canva / Higgsfield) into light web loops for the field guide.
#   brand-refs/video/clips/<id>.mp4  ->  public/media/field-guide/<id>.mp4 (+ .jpg poster, + .webm if smaller)
# Usage: bash scripts/encode-clips.sh retrieval agents ...   (no args = every original found)
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=brand-refs/video/clips
OUT=public/media/field-guide
mkdir -p "$OUT"
ids=("$@")
if [ ${#ids[@]} -eq 0 ]; then
  for f in "$SRC"/*.mp4; do ids+=("$(basename "$f" .mp4)"); done
fi
for id in "${ids[@]}"; do
  in="$SRC/$id.mp4"
  [ -f "$in" ] || { echo "skip $id (no $in)"; continue; }
  # 960 px wide, silent, faststart; CRF climbs until the file is under ~1.5 MB
  for crf in 28 30 32 34 36; do
    ffmpeg -v error -y -i "$in" -an -vf "scale=960:-2:flags=lanczos,fps=24" \
      -c:v libx264 -preset slow -crf "$crf" -profile:v high -pix_fmt yuv420p -movflags +faststart "$OUT/$id.mp4"
    size=$(stat -c %s "$OUT/$id.mp4")
    [ "$size" -le 1572864 ] && break
  done
  ffmpeg -v error -y -i "$OUT/$id.mp4" -frames:v 1 -q:v 4 "$OUT/$id.jpg"
  ffmpeg -v error -y -i "$in" -an -vf "scale=960:-2:flags=lanczos,fps=24" \
    -c:v libvpx-vp9 -b:v 0 -crf 40 -row-mt 1 -deadline good -cpu-used 2 "$OUT/$id.webm"
  w=$(stat -c %s "$OUT/$id.webm")
  if [ "$w" -ge "$size" ]; then rm "$OUT/$id.webm"; webm=no; else webm=yes; fi
  printf '%-10s mp4 %5d KB (crf %s)  webm %s\n' "$id" $((size / 1024)) "$crf" "$webm"
done
