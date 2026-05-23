"""ManimGL example: a LaTeX equation introduced, colored with t2c, and morphed.

Walks through completing the square on a quadratic. Renders headless with:
    xvfb-run -a manimgl equation_walkthrough.py EquationWalkthrough -w -m
"""
from manimlib import *


class EquationWalkthrough(InteractiveScene):
    def construct(self):
        # A consistent color map so each variable keeps its color across steps.
        color_map = {"x": BLUE, "h": YELLOW, "k": RED}

        heading = Text("Completing the Square", font_size=44)
        heading.to_edge(UP)
        self.play(Write(heading))
        self.wait(0.5)

        # Step 1: the starting quadratic.
        step1 = Tex(R"x^2 + 6x + 5", t2c=color_map)
        step1.scale(1.4)
        self.play(Write(step1))
        self.wait(1)

        # Step 2: regroup toward a perfect-square trinomial.
        step2 = Tex(R"x^2 + 6x + 9 - 4", t2c=color_map)
        step2.scale(1.4)
        step2.move_to(step1)
        self.play(TransformMatchingTex(step1, step2))
        self.wait(1)

        # Step 3: the finished vertex form.
        step3 = Tex(R"(x + 3)^2 - 4", t2c=color_map)
        step3.scale(1.4)
        step3.move_to(step2)
        self.play(TransformMatchingTex(step2, step3))
        self.wait(0.5)

        # Caption naming the result, with a backstroke for legibility.
        caption = Text("vertex form", font_size=32, color=TEAL)
        caption.next_to(step3, DOWN, buff=0.6)
        caption.set_backstroke(BLACK, width=4)
        self.play(FadeIn(caption, shift=UP))
        self.wait(1.5)
