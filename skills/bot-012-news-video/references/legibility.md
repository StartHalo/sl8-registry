# Legibility & pacing (for the storyboard + sanity checks)

The engine enforces most of this in code (`engine/tokens.ts`, `engine/SafeZone.tsx`, `engine/pacing.ts`); this is the human-facing summary so your `02-storyboard.md` timings are right. Source: `research/domain-analysis.md` §6.

## Safe zones (engine-enforced via SafeZone)
| Aspect | Frame | Top | Bottom | Sides | Why |
|---|---|---|---|---|---|
| 9:16 | 1080×1920 | ~220 | ~280 | ~64 | bottom rail (caption + buttons) eats ~15% |
| 16:9 | 1920×1080 | ~90 | ~110 | ~120 | lower-thirds + scrubber |
| 1:1 | 1080×1080 | ~96 | ~120 | ~80 | feed UI crops top/bottom |

## Minimum font sizes (at the 1080 short edge)
- Headline / hero ≥ **56px** · body beat ≥ **36px** · credit/dateline ≥ **28px** (never smaller). The engine's `size()` clamps to these floors.

## Pacing (drives the storyboard frame ranges)
- Per-beat seconds ≈ `max(0.8, words / 2.5)` — budget ~2.5 words/sec, 0.8s floor so even a one-word beat reads.
- Capacity: a **5s** video holds ~**3–4 beats**; **10s** ~5; **15s** ~5–6 + an end credit. `beatsThatFit()` trims from the BOTTOM of the pyramid (drops trailing beats, never the lede).
- 30 fps: 5s=150 frames, 10s=300, 15s=450.
- Kinetic reveals word-by-word but the whole beat still clears its min dwell before swapping (fast reveals, not fast disappearance).

## Contrast
Light text on dark (or dark on a solid color block); always a scrim/plate behind text, never raw over busy imagery. ≤2 lines, ≤~32 chars/line per beat — one idea per card.
