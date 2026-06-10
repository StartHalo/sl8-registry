---
derive_from:
  source_file: 1-requirements.md
  jtbds:
    - JTBD-1
    - JTBD-2
    - JTBD-3
    - JTBD-4
  derivation_method: outputs+acceptance+failure
  derived_at: 2026-06-10T01:03:27.478Z
skill: bot-013-stickman-art
target_score: 0.8
publish_threshold: 0.75
stuck_window: 5
max_iterations: 40
diversity_interval: 5
judge_model: claude-sonnet-4-6
rubric:
  dimensions:
    - id: source-image-quality
      weight: 0.036
      source: llm-judge
      jtbd_source: JTBD-1
      judge_prompt: "This dimension comes from JTBD-1 (Lock a stickman character) and scores the source image at artifacts/<project>/02-character/source.png. Award 10 if the image shows exactly one stick figure with single-stroke limbs (no double outlines or filled shapes), a circle head, and a visible cap, rendered in hand-drawn pencil-sketch style on a white or off-white paper background with no color fills and no text present anywhere. Award 5 if the figure is present and mostly minimal but has one deviation: slight color tinting, a faintly textured background, a missing cap, or one limb with a double-stroke outline. Award 0 if the image contains more than one figure, uses photorealistic or painted rendering, contains colored fills, includes garbled or legible text, or contains no figure at all."
    - id: turnaround-sheet-quality
      weight: 0.036
      source: llm-judge
      jtbd_source: JTBD-1
      judge_prompt: This dimension comes from JTBD-1 (Lock a stickman character) and scores the turnaround sheet at artifacts/<project>/02-character/turnaround.png. Award 10 if the sheet contains at least three clearly distinguishable views — front, ¾ or profile, and back — where the cap shape, head-to-torso proportions, and single-stroke limb weight are visually identical across all views, and each view occupies a separate spatial region (side-by-side or labeled panels). Award 5 if only two views are present, or three views exist but the cap is absent from one panel, or torso-to-limb proportions differ noticeably between at least two panels. Award 0 if only a single view is shown, or figures across panels appear to be different characters (different head size, absent cap, different stroke weight or style).
    - id: character-spec-shape
      weight: 0.036
      source: structural
      jtbd_source: JTBD-1
      assertion: "Assert that artifacts/<project>/02-character/character-spec.md contains all five required elements: a frozen character block of ≥40 words, a frozen style stack section, at least one explicit seed value, a model-used field for every generated asset, and a fal.media URL for every generated asset. The check fails if any of these five elements is absent or if the frozen character block word count falls below 40."
    - id: episode-plan-quality
      weight: 0.036
      source: llm-judge
      jtbd_source: JTBD-2
      judge_prompt: "This dimension comes from JTBD-2 (Plan an episode) and scores the episode plan at artifacts/<project>/01-episode-plan.md for structural completeness. Award 10 if the plan contains a logline, an aspect ratio field, a dedicated punchline line, and between 3 and 8 beats where every beat contains all five required fields: name, scene block, motion prompt, duration value, and at least one additional visual or camera note field. Award 5 if the plan contains a logline and 3–8 beats but one or two beats are each missing one field, or the punchline line is absent, or the aspect ratio is not stated. Award 0 if fewer than three beats are present, the logline is absent, or individual beats contain only one or two fields each."
    - id: same-artifact-quality-quality
      weight: 0.036
      source: llm-judge
      jtbd_source: JTBD-2
      judge_prompt: This dimension comes from JTBD-2 (Plan an episode) and scores the narrative and prompt craft of the episode-plan artifact at artifacts/<project>/01-episode-plan.md. Award 10 if the beats form a clear escalating arc — each beat raises stakes or absurdity — ending in a visual punchline or anticlimax on the final beat, every scene block describes exactly one concrete physical action in a domestic or everyday setting (kitchen, desk, street, etc.) with no abstract emotional framing, every motion prompt contains exactly one action verb and at most one camera move, and the words 'music', 'narration', 'voice', or 'audio' appear nowhere in the file. Award 5 if the arc partially escalates but flattens mid-sequence, or one to two scene blocks use abstract framing (e.g., 'character feels overwhelmed'), or one to two motion prompts list two simultaneous actions, or a music or narration reference appears once. Award 0 if no escalating arc is discernible, scene blocks describe settings or emotions rather than actions, or motion prompts contain narration or audio instructions throughout.
    - id: beat-stills-shape
      weight: 0.036
      source: structural
      jtbd_source: JTBD-3
      assertion: "Assert that artifacts/<project>/03-stills/ contains numbered PNG files matching the pattern NN-<beat>.png, with at least 80% of the beats listed in 01-episode-plan.md represented (rounded down: a 5-beat plan requires ≥4 files). The check fails if the ratio of present still files to planned beats falls below 0.80."
    - id: stills-log-shape
      weight: 0.036
      source: structural
      jtbd_source: JTBD-3
      assertion: "Assert that artifacts/<project>/03-stills/stills-log.md exists and contains one entry per still file, where every entry includes all five fields: beat identifier, model used, full generation prompt, fal.media URL, and self-check result. The check fails if the file is absent, if any entry is missing one or more of the five required fields, or if the number of log entries is fewer than the number of still files present."
    - id: stills-quality-quality
      weight: 0.036
      source: llm-judge
      jtbd_source: JTBD-3
      judge_prompt: This dimension comes from JTBD-3 (Generate character-consistent scene stills) and scores the full set of still images in artifacts/<project>/03-stills/. Award 10 if every still shows the same figure as the locked spec — same cap shape, same head-to-torso proportions, same single-stroke limb weight — pencil-sketch rendering on white or off-white background is uniform across all stills, each still depicts exactly one recognizable physical action (not two simultaneous actions), and the background environment is rendered with realistic detail while the figure itself remains minimal and line-drawn. Award 5 if one to two stills deviate in cap presence or limb proportions while the remainder match the spec, or the pencil-sketch texture is inconsistent in one still (slightly colored or shaded), or one still depicts an ambiguous or dual action. Award 0 if the character's appearance changes in three or more stills (different cap, different proportions, different stroke style), any still is photorealistic throughout, or the figure is absent or unrecognizable in at least one still.
    - id: beat-clips-shape
      weight: 0.036
      source: structural
      jtbd_source: JTBD-4
      assertion: Assert that artifacts/<project>/04-clips/ contains one MP4 file per kept still — where 'kept' means not marked as permanently failed in stills-log.md — using the naming pattern NN-<beat>.mp4; still-as-segment fallback clips count toward this check but must be flagged in 05-summary.md. The check fails if any kept still lacks a corresponding clip file in 04-clips/.
    - id: episode-shape
      weight: 0.036
      source: structural
      jtbd_source: JTBD-4
      assertion: Assert that artifacts/<project>/episode.mp4 exists as a playable MP4 file with a measured duration between 15 and 60 seconds inclusive, uses the aspect ratio declared in 01-episode-plan.md, and contains a segment for every kept beat in the order they appear in the plan. The check fails if the file is absent, unplayable, outside the 15–60s range, uses a different aspect ratio, or omits any kept beat's segment.
    - id: summary-shape
      weight: 0.036
      source: structural
      jtbd_source: JTBD-4
      assertion: Assert that artifacts/<project>/05-summary.md contains a per-clip section for every clip recording all five fields (model, dialect/variant, full generation prompt, duration, fallbacks taken) and an episode-level section recording all four fields (total duration, aspect ratio, audio treatment, limitations/notes). The check fails if the file is absent, if any per-clip entry omits one of its five required fields, or if the episode-level section omits any of its four required fields.
    - id: episode-quality-quality
      weight: 0.036
      source: llm-judge
      jtbd_source: JTBD-4
      judge_prompt: This dimension comes from JTBD-4 (Generate beat clips and assemble the episode) and scores the assembled episode.mp4 for visual coherence across clips. Award 10 if the stick figure in every clip matches the locked character spec from 02-character/source.png (same cap, same head-to-torso proportions, same single-stroke limb weight), pencil-sketch rendering persists in every clip without any segment lifting to photorealistic or smooth-gradient style, each clip's visible motion matches the action verb stated in its beat's motion prompt, no clip contains extra limbs, melting joints, or identity collapse of the figure, and each cut occurs at a beat boundary with no mid-beat interruptions. Award 5 if one to two clips show minor character drift (cap fades or proportions shift slightly) while the rest are spec-compliant, or one clip contains a single-frame artifact (extra limb) while the remainder are clean, or one cut lands slightly off-beat. Award 0 if the character is unrecognizable in three or more clips, any clip is fully photorealistic, or multiple clips contain severe artifacts such as melted joints, duplicated figures, or a missing figure throughout.
    - id: primary-image-model-unavailable-edge-handling
      weight: 0.036
      source: llm-judge
      jtbd_source: acceptance-scenario:JTBD-1
      judge_prompt: This dimension comes from acceptance-scenario JTBD-1 (primary image model unavailable edge case) and scores the bot's fallback behavior when fal-ai/flux-dev returns an error during JTBD-1. Award 10 if the bot uses the immediately next model in the documented fallback chain without skipping entries or improvising out-of-chain models, completes generation successfully with that fallback model, and character-spec.md records a model-used field per asset that names the specific fallback model rather than the original primary. Award 5 if the bot uses a fallback model but skips to a non-adjacent chain entry, or character-spec.md records only 'fallback used' without naming the specific model that generated each asset. Award 0 if the bot uses a model absent from the documented chain, aborts without attempting any fallback, or character-spec.md contains no indication of which model generated each asset.
    - id: vague-topic-edge-handling
      weight: 0.036
      source: llm-judge
      jtbd_source: acceptance-scenario:JTBD-2
      judge_prompt: This dimension comes from acceptance-scenario JTBD-2 (vague topic edge case) and scores the bot's response when context.md contains only 'life' as the topic. Award 10 if the episode plan commits to exactly one concrete everyday scenario with a specific, actionable premise (e.g., 'phone battery dies mid-navigation') rather than the abstract concept 'life', and the plan's notes section contains an explicit assumption sentence stating both the chosen scenario and the reason it was selected. Award 5 if the plan contains a somewhat concrete scenario but it remains generic (e.g., 'a daily routine'), or the assumption is present in the plan body rather than a dedicated notes section, or the assumption sentence omits a rationale for the choice. Award 0 if the plan retains 'life' as the operative theme without resolving it to a concrete scenario, or no assumption is recorded anywhere in the document.
    - id: one-beat-keeps-failing-edge-handling
      weight: 0.036
      source: llm-judge
      jtbd_source: acceptance-scenario:JTBD-3
      judge_prompt: This dimension comes from acceptance-scenario JTBD-3 (one beat keeps failing edge case) and scores the bot's behavior when beat 3's prompt fails on every model in the chain. Award 10 if still files for all non-failing beats (e.g., beats 1, 2, 4, 5 in a 5-beat plan) are present in 03-stills/, stills-log.md contains an entry for beat 3 with an explicit 'skipped' status, and that entry records the specific error message returned by each failed model attempt individually. Award 5 if non-failing beats are generated but stills-log.md marks beat 3 as skipped without recording per-model error messages, or beat 3's log entry is absent entirely while the other stills are present. Award 0 if the bot halts generation after beat 3's failure and does not produce stills for subsequent beats, or stills-log.md is not updated at all to reflect the failure.
    - id: one-clip-fails-on-all-video-models-edge-handling
      weight: 0.036
      source: llm-judge
      jtbd_source: acceptance-scenario:JTBD-4
      judge_prompt: This dimension comes from acceptance-scenario JTBD-4 (one clip fails on all video models edge case) and scores the bot's behavior when beat 2's image-to-video generation fails across the entire model chain. Award 10 if episode.mp4 contains a segment for beat 2 produced via ffmpeg zoompan (or an equivalent subtle zoom applied to the source still) covering the planned beat duration, and 05-summary.md contains an explicit 'still-segment fallback' label for beat 2 along with the names and error codes of all chain members that were attempted. Award 5 if episode.mp4 contains a static or minimally animated segment for beat 2 but 05-summary.md labels it only as a generic 'fallback' without naming failed models, or the fallback segment is present but 05-summary.md omits the beat 2 entry entirely. Award 0 if beat 2 is absent from episode.mp4, the bot halts assembly without completing the episode, or 05-summary.md makes no mention of beat 2's failure or fallback treatment.
    - id: primary-image-model-unavailable-404-fallback
      weight: 0.036
      source: llm-judge
      jtbd_source: failure-mode:JTBD-1
      judge_prompt: This dimension comes from failure-mode JTBD-1 (primary image model unavailable/404) and scores strict adherence to the documented fallback chain order. Award 10 if the bot attempts models exclusively in the documented chain sequence — advancing only to the next entry after each failure — without skipping entries or inserting out-of-chain models, and character-spec.md records the actual model name used for each generated asset. Award 5 if the bot uses a fallback model but it is not the immediately next entry in the documented chain (one entry skipped), or character-spec.md retains the primary model's name in the model-used field despite a fallback having been used. Award 0 if the bot calls a model whose name does not appear anywhere in the documented chain (improvised substitution), or makes no fallback attempt and terminates generation.
    - id: generated-figure-off-style-photorealistic-fallback
      weight: 0.036
      source: llm-judge
      jtbd_source: failure-mode:JTBD-1
      judge_prompt: "This dimension comes from failure-mode JTBD-1 (generated figure off-style: photorealistic, colored, or multiple figures) and scores the one-retry recovery behavior. Award 10 if the bot issues exactly one retry with a prompt that adds explicit negative constraints not present in the original (e.g., appending 'no color fills, no photorealism, no multiple figures, no shading'), and if the retry also fails the bot saves the best available attempt as source.png and records in character-spec.md a deviation note that names the specific style violation observed (e.g., 'photorealistic rendering, colored skin tones'). Award 5 if the bot retries but the retry prompt does not add new negative constraints beyond the original, or the off-style image is saved but character-spec.md records only a generic phrase such as 'style mismatch' without describing the observed deviation. Award 0 if the bot issues more than one retry (violating the single-retry rule), discards the image without saving any result, or saves an off-style image with no note in character-spec.md."
    - id: all-models-in-chain-fallback
      weight: 0.036
      source: llm-judge
      jtbd_source: failure-mode:JTBD-1
      judge_prompt: This dimension comes from failure-mode JTBD-1 (all models in chain fail) and scores the clean-halt behavior when no model produces an image. Award 10 if character-spec.md contains a clearly labeled ERROR section that lists each model in the chain by name and the specific error it returned, state.md is updated to mark the JTBD-1 phase with an explicit 'failed' status, and no image file (placeholder or otherwise) is placed in 02-character/ without a corresponding explicit placeholder label. Award 5 if character-spec.md contains an ERROR section but lists only 'all models failed' without per-model error details, or state.md is updated with an ambiguous status value such as 'incomplete', or a placeholder image exists in 02-character/ but is labeled as such in the filename or in character-spec.md. Award 0 if the bot fabricates or copies any image into 02-character/ as a stand-in without documenting failure, or neither character-spec.md nor state.md is updated to reflect that the phase failed.
    - id: missing-topic-fallback
      weight: 0.036
      source: llm-judge
      jtbd_source: failure-mode:JTBD-2
      judge_prompt: This dimension comes from failure-mode JTBD-2 (missing topic) and scores the bot's halt behavior when context.md contains no topic field. Award 10 if the bot does not invent a topic, writes no 01-episode-plan.md artifact, updates state.md to mark the JTBD-2 phase as 'failed', and includes the specific phrase 'topic required' or a functionally identical explicit label in the state.md failure note. Award 5 if the bot halts and updates state.md but the failure note is vague (e.g., 'missing input') without naming topic as the required field, or a partial 01-episode-plan.md is created that contains a heading but no beats. Award 0 if the bot invents a topic and proceeds to write a full episode plan, or the bot exits without updating state.md to reflect any failure.
    - id: vague-topic-fallback
      weight: 0.036
      source: llm-judge
      jtbd_source: failure-mode:JTBD-2
      judge_prompt: This dimension comes from failure-mode JTBD-2 (vague topic) and scores the disambiguation behavior when a topic is present but abstract. Award 10 if the bot selects a concrete, actionable scenario whose domain maps unambiguously to one of the four documented ideation territories (life hacks, money, habits, digital life), the scenario contains a specific premise rather than a category label (e.g., 'accidentally sending an email to the wrong person' not 'email mistakes'), and 01-episode-plan.md's notes section records both the chosen scenario and names the specific territory it was drawn from. Award 5 if the chosen scenario is concrete but its territory mapping is not recorded in the notes, or the scenario remains a category label without a specific premise. Award 0 if the bot proceeds with the vague topic unchanged without any disambiguation, or the bot selects a scenario from outside the four documented territories without noting it as a deliberate exception.
    - id: model-failure-fallback
      weight: 0.036
      source: llm-judge
      jtbd_source: failure-mode:JTBD-3
      judge_prompt: This dimension comes from failure-mode JTBD-3 (model failure during still generation) and scores correct fallback-chain traversal and skip logic. Award 10 if for every failing beat the bot attempts each model in the documented chain in order before declaring failure, marks a beat as skipped in stills-log.md only after all chain members are exhausted for that beat, continues generating all remaining beats without halting, and the delivered still set covers at least 80% of planned beats (rounded down). Award 5 if the bot uses the fallback chain but advances to a non-adjacent chain member on failure, or marks a beat skipped after only one model's failure without exhausting the chain, or the still coverage falls between 60% and 80%. Award 0 if the bot halts all still generation after the first beat failure, stills-log.md is not updated to mark any skipped beat, or the bot ignores the fallback chain entirely.
    - id: json-response-missing-the-fallback
      weight: 0.036
      source: llm-judge
      jtbd_source: failure-mode:JTBD-3
      judge_prompt: This dimension comes from failure-mode JTBD-3 (JSON response missing the hosted URL) and scores the single-regeneration recovery. Award 10 if when a model returns a JSON response without a fal.media hosted URL, the bot issues exactly one regeneration call for that still using the same prompt and model parameters as the original, records the outcome (URL present or still absent) in stills-log.md, and marks the beat skipped only if the retry also returns no URL. Award 5 if the bot retries but modifies the prompt or model parameters on the retry (violating same-parameters expectation), or the retry result is not recorded in stills-log.md. Award 0 if the bot makes no retry attempt and immediately marks the beat failed or skipped upon receiving a response with no URL, or the bot issues more than one retry attempt for the same missing-URL failure on a single beat.
    - id: text-bearing-still-one-word-label-fallback
      weight: 0.036
      source: llm-judge
      jtbd_source: failure-mode:JTBD-3
      judge_prompt: This dimension comes from failure-mode JTBD-3 (text-bearing still with garbled one-word label) and scores correct routing of text-label beats. Award 10 if when a still's text label is detected as garbled, the bot either re-routes that beat's generation to a specifically documented text-capable model (ideogram or SD3.5) or removes the text label from the prompt citing a plan note, and stills-log.md records which action was taken, which model was used, and the reason for the routing decision. Award 5 if the bot re-routes to a text-capable model not listed in the documented options (undocumented text model), or the label is dropped but no plan note or log entry records the decision, or the log entry names the action but omits the model used. Award 0 if the bot retains the garbled still as the final output for that beat without rerouting or label removal, or makes no modification to the prompt and does not record the garbling issue in stills-log.md.
    - id: i2v-model-failure-fallback
      weight: 0.036
      source: llm-judge
      jtbd_source: failure-mode:JTBD-4
      judge_prompt: This dimension comes from failure-mode JTBD-4 (i2v model failure) and scores full fallback-chain traversal and still-as-segment recovery. Award 10 if for any failing beat the bot attempts video generation in the documented order (kling-i2v → minimax-i2v → wan-i2v), applies an ffmpeg zoompan or documented equivalent subtle-zoom effect on the beat's source still for the planned beat duration only after all three chain members have been exhausted, and 05-summary.md records the still-as-segment fallback for that beat along with the names and error codes of all three failed models. Award 5 if the bot applies the still-as-segment fallback after only one or two chain failures without exhausting all three models, or the fallback is applied correctly but 05-summary.md does not list all three failed model names. Award 0 if the beat is dropped entirely from episode.mp4 rather than replaced with a still-as-segment, or the bot halts video assembly after a single model failure without attempting the full chain.
    - id: generation-exceeds-default-timeout-fallback
      weight: 0.036
      source: llm-judge
      jtbd_source: failure-mode:JTBD-4
      judge_prompt: This dimension comes from failure-mode JTBD-4 (generation exceeds default timeout) and scores the single-retry with raised timeout. Award 10 if when a generation call exceeds the default timeout the bot issues exactly one retry for that clip with the timeout parameter set to 900000 (milliseconds), records in 05-summary.md that a timeout retry was performed for the affected clip naming the new timeout value, and applies this single-retry rule without issuing further retries on the same clip. Award 5 if the bot retries with a raised timeout but sets a value other than 900000, or issues more than one retry on the same clip for timeout, or performs the retry correctly but does not record the timeout escalation in 05-summary.md. Award 0 if the bot does not retry after a timeout and immediately marks the clip as failed without attempting the timeout increase, or retries with the same default timeout value that already failed.
    - id: concat-mismatch-codec-fps-fallback
      weight: 0.036
      source: llm-judge
      jtbd_source: failure-mode:JTBD-4
      judge_prompt: This dimension comes from failure-mode JTBD-4 (concat mismatch due to codec or FPS differences) and scores whether a uniform re-encode pass precedes concatenation. Award 10 if when a codec or FPS mismatch is detected among the clips, the bot runs a single ffmpeg re-encode pass across all clips to a uniform codec and frame rate before the concat operation, and 05-summary.md or the bot's run log notes that a uniform re-encode pass was performed and names the target codec and FPS used. Award 5 if the bot re-encodes only the mismatched clip(s) rather than all clips (partial re-encode leaving potential future mismatch risk), or performs the full re-encode correctly but does not record it in 05-summary.md. Award 0 if the bot attempts concat without any re-encode pass and episode.mp4 is unplayable or missing segments due to the mismatch, or the bot aborts assembly entirely without attempting re-encoding.
    - id: episode-under-15s-after-fallback
      weight: 0.028
      source: llm-judge
      jtbd_source: failure-mode:JTBD-4
      judge_prompt: This dimension comes from failure-mode JTBD-4 (episode under 15s after failures) and scores the deliver-and-flag behavior when the assembled episode falls below the minimum duration. Award 10 if episode.mp4 is present and playable regardless of its duration, 05-summary.md contains a prominently placed duration warning in the episode-level section (not buried in a per-clip entry) that names the measured duration and explicitly states the 15s minimum was not met, and state.md records the final measured duration along with an explicit flag for the duration-constraint violation. Award 5 if episode.mp4 is delivered but the warning in 05-summary.md is placed inside a per-clip entry rather than the episode-level summary section, or state.md is updated with the duration but does not reference the 15s constraint. Award 0 if the bot withholds or discards episode.mp4 because the duration is under 15s, or delivers the file with no warning or flag in either 05-summary.md or state.md.
