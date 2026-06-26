# ai-gen audio — TTS + ASR for rm-voiceover (Remotion Studio)

> Loaded on demand by `rm-voiceover/SKILL.md`. Documents the exact `ai-gen` audio commands, the Kokoro
> voice catalog, the Wizper transcription shape, the `@remotion/captions` mapping `rm-build`/`rm-captions`
> consume, and the gotchas the wrapper scripts encode. All calls are **keyless** via the SL8 proxy
> (`SL8_SESSION_TOKEN`); ~1 credit each. Never use ElevenLabs / HeyGen TTS/ASR/auth — the sandbox has no key.
> Carried over verbatim from BOT-015 `hf-voiceover` (same three ai-gen slugs); only the consumer names
> (`rm-build`/`rm-render`/`rm-captions`) and the `@remotion/captions` notes are Remotion-specific.

## 1. ai-gen v2 contract (applies to every call)

- ai-gen is **2.1.0** on `sl8-animation` (the render runtime).
- v2 JSON shape: `{ "success": bool, "files": [{ "local_path": "…" }], "hosted_urls": ["…"] }`.
- `ai-gen run` takes a **positional** model-id; the `audio tts`/`audio stt` subcommands take the model via
  `-m <slug>`.
- Trust the **on-disk output** + `success`. Don't trust `credits_used` (known to over-report). Use
  `ai-gen estimate <model>` / `ai-gen balance` for cost, not the run JSON.
- On `success:false` (or no output file): the model is unreachable / the call was malformed. The wrapper
  exits non-zero so `rm-voiceover` takes the documented **silent fallback** (it never prompts the user).

## 2. TTS — voiceover (`tts.sh` wraps this)

```bash
ai-gen audio tts "<text>" -m fal-ai/kokoro/american-english -o <DIR>
```

- **`-o` is a DIRECTORY, not a filename.** Confirmed in-sandbox (2026-06-18): the wav is written to
  `<DIR>/american-english-<ts>.wav`. You cannot pass `-o out.wav` and expect a file there.
- `tts.sh` therefore runs TTS into a **fresh temp dir**, then captures the single wav via
  `ls <tmp>/*.wav` and moves it to the target wav. Always go through `tts.sh` — calling `ai-gen` directly is
  how you "lose" the file.
- **Default = batch.** `tts.sh full "<joined-narration>" <vo-dir> [voice] [model]` makes **one** TTS call
  for the whole narration and writes `assets/vo/narration.wav` (one continuous track). The legacy per-beat
  synth mode (`tts.sh "<text>" <vo-dir> <stem> …`) and `tts.sh concat <vo-dir>` remain as a fallback.
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
- **Default = batch.** `words.sh full <narration.wav> <out> <beats-tsv>` transcribes the single
  `narration.wav` **once**, then splits the flat word stream into beats **by order** (each beat takes its
  token count of words, or a proportional share if Wizper's word count differs from the script's). The
  legacy per-beat-dir mode (`words.sh <vo-dir> <out>`) transcribes each beat wav separately and remains as a
  fallback.
- Round-trip confirmed in-sandbox (BOT-015, 2026-06-18): TTS→STT returned the exact text. Wizper is keyless
  via the proxy.
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

## 4. Timing model (why the flat `words[]` is absolute time)

