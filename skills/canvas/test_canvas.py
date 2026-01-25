#!/usr/bin/env python3
"""Quick test to verify canvas skill works."""

import sys
import os

# Add scripts to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'scripts'))

from canvas import Canvas
from builder import CanvasBuilder

def test_create_empty():
    """Test creating empty canvas."""
    canvas = Canvas.create_empty("Test Canvas")
    assert canvas.data["metadata"]["name"] == "Test Canvas"
    assert len(canvas.data["images"]) == 0
    print("✅ Empty canvas creation works")

def test_add_image():
    """Test adding image."""
    canvas = Canvas.create_empty("Test")
    img_id = canvas.add_image(
        src="https://example.com/img.jpg",
        position={"x": 100, "y": 100},
        size={"width": 400, "height": 300}
    )
    assert len(canvas.data["images"]) == 1
    assert canvas.data["images"][0]["id"] == img_id
    print("✅ Add image works")

def test_builder():
    """Test builder."""
    builder = CanvasBuilder("Builder Test")
    builder.add_image_grid(
        ["https://example.com/1.jpg", "https://example.com/2.jpg"],
        columns=2
    )
    canvas = builder.build()
    assert len(canvas.data["images"]) == 2
    print("✅ Builder works")

def test_save_load():
    """Test save and load."""
    import tempfile

    canvas = Canvas.create_empty("Save Test")
    canvas.add_image(
        "https://example.com/img.jpg",
        {"x": 0, "y": 0},
        {"width": 100, "height": 100}
    )

    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        temp_path = f.name

    try:
        canvas.save(temp_path, validate=False)
        loaded = Canvas.load(temp_path)
        assert len(loaded.data["images"]) == 1
        print("✅ Save/load works")
    finally:
        os.unlink(temp_path)

if __name__ == "__main__":
    print("Testing canvas skill...\n")
    test_create_empty()
    test_add_image()
    test_builder()
    test_save_load()
    print("\n🎉 All tests passed!")
