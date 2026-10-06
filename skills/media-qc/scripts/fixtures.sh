#!/bin/sh
# fixtures.sh <dir>: synthetic good and known-bad media for media-qc's self-test (Studio check IMG-T3).
# ffmpeg and node only: no ImageMagick, no python, no network. Deterministic lavfi sources at fixed sizes.
# Prints one line per fixture written, and a "skip" line for any fixture whose encoder this ffmpeg lacks.
# Exit 0 written · 2 usage · 3 ffmpeg or node missing (report it, do not install it: HR21).
set -eu
[ $# -eq 1 ] || { echo "usage: fixtures.sh <dir>" >&2; exit 2; }
command -v ffmpeg >/dev/null 2>&1 || { echo "ffmpeg is not installed on this machine" >&2; exit 3; }
command -v node >/dev/null 2>&1 || { echo "node is not installed on this machine" >&2; exit 3; }
D=$1
mkdir -p "$D/set" "$D/plans"
ff() { ffmpeg -v error -nostdin -y "$@"; }
enc() { ffmpeg -hide_banner -encoders 2>/dev/null | grep -q " $1 "; }
made() { echo "made $1"; }

# ---------- good pictures
ff -f lavfi -i testsrc2=s=1024x1024 -frames:v 1 -update 1 "$D/square-1024.png"; made "square-1024.png: 1024x1024 RGB PNG, 8-bit"
ff -f lavfi -i testsrc2=s=1280x720 -frames:v 1 -update 1 "$D/wide-1280x720.png"; made "wide-1280x720.png: exact 16:9"
ff -f lavfi -i testsrc2=s=864x496 -frames:v 1 -update 1 "$D/wide-864x496.png"; made "wide-864x496.png: the signed-release miss (asked 720p 16:9; 2.0% off 16:9)"
ff -f lavfi -i testsrc2=s=800x600 -frames:v 1 -update 1 -q:v 3 "$D/photo.jpg"; made "photo.jpg: real JPEG 800x600"
ff -f lavfi -i testsrc2=s=640x640 -frames:v 1 -update 1 -vf format=rgba "$D/opaque-rgba.png"; made "opaque-rgba.png: an alpha channel, every pixel opaque (no real alpha)"
ff -f lavfi -i testsrc2=s=640x640 -frames:v 1 -update 1 \
  -vf "format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lt(hypot(X-320,Y-320),240),255,0)'" "$D/cutout-rgba.png"
made "cutout-rgba.png: a disc on a transparent ground (real alpha, ~56% transparent)"
ff -f lavfi -i testsrc2=s=512x512 -frames:v 1 -update 1 -pix_fmt rgb48be "$D/deep-16bit.png"; made "deep-16bit.png: 16-bit RGB PNG"
ff -f lavfi -i testsrc2=s=320x240 -frames:v 1 -update 1 "$D/still.gif"; made "still.gif: GIF"
# a 1x1 lossless WebP from bytes (no libwebp encoder needed, so the fixture is the same on every build)
node -e "require('fs').writeFileSync(process.argv[1], Buffer.from('UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==', 'base64'))" "$D/pixel.webp"
made "pixel.webp: 1x1 lossless WebP"

# ---------- known-bad files
ff -f lavfi -i testsrc2=s=800x600 -frames:v 1 -update 1 -c:v mjpeg -f image2 "$D/jpeg-named.png"; made "jpeg-named.png: JPEG bytes behind a .png name (BQ-02)"
: > "$D/empty.png"; made "empty.png: 0 bytes (BQ-01)"
n=$(wc -c < "$D/square-1024.png"); head -c $((n * 6 / 10)) "$D/square-1024.png" > "$D/truncated.png"; made "truncated.png: PNG signature and IHDR intact, so ffprobe reads 1024x1024, but the pixels do not decode (BQ-02)"
printf 'not a video\n' > "$D/text-named.mp4"; made "text-named.mp4: text behind a .mp4 name (BQ-02)"
printf 'run notes\n' > "$D/notes.txt"; made "notes.txt: no magic rule for .txt (cannot check, exit 3)"

# ---------- video and audio containers (artifact magic + decode)
if enc libx264; then ff -f lavfi -i testsrc2=s=320x240:r=24:d=1 -c:v libx264 -pix_fmt yuv420p "$D/clip.mp4"
else ff -f lavfi -i testsrc2=s=320x240:r=24:d=1 -c:v mpeg4 "$D/clip.mp4"; fi; made "clip.mp4: 1 s 320x240"
ff -f lavfi -i testsrc2=s=320x240:r=24:d=1 -c:v mpeg4 "$D/clip.mov"; made "clip.mov: 1 s 320x240 QuickTime"
if enc libvpx; then ff -f lavfi -i testsrc2=s=320x240:r=24:d=1 -c:v libvpx -b:v 200k "$D/clip.webm"; made "clip.webm: 1 s VP8"
else echo "skip clip.webm: this ffmpeg has no libvpx encoder"; fi
ff -f lavfi -i sine=f=440:d=1 -c:a pcm_s16le "$D/tone.wav"; made "tone.wav: 1 s 440 Hz PCM"
if enc libmp3lame; then ff -f lavfi -i sine=f=440:d=1 -c:a libmp3lame "$D/tone.mp3"; made "tone.mp3: 1 s 440 Hz MP3"
else echo "skip tone.mp3: this ffmpeg has no libmp3lame encoder"; fi

# ---------- a contact-sheet set: mixed sizes, formats and alpha
cp -f "$D/square-1024.png" "$D/wide-864x496.png" "$D/photo.jpg" "$D/cutout-rgba.png" "$D/set/"; made "set/: 4 pictures of mixed size and format"

# ---------- declarations (the request-record and plan shapes media-qc reads)
w() { printf '%s\n' "$2" > "$D/plans/$1"; made "plans/$1"; }
w request-1280x720.json '{"endpoint":"fal-ai/example","declared":{"w":1280,"h":720,"aspect":"16:9","format":"png"}}'
w request-720p.json '{"declared":{"resolution":"720p","aspect":"16:9"}}'
w request-jpeg.json '{"declared":{"format":"jpg"}}'
w request-cutout.json '{"declared":{"alpha":"required","format":"png"}}'
w request-video-only.json '{"declared":{"duration_s":4,"fps":24,"audio":true}}'
w request-none.json '{"endpoint":"fal-ai/example","params":{"prompt":"a lighthouse at dawn"}}'
w request-flat.json '{"aspect_ratio":"1:1","format":"png"}'
w broken.json '{"declared": {"w": 1280,'
w plan.json '{"project":"selftest","assets":[
 {"id":"hero","declared":{"resolution":"1280x720","aspect":"16:9","format":"png"},"files":[{"path":"artifacts/selftest/hero/wide-864x496.png","sha256":"-"}]},
 {"id":"square","declared":{"w":1024,"h":1024,"aspect":"1:1","format":"png"},"files":[{"path":"artifacts/selftest/square/square-1024.png","sha256":"-"}]},
 {"id":"photo","files":[{"path":"artifacts/selftest/photo/photo.jpg","sha256":"-"}]}]}'
# media-ai-gen's manifest shape (sl8.media.manifest/1): width/height, alpha true, string files[], retries share item
w manifest.json '{"schema":"sl8.media.manifest/1","project":"selftest","assets":[
 {"id":"hero#1","item":"hero","node":"keyframes","declared":{"aspect":"16:9","width":1280,"height":720,"format":"png"},"measured":{"width":864,"height":496},"files":[{"path":"keyframes/wide-864x496.png","sha256":"-","bytes":1}],"attempt":1,"status":"rejected"},
 {"id":"hero#2","item":"hero","node":"keyframes","declared":{"aspect":"16:9","width":1280,"height":720,"format":"png"},"files":[{"path":"keyframes/wide-1280x720.png","sha256":"-","bytes":1}],"attempt":2,"lever":"route"},
 {"id":"cut#1","item":"hero-cutout","node":"final","tool":"python3 cutout.py","parents":["hero#2"],"declared":{"format":"png","alpha":true},"files":["final/cutout-rgba.png"]}],
 "gates":[],"waivers":[]}'
