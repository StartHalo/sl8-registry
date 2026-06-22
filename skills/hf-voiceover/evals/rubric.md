---
skill: hf-voiceover
target_score: 0.85
publish_threshold: 0.80
stuck_window: 5
judge_model: claude-sonnet-4-6

# hf-voiceover is a STRUCTURAL skill (audio + timing assets, not pixels) — there is NO media-judge
# dimension. The grader reads the produced wavs, 04-timing.json, the script, and state.md. Weights sum
# to 1.00. Dimensions trace to 1-requirements.md JTBD rows.
dimensions:
  - id: audio-produced
    weight: 0.30
    jtbd_source: JTBD-1
    judge_prompt: |
      Read the run report + the files on disk. Score 0-10 on producing the voiceover audio: ONE
      non-empty continuous track artifacts/<project>/assets/vo/narration.wav exists, generated keylessly
      via a SINGLE ai-gen TTS call (Kokoro) — no HeyGen auth/TTS, and no per-beat wavs are required (the
      whole narration is one batched call). When ai-gen TTS was genuinely unreachable, the SILENT fallback
      is taken correctly instead (no failure, no user prompt) and recorded — that is a PASS for this
      dimension's intent.
      10 = a real narration.wav exists (or a correctly-handled, recorded silent fallback).
      5 = a wav exists but is empty/0-byte, or the report is unclear about whether audio was produced.
      0 = no audio and no silent-fallback handling (or it crashed / prompted the user).

  - id: timing-json-valid
    weight: 0.30
    jtbd_source: JTBD-1
    judge_prompt: |
      Inspect artifacts/<project>/04-timing.json. Score 0-10 on the timing track: it is valid JSON with
      a non-empty top-level words[] (each entry has text + numeric start/end), a beats[] array (one per
      script beat, split from the single transcript by order, each with beat/wav/duration/timing_method/words[]),
      and a total_duration. The flat words[] are in ABSOLUTE timeline time (later beats' word starts are
      past earlier ones, not all starting at 0). The timing_method is recorded per beat (wizper when real
      per-word timestamps came back, else even/estimated). 10 = complete, well-formed, absolute-time word
      track split into beats. 5 = present but not split into beats, or missing the beats[]/method metadata.
      0 = missing, empty, or malformed.

  - id: script-fidelity
    weight: 0.25
    jtbd_source: acceptance-scenario:JTBD-4
    judge_prompt: |
      Compare the narration (the wav text / the words in 04-timing.json) against 02-script.md. Score
      0-10 on fidelity: the narration is exactly the script's VO lines in order — nothing invented,
      paraphrased, or dropped. On a re-voice, the word strings are unchanged from the prior version
      (only the voice/timing differ); hf-voiceover did NOT call hf-script or alter facts. 10 = verbatim
      faithful (and re-voice preserves the text). 5 = mostly faithful with minor reordering/omission.
      0 = fabricated or substantially altered narration, or a restyle silently changed the facts.

  - id: reporting-and-resumability
    weight: 0.15
    jtbd_source: JTBD-1
    judge_prompt: |
      Read the reply + state.md. Score 0-10 on honest reporting and state hygiene: the reply states the
      resolved voice and model, how many beats got real TTS vs silent, and whether timings are real
      (wizper) or even/estimated; any fallback (silent / even / estimated / a non-default voice) is named
      rather than hidden; state.md phase 4 is updated (done, or blocked/fallback-noted) so a later
      session can resume. 10 = every resolved value + fallback reported and state.md correct. 5 = partial
      (e.g. voice stated but fallback not, or state.md stale). 0 = no reporting / state.md untouched.

guardrails:
  must_pass:
    - smoke_install
    - output_validator
  forbidden_edits:
    - bot/CLAUDE.md
    - bot/skills/hf-voiceover/evals/rubric.md
    - bot/skills/hf-voiceover/scripts/tts.sh
    - bot/skills/hf-voiceover/scripts/words.sh
---

## Notes for the iterator (read every iteration, keep short)

- Dead-ends already tried: (none yet)
- This skill is STRUCTURAL — there is nothing to vision-grade. Fixes live in the wrappers
  (`tts.sh` / `words.sh`) and the SKILL instructions, not in any composition.
- BATCHED (default): one `tts.sh full` call synthesizes the whole narration → `assets/vo/narration.wav`,
  and one `words.sh full` ASR pass transcribes it and splits the words into beats by order (2 ai-gen calls
  total, not 2×N). The legacy per-beat synth/concat and per-beat-dir ASR modes remain as a fallback.
- Hard-won facts to keep (confirmed in-sandbox 2026-06-18, see `4-test-results.md`):
  `ai-gen audio tts ... -o <X>` treats `-o` as a DIRECTORY (wav lands at `<X>/american-english-<ts>.wav`) —
  `tts.sh` captures it via `ls <tmp>/*.wav`. `ai-gen audio stt <file> -m fal-ai/wizper` wants a real FILE.
  Wizper may return only transcript text → even-distribution timings (record `timing_method:"even"`).
- The silent fallback is intentional and graded as a PASS for `audio-produced` — never fail the project or
  prompt the user when TTS is unreachable; record it in `state.md` and report it.
- On a re-voice, NEVER call hf-script and NEVER change the narration words; only the voice/audio changes.
