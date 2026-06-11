# Style authoring contract (BOT-014 Kinetic Text)

A *style* is a folder `src/styles/<name>/` whose `index.tsx` exports
`export const Root: React.FC<StyleRootProps>` (and `export default Root`). The dispatcher
(`src/NewsVideo.tsx`) renders exactly one style root per clip, plus a background score.
The same style serves all three aspect ratios (16:9 / 9:16 / 1:1).

## The data you draw (`RenderDoc`, from `engine/types.ts`)
```ts
interface RenderDoc {
  headline: string;
  dek: string | null;
  dateline: { location: string | null; dateDisplay: string | null };
  source: { name: string | null; byline: string | null };
  bodyBeats: string[];          // ordered most-important-first
  keyPhrases: string[];         // emphasis terms (verbatim substrings of the copy)
  primaryStat: { value: string; label: string } | null;   // e.g. {"$40M","Series B raised"}
  quote: { text: string; speaker: string | null; speakerTitle: string | null } | null;
  category: string;             // e.g. "funding" / "product" / "other"
  tone: string;                 // e.g. "neutral" / "exciting" / "urgent"
}
```
**Guard every optional field.** `dek`, `primaryStat`, `quote`, `source.name`, dateline parts
can all be null/empty. Never crash on missing data; just omit that bit.

## Root contract (`StyleRootProps`)
```ts
interface StyleRootProps { doc: RenderDoc; brand: { accent: string; accentAlt?: string|null; label?: string|null }; seed: number; }
```
Your `Root` wraps the scene tree in `<AbsoluteFill style={{ backgroundColor: ... }}>` and a
`<StyleProvider palette={...}>` (see below). It must NOT render `<Audio>` — the dispatcher
adds the score.

## The sequencer — THIS is non-negotiable
Every style must **transition through the whole message**, not hold a single headline. Use:
```ts
import { planScenes, type Scene } from "../../engine/sequence";
import { SceneSeries } from "../../engine/SceneSeries";

const { scenes, durs, trans } = planScenes(doc, durationInFrames, { /* opts */ });
// Scene = headline | beat | stat | quote | credit  (each already time-budgeted)
<SceneSeries scenes={scenes} durs={durs} trans={trans} renderScene={(s, i) => /* your JSX per scene */} />
```
`planScenes` returns scene durations whose sum makes the wrapped `<TransitionSeries>` total
EXACTLY `durationInFrames`. Inside `renderScene`, the component sees a LOCAL frame starting
at 0 (each scene is a `TransitionSeries.Sequence`). `planScenes` opts:
`{ trans?: number=9, maxBeats?: number=4, includeStat?: bool=true, includeQuote?: bool=true, includeCredit?: bool=true }`.
Pass `includeQuote:false` if your style has no quote treatment. You MAY pass a custom
`presentationFor={(next, i) => Presentation}` to `SceneSeries` to control the cross-scene
motion (import `fade`, `slide`, `wipe` from `../../engine/SceneSeries`; also
`clockWipe`/`flip`/`none` exist under `@remotion/transitions/*` if you want them).

A style that is fundamentally NOT a per-scene cut (e.g. a continuous carousel) may instead
use its own `<Series>`/manual timeline, but it MUST still walk the message
(headline → beats/keyPhrases → stat → credit) over the clip and END the timeline exactly at
`durationInFrames`.

## Layout + type (`engine/StyleConfig.tsx`)
Wrap content in `<SafeZone>` (AR-aware margins — keeps text clear of platform UI). Read sizing
from the context, never hardcode px:
```ts
const { palette, font, orientation, shortEdge, size } = useStyleConfig();
// orientation: "landscape" | "portrait" | "square"  → branch layout on this
// shortEdge = min(width,height) = 1080 for all three ARs → base your px on it
// size("hero"|"headline"|"dek"|"beat"|"meta"|"kicker"|"stat") → legible, floored type sizes
// font.body (Inter) | font.display (Fraunces serif) | font.condensed (Oswald)
```
`<Palette>` = `{ bg, surface, text, textMuted, accent, accentAlt }`. Build it in your
`palette.ts` (`buildPalette(brand) -> Palette`, pure, no randomness) and pass to
`<StyleProvider palette={...}>`.

## Animation primitives (`engine/primitives.tsx`)
`RiseIn`, `FadeIn`, `Counter` (animated number; pair with `parseStat(value) -> {prefix,num,suffix}`),
`Bar`, `Card`, `DividerWipe`, `KenBurns`, `useSpringProgress`, `useInOut`. Reuse these before
hand-rolling. For big counters: `const {prefix,num,suffix}=parseStat(stat.value)` then render
`{prefix}<Counter to={num} .../>{suffix}` (fall back to the raw string when `num===null`).

## HARD RULES (a render is rejected if any is violated)
1. `export const Root: React.FC<StyleRootProps>` + `export default Root`. No other public API.
2. **100% frame-driven.** Drive everything from `useCurrentFrame()` + `interpolate`/`spring`.
   NO CSS `transition`/`@keyframes`/`animation`, NO `setTimeout`, NO `Date.now()`.
3. **Deterministic.** NO `Math.random()`. For any jitter use `noise(seed, frame, salt)` or
   `hashStr(str)` from `../../engine/rng`. Same props → byte-identical frames.
4. **All three ARs.** Branch sizes/positions on `orientation`. Test mentally at 9:16 (tall),
   1:1, 16:9 (wide). Text must never clip the safe zone or overflow its container — clamp
   font sizes by the longest word vs the content width (see kinetic's TextScene for the pattern).
5. **Fonts** come from `engine/fonts.ts` via `font.*`. Do not import other font loaders.
6. `interpolate` is ALWAYS clamped (`extrapolateLeft/Right: "clamp"`) unless you truly want
   linear extrapolation. Springs use `config.damping` (200 = smooth settle, ~12-15 = bounce).
7. Keep `seed` plumbed through for determinism; never read time/random outside `noise`.
8. The scene/timeline total MUST equal `durationInFrames` (SceneSeries guarantees this when
   you feed it `planScenes` output).

## Reference implementation to mimic structurally
`src/styles/kinetic-typography/` — `index.tsx` (planScenes + SceneSeries + per-scene
components + persistent overlays), `palette.ts` (pure palette), `KineticLine.tsx` (per-word
spring-in with seeded jitter + emphasis matching against keyPhrases), `Backdrop.tsx`
(deterministic gradient/grain). Match its quality bar: a clear visual identity, smooth motion,
legible at every AR, and it PROGRESSES through the message.

## Emphasis matching (key phrases)
Normalize with `s.toLowerCase().replace(/[^\p{L}\p{N}-]/gu, "")` and compare word tokens to a
Set built from `keyPhrases` (and their component words). kinetic's `buildEmphasisSet` shows
the exact approach — replicate it locally (don't import from kinetic; keep styles independent).
Emphasis words get the `accent`; everything else `text`.
