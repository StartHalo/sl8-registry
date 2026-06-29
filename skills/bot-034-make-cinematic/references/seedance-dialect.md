# Seedance reference-to-video dialect — the render engine, baked inline

Per-model mechanics, the multi-shot prompt template, the per-shot+concat fallback recipes,
and failure triage for the cinematic render. Baked **inline** here because the runtime
sandbox has **no KB access** — this file IS the source of truth at runtime. Source: KB
[Cinematic Video Recipes §C1/C2/E1/E2](../../../../../kb/wiki/topics/cinematic-video-recipes.md)
and [Prompting Seedance 2](../../../../../kb/wiki/topics/prompting-seedance-2.md), the BOT-034
`research/{prompt-engineering,model-evaluation}.md`, and the Step-0 multi-shot PoC
(2026-06-20, 8.8/10). The donor for the fallback is BOT-013 `clip-assembly`.

## The headline mechanic (PROVEN — use exactly this)

Seedance 2.0 renders the **whole multi-scene cinematic in ONE `reference-to-video` call**:
a numbered, time-coded shot-list as the prompt + the character bible images as references →
one coherent MP4, the character carried across cuts, native audio in the same pass, no
stitching. The PoC proved it end-to-end (5-shot friendly-robot adventure, identity held
wake→spot→chase→leap→payoff, 8.8/10).

```bash
ai-gen video "<MULTISHOT_PROMPT>" \
  -m bytedance/seedance-2.0/fast/reference-to-video \
  --ref <reference-sheet.png> --ref <hero.png> \
  --duration <4-15> --aspect-ratio <16:9|9:16|1:1> --resolution 720p \
  --audio on --max-cost <cap> --format json
```

- **`--ref` maps to `image_urls`, IN ORDER.** The first `--ref` is addressed in the prompt
  as `@Image1`, the second as `@Image2`. We pass the turnaround sheet first (`@Image1` =
  the identity/turnaround reference) and the hero second (`@Image2` = the canonical look).
  Up to 9 image refs total; local paths and hosted URLs both work (the CLI uploads locals).
- **`generate_audio` is default-ON** for reference-to-video — no surcharge. The MP4 arrives
  WITH a native audio stream (score + SFX + ambience, steered by the shot-list's `Audio:`
  line). `--audio on` makes it explicit. Do **not** add a music bed afterward — it doubles up.
- **`duration` 4–15s** (the cinematic length); **`resolution` 480p/720p** (default 720p;
  `fast` reference-to-video has no 1080p). `--aspect-ratio` one-of incl. `16:9`.
- **No `--resolution` issues here** (unlike the bible image chain) — the video models accept
  `--resolution 480p|720p`. Drop to 480p to roughly halve cost.
- Slug discipline: the v2 namespace is the **bare** `bytedance/seedance-2.0/...` — the
  `fal-ai/bytedance/seedance/*` form 404s. Match `bytedance/seedance-2.0` in discovery.
  `standard` tier = drop the `/fast/` segment (`bytedance/seedance-2.0/reference-to-video`).
- **No negative prompts** — append positive constraints once (see the template suffix).
- JSON contract (v2.1.0): the local file is **`files[0].local_path`** (files[] entries are
  OBJECTS, not strings — parse with python3), the hosted URL is `hosted_urls[0]` (a
  `*.fal.media` URL). `gen-cinematic.sh` reads both; never regex the raw blob.

## The multi-shot prompt template (the JTBD-3 render input — PROVEN shape)

`gen-cinematic.sh` composes nothing; the prompt arrives fully assembled in the prompt file.
The skill concatenates the shot-list into this exact shape (the PoC shape):

```
<global style/look header — e.g. "Multi-shot cinematic, <genre> look, 35mm / Pixar-style,
  cinematic lighting, professional color grading"; fight → the E2 dark-fantasy header>
@Image1 is the character turnaround reference and @Image2 is the hero reference for
  <CHARACTER_BLOCK> — maintain the EXACT same character identity in every shot.
<one-line scene/world establishment>
[0-Xs]: <shot 1 — one camera move + one action + lighting>
[X-Ys]: <shot 2 …>
… (4–6 shots, time-coded, summing to the duration; an escalation arc)
Total: <N>s / <K> shots / <AR>. Audio: <score + SFX + ambience>.
Maintain character identity, avoid identity drift, avoid jitter, smooth motion, stable
  picture, no flicker.
```

