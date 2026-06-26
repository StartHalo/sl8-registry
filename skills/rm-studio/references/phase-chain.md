# The Remotion Studio phase chain (rm-studio reference)

> The end-to-end production spine rm-studio walks, the front-end each JTBD enters at, the exact artifact
> each phase reads/writes, the scripts it runs, and the re-entry rules. rm-studio runs each granular skill's
> bundled scripts and reads its numbered artifact — it does NOT re-implement them. Cited by
> `rm-studio/SKILL.md`; it is not auto-loaded. The JTBD router (which front-end + which capability skills)
> lives in `references/routing.md`.

## The production spine

```
[onboard] -> concept -> script -> storyboard -> voiceover+timing -> build -> validate -> render -> preview
   (0)         (1)        (2)        (3)              (4)             (5)      (6)        (7)       (7b)
```

This is BOT-015's resumable studio loop, re-targeted to Remotion: the three render-core phases
(build/validate/render) are rebuilt for React, and a Remotion-unique **preview** phase (7b) is added. One
numbered artifact per phase, the chain driven by `state.md`. Granular skills are independently runnable (a
power user can call `rm-render` alone); rm-studio is the conductor that walks all of them for a brief.

## Phase contract (read → run → write → advance)

`<project>` is the literal runtime token for the active project slug.

| # | phase | skill (owns the logic + scripts) | reads | writes |
|---|---|---|---|---|
| 0 | onboard | `onboarding` (+ optional `rm-brand-extract`) | — | `context.md`, `state.md` |
| 1 | concept | `rm-concept` | `context.md` | `01-concept.md` |
| 2 | script | `rm-script` | `context.md`, `01-concept.md` | `02-script.md` |
| 3 | storyboard | `rm-storyboard` (+ `rm-dataviz` vocab for JTBD-2) | `01-concept.md`, `02-script.md` | `03-storyboard.md` |
| 4 | voiceover+timing | `rm-voiceover` (+ `rm-assets`) | `02-script.md` (or input clip/audio for JTBD-3) | `assets/vo/*.wav`, `04-timing.json` |
| 5 | build | `rm-build` (+ `rm-captions`/`rm-dataviz`/`rm-audioviz` as the JTBD needs) | `03-storyboard.md`, `01-concept.md`, `04-timing.json`, `assets/` | `remotion-project/`, `props.json` |
| 6 | validate | `rm-validate` | `remotion-project/` | `05-validation.md` + `snapshots/` |
| 7 | render | `rm-render` | `remotion-project/`, `props.json`, `04-timing.json` | `exports/<name>-<ar>.mp4` + `exports/frames/*.png` |
| 7b | preview | `rm-preview` | `remotion-project/`, `props.json` | `preview.html` |

rm-studio also writes its own `06-summary.md` (resolved params + per-frame vision verdict + fallbacks) and
keeps `artifacts/dashboard.md` live after each phase. **READ-BEFORE-WRITE:** before running a phase, read
every artifact in its `reads` column. After it writes, mark the phase `done` in `state.md` and rewrite
`next_action`.

## The scripts each phase runs (cwd matters)

All paths below are relative to the bot's home (`artifacts/<project>/` is the project folder).

- **Phase 5 (build)** — scaffold then author:
  ```bash
  bash "$RM_BUILD/scripts/init.sh" artifacts/<project>/remotion-project   # [--force] to re-scaffold in place
  # then author fresh React into remotion-project/src/ per 03-storyboard.md + 04-timing.json,
  # write props.json, against the composition contract (frame-driven, seeded rng, <SafeZone>, Zod props)
  ```
  `init.sh` copies the bundled starter (harvested BOT-014 engine + library + pinned `@remotion/*` @4.0.473 +
  `zod@4`), runs `npm ci`, and installs the official `remotion-best-practices` skills into the project's
  `.agents/skills/` so authoring opens with `use remotion best practices`. Never scaffold from zero.
- **Phase 6 (validate)** — the strict gate (cheap → expensive, exits 0 only if all pass):
  ```bash
  bash "$RM_VALIDATE/scripts/validate.sh" artifacts/<project>/remotion-project artifacts/<project> "2,5,9"
  ```
  Order: (1) version-skew — all `@remotion/*` resolve to ONE version; (2) `tsc --noEmit`; (3) contract lint
  (forbidden-pattern scan); (4) still-render key timestamps with the pinned Chrome Shell; then the session
  vision-grades the stills.
