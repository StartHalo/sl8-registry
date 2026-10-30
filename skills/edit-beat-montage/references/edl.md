# EDL and render numbers

The edit decision list (`work/<p>/edl.json`) is the one record of the edit: `render.py` draws the
picture from it, `mix_master.py` builds the sound from it and `verify.py` checks the master against
it. Field names follow the source method's EDL (WF27-a1 step 10); fields marked **SL8** are
additions this machine needs (delta VID-D314). Wording here is SL8's.

## Contents
- [Header](#header)
- [shots](#shots)
- [flashes, text and lines](#flashes-text-and-lines)
- [Render numbers](#render-numbers)
- [Example](#example)
- [Plain route](#plain-route)

## Header

| Field | Meaning |
|---|---|
| `w`, `h` | Output size in pixels, both even. Default: the footage's (or reference's) shape at its own size, 1080x1920 for a vertical edit; a brief may name a platform size |
| `fps` | Output frame rate, constant. Default 30; every clip is decoded at this rate, so phone footage with a variable rate still lands on whole frames |
| `total_frames` | The edit's length. It ends on a bar line: take it from `timeline.bar_frames` in `beats.json` |
| `audio` | The track file (`work/<p>/track.wav`) |
| `audio_in` | **SL8.** Seconds into the track where the edit starts: `timeline.audio_in` (the entry bar) |
| `styles` | **SL8.** Named title looks: `{"title": {"font": "Anton", "color": "#FFFFFF"}}`; `file` may give a font path instead of a family; `case` is `"upper"` (default: the heavy condensed look) or `"as-is"` to draw each `word` as written |
| `off_grid` | **SL8.** Optional `[{"f": 77, "why": "vocal hit"}]`: a shot start off the beat grid on purpose; `render.py --check --beats` and `verify.py --beats` accept it |
| `render` | **SL8.** Optional overrides of the render constants (`bright`, `trail`, `pop_frames`, `grain`, `contrast`, `tau`, `shake_tau`, `zoom_strength`, `whip_frac`, `stroke`, `tshake_tau`, `s_curve`), for example `{"render": {"bright": 0.5, "grain": 0.01}}` |

## shots

Shots are contiguous: the first starts at frame 0, each starts where the last ended, the last ends
at `total_frames`. `render.py --check` refuses anything else.

| Field | Meaning | Default |
|---|---|---|
| `start_f`, `end_f` | Timeline frames, end exclusive | required |
| `src` | Source clip, or a still image (a photo shown with motion) | required |
| `in` | Seconds into `src` | 0 |
| `cx`, `cy` | Centre of the crop, as fractions of the source picture | 0.5, 0.5 |
| `zoom` | 1 is the largest crop of the output's shape that fits the source; 1.25 or more hides bars or a logo; up to 1.75 to lose a second face | 1 |
| `speed` | Playback speed; under 1 is slow motion | 1 |
| `interp` | Motion-interpolated slow motion (`minterpolate`, mode `mci`); slow to render | `speed < 1` |
| `punch` | A zoom kick at the shot's start that dies away: zoom adds `punch · e^(−k/tau)` at frame k | 0 |
| `push` | A steady push: zoom adds `push · k/n`, n = the shot's frame count | 0 |
| `shake` | Shake amplitude in pixels, dying away | 0 |
| `tau` | **SL8.** Frames for the punch to fall to 37% | 4 |
| `tin`, `tout` | Transition at the shot's start or end: `{"type": "zoom" or "whip", "f": 2 or 3, "dir": "left", "right", "up" or "down"}` | none |
| `lv` | Levels: `"auto"`, `"night"` (headlights in the frame), `"off"`, or `{"lo", "hi", "gain", "gamma"}` | `"auto"` |
| `bw` | **SL8.** Black-and-white treatment for this shot | false |

## flashes, text and lines

- `flashes`: `{"<frame>": amount}`, the frame pushed toward white by `amount` (0 to 1).
- `text[]`: one word or a short group per entry, each inside a single shot.

  | Field | Meaning | Default |
  |---|---|---|
  | `word` | The text, as spoken (never song lyrics); drawn in capitals unless the style says `"case": "as-is"` | required |
  | `f0`, `f1` | Frames on screen, `f0 < f1`, inside one shot | required |
  | `cap` | Height of a capital letter as a fraction of `h` | 0.06 |
  | `cx`, `cy` | Centre, as fractions; spoken lines sit under the face, `cy` 0.82 to 0.88 | 0.5, 0.85 |
  | `pop` | Entrance overshoot, 0.15 to 0.25 | 0.2 |
  | `tshake` | Pixels of jitter on a stressed word, 6 to 10 | 0 |
  | `squeeze` | Width factor; 0.8 makes a bold face read as condensed caps | 1 |
  | `weight` | `regular`, `bold`, `heavy` | `bold` |
  | `max_w` | Widest the word may be, as a fraction of `w` | 0.9 |
  | `style` | A key of `styles` | `title` |
  | `stroke` | **SL8.** Same-colour outline as a fraction of cap height, 0.035 to 0.055 | 0.045 |

- `lines[]` (**SL8**): spoken lines to be heard over the track, `{"src", "in", "out", "f"}`: seconds
  in the source clip and the timeline frame where the line starts; at least 0.4 s long; not on a
  shot whose `speed` is not 1. Get `text[]` and `lines[]` entries from
  `words.py place`, which applies the one conversion, for a word at clip time t in a shot with
  `start_f`, `in` and `speed`: `f = start_f + round((t - in) / speed * fps)`.
- A word that runs over a cut is two entries with the same `word`, one per shot, for example
  `{"word": "STOP", "f0": 54, "f1": 60}` and `{"word": "STOP", "f0": 60, "f1": 69}`; or move the cut
  to a beat clear of the word.

## Render numbers

"Recorded" values come from the source method (WF27-a1 step 11 parameters); "assumed" values are
SL8's where the method gives none (delta VID-D316, learnings VID-L301). All are defaults: a kit or
brief may set others through the EDL fields above.

| Stage | Value | Kind |
|---|---|---|
| Decode | `crop,scale,[setpts=PTS/speed,][minterpolate=fps=F:mi_mode=mci,]fps=F`, raw RGB into numpy (crop and scale first: interpolation then works on the output-sized picture; the levels pass never interpolates; `--no-interp` blends instead) | recorded, order adjusted |
| Auto levels | `lo` = 1st percentile, `hi` = 99.5th percentile of luma, from every third frame of the shot | recorded |
| | gain = min(2.6, target / (hi − lo)); target 0.95, or 0.88 when the median luma is under 0.10 (then gamma 0.85) | recorded |
| | `night`: `hi` = 96.5th percentile, gain cap 3.4, gamma 0.72 | recorded |
| Black and white | Y = 0.299R + 0.587G + 0.114B, levels, contrast 1.12 about mid-grey | recorded |
| | soft S-curve: 30% blend toward 0.5 − 0.5·cos(πY) | assumed |
| | grain: Gaussian, sigma 2.5/255, drawn at half size and doubled | recorded |
| Punch, push | formulas above; `tau` 4 frames, `n` = shot length | formula recorded, constants assumed |
| Shake | random offset per frame, amplitude falling as e^(−k/6) | assumed |
| Zoom transition | mean of 12 copies at scales from 1 to 1 + 0.18·r (r rises to 1 at the cut) over `f` frames | 12 copies recorded, 0.18 assumed |
| Whip | shift up to 12% of the frame side at the cut, box blur along the shift as wide as the shift | blur recorded, 12% assumed |
| No empty edges | zoom at least 1 + 2.2·shift / the shorter side (VID-D311) | recorded, adjusted |
| Titles | face loaded by name and proved with `fc-list`; never a fallback face | recorded |
| | over a bright patch (mean luma above 0.6 under the word): soft shadow (blur 16% of cap height, 62% opacity) and glow (blur 7%, 32%) | values recorded, 0.6 and opacity reading assumed |
| | pop over 3 frames, a 2-frame trail at 35% and 15% | trail recorded, 3 frames and opacities assumed |
| | `tshake` falling as e^(−age/8) | assumed |
| Encode | libx264 `slow`, CRF 16, yuv420p, BT.709 matrix and tags, once (VID-D313) | recorded |

## Example

```json
{"w": 1080, "h": 1920, "fps": 30, "total_frames": 480, "audio": "work/p/track.wav", "audio_in": 12.4810,
 "styles": {"title": {"font": "Anton", "color": "#FFFFFF"}},
 "shots": [
  {"start_f": 0, "end_f": 60, "src": "artifacts/p/source/clip1.mp4", "in": 3.2, "cx": 0.46, "cy": 0.4, "zoom": 1.3,
   "punch": 0.1, "tout": {"type": "whip", "f": 3, "dir": "left"}},
  {"start_f": 60, "end_f": 90, "src": "artifacts/p/source/clip2.mp4", "in": 7.0, "push": 0.08, "lv": "night",
   "tin": {"type": "whip", "f": 3, "dir": "left"}},
  {"start_f": 90, "end_f": 480, "src": "artifacts/p/source/clip1.mp4", "in": 9.5, "speed": 0.5, "bw": true}],
 "flashes": {"60": 0.7, "61": 0.3},
 "text": [{"word": "NEVER", "f0": 8, "f1": 40, "cy": 0.85, "pop": 0.2, "tshake": 8, "squeeze": 0.8}],
 "lines": [{"src": "artifacts/p/source/clip1.mp4", "in": 3.4, "out": 4.6, "f": 6}]}
```

## Plain route

`render.py <edl> --plain --out work/<p>/video.mp4` builds one ffmpeg filter graph from the same
shots: seek, speed, constant frame rate, crop, scale, trim to the shot's frame count, concat. It
keeps the beat timing and the framing and drops levels, black and white, motion, transitions,
flashes and titles. Use it for a job that only needs cuts on the beat, or when the frame renderer
cannot be made to work; a titled brief told so first.
