# Video prompt & motion craft

Video prompts have an extra axis images don't: **motion and camera over time**. Get this wrong and
you get a slideshow or a warping mess.

## Text-to-video: describe the scene AND the motion

State, briefly: subject + action, setting, **camera move**, lighting/time, style. The camera move is
the part people forget.

- **Camera language:** "slow dolly-in", "tracking shot following from the left", "crane up to reveal",
  "drone flyover", "locked-off static shot", "handheld, subtle shake".
- **Pacing:** name what happens across the clip ("she turns, then smiles") rather than a single frozen
  moment — video needs a beginning and end.

```
"Tracking shot following a cyclist down a wet neon-lit street at night, camera
gliding alongside, reflections on the asphalt, light rain, cinematic, 24fps"
```

## Image-to-video: describe the MOTION, not the image

The model already has the still — re-describing its contents wastes the prompt and confuses it. Say
only what should **move and how**.

- ✓ "the steam rises and drifts left; a slow push-in on the cup"
- ✗ "a coffee cup on a wooden table in a cafe" (that's the image, not the motion)

Keep i2v motions **achievable**: a gentle gesture, a camera pan, hair/cloth movement, a single action.
Complex multi-action choreography ("she walks over, picks up the phone, dials, and laughs") tends to
break — split it into shots or simplify.

## Reference-to-video

Address each `--ref` input in the prompt by position — `@Image1`, `@Image2` — and describe how they
relate and move: `"@Image1 walks toward @Image2 and they shake hands, slow dolly-in"`.

## Native audio

When the model supports it (`--audio on`), you can hint ambient/diegetic sound in the prompt
("ambient room tone, distant traffic"). For voiceover or designed sound, generate audio separately
(see the `ai-audio-generation` skill) and mux.

## Universal rules

- **One controlled change per iteration** (seed fixed) so you can tell what moved the needle.
- **Match aspect to the destination** up front (`--aspect-ratio 9:16` for vertical) — re-rendering is
  the expensive part.
- **Draft cheap** (low res, short duration) to lock motion, then finalize.

When the `cinematic-video` skill is installed it adds shot-type/lens/lighting/continuity grammar for
directing (not just prompting) video models; this file is the self-sufficient core.
