---
name: bot-009-manim-gl
description: Creates an animated explainer video with ManimGL, the OpenGL-based 3Blue1Brown engine (manimlib import, manimgl CLI). Plans a storyboard from a described concept, writes a ManimGL scene, and renders it headless to MP4. Use this skill ONLY when the user explicitly asks for ManimGL, manimgl, manimlib, the 3Blue1Brown engine, or 3b1b — for any other animation request the bot-009-manim-ce skill is the default. Covers math derivations, algorithm walkthroughs, concept explainers, function and data plots, 3D camera scenes, and title cards rendered through the ManimGL pipeline.
metadata:
  author: sl8
  version: 1.0.0
  bot: BOT-009
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
      description: The ManimGL scene that produced the video
    - name: summary
      type: markdown
      path: artifacts/<project>/summary.md
      description: Storyboard beats, engine and settings used, and suggested next edits
---

# ManimGL Animation

## Purpose

Turn a described concept into an animated explainer video using **ManimGL** — the
OpenGL-based engine Grant Sanderson built for 3Blue1Brown (`manimgl` CLI,
`from manimlib import *`). The skill plans a storyboard, writes one ManimGL `Scene`,
renders it headless to MP4, verifies the result, and writes a summary.

ManimGL is **not** the bot's default engine. Use this skill **only** when the user
explicitly asks for ManimGL / `manimgl` / `manimlib` / the 3Blue1Brown engine / 3b1b.
For every other animation request, use the `bot-009-manim-ce` skill (Manim Community
Edition). The two engines have different imports, class names, and CLIs — they are not
interchangeable, so do not mix their APIs in one scene.

## Workflow

Copy this checklist into your response and check off each step:

```
ManimGL Progress:
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

Set a kebab-case **project name** from the concept (e.g. `fourier-series-explainer`).
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

Write `artifacts/<project>/scene.py` — one ManimGL `Scene` or `InteractiveScene`
subclass implementing the storyboard.

Consult this skill's **reference docs** for any API you are unsure about — read the
specific file, do not guess. They are one level deep from this skill:

| Need | Reference file |
|---|---|
| Scene structure, `construct`, mobjects, positioning, styling | `reference/scenes-and-mobjects.md` |
| `ShowCreation`/`Write`/`FadeIn`, `Transform`, groups, `.animate`, timing | `reference/animations.md` |
| `Text`, `Tex(R"...")`, `t2c` coloring, `TransformMatchingTex`, backstroke | `reference/tex-and-text.md` |
| `self.frame`, `reorient`, `fix_in_frame`, 3D mobjects, lighting | `reference/camera-and-3d.md` |
| `manimgl` CLI, headless `xvfb-run`, quality, output paths, resolution | `reference/cli-and-rendering.md` |

Worked end-to-end examples to pattern-match against:

| Example | Demonstrates |
|---|---|
| `examples/shapes_and_text.py` | Shapes, text, a transform, and a lagged reveal |
| `examples/equation_walkthrough.py` | A LaTeX equation introduced and morphed with `t2c` coloring |
| `examples/function_plot.py` | `Axes`, a plotted graph, and a dot tracing the curve |
| `examples/camera_3d.py` | A 3D surface with an animated `self.frame.reorient` camera move |

**Scene rules:**

- One scene subclass per file. Note its class name — you render it by name.
- Import only `from manimlib import *`. Never import `manim` — that is Manim
  Community Edition and will not work with the `manimgl` CLI.
- Use ManimGL idioms, not CE idioms: `ShowCreation` (not `Create`), `Tex(R"...")`
  with a capital-R raw string (not `MathTex`), `self.frame` (not `self.camera.frame`),
  and `mob.fix_in_frame()` on the mobject (not a scene method).
- Keep objects inside the frame. Use `next_to`, `arrange`, `to_edge` for layout; do
  not hard-code coordinates that drift off-screen.
- Use `self.wait(...)` between beats so the viewer can absorb each step.
- **Do not use interactive mode.** The bot runs headless: never call `self.embed()`
  or `checkpoint_paste()`, and never render with the `-se` / `--embed` flags. Build
  the whole animation declaratively inside `construct()`.
- For `aspect`, see Step 4 — set it via the render command, not in the scene.

### Step 4 — Render headless

Render from inside `artifacts/<project>/`. ManimGL is OpenGL-only and needs a display,
so **every** render must be wrapped in `xvfb-run -a` (a virtual framebuffer). The `-w`
flag writes the video to file without opening a preview window. Map `quality` to the
flag:

| `quality` | Flag | Resolution / FPS |
|---|---|---|
| `low` | `-l` | 480p, 15 fps |
| `medium` (default) | `-m` | 720p, 30 fps |
| `high` | (no flag) / `--hd` | 1080p, 30-60 fps |

```bash
cd artifacts/<project>
xvfb-run -a manimgl scene.py SceneName -w -m
```

For non-landscape `aspect`, pass an explicit resolution — ManimGL derives the aspect
ratio from `--resolution WIDTH,HEIGHT`:

| `aspect` | Add to the command |
|---|---|
| `landscape` (default) | nothing |
| `portrait` | `--resolution 1080,1920` (use `720,1280` for `low`) |
| `square` | `--resolution 1080,1080` (use `720,720` for `low`) |

ManimGL writes the file into a `videos/` directory under the current folder. Copy the
result to the deliverable path with the project name:

```bash
cp videos/SceneName.mp4 <project>.mp4
```

If the layout differs, locate the MP4 first: `find . -name 'SceneName.mp4'`. You can
also force the location with `--video_dir .` and `-o` — see
`reference/cli-and-rendering.md`.

### Step 5 — Verify, and fix-and-retry on error

After rendering:

1. Confirm `artifacts/<project>/<project>.mp4` exists and its size is greater than 0.
2. If `manimgl` exited with an error: **read the traceback**, identify the cause in
   `scene.py` (consult the relevant `reference/` file), fix it, and re-render.
3. Retry the fix-and-render loop **at most 3 times**. If it still fails, simplify the
   scene to its core beats (drop decorative elements, updaters, complex LaTeX) and
   render that. Record the simplification in `summary.md`.
4. If a `Tex` expression fails to compile (LaTeX error), replace that one label with
   `Text(...)` and note the substitution in `summary.md`.

Do not report success until the MP4 is verified non-empty.

### Step 6 — Summary

Write `artifacts/<project>/summary.md` (≤ 600 words):

```markdown
# <Project Name> — Animation Summary

