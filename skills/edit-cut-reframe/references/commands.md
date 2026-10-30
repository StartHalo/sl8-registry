# Commands by step

Every command here is local and free unless it calls `ai-gen`. `<p>` is the project; `$E`, `$S` and
`$Q` are set at the top of SKILL.md. The encode default for every MP4 is
`-c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart`; a silent
source takes `-an` in place of the three audio options. Check every command's exit status and probe
what it wrote before the next step uses it.

## Contents
- [1 Preflight](#1-preflight)
- [4 Measure](#4-measure)
- [5 Transcribe](#5-transcribe)
- [6 Single-range trim](#6-single-range-trim)
- [7-8 Edge proxies and range strips](#7-8-edge-proxies-and-range-strips)
- [11 Caption a final-framed video](#11-caption-a-final-framed-video)
- [12 Resize](#12-resize)
- [13 Intros and outros](#13-intros-and-outros)
- [14 Narration or music](#14-narration-or-music)
- [15 Marks](#15-marks)
- [16 Build from images and clips](#16-build-from-images-and-clips)
- [17 Cleanup and upscale](#17-cleanup-and-upscale)
- [18 Splice review](#18-splice-review)
- [19 Delivery formats](#19-delivery-formats)

## 1 Preflight

```bash
ffmpeg -hide_banner -version | head -1; ffprobe -version | head -1
ffmpeg -hide_banner -filters | grep -E ' (subtitles|ass|loudnorm|sidechaincompress|xfade|acrossfade|atempo|silencedetect|showwavespic|tpad|apad|amix) '
ffmpeg -hide_banner -encoders | grep -E ' (libx264|aac|flac|libvpx-vp9|libopus|libmp3lame) '
fc-list | grep -ci 'Noto Sans'; fc-list :lang=he family | head -2    # he, ar, ja, ko, zh-cn, ru: the script the captions need
python3 -c 'import json, subprocess, fractions'; convert -version | head -1
ai-gen doctor --format json                       # only when a fal step is planned
ai-gen info fal-ai/elevenlabs/speech-to-text/scribe-v2 --format json   # and each other fal id, before its first call
```

For each field you set on a fal model, also read the raw OpenAPI (`media-ai-gen/references/commands.md`,
"Raw OpenAPI": `ai-gen info` shows a `const` as a plain default, HR2).

## 4 Measure

```bash
ffprobe -v error -show_format -show_streams -show_entries stream_side_data=rotation -of json work/<p>/src/source.mp4 > work/<p>/probe.json
ffmpeg -v error -y -i work/<p>/src/source.mp4 -vf "fps=12/<duration>,scale=480:-2,tile=4x3" -frames:v 1 work/<p>/timeline.png   # 24 frames: fps=24/<duration>, tile=6x4
ffmpeg -v error -y -ss <t> -i work/<p>/src/source.mp4 -frames:v 1 work/<p>/f_<t>.png                                          # 1 to 24 stills
ffmpeg -v error -y -i work/<p>/src/source.mp4 -vf "select='gt(scene,0.3)',scale=480:-2,tile=4x3" -frames:v 1 work/<p>/scenes.png  # scene changes, for burned-in text
python3 $E/validate_plan.py init --src work/<p>/src/source.mp4 --probe work/<p>/probe.json --out work/<p>/edit-plan.json --project <p> --name "<readable name>" [--size WxH] [--fps 30]
```

## 5 Transcribe

```bash
ffmpeg -v error -y -i work/<p>/src/source.mp4 -map 0:a:0 -vn -ac 1 -ar 16000 -c:a flac work/<p>/audio.flac
ls -l work/<p>/audio.flac    # over 3 MB goes through storage; a 413/exit 2 or 10: split into 10-minute chunks and add each chunk's offset to its word times, else end partial
echo '{"diarize": true, "tag_audio_events": false}' > work/<p>/stt.params.json     # add "language_code": "eng" (ISO 639-3) and "keyterms": ["Brand"] when known
ai-gen estimate fal-ai/elevenlabs/speech-to-text/scribe-v2 --params-file work/<p>/stt.params.json --format json
node $S/manifest.mjs budget --project <p>
ai-gen transcribe work/<p>/audio.flac -m fal-ai/elevenlabs/speech-to-text/scribe-v2 --params-file work/<p>/stt.params.json \
  --queue --max-cost <quote> --format json > work/<p>/stt-<sha12>.json
node $S/manifest.mjs add --project <p> --result work/<p>/stt-<sha12>.json --params work/<p>/stt.params.json \
  --json '{"item":"transcript-source","node":"edit","declared":{},"files":["work/<p>/stt-<sha12>.json"],"credits":{"estimate":<quote>}}'
```

The `item` is distinct per call (`transcript-source`, `transcript-final`, `splice-<i>`, `isolation`, `upscale`, `logo-cutout`); a second call on one item is an attempt 2 and is refused without a `lever`. A transcript envelope has no `files`, so the row names the saved envelope. `<sha12>` is the first 12 characters of the source's sha256: a file of that name is reused, never paid
for twice. The words are in the envelope's `raw.words`. Never add `-o` (on `transcribe` it writes the
plain text to a file, not the words) or `--strict-params` (ai-gen always adds a `task` field, which
Scribe does not list, so a strict call is refused).

## 6 Single-range trim

```bash
ffmpeg -hide_banner -v error -y -ss <start> -to <end> -i work/<p>/src/source.mp4 -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart work/<p>/trim.mp4
ffprobe -v error -select_streams v:0 -show_entries stream=duration -of csv=p=0 work/<p>/trim.mp4   # = end - start within one frame
```

## 7-8 Edge proxies and range strips

`audio.flac` is §5's first line; extracting it is free, so a job with nothing to transcribe still makes it
for the silence map.

```bash
ffmpeg -hide_banner -nostats -i work/<p>/audio.flac -af silencedetect=noise=-35dB:d=0.15 -f null - 2> work/<p>/silences.txt
ffmpeg -v error -y -ss <t-1.5> -t 3 -i work/<p>/audio.flac -filter_complex "showwavespic=s=1200x200" -frames:v 1 work/<p>/edge_<i>.png
ffmpeg -v error -y -ss <start> -to <end> -i work/<p>/src/source.mp4 -vf "fps=1,scale=320:-2,tile=6x1" -frames:v 1 work/<p>/range_<i>.png   # over 6 s: fps=6/<length>
python3 $E/validate_plan.py check work/<p>/edit-plan.json [--words work/<p>/stt-<sha12>.json]
python3 $E/validate_plan.py deadair work/<p>/edit-plan.json --words work/<p>/stt-<sha12>.json [--within S,E]   # only on request; prints pauses to view
```

## 11 Caption a final-framed video

```bash
python3 $E/make_ass.py --words work/<p>/stt_final.json [--script work/<p>/script.txt] [--corrections '[{"from":"note book","to":"Notebook"}]'] \
  --video work/<p>/final_uncaptioned.mp4 --style clean --ass work/<p>/caps.ass --srt work/<p>/caps.srt --json work/<p>/caps.json
python3 $E/make_ass.py --captions work/<p>/src/captions.srt --video work/<p>/final_uncaptioned.mp4 --ass work/<p>/caps.ass --srt work/<p>/caps.srt --json work/<p>/caps.json
ffmpeg -hide_banner -v error -y -i work/<p>/final_uncaptioned.mp4 -vf "subtitles=work/<p>/caps.ass" \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -c:a copy -movflags +faststart work/<p>/final_captioned.mp4
# a font file the customer supplied: copy it to work/<p>/fonts/, pass --font "<family>" and add :fontsdir=work/<p>/fonts (inside a cut: `cut_reframe.py … --fontsdir work/<p>/fonts`)
# a look preview (keeps the source clock so the caption at <t> shows):
ffmpeg -v error -y -ss <t> -copyts -i work/<p>/final_uncaptioned.mp4 -vf "subtitles=work/<p>/caps_<look>.ass" -frames:v 1 work/<p>/look_<look>.png
```

## 12 Resize

```bash
ffmpeg -hide_banner -v error -y -i work/<p>/in.mp4 -vf "scale=W:H:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=W:H:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1" -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart work/<p>/scaled.mp4   # pad
ffmpeg -hide_banner -v error -y -i work/<p>/in.mp4 -vf "scale=W:H:force_original_aspect_ratio=increase,crop=W:H,setsar=1" -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart work/<p>/scaled.mp4   # centre crop
```

## 13 Intros and outros

```bash
# each segment at the main video's W x H and fps; a silent segment (the main video included: pair it with anullsrc the same way): add -f lavfi -i anullsrc=r=48000:cl=stereo -map 0:v -map 1:a -shortest
ffmpeg -v error -y -i work/<p>/src/intro.mp4 -vf "scale=W:H:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=W:H:(ow-iw)/2:(oh-ih)/2:color=black,fps=F,setsar=1" -ar 48000 -ac 2 -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart work/<p>/intro_n.mp4
ffmpeg -v error -y -i work/<p>/intro_n.mp4 -i work/<p>/main.mp4 -i work/<p>/outro_n.mp4 \
  -filter_complex "[0:v][0:a][1:v][1:a][2:v][2:a]concat=n=3:v=1:a=1[v][a]" -map "[v]" -map "[a]" -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart work/<p>/bookended.mp4
# crossfade only on request: [0:v][1:v]xfade=transition=fade:duration=0.5:offset=<intro length - 0.5>[x];[0:a][1:a]acrossfade=d=0.5[ax]
ffmpeg -v error -y -ss <t> -i work/<p>/main.mp4 -frames:v 1 work/<p>/style_ref.png   # style reference for a generated bookend
```

## 14 Narration or music

```bash
# replace (default): the clip's own sound is dropped; the video keeps its full length
ffmpeg -v error -y -i work/<p>/clip.mp4 -i work/<p>/vo.wav -filter_complex "[1:a]apad[a]" -map 0:v -map "[a]" -t <video length> -c:v copy -c:a aac -b:a 192k -movflags +faststart work/<p>/out.mp4
# a clip with NO audio stream has no [0:a]: use the replace recipe above, or map [1:a] alone: -filter_complex "[1:a]adelay=<ms>:all=1,volume=<gain>,apad[a]" -map 0:v -map "[a]" -t <video length> ...
# mix: clip sound kept; added track at 0.3 under speech, delayed <ms>
ffmpeg -v error -y -i work/<p>/clip.mp4 -i work/<p>/music.mp3 -filter_complex "[0:a]volume=1[a0];[1:a]adelay=<ms>:all=1,volume=0.3[a1];[a0][a1]amix=inputs=2:duration=first:normalize=0[a]" -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -movflags +faststart work/<p>/out.mp4
# duck the music under the clip's speech (only on request)
ffmpeg -v error -y -i work/<p>/clip.mp4 -i work/<p>/music.mp3 -filter_complex "[0:a]asplit=2[sp][sc];[1:a]volume=0.3[m];[m][sc]sidechaincompress=threshold=0.05:ratio=8:attack=20:release=300[md];[sp][md]amix=inputs=2:duration=first:normalize=0[a]" -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -movflags +faststart work/<p>/out.mp4
# replace cuts the voiceover at the picture length: if the voiceover is longer, use the next recipe (tpad) instead
# added audio longer than the picture: hold the last frame
ffmpeg -v error -y -i work/<p>/clip.mp4 -i work/<p>/vo.wav -filter_complex "[0:v]tpad=stop_mode=clone:stop_duration=<seconds>[v]" -map "[v]" -map 1:a -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart work/<p>/out.mp4
# audio crossfade between two files (on request; d from 0 to 30 s, 5 a common start): [0:a][1:a]acrossfade=d=<s>[a]
# join audio files end to end, in order, one pass (no file-count limit)
ffmpeg -v error -y -i work/<p>/seg1.wav -i work/<p>/seg2.mp3 -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1[a]" -map "[a]" -c:a aac -b:a 192k work/<p>/narration.m4a
```

Loudness, when asked, after any ducking and on the final mix (leave `normalize_audio` off in the plan when audio is added after the cut): measure, then apply with the measured values.

```bash
ffmpeg -hide_banner -nostats -i work/<p>/out.mp4 -vn -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2> work/<p>/loudness.txt
ffmpeg -v error -y -i work/<p>/out.mp4 -c:v copy -af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=<input_i>:measured_TP=<input_tp>:measured_LRA=<input_lra>:measured_thresh=<input_thresh>:offset=<target_offset>:linear=true" -ar 48000 -c:a aac -b:a 192k -movflags +faststart work/<p>/out_norm.mp4
node $Q loudness work/<p>/out_norm.mp4 --target -14
```

## 15 Marks

```bash
ai-gen estimate fal-ai/bria/background/remove --format json                     # a logo on a solid background only
ai-gen run fal-ai/bria/background/remove --image work/<p>/src/logo.png -o artifacts/<p>/source/ --queue --strict-params --max-cost <quote> --format json > work/<p>/bgremove.json
node $S/manifest.mjs add --project <p> --result work/<p>/bgremove.json --params work/<p>/bgremove.params.json --json '{"item":"logo-cutout","node":"edit","declared":{"w":<logo width>,"h":<logo height>,"format":"png","alpha":true},"credits":{"estimate":<quote>}}'   # params: the fields you set (write {} if none)
convert <cutout or supplied mark>.png -trim +repage work/<p>/mark_t.png
convert -background none -fill white -font "$(fc-match -f '%{file}' 'Noto Sans:bold')" -pointsize <size> label:'<exact text>' -trim +repage work/<p>/mark_txt.png
# one mark, bottom right, 12% of the video width, 48 px margin; anchors x in {M, (W-w)/2, W-w-M}, y in {M, (H-h)/2, H-h-M}
ffmpeg -v error -y -i work/<p>/master.mp4 -i work/<p>/mark_t.png -filter_complex "[1:v]scale=<round(W*0.12)>:-2[m];[0:v][m]overlay=x=W-w-48:y=H-h-48" \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -c:a copy -movflags +faststart work/<p>/marked.mp4
# captions and a mark in one encode: [0:v]subtitles=work/<p>/caps.ass[c];[1:v]scale=…[m];[c][m]overlay=…
```

A mark whose scaled height would not fit inside the margins is scaled by height instead
(`scale=-2:<H - 2M>`). Several marks chain `overlay` filters; a later one sits above an earlier one.

## 16 Build from images and clips

```bash
ffmpeg -v error -y -loop 1 -t 3 -i work/<p>/src/title.png -i work/<p>/src/scene.mp4 -loop 1 -t 4 -i work/<p>/src/end.png -f lavfi -i anullsrc=r=48000:cl=stereo \
  -filter_complex "[0:v]scale=W:H:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=W:H:(ow-iw)/2:(oh-ih)/2,fps=F,setsar=1[v0];\
[1:v]scale=W:H:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=W:H:(ow-iw)/2:(oh-ih)/2,fps=F,setsar=1[v1];\
[2:v]scale=W:H:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=W:H:(ow-iw)/2:(oh-ih)/2,fps=F,setsar=1[v2];\
[3:a]atrim=0:3[s0];[1:a]aresample=48000[a1];[3:a]atrim=0:4[s2];[v0][s0][v1][a1][v2][s2]concat=n=3:v=1:a=1[v][a]" -map "[v]" -map "[a]" -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart work/<p>/composed.mp4
```

`cover` replaces each pad chain with `scale=W:H:force_original_aspect_ratio=increase,crop=W:H`. A clip
whose audio is excluded, or that has no audio stream (check `streams` in its probe; `[1:a]` above would fail), takes an `anullsrc` slice of its length. A soundtrack is mixed over the result
at full level (step 14 mix with volume 1), and runs past the last clip with `tpad`.

## 17 Cleanup and upscale

```bash
ffmpeg -v error -y -i work/<p>/cut.mp4 -map 0:a:0 -vn -ac 1 -c:a pcm_s16le work/<p>/speech.wav   # the delivered file's audio (cut.mp4), not the whole source, unless the whole source is the deliverable; mono ~5 MB a minute: measure it with ls -l
ai-gen estimate fal-ai/elevenlabs/audio-isolation --format json                 # exit 12: unpriced, open a spend gate
ai-gen run fal-ai/elevenlabs/audio-isolation --audio-file work/<p>/speech.wav -o work/<p>/iso/ --queue --strict-params --max-cost <quote> --format json > work/<p>/iso.json
node $S/manifest.mjs add --project <p> --result work/<p>/iso.json --params work/<p>/iso.params.json --json '{"item":"isolation","node":"edit","declared":{"duration_s":<cut length>,"audio":"required"},"credits":{"estimate":<quote>}}'   # a retry is attempt 2 and names its lever
ffmpeg -v error -y -i work/<p>/cut.mp4 -i <files[0].local_path> -filter_complex "[1:a]apad[a]" -map 0:v -map "[a]" -t <video length> -c:v copy -c:a aac -b:a 192k -movflags +faststart work/<p>/cleaned.mp4
python3 $E/validate_plan.py init --src work/<p>/cleaned.mp4 --probe work/<p>/cleaned.probe.json --out work/<p>/edit-plan-cleaned.json --project <p>   # later steps read the cleaned file
python3 -c "import sys,difflib;sys.path.insert(0,'$E');import make_ass as m;a=[w['text'].lower() for w in m.load_words(sys.argv[1])];b=[w['text'].lower() for w in m.load_words(sys.argv[2])];print([d for d in difflib.ndiff(a,b) if d[0] in '+-'])" work/<p>/stt-<sha12>.json work/<p>/stt_clean.json
echo '{"upscale_factor": 2, "model": "Proteus"}' > work/<p>/up.params.json        # read the schema first: ai-gen info fal-ai/topaz/upscale/video
ai-gen estimate fal-ai/topaz/upscale/video --params-file work/<p>/up.params.json --format json   # exit 12: use fal-ai/seedvr/upscale/video
ai-gen run fal-ai/topaz/upscale/video --video work/<p>/<derivative>.mp4 --params-file work/<p>/up.params.json -o artifacts/<p>/clips/ --queue --strict-params --max-cost <quote> --format json > work/<p>/up.json
node $S/manifest.mjs add --project <p> --result work/<p>/up.json --params work/<p>/up.params.json --json '{"item":"upscale","node":"edit","declared":{"w":<target w>,"h":<target h>,"fps":<fps>,"duration_s":<length>,"audio":"required"},"credits":{"estimate":<quote>}}'
```

SeedVR's fallback params: `{"upscale_mode": "target", "target_resolution": "<1080p | 1440p | 2160p>"}`,
chosen from the declared output size (a 1080p target on a 1080x1920 cut is a no-op). It bills about
0.25 credits per megapixel of width x height x frames (media-video-generation facts): quote
`width x height x frames / 10^6 x 0.25` by hand, since `ai-gen estimate` does not see the media. Topaz
is per second of video (2.5 to 30 credits by the facts rows; fal no longer lists a price for that id,
so expect the estimate to exit 12 and the fallback to run). Sum the quote against `manifest.mjs budget`
before the call. Every call gets the `manifest.mjs add` row shown with the `item`, `declared` size and
`credits.estimate` filled; the output files come from the envelope.

## 18 Splice review

```bash
# joins[].at_out_s and the planned words come from work/<p>/cut.report.json
# <t-1.5> and <t-0.05> mean max(0, t-1.5) and max(0, t-0.05); a join at 0.15 s starts the window at 0
ffmpeg -v error -y -ss <max(0,t-1.5)> -t 3 -i work/<p>/cut.mp4 -vf "fps=4,scale=320:-2,tile=12x1" -frames:v 1 work/<p>/splice_<i>.png
ffmpeg -v error -y -ss <max(0,t-1.5)> -t 3 -i work/<p>/cut.mp4 -vn -ac 1 -ar 44100 -c:a flac work/<p>/splice_<i>.flac
ai-gen transcribe work/<p>/splice_<i>.flac -m fal-ai/elevenlabs/speech-to-text/scribe-v2 --params-file work/<p>/stt.params.json --queue --max-cost <quote> --format json > work/<p>/splice_<i>.json
node $S/manifest.mjs add --project <p> --result work/<p>/splice_<i>.json --params work/<p>/stt.params.json --json '{"item":"splice-<i>","node":"edit","declared":{},"files":["work/<p>/splice_<i>.json"],"credits":{"estimate":<quote>}}'
ffmpeg -hide_banner -nostats -ss <max(0,t-0.05)> -t 0.1 -i work/<p>/cut.mp4 -vn -af astats=metadata=0 -f null - 2>&1 | grep -E 'Peak level dB|Max difference'   # compare with a window 1 s away
```

## 19 Delivery formats

```bash
node $Q streams artifacts/<p>/final/<name>.mp4 --audio yes --vcodec h264 --pix-fmt yuv420p      # --audio no for a silent source
# the cut itself, delivered unchanged: the report's declared and checks are taken because the file is byte-identical to cut.mp4
python3 $E/validate_plan.py sidecar --final artifacts/<p>/final/<name>.mp4 --plan work/<p>/edit-plan.json --report work/<p>/cut.report.json --tags <a,b> --splice-report work/<p>/splice.txt [--not-done "…"] [--incomplete "…"]
# any other delivery (WebM, GIF, .m4a, size cap, bookends, marks, upscale) or a job with no cut report (trim, resize, marks, audio only):
python3 $E/validate_plan.py sidecar --final artifacts/<p>/final/<name>.webm --plan work/<p>/edit-plan.json --declared '{"format":"webm","w":1080,"h":1920,"fps":30,"audio":"required","duration_s":<s>}' --done "ffprobe of this file" --done "mediaqc streams exit 0" --tags <a,b> --not-done "splice review not done: <why>"
node $Q declared --plan artifacts/<p>/final/<name>.json --file artifacts/<p>/final/<name>.mp4
node $Q sheet artifacts/<p>/final/<name>.mp4 --out work/<p>/final_sheet.jpg
# a size cap (MB = 10^6 bytes unless the platform says MiB): video kbps = (cap_MB * 8 * 1000 / duration_s) * 0.97 - audio_kbps   (25 MB, 120 s, 128 kbps -> 1489k; the 0.97 is container headroom)
ffmpeg -v error -y -i work/<p>/final.mp4 -c:v libx264 -preset medium -b:v <kbps>k -maxrate <kbps>k -bufsize <2*kbps>k -pix_fmt yuv420p -c:a aac -b:a <audio_kbps>k -movflags +faststart artifacts/<p>/final/<name>.mp4
# GIF: two-pass palette
ffmpeg -v error -y -i work/<p>/final.mp4 -vf "fps=15,scale=480:-1:flags=lanczos,palettegen" work/<p>/palette.png
ffmpeg -v error -y -i work/<p>/final.mp4 -i work/<p>/palette.png -lavfi "fps=15,scale=480:-1:flags=lanczos[x];[x][1:v]paletteuse" artifacts/<p>/final/<name>.gif && rm work/<p>/palette.png
# WebM: VP9 constant quality with Opus
ffmpeg -v error -y -i work/<p>/final.mp4 -c:v libvpx-vp9 -crf 30 -b:v 0 -c:a libopus -b:a 128k artifacts/<p>/final/<name>.webm
```

Without a size cap, quality is CRF: 18 looks lossless (the default here), 23 is ffmpeg's default, 28 is
smaller. Over the cap after encoding: lower the bitrate (or the size) and encode again; report the size
reached.
