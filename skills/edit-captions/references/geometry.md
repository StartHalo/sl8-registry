# Caption geometry and hold timing

The numbers `scripts/burn_captions.py` uses, in our words, from the burner behaviour WF24-a1 records
(steps 10, 11, 14 and 16). Every number is a default: a flag, a kit or a brief may set another. `H` is
the frame height, `W` its width; portrait means `H > W`.

| Look | Face (font key) | Size | Bottom | Label width | Shrink to fit |
|---|---|---|---|---|---|
| bold | TikTok Sans Bold (`tiktok`) | 4.6% of H | 17% of H | 85% of W landscape, 77% portrait | ×0.94 steps down to 14 px |
| paper | Patrick Hand (`patrick`) | 3.2% of H | 10% landscape, 17% portrait | 72% of W | ×0.9 steps down to 12 px |
| clean | TikTok Sans Bold, libass | Fontsize 13 at libass PlayResY 288 (about 4.5% of H) | MarginV 34 (about 12%) | libass wraps | none |
| faceless profile | Montserrat ExtraBold (`montserrat`), stroke 0.045 | 4.6% of H, floor max(14 px, 2% of H) | 17% portrait, 10% landscape or square | 70% portrait, 82% landscape | ×0.94 |
| safe profile (clearance) | Montserrat ExtraBold, stroke 0.045, original case; UGC Metropolis, 2.604% of H, stroke 0.12 | 2.6% of H, floor max(14 px, 2% of H) | searched: [clearance.md](clearance.md) | 70% of W | ×0.94 |

- **One size per video.** The burner fits the longest caption and uses that size for every cue.
- **Lines.** At most two, split where the two halves are closest in width. `--single-line` (and the
  faceless profile) shrinks instead of stacking.
- **Stroke.** Bold: a black outline of 0.07 × the font size (`--stroke-frac`); `--no-outline` removes
  it and draws a blurred shadow. Paper has no outline. Clean: outline 2, shadow 1, white fill.
- **Case.** Bold and clean are uppercased in Python (Unicode-correct, so accents and Cyrillic survive);
  `--no-caps` keeps the original case. Paper and faceless keep the original case.
- **Paper label.** A cream scrap (245, 241, 231) with rough edges, light fibre noise and a blurred
  drop shadow; ink (38, 32, 28).
- **Glyphs.** Before rendering, every distinct letter of the caption text is drawn in the
  chosen face and compared with the face's missing-glyph shape. A face that misses any falls back
  in the order montserrat, anton, caveat, noto, with a warning; none covering it exits 2. A variable
  face is set to its ExtraBold or Bold instance when it has one.
- **Refusals.** A label wider than the frame at the minimum size is refused (re-chunk it). In the
  faceless profile, a label reaching above 60% of the frame height is refused.
- **Rotation.** A phone video flagged as rotated is laid out on its displayed size, not its coded one.
- **Clean refusal.** `--marginv` 90 or more lifts captions towards mid-frame and is refused.

## Hold timing (bold and paper, default profile)

| Flag | Default | Meaning |
|---|---|---|
| `--bridge` | 1.0 s | If the next caption starts within this gap, hold until it appears (continuous speech) |
| `--tail` | 0.6 s | Otherwise keep the caption this long after its last word (a real pause) |
| `--min-dur` | 1.2 s | Shortest time a caption stays up, unless the next one starts first |
| `--max-dur` | 3.5 s | Longest hold, never cutting the caption's own speech (except the `--gap` before a caption that starts within it) |
| `--gap` | 0.06 s | Blank between a caption and the next |

The faceless and safe profiles show each caption exactly for its speech: no bridge, tail or
minimum (for the safe profile this keeps the shown interval the reviewed one).
These are defaults (a kit or brief may set others). A sibling vendor caption tool used 0.35 s bridge,
0.15 s tail and 0.20 s minimum; which set reads better is open (learnings VID-L324).

## Render

Each caption is a transparent PNG laid over the clean master with ffmpeg `overlay`, shown from its
start up to, not including, its end (`gte(t,start)*lt(t,end)`, so abutting cues never share a frame);
the graph goes to ffmpeg as a script file, so a long video does not hit a
command-line limit. Video: libx264, preset veryfast, CRF 20, yuv420p, faststart. Audio: copied, never
re-encoded.
