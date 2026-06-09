"""ManimGL example: a 3D surface with an animated frame.reorient camera move.

Shows a rippling parametric surface while the camera orbits it. Renders with:
    xvfb-run -a manimgl camera_3d.py Camera3D -w -m
"""
from manimlib import *


class Camera3D(InteractiveScene):
    def construct(self):
        # Title fixed to screen space so it stays put while the camera orbits.
        title = Text("Ripple Surface", font_size=44)
        title.to_edge(UP)
        title.fix_in_frame()
        title.set_backstroke(BLACK, width=5)
        self.add(title)

        # 3D axes give the surface a spatial reference.
        axes = ThreeDAxes(
            x_range=(-3, 3, 1),
            y_range=(-3, 3, 1),
            z_range=(-1.5, 1.5, 1),
        )

        # A parametric surface: a radial ripple z = sin(r) / r style wave.
        surface = Surface(
            lambda u, v: np.array([
                u,
                v,
                0.8 * np.sin(np.sqrt(u**2 + v**2) + 0.001)
                / (np.sqrt(u**2 + v**2) + 0.001),
            ]),
            u_range=(-3, 3),
            v_range=(-3, 3),
            resolution=(48, 48),
        )
        surface.set_color(BLUE_D)
        surface.set_opacity(0.85)

        # A wire mesh overlay adds structure to the surface.
        mesh = SurfaceMesh(surface)
        mesh.set_stroke(WHITE, width=0.5, opacity=0.4)

        # Start the camera at an angled three-quarter view.
        self.frame.reorient(20, 70, 0, ORIGIN, 9)
        self.play(ShowCreation(axes))
        self.play(
            ShowCreation(surface),
            ShowCreation(mesh),
            run_time=2.5,
        )
        self.wait(0.5)

        # Orbit the camera around the surface.
        self.play(
            self.frame.animate.reorient(80, 65, 0, ORIGIN, 9),
            run_time=5,
            rate_func=linear,
        )
        self.wait(1)
