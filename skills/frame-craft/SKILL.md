---
name: frame-craft
description: >
  Generates the still frames a video is born from — keyframe posters, style-bake-off
  frames, cut-in details — on image models via ai-gen, cheaply and re-rollably, BEFORE any
  motion spend. Use when: "generate the keyframes/boards/posters", "make the style frames",
  "this frame needs a re-roll", "bake off the styles", any image generation inside a video
  project. Chain: consumes style.md's aesthetic block verbatim (style-system runs first);
  approved frames feed video-prompting (motion) — never generate motion from an unapproved
  frame. NOT for: motion/clip prompts (use video-prompting), voiceover (use voice-timing),
  logo compositing or final QC (use assembly-qc).
---

# frame-craft — the look is born in the image step

The whole pipeline's quality law: **if the frame isn't right, nothing downstream will save
it — and frames are ~25× cheaper than clips.** Re-roll at the still stage; a clip is only
ever generated from an approved frame.

## Inputs to collect

1. **The project's `style.md`** (required — style-system creates it). The aesthetic block
   is pasted VERBATIM; only scene, background color, and headline change per frame.
2. **Per-frame, from the plan** (schema:
   [`../video-prompting/references/plan-contract.md`](../video-prompting/references/plan-contract.md)):
   scene description (one clear focal idea) · headline text or `none` (cut-ins get "no big
   headline — a small accent only") · the beat's `bg` · aspect.
3. **References, if any** — a user-supplied image is a style donor ("take only the render
   style and color grading; never the characters, inscriptions, or objects") unless it is
   an identity anchor (a product/person that must appear) — then it is THE anchor, passed
   alone (the 1-ref rule below).

## Prompt build order

1. **Aesthetic block** — verbatim from `style.md`.
2. **Scene** — `SCENE: {one clear action/arrangement, matched to this beat's narration}.`
   One idea per frame; a frame that needs two ideas is two frames.
3. **Headline** — `Bold {type_style} headline: "{TEXT}". Keep the headline crisp and
   legible. No other text anywhere.` — or the cut-in line. Numbers/claims come from the
   approved script only.
4. **Guardrails** — "No other text, no logos, no watermarks." Logos are composited in
   post, never generated.

## Model routing

| Job | Model (verify live: `ai-gen info <id>`) | Params that matter | Cost basis (as-of 2026-07-22) |
|---|---|---|---|
| Keyframes, bake-off frames, typography cards | `fal-ai/nano-banana-pro` | `aspect_ratio` (enum: 16:9, 9:16, 1:1, …; **default 1:1 — always set it**), `resolution` 1K/2K/4K, `num_images` 1–4, `seed` | 38 cr (~$0.15)/frame — verified R02 |
| Edits on an existing frame | `fal-ai/nano-banana-pro/edit` (`image_urls[]`) | same | similar |

**Never invent params** — the proxy **silently drops unknown params** (R02: `image_size`
was ignored → square output). Run `ai-gen info` once per session if unsure; use schema
field names exactly.

**The 1-ref rule** (Library-measured, 2026-07-04): identity/character frames pass ONE
strong anchor ref (max 2 total) — refs are weighted equally and dilute the anchor (1 ref
held identity 7/10; 4 refs collapsed it to 2/10). **The key frame owns identity** — the
animated subject is the FRAME's subject in every detail; refs at the video stage are
insurance, not correction.

## The re-roll discipline

- Estimate first (free), then generate ONE frame and eyeball it (or judge against the
  quality bar) before batching siblings.
- A weak frame is re-rolled (new seed / sharpened scene text) — never "fixed in motion".
- Two identical failures ⇒ change the prompt, not the seed (the retry law). **Precedence:**
  a re-roll may sharpen the SCENE and guardrail lines only — the aesthetic block stays
  verbatim (a block edit is a project-level style change via style-system, never a retry
  tactic).
- Bake-off frames are throwaway by design: 3–4 presets × 1 frame, human picks by eye.

**Paid-call contract (applies here as everywhere):** estimate (free) → journal the request
id into the plan ([`../video-prompting/references/plan-contract.md`](../video-prompting/references/plan-contract.md))
→ download immediately and keep `local_path` (hosted URLs expire) → account by balance
delta, never `credits_used`. Billing rules live in the ledger:
[`../assembly-qc/references/models-and-gotchas.md`](../assembly-qc/references/models-and-gotchas.md) §Billing.

## Quality bar

- [ ] Aesthetic block diff-identical to `style.md`'s.
- [ ] Headline text EXACT (letter-for-letter) and legible at target size; no stray text
      anywhere else in the frame.
- [ ] One clear focal subject; reads at a glance at video scale.
- [ ] Aspect ratio explicitly set and correct (default is square — a silent killer).
- [ ] Identity frames: anchor preserved (face/product/label match the anchor ref).
- [ ] The frame is APPROVED (human or graded) before any motion call cites it.
