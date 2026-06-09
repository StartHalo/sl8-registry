---
name: manim-ce
description: Creates an animated explainer video with Manim Community Edition. Plans a storyboard from a described concept, writes a Manim CE scene, and renders it headless to MP4. Use for any request to animate, visualize, or explain something with video unless the user explicitly asks for ManimGL — math derivations, algorithm walkthroughs, concept explainers, function/data plots, 3D visualizations, title cards.
license: MIT
metadata:
  author: sl8
  category: animation
  tags: manim, manim-ce, animation, video, math, explainer
  inputs:
    - name: concept
      type: text
      required: true
      description: Plain-language description of what to animate or explain
    - name: duration
      type: text
      required: false
      description: Target video length in seconds; bot picks ~20-40s from complexity if absent
    - name: quality
      type: text
      required: false
      description: Render quality low|medium|high; defaults to medium (720p30)
    - name: aspect
      type: text
      required: false
      description: Frame aspect landscape|portrait|square; defaults to landscape (16:9)
    - name: style-notes
      type: text
      required: false
      description: Optional look-and-feel notes (background color, accent color, mood)
  outputs:
    - name: video
      type: video
      path: artifacts/<project>/<project>.mp4
      description: The rendered animation as an H.264 MP4
    - name: scene-source
      type: text
      path: artifacts/<project>/scene.py
      description: The Manim Community Edition scene that produced the video
    - name: summary
      type: markdown
      path: artifacts/<project>/summary.md
      description: Storyboard beats, engine and settings used, and suggested next edits
---

# Manim CE Animation

## Purpose

Turn a described concept into an animated explainer video using **Manim Community
Edition** (`manim`, `from manim import *`). This is the bot's default engine. The
skill plans a storyboard, writes one Manim CE `Scene`, renders it headless to MP4,
verifies the result, and writes a summary.

Use ManimGL (the `manim-gl` skill) **only** when the user explicitly asks for
ManimGL / `manimlib` / the 3Blue1Brown engine. Otherwise, use this skill.

## Workflow

Copy this checklist into your response and check off each step:

```
Manim CE Progress:
- [ ] Step 1: Read the brief, set the project name, apply defaults
- [ ] Step 2: Write the storyboard to work/storyboard.md
- [ ] Step 3: Write the scene to artifacts/<project>/scene.py
- [ ] Step 4: Render headless under xvfb-run
- [ ] Step 5: Verify the MP4, fix-and-retry on error (<=3)
- [ ] Step 6: Write artifacts/<project>/summary.md
```

### Step 1 — Read the brief and set defaults

Extract from the prompt or `bot/user.md`:

| Input | Required | Default if missing |
|---|---|---|
| `concept` | yes | **Stop** — clean error: ask for a concept to animate. Do not invent one. |
| `duration` | no | Pick ~20-40s from concept complexity |
| `quality` | no | `medium` |
| `aspect` | no | `landscape` |
| `style-notes` | no | Dark background (`#1e1e2e`), high-contrast objects |

Set a kebab-case **project name** from the concept (e.g. `binary-search-explainer`).
All deliverables go in `artifacts/<project>/`.

### Step 2 — Storyboard

Before writing any code, write `work/storyboard.md`. In **at least 80 words** specify:

1. **Beats** — the ordered steps of the explanation (one line each).
2. **Objects** — what is on screen during each beat.
3. **Layout** — where objects sit and why (e.g. "axes lower-left, title top-center").
4. **Motion** — the animation that carries each transition (create, transform, move).
5. **Pacing** — rough seconds per beat; they should sum near `duration`.
6. **Styling** — background, palette, aspect.

A scene built from a storyboard is far more faithful than an improvised one.

### Step 3 — Write the scene

Write `artifacts/<project>/scene.py` — one Manim CE `Scene` (or `ThreeDScene` /
`MovingCameraScene`) subclass implementing the storyboard.

Start from a template that fits the storyboard, then adapt it:

- `templates/basic_scene.py` — standard 2D scene.
- `templates/camera_scene.py` — `MovingCameraScene` with zoom/pan.
- `templates/threed_scene.py` — 3D scene with surfaces and camera rotation.

Consult the **rule files** for any API you are unsure about — read the specific file,
do not guess. They are one level deep from this skill:

| Need | Rule file |
|---|---|
| Scene structure, `construct`, scene types | `rules/scenes.md` |
| Objects, `VGroup`, positioning basics | `rules/mobjects.md` |
| Shapes / geometry; lines, arrows, vectors | `rules/shapes.md`, `rules/lines.md` |
| Plain text; LaTeX equations; text animations | `rules/text.md`, `rules/latex.md`, `rules/text-animations.md` |
| Creation anims (`Create`/`Write`/`FadeIn`) | `rules/creation-animations.md` |
| `Transform`/`ReplacementTransform`, morphing | `rules/transform-animations.md` |
| `AnimationGroup`, `LaggedStart`, `Succession` | `rules/animation-groups.md`, `rules/animations.md` |
| `move_to`/`next_to`/`shift`; `arrange`, layout | `rules/positioning.md`, `rules/grouping.md` |
| Colors, gradients; fill/stroke/opacity | `rules/colors.md`, `rules/styling.md` |
| `Axes`/`NumberPlane`; plotting functions | `rules/axes.md`, `rules/graphing.md` |
| 3D scenes, surfaces, camera orientation | `rules/3d.md`, `rules/camera.md` |
| `run_time`, easing, `lag_ratio`; updaters, `ValueTracker` | `rules/timing.md`, `rules/updaters.md` |
| CLI flags and rendering options; config | `rules/cli.md`, `rules/config.md` |

