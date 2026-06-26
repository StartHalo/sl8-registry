---
name: rm-dataviz
description: "Bind an exact CSV/JSON dataset to an animated Remotion chart (bar / line / combined / counter / ranking) for a data video (JTBD-2). Parses the data into a labelled, EXACT-FIGURE series (parse-series.mjs) and supplies two vetted, contract-clean chart components (BarChart, LineChart) that rm-build composes into the per-project Remotion app — figures on screen equal the input figures character-for-character (no rounding), with tabular-nums. Use during the BUILD phase (phase 5) when the request is data → chart, or when a dataset is present. A capability skill: it writes the parsed series + ensures the chart components are in the project; it does NOT render or validate (rm-validate gates, rm-render renders). Keyless, deterministic."
metadata:
  author: sl8
  version: 1.0.0
  references-skills: [rm-build]
  inputs:
    - name: data
      type: file
      required: true
      description: "The dataset to chart — a CSV (header + rows) or JSON (array of objects, [label,value] pairs, {labels,values}, or a pre-shaped {series}). The figures shown on screen come from here verbatim."
    - name: storyboard
      type: markdown
      required: false
      description: "artifacts/[project]/03-storyboard.md — the data beat(s) naming the chart kind (bar/line/ranking/counter) and which figures are emphasised. Absent → infer the kind from the data shape (§ chart selection)."
    - name: concept
      type: markdown
      required: false
      description: "artifacts/[project]/01-concept.md — palette (hex) + font pack the chart themes to (applied automatically via the engine StyleProvider; the components read useStyleConfig())."
  outputs:
    - name: series
      type: json
      path: artifacts/<project>/work/series.json
      description: "The parsed, labelled, EXACT-FIGURE series ({kind, meta, series:[{label,value,display}]}) emitted by parse-series.mjs. rm-build binds `series` into props.json so the figures are frozen facts."
    - name: chart-components
      type: x-dir
      path: artifacts/<project>/remotion-project/src/components/
      description: "The vetted chart components (BarChart.tsx, LineChart.tsx) present in the per-project app (bundled in the rm-build starter, staged by init.sh) that the generative author composes. rm-dataviz adds/adapts a bespoke chart here when no shipped component fits."
---

# rm-dataviz — exact-figure animated charts (JTBD-2)

## Purpose
Turn a dataset into an **animated chart whose on-screen figures equal the input exactly**. This skill
is the JTBD-2 ("data → chart video") capability: it (1) parses a CSV/JSON file into a labelled,
exact-figure **series** (`parse-series.mjs`), and (2) supplies two vetted, contract-clean **chart
components** — `BarChart` and `LineChart` — that `rm-build` composes into the per-project Remotion app.
The defining guarantee is the **value / display split**: a numeric `value` drives the *geometry* (bar
height, line y) while the verbatim `display` string is the only thing the viewer reads — so a figure on
screen is never rounded, reformatted, or invented (`references/dataviz-rules.md`).

It is a **capability skill**, like `rm-captions`/`rm-audioviz`: it does not own a phase or a numbered
artifact and it writes **no pixels** — it produces the parsed series + ensures the chart components are
in the project, and `rm-build` authors the composition that uses them. `rm-validate` gates the result;
`rm-render` renders. Keyless and deterministic (fixed seed; frame-driven motion only).

`$SKILL` below = this skill's directory. The chart components are bundled in the starter at
`../rm-build/scripts/remotion-template/src/components/{BarChart,LineChart}.tsx` and land at
`artifacts/<project>/remotion-project/src/components/` after `rm-build`'s `init.sh`.

## When to run
- **Build** (phase 5), woven into `rm-build`, when the job is **data → chart** (JTBD-2): a dataset is
  attached or the storyboard has a data beat. Run this to parse the data and confirm the chart
  components are present; `rm-build` then authors the scenes that compose them.
- **Combined / counter beats** in any JTBD: a single hero metric (engine `Counter`) or a trend line +
  total — same exact-figure rule.
- Do NOT use to write the storyboard (that is `rm-storyboard`), to render (that is `rm-render`), or for
  caption cuts (`rm-captions`) / audio bars (`rm-audioviz`).

