# Single-shot i2v clip dialects (the dependable default)

The default video models (`fal-ai/kling-i2v` → `fal-ai/minimax-i2v` →
`fal-ai/wan-i2v` → `fal-ai/runway-gen3` as deprecated last resort — the only i2v
model the proxy actually routed on 2026-06-10; disclose its use in the summary)
animate ONE input image into ONE continuous 5–10s shot. They
honor no `[CUT]`, no timecodes, and produce **no audio**. The PDF's multi-shot
patterns are recovered *above* the model: one beat = one still = one clip, and
the cuts happen at ffmpeg assembly. (Multi-shot inside one generation is the
Seedance dialect — `seedance-dialect.md` — used only when discovery routes it.)

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

Why the frozen lines matter: there is no reference-image conditioning on these
models — identity is carried by (a) the input still and (b) language. The
frozen style lock and negatives are the same consistency mechanism the still
prompts use; paraphrase them and the episode starts reading as "different
videos spliced together".

## ai-gen video mechanics (what gen-clip.sh automates)

- `ai-gen video "<prompt>" --image <https-url> -m <model-id> -o <dir> --format json --timeout 900000`
- `--image` takes a **hosted URL only** (no local paths, no uploads). The
  fal.media URL captured per still in `03-stills/stills-log.md` is the contract.
- All i2v models are `queueRequired`; the CLI blocks until done. Default
  timeout is 10 min; kling's worst case ≈ 6 min, so the scripts pin
  `--timeout 900000` (15 min) and retry once on timeout (queue congestion is
  transient; a second timeout means fall back).
- Extra `key=value` args pass through raw to the model API: `duration=5`,
  `duration=10`, `cfg_scale=0.5`. Unknown keys can be rejected — see per-model
  notes.
- Success JSON: `{"success":true,"files":["/local/path.mp4"],"credits_used":N,...}`.
  Always `mv` the file to its stable `NN-<beat-slug>.mp4` name immediately.
- **Never run without `-m`.** The CLI's default video model is
  `fal-ai/runway-gen3`, which is deprecated (`deprecated: true` in the
  catalog). Relying on the default is a known anti-pattern.
- Failed generations can still charge credits — one disciplined attempt per
  chain step beats retry-loops.

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
