# i2v discipline — routing, cost, warp-grading, degrade-to-still (BOT-021 · reveals)

Generative i2v is the **optional upsell** on top of the deterministic Ken-Burns spine. Treat every
generated frame as a liability until you have looked at it: the reachable models have **no geometry
lock**, so a "cinematic" clip that bent a wall is worse than no clip at all (it is undisclosed altered
listing media). This file is the operating discipline; the prompts live in `reveal-prompts.md`.

## Model routing (reachable, locked)

| Role | Slug | Notes |
|------|------|-------|
| **default** | `bytedance/seedance-2.0/fast/image-to-video` | native audio (`--audio on`), cheaper, fast |
| **fallback** | `fal-ai/kling-video/v3/pro/image-to-video` | silent, the interior-reveal workhorse |

`gen-clip.sh` tries the default, then the fallback, then (with `--still-fallback`) the deterministic
still-segment. Both models take the real photo as the **start frame** via `--image` (the CLI maps it to
`image_url` — a single URL, not `image_urls[]`).

### Slug discipline (this bites)

- The v2 Seedance namespace is the **bare** `bytedance/seedance-2.0/...`.
- **`fal-ai/bytedance/seedance-2.0/...` 404s** — do not prefix Seedance v2 with `fal-ai/`.
- Kling **does** carry the `fal-ai/` prefix: `fal-ai/kling-video/v3/pro/image-to-video`.
- Seedance has native audio; Kling is silent. The script adds `--audio on` only for Seedance.

## Cost discipline

- i2v is ~**38–400 credits per clip**. Pass `--max-cost 400` (the script enforces it) so a runaway
  generation cannot drain the balance.
- **Never read `credits_used` from the JSON** — it over-reports roughly **8.4×** on i2v. It is not the
  true cost.
- Get real cost from **`ai-gen balance` deltas** (the script snapshots `work/clip/balance-before.txt`
  before generating) or **`ai-gen estimate`** before the run. Billing lags ~5 min, so a same-second
  delta may be slightly low; note that in the log.
- Parse the result file with `python3` — `jq` is absent and `files[]` are **objects**, so read
  `files[0].local_path`. The script does this; if you ever parse by hand, mirror it.
- **fal output URLs expire.** The deliverable is the **downloaded local file**, never the remote URL.
  The script copies `files[0].local_path` to the `--out` path immediately; ship that.

## Vision-grade every clip for warp/melt (mandatory)

The single quality gate. Look at the clip (frames / your vision) and reject any of:

- warping, bending, or rippling walls / windows / doorframes / floors / ceilings
- floating, morphing, or duplicating furniture
- melting or sliding straight lines (window mullions, counters, trim)
- jittery motion or background warp during the move

A clean clip has **rigid geometry and a single slow camera move** — nothing in the scene itself changes.

## Degrade-to-still rule (never silently ship an altered clip)

On **any** failure — model unreachable, over budget, or a warp/melt verdict — degrade, do not block:

1. Re-run **once** with the bounded recipe (push-in is the safest; orbit ≤30°). Some seeds warp, some
   don't.
2. Still warped or still failing → fall back to the **deterministic Ken-Burns still-segment**
   (`scripts/still-segment.sh inputs/<photo> <duration> <out.mp4>`, or re-run `gen-clip.sh` with
   `--still-fallback`, which prints `still-segment\t<out>`).
3. **FLAG it** in the clip log and the `state.md` `reveals` row (model: `still-segment`, verdict:
   `dropped-warp` or `model-failed`). The export still ships — the spine guarantees that — but the
   human sees exactly which inserts are real generated reveals vs. honest still-segments.

Because the still-segment moves only the virtual camera over the real photo, the degrade is always
MLS-safe. The export never blocks on the optional upsell; it just honestly reports what it could and
could not generate.

## Disclosure tie-in

Generated reveals are AI-altered listing media. The final export's first-frame AB-723 card is burned by
`assemble-listing.sh`; when this skill finalizes an export it also routes through `disclosure-stamp`
(`--type virtual-staging`) for the MLS remark + reachable-original note → `artifacts/<listing>/
disclosure.md`. AB-723 (in force 2026-01-01) covers video; willful violation is a misdemeanor + DRE
discipline. See the skill's `## Disclosure` section.