- **Phase 7 (render)** — render + verify (run with cwd = the Remotion app dir, `.` = the project):
  ```bash
  cd artifacts/<project>/remotion-project
  bash "$RM_RENDER/scripts/render.sh" . ../exports <name> "16:9 9:16" draft "2,5,9"
  ```
  Keyless + local. `render.sh` reads the per-AR composition id + output basename from `props.json`, pins
  every `@remotion/*` to one resolved version, passes `--browser-executable=$CHROME_HEADLESS_SHELL`
  (`/opt/remotion/chrome-headless-shell`), uses `--concurrency=1` (the ~1.9 GB template OOMs >1.9 GB →
  Exit-137), the **global** `remotion` binary (not `npx --yes`, ~25× faster), then ffprobe-verifies
  codec/dims/fps/duration (+ audio stream) and extracts frames. The verify-at CSV is **seconds**;
  validate/render own the frame conversion (`t*FPS`).
- **Phase 7b (preview)** — optional, non-gating:
  ```bash
  bash "$RM_PREVIEW/scripts/preview.sh" artifacts/<project>/remotion-project artifacts/<project>
  ```
- **Phase 4 (voiceover/assets)** — ai-gen scripts owned by `rm-voiceover` (`tts.sh`, `words.sh`) and
  `rm-assets` (`bg-remove.sh`, `capture.sh`). rm-studio invokes them per those skills; it does not call
  `ai-gen` directly. Models route via the keyless `ai-gen` proxy (TTS `fal-ai/kokoro/american-english`, ASR
  `fal-ai/wizper`, matte `fal-ai/bria/background/remove`).

`$RM_BUILD`/`$RM_VALIDATE`/`$RM_RENDER`/`$RM_PREVIEW` resolve to those skills' directories under
`.claude/skills/<name>/` at runtime. The bundled `scripts/run.sh` chains phases 5(scaffold)→6→7→7b once the
authored React exists.

## JTBD front-ends (where the chain starts)

See `references/routing.md` for the full router. In brief:

| JTBD | input | front-end | chain |
|---|---|---|---|
| **JTBD-1** narrated video (default) | brief / script / URL | concept from the brief | 1→2→3→4→5→6→7→7b (full) |
| **JTBD-2** data video | CSV / JSON / numbers | concept + a *data narrative*; storyboard maps series → `rm-dataviz` blocks | 1→2→3→5(chart components, bind exact values)→6→7→7b |
| **JTBD-3** caption/social cut | an existing media clip/audio | start at ASR (the words via `rm-voiceover`'s ASR path) → storyboard captions → `rm-captions` overlay | 4(ASR)→3→5(+rm-captions, opt rm-assets matte)→6→7→7b |
| **JTBD-4** restyle/resize/re-voice | a reference to an existing project | re-enter mid-chain on frozen facts (below) | one of 5 / 4 / 7 |
| **JTBD-5** describe any video | a freeform motion idea | generative authoring in `rm-build` from the official skills | 0→5(generative)→6(gate)→7→7b; refine loops 5↔6↔7 |

Every path converges on the `rm-validate` gate before a full render. Composition shape =
**orchestrator → workers** (`rm-studio` sequences via `state.md`; workers never call each other).

## Re-entry rules (JTBD-4 — frozen facts)

Re-enter at the **earliest phase the change touches**; read the unchanged upstream artifacts:

| change | re-enter at | what stays frozen |
|---|---|---|
| restyle (palette/fonts/look), different AR orientation | **5 (build)** | `02-script.md` + `03-storyboard.md` facts (on-screen text/numbers byte-identical) |
| re-voice (new Kokoro voice, re-narrate) | **4 (voiceover)** | the script facts; rebuild only if word timings shift caption beats |
| resize/re-render same orientation, 4k pass, quality bump | **7 (render)** | the composition (no re-author) |
| a change that implies NEW facts | **2 (script)** — and SAY SO | nothing — this is a re-structure, not a restyle |

A different aspect-ratio **orientation** (16:9 → 9:16) is a re-author at phase 5: it is a **separate
`<Composition>`** with new root dims, not a render flag. `rm-render` rejects an orientation-mismatched AR
cleanly and routes it back to build — a quality/4k pass only upscales within the same orientation.

## Headless + honesty rules
- No runtime prompts. Missing optional input → documented default (16:9, context voice/`am_michael`, music
  off, draft). Missing the required brief → record the failure in `state.md` and stop.
- Grade visual quality by reading sampled frames (vision), never by filename/size.
- Keyless + local only: never `auth login`, cloud/Lambda/Cloud Run render, or a paid TTS/avatar API. The
  render core is local & free (Remotion → Chrome Headless Shell + FFmpeg); asset models route via the keyless
  `ai-gen` proxy.
- ai-gen reachability gate: attempt the pass-through; if a model is unreachable (`success:false`), do not
  silently substitute — render silent / use estimated word timing (~2.5 wps) and note it, or STOP and ask if
  narration was required.