**Engine:** ManimGL (3Blue1Brown / manimlib)
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
- `artifacts/<project>/scene.py` — the ManimGL scene source.
- `artifacts/<project>/summary.md` — storyboard, settings, and next-edit suggestions.
- `work/storyboard.md` — the planning artifact (intermediate; not a deliverable).

## Quality Criteria

- [ ] `scene.py` imports `from manimlib import *`, defines ≥1 `Scene`/`InteractiveScene` subclass, no `manim` import.
- [ ] The scene uses ManimGL idioms: `ShowCreation`, `Tex(R"...")`, `self.frame`, `fix_in_frame()`.
- [ ] No `self.embed()`, `checkpoint_paste()`, or `-se`/`--embed` interactive usage anywhere.
- [ ] `<project>.mp4` exists, is non-empty, and plays the intended animation.
- [ ] The animation depicts every storyboard beat in the right order (faithfulness).
- [ ] No text or equation is clipped at the frame edge or overlapping another object.
- [ ] Each beat is held long enough to read; nothing flashes by (pacing).
- [ ] `summary.md` names the engine, lists the beats, and gives ≥1 suggested next edit.

## Troubleshooting

### `NoSuchDisplayException` / OpenGL / GLFW context error
Cause: ManimGL tried to open an OpenGL window with no display attached.
Solution: always prefix the render with `xvfb-run -a`.

### `NameError: name 'Create' is not defined`
Cause: a Manim CE idiom slipped into a ManimGL scene.
Solution: use `ShowCreation` instead of `Create`, `Tex` instead of `MathTex`, and
`self.frame` instead of `self.camera.frame`. See `reference/animations.md`.

### `Latex error` / `Tex` fails to compile
Cause: an invalid or unsupported LaTeX expression.
Solution: fix the LaTeX, or replace that label with `Text(...)`; note it in
`summary.md`. Confirm the string uses a capital-R raw string: `Tex(R"...")`.

### Output MP4 not found after a successful run
Cause: looking in the wrong place — ManimGL writes under a `videos/` directory.
Solution: `find . -name 'SceneName.mp4'`, then copy it to `<project>.mp4`. Use
`--video_dir .` to pin the output folder. See `reference/cli-and-rendering.md`.
