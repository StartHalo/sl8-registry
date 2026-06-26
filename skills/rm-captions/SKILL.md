---
name: rm-captions
description: "Build TikTok-style word-pop captions for a Remotion composition from rm-voiceover's 04-timing.json. Owns two deliverables — scripts/timing-to-captions.mjs (converts the flat, absolute-time words[] track into the @remotion/captions Caption[] shape, seconds→ms, leading-space tokens) and the vetted CaptionOverlay.tsx component (createTikTokStyleCaptions paging + active-word highlight + a frame-driven pop, in the lower safe-zone, drop-in over [OffthreadVideo]/[Audio]). Use during the BUILD phase (phase 5) when a video needs captions — the JTBD-3 differentiator (clip → captioned cut, ±150ms sync) and optionally JTBD-1 narrated video. This skill does NOT render and does NOT own a numbered artifact; it produces the captions JSON + composes its component, which rm-build wires and rm-validate/rm-render gate. Transcription is keyless via ai-gen Wizper (done by rm-voiceover); it never prompts the user."
metadata:
  author: sl8
  version: 1.0.0
  references-skills: [rm-voiceover, rm-build]
  inputs:
    - name: timing
      type: json
      required: true
      description: "artifacts/[project]/04-timing.json — rm-voiceover's word-level timing. The flat, absolute-time words[] track ([{text,start,end,beat}] in seconds) is the caption source. For JTBD-3 (an existing clip with no script) this is produced by running rm-voiceover's words.sh ASR on the clip's audio first."
    - name: clip
      type: video
      required: false
      description: "JTBD-3 only — the input video to caption, staged into remotion-project/public/. CaptionOverlay overlays [OffthreadVideo src={staticFile(...)}]. Absent for narrated-still captions (JTBD-1), which caption an [Audio] track instead."
    - name: combineMs
      type: number
      required: false
      description: "createTikTokStyleCaptions page-switch window in ms (default 1200). Lower = more word-by-word; higher = more words per page."
  outputs:
    - name: captions
      type: json
      path: artifacts/[project]/remotion-project/public/captions.json
      description: "The @remotion/captions Caption[] derived from 04-timing.json (absolute ms, leading-space tokens), written by scripts/timing-to-captions.mjs. rm-build inlines it into props.json (deterministic, prop-driven) or CaptionOverlay can fetch it via staticFile()."
    - name: caption-component
      type: tsx
      path: artifacts/[project]/remotion-project/src/components/CaptionOverlay.tsx
      description: "The vetted TikTok word-pop overlay component this skill owns — bundled in the starter (rm-build/scripts/remotion-template/src/components/CaptionOverlay.tsx) and copied into the per-project app by rm-build's init.sh. rm-build composes it as the top layer over the clip/scene."
---

# rm-captions — TikTok word-pop captions for a Remotion composition

## Purpose
Turn `rm-voiceover`'s **`04-timing.json`** into on-screen **word-pop captions**: convert the word
timings into the `@remotion/captions` `Caption[]` shape, and supply the vetted **`CaptionOverlay`**
component that pages them with `createTikTokStyleCaptions`, highlights the spoken word, and pops it in
frame-by-frame — all inside the lower safe-zone, drop-in over `<OffthreadVideo>`/`<Audio>`. This is the
**JTBD-3** differentiator ("clip → captioned cut", sync within **±150 ms**) and an option for JTBD-1
narrated video.

This skill is a **capability**, not a phase: it does NOT render and does NOT own a numbered artifact.
It produces the captions JSON and composes its component; **`rm-build`** wires it into the composition,
and **`rm-validate` → `rm-render`** gate and render it. Transcription is keyless via **ai-gen Wizper**
(performed by `rm-voiceover`); nothing here prompts the user.

`$SKILL` = this skill's directory. The Caption format, the `createTikTokStyleCaptions` render half, the
ai-gen-Wizper transcription override, and the failure cases live in `references/captions.md`.

