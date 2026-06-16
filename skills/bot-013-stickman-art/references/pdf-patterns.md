# PDF Identity-Asset Patterns (Steps 1–6, as reusable templates)

The source technique ("STICKMAN FOR YOUTUBE Prompt Sheet v2", steps 1–6) builds
character identity assets with an image model before any animation. The sheet assumed
a reference-image-capable model (Nano Banana Pro class) — and as of ai-gen v2.1.0 the
proxy **routes exactly that** (`fal-ai/nano-banana-pro`, ≤14 image refs). So the PDF's
original method is restored: the reference image (`source.png`) is the **primary**
identity carrier, passed as `--ref source.png` on the turnaround and every beat; the
"input: previous image" steps mean literally that. The frozen character block + style
stack + seed are reinforcement (they hold the figure if the chain ever falls past
nano-banana-pro, which is ref-blind). The 5-block prompt anatomy (STYLE_STACK ·
character block · scene · DISCIPLINE_BLOCK · negatives) still applies to every
template — these patterns supply the **scene block** and, for grids, an instruction
wrapper.

## Pattern 1 — Source image (PDF step 1)

The canonical "this is the character" asset. The PDF's literal prompt:

> "Generate an image of a handdrawn stickman wearing a cap, on white background. He is
> standing next to a box with the words TASK written on it."

Recast as a scene block (the other 4 blocks wrap it as usual; TEXT_NEGATIVES because
of the label; `text` chain; `square_hd`):

```
He is standing in a simple relaxed pose next to a plain cardboard box with the word
"TASK" hand-written on its side in simple capital letters.
```

Why the box: it gives the figure scale, a grounded contact shadow, and one prop to
verify environment rendering — and the label is the canonical text-rendering test.
If the label garbles twice, drop it (clean box, standard NEGATIVES_BLOCK, `stills`
chain) and record the drop.

## Pattern 2 — Character turnaround (PDF step 2)

The PDF feeds the source image back in ("Show me a character turnaround of this stick
figure...") — and now we do exactly that: generate with `--ref source.png` so the four
views are the same locked figure. The scene block still *describes* the views (the ref
fixes identity, the prompt fixes layout):

```
A character turnaround sheet: the same figure drawn four times in a row on a white
background — front view, three-quarter view, profile view, and back view, evenly
spaced, identical proportions and cap in every view.
```

Use TURNAROUND_NEGATIVES (the standard "no duplicate figures" would fight the sheet).
Same seed as the source. `landscape_16_9` so four views fit without shrinking the
figure. Accept ≥3 clearly distinct views — models sometimes merge profile and
three-quarter; that passes if the views shown are consistent with each other.

## Pattern 3 — 3×3 storyboard grid with a global-constraints block (PDF step 3)

The PDF's densest pattern: one generation producing a 9-panel storyboard governed by
an `<INSTRUCTION>` wrapper. Useful as a cheap episode *previz* (one image ≈ nine
compositions) or as donor-frame material if a reference-to-video model (Seedance
class) ever routes. **Not part of the default phase chain** — beat stills are
generated individually (Pattern 5) because per-panel quality in grids is too low to
animate from.

```
<INSTRUCTION>
Global Constraints:
- Medium: hand-drawn pencil sketch, visible graphite grain, subtle smudging, light
  cross-hatching, varied line weight, plain white paper background.
- Character: <frozen character block VERBATIM>
- Environments: realistic furniture and objects with believable structure, weight,
  and light pencil shading.
- Perspective: believable interior depth, consistent proportions, grounded objects
  with contact shadows.
- Tone: ordinary daily routine, observational, restrained, neutral.
- Layout: a 3x3 evenly spaced grid of nine panels, consistent lighting direction and
  character scale across all panels.

Panels:
1. <one-line action>
2. <one-line action>
...
9. <one-line action>

Overall Instruction: the figure stays extremely minimal while the world stays
believable; communicate narrative through posture and spatial composition alone.
</INSTRUCTION>
```

Note: nano-banana-pro carries grid prompts cleanly (no length cap concern now that
recraft has left the chain). Pass `--ref source.png` so the panels share the locked
figure.

## Pattern 4 — 2×2 grid micro-storyboard (PDF step 5)

Same idea, four panels, for a single beat that needs a tiny progression (e.g. a
clock-pressure beat). The PDF's example:

> "A 2x2 storyboard of a stickman with a cap standing by a box with TASK written on
> it. He looks at the wall clock behind him showing 9am. He's very stressed out."

Recast scene block (wrapped in the 5 blocks as usual):

```
A 2x2 storyboard grid, four evenly spaced panels, consistent lighting and character
scale. Panel 1: <action>. Panel 2: <action>. Panel 3: <action>. Panel 4: <action>.
```

Same caveat as Pattern 3: previz / donor material only — phase 4's single-shot i2v
models animate ONE still per beat, not a grid.

## Pattern 5 — Individual scene stills (PDF step 4) — THE phase-3 workhorse

The PDF's "Show me this stickman [doing this thing]" with the source/turnaround as
input is now literal: pass `--ref source.png` + frozen blocks verbatim + a scene block
authored to this discipline. The ref locks identity; the prompt directs the action:

- **One action**, stated as a posture the body can hold ("mops the floor with both
  hands on the handle, leaning forward"), not an abstraction ("is busy").
- **Close or medium framing**, figure prominent — wide shots shrink the figure and
  break stick anatomy.
- **Environment with structure**: name 2–3 concrete objects with spatial relations
  ("a fabric couch facing a TV on a low media stand across the room"), so the
  DISCIPLINE_BLOCK has something to render realistically.
- **Emotion through posture**, named physically ("shoulders slumped", "leaning back,
  arms crossed") — never facial expressions (the face is two dots and a curve).
- No text in the scene (labels route to the `text` chain as their own decision).

## Pattern 6 — Collage donor frame (PDF step 6) — available as an upgrade

The PDF assembles several stills on one 16:9 canvas and uses the screenshot as a video
model's input image ("donor shot" for `[CUT]`-style multi-shot prompts). That trick
needs a reference-to-video / multi-shot model (Seedance class) — and v2.1.0 **routes
it**: `bytedance/seedance-2.0/reference-to-video` accepts ≤9 image refs with
`@Image1`-style addressing. The **shipped default is per-beat i2v** (one still →
`bytedance/seedance-2.0/fast/image-to-video` → one clip; see bot-013-clip-assembly),
which is simpler and cheaper. Reference-to-video multishot is the documented upgrade:
when it's wanted, the art side feeds source.png + the per-beat stills as refs and the
clip side issues one multishot call. Kept here so the upgrade costs a dialect, not a
redesign.
