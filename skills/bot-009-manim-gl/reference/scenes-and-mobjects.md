# Scenes and Mobjects

This document covers ManimGL (the OpenGL-based 3Blue1Brown engine), not Manim CE.

## Contents

- [Scene classes](#scene-classes)
- [The construct method](#the-construct-method)
- [Adding versus playing](#adding-versus-playing)
- [Mobjects](#mobjects)
- [Positioning](#positioning)
- [Styling](#styling)

## Scene classes

A ManimGL animation is a Python class that subclasses a scene type. The bot uses
two of them.

`Scene` is the plain base class. It is enough for any animation that does not need
the interactive helpers.

```python
from manimlib import *

class TitleCard(Scene):
    def construct(self):
        self.play(Write(Text("Hello")))
        self.wait()
```

`InteractiveScene` adds the machinery behind ManimGL's interactive shell. Because the
bot always renders headless, the interactive features go unused — but `InteractiveScene`
is still a perfectly good base class and is fine to pick for 2D or 3D work. Choose
whichever reads more clearly; both render identically through `manimgl ... -w`.

```python
class ConceptScene(InteractiveScene):
    def construct(self):
        ...
```

There is no separate `ThreeDScene` requirement in ManimGL — any scene can hold 3D
mobjects, and the camera is reoriented through `self.frame` (see
`camera-and-3d.md`).

## The construct method

Every scene defines a `construct(self)` method. ManimGL calls it to build the
animation top to bottom. A reliable shape for `construct` is: create mobjects,
position them, animate them, and wait between beats.

```python
class FlowExample(InteractiveScene):
    def construct(self):
        # 1. Create
        title = Text("Cell Division")
        cell = Circle(radius=1.2)

        # 2. Position
        title.to_edge(UP)
        cell.move_to(ORIGIN)

        # 3. Animate
        self.play(Write(title))
        self.play(ShowCreation(cell))

        # 4. Hold so the viewer can read it
        self.wait(1.5)
```

## Adding versus playing

`self.add(*mobjects)` places mobjects on screen instantly, with no animation. Use it
for backgrounds and for anything that should already be present when the first
animation runs.

`self.play(*animations)` runs one or more animations over time. `self.wait(seconds)`
holds the current frame.

```python
self.add(background)                 # appears instantly
self.play(FadeIn(label))             # animates in
self.wait(2)                         # holds for 2 seconds
self.remove(label)                   # removes instantly
```

## Mobjects

A *mobject* (mathematical object) is anything drawable. Common ones:

- Shapes: `Circle`, `Square`, `Rectangle`, `Dot`, `Line`, `Arrow`, `Polygon`,
  `Annulus`, `RegularPolygon`.
- Text: `Text` for plain text, `Tex` for LaTeX (see `tex-and-text.md`).
- Containers: `Group` for any mobjects, `VGroup` for vector mobjects. A group can be
  positioned, scaled, and animated as a single unit.

```python
shapes = VGroup(
    Circle(color=BLUE),
    Square(color=GREEN),
    Triangle(color=YELLOW),
)
shapes.arrange(RIGHT, buff=0.6)   # lay them in a row
self.play(ShowCreation(shapes))
```

Most constructors accept `color`, `fill_opacity`, `stroke_width`, and a size argument
such as `radius` or `side_length`.

## Positioning

Position mobjects relatively rather than with hard-coded coordinates, so the layout
survives changes to size and aspect.

| Method | Effect |
|---|---|
| `mob.move_to(point)` | Center the mobject at a point or another mobject |
| `mob.shift(vector)` | Translate by a vector, e.g. `mob.shift(LEFT * 2)` |
| `mob.next_to(other, direction, buff=…)` | Place adjacent to another mobject |
| `mob.to_edge(direction)` | Push to a frame edge (`UP`, `DOWN`, `LEFT`, `RIGHT`) |
| `mob.to_corner(direction)` | Push to a corner, e.g. `UP + RIGHT` |
| `group.arrange(direction, buff=…)` | Distribute a group's children along an axis |

Direction constants (`UP`, `DOWN`, `LEFT`, `RIGHT`, `ORIGIN`) are unit vectors that
can be scaled and added: `UP * 2`, `UP + RIGHT`.

```python
caption = Text("Step 1")
caption.next_to(diagram, DOWN, buff=0.4)
```

## Styling

Styling controls fill and stroke independently.

```python
hexagon = RegularPolygon(6)
hexagon.set_fill(BLUE_D, opacity=0.7)     # interior color and opacity
hexagon.set_stroke(WHITE, width=3)        # outline color and thickness
hexagon.set_color(TEAL)                   # set fill and stroke together
```

ManimGL ships named colors such as `BLUE`, `RED`, `GREEN`, `YELLOW`, `WHITE`,
`GREY`, plus shaded variants like `BLUE_E` and `BLUE_A`. Any hex string also works:
`set_color("#1e1e2e")`.

For text drawn over a busy or colored background, add a *backstroke* — a soft outline
behind the glyphs that keeps them legible:

```python
label = Text("Legible over anything")
label.set_backstroke(BLACK, width=5)
```

Backstroke is especially useful in 3D scenes where labels sit in front of surfaces.
See `tex-and-text.md` for more on text legibility.
