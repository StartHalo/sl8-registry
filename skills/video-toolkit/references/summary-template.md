# `summary.md` template — the per-project honesty record

Every video bot's `deliver` stage writes `artifacts/<project>/summary.md` from this
template. It is the user-facing account of **what was actually produced, how, and what
was compromised** — the disclosure contract. Copy it, fill every field, never drop a
field to hide a FLAG.

```markdown
# <Project title> — delivery summary

**Deliverable:** `episode.mp4` (<duration>s, <WxH>, <aspect>)
**Verdict:** <PASS | FLAG — reason(s)>
**Date:** <YYYY-MM-DD>

## How it was made
- **Model / recipe:** <model id> via <recipe name> (one model, one recipe — by design)
- **Seed kit:** <kitType> @ seed <N> (style: <style.md one-liner>; identity: <identity.md one-liner>)
- **Shots / scenes / beats:** <count>, planned at <durations>
- **Audio:** <native model audio | ADDED brown-noise ambient bed at -38dB (NOT native) | none>
- **Assembly:** <concat (assemble.sh) | zero-concat extend (verify.sh grew)>

## Cost
- **Estimated (pre-flight `ai-gen estimate`):** <credits> cr (~$<usd>)
- **Measured (`ai-gen balance` delta):** <credits> cr (~$<usd>)  <!-- billing lags ~5 min -->
- NOTE: per-call `credits_used` is unreliable and is NOT used here.

## What was compromised / fell back (be specific)
- <e.g. "scene 3 fell back to a silent still-segment after 2 Hailuo failures — see state.md">
- <e.g. "generative lifestyle angle dropped by fidelity QC; only the pixel-faithful white-bg kept">
- <"none" if truly clean>

## Reproduce / iterate
- Seed kit lives at `artifacts/seed/` — run `<bot>-update-seed` to change the look for
  future projects (this project used a snapshot at `artifacts/<project>/seed-snapshot/`).
- Re-run: `<bot>-make-video` resumes from `state.md`.
```

## Rules

- **Disclose added audio.** If `assemble.sh` ran with `--roomtone always` (or `auto`
  resolved to ON), the audio is an *added ambient bed*, not native — say so explicitly.
- **Report every FLAG.** A FLAG verdict from `verify.sh`/`assemble.sh` goes in **Verdict**
  AND **What was compromised**, in plain language.
- **Cost is estimate + measured delta**, never `credits_used`.
- **Name the seed snapshot** so the project stays self-contained and reproducible.
