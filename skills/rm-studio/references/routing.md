# JTBD routing (rm-studio reference)

> How rm-studio classifies a request into one of the 5 JTBDs, which front-end phase it enters at, and which
> **capability skills** the build phase weaves in. This is the part of the orchestrator that re-targets
> beyond BOT-015's hf-studio: the same phase spine, plus Remotion-only capability routing
> (`rm-captions` / `rm-dataviz` / `rm-audioviz`) and a generative front-end (JTBD-5). Cited by
> `rm-studio/SKILL.md`; the spine + scripts live in `references/phase-chain.md`. Not auto-loaded.

## Classify the brief (look at the INPUT shape, headless — never ask)

| If the brief is… | JTBD | front-end | capability skill(s) woven into phase 5 (build) |
|---|---|---|---|
| a plain-language brief / script / topic / source URL | **1** narrated video (the default) | concept (ph1) | — (the harvested engine + library presets) |
| tabular data (a CSV/JSON path, a table, "these numbers") | **2** data video | concept + data narrative (ph1) | **`rm-dataviz`** — animated bar/line/counter/ranking, figures == input |
| an existing media clip / audio path ("caption this", "add subtitles") | **3** caption / social cut | ASR only (ph4) — transcribe the clip; skip concept/script narration | **`rm-captions`** (word-pop over `<OffthreadVideo>`); optional **`rm-assets`** subject matte |
| a freeform motion idea with no facts to narrate ("animate X", "make confetti burst into our logo") | **5** describe any video | generative authoring (ph5) | author fresh React from the official skills; pull `rm-audioviz`/`rm-dataviz`/`rm-captions` only if the idea calls for them |
| a reference to a FINISHED project + a tweak ("now make it 9:16 / bolder / a different voice / re-render") | **4** restyle/resize/re-voice | re-entry (see below) | inherit whatever the prior run used; do not add/remove facts |
| audio-reactive ("make the bars dance to this track", a music-driven viz) | 1/5 + audio | concept or generative | **`rm-audioviz`** — `visualizeAudio`/`<Waveform>` spectrum |

If the brief blends shapes (e.g. a narrated brief that also has a chart), it is the **primary** JTBD with the
extra capability skill woven into build — e.g. JTBD-1 narrated video + `rm-dataviz` for the one chart beat.

## Capability skills are woven into build, not separate phases
`rm-captions` / `rm-dataviz` / `rm-audioviz` own **no phase and no numbered artifact**. They ship vetted
starter components + references; phase 5 (`rm-build`) drops the relevant component into
`remotion-project/src/` and the generative author composes it. They are progressive-disclosure — a plain
kinetic-headline request (JTBD-1) never loads `rm-dataviz` or `rm-audioviz`. Only `rm-render` (`exports/`)
and `rm-preview` (`preview.html`) emit top-level deliverables; the rest feed the build.

This is why routing matters at phase 0: rm-studio decides the JTBD up front and records, in `state.md` +
`06-summary.md`, which capability skills the build will use — so the build phase opens the right references
and the validate phase knows what to check (e.g. JTBD-2 → figures == input data).

## Phase coverage per JTBD (which numbered artifacts get written)

| JTBD | 1 concept | 2 script | 3 storyboard | 4 vo+timing | 5 build | 6 validate | 7 render | 7b preview |
|---|---|---|---|---|---|---|---|---|
| 1 narrated | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 2 data | ✓ | ✓ | ✓ (dataviz blocks) | ✓ (if narrated) | ✓ (chart components) | ✓ | ✓ | ✓ |
| 3 clip captions | — (light preset) | — | ✓ (caption beats) | ✓ (ASR only) | ✓ (rm-captions) | ✓ | ✓ | ✓ |
| 4 restyle/resize/re-voice | frozen | frozen | frozen* | re-voice only | restyle only | ✓ | ✓ | ✓ |
| 5 describe any | opt | opt | opt | opt | ✓ (generative) | ✓ | ✓ | ✓ |

\* storyboard re-runs only if a restyle changes the block layout; facts stay byte-identical.

## Re-entry routing (JTBD-4 — frozen facts)
Pick the **earliest phase the change touches**; everything upstream is read unchanged (full table in
`references/phase-chain.md`):

| the user asks for… | re-enter at | gotcha |
|---|---|---|
| "bolder / darker / different palette or fonts" | **5 build** | re-theme only; on-screen text/numbers stay byte-identical |
| "make it 9:16 / 1:1" (orientation change) | **5 build** | a different orientation is a **separate `<Composition>`**, not a render flag |
| "different voice / re-narrate" | **4 voiceover** | rebuild only if word timings shift the caption beats |
| "re-render at standard / 4k / same shape" | **7 render** | no re-author; a 4k pass upscales within the same orientation |
| "say $9 instead of $19" (NEW facts) | **2 script** — and say so | NOT a restyle; never silently alter facts |

New exports always sit beside the originals (distinct `<name>-<ar>` stems); append a dated note to
`06-summary.md`.

## Defaults the router applies headlessly (record each in 06-summary.md)
| missing | default |
|---|---|
| aspect ratio | 16:9 (9:16 for a JTBD-3 social cut) |
| brand kit | neutral dark (`#0a0a0a` bg, Inter, cyan accent) |
| voice | `am_michael` (Kokoro) |
| music | off |
| chart kind (JTBD-2) | inferred from the data shape |
| ai-gen unreachable | silent VO / estimated ~2.5 wps timing, recorded |
