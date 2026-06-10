# Seedance dialect (opportunistic upgrade — discovery-gated)

**Use ONLY when Step 1 discovery shows a `fal-ai/bytedance/seedance/*` model id
routed** (in `ai-gen models --type video --format json` output, or proven by a
successful attempt). As of the 2026-06-09 pin, no Seedance model is in the
curated catalog and none has been live-verified on the proxy — this dialect is
the upgrade path, not the plan. If discovery doesn't show it, close this file
and use `clip-dialects.md`.

Why it's worth a dialect file: Seedance does **multi-shot inside one
generation** ([CUT] markers, timecodes), reference-to-video, and (1.5-pro/2.0)
**native audio** — the source PDF's whole technique was written for it. When it
appears on the proxy, the bot upgrades by swapping prompt dialect, not by
redesigning the pipeline.

## How to run it

Prepend the discovered id to the chain so the standard models stay as fallback:

```bash
export CLIP_CHAIN="fal-ai/bytedance/seedance/v1/pro/image-to-video fal-ai/kling-i2v fal-ai/minimax-i2v fal-ai/wan-i2v"
```

`gen-clip.sh` works unchanged (same `--image` URL input, same JSON output, same
timeout/retry). Only the prompt text changes. If the Seedance attempt fails,
the chain falls through to kling — **recompose the prompt in the single-shot
dialect for the fallback models** (they will render `[CUT]` and timecodes as
nonsense motion). Practical pattern: try the Seedance prompt on the Seedance id
first via `CLIP_CHAIN="<seedance-id>"`; on failure, rerun gen-clip.sh with the
single-shot prompt and the default chain.

## Prompt patterns (from the source PDF §7–13 + kb prompting-seedance-2)

Every video prompt still opens with the verbatim style lock:

```
A stick figure hand-drawn pencil sketch animation.
```

### [CUT] multi-shot
```
A stick figure hand-drawn pencil sketch animation.
[CUT] the stickman stares at the flat-pack box on the floor
[CUT] close up, he flips the instruction sheet upside down
[CUT] wide of the half-built shelf leaning badly
NO MUSIC, ONLY AMBIENT SOUND
```
Sweet spot is **2–3 shots per generation**; at ≥5 shots subject identity frays.
More shots → more clips, cut at assembly as usual.

### Timecoded shots
```
A stick figure hand-drawn pencil sketch animation.
[00:00-00:03] wide shot of the stickman lining up screws by size
[00:03-00:06] close up of one screw left over, he holds it up
[00:06-00:10] he shrugs and drops it in a drawer, saying "spare part."
NO MUSIC, ONLY AMBIENT SOUND
```

### Multishot mini-story (loose)
```
Multiple variety of shots of this stickman assembling flat-pack furniture.
He's confident at first. The shelf comes out crooked. He turns it upside down
and calls it modern. NO MUSIC, ONLY AMBIENT SOUND
```

### Reference-to-video (Seedance 2.0 only)
Up to 9 images addressed in-prompt as `@Image1`, `@Image2`, …  — this is the
PDF's collage/donor-frame technique natively: pin the approved still (or the
turnaround sheet) as `@Image1` and open with `[CUT] @Image1` so the first
keyframe IS the approved frame. Check `ai-gen` flag support at runtime
(`--params-file` for multi-image payloads); this has never been exercised on
the proxy.

### Dialogue
Inline quoted speech with optional delivery note, ≤16 words, punchline-only:
`he sighs and says: "I work better under pressure anyway."` One line per
episode (the format is dialogue-free except the punchline).

## The audio directive — never omit it

End **every** Seedance prompt with:

```
NO MUSIC, ONLY AMBIENT SOUND
```

(append `NO TALKING` when there's no punchline line). Why: Seedance generates
audio natively, and when the directive is omitted **stock music leaks into the
clip** — the community-documented failure. The stickman skit format is
ambient/diegetic sound only (pencil scratches, footsteps); leaked music breaks
the genre contract and can't be removed cleanly afterwards.

Assembly consequence: Seedance clips arrive WITH audio. `assemble.sh` already
handles this (it normalizes every clip to a uniform aac track and mixes room
tone *under* existing audio with `normalize=0`). Consider `--no-roomtone` when
clips carry real ambient sound — and state the audio treatment either way in
05-summary.md.

## Character consistency in multi-shot prompts

Identity drift across shots is Seedance's known failure mode. Mitigations, in
order of strength:
1. Same input image (the approved still / `@Image1` reference) for every
   generation of the same character.
2. Repeat the character's frozen description (from
   `02-character/character-spec.md`) once in the prompt body when shots get
   busy — e.g. "the same minimal stick figure with the small tilted cap in
   every shot".
3. Keep to 2–3 shots per generation.

## Failure modes

| Symptom | Cause | Response |
|---|---|---|
| Identity drifts between shots | too many shots / no reference | ≤3 shots; reuse same input image |
| Stock music in the clip | audio directive omitted | regenerate WITH the directive — do not ship leaked music |
| Garbled in-frame text | Seedance text rendering is unreliable | keep text on stills/caption card |
| Model 404s despite being listed | catalog volatility | fall through the chain; recompose single-shot |
