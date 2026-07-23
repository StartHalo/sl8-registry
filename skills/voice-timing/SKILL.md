---
name: voice-timing
description: >
  Narration and the timing law: writes VO to word budgets, generates it per-block with ONE
  voice, measures real durations, and anchors every visual timing decision to measured
  audio — TTS drift is designed out, never repaired. Use when: "write/generate the
  narration/voiceover", "how long should this scene be", "the audio doesn't line up",
  "pick a narrator voice", timing any beat plan. Chain: script blocks are written against
  the plan's beats; measured durations flow BACK into the plan before video-prompting runs;
  assembly-qc mixes the takes. NOT for: clip ambience (video-prompting's AUDIO line),
  music/SFX sourcing (assembly-qc), or captions rendering (assembly-qc — captions cut from
  THIS script, never ASR).
---

# voice-timing — generate audio first; anchor visuals to what you measured

Prose estimates of narration length run ~2× long, and TTS never matches a guess. The law:
**voice is generated and MEASURED before visual durations are locked** — then drift is
impossible, because nothing downstream is estimated.

## Inputs to collect

1. **The plan's beats** — one narration line per beat (one idea per beat).
2. **The voice** — from `style.md` (`voice:`), ONE narrator for the whole piece. Default
   `af_nova` (the proven lab voice); list live voices only if the user wants to choose.
3. **Language/speed** — default en / 1.0.

## Writing the blocks (the word budget)

- **~2.5 words/second** spoken. A 5s beat holds ~12 words; a 10s block 20–24 words.
- One teaching line per beat; a 2–6 word label (the frame's headline) restates it.
- Numbers spelled out; no stage directions; contractions welcome (written-copy cadence
  reads robotic).
- Piece budgets: 30s ≈ 70–80 words across 6–8 beats · 60s ≈ 130–150 words.
- Never script factual claims from memory — claims come from the brief/approved research.

## Generate → measure → anchor

1. Generate **per-block files, in beat order, same voice**: zero-padded
   `audio/vo-01.wav`, `vo-02.wav`, … (per-block files let one weak take re-roll alone).
2. **Measure each**: `ffprobe -show_entries format=duration` (+ `ffmpeg silencedetect
   -35dB 0.15s` for internal beat boundaries when a block carries two visual moments).
3. **Write the measured durations back into the plan** — each shot's `dur` becomes
   `measured_vo + breathing room`, and only THEN are clip durations chosen
   (video-prompting) and assembly windows set (assembly-qc). Visuals stretch to audio
   (hold last frame); audio is never stretched to visuals.

## Model routing

| Job | Model (verify live: `ai-gen info <id>`) | Params / envelope (as-of 2026-07-22) |
|---|---|---|
| Narration | `fal-ai/kokoro/american-english` | `prompt`, `voice` (af_*/am_* enum; af_nova default), `speed` 0.1–5; ~1 cr per 100 chars estimated but **bills a ~5-cr per-call minimum** (R02) — batch tiny lines into one call per block, never per-sentence |

Paid-call contract as everywhere: estimate → journal → download immediately → balance-delta
accounting.

## Quality bar

- [ ] One voice across all blocks; files zero-padded, in beat order.
- [ ] Every block ≤ its word budget; total words within the piece budget.
- [ ] Every duration in the plan is a MEASURED number (no prose estimates survive).
- [ ] No speech baked into any video clip (video-prompting's negative held).
- [ ] Re-rolled takes re-measured and the plan re-anchored (never patched by stretching).
