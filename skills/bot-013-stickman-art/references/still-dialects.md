# Still-Image Dialects & ai-gen Mechanics

Per-model prompt adjustments and quirks for the two pinned chains, plus the CLI
mechanics `scripts/gen-image.sh` relies on. Source: BOT-013 research
(`research/model-evaluation.md`, probe 2026-06-09; BOT-007 proxy ground truth
2026-04-28). The chains are pinned in SKILL.md — this file explains how each model
behaves once the chain reaches it.

## The chains, with rationale

| Chain | Order | Why this order |
|---|---|---|
| `stills` | `fal-ai/flux-dev` → `fal-ai/flux-pro` → `fal-ai/recraft-v3` → `fal-ai/stable-diffusion-v35-large` | flux-dev renders "hand-drawn pencil sketch" styles best at the lowest cost (~15s); flux-pro adds composition strength at 2× the time; recraft is a style-control specialist with sharp limits; SD3.5 is the proxy-only last resort |
| `text` | `fal-ai/ideogram/v3` → `fal-ai/stable-diffusion-v35-large` | only models that render an in-frame word reliably; everything in the stills chain garbles text |

**Never improvise out-of-chain.** When a mid-run model fails, the temptation is to try
"just one more" model the catalog happens to list — that is exactly how BOT-007's "SD
3.5 Large incident" produced an undocumented, ungraded asset. The chain IS the
documented fallback contract; if the whole chain fails, that's a recorded failure, not
a creative opportunity.

## Per-model notes

### fal-ai/flux-dev (stills primary)

- Strong affinity for graphite/sketch styles — the STYLE_STACK lands as written, no
  adjustment needed.
- **Garbles secondary text.** Any word that sneaks into the scene block ("a poster
  reading SALE") comes out as alphabet soup. Keep in-frame text out of stills-chain
  prompts entirely; labeled beats route to the `text` chain instead.
- ~15s per image. Honors `--seed`.

### fal-ai/flux-pro (stills fallback 1)

- Stronger spatial composition (useful for interior depth — the DISCIPLINE_BLOCK's
  "believable world").
- Same text weakness as flux-dev.
- **Palette drift on record** (BOT-007): occasionally tints "monochrome" prompts. The
  NEGATIVES_BLOCK's "No color" is the counter — one more reason the block is frozen.
- ~30s per image.

### fal-ai/recraft-v3 (stills fallback 2)

- Design-style control specialist; good at flat, deliberate illustration.
- **Hard 1,000-char prompt limit, and a failed call still charges credits** (BOT-007
  logged a 1,450-char prompt that failed AND billed). `gen-image.sh` uses a 700-char
  safety cap: a longer prompt **skips** recraft rather than truncating, because the
  5-block prompt puts NEGATIVES_BLOCK last — truncation would amputate exactly the
  guardrails that keep the style on-model. Record the skip in the log.
- **Photo-misread quirk:** prompts that mention real-world objects can come back
  photographic. If composing a recraft-specific prompt by hand (rare — the script
  passes the standard prompt), append the guard phrase: `flat illustration, not a
  photograph`. The frozen STYLE_STACK + "No photorealism" negative usually suffices.
- **Outputs .webp**, not .png — `gen-image.sh` converts via ffmpeg to keep the path
  contract (`.png`) honest. Never rename a .webp to .png.

### fal-ai/stable-diffusion-v35-large (last resort, both chains)

- **Proxy-overlay only** — not in the ai-gen built-in catalog; it served fine on the
  proxy 2026-04-28. Attempt it even if `ai-gen models` doesn't list it (the catalog is
  volatile in both directions).
- Best on-proxy text substitute after ideogram; acceptable sketch styles, weaker
  graphite texture than FLUX — expect slightly cleaner lines.

### fal-ai/ideogram/v3 (text primary)

- The only model on record rendering a short in-frame word ("TASK") legibly.
- **Unlisted but working** (2026-04-28): discovery does not list it — attempt anyway.
  Its listed sibling `fal-ai/ideogram-v2` 404s; do not substitute it.
- Keep in-frame text to ONE short word in capitals, named explicitly in the scene
  block (`the word "TASK" hand-written on its side`). Multi-word text garbles even
  here.

## Seed discipline

- One seed per character, chosen at phase 2 (default **4242**), recorded in
  `character-spec.md`, reused for **every** still of that character — character
  assets, beat stills, retries, and any later episode of the series.
- The seed is half of the consistency mechanism (the frozen blocks are the other
  half). Changing the seed mid-set re-rolls the figure's line quality and proportions
  even with an identical prompt.
- Retries after a failed self-check keep the same seed — the prompt changes
  (reinforced negatives), not the seed. Only change the seed when the user explicitly
  asks for a different character.

## ai-gen CLI mechanics (v1.1.2)

The command shape `gen-image.sh` issues:

```bash
ai-gen image "<prompt>" -m <model-id> -s <size> --seed <n> -o <dir> --format json
```

- **Always pass `-o` explicitly.** The CLI's default output dir is
  `/home/user/artifacts` (flat) — without `-o` files land outside the project folder
  and break the path contract.
- **Always pass `-m` explicitly.** Never rely on CLI defaults for model choice.
- `--format json` returns:
  ```json
  {"success": true, "files": ["/local/path.png"], "credits_used": 8, "data": { ... }}
  ```
  The local file is `.files[0]`. The hosted `https://fal.media/...` URL lives somewhere
  inside `data` — its exact location varies per model, so extraction walks fallbacks:

  ```
  .data.images[0].url // .data.image.url
    // (.data | tostring | capture("(?<u>https://fal\\.media[^\"]+)").u) // empty
  ```

- **The fal.media URL is the i2v contract.** Phase 4's `ai-gen video --image <url>`
  accepts URLs only (no local paths). A still without a recorded URL cannot be
  animated. `gen-image.sh` retries once when a success response lacks the URL, then
  walks on.
- Sizes used by this skill: `square_hd` (source image), `landscape_16_9` (turnaround,
  16:9 stills), `portrait_16_9` (9:16 stills).
- Failed generations can still charge credits — chains walk forward, they never
  retry-loop a failing model.

## Runtime discovery (informative for images)

`ai-gen models --type image --format json` shows the current catalog, but for images
the chains are pinned and discovery is **informative only**: the proxy has served
unlisted models (ideogram/v3, SD3.5) and 404'd listed ones (ideogram-v2). Attempt the
chain in order regardless of what discovery says; the JSON `success` field is the only
truth that matters.
