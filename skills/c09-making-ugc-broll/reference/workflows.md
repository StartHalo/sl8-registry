# UGC workflows

## Portrait plus script

Use when the user supplies or approves a face image and script.

1. Keep script short and conversational.

2. Have the portrait ready as an input image (passed with `--image` in the same call; there is no upload step).
3. If using generated audio, create or approve the voice first: load `media-audio-generation` (Skill tool) and use its TTS route (SKILL.md step 8).
4. Run `veed/fabric-1.0` or `veed/fabric-1.0/text` after reading its schema with `ai-gen info`. This is not runnable on SL8 today (no Studio route and no verified price), so the kit opens a route gate instead (SKILL.md step 11).
5. Take the result paths from `files[0].local_path` in the ai-gen result envelope.

6. Reject outputs with mouth drift, frozen expression, or identity drift.

## Existing footage plus new audio

Use when the user has a real creator clip and wants new speech.

1. Have the source video and clean audio ready as inputs (`--video` and `--audio-file` in the same call; a clip above 3 MB needs rate-limited proxy storage).
2. Read `fal-ai/sync-lipsync/v2` with `ai-gen info`.
3. Run it with `video_url` and `audio_url` or matching schema fields. This is not runnable on SL8 today, so the kit opens a route gate instead (SKILL.md step 11).

4. Compare the result to the source video. The body, background, and timing
   should stay stable.

## Product b-roll plus voiceover

Use when no face is needed.

1. Generate or upload a product still.
2. Create 2-5 b-roll clips: problem, product action, proof, lifestyle, close.
3. Use Seedance image-to-video for final clips.
4. Return the clips in edit order with voiceover notes.
5. Do not claim the clips are stitched unless a model or editor has stitched
   them.

## Hook variant set

Use for paid social testing.

1. Keep the product and proof constant.
2. Produce 3-5 hooks that vary by angle only: pain, curiosity, demo, result,
   objection.
3. Reuse the same speaker, crop, and product references for fair comparison.

4. Return a manifest with hook, endpoint, request id, output path, and defects: one `manifest.mjs add` row per hook, plus the hook table in `artifacts/<project>/edit-order.md`.

## UGC to polished ad

Use when the user wants native creator footage but a cleaner final.

1. Generate the creator or demo clip first.

2. Generate product hero stills (`fal-ai/nano-banana-pro/edit` from the packshot, fallback `openai/gpt-image-2/edit`), or take the last frame of the last clip in edit order (SKILL.md step 12). For a standalone hero still, kit-product-hero is the kit.

3. Add a clean final frame with safe space for external copy.
4. Keep platform-native pacing; do not over-style the creator shot.
