#!/bin/sh
# fixtures.sh <dir>: synthetic good and known-bad media for media-qc's self-test (Studio check IMG-T3).
# ffmpeg, node and POSIX tools only: no ImageMagick, no python, no network. Deterministic lavfi sources at fixed sizes.
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

# ======== media-qc 1.1.0: video and audio. 320x240 at 24 fps from lavfi; every level and length is fixed.
V="$D/video"; A="$D/audio"; T="$D/plans/timeline"; K="$D/kits"
mkdir -p "$V" "$A" "$T/audio" "$T/duck" "$D/plans/timeline-noaudio" "$D/clips-good" "$D/clips-bad" "$K"
if enc libx264; then H264=1; VC="-c:v libx264 -pix_fmt yuv420p"
else H264=0; VC="-c:v mpeg4 -q:v 3"; echo "skip h264 fixtures (yuv444.mp4 and the shimmer clips): this ffmpeg has no libx264 encoder"; fi
SRC="testsrc2=s=320x240:r=24"; TONE="sine=f=440:sample_rate=48000"

# ---------- motion: moving, frozen, a mid-clip freeze, and static route shimmer
ff -f lavfi -i "$SRC:d=4" $VC "$V/moving.mp4"; made "video/moving.mp4: 4 s, moving throughout"
ff -f lavfi -i "$SRC" -frames:v 1 -update 1 "$V/key-a.png"; made "video/key-a.png: its first frame"
ff -framerate 24 -loop 1 -i "$V/key-a.png" -t 4 $VC "$V/frozen.mp4"; made "video/frozen.mp4: the first frame repeated for 4 s (a locally frozen control)"
ff -f lavfi -i "smptebars=s=320x240:r=24:d=4" $VC "$V/still.mp4"; made "video/still.mp4: a still in a video container (VQ-04)"
ff -f lavfi -i "$SRC:d=3" -filter_complex "[0:v]split[a][b];[a]trim=0:1.5,setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=1.5[x];[b]trim=1.5:3,setpts=PTS-STARTPTS[y];[x][y]concat=n=2:v=1:a=0" $VC "$V/freeze-mid.mp4"
made "video/freeze-mid.mp4: moving, frozen from 1.5 s to 3 s, moving (VQ-04: the minimum window, not the average)"
if [ "$H264" = 1 ]; then
  for s in 1 2; do ff -framerate 24 -loop 1 -i "$V/key-a.png" -t 4 -vf "noise=alls=12:allf=t+u:all_seed=$s" -c:v libx264 -crf 18 -pix_fmt yuv420p "$V/static-$s.mp4"; done
  mv -f "$V/static-1.mp4" "$V/route-static.mp4"; mv -f "$V/static-2.mp4" "$V/shimmer-static.mp4"
  made "video/route-static.mp4: a static scene with temporal shimmer (stands in for a route-rendered frozen control)"
  made "video/shimmer-static.mp4: another static shimmer render: nothing moves (VQ-04 against the route control only)"
  ff -f lavfi -i "$SRC:d=4" -vf "noise=alls=12:allf=t+u:all_seed=3" -c:v libx264 -crf 18 -pix_fmt yuv420p "$V/moving-shimmer.mp4"; made "video/moving-shimmer.mp4: real motion under the same shimmer"
fi

