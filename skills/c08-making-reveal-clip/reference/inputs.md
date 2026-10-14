# Input defaults

Step 1 reads this table. When the brief is silent on an input, use its default and record it in PROGRESS.md under Decisions. Never ask.

| Input | Default |
|---|---|
| product (name, category, material, colour, scale, logo rules) | required. Without it the job ends partial and states the reason |
| hero_frame (approved frame in artifacts/attachments/) | none: generate the hero frame first (step 6). If the brief names a file that is missing, the job stops partial (step 3) |
| product_packshot (in artifacts/attachments/) | none: the hero still is generated from text only, and PROGRESS.md flags that the product's look comes from the brief alone (owner review item) |
| logo | none. A logo never goes through a model (HR10). Name it as a debt for media-motion-graphics, or report it as unused |
| duration | 4 s (media-video-generation Step 0). Seedance takes the string "4" (enum "4" to "15", never "auto"). |
| opening_frame | the hero frame as composed: product centred on a clean background |
| camera_movement | slow push-in (one of push-in, turntable, parallax, reveal, pour, unwrap). One move per clip |
| feature_to_reveal | the product's front face and label, revealed by the camera move. Nothing is invented |
| lighting_change, background_motion | lighting matched to the product material (material cues); static background |
| platform / aspect | 16:9. 9:16 when the brief names vertical or a story platform; 1:1 for square |
| brand_tone | premium |
| constraints | preserve packaging and logo, no new labels, no fake readable copy, no text in frame |
| quality_tier | final (bytedance/seedance-2.0/image-to-video), always. A brief asking for a draft is rendered on the final route and the choice is stated under Decisions |
| model_preference | the kit's routes. A model the brief names wins (HR20), checked with ai-gen info and estimated before it runs |
| resolution | 720p |
| audio | off, with generate_audio pinned false |
| budget | SL8_SPEND_CEILING less the ledger (manifest.mjs budget). With no ceiling and no budget in the brief there is no spend authority: a gate opens and the job ends partial |
| gate answer | none. With no answer, an open gate means the job spends nothing, restates the question and ends partial again. A Stop answer spends nothing and ends partial |
| supplied copy and claims | none is generated. Supplied copy is a debt for media-motion-graphics to burn in afterwards |
| waiver instructions | none. When the brief gives one, it is carried out and recorded with manifest.mjs waive in step 1, before anything is spent |
| project | kebab-case slug of the product name plus -reveal |
