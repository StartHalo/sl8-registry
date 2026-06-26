# Captions in Remotion — the rm-captions contract

Durable how-to for word-pop captions in the studio. Ports the official `remotion-best-practices`
rules **`display-captions.md`** + **`subtitles.md`** (bundled at
`rm-build/scripts/remotion-template/.agents/skills/remotion-best-practices/rules/`) and records the
**one SL8 override**: transcription is done by **ai-gen Wizper** (via `rm-voiceover`), not whisper-cpp.
The *render half* (`@remotion/captions` + `createTikTokStyleCaptions` + word highlight) is unchanged.

`rm-build` always opens an authoring turn with `use remotion best practices` and loads
`rules/subtitles.md`, `rules/display-captions.md`, `rules/transcribe-captions.md`,
`rules/import-srt-captions.md` when the storyboard calls for captions (JTBD-3).

---

## 1. The `Caption` type (the contract format)

Everything is processed as JSON in the `Caption` shape from `@remotion/captions`:

```ts
import type { Caption } from "@remotion/captions";

type Caption = {
  text: string;            // the word, with a LEADING SPACE (white-space rule, §4)
  startMs: number;         // absolute ms on the composition timeline
  endMs: number;           // absolute ms (> startMs)
  timestampMs: number | null;
  confidence: number | null;
};
```

`scripts/timing-to-captions.mjs` produces exactly this from `rm-voiceover`'s `04-timing.json`
(its flat, absolute-time `words[]` track is in **seconds** → the converter multiplies to **ms** and
prepends the leading space). Times are passed through verbatim — no resampling — so caption sync ==
ASR accuracy (Wizper word timings are within ~±150 ms, the JTBD-3 target).

## 2. Generating captions — ai-gen Wizper (the SL8 override)

The official `transcribe-captions.md` uses `@remotion/install-whisper-cpp` (downloads Whisper.cpp +
an ML model). **We do NOT use that in v1** — the SL8 runtime is keyless and bundles no ML weights.
Instead:

- **JTBD-1 (narrated video):** `rm-voiceover` already transcribed the Kokoro narration with
  `ai-gen audio stt -m fal-ai/wizper` and wrote `04-timing.json`. Captions reuse that file — no extra
  transcription.
- **JTBD-3 (caption an existing clip with no script):** there is no `02-script.md`. Run the ASR on the
  clip's audio first with `rm-voiceover`'s `words.sh` (it calls `ai-gen audio stt -m fal-ai/wizper`),
  which writes `04-timing.json` with a real word-level `words[]` track. Extract the audio first if the
  input is a video (`ffmpeg -i clip.mp4 -ar 16000 -ac 1 audio.wav -y`).

`(@remotion/install-whisper-cpp / OpenAI Whisper is a future fully-offline Variation, not v1.)`

Importing an existing `.srt` (`parseSrt()` from `@remotion/captions`, see the bundled
`import-srt-captions.md`) is also valid and yields the same `Caption[]` — skip the converter when the
user hands you an `.srt`.

## 3. Displaying captions — `createTikTokStyleCaptions` + word highlight

Group the `Caption[]` into pages, then render each page in a `<Sequence>` with the currently-spoken
word highlighted. `combineTokensWithinMilliseconds` controls how many words show at once (lower = more
word-by-word; higher = more words per page):

```tsx
import { createTikTokStyleCaptions } from "@remotion/captions";

const { pages } = createTikTokStyleCaptions({
  captions,                                   // Caption[]
  combineTokensWithinMilliseconds: 1200,      // page-switch window
});
```

Each `TikTokPage` has `startMs`, `durationMs`, `text`, and `tokens: { text, fromMs, toMs }[]`. Map
pages → `<Sequence from={startMs/1000*fps} durationInFrames={…}>`; inside the page, the active token is
the one where `token.fromMs <= absoluteTimeMs && token.toMs > absoluteTimeMs`, where
`absoluteTimeMs = page.startMs + (useCurrentFrame()/fps)*1000` (remember `useCurrentFrame()` is **local**
to the `<Sequence>`). The vetted implementation of all of this is **`CaptionOverlay.tsx`** (bundled in
the starter at `src/components/`, owned by this skill) — `rm-build` composes it; do not re-derive it.

## 4. White-space preservation

