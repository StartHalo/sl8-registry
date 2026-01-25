"""
Canvas manipulation library.

Usage:
    from scripts.canvas import Canvas

    # Create new canvas
    canvas = Canvas.create_empty("My Canvas")
    canvas.add_image(
        src="https://example.com/image.jpg",
        position={"x": 100, "y": 100},
        size={"width": 400, "height": 300}
    )
    canvas.save("output.json")

    # Load existing canvas
    canvas = Canvas.load("existing.json")
    canvas.remove_item("img-1")
    canvas.save("modified.json")
"""

import json
import uuid
from datetime import datetime
from typing import Dict, List, Optional
from pathlib import Path


class Canvas:
    """Main interface for canvas manipulation."""

    def __init__(self, data: Dict):
        """Initialize from canvas JSON data."""
        self.data = data
        self._modified = False

    @classmethod
    def create_empty(
        cls,
        name: str,
        theme: str = "light",
        description: Optional[str] = None
    ) -> "Canvas":
        """Create a new empty canvas.

        Args:
            name: Canvas name
            theme: 'light' or 'dark'
            description: Optional description

        Returns:
            New Canvas instance
        """
        now = datetime.utcnow().isoformat() + "Z"

        data = {
            "version": "1.0.0",
            "metadata": {
                "name": name,
                "createdAt": now,
                "modifiedAt": now
            },
            "canvas": {
                "viewport": {"x": 0, "y": 0, "scale": 1},
                "settings": {
                    "showGrid": True,
                    "showMinimap": True,
                    "theme": theme
                }
            },
            "images": [],
            "videos": []
        }

        if description:
            data["metadata"]["description"] = description

        return cls(data)

    @classmethod
    def load(cls, file_path: str) -> "Canvas":
        """Load canvas from JSON file.

        Args:
            file_path: Path to canvas JSON file

        Returns:
            Canvas instance
        """
        with open(file_path, 'r') as f:
            data = json.load(f)
        return cls(data)

    def add_image(
        self,
        src: str,
        position: Dict[str, float],
        size: Dict[str, float],
        rotation: float = 0,
        scale: Optional[Dict[str, float]] = None,
        opacity: float = 1.0,
        zindex: Optional[int] = None,
        name: Optional[str] = None,
        **kwargs
    ) -> str:
        """Add image to canvas.

        Args:
            src: Image URL or data URI
            position: {"x": float, "y": float}
            size: {"width": float, "height": float}
            rotation: Rotation in degrees (default: 0)
            scale: {"x": float, "y": float} (default: {1, 1})
            opacity: 0-1 (default: 1)
            zindex: Stacking order (auto-assigned if None)
            name: Optional name
            **kwargs: Additional properties

        Returns:
            Generated image ID
        """
        image_id = f"img-{uuid.uuid4()}"

        image = {
            "id": image_id,
            "src": src,
            "position": position,
            "size": size,
            "rotation": rotation,
            "scale": scale or {"x": 1, "y": 1},
            "opacity": opacity,
            "zIndex": zindex if zindex is not None else self._get_next_zindex(),
        }

        if name:
            image["name"] = name

        image.update(kwargs)

        self.data["images"].append(image)
        self._mark_modified()

        return image_id

    def add_video(
        self,
        src: str,
        duration: float,
        position: Dict[str, float],
        size: Dict[str, float],
        rotation: float = 0,
        scale: Optional[Dict[str, float]] = None,
        opacity: float = 1.0,
        zindex: Optional[int] = None,
        current_time: float = 0,
        volume: float = 0.5,
        name: Optional[str] = None,
        **kwargs
    ) -> str:
        """Add video to canvas.

        Args:
            src: Video URL or data URI
            duration: Video duration in seconds
            position: {"x": float, "y": float}
            size: {"width": float, "height": float}
            rotation: Rotation in degrees (default: 0)
            scale: {"x": float, "y": float} (default: {1, 1})
            opacity: 0-1 (default: 1)
            zindex: Stacking order (auto-assigned if None)
            current_time: Current playback position (default: 0)
            volume: 0-1 (default: 0.5)
            name: Optional name
            **kwargs: Additional properties

        Returns:
            Generated video ID
        """
        video_id = f"vid-{uuid.uuid4()}"

        video = {
            "id": video_id,
            "src": src,
            "duration": duration,
            "position": position,
            "size": size,
            "rotation": rotation,
            "scale": scale or {"x": 1, "y": 1},
            "opacity": opacity,
            "zIndex": zindex if zindex is not None else self._get_next_zindex(),
            "currentTime": current_time,
            "volume": volume,
        }

        if name:
            video["name"] = name

        video.update(kwargs)

        self.data["videos"].append(video)
        self._mark_modified()

        return video_id

    def remove_item(self, item_id: str) -> bool:
        """Remove item by ID.

        Args:
            item_id: ID of item to remove

        Returns:
            True if removed, False if not found
        """
        # Try images
        for i, img in enumerate(self.data["images"]):
            if img["id"] == item_id:
                self.data["images"].pop(i)
                self._mark_modified()
                return True

        # Try videos
        for i, vid in enumerate(self.data["videos"]):
            if vid["id"] == item_id:
                self.data["videos"].pop(i)
                self._mark_modified()
                return True

        return False

    def update_item(self, item_id: str, **properties) -> bool:
        """Update item properties.

        Args:
            item_id: ID of item to update
            **properties: Properties to update

        Returns:
            True if updated, False if not found
        """
        item = self.get_item(item_id)
        if not item:
            return False

        item.update(properties)
        self._mark_modified()

        return True

    def get_item(self, item_id: str) -> Optional[Dict]:
        """Get item by ID.

        Args:
            item_id: ID of item

        Returns:
            Item dict or None if not found
        """
        for img in self.data["images"]:
            if img["id"] == item_id:
                return img

        for vid in self.data["videos"]:
            if vid["id"] == item_id:
                return vid

        return None

    def get_all_items(self) -> List[Dict]:
        """Get all items (images + videos).

        Returns:
            List of all items
        """
        return self.data["images"] + self.data["videos"]

    def set_viewport(self, x: float, y: float, scale: float):
        """Set viewport configuration.

        Args:
            x: X offset
            y: Y offset
            scale: Zoom scale (0.1-5.0)
        """
        self.data["canvas"]["viewport"] = {"x": x, "y": y, "scale": scale}
        self._mark_modified()

    def set_theme(self, theme: str):
        """Set canvas theme.

        Args:
            theme: 'light' or 'dark'

        Raises:
            ValueError: If theme is invalid
        """
        if theme not in ["light", "dark"]:
            raise ValueError("Theme must be 'light' or 'dark'")
        self.data["canvas"]["settings"]["theme"] = theme
        self._mark_modified()

    def validate(self) -> bool:
        """Validate canvas structure.

        Returns:
            True if valid, False otherwise (prints errors)
        """
        try:
            from scripts.validator import CanvasValidator
            validator = CanvasValidator(self.data)
            return validator.validate()
        except ImportError:
            print("⚠️  Validator not available, skipping validation")
            return True

    def save(self, file_path: str, validate: bool = True):
        """Save canvas to JSON file.

        Args:
            file_path: Output file path
            validate: Validate before saving (default: True)

        Raises:
            ValueError: If validation fails
        """
        if validate and not self.validate():
            raise ValueError("Canvas validation failed")

        if self._modified:
            self.data["metadata"]["modifiedAt"] = datetime.utcnow().isoformat() + "Z"

        with open(file_path, 'w') as f:
            json.dump(self.data, f, indent=2)

    def to_json(self, pretty: bool = True) -> str:
        """Export as JSON string.

        Args:
            pretty: Pretty print with indentation

        Returns:
            JSON string
        """
        return json.dumps(self.data, indent=2 if pretty else None)

    def _get_next_zindex(self) -> int:
        """Get next available z-index."""
        max_z = 0
        for item in self.get_all_items():
            max_z = max(max_z, item.get("zIndex", 0))
        return max_z + 1

    def _mark_modified(self):
        """Mark canvas as modified."""
        self._modified = True
