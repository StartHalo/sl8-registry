# Numbers behind video-ambient-loop

Every figure the vendor measured comes from Everygen's own tests: Seedance 2.5 clips laid out in its
editor, 19 staging runs and offline measurements, document version 5.0 of 12 October 2026
(research:everygen/rainambient-fe45fe; WF48-a1 evidence: vendor-demonstrated). None was measured on
this machine. The limits in `scripts/loop_av.py` are these numbers, used as defaults until the first
measured runs replace them (learnings VID-L380).

## The cell

| | Vendor (Seedance 2.5, editor at 60 fps) | This machine |
|---|---|---|
| Clip | 7 s asked, 7.04 s back (422 frames); its sound ends about 50 ms before its picture (#59, #101) | 7 s asked; the length that comes back is measured (a 5 s Seedance 2.0 request once returned 4.06 s: media-video-generation facts `beh-seedance-length`) |
| Blend | one second of overlap: each repeat's tail fades into the following one, sound swelling 0, 141, 200 (#57, #65) | 1 s `xfade` and an equal-power `acrossfade` (qsin), the same second |
| Cell | 362 frames = 6.0333 s (#59) | window minus 1 s, in whole frames of the clip's own rate |
| Rain gain | volume 200 = +6 dB (#65) | `volume=2.0` after the blend |
| Repeats N | 6, 10, 20, 24 for 0:36, 1:00, 2:01, 2:25 (@On the timeline) | N is set from the measured cell (`loop_decide.py count`), so the length comes to the length asked |
| Hard-cut window | 6.9 s of a 7.04 s clip; 5, 9, 17, 21 windows (@Without the timeline) | the shorter of picture and sound minus 0.1 s; a 15 ms crossfade closes each window's sound |
| Veo 3.1 window | back on its first frame by 7.67 s of an 8 s clip, so the cut is at 7.7 s (#94, #95) | `--window 7.7`, checked against `best_return_s` |

## Default limits (scripts/loop_av.py)

| Figure | Limit | Where it comes from | What a miss means here |
|---|---|---|---|
| Last frame against first (mean change per pixel, 0-255) | 3.2 | T5: the fused prompt gave 3.2 against 5.2 before it (#87) | reported beside the ordinary frame step; for the clip it is not a redo reason (the cell blends over it) |
| A join in the finished video | 3.2 | joins measured 1.2 to 2.8 against ordinary steps of 0.1 to 1.5 (@Reference: join vs ordinary frame step table) | the cell is rebuilt once, then the hard-cut route |
| Per-second level spread | 2.2 dB | WF48-a1 step 9 | in the cell: a dropout; rebuild once, then the hard-cut route |
| 400 ms level spread | 3.6 dB | WF48-a1 step 9; the fused prompt measured 4.2 dB, the older one 4.3 (#87) | a standout sound that would return at every repeat: one redo |
| Level of the last second against the first | 1.0 dB | 7 s repeats stayed within 1 dB; median steps 0.8 dB (5 s), 1.8 (7 s), 5.7 (10 s) (#101) | matters on the hard-cut route, where each join is a cut |
| Level step at a join | 1.0 dB | #101; the forest held 0.8 dB, a lake 0.3 dB (test runs 8, 10) | rebuild once, then the hard-cut route |

## Why 7 seconds and one clip

- Four models on one picture and prompt (@Reference: four-model loop table), last frame against
  first: Seedance 2.5 2.0 (it wandered to 4 halfway, then returned); Veo 3.1 2.7, with a small end
  tick; Kling 3.0 3.3, with hardly any sound; MiniMax H3 Max 3.3, shimmering, its sound fading in
  and out (#92).
- A Seedance clip's own sound swells over its last 2 to 3 seconds at 10 s, and stays level at 7 s; 7 s
  clips joined as cleanly as a 10 s clip's end, with fewer standout sounds (3 against 8) (#101, #107).
- Text-to-video chains do not join: three clips of one "seamless" chain were three different gardens
  (a picture change of 45 to 59 against about 2) (#90).
- What is left at a join is a one-frame sharpening and drops on glass resetting: the first frame is the
  picture itself, crisper than the model's frames (#93).
- With an end frame, Veo 3.1 returned to the picture in both scenes tested; Seedance 2.5 only for the
  lake (#94). Seedance 2.0 with `end_image_url` is unmeasured on loops (WF48 risks).

## Sound and music

- An audio model makes poor rain: 29 Seed Audio rain tracks had talking in 10, music in 3, hum in 3, and
  "no voices" did not help (#99). The rain comes from the clip itself.
- A video-analysis tool reported speech in a track whose spectrogram had none (#100): screen voices with
  speech-to-text or a spectrogram.
- Lyria tracks came back near -15.5 dBFS and the clips' rain at -36 to -43 dBFS; the rain stayed heard
  because it owned the band above 2,000 Hz in a median 94% of moments (#105).
- Soft, low, muffled solo felt piano let the rain through in 94 to 100% of moments; piano with pads failed
  in 2 of 8; without "airy" one track opened with 10 s of near-silence (#108). These findings are for
  Lyria; they do not transfer to fal-ai/elevenlabs/music (WF48 risks).
- Lyria has no length setting; untold it ran 2:41 to 3:02; "about one minute" gave 0:57 and "about two
  minutes" 1:55; a "short piece" stopped for 24 s, so the prompt asks for one unbroken piece (#111).
- Lyria refused 3 of 8 copies of one piano prompt as imitating an artist; the same prompt went through
  when made again (#109).
- At gain 0.30 the piano sat roughly 8 dB over the rain (itself at +6 dB); unattenuated, each Lyria
  track drowned the rain by at least 20 dB (#66).

## Prices on this machine (credits; about 250 credits = $1)

From the dated facts rows of media-image-generation, media-video-generation and media-audio-generation
(as of 2026-10-05/06). Always quote with `ai-gen estimate` before a call (HR5).

| Call | Price | Facts row |
|---|---|---|
| Picture, fal-ai/nano-banana-2 | 20 cr at 1K, 30 at 2K | `price-nb2` |
| Clip, bytedance/seedance-2.0/image-to-video | 75.9 cr/s at 720p (7 s about 531 cr), 170.5 cr/s at 1080p; sound costs nothing extra | `price-seedance20-base`, `price-seedance-audio` |
| Test pass, bytedance/seedance-2.0/fast/image-to-video | 60.5 cr/s at 720p (7 s about 424 cr) | `price-seedance20-fast` |
| Clip, bytedance/seedance-2.5/image-to-video | 118 cr/s at 720p (7 s about 826 cr) | `price-seedance25` |
| Clip, fal-ai/veo3.1/fast/first-last-frame-to-video | 37.5 cr/s with sound (8 s = 300 cr) | `price-veo31-fast` |
| Music, fal-ai/elevenlabs/music | 150 cr per started minute | `price-music` |
| Music, fal-ai/lyria3/pro | no price on record | `price-unknown` |
| Voices, fal-ai/elevenlabs/speech-to-text/scribe-v2 | 2 cr per audio minute | `price-scribe-v2` |

A plain job (picture and clip) is about 551 credits; music adds 150 to 450; every redo or variety clip
adds the clip again. The vendor's headline (31 credits, or 33 with piano) is in Everygen credits.

## Time

The clip takes a few minutes; the vendor's export went out 45 s into its turn (WF48-a1
cost_time). The ffmpeg cell, repeat and encode of a 2:25 video at 720p is expected to take seconds to a
few minutes on the Studio machine (unmeasured).
