# Pacing: windows, the clip prompt, clip checks and the stitch

SL8-authored. The vendor's pacing table was never served; only the ~23.5 s total for six items
survives (research everygen/rankingvideos-1aa4ce#5, WF49.json risks[3]). The windows below are a
starting proposal that has never been observed.

## Windows
`node ranking.mjs windows --items N [--total T]`. Default for 6 items: 3.5, 3.5, 3.5, 4, 4, 5 s
(23.5 s); for 5: 4, 4, 4.5, 5, 6 s. Windows grow towards #1 and are never all equal. No window is
under 3 s, because the payoff must be visible by second 3: 7 to 9 items default to a longer total
(3.7 s an item, so 25.9 s for 7 and 33.3 s for 9) and `windows` refuses a total that gives a shorter
window. A top 10 is **not offered on this machine yet** (SKILL.md step 3).
- `render` is what the clip is asked for: a bare-integer string `"4"` to `"15"` (never `"4s"`), at
  least 4, and `ceil(window) + 1`, because Seedance 2.0 has returned about 1 s less than asked (facts
  `schema-seedance20-duration`, `beh-seedance-length`). The quote uses `render`.
- After each clip lands, its real length comes from ffprobe. A clip shorter than its window shortens
  that window to the clip (write the new `window` into script.json and say so); never pad, which
  would freeze the last frame.

## The clip prompt (`ranking.mjs params clip`)
In order: the speed lead, who films and what happens, the payoff timing, one clear follow-up, the
steady line, the fal continuity phrases, the motion-realism line, the sound line (audio.md), the text
lock, and a closing "What should not change" clause. Avoidances are written as what the frame shows,
never as a negative list: Seedance has no negative-prompt field (facts `schema-seedance-no-negative`).

## Clip checks (per clip, before the next step)
- Frames at 0 s, 1 s, 2 s, 3 s, the middle and the last second
  (`ffmpeg -v error -ss <t> -i <clip> -frames:v 1 work/<p>/frames/K_<t>.jpg`), viewed: the payoff
  is visible by second 3; real-time speed; steady camera; no doubled, vanishing or flipped object;
  the upper half calm (overlay) or the painted text sharp and unmoved (painted).
- `mediaqc.mjs motion <clip> --control work/<p>/frozen_KK.mp4`: the minimum one-second window is the
  figure, so a clip that freezes or wobbles only mid-clip shows (research
  fal/falvideogeneration-fe0127#51). Build the control from the clip first (media-qc SKILL.md,
  `motion`): `ffmpeg -v error -y -i <clip> -frames:v 1 work/<p>/first_KK.png`, then
  `ffmpeg -v error -y -loop 1 -i work/<p>/first_KK.png -t <clip seconds> -r 30 -pix_fmt yuv420p work/<p>/frozen_KK.mp4`.
  A missing control is exit 3, "not checked", never passed.
- `mediaqc.mjs streams <clip> --audio yes`, then `ranking_media.py cues --clip <clip> --impact <impact_s>`: the boom is the hit nearest
  `impact_s` among the hits after the first 0.15 s (the frame-0 drop of clip 1 is not counted); the
  pop, the boom and the follow-up must all fall before the window ends, because the trim keeps only
  the first `window` seconds and ends the audio at a hard cut.

## People fallback
Seedance has no moderation field (research fal/falvideogeneration-fe0127#21) and has refused a
realistic face (facts `measured-seedance20-face-480p`). A route for people is **not offered on this
machine yet** (SKILL.md step 8).

## Stitch
Per clip, one encode: trim to the window, scale to 720x1280, 30 fps, H.264 CRF 18, AAC 48 kHz stereo,
and on the overlay route the item's overlay PNG in the same encode. Then concatenate in display
order with hard cuts and stream copy. No added audio track, no fades, no captions, no music.