## Inputs (read-before-write)
- **data** (required) — the CSV/JSON dataset. Its cells are the on-screen figures; `parse-series.mjs`
  preserves them verbatim.
- `artifacts/<project>/03-storyboard.md` (optional) — names the chart kind + emphasised figures. Absent
  → infer the kind from the data (`references/dataviz-rules.md` § chart selection) and note it.
- `artifacts/<project>/01-concept.md` (optional) — palette + font pack; applied automatically by the
  engine `StyleProvider` (the components read `useStyleConfig()`), so the chart is on-brand with no
  per-chart colour code.
- **Missing required input** (no dataset): record the gap in `state.md` and stop — never fabricate
  figures. **Missing optional**: proceed (infer the chart kind; engine defaults for theme) and note it.

## Instructions

### 1. Read the plan + the data
Read `03-storyboard.md` (if present) for the named chart kind and which figures to emphasise, and
`01-concept.md` for palette/fonts. Open the dataset to confirm the label column and the value column(s).
**The figures shown come from the data verbatim — never round, abbreviate, or invent.**

### 2. Parse the dataset → an exact-figure series
```bash
mkdir -p artifacts/<project>/work
node "$SKILL/scripts/parse-series.mjs" <data.csv|data.json> \
  --kind=<bar|line|ranking|counter> \
  --out artifacts/<project>/work/series.json
# columns are auto-detected (label = first non-numeric col, value = first numeric col); override:
#   --label-col=<name|index> --value-col=<name|index>
# JSON inputs: array of objects, [label,value] pairs, {labels,values}, or a pre-shaped {series}.
# stdin: cat data.csv | node "$SKILL/scripts/parse-series.mjs" - --kind=line
```
This writes `{kind, meta, series:[{label,value,display}]}`. `value` is for geometry only (k/m/b
suffixes are expanded so magnitudes compare); `display` is the verbatim figure the viewer sees. A
malformed file exits non-zero (it never invents data); a non-numeric cell warns and uses `value:0` but
keeps its `display`.

### 3. Choose the chart (data shape → component)
Per `references/dataviz-rules.md` § chart selection:
- **categorical, ≤ ~8 items** → `BarChart` (bars from an honest 0 baseline). Leaderboard →
  `--kind=ranking` (sorts desc) + `highlightIndex` on the leader.
- **ordered / time axis** → `LineChart` (draws on via `@remotion/paths` `evolvePath`).
- **single hero number** → the engine `Counter` in a scene (count-up, tabular-nums).
- **trend + total** → `LineChart` + a `Counter`.
- **> ~8 categories** → rank or facet across beats (a crowded row fails the legibility floor).

### 4. Confirm / adapt the chart components
The vetted `BarChart.tsx` + `LineChart.tsx` ship in the starter and are present at
`artifacts/<project>/remotion-project/src/components/` after `rm-build`'s `init.sh`. They are
contract-clean by construction (frame-driven spring/clamped interpolate, no `Math.random`/`Date.now`/
CSS animation, engine-themed, safe-zone). Usually you compose them as-is — see the API in
`references/dataviz-rules.md` § 5. Only when no shipped component fits (e.g. a grouped/stacked bar, a
combo axis) do you **add a bespoke chart** at `…/src/components/<Name>.tsx`, authored against the same
`Datum` shape and the contract; then `rm-build` composes it.

### 5. Hand the series + components to rm-build
`rm-build` reads `work/series.json` and **binds `series` into the composition's Zod props** (so the
figures become frozen `props.json` facts), then authors the data scene(s):
`<BarChart data={props.series} title="…" />` / `<LineChart data={props.series} />`, with the right
`@remotion/*` rules loaded (`use remotion best practices`; `rules/timing.md` + `@remotion/paths` for the
line). The figures in `props.json` MUST equal the dataset (and `02-script.md`) verbatim. **Do not run a
render** — `rm-validate` owns the still-render + vision grade (it specifically checks figures == input
for data videos), `rm-render` produces the MP4.

## Outputs
- `artifacts/<project>/work/series.json` — the parsed, labelled, EXACT-FIGURE series
  (`{kind, meta, series:[{label,value,display}]}`); `value` = geometry, `display` = verbatim figure.
  `rm-build` binds `series` into `props.json`.
