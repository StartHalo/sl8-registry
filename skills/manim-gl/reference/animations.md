# Animations

This document covers ManimGL (the OpenGL-based 3Blue1Brown engine), not Manim CE.

## Contents

- [Playing animations](#playing-animations)
- [Creation animations](#creation-animations)
- [Transform animations](#transform-animations)
- [The animate syntax](#the-animate-syntax)
- [Animation groups](#animation-groups)
- [Timing and rate functions](#timing-and-rate-functions)

## Playing animations

`self.play()` runs animations. Pass one or several — multiple animations passed in a
single `play` call run at the same time.

```python
self.play(ShowCreation(circle))                 # one animation
self.play(FadeIn(label), ShowCreation(arrow))   # two run in parallel
```

`self.wait(seconds)` holds the last frame. Put a short wait after each beat so the
viewer has time to read it.

## Creation animations

These bring a mobject onto the screen.

| Animation | Use for |
|---|---|
| `ShowCreation(mob)` | Draw a shape or path as if sketched. **ManimGL uses `ShowCreation`, not `Create`.** |
| `Write(mob)` | Reveal text or an equation stroke by stroke |
| `FadeIn(mob)` | Fade a mobject in from transparent; accepts a `shift=` direction |
| `GrowFromCenter(mob)` | Scale a mobject up from a point |
| `DrawBorderThenFill(mob)` | Trace the outline, then flood the fill |

```python
self.play(ShowCreation(curve))
self.play(Write(equation))
self.play(FadeIn(caption, shift=UP))
self.play(GrowFromCenter(dot))
```

Their counterparts remove a mobject: `FadeOut(mob)`, `Uncreate(mob)`.

`ShowCreation` is the single most common ManimGL idiom that differs from Manim CE.
If you write `Create`, the render fails with a `NameError`.

## Transform animations

These morph one mobject into another.

`Transform(a, b)` morphs `a` into the shape of `b`; afterwards `a` is the mobject on
screen and `b` is discarded. `ReplacementTransform(a, b)` instead leaves `b` on
screen and removes `a` — cleaner when you keep referring to the target afterwards.

```python
self.play(Transform(square, circle))
self.play(ReplacementTransform(old_label, new_label))
```

`TransformMatchingTex(eq_a, eq_b)` morphs between two `Tex` equations, matching shared
sub-expressions so common symbols glide into place instead of cross-fading. It is the
go-to animation for algebraic derivations — see `tex-and-text.md`.

```python
self.play(TransformMatchingTex(equation_1, equation_2))
```

## The animate syntax

Prefixing any mobject method with `.animate` turns that method call into an
animation. The change is interpolated smoothly from the current state.

```python
self.play(circle.animate.shift(RIGHT * 2))
self.play(square.animate.set_color(RED).scale(1.5))   # methods chain
```

Use `.animate` for moves, scales, recolors, and fades. Use a dedicated animation
class (`ShowCreation`, `Transform`) when one exists for the effect you want.

## Animation groups

Combine several animations under one `play` call with finer control over ordering.

`AnimationGroup(*anims)` plays its members together, optionally staggered by
`lag_ratio`. `LaggedStart(*anims, lag_ratio=…)` starts each member slightly after the
previous one — ideal for revealing a list or a row of shapes in sequence.
`Succession(*anims)` plays its members strictly one after another.

```python
self.play(LaggedStart(
    *[FadeIn(item) for item in bullet_points],
    lag_ratio=0.3,
))

self.play(Succession(
    ShowCreation(axes),
    ShowCreation(graph),
))
```

## Timing and rate functions

`run_time` sets an animation's duration in seconds.

```python
self.play(ShowCreation(spiral), run_time=3)
```

A *rate function* shapes the easing. The default `smooth` eases in and out; `linear`
runs at constant speed (good for steady camera rotation); `there_and_back` plays the
change then reverses it; `rush_into` and `rush_from` bias the speed to one end.

```python
self.play(circle.animate.shift(UP), run_time=2, rate_func=linear)
self.play(dot.animate.scale(1.4), rate_func=there_and_back)
```

`self.wait(seconds)` is the pause between beats. Without waits, an animation feels
rushed; budget pacing in the storyboard and hold each beat long enough to read.
