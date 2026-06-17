---
name: ai-image-generation
description: "Generate and edit images with the ai-gen CLI — text-to-image, image edit, and multi-reference composition across the full fal.ai catalog (FLUX, Imagen, SD3, Recraft, Ideogram, nano-banana, Seedream, and more) via the SL8 proxy. Use when the user asks to create, generate, make, or edit an image, picture, logo, poster, illustration, photo, icon, or any visual asset. Triggers: generate an image, make a picture/logo/poster, text-to-image, AI art, edit this photo, image variations, flux, imagen, ideogram, recraft, nano-banana."
license: MIT
metadata:
  author: sl8
  category: media
  tags: image, generation, image-edit, text-to-image, ai-gen, fal
  references-skills: [ai-gen]
---

# AI Image Generation

## Purpose

Generate and edit images with `ai-gen image` (and `ai-gen run` for any endpoint). This skill covers
**model choice, prompt craft, and parameters** for images; the CLI mechanics (output envelope, exit
codes, inputs) live in the **`ai-gen`** skill — load it for the contract.

`ai-gen image` defaults to `fal-ai/flux/schnell` (fast, live-verified) and runs **sync**, downloading
to `/home/user/artifacts`. Pick a stronger model with `-m` when quality, text rendering, or editing
demands it.

## Pick the job

| The user wants… | Branch | Command shape |
|---|---|---|
| An image from a description | **text-to-image** | `ai-gen image "<prompt>" [-m <id>]` |
| To modify an existing image | **edit** | `ai-gen image "<edit instruction>" --image <path\|url> -m <edit-model>` |
| To combine/condition on several images | **multi-reference** | `ai-gen image "@Image1 … @Image2 …" -m <ref-model> --ref a.png --ref b.png` |

### Text-to-image
```bash
ai-gen image "a watercolor fox in a misty forest, soft morning light" --aspect-ratio 16:9 --format json
ai-gen image "minimalist logo, a folded paper crane, flat vector" -m fal-ai/recraft/v3 --format json
```

### Edit (instruction + source image)
Edit/inpaint models take the source via `--image` (local path, URL, or data URI) and an instruction
prompt. The right model matters — verify it's an edit model with `ai-gen info`.
```bash
ai-gen image "put a red wool hat on the cat, keep everything else" --image cat.png -m fal-ai/nano-banana/edit --format json
```

### Multi-reference (compose from several inputs)
Repeatable `--ref` inputs are addressed in the prompt as `@Image1`, `@Image2`, … The per-model cap
comes from the schema (`ai-gen info`).
```bash
ai-gen image "@Image1 wearing the jacket from @Image2, studio backdrop" -m <ref-model> --ref person.png --ref jacket.png --format json
```

## Choose a model

Don't hard-code ids from memory — the catalog is live. Match the job to a family, then confirm:
```bash
ai-gen models --category text-to-image --format json
ai-gen models --search "edit"
ai-gen info fal-ai/flux/dev          # status, params, enums, defaults, caps, est. credits
```
See `references/model-picks.md` for family-by-use-case guidance (fast drafts vs premium, text
rendering, photoreal, illustration/vector, editing, multi-ref). The forthcoming `fal-model-catalog`
skill deepens this; until then `references/model-picks.md` is self-sufficient.

## Prompt craft

Strong image prompts state **visual facts** (subject, composition, lens/medium, light, palette),
not adjectives. See `references/prompt-craft.md`. (The forthcoming `ai-gen-prompting` skill covers
per-family craft in depth.)

## Parameters

Set size/aspect/seed/count via typed flags; everything else is `key=value` per the model schema.
```bash
ai-gen image "abstract poster art" -s landscape_16_9 -n 4 --seed 42 --format json
ai-gen image "a forest path" -m fal-ai/flux/dev guidance_scale=7.5 num_inference_steps=30 --format json
```
- `--aspect-ratio` / `-s/--size` (image-size preset; `ai-gen info` lists the enum), `-n/--num-images`,
  `--seed` (reproducibility). Param names and enums vary per model — **`ai-gen info` is the truth**;
  use `--strict-params` to catch typos. Details: `references/parameters.md`.

## Read the output

`--format json` → read `hosted_urls[]` (the stable `*.fal.media` URLs — they **expire**, so persist)
and `files[].local_path` (downloaded). Multiple images → multiple `files[]` entries. Full envelope:
the `ai-gen` skill's `references/json-contract.md`.

## Iterate fast → final

1. Draft on a fast/cheap model (`fal-ai/flux/schnell`) to lock composition and prompt.
2. Fix the `--seed` once you like a layout, then change one variable at a time.
3. Re-render the winner on a premium model (`fal-ai/flux/pro`, Imagen, …) for the final.
4. Batch variations with `-n`; estimate first if the model is pricey (`ai-gen estimate <id>`).

## Quality criteria

- [ ] The model id came from `ai-gen models`/`info`, not memory; params validated against the schema.
- [ ] The prompt states visual facts (composition, light, medium), not vague adjectives.
- [ ] Output was read from `hosted_urls` / `files[].local_path`; artifacts persisted (URLs expire).
- [ ] For edits/multi-ref, the source images resolved (≤ 3 MB local, else a URL) and `@ImageN` matched.
- [ ] Failures handled by exit code (see the `ai-gen` skill) — no blind retry on exit 7.
