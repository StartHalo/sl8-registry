# Still-Image Dialects & ai-gen Mechanics

Per-model prompt adjustments and quirks for the two pinned chains, plus the CLI
mechanics `scripts/gen-image.sh` relies on. Source: BOT-013 research
(`research/model-evaluation.md`); ai-gen v2.1.0 surface verified in-session 2026-06-15;
BOT-007 proxy ground truth 2026-04-28. The chains are pinned in SKILL.md — this file
explains how each model behaves once the chain reaches it.

## The chains, with rationale

| Chain | Order | Why this order |
|---|---|---|
| `stills` | `fal-ai/nano-banana-pro` → `fal-ai/flux-dev` → `fal-ai/stable-diffusion-v35-large` | nano-banana-pro is the only **reference-capable** model (consumes `--ref source.png` for the character lock) and renders sketch styles cleanly; flux-dev is the strongest ref-blind sketch fallback (~15s); SD3.5 is the proxy-only last resort |
| `text` | `fal-ai/nano-banana-pro` → `fal-ai/ideogram/v3` | nano-banana-pro renders a clean in-frame word AND takes `--ref`; ideogram/v3 is the ref-blind text fallback |

**nano-banana-pro leads both chains** because the reference image is the primary
identity lock (see SKILL.md "How identity is locked"). The models behind it are
availability insurance and are **ref-blind** — if the chain falls past nano-banana-pro,
the figure is held by language-plus-seed alone, the degraded path prior runs proved
insufficient. Flag it in the log when it happens.

**Never improvise out-of-chain.** When a mid-run model fails, the temptation is to try
"just one more" model the catalog happens to list — that is exactly how BOT-007's "SD
3.5 Large incident" produced an undocumented, ungraded asset. The chain IS the
documented fallback contract; if the whole chain fails, that's a recorded failure, not
a creative opportunity.

## Per-model notes

### fal-ai/nano-banana-pro (primary, both chains)

- **Reference-capable** — `--ref <path|url>` (≤14 image refs) carries the locked figure
  into every generation. This is the character lock; `gen-image.sh` passes `--ref` only
  to this model. Local paths and hosted URLs both work (the CLI uploads locals via fal
  storage, FR-4).
- **Takes `aspect_ratio`, NOT `-s` size presets.** `gen-image.sh` maps the requested
  size to `--aspect-ratio` automatically for this model (landscape_16_9→16:9,
  square_hd→1:1, portrait_16_9→9:16). Resolution defaults to 1K — adequate and cheap.
- **Renders clean in-frame text** — a short word like "TASK" comes out legible, so it
  serves the `text` chain too. Keep in-frame text to one short capitalized word named in
  the scene block.
- Strong affinity for graphite/sketch styles — the STYLE_STACK lands as written.
- ~38 credits (~$0.15) per 1K image, ~40s. Honors `--seed`. Pass `--max-cost 60`.

### fal-ai/flux-dev (stills fallback)

- Strong affinity for graphite/sketch styles — STYLE_STACK lands as written.
- **Ref-blind** — ignores `--ref`; uses `-s` size presets. If the chain reaches it, the
  character is held by the frozen block + seed only (lock lost — flag it).
- **Garbles secondary text.** Any word in the scene block comes out as alphabet soup;
  labeled beats should have been served by nano-banana-pro upstream.
- ~15s per image. Honors `--seed`.

### fal-ai/stable-diffusion-v35-large (last resort, both chains)

- **Proxy-overlay only** — may not appear in `ai-gen models`; it served fine on the
  proxy 2026-04-28. Attempt it even if discovery doesn't list it (the catalog is
  volatile in both directions). Ref-blind; uses `-s` presets.
- Acceptable sketch styles, weaker graphite texture than FLUX — expect cleaner lines.

### fal-ai/ideogram/v3 (text fallback)

- Renders a short in-frame word ("TASK") legibly — the ref-blind text backstop behind
  nano-banana-pro. Ref-blind; uses `-s` presets.
- **Unlisted but working** (2026-04-28): discovery does not list it — attempt anyway.
  Its listed sibling `fal-ai/ideogram-v2` 404s; do not substitute it.
