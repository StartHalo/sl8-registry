# Motion discipline — why only slow, one-move camera work holds the product

The single most important craft rule of this bot: **aggressive camera moves melt
product geometry.** The reachable i2v models have no geometry lock, so the more the
camera (or subject) accelerates, the more freedom the model takes to re-imagine
edges, labels, and shapes. The whole job is *testing velocity* (cheaply spin a few
ad variants from one still), not a hero spot — and a melted clip is worthless for
testing because it misrepresents the product.

## The one rule: ONE slow move, name what stays stable

- **Exactly ONE primary camera move per shot** (and at most one subtle subject move).
  Combining a fast camera move + a fast subject move + a busy scene is the worst case
  — it "almost guarantees jitter and compression artifacts."
- **The move must be SLOW.** Shorter prompts with one clear, slow motion beat long
  prompts stuffed with creative instructions.
- **Name what must remain stable** in the prompt (logo, label, shape, color) — it is
  a prompt *request*, not a guarantee, which is why `video-qc.md` is blocking.

## The SAFE whitelist (the only moves `motion-prompt.py` emits)

| Move | What it does | Use it for |
|---|---|---|
| **push-in** (default) | slow smooth dolly toward the product | the safest move; the testing-velocity default |
| **subtle orbit** | slow partial rotation around the product | a hero reveal that shows dimensionality |
| **gentle pull-out** | slow dolly back to a centered hero frame | a clean end-card / CTA beat |
| **soft light sweep** | camera near-static, a soft light rakes across the surface | reflective/label products where camera motion is risky |
| **static / locked-off** | a slow, almost-still locked frame | the calmest fallback when a move drifts in QC |

`push-in` and `static` are the two safest — they are the re-generation fallbacks when
a clip fails `video-qc.md`.

## The BANNED list (auto-substituted by `motion-prompt.py`, never passed through)

`fast` (unqualified — the most dangerous keyword: it accelerates *everything*),
whip-pan, crash-zoom / snap-zoom, fast spin / fast orbit, camera shake, aggressive
handheld, fly-through. Each is mapped to the closest safe move and the substitution
is recorded in the clip's `*.note.json` so the run is honest about what it actually
asked for.

> Note the naming trap: `bytedance/seedance-2.0/fast/image-to-video` has "fast" in
> the SLUG, but that is the cheap **price tier**, not a camera-speed instruction. The
> camera move stays slow on the fast tier too — never put "fast" in the *prompt*.

## Duration + aspect

- **9:16 vertical** is the default (TikTok/Reels/Shorts). Pass `--aspect-ratio 9:16`.
- **Keep clips short** — 5s is the default (Seedance 4-15s, Kling 3-15s). Short clips
  drift less and cost less; the multi-shot 15s hero arc is the exception and still
  uses one slow move per beat.

## The iteration discipline (the variant fan-out loop)

When fanning out 3-5 ad-test variants, **hold the source frame + the formula constant
and change exactly ONE variable per variant** — never two:

- variant A: camera = `push-in`
- variant B: camera = `subtle orbit`
- variant C: camera = `gentle pull-out`
- variant D: lighting swap (e.g. `golden hour` → `soft studio`), camera held
- variant E: `--multishot` hook-first time-coded arc

Generate the **base clip first, pass it through `video-qc.md`, and only then fan
out** — drift compounds across a set, and you never want to spend on variants seeded
from a clip that already misrepresents the product. Score each variant on identity +
motion safety; keep the winners, drop the rest.

## Why this is honest, not timid

This is a *variant/test* tool, not a film crew. A clean, slow, identity-true clip
that a seller can A/B test is the product; an impressive-but-melted clip is a
liability (returns + a platform "Deceptive Practice" strike). When in doubt, slow the
move down and re-anchor — `push-in` on the real hero beats a dramatic move on an
invented product every time.
