# Stage 5 — assemble (ZERO-CONCAT passthrough)

The contract stage is `assemble`, but this recipe is **zero-concat**: Veo's `extend-video`
returns the FULL grown video each hop, so `gen-extend.sh` already produced the single
`episode.mp4` at stage 4. **This bot does NOT call `assemble.sh`** — there is nothing to
normalize or concat. This stage is a recognized passthrough that records the fact and hands
the duration gate to stage 6.

**Reads:** `artifacts/<slug>/episode.mp4` (the whole grown take), the stage-4 recipe JSON.
**Writes:** nothing (passthrough) — only the ledger advances.

---

## Step 1 — Confirm the single grown file exists

The extend chain wrote `artifacts/<slug>/episode.mp4` directly (the final hop's full video, or
the last-good extended video on a shortfall). Confirm it exists and is non-empty:

```bash
[ -s artifacts/<slug>/episode.mp4 ] && echo "episode present — zero-concat" || echo "MISSING — stage 4 did not produce an episode"
```

If it is missing, stage 4 did not complete (a base failure) — do **not** invent an MP4; return
to stage 4's failure triage and mark the project `blocked`.

## Step 2 — Record "no concat" (the load-bearing architecture fact)

There is **no assembler invocation, no ffmpeg concat, no caption card, no room-tone bed**:

- **No concat** — `extend-video` returned the whole video; the episode is a single file the
  model returned grown, not a stitch of clips. (This is the difference from the Seedance/Kling
  siblings, which concat per-shot clips.)
- **No added audio** — the take carries **native** Veo audio throughout (`generate_audio`
  default-on); never add a brown-noise bed (that would double up).
- **No re-encode** — the file is delivered as Veo returned it.

This is exactly why the toolkit call at the next stage is `verify.sh --mode grew` (a duration
gate proving the take grew past its base), **not** `assemble.sh`.

## Step 3 — Advance the ledger

Mark stage 5 `done` (note "zero-concat passthrough — extend returned the whole video; no
assemble.sh"), set stage 6 `verify` `in-progress`. Update the dashboard "Extend hops (no
concat)" row to `✓ done — <final>s, no concat`. Update `next_action`:
"Stage 6 verify — .claude/skills/video-toolkit/scripts/verify.sh artifacts/<slug>/episode.mp4 --mode grew --base
<base_dur_s from stage 4> --route veo-extend; FLAG → record + still deliver."