# ---------- streams and takes
ff -f lavfi -i "$SRC:d=3" -f lavfi -i "$TONE:d=3" $VC -c:a aac -ac 2 -shortest "$V/av.mp4"; made "video/av.mp4: 3 s, 24 fps, 48 kHz stereo AAC tone"
ff -f lavfi -i "testsrc2=s=320x240:r=24:d=2" -f lavfi -i "$TONE:d=2" $VC -c:a aac -shortest "$V/part24.mp4"
ff -f lavfi -i "testsrc2=s=320x240:r=30:d=2" -f lavfi -i "$TONE:d=2" $VC -c:a aac -shortest "$V/part30.mp4"
printf "file 'part24.mp4'\nfile 'part30.mp4'\nfile 'part24.mp4'\n" > "$V/concat.list"
ff -f concat -safe 0 -i "$V/concat.list" -c copy "$V/vfr.mp4"; rm -f "$V/concat.list"; made "video/vfr.mp4: a 24/30/24 fps stream-copy concat (VQ-02: variable frame rate, frame count)"
ff -f lavfi -i "$SRC:d=2" -f lavfi -i "sine=f=440:sample_rate=96000:d=2" $VC -c:a aac -shortest "$V/audio96k.mp4"; made "video/audio96k.mp4: 96 kHz audio (VQ-02)"
ff -f lavfi -i "$SRC:d=3" -f lavfi -i "$TONE:d=1" $VC -c:a aac "$V/short-audio.mp4"; made "video/short-audio.mp4: 1 s of audio under 3 s of picture (AQ-01)"
ff -f lavfi -i "$SRC:d=3" -f lavfi -i "anullsrc=r=48000:cl=stereo" $VC -c:a aac -t 3 "$V/silent-track.mp4"; made "video/silent-track.mp4: an AAC track of digital silence (AQ-01 in takes; streams passes it)"
ff -f lavfi -i "$SRC:d=3" -f lavfi -i "aevalsrc=if(between(t\,1\,2)\,0\,0.25*sin(2*PI*440*t)):s=48000:d=3" $VC -c:a aac -shortest "$V/gap-audio.mp4"
made "video/gap-audio.mp4: tone, 1 s of silence, tone (AQ-01 with --n 3; the whole-file mean hides it)"
if [ "$H264" = 1 ]; then ff -f lavfi -i "$SRC:d=2" -c:v libx264 -pix_fmt yuv444p "$V/yuv444.mp4"; made "video/yuv444.mp4: h264 4:4:4 (VQ-02 pixel format)"; fi

# ---------- clipset: three matching clips; the same set with a 30 fps clip-02 (the legacy qc-plant defect)
for i in 1 2 3; do ff -f lavfi -i "$SRC:d=1" -f lavfi -i "$TONE:d=1" $VC -c:a aac -shortest "$D/clips-good/clip-0$i.mp4"; done; made "clips-good/: three 1 s clips that agree"
cp -f "$D/clips-good/clip-01.mp4" "$D/clips-good/clip-03.mp4" "$D/clips-bad/"
ff -f lavfi -i "testsrc2=s=320x240:r=30:d=1" -f lavfi -i "$TONE:d=1" $VC -c:a aac -shortest "$D/clips-bad/clip-02.mp4"; made "clips-bad/: clip-02 at 30 fps (VQ-01)"

# ---------- endpoints: A fades to B; a clip that never leaves A
ff -f lavfi -i "smptebars=s=320x240" -frames:v 1 -update 1 "$V/key-b.png"; made "video/key-b.png: a second keyframe"
ff -framerate 24 -loop 1 -t 2 -i "$V/key-a.png" -framerate 24 -loop 1 -t 2 -i "$V/key-b.png" -filter_complex "[0:v][1:v]xfade=transition=fade:duration=1:offset=0.5,format=yuv420p" $VC "$V/a-to-b.mp4"
made "video/a-to-b.mp4: starts on key-a, ends on key-b"
ff -framerate 24 -loop 1 -t 2 -i "$V/key-a.png" -vf format=yuv420p $VC "$V/stays-a.mp4"; made "video/stays-a.mp4: never leaves key-a (VQ-05 against key-b)"
ff -i "$V/key-a.png" -vf "drawbox=x=220:y=160:w=80:h=60:c=white:t=fill" -update 1 "$V/key-c.png"; made "video/key-c.png: key-a with one box changed (SSIM about 0.92 to key-a: a floor alone passes stays-a)"