## When to run
- **Build phase (phase 5)**, woven into `rm-build`, whenever the storyboard calls for captions:
  - **JTBD-3 — clip → captioned cut:** caption an existing video. Word timings come from running
    `rm-voiceover`'s `words.sh` ASR (`ai-gen audio stt -m fal-ai/wizper`) on the clip's audio first.
  - **JTBD-1 — narrated video (optional):** add captions to a Kokoro-narrated video; reuse the
    `04-timing.json` `rm-voiceover` already wrote (no extra transcription).
- Do NOT use it to author the rest of the composition (that is `rm-build`), to synthesize/transcribe
  audio (that is `rm-voiceover`), to render (`rm-render`), or to build charts/audio viz
  (`rm-dataviz`/`rm-audioviz`). Progressive disclosure: a plain kinetic-headline request never loads it.

## Inputs (read before write)
- `artifacts/<project>/04-timing.json` (required) — read it first. Use the **flat `words[]`** track
  (absolute seconds, `{text,start,end,beat}`). If it is missing, or `words[]` is empty
  (`timing_method: "estimated"`, e.g. TTS/ASR was unreachable), word-pop captions are **not** possible
  — take the fallback (below); never invent word times. For JTBD-3 with no `04-timing.json` yet, run
  `rm-voiceover`'s ASR on the clip audio first.
- `clip` (optional, JTBD-3) — the video to caption, staged into `remotion-project/public/`.
- `combineMs` (optional) — page-switch window; default 1200.

## Procedure

### 1. Make sure word-level timing exists
Read `04-timing.json`. If its flat `words[]` is non-empty (`timing_method` `wizper` or `even`), go to
step 2. For **JTBD-3** (an input clip, no script and no timing yet), produce it first with
`rm-voiceover`'s `words.sh` — extract the clip's audio if needed, then transcribe:
```bash
ffmpeg -i artifacts/<project>/assets/captures/clip.mp4 -ar 16000 -ac 1 \
       artifacts/<project>/work/clip-audio.wav -y
bash "$SKILL/../rm-voiceover/scripts/words.sh" full \
     artifacts/<project>/work/clip-audio.wav \
     artifacts/<project>/04-timing.json \
     artifacts/<project>/work/beats.tsv      # one beat row is fine for a single clip
```
If `words[]` is empty → **fallback** (step 5). Do not fabricate timings.

### 2. Convert timing → Caption[]
Run the converter to write the per-project captions JSON (seconds→ms, leading-space tokens):
```bash
mkdir -p artifacts/<project>/remotion-project/public
node "$SKILL/scripts/timing-to-captions.mjs" \
     artifacts/<project>/04-timing.json \
     artifacts/<project>/remotion-project/public/captions.json
```
It writes the file **and** prints the `Caption[]` to stdout (so `rm-build` can inline it into
`props.json`). It maps each flat word `{text,start,end}` → `{text:" "+word, startMs, endMs, timestampMs,
confidence:null}`, keeps the track monotonic, and **passes Wizper times through verbatim** (no
resampling — sync == ASR accuracy). On an empty `words[]` it writes `[]` and warns.

### 3. Confirm the component is present
`CaptionOverlay.tsx` ships in the starter and is copied into the project by `rm-build`'s `init.sh`. It
should already be at `artifacts/<project>/remotion-project/src/components/CaptionOverlay.tsx`. If a
project predates it, copy the canonical source:
```bash
cp "$SKILL/../rm-build/scripts/remotion-template/src/components/CaptionOverlay.tsx" \
   artifacts/<project>/remotion-project/src/components/CaptionOverlay.tsx
```
Do not re-derive the component — it is vetted (frame-driven only, clamped interpolate, safe-zone,
self-contained so it needs no `<StyleProvider>`).

### 4. Compose it (rm-build wires this)
`rm-build` makes `CaptionOverlay` the **top layer** over the clip/scene and passes the captions as a Zod
prop (inlined from step 2's output) plus brand styling — see `references/captions.md §5` for the full
snippet and Zod schema field:
```tsx
<AbsoluteFill>
  <OffthreadVideo src={staticFile("clip.mp4")} />   {/* JTBD-3; or <Audio> for a narrated still */}
  <CaptionOverlay
    captions={props.captions}
    fontFamily={font.body}            /* an already-loaded engine family — NOT loaded in the component */
    highlightColor={palette.accent}
    combineTokensWithinMilliseconds={1000}
    position="bottom"
  />
</AbsoluteFill>
```

### 5. Fallback (no word-level timing)
If `words[]` was empty (`estimated`): do NOT fail and do NOT prompt. Fall back to **beat-level
captions** — one `Caption` per beat from `beats[].text` spanning the beat's `duration` (still readable,
just not word-synced) — or **skip captions** entirely. Record which you did and why in `06-summary.md`.

