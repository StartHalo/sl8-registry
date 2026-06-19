# The Motion Studio phase chain (hf-studio reference)

> The end-to-end production spine hf-studio walks, the front-end each JTBD enters at, the exact artifact
> each phase reads/writes, and the re-entry rules. hf-studio runs each granular skill's bundled scripts and
> reads its numbered artifact — it does NOT re-implement them. This file is cited by `hf-studio/SKILL.md`;
> it is not auto-loaded.

## The 7-phase spine

```
[onboard] -> concept -> script -> storyboard -> voiceover+timing -> build -> validate -> render
   (0)         (1)        (2)        (3)              (4)             (5)      (6)       (7)
```

This is the HyperFrames 7-beat production loop made resumable: one numbered artifact per phase, the chain
driven by `state.md`. Granular skills are independently runnable (a power user can call `hf-render` alone);
hf-studio is the conductor that walks all of them for a brief.

## Phase contract (read → run → write → advance)

| # | phase | skill (owns the logic + scripts) | reads | writes |
|---|---|---|---|---|
| 0 | onboard | `onboarding` (+ optional `hf-brand-extract`) | — | `context.md`, `state.md` |
| 1 | concept | `hf-concept` | `context.md` | `01-concept.md` |
| 2 | script | `hf-script` | `context.md`, `01-concept.md` | `02-script.md` |
| 3 | storyboard | `hf-storyboard` | `01-concept.md`, `02-script.md` | `03-storyboard.md` |
| 4 | voiceover+timing | `hf-voiceover` (+ `hf-assets`) | `02-script.md` | `assets/vo/*.wav`, `04-timing.json` |
| 5 | build | `hf-build` | `03-storyboard.md`, `04-timing.json`, `assets/` | `composition/` |
| 6 | validate | `hf-validate` | `composition/` | `05-validation.md` + `snapshots/` |
| 7 | render | `hf-render` | `composition/`, `04-timing.json` | `exports/<name>-<ar>.mp4` + `exports/frames/` |

hf-studio also writes its own `06-summary.md` (resolved params + per-frame vision verdict + fallbacks).
**READ-BEFORE-WRITE:** before running a phase, read every artifact in its `reads` column. After it writes,
mark the phase `done` in `state.md` and rewrite `next_action`.

## The scripts each phase runs (cwd matters)

All paths below are relative to the bot's home (`artifacts/<project-name>/` is the project folder).

- **Phase 5 (build)** — scaffold then author:
  ```bash
  bash "$HF_BUILD/scripts/init.sh" artifacts/<project-name>/composition   # [--force] to re-author in place
  # then edit composition/index.html per 03-storyboard.md + 04-timing.json, lint to 0 errors
  ```
- **Phase 6 (validate)** — strict lint gate + snapshot:
  ```bash
  bash "$HF_VALIDATE/scripts/validate.sh" artifacts/<project-name>/composition artifacts/<project-name> "2,9,15"
  ```
- **Phase 7 (render)** — render + verify (run with cwd = the composition dir, `.` = the project):
  ```bash
  cd artifacts/<project-name>/composition
  bash "$HF_RENDER/scripts/render.sh" . ../exports <name> "16:9" draft "2,9,15"
  ```
- **Phase 4 (voiceover/assets)** — ai-gen scripts owned by `hf-voiceover` (`tts.sh`, `words.sh`) and
  `hf-assets` (`bg-remove.sh`, `capture.sh`). hf-studio invokes them per those skills; it does not call
  `ai-gen` directly. Asset models route via the keyless `ai-gen` proxy (TTS `fal-ai/kokoro/american-english`,
  ASR `fal-ai/wizper`, bg-removal `fal-ai/bria/background/remove`).

`$HF_BUILD`/`$HF_VALIDATE`/`$HF_RENDER` resolve to those skills' directories under `.claude/skills/<name>/`
at runtime. The bundled `scripts/run.sh` chains phases 5(scaffold)→6→7 once the authored scenes exist.

## JTBD front-ends (where the chain starts)

| JTBD | input | front-end | chain |
|---|---|---|---|
| **JTBD-1** narrated video (default) | brief / script / URL | concept from the brief | 1→2→3→4→5→6→7 (full) |
| **JTBD-2** data video | CSV / JSON / numbers | concept + a *data narrative*; storyboard maps series → data-viz blocks | 1→2→3→4→5→6→7 (build wires data-viz, binds exact values) |
| **JTBD-3** caption/social cut | an existing media clip/audio | start at transcribe (the words via `hf-voiceover`'s ASR path) → storyboard captions/overlays; concept/script are a light preset (no new narration) | 4(transcribe)→3→5→6→7 |
| **JTBD-4** restyle/re-voice/re-render | a reference to an existing project | re-enter mid-chain on frozen facts (below) | one of 5 / 4 / 7 |

For JTBD-2 the storyboard maps each series to a data-viz block (counter / bar-racer / rings / timeline) and
hf-build binds the EXACT input values via composition variables — the rendered numbers must equal the input
data. For JTBD-3 the front-end is the clip's transcript (word timings), not a written script; the build adds
a captions block (rail/embed) and social overlays, optionally a u2net/bria subject matte from `hf-assets`.

## Re-entry rules (JTBD-4 — frozen facts)

Re-enter at the **earliest phase the change touches**; read the unchanged upstream artifacts:

| change | re-enter at | what stays frozen |
|---|---|---|
| restyle (palette/fonts/look), different AR orientation | **5 (build)** | `02-script.md` + `03-storyboard.md` facts (on-screen text/numbers byte-identical) |
| re-voice (new Kokoro voice, re-narrate) | **4 (voiceover)** | the script facts; rebuild only if word timings shift caption beats |
| resize/re-render same orientation, 4k pass, quality bump | **7 (render)** | the composition (no re-author) |
| a change that implies NEW facts | **2 (script)** — and SAY SO | nothing — this is a re-structure, not a restyle |

A different aspect-ratio **orientation** (16:9 → 9:16) is a re-author at phase 5 (the root dims change);
`hf-render` rejects an orientation-mismatched AR cleanly and routes it back to build — `--resolution` only
upscales (4k) within the same orientation, it cannot rotate.

## Headless + honesty rules
- No runtime prompts. Missing optional input → documented default (16:9, context voice, music off, draft).
  Missing the required brief → record the failure in `state.md` and stop.
- Grade visual quality by reading sampled frames (vision), never by filename/size.
- Local + keyless only: never `auth login`, `cloud`/`lambda`/`cloudrun` render, `publish`, or HeyGen TTS/
  avatars. The render core is local & free; asset models route via the keyless `ai-gen` proxy.
- ai-gen reachability gate: attempt the pass-through; if a model is unreachable (`success:false`), do not
  silently substitute — render silent + note it, or STOP and ask if narration was required.
