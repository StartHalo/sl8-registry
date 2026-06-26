# Data-viz rules — the exact-figure contract + chart selection (rm-dataviz)

The durable how-to `rm-dataviz` cites. It governs JTBD-2 (data → chart video): bind an exact
CSV/JSON dataset to an animated bar / line / combined / counter / ranking chart whose on-screen
figures equal the input **exactly**. The chart components live in the bundled starter at
`../rm-build/scripts/remotion-template/src/components/{BarChart,LineChart}.tsx` (they ride into
every per-project app via `rm-build/scripts/init.sh`). `rm-build` composes them; `rm-validate`
gates; `rm-render` renders. This skill writes **no pixels and runs no render**.

---

## 1. The exact-figure rule (the whole point)

> **Every figure on screen == the figure in the input data, character-for-character. Never round,
> reformat, abbreviate, or invent a number the user did not provide.**

This is enforced by a strict **value / display split** carried through the whole pipeline:

| field | role | example | rule |
|---|---|---|---|
| `value` | a `number`, drives **geometry only** (bar height, line y) | `2039` | may be derived/scaled (k/m/b expanded); never shown raw |
| `display` | the **verbatim** input cell, the only thing the viewer reads | `"$2,039"` | passed through byte-for-byte; `$`, commas, `%`, decimals, trailing units preserved |
| `label` | the category / x-axis label | `"Q1"` | verbatim |

- `parse-series.mjs` produces `{label, value, display}` and **never reformats `display`** — it only
  computes `value` for geometry. `"12.0"` stays `"12.0"`, not `12`; `"47.3%"` stays `"47.3%"`.
- The components render `display` **verbatim at rest**. `BarChart` may *count up* to the value, but
  once the reveal completes (`frame >= delay+dur`) it swaps to the literal `display` string — so the
  resting frame the vision grade and ffprobe see is exactly the input figure. `LineChart` shows
  `display` directly (no digit animation).
- Counters use **`fontVariantNumeric: "tabular-nums"`** so digits don't reflow frame-to-frame
  (determinism + no width jitter). Never animate a figure without tabular-nums.
- `rm-build` binds the figures as **Zod props** (`props.json`), pasted verbatim from `02-script.md` /
  the parsed series — facts arrive as props, not hard-coded magic strings (contract C8). That is what
  lets JTBD-4 re-style/re-size the same data without ever touching the numbers.

**Magnitude scaling is geometry-only.** `parse-series.mjs` expands `2.5M → 2_500_000`, `1.2B → 1.2e9`
so a bar's *height* compares correctly against `1,200`. The viewer still sees `"2.5M"`. If a dataset
mixes units the author can't normalise, pass `--value-col` or hand-edit the series — never let the
displayed figure drift from the source.

---

## 2. Chart selection

Pick the encoding from the data shape and the storyboard's intent, not by guess:

| Use… | When | Component | Geometry |
|---|---|---|---|
| **bar** | compare discrete categories (≤ ~8) | `BarChart` | bars from an **honest 0 baseline**; spring grow, staggered |
| **ranking** | order categories best→worst (leaderboard) | `BarChart` + `highlightIndex` | same bars, sorted desc (`parse-series --kind=ranking`); accentAlt on the leader |
| **line** | a trend over an **ordered** axis (time / sequence) | `LineChart` | line draws on via `@remotion/paths` `evolvePath`; auto-fit y-domain |
| **combined** | a trend **plus** a hero total | `LineChart` + a `Counter` | line for the series, one big counter for the headline figure |
| **counter** | a single hero metric (one number is the story) | engine `Counter` (in `StudioVideo`/a scene) | count-up to the exact value, tabular-nums |

Rules of thumb:
- **> ~8 categories** → switch a bar chart to a horizontal ranking or facet it across beats; a crowded
  bar row fails the legibility floor.
- **Bars start at zero, always.** Truncating a bar axis to exaggerate a difference is dishonest and
  fails the rubric. (`LineChart` may auto-fit its y-domain — a trend line is read by slope, not area.)
- **Categorical x (Q1/Jan/team)** → bar/ranking. **Continuous/ordered x (years, steps)** → line.

---

## 3. The data contract (`Datum`) + parse step

Both components consume the same shape, exported as `Datum`:

```ts
export type Datum = { label: string; value: number; display: string };
```

