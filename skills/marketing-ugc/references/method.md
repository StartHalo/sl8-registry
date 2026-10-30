# UGC method text (fal's wording, with attribution)

The method text of fal's hosted `ugc` skill (version 1, published 2026-07-02; BODY.md and its
formats, workflows and examples references), kept in fal's words with attribution: fal agent skills,
no licence stated, used with attribution. The research ids are the capability assessment's
(`sl8-resesarch@559a1305`, `fal/ugc-3c015f`; the thinner plugin copy is `fal/ugc-9e66b1`). Where
SL8 changed a line for this machine, the change is marked **SL8:** and recorded as a delta in
`adaptations/marketing-ugc.json`. The wording was written for fal's hosted agent and has not been
run on SL8.

## Contents
- [Claim safety](#claim-safety)
- [Script build order](#script-build-order)
- [Prompt build order](#prompt-build-order)
- [Formats](#formats)
- [Hook bank](#hook-bank)
- [Workflows](#workflows)
- [Worked examples](#worked-examples)
- [Hook variant table](#hook-variant-table)
- [Quality bar](#quality-bar)
- [Points added from other sources](#points-added-from-other-sources)

## Claim safety

From `fal/ugc-3c015f@claim-safety rule`:

> **Claim safety (non-negotiable):** do not write fake testimonials, fake metrics,
> invented reviews, medical claims, financial claims, or readable legal copy unless
> the user provides the exact wording. Replace unsupported claims with observable
> statements ("the texture looks lighter" beats "this cures acne").

## Script build order

From `fal/ugc-3c015f@script build order`:

> Short spoken beats, not polished ad copy:
>
> 1. Hook — one concrete tension, problem, result, or curiosity gap.
> 2. Context — why the speaker cares or the situation they're in.
> 3. Product moment — product appears, is used, or solves a problem.
> 4. Proof — sensory detail, visible demo, or a user-supplied fact.
> 5. Turn — before-after, objection answered, or unexpected benefit.
> 6. Close — soft CTA, next action, or clean final product frame.

The plugin copy (`fal/ugc-9e66b1@script shape`) adds: the hook may be an objection; the product
moment may be a comparison; proof may be a supplied metric.

## Prompt build order

From `fal/ugc-3c015f@prompt build order (per clip or shot)`:

> For each clip or shot:
>
> 1. Speaker and frame — creator type, setting, crop.
> 2. Performance — eye contact, casual delivery, gestures, pace.
> 3. Product action — held up, opened, applied, compared, demonstrated.
> 4. Camera — handheld phone, desk tripod, mirror shot, close-up, b-roll insert.
> 5. Lighting/audio feel — natural window, bathroom light, car interior.
> 6. Platform constraints — 9:16, safe top/bottom zones, no generated captions.
> 7. Guardrails — no fake claims, no new logos, no changed packaging.

In `prompts.json` these are the layer keys `speaker_frame`, `performance`, `product_action`,
`camera`, `light_audio`, `platform`, `guardrails`, in that order (`ugc.mjs prompts` checks it).

## Formats

Each format is a planning shortcut and must stay short enough for the platform and runtime
(`fal/ugc-3c015f#20`). When to pick each is the assessment's reading of formats.md
(`fal/ugc-3c015f` decision_logic); the templates are fal's words.

| Format | Pick it when | fal's template |
|---|---|---|
| `testimonial` (direct-to-camera) | a face and voice matter | "I tried [product] because [problem]. The first thing I noticed was [visible or sensory detail]. Here is [demo/proof]. If you [audience situation], this is worth checking out." Guardrail: "do not invent personal experience. If the user did not provide a real testimonial, frame it as a scripted creator ad." |
| `demo` (problem-solution) | the product has visible use | "Start with the frustrating moment. Show the product entering the scene. Show one clean action. Show the result. End on the product or next step." |
| `unboxing` (or first reaction) | a physical product, packaging or novelty | "Package in frame, hands open it, quick close-up of texture or detail, reaction line, product in use, final product beauty frame." |
| `before-after` | both states can be shown without unsupported claims; otherwise never | "Before state, product action, after state, one visible difference, no medical, financial, legal, or performance claim unless supplied." |
| `founder` (or expert explain) | SaaS, tools, education or a technical product | "One sentence problem, why existing options are annoying, what the product does differently, one screen or physical demo, simple CTA." |
| `faceless` (voiceover) | product media but no speaker image | "Voiceover drives the hook and proof. Visuals are product b-roll, hands, screen recording, process detail, or lifestyle inserts. No talking face required." |
| `split-screen` (proof) | a comparison is central | "Left side shows old workflow or problem. Right side shows product or result." **SL8:** the labels are always composited outside the model (HR10), never drawn by it; fal allowed a model "reliable with text rendering" (MKT-D528). |

## Hook bank

From `fal/ugc-3c015f@hook bank`:

> - "I did not expect [specific result] from [product category]."
> - "If you are dealing with [problem], watch this part."
> - "This is the smallest detail that changed [workflow/use case]."
> - "Here is what I would check before buying [category]."
> - "I used [product] for [scenario], and this was the useful part."
>
> Remove any hook that implies a fact the user did not provide.

**SL8: compress to the window.** Each line above runs eight words or more once its slots are filled,
and the hook has the first 1-2 s (about five words at 2.82 w/s). Treat a bank line as a pattern and
say its image shorter (our words; `ugc.mjs script` checks the length against `hook_max`):

| Bank pattern | Compressed |
|---|---|
| expected a result | "Did not expect [result]." |
| a problem to watch for | "[Problem]? Watch this part." |
| the small detail | "One detail changed [use]." |
| what to check before buying | "Check this before buying [category]." |
| a scenario and the useful part | "[Scenario]: this part helped." |

## Workflows

From `fal/ugc-3c015f@workflow: …`, with the assessment's SL8 versions (WF19-a2 adapted prompts) where
marked.

**Portrait plus script.**

> Use when the user supplies or approves a face image and script.
>
> 1. Keep the script short and conversational.
> 2. Have the portrait ready as an input image.
> 3. If using generated audio, create or approve the voice first.
> 4. Generate with `veed/fabric-1.0` (portrait + audio) or `veed/fabric-1.0/text`
>    (portrait + text), matching the model's schema fields.
> 5. Reject outputs with mouth drift, frozen expression, or identity drift.

**Existing footage plus new audio.**

> Use when the user has a real creator clip and wants new speech.
>
> 1. Have the source video and clean audio ready as inputs.
> 2. Use `fal-ai/sync-lipsync/v2`, mapping `video_url` and `audio_url` (or the
>    model's matching schema fields).
> 3. Compare the result to the source video. The body, background, and timing
>    should stay stable.

**Product b-roll plus voiceover** (the assessment's SL8 version):

> Use when no face is needed.
>
> 1. Generate or supply a product still.
> 2. Plan 2-5 b-roll clips: problem, product action, proof, lifestyle, close.
> 3. Draft with `xai/grok-imagine-video/image-to-video`; use `bytedance/seedance-2.0/image-to-video` for the final clips.
> 4. Return the clips in edit order with voiceover notes.
> 5. If the user wants one file, join the clips and the voiceover with ffmpeg on the Studio and say so. Do not claim the clips are stitched unless you stitched them.

**Hook variant set.**

> Use for paid social testing.
>
> 1. Keep the product and proof constant.
> 2. Produce 3-5 hooks that vary by angle only: pain, curiosity, demo, result,
>    objection.
> 3. Reuse the same speaker, crop, and product references for fair comparison.
> 4. Return a manifest with hook, endpoint, and any defects per variant.

**SL8:** one angle vocabulary, the examples table's: `pain`, `curiosity`, `proof` (fal's "demo"),
`objection`, `result` (`fal/ugc-3c015f#35`).

**UGC to polished ad.**

> Use when the user wants native creator footage but a cleaner final.
>
> 1. Generate the creator or demo clip first.
> 2. Generate product hero stills (`openai/gpt-image-2` or `fal-ai/nano-banana-pro`).
> 3. Add a clean final frame with safe space for external copy.
> 4. Keep platform-native pacing; do not over-style the creator shot.

**SL8:** a still made from a product photo runs on the `/edit` route of either model with the photo
as `--ref` (MKT-D526).

## Worked examples

fal: adapt each to the real product, supplied media, selected endpoint and schema; they are patterns,
not prompts to paste (`fal/ugc-3c015f#37`).

Skincare creator ad (`fal/ugc-3c015f@example: skincare creator ad`):

> 9:16 direct-to-camera bathroom counter video, casual creator holding the
> uploaded amber serum bottle near face level, natural morning window light,
> speaks in a calm conversational tone: "I wanted something lightweight for my
> morning routine, and this texture is the part I noticed first." Cut to close-up
> of one drop spreading on the back of the hand, product label remains unchanged,
> no generated captions, no medical claims

SaaS founder clip (`fal/ugc-3c015f@example: SaaS founder clip`):

> 9:16 founder-style desk video, laptop slightly visible in background, speaker
> looks into phone camera and explains one workflow problem in simple language,
> casual office lighting, small hand gestures, no fake screen text, no invented
> metrics, ends with a clean laptop b-roll frame for external CTA

Product demo b-roll (`fal/ugc-3c015f@example: product demo b-roll`):

> vertical phone-style b-roll, hand opens the uploaded travel mug, close-up of
> lid mechanism, quick pour on kitchen counter, natural handheld movement,
> realistic contact shadows, product color and logo unchanged, no text overlays

What to carry from them (`fal/ugc-3c015f#38`–`#42`): name the uploaded item; on an audio-native route
put the spoken line in quotes with its delivery direction; on b-roll ask for natural handheld movement
and realistic contact shadows; end on a clean frame for an external CTA; close every prompt with
negative guardrails. **SL8:** a talking head on `veed/fabric-1.0` takes no prompt at all (it animates
the portrait from the audio), so there the seven layers shape the portrait, not a prompt.

## Hook variant table

From `fal/ugc-3c015f@example: hook variant table`:

> | Variant | Hook angle | Opening visual                            |
> | ------- | ---------- | ----------------------------------------- |
> | A       | pain point | messy desk or problem state               |
> | B       | curiosity  | creator holding product half in frame     |
> | C       | proof      | close-up of product action                |
> | D       | objection  | speaker raises common concern             |
> | E       | result     | final visible state, no unsupported claim |

## Quality bar

The assessment's SL8 version of `fal/ugc-3c015f@quality bar checklist` (WF19-a2 adapted prompts):

> Before returning, grab frames with ffmpeg at 0.5 s, 1.5 s, the midpoint and the last frame of every clip, read the duration with ffprobe, and look at the frames next to the product and portrait inputs:
>
> - The clip reads as plausible creator content, not a studio commercial.
> - Script length fits the requested runtime; first 1-2s carry a clear hook.
> - Mouth motion is synced when a speaking face is used.
> - Product shape, packaging, and logo stay stable.
> - Claims are user-supplied or phrased as visible observations.
> - Captions/text overlays are not hallucinated inside the video.
>
> If the face drifts, shorten the script, use cleaner portrait/audio inputs, or
> switch from a generated avatar to lip-syncing approved source footage.

**SL8:** still frames cannot show lip-sync or audio quality; those two items go to the owner's
review, never marked passed (HR14, MKT-D533).

## Points added from other sources

The assessment's enrichments of WF19-a2 (WF19.json `enrichment`), each in its source's words:

- fal audio generation (`fal/falaudiogeneration-ba1a03#36`, `#40`, `#17`, `#20`): "Measured 2.82 w/s
  for Brian on multilingual-v2 at speed 1.0 in English (56 words -> 19.83 s) is a starting estimate
  only." "Do not try to hit the target with words: three renders at identical settings gave 2.93,
  3.19 and 3.04 w/s (±4%, about ±0.8 s on 20 s) and multilingual-v2 exposes no seed." "rate_wps is
  measured, never assumed, and stored per voice." "multilingual-v2 and turbo-v2.5 have no
  output-format field: always MP3; set apply_text_normalization "on" because auto reads $1,299
  inconsistently."
- Creative Claw, Apache-2.0 (`creative-claw/cc-model-contracts-speech#29`): "ElevenLabs v2 has no
  phonetic input: IPA or phoneme tags are read aloud as letters and SSML phoneme tags are rejected;
  respell (A.I. for an acronym) or use a model with phonetic input for that line."
- Creative Claw (`creative-claw/cc-video-model-guides#96`, `#97`): "Listen to and fix the
  replacement speech (wording, pronunciation, voice, emotion, pacing) before paying to synchronize;
  align pauses with the visible performance; for fixed timing make the speech fit first."
  "Singing, overlapping speakers, fast cuts, covered mouths or extreme angles need careful
  evaluation; no reliable results promised."
- Creative Claw (`creative-claw/cc-model-contracts-video#26`): "A portrait alone also defines
  clothing and background; it is not a face-only reference."
- Creative Claw (`creative-claw/cc-video-model-guides#21`, `#23`): "For reusable B-roll: one subject,
  one action, one camera idea; say "single continuous shot, no scene cuts" when cuts would make the
  clip unusable." "Describe native audio explicitly, including explicit silence ("Generate a silent
  clip; no music, speech, ambience, or sound effects."); keep spoken copy short enough to fit and
  quote it."
- Kling, MIT (`kling/klingaigeneratevideo-5f0e8c#63`): "9:16: immediate visual hook, central vertical
  action, face/product in upper two-thirds, UI-safe lower area; 1:1: medium framing, readable
  silhouette, restrained lateral movement; 16:9: wider geography, stronger entrances/reveals,
  intentional negative space."
- fal script writer (`fal/falscriptwriter-171d8c#27`): "The hook is not an intro: five words and one
  legible image; a logo sting in the first two seconds spends the hook on the tagline's beat (VO may
  still name the brand)."