# ---------- loudness: stereo 1 kHz tones (a sine at amplitude A reads 20*log10(A) LUFS), 4 s
tone2() { ff -f lavfi -i "aevalsrc=$1|$1:s=48000:d=4" -c:a pcm_s16le "$A/$2"; made "audio/$2: $3"; }
tone2 "0.1585*sin(2*PI*1000*t)" mix-16.wav "-16 LUFS, true peak -16 dBTP"
tone2 "0.0708*sin(2*PI*1000*t)" mix-23.wav "-23 LUFS, 7 LU under the default target (AQ-03)"
tone2 "0.2*sin(2*PI*1000*t)" mix-14.wav "-14 LUFS, 2 LU hot (AQ-03)"
tone2 "0.1585*sin(2*PI*1000*t)+if(between(t\,2\,2.02)\,0.69*sin(2*PI*1000*t)\,0)" mix-tp14.wav "a 20 ms burst to about -1.4 dBTP: inside the 0.2 dB slack"
tone2 "0.1585*sin(2*PI*1000*t)+if(between(t\,2\,2.02)\,0.79*sin(2*PI*1000*t)\,0)" mix-peak.wav "a 20 ms burst to about -0.4 dBTP (AQ-03 true peak)"

# ---------- plan-measured and duck: three 2.2 s takes (audio/vo-NN.wav) and plans that place them
vo() { ff -f lavfi -i "sine=f=$2:sample_rate=48000:d=2.2" -af volume=2 -c:a pcm_s16le "$T/audio/$1"; made "plans/timeline/audio/$1: a 2.2 s take"; }
vo vo-01.wav 300; vo vo-02.wav 340; vo vo-03.wav 380
p() { printf '%s\n' "$2" > "$T/$1"; made "plans/timeline/$1"; }
R3='{"n":3,"start":6,"dur":3,"vo":"Third line.","vo_start":6.3}'
p plan-good.json '{"schema":"sl8.media.plan/1","declared":{"duration_s":9},"rows":[{"n":1,"start":0,"dur":3,"vo":"First line.","vo_start":0.4,"vo_measured_s":2.2},{"n":2,"start":3,"dur":3,"vo":"Second line.","vo_start":3.3,"vo_file":"audio/vo-02.wav"},'"$R3"']}'
p plan-typed.json '{"declared":{"duration_s":9},"rows":[{"n":1,"start":0,"dur":3,"vo":"First line.","vo_start":0.4},{"n":2,"start":3,"dur":3,"vo":"Second line.","vo_start":3.3,"vo_measured_s":3.0},'"$R3"']}'
p plan-overrun.json '{"declared":{"duration_s":8},"rows":[{"n":1,"start":0,"dur":3,"vo":"First line.","vo_start":0.4},{"n":2,"start":3,"dur":3,"vo":"Second line.","vo_start":3.3},{"n":3,"start":6,"dur":2,"vo":"Third line, too long.","vo_start":6}]}'
p plan-early.json '{"declared":{"duration_s":9},"rows":[{"n":1,"start":0,"dur":3,"vo":"First line.","vo_start":0.4},{"n":2,"start":3,"dur":3,"vo":"Second line.","vo_start":2.8},'"$R3"']}'
p plan-gap.json '{"declared":{"duration_s":15},"rows":[{"n":1,"start":0,"dur":5,"vo":"First line.","vo_start":0.2},{"n":2,"start":5,"dur":5,"vo":"Second line.","vo_start":5.1},{"n":3,"start":10,"dur":5,"vo":"Third line.","vo_start":10.1}]}'
p plan-silent-shot.json '{"declared":{"duration_s":9},"rows":[{"n":1,"start":0,"dur":3.5,"vo":"First line.","vo_start":0.4},{"n":2,"start":3.5,"dur":1.5,"vo":""},{"n":3,"start":5,"dur":4,"vo":"Third line.","vo_start":5.3}]}'
D3='[{"n":1,"start":0,"dur":4,"vo":"First line.","vo_start":0.8},{"n":2,"start":4,"dur":4,"vo":"Second line.","vo_start":4.8},{"n":3,"start":8,"dur":4,"vo":"Third line.","vo_start":8.8}]'
p plan-duck.json '{"declared":{"duration_s":12,"audio":"vo+bed"},"rows":'"$D3"'}'
p plan-duck-long.json '{"declared":{"duration_s":15},"rows":'"$D3"'}'
p plan-norows.json '{"declared":{"duration_s":9},"rows":[]}'
cp -f "$T/plan-good.json" "$D/plans/timeline-noaudio/plan.json"; made "plans/timeline-noaudio/plan.json: the good plan with no audio/ folder (exit 3)"
# the voice track at each vo_start on the 12 s timeline; beds ducked by a gain under speech; mix = voice + bed as mixed
ff -i "$T/audio/vo-01.wav" -i "$T/audio/vo-02.wav" -i "$T/audio/vo-03.wav" -filter_complex "[0:a]adelay=800[a];[1:a]adelay=4800[b];[2:a]adelay=8800[c];[a][b][c]amix=inputs=3:duration=longest:normalize=0,apad=whole_dur=12" -c:a pcm_s16le "$T/duck/vo-track.wav"
bed() {
  ff -f lavfi -i "anoisesrc=color=pink:seed=11:d=12:r=48000:a=$2" -af "volume='if(between(t,0.8,3.0)+between(t,4.8,7.0)+between(t,8.8,11.0),$3,1)':eval=frame" -c:a pcm_s16le "$T/duck/bed-$1.wav"
  ff -i "$T/duck/vo-track.wav" -i "$T/duck/bed-$1.wav" -filter_complex "[0:a][1:a]amix=inputs=2:duration=longest:normalize=0" -c:a pcm_s16le "$T/duck/mix-$1.wav"
  made "plans/timeline/duck/bed-$1.wav and mix-$1.wav: $4"
}
bed ducked 0.17 0.4 "bed about -30 LUFS, -8 dB under speech"
bed loud 0.6 1 "a bed about 3 LU under the voice, never ducked (AQ-04 bed too loud)"
bed muted 0.17 0 "the bed muted under speech (AQ-04 bed vanished: digital silence)"
bed deep 0.17 0.178 "the bed -15 dB under speech (AQ-04 bed vanished: past 12 dB)"
ff -i "$T/duck/mix-ducked.wav" -af volume=6dB -c:a pcm_s16le "$T/duck/mix-ducked-norm.wav"; made "plans/timeline/duck/mix-ducked-norm.wav: the good mix raised 6 dB, as a normalisation would (the stem gain is read from the bed-only stretches)"