`parse-series.mjs` (this skill's `scripts/`) turns a dataset into it:

```bash
# CSV (auto-detects the label + value columns; preserves "$2,039" etc. verbatim)
node "$SKILL/scripts/parse-series.mjs" data.csv --out artifacts/<project>/work/series.json
# explicit columns / kind
node "$SKILL/scripts/parse-series.mjs" data.csv --label-col=Quarter --value-col=Revenue --kind=bar
# JSON (array of objects, [label,value] pairs, {labels,values}, or a pre-shaped {series}) + ranking
node "$SKILL/scripts/parse-series.mjs" data.json --kind=ranking
# stdin
cat data.csv | node "$SKILL/scripts/parse-series.mjs" - --kind=line
```

Output:

```json
{
  "kind": "bar",
  "meta": { "count": 4, "min": 2039, "max": 2672, "unit": { "prefix": "$", "suffix": "" }, "source": "data.csv" },
  "series": [ { "label": "Q1", "value": 2039, "display": "$2,039" }, … ]
}
```

`rm-build` reads `series.json`, binds `series` into the composition's Zod props (so the figures are
frozen facts), and passes `<BarChart data={props.series} … />` / `<LineChart data={props.series} … />`.
`meta.unit` is a hint for a shared axis label; `meta.min/max` seed an explicit domain if the author
wants one (otherwise the components auto-fit).

A non-numeric value emits a stderr warning and a `value: 0` (geometry only) — the `display` is still
preserved. `parse-series.mjs` **never invents data**; a malformed file exits non-zero.

---

## 4. Contract compliance (every chart is contract-clean by construction)

The components obey the composition contract `rm-validate` enforces — re-state these when authoring a
bespoke chart for JTBD-5:

- **Frame-driven only** — `useCurrentFrame()` + `spring()` / clamped `interpolate()`. No CSS
  `transition`/`@keyframes`, no Tailwind `animate-*`, no `setTimeout`/`setInterval`/`Date.now`.
  The line "draws on" via `evolvePath` (a stroke-dash keyed to a spring), **not** a CSS animation.
- **Deterministic** — no `Math.random`; stagger and timing are pure functions of the frame + a fixed
  seed. Same input → same frames → a meaningful vision grade.
- **Clamped interpolation** — every frame-range `interpolate()` sets `extrapolateLeft/Right:"clamp"`
  so a bar never overshoots or a label never goes negative-opacity.
- **Engine-themed** — colours/fonts/sizes come from `useStyleConfig()` (`palette.accent`,
  `palette.accentAlt`, `palette.text`, `font.display/body`, `size("dek"|"beat"|"meta")`). Never
  hard-code a hex or px the concept didn't set. Bars use `accent`, the highlighted/leader bar uses
  `accentAlt`, dots use `accentAlt`.
- **Safe zone** — `BarChart` wraps content in `<SafeZone>`; `LineChart` plots inside AR-aware margins
  that mirror `SafeZone` (`marginFor(width,height)`), so figures never collide with platform UI.
- **2D, ≤30s, ≤1080p** — no 3D/Skia (RAM ceiling). Charts render `--concurrency=1`.

---

## 5. Component API

### `BarChart` (`src/components/BarChart.tsx`)
```ts
<BarChart
  data={Datum[]}            // required; value=geometry, display=verbatim figure
  title?={string}           // verbatim from script/concept
  domainMin?={number}       // default 0 — HONEST baseline; override only if asked
  domainMax?={number}       // default max(values)
  countUp?={boolean}        // default true — count to the exact value, then show display verbatim
  delay?={number}           // frames before the first bar (default 6)
  highlightIndex?={number}  // accentAlt emphasis (e.g. ranking leader)
/>
```
Bars grow with a spring, staggered by the engine `STAGGER`. The value figure sits above each bar and
resolves to `display` exactly at rest. Category labels are a separate row (they never eat plot height).

### `LineChart` (`src/components/LineChart.tsx`)
```ts
<LineChart
  data={Datum[]}            // required; ordered points
  title?={string}
  domainMin?={number}       // default: auto-fit min - 8% headroom
  domainMax?={number}       // default: auto-fit max + 8% headroom
  delay?={number}           // frames before the line draws (default 6)
  showValues?={boolean}     // default true — exact display figure at each point
  strokeWidth?={number}     // px (default 6)
/>
```
The path draws on with `evolvePath(springProgress, d)`; dots + figures fade in as the line passes each
point. Geometry is in frame-pixel coords (viewBox = `0 0 width height`, 1:1 — no stroke distortion).

---

## 6. Honest-defaults checklist (what the vision grade looks for)

- [ ] Every displayed figure equals the input figure exactly (no rounding/abbreviation it didn't ask for).
- [ ] Counters use `tabular-nums`; digits don't jitter.
- [ ] Bars start at a zero baseline (no truncated axis to exaggerate).
- [ ] Right encoding for the data (categorical→bar/ranking, ordered→line, single→counter).
- [ ] Themed to the concept palette/fonts; figures legible and inside the safe zone.
- [ ] ≤ ~8 bars per beat; otherwise rank/facet.