Worked end-to-end examples to pattern-match against: `examples/basic_animations.py`,
`examples/math_visualization.py`, `examples/graph_plotting.py`,
`examples/updater_patterns.py`, `examples/3d_visualization.py`.

**Scene rules:**

- One `Scene` subclass per file. Note its class name — you render it by name.
- Import only `from manim import *`. Never import `manimlib` — that is ManimGL and
  will not work here.
- Keep objects inside the frame. Use `next_to`, `arrange`, `to_edge` for layout; do
  not hard-code coordinates that drift off-screen.
- Use `self.wait(...)` between beats so the viewer can absorb each step.
- For `aspect`, see Step 4 — set it via the render command, not in the scene.

### Step 4 — Render headless

Render from inside `artifacts/<project>/`. There is no display, so wrap every render
in `xvfb-run`. Map `quality` to the flag:

| `quality` | Flag | Resolution |
|---|---|---|
| `low` | `-ql` | 480p15 |
| `medium` (default) | `-qm` | 720p30 |
| `high` | `-qh` | 1080p60 |

```bash
cd artifacts/<project>
xvfb-run -a manim render -qm scene.py SceneName
```

For non-landscape `aspect`, add an explicit resolution (width,height) — Manim derives
aspect from it:

| `aspect` | Add to the command |
|---|---|
| `landscape` (default) | nothing |
| `portrait` | `--resolution 1080,1920` (use `720,1280` for `low`) |
| `square` | `--resolution 1080,1080` (use `720,720` for `low`) |

Manim writes the file under `media/videos/scene/<res>/SceneName.mp4`. Copy it to the
deliverable path:

```bash
cp media/videos/scene/*/SceneName.mp4 <project>.mp4
```

### Step 5 — Verify, and fix-and-retry on error

After rendering:

1. Confirm `artifacts/<project>/<project>.mp4` exists and its size is greater than 0.
2. If `manim` exited with an error: **read the traceback**, identify the cause in
   `scene.py` (consult the relevant `rules/` file), fix it, and re-render.
3. Retry the fix-and-render loop **at most 3 times**. If it still fails, simplify the
   scene to its core beats (drop decorative elements, complex updaters, LaTeX) and
   render that. Record the simplification in `summary.md`.
4. If a `MathTex`/`Tex` expression fails to compile (LaTeX error), replace that one
   label with `Text(...)` and note the substitution in `summary.md`.

Do not report success until the MP4 is verified non-empty.

### Step 6 — Summary

Write `artifacts/<project>/summary.md` (≤ 600 words):

```markdown
# <Project Name> — Animation Summary

**Engine:** Manim Community Edition
**Settings:** quality <quality>, aspect <aspect>, ~<N>s

## Storyboard
1. <beat 1>
2. <beat 2>
...

## Notes
<any defaults applied, LaTeX fallbacks, or scene simplifications>

## Suggested next edits
- <one or more optional refinements the user could ask for>
```

## Outputs

All deliverables in `artifacts/<project>/`:

- `artifacts/<project>/<project>.mp4` — the rendered animation (H.264 MP4).
- `artifacts/<project>/scene.py` — the Manim CE scene source.
- `artifacts/<project>/summary.md` — storyboard, settings, and next-edit suggestions.
- `work/storyboard.md` — the planning artifact (intermediate; not a deliverable).

## Quality Criteria

- [ ] `scene.py` imports `from manim import *`, defines ≥1 `Scene` subclass, no `manimlib` import.
- [ ] `<project>.mp4` exists, is non-empty, and plays the intended animation.
- [ ] The animation depicts every storyboard beat in the right order (faithfulness).
- [ ] No text or equation is clipped at the frame edge or overlapping another object.
- [ ] Each beat is held long enough to read; nothing flashes by (pacing).
- [ ] `summary.md` names the engine, lists the beats, and gives ≥1 suggested next edit.

## Troubleshooting

### `NoSuchDisplayException` / OpenGL display error
Cause: render attempted without a virtual display.
Solution: always prefix the render with `xvfb-run -a`.

### `LaTeX error` / `MathTex` fails to compile
Cause: an invalid or unsupported LaTeX expression.
Solution: fix the LaTeX, or replace that label with `Text(...)`; note it in `summary.md`.

### Output MP4 not found after a successful run
Cause: looking in the wrong place — Manim writes under `media/videos/scene/<res>/`.
Solution: `cp media/videos/scene/*/SceneName.mp4 <project>.mp4` using the actual class name.

## Attribution

The `rules/`, `examples/`, and `templates/` directories are vendored from
`adithya-s-k/manim_skill` (`manimce-best-practices`, MIT). See `NOTICE` and
`LICENSE.txt` in this skill folder.
