# Background, alpha, overlays and captions

SL8 wording. Restated from the method the capability assessment records for WF22-a6 steps 12-14
(`heygen/retired-avatarvideo-8ce216` fine points #19, #25-#29, #31; prompt "Remotion output-format
choice table"), with HeyGen's Remotion and WebM endpoint replaced by this machine's ffmpeg and
HyperFrames. Nothing here has run on an SL8 Studio.

## Which output

| The presenter… | Make | Why |
|---|---|---|
| fills the frame | the assembled MP4, its own background | simplest; nothing to see through |
| has titles or lower thirds on top | the MP4, then overlays (below) | overlays sit on top of an opaque video |
| sits in a corner over a screen recording or other footage | a keyed clip composited over the footage | the content behind must show through |
| is a round "bubble" over content | a keyed clip, masked to a circle in the composition | the circle is a mask, not a model output |

## Background

- Default: the portrait's own plain backdrop (step 3's `{background}`: deep navy `#1a1a2e` by
  default; a kit or brief may name another).
- A background image must have the video's frame size and aspect (for example 1920 × 1080 for a
  1080p frame, under 10 MB), or it is cropped or stretched. A background video loops, is muted, H.264,
  under 100 MB.

## Alpha: green screen (the default alpha route)

Plan it before the portrait: generate it on a flat `#00FF00` backdrop (`{background}` = "flat chroma
green #00FF00"), or ask the customer for a photo shot on green. After the talking-head job:

```bash
ffmpeg -hide_banner -encoders | grep -q libvpx-vp9 && echo vp9   # alpha WebM is possible only with it
# Composite straight onto the content (no alpha file needed). The presenter's speech decides the
# length: the content loops under it (-stream_loop) and the result ends with the presenter; the
# content's own sound is dropped. For content that must play once, cut the speech to it instead.
ffmpeg -v error -y -stream_loop -1 -i work/<p>/content.mp4 -i work/<p>/presenter.mp4 -filter_complex \
  "[1:v]chromakey=0x00FF00:0.12:0.06,despill=green,scale=iw*0.35:-2[fg];[0:v][fg]overlay=W-w-40:H-h-40:shortest=1[v]" \
  -map "[v]" -map 1:a -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac work/<p>/over-content.mp4
# Or an alpha WebM for a composition (only when libvpx-vp9 is present):
ffmpeg -v error -y -i work/<p>/presenter.mp4 -vf "chromakey=0x00FF00:0.12:0.06,despill=green,format=yuva420p" \
  -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 2M -c:a libopus work/<p>/presenter-alpha.webm
```

The similarity and blend values (0.12, 0.06) are starting points, not measured figures. Look at three
frames (start, middle, end) for green fringes and spill on hair and edges; tighten or loosen once,
then report what you saw (HR14). Whether the talking-head models keep a flat green backdrop flat while
the whole frame moves is untested.

## Alpha: matting frames (when the backdrop is not green)

`fal-ai/bria/background/remove` works on single images, so a clip becomes frames:
`ffmpeg -i clip.mp4 work/<p>/frames/f_%05d.png`, one paid call per frame, then
`ffmpeg -framerate <fps> -i work/<p>/cut/f_%05d.png -i clip.mp4 -map 0:v -map 1:a …` to rebuild. Every
frame is a call: quote frames × the per-image price (media-image-generation facts
`price-bria-remove`) before starting; a 30 s clip at 25 fps is 750 calls. Check three frames for edge
quality and play the result for flicker between frames. No video matting model is confirmed on this
machine.

## Overlays (titles, lower thirds)

Load `hyperframes-core` and `hyperframes-cli` (never the `hyperframes` entry skill: it routes) and build
one composition with the assembled presenter MP4 as its video. HyperFrames owns media playback and
seeks frames itself, which keeps the presenter frame-accurate (the reason the source insisted on
frame-accurate decoding: a player that drifts makes the picture jitter). Render at the presenter's
frame size and frame rate.

- A text overlay stays on screen at least 3 s.
- It never covers the presenter's face: place it from a frame you have looked at.
- It shows the written form (numbers, names, URLs); the voice says the spoken form.
- Positions in a 1920 × 1080 frame, as examples: centre 960, 540; a lower third from about 50, 1030.

While the scene jobs render (step 12), the composition can be built against a placeholder (the
approved portrait as a still, or the first finished scene) and the real file swapped in afterwards.

## Captions

Captions are burned last, after overlays, by `edit-captions` (load it whole; it owns transcription,
the burn and its checks): pass the overlaid or assembled file as its input and the script's written
form, one scene per line (`work/<p>/captions-script.txt`, written by `presenter.mjs script` in step 6),
as `--script`. Its default engine is local faster-whisper; its remote
option is `fal-ai/elevenlabs/speech-to-text/scribe-v2`, quoted first. The speech-to-text gives only
the clock; the caption words come from the script (higgsfield videomontage-f65c69#1).

What the method asks of captions, which edit-captions' geometry is checked against on its frames:
high contrast, at least 24 px tall at 1080p, and clear of the bottom 20% of the frame on TikTok and
Reels, where the app's own buttons sit. LinkedIn plays muted by default, so a LinkedIn delivery carries
captions.
