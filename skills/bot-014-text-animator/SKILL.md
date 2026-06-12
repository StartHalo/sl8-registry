---
name: bot-014-text-animator
description: Render a structured MessageDoc as a short animated-TEXT VIDEO with Remotion — the Kinetic Text renderer. Nine styles (Headline Highlight, Breaking News, Kinetic Typography, Minimal Editorial, Box Reveal, Giant Word, Perspective 3D, Pixel Reveal, Blur Carousel) at one or more aspect ratios (16:9, 9:16, 1:1); every style progresses through the whole message and carries an optional mood-based background score. Use this AFTER bot-014-script-builder has written the message doc. Also use to RESTYLE / RESIZE / RE-SCORE an existing project without re-extracting the message. Bundles a complete, pre-built Remotion project; you only choose the style, write props.json, and render — you never hand-write React.
metadata:
  author: sl8
  version: 1.1.1
  references-skills: [bot-014-script-builder]
  inputs:
    - name: messagedoc
      type: json
      required: true
      description: artifacts/<project-name>/newsdoc.json — the structured MessageDoc written by bot-014-script-builder.
    - name: style
      type: text
      required: false
      description: headline-highlight | breaking-news | kinetic-typography | minimal-editorial | box-reveal | giant-word | perspective-3d | pixel-reveal | blur-carousel. Default = the doc's recommended_style, else minimal-editorial.
    - name: aspect-ratios
      type: text
      required: false
      description: Any of 16:9, 9:16, 1:1 (space/comma separated). Default = onboarding default, else 9:16.
    - name: duration-seconds
      type: text
      required: false
      description: Seconds (8-15) as a number. Default 12.
    - name: mood
      type: text
      required: false
      description: calm | dramatic | upbeat | tech — the background-score bed. Default = derived from the chosen style and the message tone.
    - name: music
      type: text
      required: false
      description: on or off — whether to include the background score. Default on.
    - name: font-pack
      type: text
      required: false
      description: modern | editorial | bold | tech — the typography pairing (body + display + condensed). Default = brand font pack from context.md, else modern.
    - name: brand
      type: json
      required: false
      description: Brand kit — accent color (hex) plus optional accentAlt (secondary hex), a short label, and fontPack. Default from context.md, else a neutral accent + the modern font pack.
  outputs:
    - name: storyboard
      type: markdown
      path: artifacts/<project-name>/02-storyboard.md
      description: Scenes + frame ranges + on-screen text + style/AR/defaults used.
    - name: videos
      type: video
      path: artifacts/<project-name>/exports/<style>-<ar>.mp4
      description: One rendered MP4 per requested aspect ratio.
    - name: project
      type: x-dir
      path: artifacts/<project-name>/video/
      description: The reproducible Remotion project (bundled template + props.json).
---

# Kinetic Text — MessageDoc → styled animated-text MP4

Render a faithful animated-text video from a `newsdoc.json` (the structured **MessageDoc** — any short message: announcement, product update, quote, stat, or headline). The hard work (the **nine** styles, the shared engine + scene-sequencer, the background score, multi-aspect-ratio rendering) is **already built** in the bundled Remotion project under this skill's `scripts/remotion-template/`. Your job is to **choose the parameters, write `props.json`, and render** — never to write React. The components draw only what the MessageDoc contains, and every style **progresses through the whole message** (headline → beats → stat → quote → credit).

## Parameters & defaults (the dials the developer controls)

Every render is fully specified by these props. **Each is optional except the doc** — when the developer doesn't set one, the listed default is used. **Always resolve all of them, write them into `props.json`, and state the resolved values back to the user** (in `02-storyboard.md` and your reply) so the developer knows exactly what was used and what to change.