**Batch (default):** `words.sh full` transcribes the single `narration.wav` once, so Wizper's word times are
already **absolute timeline time**. The parser splits that flat stream into beats by order; each beat's
`start`/`end` come straight from its slice, and the flat `words[]` track keeps the absolute times (tagged
with `beat`). Every beat's `wav` is `assets/vo/narration.wav`. `total_duration` is the last word's end (or
the wav's ffprobe duration when only the transcript came back).

**Per-beat fallback:** the legacy `words.sh <vo-dir> <out>` mode transcribes each beat wav independently, so
each beat's words start near 0; the parser then **offsets** every beat's words by the cumulative duration of
the prior beats (the running `cursor`) to recover absolute time, and `total_duration` is the sum of beat
durations.

## 5. `@remotion/captions` mapping (what rm-build / rm-captions read)

`04-timing.json` is already **`@remotion/captions`-shaped at the field level but in SECONDS**. The render
half (`rm-captions` → `createTikTokStyleCaptions` / the official `display-captions.md`) wants the
[`Caption`](https://www.remotion.dev/docs/captions/caption) type, whose times are **milliseconds**:

```ts
type Caption = { text: string; startMs: number; endMs: number; timestampMs: number | null; confidence: number | null };
```

The conversion is mechanical and lives in `rm-build`/`rm-captions` (NOT here — this skill emits seconds):

```ts
// flat words[] (this skill's 04-timing.json) -> @remotion/captions Caption[]
const captions = timing.words.map(w => ({
  text: w.text,
  startMs: Math.round(w.start * 1000),
  endMs: Math.round(w.end * 1000),
  timestampMs: Math.round(((w.start + w.end) / 2) * 1000),
  confidence: null,
}));
```

So `rm-voiceover`'s contract is: emit the flat `words[]` (absolute seconds, monotonic, every word placed)
and the per-beat `beats[]`; the millisecond conversion + page-grouping
(`createTikTokStyleCaptions({ captions, combineTokensWithinMilliseconds })`) is the renderer's job. Keep
times in **seconds** here — do not pre-multiply.

## 6. JTBD-3 — ASR-only entry (clip → captions, no TTS)

For the **clip-in** job (JTBD-3) there is no `02-script.md` to synthesize. `rm-voiceover` becomes the **ASR
entry point**: transcribe the *input clip's own audio* to recover word timings for `rm-captions`. There is
**no TTS call and no `narration.wav`** — the audio that plays in the render is the input clip itself
(`<OffthreadVideo>` / `<Audio>` in `rm-build`).

1. The input clip is staged under `artifacts/<project>/assets/captures/` (by `rm-assets` or onboarding).
2. If it is a **video**, extract a mono 16 kHz wav first (Wizper wants audio; bash 3.2, no `timeout`):
   ```bash
   ffmpeg -v error -y -i artifacts/<project>/assets/captures/<clip>.mp4 \
          -vn -ac 1 -ar 16000 artifacts/<project>/work/clip-audio.wav
   ```
   If the input is already an audio file, point at it directly.
3. Use a **single-beat** beats-tsv so the whole transcript lands in one beat (the last beat mops up every
   word; the dummy token is only used for the order-split, which is a no-op for one beat):
   ```bash
   printf 'clip\t.\n' > artifacts/<project>/work/beats.tsv
   ```
4. Transcribe once and write the timing track:
   ```bash
   bash "$SKILL/scripts/words.sh" full artifacts/<project>/work/clip-audio.wav \
        artifacts/<project>/04-timing.json artifacts/<project>/work/beats.tsv
   ```
   The flat `words[]` is absolute clip-timeline time — exactly what `rm-captions` overlays on the clip.
5. If ASR is unreachable, `words.sh full` falls back to estimated pacing (`timing_method:"estimated"`,
   `words:[]`); captions then can't word-sync — record it in `state.md` and let `rm-captions` fall back to
   chunk/line captions over the clip. Never prompt the user.

## 7. Failure → silent (the JTBD-1 fallback)

If TTS is unreachable, `rm-voiceover` does **not** fail the project. It records the silent fallback in
`state.md` and runs `words.sh full` against the missing `narration.wav`, which writes a `04-timing.json`
whose beats use **script-estimated** pacing (`≈ max(0.8, tokens/2.5)` s/beat, `timing_method:"estimated"`,
`words:[]`), and the downstream `rm-render` simply has no audio stream to mux (`rm-build` derives
`durationInFrames` from the estimated total instead of the narration length). The video still ships; the
timing track still paces the beats.
