"""ManimGL example: axes, a plotted function, and a dot tracing the curve.

Plots a damped cosine and runs a dot along it. Renders headless with:
    xvfb-run -a manimgl function_plot.py FunctionPlot -w -m
"""
from manimlib import *


class FunctionPlot(InteractiveScene):
    def construct(self):
        title = Text("A Damped Oscillation", font_size=44)
        title.to_edge(UP)
        self.play(Write(title))

        # Axes sized to leave room for the title above.
        axes = Axes(
            x_range=(0, 6, 1),
            y_range=(-1.2, 1.2, 0.5),
            width=9,
            height=4.5,
        )
        axes.next_to(title, DOWN, buff=0.5)
        self.play(ShowCreation(axes))

        # The function being visualized.
        def damped(x):
            return np.exp(-0.35 * x) * np.cos(3 * x)

        graph = axes.get_graph(damped, color=BLUE)
        self.play(ShowCreation(graph), run_time=2)
        self.wait(0.5)

        # A dot that travels along the plotted curve.
        tracer = Dot(color=YELLOW, radius=0.09)
        tracer.move_to(axes.input_to_graph_point(0, graph))
        self.play(FadeIn(tracer, scale=0.5))

        self.play(
            MoveAlongPath(tracer, graph),
            run_time=4,
            rate_func=linear,
        )
        self.wait(0.5)

        # Label the curve at its current end point.
        label = Tex(R"e^{-0.35x}\cos(3x)", t2c={"x": BLUE})
        label.scale(0.8)
        label.next_to(graph, UP, buff=0.3)
        label.set_backstroke(BLACK, width=4)
        self.play(Write(label))
        self.wait(1.5)