guardrails:
  must_pass:
    - smoke_install
    - memory_persistence
    - output_validator
  forbidden_edits:
    - bot/CLAUDE.md
    - bot/skills/bot-013-stickman-art/iteration-charter.md
---

## Notes for the proposer

(Auto-generated charter. Review every `judge_prompt` for tightness — anchors at 0/5/10 should name concrete properties, not abstract adjectives. Re-balance weights to reflect what the user cares most about. Replace this notes block with bot-specific guidance.)

## Mapping: JTBDs → rubric dimensions

| Dimension | JTBD source | Notes |
|---|---|---|
| `source-image-quality` | JTBD-1 | depicts exactly ONE minimal stick figure matching the spec (single-stroke limbs, |
| `turnaround-sheet-quality` | JTBD-1 | shows ≥3 distinct views (front / ¾ or profile / back) of the SAME figure — cap,  |
| `character-spec-shape` | JTBD-1 | structural — mechanical check |
| `episode-plan-quality` | JTBD-2 | contains logline, aspect, punchline line, and 3–8 beats EACH with all 5 fields ( |
| `same-artifact-quality-quality` | JTBD-2 | beats form an escalating arc ending in a visual punchline/anticlimax; each scene |
| `beat-stills-shape` | JTBD-3 | structural — mechanical check |
| `stills-log-shape` | JTBD-3 | structural — mechanical check |
| `stills-quality-quality` | JTBD-3 | character matches the locked spec in EVERY still (cap, proportions, stroke style |
| `beat-clips-shape` | JTBD-4 | structural — mechanical check |
| `episode-shape` | JTBD-4 | structural — mechanical check |
| `summary-shape` | JTBD-4 | structural — mechanical check |
| `episode-quality-quality` | JTBD-4 | character identity persists across clips (same figure as 02-character); pencil-s |
| `primary-image-model-unavailable-edge-handling` | acceptance-scenario:JTBD-1 | primary image model unavailable (edge) — Given fal-ai/flux-dev returns an error
 |
| `vague-topic-edge-handling` | acceptance-scenario:JTBD-2 | vague topic (edge) — Given context.md with topic "life"
    When JTBD-2 runs
    |
| `one-beat-keeps-failing-edge-handling` | acceptance-scenario:JTBD-3 | one beat keeps failing (edge) — Given beat 3's prompt fails on every model in th |
| `one-clip-fails-on-all-video-models-edge-handling` | acceptance-scenario:JTBD-4 | one clip fails on all video models (edge) — Given beat 2's i2v generation fails  |
| `primary-image-model-unavailable-404-fallback` | failure-mode:JTBD-1 | Recovery: walk the documented fallback chain in order; never invent out-of-chain |
| `generated-figure-off-style-photorealistic-fallback` | failure-mode:JTBD-1 | Recovery: one retry with reinforced negatives; if still off, keep best attempt a |
| `all-models-in-chain-fallback` | failure-mode:JTBD-1 | Recovery: write character-spec.md with an ERROR section and mark the phase faile |
| `missing-topic-fallback` | failure-mode:JTBD-2 | Recovery: mark phase failed in `state.md` with a clear "topic required" note (no |
| `vague-topic-fallback` | failure-mode:JTBD-2 | Recovery: choose a concrete scenario from the ideation territory (life hacks, mo |
| `model-failure-fallback` | failure-mode:JTBD-3 | Recovery: fallback chain in order; persistent per-beat failure → mark beat skipp |
| `json-response-missing-the-fallback` | failure-mode:JTBD-3 | Recovery: regenerate that still once. |
| `text-bearing-still-one-word-label-fallback` | failure-mode:JTBD-3 | Recovery: route that beat to the text-capable chain (ideogram/SD3.5) or drop the |
| `i2v-model-failure-fallback` | failure-mode:JTBD-4 | Recovery: fallback chain (kling-i2v → minimax-i2v → wan-i2v); all fail for a bea |
| `generation-exceeds-default-timeout-fallback` | failure-mode:JTBD-4 | Recovery: raise `--timeout` to 900000 and retry once. |
| `concat-mismatch-codec-fps-fallback` | failure-mode:JTBD-4 | Recovery: uniform re-encode pass before concat. |
| `episode-under-15s-after-fallback` | failure-mode:JTBD-4 | Recovery: deliver anyway, flag prominently in summary and state.md. |

