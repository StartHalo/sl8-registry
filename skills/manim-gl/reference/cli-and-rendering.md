# CLI and Rendering

This document covers ManimGL (the OpenGL-based 3Blue1Brown engine), not Manim CE.

## Contents

- [The manimgl command](#the-manimgl-command)
- [Headless rendering with xvfb-run](#headless-rendering-with-xvfb-run)
- [Writing the video to file](#writing-the-video-to-file)
- [Quality flags](#quality-flags)
- [Output path and filename](#output-path-and-filename)
- [Aspect and resolution](#aspect-and-resolution)
- [Interactive mode is not used](#interactive-mode-is-not-used)

## The manimgl command

ManimGL renders with the `manimgl` command. The basic form names a Python file and a
scene class inside it:

```bash
manimgl scene.py SceneName
```

If a file contains exactly one scene, the class name can be omitted. The bot always
names the class explicitly so the render is unambiguous.

## Headless rendering with xvfb-run

ManimGL draws through OpenGL and expects a real display. The bot runs in a headless
sandbox with no screen, so **every** render must be wrapped in `xvfb-run -a`, which
provides a virtual framebuffer for OpenGL to draw into. The `-a` flag picks a free
display number automatically.

```bash
xvfb-run -a manimgl scene.py SceneName -w
```

Skipping `xvfb-run` produces an error such as a GLFW or `NoSuchDisplayException`
failure. There are no exceptions: low-quality test renders and final renders alike go
through `xvfb-run`.

## Writing the video to file

By default `manimgl` opens an interactive preview window. The `-w` flag instead
**writes the animation to a video file** and exits — this is the mode the bot uses.

```bash
xvfb-run -a manimgl scene.py SceneName -w
```

## Quality flags

Quality flags set the resolution and frame rate. Map the skill's `quality` input as
follows:

| `quality` input | Flag | Resolution / FPS |
|---|---|---|
| `low` | `-l` | 480p, 15 fps |
| `medium` (default) | `-m` | 720p, 30 fps |
| `high` | none, or `--hd` | 1080p, 30-60 fps |

```bash
xvfb-run -a manimgl scene.py SceneName -w -m      # medium
xvfb-run -a manimgl scene.py SceneName -w -l      # low, fast test render
xvfb-run -a manimgl scene.py SceneName -w         # high (default resolution)
```

Use `-l` for a fast first render while debugging, then re-render at the requested
quality once the scene is correct.

## Output path and filename

ManimGL writes the rendered MP4 into a `videos/` directory and names the file after
the scene class. After a successful render, copy that file to the deliverable path
named after the project:

```bash
cp videos/SceneName.mp4 <project>.mp4
```

If the file is not where expected, locate it first:

```bash
find . -name 'SceneName.mp4'
```

Two flags give explicit control over the destination:

- `--video_dir .` pins the output directory to the current folder.
- `-o NAME` sets the output filename.

```bash
xvfb-run -a manimgl scene.py SceneName -w --video_dir . -o SceneName.mp4
cp SceneName.mp4 <project>.mp4
```

Always verify the final `artifacts/<project>/<project>.mp4` exists and is non-empty
before reporting success.

## Aspect and resolution

The default frame is 16:9 landscape. For other aspect ratios, pass an explicit
resolution with `--resolution WIDTH,HEIGHT`; ManimGL derives the aspect from it.

| `aspect` input | Flag to add | Note |
|---|---|---|
| `landscape` (default) | nothing | 16:9 |
| `portrait` | `--resolution 1080,1920` | use `720,1280` for `low` quality |
| `square` | `--resolution 1080,1080` | use `720,720` for `low` quality |

```bash
# Portrait, medium quality
xvfb-run -a manimgl scene.py SceneName -w -m --resolution 1080,1920
```

## Interactive mode is not used

ManimGL is known for an interactive workflow — the `-se` (skip-and-embed) flag, the
`--embed` flag, `self.embed()` calls inside `construct`, and `checkpoint_paste()` in
the IPython shell. **The bot never uses any of these.** It runs headless and
non-interactively: the whole animation is built declaratively in `construct()` and
rendered with `-w` under `xvfb-run`. Do not add `self.embed()` to a scene and do not
pass `-se` or `--embed` to `manimgl`.
