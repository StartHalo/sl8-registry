"""Fluent API for building canvases."""

from scripts.canvas import Canvas
from typing import List, Dict, Optional


class CanvasBuilder:
    """Fluent API for building complex canvases."""

    def __init__(self, name: str, description: Optional[str] = None, theme: str = "light"):
        """Initialize builder.

        Args:
            name: Canvas name
            description: Optional description
            theme: 'light' or 'dark'
        """
        self.canvas = Canvas.create_empty(name, theme, description)
        self.next_zindex = 1

    def set_viewport(self, x: float, y: float, scale: float) -> "CanvasBuilder":
        """Set viewport.

        Args:
            x: X offset
            y: Y offset
            scale: Zoom scale

        Returns:
            Self for chaining
        """
        self.canvas.set_viewport(x, y, scale)
        return self

    def set_theme(self, theme: str) -> "CanvasBuilder":
        """Set theme.

        Args:
            theme: 'light' or 'dark'

        Returns:
            Self for chaining
        """
        self.canvas.set_theme(theme)
        return self

    def add_image(
        self,
        src: str,
        position: Dict[str, float],
        size: Dict[str, float],
        **kwargs
    ) -> "CanvasBuilder":
        """Add single image.

        Args:
            src: Image URL
            position: {"x": float, "y": float}
            size: {"width": float, "height": float}
            **kwargs: Additional properties

        Returns:
            Self for chaining
        """
        if "zindex" not in kwargs:
            kwargs["zindex"] = self.next_zindex
            self.next_zindex += 1

        self.canvas.add_image(src, position, size, **kwargs)
        return self

    def add_video(
        self,
        src: str,
        duration: float,
        position: Dict[str, float],
        size: Dict[str, float],
        **kwargs
    ) -> "CanvasBuilder":
        """Add single video.

        Args:
            src: Video URL
            duration: Duration in seconds
            position: {"x": float, "y": float}
            size: {"width": float, "height": float}
            **kwargs: Additional properties

        Returns:
            Self for chaining
        """
        if "zindex" not in kwargs:
            kwargs["zindex"] = self.next_zindex
            self.next_zindex += 1

        self.canvas.add_video(src, duration, position, size, **kwargs)
        return self

    def add_image_grid(
        self,
        image_urls: List[str],
        columns: int = 3,
        spacing: int = 50,
        image_width: int = 300,
        image_height: int = 200,
        start_x: int = 100,
        start_y: int = 100
    ) -> "CanvasBuilder":
        """Add multiple images in grid layout.

        Args:
            image_urls: List of image URLs
            columns: Number of columns
            spacing: Space between images
            image_width: Width of each image
            image_height: Height of each image
            start_x: Starting X position
            start_y: Starting Y position

        Returns:
            Self for chaining
        """
        for i, url in enumerate(image_urls):
            row = i // columns
            col = i % columns

            x = start_x + col * (image_width + spacing)
            y = start_y + row * (image_height + spacing)

            self.add_image(
                url,
                {"x": x, "y": y},
                {"width": image_width, "height": image_height},
                name=f"Grid Image {i + 1}"
            )

        return self

    def add_image_scatter(
        self,
        image_urls: List[str],
        canvas_width: int = 1600,
        canvas_height: int = 1200,
        min_size: int = 200,
        max_size: int = 400,
        max_rotation: float = 15
    ) -> "CanvasBuilder":
        """Add images with scattered layout.

        Args:
            image_urls: List of image URLs
            canvas_width: Canvas width
            canvas_height: Canvas height
            min_size: Minimum image size
            max_size: Maximum image size
            max_rotation: Maximum rotation in degrees

        Returns:
            Self for chaining
        """
        from scripts.layouts import scatter_layout

        items = scatter_layout(
            urls=image_urls,
            canvas_width=canvas_width,
            canvas_height=canvas_height,
            min_size=min_size,
            max_size=max_size,
            max_rotation=max_rotation,
            start_zindex=self.next_zindex
        )

        for item in items:
            self.canvas.data["images"].append(item)

        self.next_zindex += len(items)
        self.canvas._mark_modified()
        return self

    def add_timeline(
        self,
        items: List[Dict],
        item_width: int = 320,
        item_height: int = 180,
        spacing: int = 100,
        start_x: int = 100,
        start_y: int = 200
    ) -> "CanvasBuilder":
        """Add timeline of images/videos.

        Args:
            items: List of dicts with 'url', 'type', 'duration' (for videos)
            item_width: Width of each item
            item_height: Height of each item
            spacing: Space between items
            start_x: Starting X position
            start_y: Y position

        Returns:
            Self for chaining
        """
        x_offset = start_x

        for i, item in enumerate(items):
            position = {"x": x_offset, "y": start_y}
            size = {"width": item_width, "height": item_height}

            if item['type'] == 'video':
                self.add_video(
                    item['url'],
                    item.get('duration', 10),
                    position,
                    size,
                    name=item.get('name', f"Video {i + 1}")
                )
            else:
                self.add_image(
                    item['url'],
                    position,
                    size,
                    name=item.get('name', f"Image {i + 1}")
                )

            x_offset += item_width + spacing

        return self

    def build(self) -> Canvas:
        """Get the built canvas.

        Returns:
            Canvas instance
        """
        return self.canvas
