"""Canvas validation."""

import json
from pathlib import Path
from typing import Dict, List, Optional


class CanvasValidator:
    """Validate canvas JSON against schema and business rules."""

    def __init__(self, canvas_data: Dict):
        """Initialize validator.

        Args:
            canvas_data: Canvas JSON data
        """
        self.data = canvas_data
        self.errors = []

    def validate(self, schema_path: Optional[str] = None) -> bool:
        """Run all validations.

        Args:
            schema_path: Optional path to JSON Schema file

        Returns:
            True if valid, False otherwise
        """
        # Try JSON Schema validation if available
        if schema_path:
            self._validate_schema(schema_path)

        # Business rules validation
        self._validate_unique_ids()
        self._validate_ranges()
        self._validate_theme()
        self._validate_required_fields()

        if self.errors:
            print("❌ Validation FAILED:")
            for error in self.errors:
                print(f"  - {error}")
            return False

        print("✅ Validation PASSED")
        return True

    def _validate_schema(self, schema_path: str):
        """Validate against JSON Schema."""
        try:
            import jsonschema

            with open(schema_path) as f:
                schema = json.load(f)

            jsonschema.validate(instance=self.data, schema=schema)

        except ImportError:
            self.errors.append("jsonschema library not available (pip install jsonschema)")
        except jsonschema.ValidationError as e:
            self.errors.append(f"Schema validation: {e.message}")
        except FileNotFoundError:
            self.errors.append(f"Schema file not found: {schema_path}")
        except Exception as e:
            self.errors.append(f"Schema validation error: {e}")

    def _validate_required_fields(self):
        """Check required fields exist."""
        required_fields = ['version', 'metadata', 'canvas', 'images', 'videos']
        for field in required_fields:
            if field not in self.data:
                self.errors.append(f"Missing required field: {field}")

        # Check metadata fields
        if 'metadata' in self.data:
            metadata = self.data['metadata']
            for field in ['name', 'createdAt', 'modifiedAt']:
                if field not in metadata:
                    self.errors.append(f"Missing metadata.{field}")

        # Check canvas fields
        if 'canvas' in self.data:
            canvas = self.data['canvas']
            if 'viewport' not in canvas:
                self.errors.append("Missing canvas.viewport")
            if 'settings' not in canvas:
                self.errors.append("Missing canvas.settings")

    def _validate_unique_ids(self):
        """Ensure all IDs are unique."""
        all_ids = []
        all_ids.extend([img["id"] for img in self.data.get("images", [])])
        all_ids.extend([vid["id"] for vid in self.data.get("videos", [])])

        if len(all_ids) != len(set(all_ids)):
            duplicates = [id for id in all_ids if all_ids.count(id) > 1]
            self.errors.append(f"Duplicate IDs found: {set(duplicates)}")

    def _validate_ranges(self):
        """Validate numeric ranges."""
        # Viewport scale
        if 'canvas' in self.data and 'viewport' in self.data['canvas']:
            scale = self.data["canvas"]["viewport"].get("scale", 1)
            if scale < 0.1 or scale > 5:
                self.errors.append(f"Viewport scale {scale} out of range (0.1-5.0)")

        # Item properties
        for item_type in ["images", "videos"]:
            for item in self.data.get(item_type, []):
                item_id = item.get("id", "unknown")

                # Opacity
                opacity = item.get("opacity", 1)
                if opacity < 0 or opacity > 1:
                    self.errors.append(f"{item_id}: opacity {opacity} out of range (0-1)")

                # Size
                size = item.get("size", {})
                width = size.get("width", 0)
                height = size.get("height", 0)
                if width <= 0 or height <= 0:
                    self.errors.append(f"{item_id}: invalid size (width={width}, height={height})")

                # Scale
                scale = item.get("scale", {"x": 1, "y": 1})
                if scale.get("x", 1) <= 0 or scale.get("y", 1) <= 0:
                    self.errors.append(f"{item_id}: scale must be positive")

                # Video-specific
                if item_type == "videos":
                    duration = item.get("duration", 0)
                    if duration <= 0:
                        self.errors.append(f"{item_id}: duration must be positive")

                    volume = item.get("volume", 0.5)
                    if volume < 0 or volume > 1:
                        self.errors.append(f"{item_id}: volume {volume} out of range (0-1)")

    def _validate_theme(self):
        """Validate theme value."""
        if 'canvas' in self.data and 'settings' in self.data['canvas']:
            theme = self.data["canvas"]["settings"].get("theme", "light")
            if theme not in ["light", "dark"]:
                self.errors.append(f"Invalid theme: '{theme}' (must be 'light' or 'dark')")
