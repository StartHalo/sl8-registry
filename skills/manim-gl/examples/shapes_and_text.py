"""ManimGL example: basic shapes, text, a transform, and a lagged reveal.

Renders headless with:
    xvfb-run -a manimgl shapes_and_text.py ShapesAndText -w -m
"""
from manimlib import *


class ShapesAndText(InteractiveScene):
    def construct(self):
        # Title pinned to the top edge.
        title = Text("Shapes in Motion", font_size=48)
        title.to_edge(UP)
        self.play(Write(title))
        self.wait(0.5)

        # A row of three shapes laid out with arrange().
        triangle = Triangle(color=YELLOW)
        square = Square(color=GREEN)
        circle = Circle(color=BLUE)
        shapes = VGroup(triangle, square, circle)
        shapes.set_fill(opacity=0.6)
        shapes.arrange(RIGHT, buff=0.9)
        shapes.move_to(ORIGIN)

        # Reveal the shapes one after another with a lagged start.
        self.play(LaggedStart(
            ShowCreation(triangle),
            ShowCreation(square),
            ShowCreation(circle),
            lag_ratio=0.4,
        ))
        self.wait(0.5)

        # Morph the square into a pentagon in place.
        pentagon = RegularPolygon(5, color=GREEN)
        pentagon.set_fill(GREEN, opacity=0.6)
        pentagon.match_height(square)
        pentagon.move_to(square)
        self.play(Transform(square, pentagon))
        self.wait(0.5)

        # Group move: slide every shape down a touch, then scale the group.
        self.play(shapes.animate.shift(DOWN * 0.4))
        self.play(shapes.animate.scale(1.15), run_time=1.5)
        self.wait(1)