| prop (props.json) | values | default when unset | source of a non-default |
|---|---|---|---|
| `style` | one of the 9 ids (`references/styles.md`) | the doc's `recommended_style`, else `minimal-editorial` | explicit user choice |
| aspect ratios | any of `16:9` `9:16` `1:1` (→ `16x9`/`9x16`/`1x1`) | onboarding default, else `9:16` | explicit user choice / platform |
| `durationSeconds` | 8–15 | `12` | explicit user choice |
| **`brand.accent`** | hex color, e.g. `#6D5EF6` | a neutral accent (`#C8102E`) | `context.md` brand kit, or user |
| `brand.accentAlt` | hex color (secondary) | derived from accent | `context.md`, or user |
| `brand.label` | short text (a source/brand chip) | none | `context.md`, or user |
| **`fontPack`** | `modern` · `editorial` · `bold` · `tech` | `modern` | `context.md` brand kit, or user |
| `mood` | `calm` · `dramatic` · `upbeat` · `tech` | derived from style + message tone | user / `recommended_mood` |
| `music` | `true` / `false` | `true` | user (`false` = silent) |

**Color and fonts are first-class brand inputs.** Read them from `context.md` (the brand kit: `accent`, `accentAlt`, `label`, `fontPack`) when present; otherwise apply the defaults above and SAY SO. Font packs (full list in `references/styles.md`): **modern** (Inter + Fraunces serif + Oswald — premium default), **editorial** (Manrope + Playfair Display — refined magazine), **bold** (Inter + Anton + Bebas Neue — high-impact), **tech** (Space Grotesk + DM Serif — modern).

> Runtime references: `references/styles.md` (what each style looks like + which NewsDoc fields it uses), `references/rendering.md` (the bundled project + render/verify + Chrome-deps troubleshooting), `references/legibility.md` (safe zones / min sizes / pacing). `$SKILL` below = this skill's directory (e.g. `~/.claude/skills/bot-014-text-animator`).

## When to use
- **Render** (phase 2): right after `bot-014-script-builder` wrote `newsdoc.json`.
- **Restyle / resize** (JTBD-3): a follow-up like "now the breaking-news version" or "give me a 1:1 cut" — re-render from the SAME `newsdoc.json` (do NOT re-extract; facts must not change).

## Workflow

### 1. Load + choose (resolve EVERY parameter, then state them)
- Read `artifacts/<project-name>/newsdoc.json`. If missing/invalid, run `bot-014-script-builder` first.
- **style**: explicit user choice → else `newsdoc.recommended_style` → else `minimal-editorial`. (`references/styles.md`.)
- **aspect_ratios**: explicit → else the onboarding/context default → else `9:16`. Map names → ids: `16:9→16x9`, `9:16→9x16`, `1:1→1x1`.
- **duration_seconds**: explicit → else 12 (clamp 8–15).
- **brand kit (color + fonts)**: read from `context.md` — `accent` (hex), optional `accentAlt`, `label`, and `fontPack`. Missing pieces fall back to the defaults in **Parameters & defaults** (neutral accent `#C8102E`, `fontPack: modern`). If the developer named a color/font in THIS request, that wins.
- **fontPack**: explicit → else `context.md` brand fontPack → else `modern`. One of `modern | editorial | bold | tech` (`references/styles.md`).
- **mood / music**: mood = explicit → `recommended_mood` → derived; music on unless the user asked for silent.
- Per the **Parameters & defaults** table, resolve ALL of these BEFORE rendering and record each (value + whether it was chosen or defaulted) so you can report them.

### 2. Storyboard FIRST (design before render)
Write `artifacts/<project-name>/02-storyboard.md` — this is the "think before you render" step. Using the pacing rule (`references/legibility.md`: per-beat seconds ≈ max(0.8, words/2.5); ~3–4 beats per 5s), describe the scene plan for the chosen style: each beat/scene with its frame range and the exact on-screen text (pulled from the NewsDoc), the palette/type choices, the aspect ratio(s), and which defaults you applied. This is graded — keep it concrete.

### 3. Scaffold the project
```bash
mkdir -p artifacts/<project-name>/exports
rm -rf artifacts/<project-name>/video
cp -r "$SKILL/scripts/remotion-template" artifacts/<project-name>/video
```