- Keep in-frame text to ONE short word in capitals, named explicitly in the scene block.

> Removed from the chains in the v2.1.0 re-pin: `fal-ai/flux-pro` and `fal-ai/recraft-v3`
> (recraft's 1,000-char limit fought the ~900-char frozen blocks and it charged on
> failure; nano-banana-pro now covers both style control and clean text). The old
> `.webp→.png` conversion safety net stays in `gen-image.sh` regardless.

## Seed discipline

- One seed per character, chosen at phase 2 (default **4242**), recorded in
  `character-spec.md`, reused for **every** still of that character — character assets,
  beat stills, retries, and any later episode of the series.
- The seed is the tie-breaker in the consistency stack (reference image primary, frozen
  blocks reinforcement, seed third). Changing the seed mid-set re-rolls low-level line
  quality even with an identical prompt + ref.
- Retries after a failed self-check keep the same seed — the prompt changes (reinforced
  negatives), not the seed. Only change the seed when the user explicitly asks for a
  different character.

## ai-gen CLI mechanics (v2.1.0)

The command shape `gen-image.sh` issues (args shaped per-model):

```bash
# nano-banana-pro (primary): aspect_ratio + reference lock
ai-gen image "<prompt>" -m fal-ai/nano-banana-pro --aspect-ratio 16:9 \
  --ref <source.png|url> --seed <n> -o <dir> --format json --max-cost 60
# diffusion fallback: -s size preset, ref-blind
ai-gen image "<prompt>" -m fal-ai/flux-dev -s landscape_16_9 \
  --seed <n> -o <dir> --format json --max-cost 60
```

- **Always pass `-o` explicitly.** The CLI default output dir is `/home/user/artifacts`
  (flat) — without `-o`, files land outside the project folder and break the path contract.
- **Always pass `-m` explicitly.** Never rely on CLI defaults for model choice.
- **`--max-cost` is in CREDITS** (1 cr ≈ $0.004), and aborts *before* submitting if the
  estimate exceeds it. Pass 60 for a 1K image (estimate ~38).
- `--format json` returns the **v2.1.0 stable contract**:
  ```json
  {
    "schema_version": "2.0", "success": true, "model": "fal-ai/nano-banana-pro",
    "files": [ { "local_path": "/home/user/.../x.png", "url": "https://...fal.media/...", "kind": "image" } ],
    "hosted_urls": [ "https://...fal.media/..." ],
    "credits_used": 38, "credits_basis": "result", "timing": {...}, "raw": {...}
  }
  ```
  - The local file is **`files[0].local_path`** (files[] entries are OBJECTS now, not
    strings — the v1 string parser was a bug).
  - The hosted URL is **`hosted_urls[0]`** — a fixed field regardless of model. Never
    regex the raw blob; `gen-image.sh` reads `hosted_urls[0]` first, with a `*.fal.media`
    walk as fallback.
  - **`credits_used` is unreliable for some models** (it over-reported ~8.4× on seedance
    i2v on 2026-06-15). Trust `ai-gen estimate` / `ai-gen balance` for true cost.
- **The hosted URL is the i2v contract.** Phase 4 can take a local path too (v2 uploads
  it), but recording the hosted URL keeps the contract explicit and portable.
  `gen-image.sh` retries once when a response lacks the URL, then walks on.
- Sizes used by this skill: `square_hd` (source image), `landscape_16_9` (turnaround,
  16:9 stills), `portrait_16_9` (9:16 stills) — auto-mapped to `--aspect-ratio` for
  nano-banana-pro.
- Failed generations are **not** charged in v2.1.0 (fal bills successful outputs only);
  chains still walk forward and never retry-loop a failing model.

## Runtime discovery (informative for images)

`ai-gen models --type image --format json` shows the current catalog, but for images
the chains are pinned and discovery is **informative only**: the proxy has served
unlisted models (ideogram/v3, SD3.5) and 404'd listed ones (ideogram-v2). Attempt the
chain in order regardless of what discovery says; the JSON `success` field is the only
truth that matters. `ai-gen info <model>` shows the per-model parameter schema.