# ---------- identical: a kit, two real copies, a changed copy, a linked folder, a hard link, an unrelated folder
rm -rf "$K"; mkdir -p "$K/kit" "$K/copy-1" "$K/copy-2" "$K/copy-changed" "$K/copy-hard" "$K/elsewhere"
cp -f "$D/square-1024.png" "$K/kit/hero.png"; cp -f "$D/photo.jpg" "$K/kit/side.jpg"
for c in copy-1 copy-2 copy-changed; do cp -f "$K/kit/hero.png" "$K/kit/side.jpg" "$K/$c/"; done
printf 'X' | dd of="$K/copy-changed/side.jpg" bs=1 seek=200 conv=notrunc 2>/dev/null
ln -s kit "$K/copy-link"
ln "$K/kit/hero.png" "$K/copy-hard/hero.png"; cp -f "$K/kit/side.jpg" "$K/copy-hard/"
cp -f "$D/still.gif" "$K/elsewhere/other.gif"
made "kits/: kit, copy-1, copy-2 (real copies), copy-changed (one byte), copy-link (a link to kit), copy-hard (a hard link), elsewhere (nothing shared)"

# ---------- declarations a video is checked against (declared: duration_s, fps, audio)
w request-video.json '{"declared":{"duration_s":3,"fps":24,"audio":"vo+bed","aspect":"4:3","format":"mp4"}}'
w request-video-8s.json '{"declared":{"duration_s":8,"fps":30}}'
w request-video-off.json '{"declared":{"duration":"4s","audio":"off"}}'
