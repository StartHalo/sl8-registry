# Video picks, dated

Which endpoint serves which intent, with the evidence for each choice. **Picks are judgements, not
facts** (D2c C9): each row carries the date it was set, what fal's own skill said, and what SL8's
runs measured. The routing table in `SKILL.md` is the snapshot of the `primary` and `fallback` rows
below; this file is where a pick changes, as a new dated row, never as a silent edit.

Every id below resolved against fal's live OpenAPI on 2026-10-05 and again on 2026-10-06, except
the rows marked gone. Fields and prices per route are in [endpoints.md](endpoints.md); every
number has a dated row in [facts.md](facts.md).

## Contents

- [How to read a row](#how-to-read-a-row)
- [Generation](#generation)
- [Edit, extend, upscale, reframe, sound](#edit-extend-upscale-reframe-sound)
- [Release checks (as of 2026-10-08)](#release-checks-as-of-2026-10-08)
- [Unproven on SL8 (as of 2026-10-05)](#unproven-on-sl8-as-of-2026-10-05)
- [Rejected or gone](#rejected-or-gone)

## How to read a row

- **D2 said:** fal's video-generation skill as exported 2026-10-05, by line (`VG:n`; its pristine
  copy is in the repo's `studio/media-upstream/fal-agent/` store, not on this machine). The skill carries no date of
  its own; "every row was checked against a live schema" (VG:167).
- **SL8 evidence:** T3 (`T3-sl8-prior-art.md`) by fact number or section, and D2c
  (`D2c-facts-ledger.md`) by row, both in the 2026-10-05 media research program (sl8-pipeline repo,
  `docs/explore/`). "No SL8 run" means nobody here has measured it.
- **Status:** `primary` · `fallback` · `escape` (fal's cross-family route for a family-wide outage
  or a missing capability) · `alternate` (verified id, use when the brief names it or both picks
  fail) · `unproven on SL8 (as of 2026-10-05)` (provider currency, never a primary until a paid
  test) · `rejected` · `gone`. `primary for that content` overrides the intent's primary for
  the content the row names (a moderation-sensitive frame, a realistic face).
- **Release check:** whether a release build of this machine has produced a clip on the route,
  and which check keeps measuring it; see [Release checks](#release-checks-as-of-2026-10-08).

## Generation

| Intent | Endpoint | As of | D2 said | SL8 evidence | Status |
|---|---|---|---|---|---|
| Text to video | `bytedance/seedance-2.0/text-to-video` | 2026-10-05 | primary: "Widest aspect enum in the table and the only primary reaching 4k" (VG:171) | Seedance 2.0 was SL8's routing default (T3 §3, `video-models.md`, 2026-06-25 to 07-22); one proxy quote, 378 cr for 5 s 720p (P1) | primary |
| Text to video | `bytedance/seedance-2.0/fast/text-to-video` | 2026-10-05 | fallback: "the same grammar at 720p for a fraction of the spend" (VG:171) | fails above 12 s at 480p and 10 s at 720p (T3 #17) | fallback |
| Text to video | `fal-ai/kling-video/v3/pro/text-to-video` | 2026-10-05 | cross-family escape for text (VG:207-208) | Kling multi-shot is SL8's dead end, one star of five (T3 §3, `do-not-use.md:32`; D2c C9); single-shot text not measured | escape (contested) |
| Text or image, moderation-sensitive (photoreal person, gore-adjacent) | `fal-ai/veo3.1/fast` · `/image-to-video` | 2026-10-05 | "send moderation-sensitive frames to Veo 3.1 Fast from the start" (VG:190-196) | SL8 routes photoreal faces to Veo too (T3 §3, `character-consistent-multishot.md:41-43`) | primary for that content |
| Draft of an unproven concept | `fal-ai/veo3.1/lite` | 2026-10-05 | the draft lane, 720p silent (VG:105-110) | no SL8 run; Veo's grammar, not Seedance's | alternate (draft) |
| Image to video | `bytedance/seedance-2.0/image-to-video` | 2026-10-05 | primary: "Holds the source frame's look … the aspect is settable" (VG:172) | returned 4.06 s for a 5 s ask, twice (T3 #15) | primary |
| Image to video | `bytedance/seedance-2.0/fast/image-to-video` | 2026-10-05 | fallback (VG:172) | a 4 s 480p clip cost 108 cr (T3 #30); tier ceiling 12 s / 10 s (T3 #17) | fallback |
| Image to video | `bytedance/seedance-2.0/mini/image-to-video` | 2026-10-05 | "their `/fast/` and `/mini/` siblings" (VG:232-233) | no SL8 run; the cheapest Seedance tier (18 cr/s at 480p) | alternate |
| Image to video | `minimax/h3/image-to-video` | 2026-10-05 | cross-family escape for supplied-input routes (VG:208-209) | no SL8 run; 5–15 s only; prompts in H3's grammar (media-h3-prompter) | escape |
| Image to video, realistic face at 480p, or at 720p for a length Veo cannot render (5, 7, 9–15 s) | `minimax/h3/image-to-video` | 2026-10-08 | cross-family escape for supplied-input routes (VG:208-209) | supersedes "no SL8 run": validation pack VV1 (2026-10-06, sl8-video `6d9b42c8`) asked for the default route at 480p; `bytedance/seedance-2.0/image-to-video` refused the realistic portrait (HTTP 422, exit 7) and H3 at `480P` delivered the 5 s clip for 63 cr (VID-L102). Veo, the face route above, has no 480p and renders only 4, 6 or 8 s; it keeps 720p at those lengths and everything above 720p. `768P` at 720p is unmeasured on SL8. After a refusal here: Veo 3.1 Fast at 720p (SKILL.md) | primary for that content |
| Image to video, first and last frame | `minimax/h3-max-turbo/image-to-video` | 2026-10-08 | not routed by fal's skill | VID-T5 passed twice (2026-10-06, sl8-video `f70fa45c` and `6d9b42c8`): two 5 s clips at `768P` with a start and an end frame, each billed 30 cr against an `ai-gen estimate` of 19 (the estimate takes no media flags; VID-L100). The 30 cr bill is promotional: the 40% promotion on the H3-Max family ends 2026-10-15, after which quote 50 per 5 s (30 / 0.6) until it is measured again | alternate (proven) |
| First and last frame | `bytedance/seedance-2.0/image-to-video` + `end_image_url` | 2026-10-05 | primary: "add the optional `end_image_url`" (VG:173) | verified at R10, and it also interpolates wall colour (T3 #26) | primary |
| First and last frame | `blackforestlabs/flux-3/first-last-frame-to-video` | 2026-10-05 | fallback: "when both ends must be *required*, or past 15s" (VG:173) | no SL8 run | fallback |
| First and last frame | `fal-ai/veo3.1/fast/first-last-frame-to-video` | 2026-10-05 | listed with the Veo block (VG:263) | no SL8 run; its frame fields take no ai-gen media flag | alternate |
| Reference to video | `bytedance/seedance-2.0/reference-to-video` | 2026-10-05 | primary: three separate arrays (VG:174) | `@Image1` follows `--ref` order (T3 #20); SL8 once routed fast r2v first (T3 §3) | primary |
| Reference to video | `bytedance/seedance-2.0/fast/reference-to-video` | 2026-10-05 | fallback (VG:174) | as above | fallback |
| Reference to video | `minimax/h3/reference-to-video` | 2026-10-05 | cross-family escape (VG:208-209) | no SL8 run | escape |
| Reference to video | `fal-ai/veo3.1/fast/reference-to-video` | 2026-10-05 | 8 s only (`const`) (VG:275-281) | no SL8 run | alternate |

## Edit, extend, upscale, reframe, sound

| Intent | Endpoint | As of | D2 said | SL8 evidence | Status |
|---|---|---|---|---|---|
| Restyle footage | `decart/lucy-edit/pro` | 2026-10-05 | primary: "Purpose-built video edit" (VG:175) | no SL8 run | primary |
| Restyle footage | `fal-ai/luma-dream-machine/ray-2/modify` | 2026-10-05 | fallback: "Ray adds adherence control" (VG:175) | no SL8 run; no published price | fallback |
| Extend a clip | `fal-ai/ltx-2.3/extend-video` | 2026-10-05 | primary: "Only route that honours an arbitrary length" (VG:176) | no SL8 run | primary |
| Extend a clip | `fal-ai/veo3.1/fast/extend-video` | 2026-10-05 | fallback, Veo-sourced clips only, +7 s at 720p (VG:176, 283-301) | returns the full grown video; chain capped at 30 s (T3 #25) | fallback |
| Upscale | `fal-ai/topaz/upscale/video` | 2026-10-05 | primary: "Per-second billing is predictable; 19 restoration models" (VG:177) | no SL8 run; fal no longer lists a price for this id (D2c row 77) | primary (price stale) |
| Upscale | `fal-ai/seedvr/upscale/video` | 2026-10-05 | fallback, billed per megapixel (VG:177) | no SL8 run | fallback |
| Reframe to a new aspect | `fal-ai/ltx-2.3/reframe` | 2026-10-05 | primary: "Needs no prompt" (VG:178) | no SL8 run | primary |
| Reframe to a new aspect | `luma/agent/ray/v3.2/reframe` | 2026-10-05 | fallback: adds `3:4`, `4:3`, `21:9`, drops `4:5`, `5:4` (VG:178) | no SL8 run; source 10 s or less (OA) | fallback |
| Add sound to a clip | `sonilo/v1.1/video-to-video-sound-effects` | 2026-10-05 | primary: "Returns a muxed video" (VG:179) | no SL8 run | primary |
| Add sound to a clip | `fal-ai/kling-video/video-to-audio` | 2026-10-05 | fallback, flat price (VG:179) | no SL8 run; car-chase defaults confirmed in the schema (D2c row 81) | fallback |

## Release checks (as of 2026-10-08)

A pick is a judgement until a release build of this machine has produced a clip on it. This
table lists the routes that have, and the check that keeps measuring each one. **Every route
not listed, or listed as `unproven on SL8`, has no clip on a release build.** That is evidence,
not a ranking: the routing table in SKILL.md and its content rule still choose the route, primary
first, then the named fallback; an `alternate` is still used only when the brief names it or both
picks fail. A release check breaks a tie only, between two routes the table ranks the same for the
job. Say in the delivery note which route you used and whether it is release-checked.

| Intent | Endpoint | Release check | Evidence |
|---|---|---|---|
| Image to video, 480p, 5 s, non-face subject | `bytedance/seedance-2.0/image-to-video` | release-checked (VID-T8) | VID-T8 makes one direct call on every Video release build from 1.0.1, ceiling 180 cr, and measures the clip (H.264, about 5 s, 480p) and its bill |
| Image to video, realistic face at 480p, or at 720p for a length Veo cannot render | `minimax/h3/image-to-video` | measured once (validation pack VV1, Video 1.0.0) | 63 cr for 5 s at `480P`; `768P` unmeasured |
| Image to video, first and last frame | `minimax/h3-max-turbo/image-to-video` | measured (VID-T5, Video 1.0.0) | 30 cr per 5 s clip at `768P`, a promotional bill until 2026-10-15 |
| Text or image to video, moderation-sensitive, at 720p for 4, 6 or 8 s or above 720p (the face route there) | `fal-ai/veo3.1/fast` · `/image-to-video` | unproven on SL8 | no clip on a release build; SL8's evidence is earlier routing only (T3 §3) |
| Text to video | `bytedance/seedance-2.0/text-to-video` | unproven on SL8 | one proxy quote only (378 cr for 5 s at 720p, P1) |
| First and last frame (Seedance), reference to video, restyle, extend, upscale, reframe, sound | the primaries and fallbacks above | unproven on SL8 | no clip on a release build |

## Unproven on SL8 (as of 2026-10-05)

Live ids P1 read on 2026-10-05 that fal's skill does not route. None is a primary until a paid
test; use one when the brief names it, and pin its own dialect (P1 §1).

| Endpoint | What is different | Source |
|---|---|---|
| `bytedance/seedance-2.5/{image,text,reference}-to-video` | 4–30 s, no 4k, `draft` preview finished within 7 days, i2v aspect locked to the source, no `/fast/` or `/mini/`; 118 cr/s at 720p | P1 §1, §4.12; D2c rows 14–17 |
| `alibaba/wan-3.0/{image,text}-to-video` | audio switch is `audio`, not `generate_audio` (ai-gen's `--audio` misses it); defaults to 1080p; integer 2–30 s | P1 takeaway 3, §4.2 |
| `minimax/h3-max/image-to-video` | number 0.92–15 s (output up to +0.7 s); `prompt_expansion_mode` required; 40% promotion ends 2026-10-15. Its `h3-max-turbo` sibling left this table on 2026-10-08 (proven by VID-T5; see Generation) | P1; D2c row 59 |
| `fal-ai/kling-video/o3/standard/image-to-video` | `prompt` or `multi_prompt`; `generate_audio` defaults false; billing and prose prices disagree | P1 §4.7; D2c row 45 |
| `xai/grok-imagine-video/image-to-video` · `google/gemini-omni-flash/image-to-video` · `alibaba/happy-horse/v1.1/image-to-video` | no audio switch; integer durations (1–15, 3–10, 3–15) | P1 §1 |
| `veed/fabric-1.0` | lip-sync from an image plus audio, no prompt; bills per second of audio | P1 §1 |

## Rejected or gone

| Endpoint | Status | As of | Evidence |
|---|---|---|---|
| `bytedance/seedance-2.5/fast/*`, `bytedance/seedance-2.5/mini/*` | gone (never existed): 404 | 2026-10-06 | OA; D2c row 16, C2 |
| `fal-ai/bytedance/seedance-2.0/*` | gone: the prefixed form 404s, the bare `bytedance/…` id serves | 2026-10-05 | D2c row 1 |
