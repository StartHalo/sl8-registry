# Single-shot i2v clip dialects (FALLBACK only)

> **The default engine is now Seedance 2.0 fast i2v — see `seedance-dialect.md`.**
> This file covers the *silent, single-shot fallback* path used only when the chain
> falls past Seedance. The specific slugs once listed here — `fal-ai/kling-i2v`,
> `fal-ai/minimax-i2v`, `fal-ai/wan-i2v`, `fal-ai/runway-gen3` — are **confirmed dead**
> (all 404 upstream). The live fallback behind Seedance is
> `fal-ai/kling-video/v3/pro/image-to-video`. The per-model notes below are retained as
> legacy single-shot dialect intelligence; apply the same anatomy to whatever
> single-shot model the chain reaches.

Single-shot models animate ONE input image into ONE continuous 5–10s shot. They honor
no `[CUT]`, no timecodes, and (unlike Seedance) typically produce **no audio**. The
PDF's multi-shot patterns are recovered *above* the model: one beat = one still = one
clip, cuts happen at ffmpeg assembly. (Multi-shot inside one generation, and native
audio, are the Seedance dialect — the default — in `seedance-dialect.md`.)

## Prompt anatomy — exactly three lines

| # | Line | Rule |
|---|---|---|
| 1 | Style lock | **Verbatim first line, every prompt:** `A stick figure hand-drawn pencil sketch animation.` |
| 2 | Motion (from the plan, verbatim) | The beat's motion prompt copied as written — the plan already packs ONE action plus at most one camera move ("Static camera." / "Slow push-in.") into it. Never add a second camera direction. The plan's separate `camera:` field (`framing, angle; behaviour`) is a cross-check note, NOT a prompt line — if it contradicts the motion text, trust the motion text and flag the mismatch in the summary. |
| 3 | Negatives | **Verbatim last line, every single-shot prompt:** `Single continuous shot, no cuts. No morphing, no extra limbs, no text. The character keeps exactly the same proportions and cap.` |

Example (beat "mopping spiral", plan motion: "The stickman mops the kitchen floor with steady strokes; the bucket beside him wobbles. Static camera."):

```
A stick figure hand-drawn pencil sketch animation.
The stickman mops the kitchen floor with steady strokes; the bucket beside him wobbles. Static camera.
Single continuous shot, no cuts. No morphing, no extra limbs, no text. The character keeps exactly the same proportions and cap.
```

Why the frozen lines matter: these single-shot fallback models do not take a
separate character reference — identity rides on (a) the input still (already
character-locked, since phase 3 generated it with `--ref source.png`) and (b)
language. The frozen style lock and negatives are the same consistency mechanism the
still prompts use; paraphrase them and the episode starts reading as "different videos
spliced together". (The default Seedance engine *does* support reference inputs — see
`seedance-dialect.md`.)

## ai-gen video mechanics (v2.1.0 — what gen-clip.sh automates)

- `ai-gen video "<prompt>" --image <url|local-path> -m <model-id> -o <dir> --format json --timeout 900000 [--resolution 720p] [--audio on] [--max-cost N]`
- `--image` takes a **hosted URL OR a local path** in v2.1.0 (locals upload
  transparently via fal storage, FR-4). Prefer the fal.media URL from
  `03-stills/stills-log.md` when present.
- i2v models are queue-backed; the CLI blocks until done. The scripts pin
  `--timeout 900000` (15 min) and retry once on timeout (queue congestion is
  transient; a second timeout means fall back).
- Extra `key=value` args pass through to the model: `duration=5`, `duration=10`.
  Unknown keys can be rejected → gen-clip.sh retries without `duration=`.
- Success JSON (v2.1.0 stable contract): `files[]` entries are **OBJECTS**
  (`files[0].local_path`), and `hosted_urls[0]` is the fixed hosted-URL field — NOT
  bare strings (the v1 string parser was a bug). `mv` `files[0].local_path` to the
  stable `NN-<beat-slug>.mp4` name immediately.
- `--max-cost` is in **credits** (1 cr ≈ $0.004) and aborts before submitting if the
  estimate exceeds it. `credits_used` over-reports for i2v — trust `estimate`/`balance`.
- **Never run without `-m`.** Always pass the model explicitly.
- Failed generations are **not** charged in v2.1.0 — one disciplined attempt per chain
  step beats retry-loops.

## Per-model notes

### `fal-ai/kling-i2v` (kling-video v1.6 pro) — primary
- Best motion quality in the catalog; community-validated for stickman i2v.
- Durations: **5 or 10 seconds** (`duration=5` / `duration=10`) — this is why
  the episode plan quantizes beats to 5|10s.
- Slowest: ~3–6 min per clip. Budget accordingly (5 beats ≈ 15–30 min).
- Responds well to simple, literal motion language; keep camera static or one
  slow move.

### `fal-ai/minimax-i2v` (minimax video-01) — fallback 1
- Faster (~2–4 min), weaker motion fidelity.
- Duration support is not guaranteed: if it rejects `duration=`, gen-clip.sh
  retries without it and the clip runs at the model's default length (~6s).
  **Disclose the deviation in 05-summary.md** — assembly handles mixed lengths
  fine, but the plan's timing drifted and the summary must say so.

### `fal-ai/wan-i2v` — fallback 2
- Last resort before the still-as-segment fallback. Weakest motion; expect
  subtle drift on limbs. Keep the action especially small ("turns his head",
  "taps the box") to give it less to break.
- Same `duration=` caveat as minimax: dropped if rejected, disclosed if dropped.

### `fal-ai/runway-gen3` — do not use
- Deprecated. It is only mentioned here because it is the CLI default — which
  is exactly why every call passes `-m` explicitly.

## Anti-patterns (each one is a graded failure mode)

- **Two actions in one prompt** ("mops the floor and answers the phone") →
  broken, mushy motion. Split across beats or pick one.
- **Paraphrasing the frozen lines** → style drift between clips.
- **Wide shots** — small figures break anatomically in i2v. The stills are
  composed close/medium for this reason; don't ask the camera to pull out.
- **In-frame text requests** — these models garble text. Text lives on the
  still (phase 3 routes it to a text-capable model) or on the caption card.
- **Out-of-chain improvisation** — if all three models fail, the answer is
  `still-segment.sh`, not a creative model id.
