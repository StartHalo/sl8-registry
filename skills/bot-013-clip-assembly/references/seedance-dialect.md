# Seedance dialect (the DEFAULT clip engine)

As of ai-gen v2.1.0 the proxy routes **`bytedance/seedance-2.0/fast/image-to-video`**
— this is the default i2v engine, verified in-session 2026-06-15. It animates the beat
still AND generates **native ambient audio**. `gen-clip.sh` defaults to it; read this
file first. `clip-dialects.md` covers only the older fallback families behind it.

> **Slug discipline:** the v2 namespace is the **bare** `bytedance/seedance-2.0/...`
> (e.g. `bytedance/seedance-2.0/fast/image-to-video`,
> `bytedance/seedance-2.0/reference-to-video`). The old `fal-ai/bytedance/seedance/*`
> form is **wrong** and 404s. Match `bytedance/seedance-2.0` when checking discovery.

## How to run it

The default chain in `gen-clip.sh` is already
`bytedance/seedance-2.0/fast/image-to-video → fal-ai/kling-video/v3/pro/image-to-video`,
forwarding `--resolution 720p --audio on --max-cost 360`. **Leave `CLIP_CHAIN` unset**
for the default. Override only to add/replace a model:

```bash
# e.g. add the non-fast tier for 1080p (more expensive), keeping fast as the lead:
export CLIP_CHAIN="bytedance/seedance-2.0/fast/image-to-video bytedance/seedance-2.0/image-to-video fal-ai/kling-video/v3/pro/image-to-video"
```

Cost (verified 2026-06-15, `ai-gen estimate`, basis pricing_api): 480p/4s=108 cr,
480p/5s=135 cr, **720p/5s=303 cr ≈ $1.21**. Fast tier has **no 1080p** (480p/720p only).
The `credits_used` JSON field over-reports for i2v — trust `estimate`/`balance`. Tune
via `CLIP_RESOLUTION` (480p halves cost), `CLIP_AUDIO`, `CLIP_MAX_COST`.

### The shipped pattern: one still → one clip (per-beat i2v)

The default is **single-still image-to-video**: each beat's approved still is the i2v
anchor frame; Seedance animates it for the beat's duration. The prompt is the 4-line
clip prompt from SKILL.md Step 2.1 (style lock · motion · negatives · audio directive).
This is simpler and cheaper than multishot and keeps identity tightest (one anchor
frame per clip). The edit happens at assembly, not inside one generation.

## Multishot / reference-to-video (the documented UPGRADE — not the default)

Seedance also does **multi-shot inside one generation** ([CUT] markers, timecodes) and
**reference-to-video** (≤9 image refs via `@Image1` addressing) — the source PDF's
collage/donor-frame technique natively. Use these only on an explicit request for the
multishot upgrade; the per-beat i2v default covers the shipped episode. Every prompt
still opens with the verbatim style lock and ends with the audio directive.

### [CUT] multi-shot
```
A stick figure hand-drawn pencil sketch animation.
[CUT] the stickman stares at the flat-pack box on the floor
[CUT] close up, he flips the instruction sheet upside down
[CUT] wide of the half-built shelf leaning badly
NO MUSIC, ONLY AMBIENT SOUND. NO TALKING.
```
Sweet spot is **2–3 shots per generation**; at ≥5 shots subject identity frays.

### Timecoded shots
```
A stick figure hand-drawn pencil sketch animation.
[00:00-00:03] wide shot of the stickman lining up screws by size
[00:03-00:06] close up of one screw left over, he holds it up
[00:06-00:10] he shrugs and drops it in a drawer, saying "spare part."
NO MUSIC, ONLY AMBIENT SOUND
```

### Reference-to-video (`bytedance/seedance-2.0/reference-to-video`)
Up to 9 images addressed in-prompt as `@Image1`, `@Image2`, … — pin the approved still
(or `source.png`) as `@Image1` and open with `[CUT] @Image1` so the first keyframe IS
the approved frame. Pass refs with repeated `--ref <path|url>` (v2.1.0 FR-5; ≤9 images
+ ≤3 videos + ≤3 audio, ≤12 total). This is the route for character-locked multishot.

### Dialogue
Inline quoted speech with optional delivery note, ≤16 words, punchline-only:
`he sighs and says: "I work better under pressure anyway."` One line per episode.

## The audio directive — never omit it

End **every** Seedance prompt with:

```
NO MUSIC, ONLY AMBIENT SOUND. NO TALKING.
```

(drop `NO TALKING` only on the one beat that carries the spoken punchline.) Why:
Seedance generates audio natively, and when the directive is omitted **stock music
leaks into the clip** — the community-documented failure. The stickman skit format is
ambient/diegetic sound only (pencil scratches, footsteps); leaked music breaks the
genre contract and can't be removed cleanly afterwards. `gen-clip.sh` appends this
directive defensively, but author it explicitly in the prompt file.

**Assembly consequence:** Seedance clips arrive WITH a native audio track. `assemble.sh`
preserves it and its room-tone default is **AUTO** — it adds a brown-noise bed only
when *no* clip has native audio (i.e. everything fell back to silent still-segments).
So for a normal Seedance run you pass neither room-tone flag. State the audio treatment
in 05-summary.md either way.

## Character consistency

Identity drift is the known i2v failure mode. Mitigations, in order of strength:
1. The anchor still itself is character-locked (phase 3 generated every still with
   `--ref source.png`) — so the i2v already starts from a consistent frame.
2. Reuse the same anchor frame per beat; for reference-to-video, pin `source.png` as
   `@Image1` in every generation.
3. Repeat the character's frozen description (from `02-character/character-spec.md`)
   once in the prompt body when a multishot prompt gets busy.
4. Keep multishot to 2–3 shots per generation.

## Failure modes

| Symptom | Cause | Response |
|---|---|---|
| Identity drifts between shots | too many shots / weak anchor | per-beat i2v default; ≤3 shots if multishot; reuse the anchor frame |
| Stock music in the clip | audio directive omitted | regenerate WITH the directive — do not ship leaked music |
| Garbled in-frame text | Seedance text rendering is unreliable | keep text on stills/caption card |
| Model 404s despite being listed | catalog volatility / wrong slug | confirm the bare `bytedance/seedance-2.0` slug; fall through the chain |
| `--max-cost` aborts (exit 13) | estimate exceeds the cap | raise `CLIP_MAX_COST` or drop to 480p |
