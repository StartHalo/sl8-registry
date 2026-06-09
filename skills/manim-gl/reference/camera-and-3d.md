# Camera and 3D

This document covers ManimGL (the OpenGL-based 3Blue1Brown engine), not Manim CE.

## Contents

- [The camera frame](#the-camera-frame)
- [Reorienting the camera](#reorienting-the-camera)
- [Animating the camera](#animating-the-camera)
- [Fixing mobjects in the frame](#fixing-mobjects-in-the-frame)
- [3D mobjects](#3d-mobjects)
- [Lighting](#lighting)

## The camera frame

In ManimGL the camera is a mobject reached through `self.frame`. **This differs from
Manim CE, where it is `self.camera.frame`.** Because `self.frame` is a mobject, it
responds to the usual mobject methods — `move_to`, `shift`, `scale`, `set_height` —
and it can be animated with `.animate`.

```python
frame = self.frame
frame.set_height(6)          # zoom in (smaller height = closer)
frame.move_to(RIGHT * 2)     # pan the view
```

Any scene — `Scene` or `InteractiveScene` — can hold 3D content. There is no special
3D scene class to subclass; the 3D-ness comes from the mobjects and from reorienting
the frame.

## Reorienting the camera

`frame.reorient(theta, phi, gamma, center, height)` sets the camera's 3D orientation
in one call. All arguments are optional after `theta`.

- `theta` — rotation around the vertical axis (degrees), i.e. swinging left/right.
- `phi` — tilt away from straight-down (degrees); `0` looks along the z-axis.
- `gamma` — roll of the camera (degrees).
- `center` — the point the camera looks at, e.g. `ORIGIN` or `(1, 0, 0)`.
- `height` — the vertical extent of the view; larger means zoomed out.

```python
# An angled three-quarter view, looking at the origin
self.frame.reorient(30, 70, 0, ORIGIN, 8)
```

A flat front view is roughly `reorient(0, 0)`; a top-down view is around
`reorient(0, 90)`. Set an initial orientation before adding 3D mobjects so the first
frame already reads as 3D.

## Animating the camera

Animate a camera move by prefixing `reorient` (or any frame method) with `.animate`
inside `self.play`.

```python
# Swing around the scene over 4 seconds
self.play(
    self.frame.animate.reorient(80, 65, 0, ORIGIN, 9),
    run_time=4,
)

# Zoom and pan together
self.play(self.frame.animate.set_height(5).move_to(UP * 1.5), run_time=2)
```

A slow `reorient` with `run_time` of 3-6 seconds gives a 3D scene depth without making
the viewer dizzy. `rate_func=linear` keeps a rotation perfectly steady.

## Fixing mobjects in the frame

When the camera moves through 3D, most mobjects move with the world. Titles and
captions should instead stay pinned to the screen. Call `fix_in_frame()` **on the
mobject** to lock it to screen space.

```python
title = Text("Surface Plot")
title.to_edge(UP)
title.fix_in_frame()      # stays put while the camera orbits
self.add(title)

self.play(self.frame.animate.reorient(60, 70), run_time=4)
```

In Manim CE this is a scene method (`add_fixed_in_frame_mobjects`); in ManimGL it is a
method on the mobject itself. A fixed full-screen background rectangle is a common
companion so the scene has a solid backdrop during camera motion.

## 3D mobjects

ManimGL provides true 3D mobjects:

- `Sphere(radius=…)` — a sphere; pass `resolution=(u, v)` for smoothness.
- `Cube(side_length=…)` — a cube.
- `Torus(r1=…, r2=…)` — a ring with major and minor radii.
- `Surface(func, u_range=…, v_range=…, resolution=…)` — a parametric surface, where
  `func(u, v)` returns an `(x, y, z)` point.
- `ParametricCurve(func, t_range=…)` — a 3D curve traced by `func(t)`.
- `ThreeDAxes(...)` — a 3D coordinate frame.

```python
surface = Surface(
    lambda u, v: np.array([u, v, 0.4 * np.sin(u) * np.cos(v)]),
    u_range=(-3, 3), v_range=(-3, 3),
    resolution=(40, 40),
)
surface.set_color(BLUE_D)
surface.set_opacity(0.8)
```

An opacity below 1 lets the viewer see through a surface to whatever lies behind it,
which reads better than a fully opaque solid. `SurfaceMesh(surface)` overlays a wire
grid for extra structure.

## Lighting

3D surfaces and solids are lit by a movable light source reached through
`self.camera.light_source`. Moving it changes where highlights fall.

```python
self.camera.light_source.move_to((4, 4, 8))
```

`mob.set_gloss(value)` (0 to 1) controls how shiny a surface looks, and
`mob.set_shadow(value)` controls self-shadowing. Modest gloss on a sphere or surface
gives a sense of curvature; defaults are fine for most scenes.