### Worked example (the verbatim PoC prompt — 8.8/10)

```
Multi-shot cinematic 3D-animated short, Pixar-style animation, bright cheerful color
grading, soft warm lighting, shallow depth of field, polished render.
@Image1 is the character turnaround reference and @Image2 is the hero reference for a small
round friendly cartoon robot, glossy white and warm-orange rounded body, one big glowing
cyan eye — maintain the EXACT same character identity in every shot.
A sunlit green meadow with wildflowers under a bright blue sky, a playful adventure.
[0-3s]: wide establishing shot, gentle push-in, the little robot wakes up and stretches in the meadow, blinking its big cyan eye, morning light and floating pollen.
[3-6s]: medium shot, the robot spots a glowing butterfly and tilts its head in curiosity, a cheerful little bounce.
[6-9s]: tracking shot, the robot chases the butterfly through the wildflowers, stubby legs pumping, joyful, petals scattering.
[9-12s]: low-angle shot, the robot leaps into the air after the butterfly and the motion ramps into brief slow motion at the peak of the jump, then tumbles softly into the grass.
[12-15s]: close-up, the robot lies in the grass looking up in wonder as the butterfly lands on its eye-screen, a warm happy moment.
Total: 15s / 5 shots / 16:9. Audio: whimsical playful orchestral score, gentle nature ambience, soft robotic chirps and a happy beep.
Maintain character identity, avoid identity drift, avoid jitter, smooth animation, stable picture, no flicker.
```

## Rules that carry the quality (the Seedance 5-layer stack)

The shot-list was written upstream with these rules; the render skill must not undo them by
paraphrasing. Recap so the composer preserves them and the iterator can debug:

- **One action + one camera move per shot.** Separate subject motion from camera motion
  ("the robot chases, camera tracks") — the single biggest debug lever. Stacking is the #1
  jitter cause.
- **Lighting first** among style words (golden hour / rim light / volumetric) — the
  highest-quality-per-word element. State it.
- **Slow-mo ramps** on the key beat (E1): "ramps into slow motion … snaps back".
- **`fast` is the most dangerous keyword** — make only ONE element fast, hold the rest.
- **An escalation arc** — wide establishing → tighter → climax → resolve. Fight (E2):
  standoff → first clash → escalation → counter → final strike.