Captions are whitespace-sensitive. `timing-to-captions.mjs` puts a **leading space** in every word's
`text`, and `CaptionOverlay` renders the line with `whiteSpace: "pre-wrap"` (preserves the spaces, still
wraps a long page). The leading space is kept **outside** the inline-block word span so the active-word
scale "pop" doesn't swallow it.

## 5. How rm-build wires it (the composition)

Captions are the **top layer**, over the clip/scene. The deterministic, contract-clean wiring passes the
`Caption[]` as a prop (Zod-parametrized, per contract C8 — facts via props), inlined into `props.json`
from the converter's output:

```tsx
import { AbsoluteFill, OffthreadVideo, Audio, staticFile } from "remotion";
import { CaptionOverlay } from "./components/CaptionOverlay";

// schema.ts adds:  captions: z.array(z.object({
//   text: z.string(), startMs: z.number(), endMs: z.number(),
//   timestampMs: z.number().nullable(), confidence: z.number().nullable(),
// }))

export const ClipWithCaptions: React.FC<Props> = ({ captions, font, palette }) => (
  <AbsoluteFill>
    <OffthreadVideo src={staticFile("clip.mp4")} />        {/* JTBD-3: caption over the clip */}
    {/* For a narrated still/scene instead: <Audio src={staticFile("vo/narration.wav")} /> */}
    <CaptionOverlay
      captions={captions}
      fontFamily={font.body}                {/* an already-loaded family (engine) — NOT loaded in the component */}
      highlightColor={palette.accent}
      combineTokensWithinMilliseconds={1000}
      position="bottom"                      {/* lower safe-zone band */}
    />
  </AbsoluteFill>
);
```

**Alternative wiring (official file-based, `display-captions.md`):** stage `captions.json` into
`public/` and `fetch(staticFile("captions.json"))` inside a small wrapper using `useDelayRender()`
(`delayRender`/`continueRender`/`cancelRender`) to hold the render until it loads. Use this only if you
do not want the array in `props.json`; the prop-driven path above is the default because it is
deterministic and needs no async/`delayRender`.

```tsx
// file-based wrapper (only if NOT passing captions via props)
const [captions, setCaptions] = useState<Caption[] | null>(null);
const { delayRender, continueRender, cancelRender } = useDelayRender();
const [handle] = useState(() => delayRender());
useEffect(() => {
  fetch(staticFile("captions.json"))
    .then((r) => r.json())
    .then((d) => { setCaptions(d); continueRender(handle); })
    .catch(cancelRender);
}, []);
if (!captions) return null;
```

## 6. JTBD-3 acceptance (what rm-validate vision-grades)

- **Synced within ±150 ms** — the highlighted word matches the spoken audio. The converter preserves
  Wizper times exactly, so sync == ASR accuracy.
- **Legible over video** — caption size ≥ ~5% of the short edge (≥ 40px floor), bold, with the outline
  (stroke + shadow) on for contrast over busy footage.
- **Inside the safe zone** — captions sit in the lower band (portrait bottom 280 / square 120 /
  landscape 130 px), clear of the Reels caption rail / IG crop / YT scrubber.
- **No CSS animation** — the word pop is frame-driven (`interpolate`, clamped); no `transition`/
  `@keyframes`/`animate-*` (rm-validate's contract lint blocks those).

## 7. Failure / fallback

- **No word-level track** (`04-timing.json` `words[]` empty, `timing_method: "estimated"` — TTS/ASR was
  unreachable): the converter writes an empty `Caption[]` and warns. Word-pop captions are unavailable;
  `rm-build` falls back to **beat-level captions** (one `Caption` per beat from `beats[].text` over the
  beat's `duration`) or **skips captions** and records it in `06-summary.md`. **Never fabricate per-word
  timings.**
- **`createTikTokStyleCaptions` on an empty array** returns no pages → `CaptionOverlay` renders nothing
  (no crash).
- **Version skew** — `@remotion/captions` must resolve to the same version as `remotion`
  (`render.sh` re-pins all `@remotion/*` to the runtime's `remotion` version); skew is the #1 render
  break and rm-validate's first gate.

## Sources
- Bundled official rules: `…/remotion-best-practices/rules/display-captions.md`, `subtitles.md`,
  `transcribe-captions.md`, `import-srt-captions.md`.
- Timing producer: `rm-voiceover/scripts/words.sh` (the `04-timing.json` contract).
- Converter: `rm-captions/scripts/timing-to-captions.mjs`. Component:
  `rm-build/scripts/remotion-template/src/components/CaptionOverlay.tsx`.
