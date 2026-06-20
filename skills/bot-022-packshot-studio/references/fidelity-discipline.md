# Fidelity discipline — the rules that keep the bot from inventing your product

This is the *how* of fidelity. The bot's #1 risk is the failure that drives "Color
Not as Described" returns: a model invents a color, texture, reflection, or detail
the real product lacks. Three disciplines prevent it — the RMBG-not-generative rule
(the hero), the preserve clause + re-anchor (the angles), and the fidelity-qc
blocking gate (everything generated).

## 1 · The RMBG-not-generative rule (the load-bearing PoC finding)

**The compliant HERO main-image path is DETERMINISTIC — never a generative
re-background.**

The build PoC (`research/poc-reachability.md`) tested this directly:

- A real product (a sage-green ceramic mug) sent through **Bria RMBG (`--image`)**
  came back **pixel-faithful** — the exact same mug, cleanly cut out.
- The same product sent through a **generative re-background (`nano-banana-pro
  --image`)** came back as a **leather luggage tag** — the model kept only the color
  and a logo motif and **hallucinated a different product.**

Reachable fal edit models have **no hard geometry/fidelity lock**: structure/color
preservation is prompt-driven *only*, and a generative model is free to re-imagine
the subject. So:

- **Hero:** Bria RMBG on the real snap → Pillow flatten. The product pixels are the
  seller's real pixels, re-padded on white. Pixel-faithful by construction.
- **Never** route the compliant main image through a generative re-background, even
  to "clean it up." If RMBG fails, the hero is **blocked** — do not substitute a
  generative edit (it hallucinates). Record the block + FLAG.
- **Optional cleanup** (Seedream v4.5 relight) is allowed ONLY when gated by
  fidelity-qc, and falls back to the deterministic hero on any drift.

## 2 · The preserve clause (verbatim — prepend to every GENERATED prompt)

Identity across *generated* images (angles, optional cleanup) is locked by
**language + re-attaching the approved hero as the reference**, because the models
have no geometry lock. The "preserving the original…" clause is the soul of the
prompt — a field test (APIYI) measured it raising texture fidelity from ~30% to
~80%. Use it verbatim:

```
... the exact same product as the attached reference image, preserving the original
material/finish, color, label text, proportions and surface detail. Do not add,
remove, or invent any detail not present in the reference. Do not add reflections,
text, or props.
```

`gen-angles.sh` builds this into every angle prompt automatically. "Material/fabric
before style" — name the material first, then the camera move.

## 3 · The anti-drift SOP (the hard cap, not a suggestion)

Practitioner rule, encoded as a hard cap in `gen-angles.sh`:

```
Generate 3–4 core angles first. Front, side, top, 3/4 view. Use exact directional
language — 'rotate left,' 'tilt down 30 degrees.'
Never generate more than 4 new angles without checking consistency. AI drifts.
Use anchors: 'same as before,' 'don't change,' 'keep the lighting.'
```

- **Cap at 4** angles per consistency checkpoint (the script drops extras + flags).
- **Re-anchor EVERY angle off the APPROVED hero** — never off the raw snap, never off
  a previous angle (drift compounds). The hero is the single identity anchor for
  angles AND scenes.
- **Change ONLY the camera.** Directional lines move the viewpoint/crop; the preserve
  clause holds material/color/label/background/lighting. Example directional lines:
  - "Show the product from a direct side profile view — rotate 90 degrees."
  - "Show the product from directly above — a clean top-down overhead view."
  - "Show the product from a 3/4 front angle — rotate about 45 degrees to the left."

## 4 · fidelity-qc — the BLOCKING vision gate (every generated image)

`fidelity-qc` is the honest answer to the no-geometry-lock ceiling. It is a **Claude
vision compare**, run by the bot (not a script — it needs a vision model), on every
*generated* image. The deterministic hero is exempt (no model re-imagined it — record
it as **PIXEL-FAITHFUL**).

For each generated image, view it next to the **original snap** (and the **approved
hero**, for angles) and grade:

| Dimension | Question |
|---|---|
| **Color** | Same color/finish as the real product? No shifted hue, no invented sheen. |
| **Shape / proportions** | Same silhouette and proportions? Nothing stretched, added, or removed. |
| **Label / text** | Same label text and placement? No garbled or invented copy. |
| **Surface / material** | Same material and texture? No invented reflection, pattern, or prop. |

Verdict per image (record in `fidelity-qc.md` with the reason):

- **pass** — same product on all four dimensions → ships.
- **drift — DROP** — the product changed (the PoC luggage-tag case is the canonical
  example) → **blocking drop**, never shipped. Re-generate or omit the angle.
- **low-confidence — human review** — reflective / metallic / glass / jewelry / fine
  printed text (the known low-confidence class) → ships **with a prominent flag**, the
  bot does not certify it.

Never silently ship a generated image that failed QC. Shipping 2 clean angles beats
shipping 4 with one drifted angle — best-effort, never best-volume.

## 5 · ai-gen syntax contract (verified live 2026-06-19 — use EXACTLY)

ai-gen 2.1.0 runs inside the sandbox. The forms this skill uses:

- **RMBG (hero):** `ai-gen image "" -m fal-ai/bria/background/remove --image <snap>
  -o <dir> --format json --max-cost <n>` → transparent PNG cutout.
- **Angle (generated):** `ai-gen image "<directional + preserve clause>" -m
  fal-ai/nano-banana-pro --image <approved-hero> --aspect-ratio 1:1 resolution=2K -o
  <dir> --format json --max-cost <n>`.

Hard rules (do NOT re-flag these as unverified — they were verified live):

- **`--image <path|url>` → the model's `image_url`** (single source/edit input). It is
  the proven base-edit path. A local file path works (v2.1.0 uploads it); an https URL
  works too.
- **`--ref <path|url>`** is multi-ref (repeatable) — not used by this skill's hero/angle
  paths.
- **Model params are POSITIONAL `key=value`** — e.g. `resolution=2K` for
  nano-banana-pro (one of `1K|2K|4K`). **There is NO `--resolution` flag** (it errors).
- Aspect via `-s/--size` presets OR `--aspect-ratio 1:1`.
- **Outputs:** read `files[0].local_path` from the `--format json` blob (entries are
  **objects**, not strings). The `*.fal.media` URL **expires** — use the local file
  immediately. Never `startswith("https://fal.media")` (it rejects every real URL —
  the BOT-013 bug).
- **Cost:** ignore the `credits_used` JSON field (over-reports ~8.4×). Read cost from
  `ai-gen estimate <slug>` + `ai-gen balance` deltas; billing lags ~5 min. Use
  `--max-cost` (in credits) as a per-call guard.

## 6 · Why this is honest, not paranoid

The bot is a **checker/generator, never an auto-uploader** (Amazon 2026 Agent
Policy). It emits files + reports; a human ships them. The deterministic hero is
provably Amazon-compliant; the generated angles are best-effort with a blocking QC
gate and explicit low-confidence flags. The seller always knows exactly what passed
and what needs a human eye — that trust is the product.