### 6. Report
State whether captions are **word-synced** (Wizper/even) or fell back to beat-level/none, the caption
count, the `combineMs` used, and that the component is composed. Mark progress in `state.md`, and
remember.

## Outputs
- `artifacts/<project>/remotion-project/public/captions.json` — the `@remotion/captions` `Caption[]`
  derived from `04-timing.json` (absolute **ms**, leading-space tokens) by
  `scripts/timing-to-captions.mjs`. `rm-build` inlines it into `props.json` (deterministic), or
  `CaptionOverlay` can fetch it via `staticFile()` (the official file-based variant in
  `references/captions.md §5`).
- `artifacts/<project>/remotion-project/src/components/CaptionOverlay.tsx` — the vetted TikTok word-pop
  overlay this skill owns (source of truth bundled at
  `rm-build/scripts/remotion-template/src/components/CaptionOverlay.tsx`; copied into the project by
  `init.sh`), composed by `rm-build` as the top layer over the clip/scene.

## Failure / fallback
- **No word-level track** (`words[]` empty / `timing_method: "estimated"`) → beat-level captions or skip
  captions; never fabricate per-word times; note it in `06-summary.md`.
- **ai-gen Wizper unreachable** during a JTBD-3 ASR → `words.sh` writes estimated pacing with empty
  `words[]` → same fallback as above.
- **Empty Caption[]** → `createTikTokStyleCaptions` yields no pages → `CaptionOverlay` renders nothing
  (no crash).
- **Version skew** — `@remotion/captions` must resolve to the same version as `remotion` (the #1 render
  break); `render.sh` re-pins all `@remotion/*`, and `rm-validate`'s first gate checks it.

## Troubleshooting
- **Captions out of sync** — the converter passes Wizper times through unchanged, so drift is the ASR's,
  bounded ~±150 ms; if it's worse, re-check that `04-timing.json` `words[]` are **absolute** times (they
  are, per `words.sh`) and that the clip audio fed to ASR matches the rendered audio.
- **Words run together / no spaces** — every token's `text` must keep its **leading space** (the
  converter adds it) and the line uses `whiteSpace: "pre-wrap"`; don't `.trim()` the tokens.
- **Captions overlap platform UI** — keep `position="bottom"` (lower safe-zone band) or pass a custom
  `fontSizePx`; portrait reserves 280px at the bottom.
- **Too many / too few words per page** — tune `combineTokensWithinMilliseconds` (default 1200; ~800–
  1000 for snappier word-by-word).
- **`tsc` can't find the Caption type** — `@remotion/captions` must be installed at the pinned version
  (it is, in the starter's `package.json`); run `rm-build`'s `init.sh`/`npm ci` first.

## Quality criteria
- [ ] `captions.json` is a `Caption[]` with integer `startMs`/`endMs` (ms, not seconds), `endMs > startMs`,
      a `timestampMs`, `confidence:null`, and a **leading-space** `text` token; times are monotonic.
- [ ] `CaptionOverlay.tsx` is present in the project, imports `createTikTokStyleCaptions` +
      `Caption`/`TikTokPage` from `@remotion/captions`, and is composed as the top layer over the clip/scene.
- [ ] Contract-clean: frame-driven only (no CSS `transition`/`@keyframes`/`animate-*`, no
      `setTimeout`/`Date.now`/`Math.random`), every `interpolate()` clamped; captions in the lower safe-zone.
- [ ] The active (spoken) word is highlighted and synced within ±150 ms of the audio; legible over video.
- [ ] On empty/estimated timing it falls back (beat-level or skip) and reports it — never fabricates word times.
- [ ] Keyless: transcription via `ai-gen` Wizper (through `rm-voiceover`); no whisper-cpp, no user prompt.