### 4. Write props.json (the only file you author)
Write `artifacts/<project-name>/video/props.json` — the whole NewsDoc plus the render choices. The engine's `normalizeDoc` accepts the rich NewsDoc as-is, so paste it under `doc`:
```json
{
  "style": "breaking-news",
  "durationSeconds": 12,
  "seed": 1,
  "music": true,
  "mood": "dramatic",
  "fontPack": "modern",
  "brand": { "accent": "#C8102E", "accentAlt": "#0B1F3A", "label": "ACME" },
  "doc": { ...the exact contents of newsdoc.json... }
}
```
Keep `seed` fixed (1) so renders are reproducible. `style` MUST be one of the **nine** ids (see `references/styles.md`). `music` defaults to `true`; omit `mood` to let the engine pick a bed from the style + tone, or set it to `calm` / `dramatic` / `upbeat` / `tech`. The score is generated in-project by `make-scores.mjs` (run automatically by `render.sh`) and muxed into the MP4.

### 5. Render
```bash
cd artifacts/<project-name>/video
bash "$SKILL/scripts/render.sh" "16x9 9x16 1x1" ../exports     # list only the ARs you chose
```
`render.sh` installs Remotion (version-aligned), ensures the Chrome Headless Shell (one-time ~300–400 MB), renders `News-<ar>` per AR with your `props.json`, and writes `exports/<style>-<ar>.mp4`. First render of a fresh sandbox is the slow one. If it fails, see `references/rendering.md` (almost always Chrome-deps or a version skew).

### 6. Verify (structural + VISION + AUDIO)
- **Structural:** each `exports/<style>-<ar>.mp4` exists and is non-empty; if `ffprobe` is present, confirm dimensions (16x9=1920×1080, 9x16=1080×1920, 1x1=1080×1080) and a non-zero duration.
- **Audio:** unless `music:false`, confirm the MP4 carries an audio stream (`ffprobe -select_streams a:0`). The score is muxed automatically by `render.sh` (via `make-scores.mjs`).
- **Vision (the real gate):** **Read** one of the rendered MP4s (or a sampled frame) and judge the pixels yourself — confirm the headline + key facts are present and legible, text is inside the safe zone (no clipping/overlap), the chosen **font pack** is applied, and the style is recognizably the chosen one (e.g. breaking-news shows a lower-third + ticker; headline-highlight shows the marker sweeping behind the key phrases). Never judge from the filename or file size. If it looks wrong, diagnose (prompt/data vs component) and fix `props.json` or re-render; only escalate to a component change if the NewsDoc + props are correct.

### 7. Summarize + advance (state the parameters used)
Append a short summary to `02-storyboard.md` AND tell the user the **resolved parameters** — style, aspect ratio(s), duration, **brand color (accent), font pack**, mood, music — and note which were the developer's choices vs defaults (e.g. "used your brand accent #6D5EF6 + the `editorial` font pack; mood `upbeat` derived from the message; defaulted duration 12s"). This makes it obvious what to tweak. Mark `state.md` phase 2 done, and remember.

## Restyle / resize (JTBD-3)
Read the EXISTING `newsdoc.json` (unchanged), set the new `style`/`aspect_ratios`/`brand`, re-run steps 3–6 (the new `exports/<new-style>-<ar>.mp4` sit beside the old ones — distinct filenames, nothing overwritten), and append a dated revision note to `02-storyboard.md`. **Never alter NewsDoc facts on a restyle** — if the user asks to change a fact, that's a re-structure (run `bot-014-script-builder`), not a restyle.

## Outputs
- `artifacts/<project-name>/02-storyboard.md` — scene plan + frame ranges + on-screen text + defaults.
- `artifacts/<project-name>/exports/<style>-<ar>.mp4` — one MP4 per requested aspect ratio.
- `artifacts/<project-name>/video/` — the reproducible Remotion project (template + props.json).

## Quality criteria
- [ ] One non-empty MP4 per requested AR, correct dimensions, duration within ±15% of target.
- [ ] Vision check: faithful to the NewsDoc, legible, recognizably the chosen style.
- [ ] `02-storyboard.md` lists beats with frame ranges + on-screen text + the defaults used.
- [ ] Restyle adds new exports without overwriting prior ones; `newsdoc.json` unchanged.
