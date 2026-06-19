# ai-gen audio — TTS + ASR for hf-voiceover (confirmed in-sandbox 2026-06-18)

> Loaded on demand by `hf-voiceover/SKILL.md`. Documents the exact `ai-gen` audio commands, the Kokoro
> voice catalog, the Wizper transcription shape, and the gotchas the wrapper scripts encode. All calls are
> **keyless** via the SL8 proxy (`SL8_SESSION_TOKEN`); ~1 credit each. Never use HeyGen TTS/ASR/auth.

## 1. ai-gen v2 contract (applies to every call)

- ai-gen is **2.1.0** on `sl8-animation`.
- v2 JSON shape: `{ "success": bool, "files": [{ "local_path": "…" }], "hosted_urls": ["…"] }`.
- `ai-gen run` takes a **positional** model-id; the `audio tts`/`audio stt` subcommands take the model via
  `-m <slug>`.
- Trust the **on-disk output** + `success`. Don't trust `credits_used` (known to over-report). Use
  `ai-gen estimate <model>` / `ai-gen balance` for cost, not the run JSON.
- On `success:false` (or no output file): the model is unreachable / the call was malformed. The wrapper
  exits non-zero so `hf-voiceover` takes the documented **silent fallback** (it never prompts the user).

## 2. TTS — voiceover (`tts.sh` wraps this)

```bash
ai-gen audio tts "<text>" -m fal-ai/kokoro/american-english -o <DIR>
```

- **`-o` is a DIRECTORY, not a filename.** Confirmed: the wav is written to
  `<DIR>/american-english-<ts>.wav`. You cannot pass `-o out.wav` and expect a file there.
- `tts.sh` therefore runs TTS into a **fresh temp dir**, then captures the single wav via
  `ls <tmp>/*.wav` and moves it to `assets/vo/<beat-stem>.wav`. Always go through `tts.sh` — calling
  `ai-gen` directly is how you "lose" the file.
- The model `fal-ai/kokoro/american-english` is the confirmed keyless TTS slug. It is American-English
  Kokoro; a different language is a different Kokoro model (don't silently mistranslate — say so).

### Kokoro voices

Kokoro ships a set of named voices. `tts.sh` passes the chosen id as `--voice <id>` on the `audio tts`
subcommand and **retries without `--voice`** if that build of ai-gen rejects the flag (the model id then
selects its default American-English voice). Common American voices:

| voice id | gender / character |
|---|---|
| `am_michael` | male, neutral narrator — **default** |
| `am_adam` | male, warmer |
| `am_eric` | male, brighter |
| `af_nova` | female, modern |
| `af_bella` | female, warm |
| `af_sarah` | female, clear |
| `af_heart` | female, expressive |

Resolution order for the voice (in `SKILL.md`): explicit user request → `context.md` onboarding default →
`am_michael`. Always report which voice was used.

## 3. ASR — word timing (`words.sh` wraps this)

```bash
ai-gen audio stt "<file.wav>" -m fal-ai/wizper
```

- Pass a **real file** (not a directory) — the opposite of the TTS `-o` rule.
- Round-trip confirmed in-sandbox: TTS→STT returned the exact text. Wizper is keyless via the proxy.
- Return shape varies by build. `words.sh`'s node parser handles all of these:
  - `chunks[]` with `{ text, timestamp: [start, end] }` (Whisper/Wizper word/segment chunks),
  - `words[]` with `{ word|text, start, end }`,
  - `segments[].words[]`,
  - or just `{ text: "…" }` (transcript only — no per-word times).
- **If only the transcript text comes back** (no per-word timestamps), `words.sh` splits it into words and
  spreads them **evenly** across the beat's `ffprobe` duration (`timing_method:"even"`). Approximate but it
  never invents words. If word-level timestamps ARE present, it uses them (`timing_method:"wizper"`).
- For `--help` on the exact param names of a given ai-gen build, run `ai-gen audio stt --help`. The wrapper
  doesn't depend on extra flags — the default Wizper transcription is enough for word recovery.

## 4. Timing offsets (why the flat `words[]` is absolute time)

`words.sh` transcribes each beat wav independently, so each beat's words start near 0. The parser then
**offsets** every beat's words by the cumulative duration of the prior beats (the running `cursor`), so the
flat `words[]` track in `04-timing.json` is **absolute timeline time**. Caption blocks in `hf-build` read
that flat track; the per-beat `beats[]` carry the local (beat-relative) words plus the method, wav path, and
duration. `total_duration` is the sum of beat durations.

## 5. Failure → silent (the JTBD-1 fallback)

If TTS is unreachable, `hf-voiceover` does **not** fail the project. It records the silent fallback in
`state.md`, writes a `04-timing.json` whose beats use **script-estimated** pacing
(`≈ max(0.8, words/2.5)` s/beat, `timing_method:"estimated"`, `wav:null`), and the downstream render simply
has no audio stream to mux. The video still ships; the timing track still paces the beats.
