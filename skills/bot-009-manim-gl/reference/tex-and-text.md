# Tex and Text

This document covers ManimGL (the OpenGL-based 3Blue1Brown engine), not Manim CE.

## Contents

- [Plain text with Text](#plain-text-with-text)
- [LaTeX with Tex](#latex-with-tex)
- [The raw-string convention](#the-raw-string-convention)
- [Coloring expressions with t2c](#coloring-expressions-with-t2c)
- [Morphing equations with TransformMatchingTex](#morphing-equations-with-transformmatchingtex)
- [Backstroke for legibility](#backstroke-for-legibility)

## Plain text with Text

`Text` renders ordinary, non-mathematical strings. It is the right choice for titles,
captions, and labels with no math.

```python
title = Text("How Sorting Works")
title.set_color(WHITE)

caption = Text("A quick visual tour", font="Helvetica", font_size=32)
```

Useful constructor arguments: `font` (a font installed on the system), `font_size`,
`color`, and `weight` (e.g. `BOLD`). Position `Text` mobjects with `to_edge`,
`next_to`, and friends, exactly like any other mobject.

## LaTeX with Tex

`Tex` renders LaTeX. **ManimGL uses `Tex` — not `MathTex`, which belongs to Manim CE.**
The string is treated as math mode, so symbols, fractions, and operators all work
without surrounding `$` signs.

```python
identity = Tex(R"e^{i\pi} + 1 = 0")
integral = Tex(R"\int_0^1 x^2 \, dx = \frac{1}{3}")
```

For a string mixing prose and inline math, use `TexText`, which treats the input as
text mode with `$...$` for math:

```python
sentence = TexText(R"The area of a circle is $\pi r^2$.")
```

`Tex` accepts `font_size` and `color`, and you can `scale()` the result after
construction.

## The raw-string convention

Always pass LaTeX as a **capital-R raw string** — `Tex(R"...")`. LaTeX is full of
backslashes (`\frac`, `\sum`, `\pi`); a raw string stops Python from interpreting
them as escape sequences, so the LaTeX reaches the renderer intact.

```python
Tex(R"\frac{\partial f}{\partial x}")   # correct
Tex("\\frac{\\partial f}{\\partial x}") # works but harder to read
Tex("\frac{f}{x}")                      # WRONG: \f is a Python escape
```

The capital `R` is the project-wide convention; lowercase `r` behaves identically but
keep `R` for consistency with the example scenes.

## Coloring expressions with t2c

The `t2c` argument (tex-to-color map) recolors specific substrings of an equation.
Each key is a piece of LaTeX; each value is a color. This makes the meaning of an
equation visible — color a variable once and the eye tracks it everywhere.

```python
equation = Tex(
    R"F = m a",
    t2c={"F": BLUE, "m": YELLOW, "a": RED},
)

kinetic = Tex(
    R"E_k = \frac{1}{2} m v^2",
    t2c={"E_k": GREEN, "m": YELLOW, "v": RED},
)
```

Keys can be multi-character or themselves contain LaTeX (e.g. `R"\vec{v}"`). To color
a part after construction, you can also break the equation into isolated pieces and
index into them, but `t2c` covers most cases cleanly.

## Morphing equations with TransformMatchingTex

`TransformMatchingTex` animates from one `Tex` to another, matching identical
sub-expressions so shared symbols slide to their new positions instead of fading. It
is the standard tool for showing a derivation step.

```python
step1 = Tex(R"a^2 + 2ab + b^2")
step2 = Tex(R"(a + b)^2")
step2.move_to(step1)

self.play(Write(step1))
self.wait()
self.play(TransformMatchingTex(step1, step2))
```

Keep a consistent `t2c` map across the steps so a colored variable stays the same
color as it moves through the derivation.

## Backstroke for legibility

When text or an equation sits over a colored shape, a 3D surface, or a busy plot, add
a backstroke — an outline drawn behind the glyphs that separates them from whatever
is behind.

```python
label = Tex(R"v(t)")
label.set_backstroke(BLACK, width=5)

heading = Text("On a bright surface")
heading.set_backstroke(BLACK, width=4)
```

A backstroke of width 4-6 is usually enough. In 3D scenes, apply it to every label
that overlaps a surface so the text stays readable as the camera moves.
