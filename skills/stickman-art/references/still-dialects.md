# Still Generation Dialects — stickman-art

Reference for model-specific behaviour in phase 2 (character lock) and phase 3 (stills).
Read this file when a model behaves unexpectedly or when walking the fallback chain.

---

## Model chain (pinned — never improvise out-of-chain)

### Stills chain (phase 3)
1. `fal-ai/nano-banana-pro` — primary (ref-capable via `--image`)
2. `fal-ai/flux-dev` — fallback (ref-blind; drop `--image`)
3. `fal-ai/stable-diffusion-v35-large` — last resort (ref-blind)

### Text/source chain (phase 2 — source.png generation)
1. `fal-ai/nano-banana-pro` — primary (best text rendering + ref-capable)
2. `fal-ai/ideogram/v3` — fallback (text fallback; ref-blind; no seed support)

---

## Nano Banana Pro (fal-ai/nano-banana-pro)

**Strengths:** multi-reference composition (up to 14 refs), text rendering, ref-capable
via `--image`.

**CRITICAL — no negation:** Nano Banana Pro is a Gemini-family model. Negation breaks it.
- ❌ WRONG: "No color, no photorealism, no text" → model ignores or misinterprets
- ✅ RIGHT: "Monochrome graphite on white paper only. Single figure, one readable action
  per frame. Minimal sparse environment."

Use POSITIVE framing for ALL constraints. The [5-CONSTRAINTS] block must be written
in positive terms (what TO do, not what NOT to do).

**Reference flag:** `--image <hosted-url>` passes the character-source.png as a reference.
The hosted URL (fal.media) must be used — local paths do not work via the CLI.

**Seed:** `--seed <N>` is supported. Use the seed from character-spec.md for every still
in the same episode.

**Size:** `-s landscape_16_9` for 16:9; `-s portrait_16_9` for 9:16; `-s square_hd` for
character source images.

---

## FLUX Dev (fal-ai/flux-dev)

**Use when:** nano-banana-pro fails or is unavailable.
**Ref:** BLIND — drop `--image` when falling back to flux-dev.
**Positives:** strong sketch style reproduction even without a visual reference.
**Negatives:** no seed support; character may drift between stills.
**Note:** character consistency drops significantly without `--ref`; expect 10–20% drift.
Flag any drift in stills-log.md.

---

## Stable Diffusion v3.5 Large (fal-ai/stable-diffusion-v35-large)

**Use when:** both nano-banana-pro and flux-dev fail.
**Ref:** BLIND.
**Last resort only.** Quality and style consistency are lowest in the chain.
Always flag in stills-log.md when this model is used.

---

## Ideogram v3 (fal-ai/ideogram/v3)

**Use when:** generating source.png and nano-banana-pro fails.
**Ref:** BLIND — no `--image` support.
**Strength:** text rendering.
**Note:** no seed parameter; character appearance may vary.
Only used for source.png (text asset chain), never for episode stills.

---

## ai-gen CLI mechanics (v2.1.0)

```bash
# Standard still generation
ai-gen image -m <model> \
  --prompt "<prompt>" \
  --image <hosted-fal-url>  # ref, only for nano-banana-pro \
  -s <size> \
  --seed <N> \
  --format json \
  --max-cost <credits>

# Parse output
# files[0].local_path → local file path
# files[0].hosted_url or hosted_urls[0] → fal.media URL (use for i2v --image)
```

`credits_used` in JSON response is unreliable (~8.4× over-reports). Use `ai-gen balance`
deltas or `ai-gen estimate` for true cost. Billing lags ~5 min.

fal.media URLs expire — log them immediately and don't rely on them after the session.

---

## Seed discipline

One seed per character, set in character.md (default 4242). Reuse for every still in
the episode. The seed is a tie-breaker — it slightly improves consistency between runs
of the same prompt but is not a guarantee. The primary consistency mechanism is always
`--image character-source.png`.

---

## Positive constraints reference

The CONSTRAINTS block (replacing the old NEGATIVES_BLOCK) in every still prompt:

**Standard (most stills):**
> Monochrome graphite on white paper only. Single figure, one readable action per frame. Minimal sparse environment.

**Text asset variant (source.png only):**
> Monochrome graphite on white paper only. Single figure. One short word on one object permitted.

**Turnaround variant:**
> Monochrome graphite on white paper only. Four distinct views of the same figure.
