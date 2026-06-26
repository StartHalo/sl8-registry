# Authoring method — how `rm-build` prompts the model to write fresh Remotion

> The methodology half of the hybrid generative engine. `composition-contract.md` is the *what*
> (the hard rules); this is the *how* (the prompt that gets the model to satisfy them on the first
> pass). Ported from `research/prompt-engineering.md`. The contract + the validate gate are identical
> across all 5 JTBDs — only the prompt narrows.

## 1. Always open with `use remotion best practices`
**Every** authoring turn — the first and every refinement — opens with the literal phrase
`use remotion best practices` (alias `use remotion skills`). It is the canonical loader that pulls the
official rule files into context. Without it the model guesses API conventions and reliably emits the
exact patterns the contract forbids (CSS `@keyframes`, deprecated imports, native `<img>`, `useFrame()`
from r3f). The official skill is a **router with progressive disclosure** — its `SKILL.md` does not
contain the rules, it tells you *which rule file to load for the task*. So `rm-build` does two things:
emits the loader line, then **names the specific rule files** the storyboard implies.

## 2. Name the rule files the storyboard implies (task → rule)
The skill ships ~37 rules at `.agents/skills/remotion-best-practices/rules/` + `SKILL.md`. Core animation
guidance lives in `SKILL.md` + `rules/timing.md` (there is **no** `animations.md` on disk — don't cite it).

| The storyboard calls for… | Load these rule files |
|---|---|
| Any motion / easing | `SKILL.md` (root), `rules/timing.md` |
| Multi-scene structure | `rules/sequencing.md`, `rules/transitions.md` |
| Defining the composition / dynamic duration | `rules/compositions.md`, `rules/calculate-metadata.md` |
| Zod-parametrized props | `rules/parameters.md` (but plain `zod@4`, not `@remotion/zod-types` — see contract divergences) |
| Text reveals / kinetic type | `rules/text-animations.md`, `rules/measuring-text.md` |
| Charts & data viz (JTBD-2) | `rules/timing.md` + `@remotion/paths` (no `charts.md` installed — drive SVG by spring/interpolate; seed from `rules/assets/charts-bar-chart.tsx`) |
| Captions / subtitles (JTBD-3) | `rules/subtitles.md`, `rules/display-captions.md`, `rules/import-srt-captions.md` (transcription via ai-gen Wizper, not `transcribe-captions.md`'s whisper) |
| Voiceover (JTBD-1) | `rules/voiceover.md` (TTS via ai-gen Kokoro, not ElevenLabs), `rules/audio.md`, `rules/get-audio-duration.md` |
| Embedded clip / talking head (JTBD-3) | `rules/videos.md`, `rules/get-video-duration.md`, `rules/get-video-dimensions.md` |
| Images / fonts | `rules/images.md` ; `rules/google-fonts.md`, `rules/local-fonts.md` |
| Audio visualization | `rules/audio-visualization.md` |
| Visual/pixel effects, light leaks | `rules/effects.md`, `rules/light-leaks.md`, `rules/html-in-canvas.md` |
| Video-first layout & text sizing | `rules/video-layout.md` (load for ANY text-heavy / promo / motion-graphics video) |
| FFmpeg ops / silence trim | `rules/ffmpeg.md`, `rules/silence-detection.md` |
| 3D (deferred → REQ-005) | `rules/3d.md` — do NOT emit in v1 (C9) |

## 3. The ten universal prompting patterns (bake into every prompt)
1. **State resolution + fps explicitly.** `1920×1080, 30fps`. fps is **always 30**; dims from the AR
   (`16:9→1920×1080`, `9:16→1080×1920`, `1:1→1080×1080`).
2. **Frame budgets per scene.** `Scene 1 — Terminal Install (120 frames / 4s)`. Frames are the agent's
   unit; the sum of budgets == `durationInFrames` (C10).
3. **Name spring physics with damping values.** `damping: 14 for the logo jump, damping: 200 for the slow
   settle`. Numeric damping beats "smooth". Springs are the **exception** — default to `interpolate()` +
   `Easing.bezier`; reserve `spring()` for explicitly physical motion.
4. **Timeline as timestamped beats.** `0–0.4s: cursor enters top-left; 0.4–1.2s: headline types in`. The
   storyboard already emits this — pass it through unchanged.
5. **Reference assets by local file path** (`public/logo.png`); in code they become `staticFile("logo.png")`
   after staging into `public/`.
6. **Expect conversational refinement.** Don't one-shot a complex animation; iterate (§6).
7. **Delegate external data to CLI tools.** `ffprobe` for clip duration/dims, `ai-gen audio stt` (Wizper)
   for word timings, JSON/CSV parsing for figures — don't make the model eyeball data it can compute.
8. **Use the right composition primitive** (§4).
9. **Color palettes as hex literals.** `#0c0a09 background, #fbbf24 amber accent`. The concept phase fixes
   the palette; inject the literals so the model never invents colors.
10. **State the export format when it matters.** Default opaque h264 MP4; transparent output additionally
    needs `rules/transparent-videos.md` loaded.

A headless bot cannot ask the user mid-render — where the showcase says "ask me", `rm-build` **decides and
records the decision in `06-summary.md`** instead.

## 4. Pick the right composition primitive (storyboard → code)
The single most common authoring mistake is the wrong structural primitive. `rm-storyboard` tags each beat;
pass the tag through.

| Storyboard pattern | Primitive | Snippet |
|---|---|---|
| Scenes play **back-to-back, no overlap** | `<Series>` | `<Series.Sequence durationInFrames={45}>…` |
| Scenes **cross-fade / wipe / slide** | `<TransitionSeries>` + `@remotion/transitions` | `<TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames:15})}/>` |
| Layers **overlap / are delayed** within a scene | `<Sequence from={…} durationInFrames={…} premountFor={…}>` | overlay a caption over a clip |
| Scenes **overlap by N frames** | `<Series>` with `offset={-N}` | `<Series.Sequence offset={-15} …>` |

Inside any `<Sequence>`/`TransitionSeries.Sequence`, `useCurrentFrame()` is **local** (starts at 0) — animate
relative to the scene's own start, not the global frame (a frequent off-by-scene bug; state it explicitly).
Always `premountFor` a `<Sequence>` so late scenes' fonts/media are ready before they play.

## 5. The authoring-prompt skeleton
`rm-build` fills this and hands it to the model in-project. It never invents facts — concept/script/
storyboard/palette are fixed upstream and frozen.

```
use remotion best practices

Load: rules/compositions.md, rules/timing.md, rules/sequencing.md, rules/transitions.md,
      rules/video-layout.md{, + JTBD-specific rules per §2}

PROJECT: <project>   COMPOSITION ID: <Pascal>   FORMAT: MP4 h264, 30fps
ASPECT RATIOS: 16:9 (1920×1080){, 9:16 (1080×1920)}
PALETTE: #<bg> background, #<accent> accent{, #<accent2>}   FONT PACK: <modern|editorial|bold|tech>

SCENES (sum of budgets == durationInFrames):
  Scene 1 — <name> (<F> frames / <S>s)
    beats:  0–0.4s …  0.4–1.2s …            (timestamped, from 03-storyboard.md)
    on-screen text: "<verbatim from 02-script.md>"     ← FACTS, do not alter
    motion: interpolate + Easing.bezier(…); spring damping <n> for <element>
    primitive: <Series|TransitionSeries|Sequence>; transition: <fade|slide|none>
  Scene 2 — …

ASSETS (reference by path, load via staticFile after staging into public/):
  logo            -> public/logo.png
  voiceover/intro -> public/voiceover/intro.wav   (word timings: 04-timing.json)

PROPS: expose a Zod (zod@4) schema (title, palette, durationSeconds, seed, …) so the composition is
       parametrizable and calculateMetadata derives durationInFrames from durationSeconds.

CONTRACT (hard rules — the output MUST satisfy all of composition-contract.md C1–C12). Compose the
engine (StyleProvider/FontProvider/SafeZone + primitives). Author src/<Comp>.tsx + wire src/Root.tsx
(one <Composition> per AR). Do NOT run a full render; stop after writing files + props.json.
```

Two deliberate properties:
- **Facts are quoted, never paraphrased.** On-screen text + numbers are pasted verbatim from `02-script.md`;
  the contract (C8) forbids inventing or rounding them — the guarantee behind JTBD-2 ("every figure ==
  input") and JTBD-4 ("facts frozen").
- **`rm-build` stops before a full render.** Author files + `props.json` only; `rm-validate` owns rendering.
  This keeps the expensive render behind the gate.

## 6. Conversational refinement (JTBD-5 multi-turn; JTBD-4 frozen facts)
Refinement is first-class. A turn is a **diff**, not a rewrite:
1. Re-open with `use remotion best practices`.
2. **Edit, don't rewrite** the existing `src/<Comp>.tsx` ("make the intro faster" → shorten Scene 1's
   budget + re-sum `durationInFrames`).
3. Re-run the full gate (`rm-validate`); a refinement that breaks the contract is blocked like a fresh fail.
4. Record the change in `06-summary.md`.

JTBD-4 is refinement under a **facts freeze**: re-enter the chain at the right phase (restyle → build;
re-voice → voiceover; resize → build for the new `<Composition>` + render) with `02-script.md` read-only.
C8 (facts as props) is what makes only the requested dimension change. If a "restyle" actually implies new
facts, escalate to a fresh JTBD-1/2 run rather than mutate frozen facts.

## 7. Per-JTBD prompt deltas (same engine, different framing)

| JTBD | Prompt shape | Extra rules loaded | Contract emphasis |
|---|---|---|---|
| **1 — brief → narrated video** | frame-budgeted scene list; VO lines + `04-timing.json` as assets | `voiceover.md`, `audio.md`, `subtitles.md`, `get-audio-duration.md` | facts verbatim; `<Audio>` synced per scene; duration from VO length |
| **2 — data → chart video** | named composition + numeric ranges + visual encoding; figures pasted exactly | `timing.md` + `@remotion/paths` (SVG bars/lines by spring) | every on-screen figure == input; `tabular-nums`; no rounding |
| **3 — clip → captioned cut** | overlay captions over `<OffthreadVideo>`; word timings from ai-gen Wizper | `videos.md`, `subtitles.md`, `display-captions.md` | `createTikTokStyleCaptions`; sync ±150 ms; text in safe zone over video |
| **4 — restyle/resize/re-voice** | refinement diff on frozen facts | (depends on the change) | C8 facts-frozen; only the requested dimension changes |
| **5 — describe any video** | full open-ended brief; whatever rules the idea implies (§2) | per-idea | the whole contract; bounded retries on gate failure; 2D approximation if the idea implies 3D (RAM defer) |

### Keyless asset stack the prompts reference (via the SL8 proxy, no keys)
- **Voiceover (JTBD-1)**: ai-gen Kokoro `fal-ai/kokoro/american-english` (default `am_michael`, alt
  `af_nova`) → staged to `public/voiceover/*.wav` (owned by `rm-voiceover`).
- **Word timings / transcription (JTBD-1 captions, JTBD-3)**: ai-gen Wizper `fal-ai/wizper` → word-level
  JSON (`04-timing.json`). Fallback if unreachable: estimate ~2.5 words/s, flagged lower-confidence in the
  summary.
- **Subject matte (JTBD-3 optional)**: ai-gen `fal-ai/bria/background/remove` (owned by `rm-assets`).

The render itself uses **no AI model** — Remotion → headless Chrome + FFmpeg only.

## 8. Worked example (JTBD-5, the PoC — annotated)
Brief: *"a 12s title→stat→outro card for a fictional API launch, blue/teal palette, kinetic text."*

```
use remotion best practices                          ← §1 loader (mandatory)
Load: rules/compositions.md, rules/transitions.md, rules/parameters.md, rules/timing.md, rules/video-layout.md
FORMAT: MP4 h264, 30fps   AR: 16:9 (1920×1080), 9:16 (1080×1920)   ← P1 res+fps explicit
PALETTE: #0b1220 background, #22d3ee cyan, #2dd4bf teal accent      ← P9 hex literals
FONT PACK: tech (Space Grotesk + DM Serif accent)                  ← C5 engine pack
SCENES (sum == durationInFrames=360):                              ← P2 frame budgets, C10
  Scene 1 — Title card (108f / 3.6s)   beat 0–0.6s headline springs in (damping 14)   ← P3 named damping
  Scene 2 — Stat reveal (144f / 4.8s)  Counter 0→47 interpolate+Easing.bezier, tabular-nums  ← C-facts, C4
  Scene 3 — Outro CTA  (108f / 3.6s)   fade via TransitionSeries                       ← P8 right primitive
PROPS: zod@4 { title, statPercent:47, durationSeconds:12, palette, seed:1 }  calculateMetadata → 360f  ← C8
CONTRACT: composition-contract.md all rules. Author src/LaunchCard.tsx + wire Root.tsx. Do NOT full-render.
```

Result: `tsc --noEmit = 0`; contract lint clean; 3 stills + a 9:16 still vision-PASS (legible, on-brand
blue/teal, font embedded, edge-anchored hierarchy, stat counter == input `47`); full render
`h264 / 1920×1080 / 360f / 12.05s` in ~20 s wall @ `--concurrency=1`. Two gotchas became contract rules:
the `zod@4` peer pin and the scoped-`loadFont` rule (C5).

## 9. Anti-patterns the prompt + lint must catch
`transition: opacity 0.3s` / `@keyframes` / `animate-pulse` (C2) · `setTimeout(...)` / `Date.now()`-driven
motion (C1) · `Math.random()` sparkles (C3) · `interpolate(frame,[0,30],[0,1])` with no clamp (C4) · bare
`loadFont()` → 63–126 render-time requests (C5) · native `<img src="logo.png">` → blank frame (C6) ·
`fetch`/relative path instead of `staticFile()` (C7) · hard-coded headline instead of a prop (C8/tsc) ·
`@remotion/three` ThreeCanvas in v1 → Exit-137 (C9) · trailing blank seconds past the last beat (C10) ·
mixed `@remotion/*` versions (C11) · 34 px "headline" jammed to the frame edge (C12) · every scene
cross-fades identically (vision grade: "varied easing, not flat fades").

## See also
- `composition-contract.md` — the C1–C12 hard rules + the divergences table (the enforcement side).
- `bot014-style-authoring.md` — the harvested engine API (`StyleConfig`/`tokens`/`fonts`/`SafeZone`/
  `primitives`/`rng`) you compose against.
- `remotion-blocks.md` — the Remotion block vocabulary (pointer to `rm-storyboard`'s canonical catalog).
- Bundled official rules: `scripts/remotion-template/.agents/skills/remotion-best-practices/` (`SKILL.md`
  router + `rules/*`).