- `artifacts/<project>/remotion-project/src/components/` — the vetted `BarChart.tsx` / `LineChart.tsx`
  (bundled in the `rm-build` starter, staged by `init.sh`) the author composes, plus any bespoke chart
  this skill adds when no shipped component fits.

No rendering and no full Remotion build happen here (that is `rm-build` → `rm-validate` → `rm-render`).

## Failure / fallback
- **No dataset / unreadable file** → `parse-series.mjs` exits non-zero with the reason; record it in
  `state.md` and stop. Never fabricate figures to fill a chart.
- **Wrong columns auto-detected** (e.g. a `2024` year column looks numeric) → re-run with explicit
  `--label-col` / `--value-col`. The exact-figure rule still holds (`display` is preserved regardless).
- **Mixed-unit values** (`$2.5M` next to `1,200`) → `value` scales magnitudes for geometry; if the mix
  is still misleading, normalise via `--value-col` or hand-edit the numeric `value` only — never alter
  `display`.
- **> ~8 categories or a tiny/edge figure** → switch to ranking, facet across beats, or raise the size;
  the vision grade fails on a crowded/illegible chart.
- **A bespoke chart breaks `tsc`/contract** → keep it on the `Datum` shape, `useStyleConfig()` for
  theme, clamped `interpolate`, no `Math.random`/CSS animation; `rm-validate` will route the exact lint
  diagnostic back to `rm-build`.

## Examples

### Example 1 — quarterly revenue bars (JTBD-2)
`revenue.csv` (`Quarter,Revenue` → `Q1,"$2,039"` …). `parse-series.mjs revenue.csv --out
…/work/series.json` → `series:[{label:"Q1",value:2039,display:"$2,039"}, …]`. `rm-build` binds it and
authors `<BarChart data={props.series} title="FY24 revenue" />`: four bars spring up from zero,
staggered; each figure counts up and **rests on `$2,039` … `$2,672` exactly**, tabular-nums; themed to
the concept accent.

### Example 2 — market-share ranking (JTBD-2)
`share.json` (`[{name,share:"42.5%"}, …]`). `parse-series.mjs share.json --label-col=name
--value-col=share --kind=ranking` → sorted desc. `<BarChart data={props.series} highlightIndex={0} />`
— the leader bar uses `accentAlt`; every `%` figure is verbatim.

### Example 3 — signups trend line (JTBD-2 combined)
`signups.csv` (months × counts). `--kind=line` → `<LineChart data={props.series} title="Signups" />`:
the line draws on with `evolvePath`, dots + exact figures fade in as it passes each month; a hero
`Counter` shows the total. y-domain auto-fits; figures exact.

## Troubleshooting
- **A figure looks rounded on screen** → something formatted `display`. Figures must be the verbatim
  input; the components show `display` at rest. Re-check `series.json` and the `props.json` binding.
- **Bars overshoot / clip** → a frame-range `interpolate()` is missing `extrapolate*:"clamp"`, or the
  domain is wrong (use a 0 baseline for bars). 
- **Digits jitter while counting** → missing `tabular-nums` on the figure span.
- **Line distorted / stroke uneven** → don't stretch the SVG; `LineChart` uses a 1:1 frame-pixel
  viewBox on purpose. Keep that.
- **Different AR** → a different orientation is a separate `<Composition>` in `Root.tsx` (handled by
  `rm-build`); the components are AR-responsive via the engine. Don't add a render flag.
- **Chart off-brand** → it reads `useStyleConfig()`; ensure the composition wraps it in the engine
  `StyleProvider`/`FontProvider` (the starter does). Don't hard-code colours.

## Quality criteria
- [ ] `work/series.json` written; every `display` equals the source figure verbatim (no rounding).
- [ ] Right encoding chosen (categorical→bar/ranking, ordered→line, single→counter); ≤ ~8 bars/beat.
- [ ] Bars from a zero baseline; counters use `tabular-nums`; figures rest on the exact input value.
- [ ] Components stay contract-clean (frame-driven, clamped, no `Math.random`/CSS animation, engine
      theme, safe zone) — `tsc --noEmit = 0` after `rm-build` composes them.
- [ ] No render run here; the series + components are handed to `rm-build` → `rm-validate` → `rm-render`.