- **No negative prompts** — the one positive-constraint suffix ("avoid identity drift,
  maintain face consistency, stable picture, no flicker") is appended ONCE at the end.
- **Reference the bible explicitly** — `@Image1`/`@Image2 = character; maintain exact
  identity`. An untagged reference image gets averaged into mush.

## Cost — `ai-gen estimate`, NEVER `credits_used`

- 720p / 15s / fast reference-to-video ≈ **908 cr ≈ $3.63** (verified Step-0 PoC). The two
  NBP bible images add ~$0.30. Drop to 480p to roughly halve the render.
- Get the true figure from **`ai-gen estimate`** + **`ai-gen balance`** deltas:
  ```bash
  ai-gen estimate bytedance/seedance-2.0/fast/reference-to-video duration=15 resolution=720p
  ```
- The JSON **`credits_used` field is unreliable** (over-reports ~8.4× on some video models,
  2026-06-15). The summary cites `ai-gen estimate`, never `credits_used`.
- `--max-cost` is in CREDITS (1 cr ≈ $0.004) and aborts *before* submitting if the estimate
  exceeds the cap. `gen-cinematic.sh` defaults the cap to ~1200 cr (fast) / ~3000 cr
  (standard). If it aborts (exit 13): raise `MAX_COST`, drop `RESOLUTION` to 480p, or
  shorten `DURATION`.

## The per-shot + concat fallback (DOCUMENTED — only on single-call failure)

Used by `per-shot-fallback.sh` ONLY when the single `reference-to-video` call errored or its
output failed ffprobe verify (no native audio / wildly off duration). It trades the
single-pass identity lock for per-clip i2v and stitched cuts. The donor pattern is BOT-013
`clip-assembly` (`gen-clip.sh` + `assemble.sh`). Recorded in the summary — never silent.

1. **Split** the shot-list into its `[Xs-Ys]:` shots (the parser snaps each shot's duration
   to Seedance i2v's reliable {5,10}s granularity).
2. **Per-shot i2v** — `bytedance/seedance-2.0/fast/image-to-video`, **start frame =
   `hero.png`** (the bible hero anchors identity across shots), the shot's action+camera as
   the prompt, the positive-constraint suffix appended, `--audio on` (i2v also carries
   native ambient audio).
   ```bash
   ai-gen video "<shot text> Maintain the same character identity, ... no flicker." \
     --image <hero.png> -m bytedance/seedance-2.0/fast/image-to-video \
     --resolution 720p --aspect-ratio <AR> --audio on --max-cost 400 --format json duration=<5|10>
   ```
3. **Normalize** every clip to a uniform layout (24fps, the planned canvas, H.264/yuv420p +
   AAC 48k stereo) — uniform re-encode BEFORE concat is what makes the concat demuxer
   reliable; mixed fps/size/SAR is the #1 concat failure.
   ```
   fps=24,scale=W:H:force_original_aspect_ratio=decrease,pad=W:H:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p
   ```
4. **Concat** in shot order (the `NN-shot.mp4` names sort to shot order):
   ```bash
   ffmpeg -f concat -safe 0 -i list.txt -c copy episode-concat.mp4
   # on an edge-case failure (Non-monotonous DTS / codec mismatch), re-encode the concat
   ```
5. **Room tone ONLY if a shot lacked native audio.** Seedance i2v clips usually carry native
   ambient audio; a bed would double up. Add a quiet brown-noise bed (−38dB, `normalize=0`)
   *only* when no clip had audio (avoid dead silence on phones).
   ```
   [1:a]volume=-38dB,pan=stereo|c0=c0|c1=c0[rt];[0:a][rt]amix=inputs=2:duration=first:normalize=0[a]
   ```
   with input 1 = `anoisesrc=colour=brown:r=48000:a=1.0`.
6. **ffprobe verify** + print a JSON verdict (a video + an audio stream, all shots present).
   A FLAG still delivers — flag it in the summary.

## Failure triage

| Symptom | Cause | Response |
|---|---|---|
| Single `reference-to-video` call exits non-zero | upstream error / arg rejected / queue | `gen-cinematic.sh` returns non-zero → caller runs `per-shot-fallback.sh`; record route + reason in summary |
| Output has NO audio stream | `generate_audio` didn't fire / a silent render | verify FAILS → fallback (the whole point is in-pass audio); never ship the silent single-call file as "with audio" |
| Duration off by >1s (but real A/V) | the model chose a different length | DELIVER + FLAG in the summary; don't discard a usable cinematic over a wobble |
| Identity drifts across shots | weak refs / too many shots / paraphrased tokens | keep ≤6 shots; pass BOTH bible images as `--ref`; never paraphrase the shot-list's trait tokens; re-render is the lever, not a prompt rewrite mid-run |
| `--max-cost` aborts (exit 13) | estimate exceeds the cap | raise `MAX_COST`, drop `RESOLUTION` to 480p, or shorten `DURATION` |
| Slug 404s despite being "listed" | catalog volatility / wrong namespace | confirm the bare `bytedance/seedance-2.0` slug; the script attempts it regardless of discovery; a genuine engine swap is STOP-and-ask |
| Stock music leaks / wrong audio mood | `Audio:` line vague | steer it in the shot-list's `Audio:` line (score + SFX + ambience); re-render |
| Garbled in-frame text | Seedance text rendering is unreliable | keep text out of the shot prompts; titles belong in post, not the render |
| concat error in the fallback (Non-monotonous DTS) | a clip escaped normalization | the script auto-falls back to a re-encode concat (slower, always works) |

## See also (build-time only — NOT reachable at runtime)
- KB [Cinematic Video Recipes §C1/C2/E1/E2](../../../../../kb/wiki/topics/cinematic-video-recipes.md)
- KB [Prompting Seedance 2](../../../../../kb/wiki/topics/prompting-seedance-2.md) (the 5-layer stack, time-codes, @-refs)
- KB [Cinematic Results Log](../../../../../kb/wiki/topics/cinematic-results-log.md) (the step0-multishot row)
- The bible contract + token discipline: the sibling skills `bot-034-update-character-bible` (frozen blocks, seed, the bible images) and `bot-034-make-cinematic` (the time-coded shot-list this skill renders).
- The fallback donor: BOT-013 `bot-013-clip-assembly` (`gen-clip.sh` + `assemble.sh`).
