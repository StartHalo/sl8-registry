# Hero-reference identity lock

The discipline that keeps the product the SAME across every scene: generate the hero
first, approve it, then attach that approved hero as the **exact-product reference** on
every later image. This is the Lumiet "hero-first, maintain-identical-appearance"
chain, adapted to the verified `ai-gen` surface.

## Why this exists (the load-bearing finding)

The reachable fal generative/edit models have **no hard geometry/fidelity lock**.
Live PoC (2026-06-19): re-backgrounding a real product mug with a generative edit
hallucinated a **different product** — a leather luggage tag that kept only the color
and a leaf-logo motif. Identity is therefore held by two things working together:

1. **Language** — the verbatim "maintain its identical appearance" clause (Line 1).
2. **Reference attachment** — the approved hero passed as `--image` (the exact product).

And it is *verified* by a third:

3. **fidelity-qc.py** — a blocking vision compare that catches the cases where 1+2 fail.

Never rely on language alone, and never skip the QC. The luggage-tag swap passed the
model's own success flag; only the QC compare would have caught it.

## The anchor

- The single anchor is `artifacts/<product>/01-hero/hero.jpg` — the approved,
  fidelity-QC-passed, white-bg-compliant hero from phase 1. Every scene re-attaches
  this same file. One anchor, not per-scene re-prompting from scratch.
- A clean **RMBG cutout** (`work/cutout.png`, Bria — pixel-faithful) is the preferred
  `--image` *source* because it composites cleaner (no background to fight). The hero
  is still the fidelity-qc *baseline* — QC always compares the scene to the hero.
- If the hero was held/flagged in phase 1 (its `fidelity-qc.md` did not pass), there is
  **no approved anchor** — stop and re-run phase 1. Compositing off an unapproved hero
  propagates the defect across the whole set.

## The verbatim identity clause (Line 1)

> Using the attached image as the exact product to feature — maintain its identical
> appearance: same color, label, proportions, and material. Do not add, remove, or
> invent any product detail.

- Always the **first** line of the scene prompt; never paraphrased. (`compose-scene.sh`
  passes the prompt file verbatim; the SKILL composes it.)
- "Do not add, remove, or invent any product detail" is the anti-hallucination half —
  it is what discourages the luggage-tag swap.

## `--image` vs `--ref` (don't mix them up)

| Flag | Maps to | Use for | Count |
|---|---|---|---|
| `--image` | singular `image_url` (the proven edit/anchor path, vision-verified 2026-06-19) | the EXACT product (hero/cutout) | exactly 1 |
| `--ref` | multi-reference array | brand-look, logo (style/mark, NOT the product) | 0..many (nano-banana-pro ≤14) |

Putting the product in `--ref` instead of `--image` weakens the lock — the model treats
it as one inspiration among several. Product → `--image`. Look/mark → `--ref`. See
`brand-kit.md`.

## Anti-drift across a set

- Re-attach the SAME hero on every scene; do not chain scene-N off scene-(N-1) (errors
  compound).
- Keep scenes simple (one setting, few props) — complexity invites reinterpretation
  (`scene-presets.md`).
- If a scene drifts, strengthen Line 1 and reduce scene complexity, regenerate ONCE,
  re-QC; still drift → drop + FLAG. Never ship drift to make the set "complete".
- Reflective/metallic/fine-text products are a known low-confidence class — they will
  often land `review`. That is correct: the bot flags, it does not certify.

## Relationship to the white-bg path (do not cross the streams)

This skill is **generative** (lifestyle scenes — synthetic backgrounds are fine). The
**compliant Amazon main image** is the *deterministic* path: Bria RMBG (preserve the
real pixels) → Pillow flatten to exact RGB(255,255,255). **Never** use this generative
path to re-background the seller's real product for the compliant main image — that is
exactly the operation that hallucinated the luggage tag. Generative = lifestyle +
alternate angles (value-add, QC-gated); deterministic = the compliant main image.
