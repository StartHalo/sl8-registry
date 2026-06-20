# Models + the verified ai-gen syntax contract (use EXACTLY)

The reachable try-on stack, the named-arg forwarding that makes it work, and the
parked first-party gap. All slugs run via `ai-gen` -> fal inside the sandbox. ai-gen
2.1.0 syntax was verified live; do NOT re-flag these as unverified.

## 1 · The try-on stack

| Role | Slug | Native res | Notes |
|---|---|---|---|
| **Primary VTON** | `fal-ai/fashn/tryon/v1.6` | 864x1296 | SOTA garment transfer — preserves text/print/pattern; ~$0.075/img (sub-$0.04 at volume). Required named args `garment_image` + `model_image`. |
| **VTON fallback** | `fal-ai/leffa/virtual-tryon` | 768x1024 | Commercial-use. Required named args `human_image_url` + `garment_image_url`; `garment_type` {upper_body, lower_body, dresses}. |
| **General-model path** | `fal-ai/nano-banana-pro` | up to 4K | Used ONLY when (a) a VTON endpoint refuses the category, or (b) catalog face-consistency is needed (re-attach one house-model image as `--ref`). Driven by the fabric-lock prompt from `fabric-inject.py`. Weak fidelity lock — always tryon-qc it. |
| **Garment cleanup (optional)** | `fal-ai/bria/background/remove` | n/a | Cut the garment out of a busy flat-lay before try-on (preserves real pixels). |
| **Upscale** | `fal-ai/clarity-upscaler` | output-dependent | Lift sub-2K VTON output to >=2000px for marketplaces. Positional `scale_factor=N`. |

## 2 · The named-arg contract (the riskiest line — get it right)

FASHN and Leffa are **dedicated endpoints that take NAMED image args**, NOT the
singular `image_url` that `--image` sends. So they are called via `ai-gen run <slug>
KEY=VALUE ...` with POSITIONAL key=value pairs — NOT `ai-gen image ... --image`:

```bash
# FASHN v1.6 — the core try-on call (scripts/tryon.sh wraps this):
ai-gen run fal-ai/fashn/tryon/v1.6 \
  garment_image=<flat-lay-garment-url-or-local> \
  model_image=<model-photo-url-or-local> \
  category=auto mode=quality garment_photo_type=flat-lay \
  moderation_level=permissive num_samples=1 output_format=png \
  -o work/tryon --format json --max-cost 60

# Leffa fallback — different named args:
ai-gen run fal-ai/leffa/virtual-tryon \
  human_image_url=<model-url-or-local> garment_image_url=<garment-url-or-local> \
  garment_type=upper_body -o work/tryon --format json --max-cost 60
```

- `--params-file <file>` (a JSON file) is an equivalent way to pass the named args if
  a value is awkward on the command line; `tryon.sh` uses the positional key=value form.
- **FASHN `category`**: `tops | bottoms | one-pieces | auto`. **`mode`**: `performance
  | balanced | quality`. **`garment_photo_type`**: `auto | model | flat-lay` (use
  `flat-lay` for flat-lay/ghost-mannequin inputs). **`moderation_level`**: `none |
  permissive | conservative`.
- **Leffa `garment_type`** maps from category: `tops`->`upper_body`,
  `bottoms`->`lower_body`, `one-pieces`->`dresses`.

## 3 · General-model path (nano-banana-pro) — `--image` + `--ref`

Only on the general-model fallback (a refused category, or catalog face-consistency):

```bash
PROMPT="$(python3 scripts/fabric-inject.py --fabric 'ribbed cotton' --garment 'crew-neck tee' \
          --model-desc 'a young East Asian female model')"
ai-gen image "$PROMPT" -m fal-ai/nano-banana-pro \
  --image <garment-url> --ref <house-model-url> \
  --aspect-ratio 3:4 resolution=2K -o work/tryon --format json --max-cost 60
```

- **`--image <path|url>` -> the model's `image_url`** (single source — the garment).
- **`--ref <path|url>`** is multi-ref (repeatable) — the house-model face for
  consistency. This is the only path that uses a prompt; the VTON endpoints take none.
- **Model params are POSITIONAL `key=value`** — e.g. `resolution=2K` (one of
  `1K|2K|4K`). **There is NO `--resolution` flag.** Aspect via `--aspect-ratio 3:4`.

## 4 · Output + cost handling (KB, verified)

- **Outputs:** read `files[0].local_path` from the `--format json` blob (entries are
  **objects**, not strings). The `*.fal.media` URL **expires** — use the local file
  immediately. Never `startswith("https://fal.media")` (it rejects every real URL).
- **Cost:** ignore the `credits_used` JSON field (over-reports ~8.4x). Read cost from
  `ai-gen estimate <slug>` + `ai-gen balance` deltas; billing lags ~5 min. Use
  `--max-cost` (in credits) as a per-call guard.

## 5 · The parked sub-feature gap (do NOT claim it ships)

The dedicated FASHN catalog-scale features — **Product-to-Model**, **Model Swap**, and
**Consistent Models** (the cross-catalog face-consistency differentiator) — live ONLY
on the first-party `api.fashn.ai/v1/run` (model_name `product-to-model`, `face_reference`
+ `face_reference_mode` {match_reference, match_base}; 1-5 credits, +3 for face_reference)
and are **NOT confirmed on fal**. So this bot ships the *transfer* job on
`fal-ai/fashn/tryon/v1.6` and **approximates** catalog face-consistency by re-attaching
one nano-banana-pro house-model image as `--ref`. Native Consistent Models = **parked**
until a fal mirror is verified. State this honestly; never imply native consistency.

## 6 · Excluded (do NOT use)

- **`fal-ai/cat-vton`** — fal lists it **"Research only"**: license risk for a
  shippable commercial bot. EXCLUDED from this bot entirely.

## 7 · Smoke-test at build (the reachability gate)

The fal namespace is opaque: a slug is reachable only when a call succeeds. Before a
real run, attempt `ai-gen info fal-ai/fashn/tryon/v1.6` and a 1-sample try-on; if the
primary is unreachable, fall through to Leffa (the chain in `tryon.sh`). If BOTH fail,
FLAG the run as blocked — never substitute a general-model re-imagining as the catalog
shot without a passing tryon-qc.
