#!/usr/bin/env bash
# bg-remove.sh — remove the background from an image via ai-gen (fal-ai/bria/background/remove),
# then (1) save the transparent matte as the canonical cutout under assets/cutouts/ AND
# (2) stage a copy into the per-project Remotion app's public/ so staticFile() resolves it at render.
#
#   bash bg-remove.sh <source-image> <project-artifacts-dir> [out-name]
#   e.g. bash bg-remove.sh ~/uploads/founder.jpg artifacts/api-teaser founder
#
# <source-image>          : a readable PNG/JPG/WebP to cut out (a subject, product, logo, …).
# <project-artifacts-dir> : artifacts/<project>. The cutout lands at:
#                             <dir>/assets/cutouts/<name>.png                    (canonical, durable)
#                             <dir>/remotion-project/public/cutouts/<name>.png   (staged for staticFile)
# [out-name]              : optional output stem (default = the source basename). Always written as .png
#                           because the matte carries an alpha channel.
#
# It runs EXACTLY the spec-confirmed command (positional model id, --image input; keyless SL8 proxy):
#   ai-gen run fal-ai/bria/background/remove --image <source-image>
# ai-gen writes the result to ~/artifacts/remove-<ts>.png and prints v2 JSON:
#   { "success": bool, "files": [{ "local_path": ... }], "hosted_urls": [...] }
# We parse files[0].local_path with node, fail cleanly on success:false / a missing file, then COPY the
# matte into BOTH locations. The composition references it via staticFile("cutouts/<name>.png") — so the
# staged public/ copy is what the renderer actually reads. NO HeyGen, NO local ML weights, NO render here.
set -uo pipefail

SRC="${1:?usage: bg-remove.sh <source-image> <project-artifacts-dir> [out-name]}"
PROJ="${2:?missing project-artifacts-dir (artifacts/<project>)}"
NAME="${3:-}"

if [ ! -f "$SRC" ]; then
  echo "!! source image not found: $SRC" >&2
  echo "   Record the missing source in state.md and stop — do NOT fabricate a cutout." >&2
  exit 1
fi
if ! command -v ai-gen >/dev/null 2>&1; then
  echo "!! ai-gen CLI not found. Background removal needs the keyless ai-gen proxy (sl8-animation runtime)." >&2
  echo "   On host/dev this is expected to be absent — run the cutout step in-sandbox." >&2
  exit 1
fi

# Default the output stem to the source basename (sans extension); always emit .png (alpha).
if [ -z "$NAME" ]; then
  base="$(basename "$SRC")"
  NAME="${base%.*}"
fi

CUTOUT_DIR="$PROJ/assets/cutouts"                       # canonical, durable
PUBLIC_DIR="$PROJ/remotion-project/public/cutouts"      # staged for staticFile()
mkdir -p "$CUTOUT_DIR" "$PUBLIC_DIR"
DEST="$CUTOUT_DIR/${NAME}.png"
STAGED="$PUBLIC_DIR/${NAME}.png"

echo ">> bg-remove: ai-gen run fal-ai/bria/background/remove --image \"$SRC\""
JSON="$(ai-gen run fal-ai/bria/background/remove --image "$SRC" 2>/tmp/rm-bg-remove-err.txt)" || {
  echo "!! ai-gen run failed:" >&2; tail -8 /tmp/rm-bg-remove-err.txt >&2; exit 1; }

# Parse the v2 JSON: require success:true and files[0].local_path; print the matte path.
MATTE="$(printf '%s' "$JSON" | node -e '
  let s=""; process.stdin.on("data",d=>s+=d).on("end",()=>{
    let j; try{ j=JSON.parse(s); }catch(e){ console.error("!! ai-gen did not return JSON"); process.exit(2); }
    if(j.success===false){ console.error("!! ai-gen reported success:false: "+(j.error||JSON.stringify(j))); process.exit(3); }
    const p=(j.files&&j.files[0]&&j.files[0].local_path)||"";
    if(!p){ console.error("!! no files[].local_path in ai-gen output"); process.exit(4); }
    process.stdout.write(p);
  });
')" || exit "$?"

if [ ! -f "$MATTE" ]; then
  echo "!! ai-gen reported $MATTE but the file is missing on disk." >&2
  exit 1
fi

cp -f "$MATTE" "$DEST"
cp -f "$MATTE" "$STAGED"
echo ">> cutout saved:  $DEST"
echo ">> staged (public): $STAGED"

# Report alpha presence so the caller can confirm a real matte (best-effort; ffprobe is on sl8-animation).
if command -v ffprobe >/dev/null 2>&1; then
  # default=nokey=1:noprint_wrappers=1 → one bare value (some ffmpeg builds append a trailing
  # comma to single-field csv output). Query width/height separately and join with x.
  PIXFMT="$(ffprobe -v error -select_streams v:0 -show_entries stream=pix_fmt -of default=nokey=1:noprint_wrappers=1 "$DEST" 2>/dev/null)"
  _W="$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of default=nokey=1:noprint_wrappers=1 "$DEST" 2>/dev/null)"
  _H="$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of default=nokey=1:noprint_wrappers=1 "$DEST" 2>/dev/null)"
  DIMS="${_W}x${_H}"
  echo "   pix_fmt=$PIXFMT dims=$DIMS  (expect an alpha pix_fmt, e.g. rgba/ya8, for a real cutout)"
fi
echo ">> DONE. Reference it from the composition as <Img src={staticFile(\"cutouts/${NAME}.png\")} /> (NOT a native <img> or absolute path)."
