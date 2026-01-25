---
name: canvas
description: Create, edit, and manipulate Infinite Kanvas JSON files containing spatial arrangements of images and videos. Use this skill when working with .json canvas files, creating photo galleries, timelines, or any spatial layout of media items. This skill provides Python utilities for canvas operations: adding/removing items, applying layouts (grid, scatter, timeline, circular), and validating canvas structure.
---

# Canvas

## Overview

This skill enables creating and manipulating Infinite Kanvas JSON files - spatial arrangements of images and videos on an infinite canvas. Use Python utilities to programmatically generate, edit, and validate canvas files.

## Workflow Decision Tree

### Reading Existing Canvas
**When:** Need to inspect canvas contents
**How:** Load with `Canvas.load("file.json")`

### Creating New Canvas
**When:** Building canvas from scratch
**Choose approach:**
- **Empty canvas**: Use `Canvas.create_empty("Name")`
- **With images in grid**: Use `CanvasBuilder` with `add_image_grid()`
- **Scattered layout**: Use `CanvasBuilder` with `add_image_scatter()`
- **Timeline**: Use `CanvasBuilder` with `add_timeline()`
- **Custom layout**: Use layout algorithms from `scripts/layouts.py`

### Editing Existing Canvas
**When:** Modifying canvas content
**Operations:**
- **Add image**: `canvas.add_image(src, position, size)`
- **Add video**: `canvas.add_video(src, duration, position, size)`
- **Remove item**: `canvas.remove_item(id)`
- **Update item**: `canvas.update_item(id, **properties)`
- **Change viewport**: `canvas.set_viewport(x, y, scale)`
- **Change theme**: `canvas.set_theme("light" or "dark")`

## Creating Canvas with Grid Layout

Use CanvasBuilder for fluent API with automatic positioning:

```python
from scripts.builder import CanvasBuilder

builder = CanvasBuilder("Photo Gallery", description="Vacation photos")

# Add images in grid layout
builder.add_image_grid(
    image_urls=[
        "https://picsum.photos/id/10/400/300",
        "https://picsum.photos/id/20/400/300",
        "https://picsum.photos/id/30/400/300",
        "https://picsum.photos/id/40/400/300",
    ],
    columns=2,          # 2 columns
    spacing=50,         # 50px between images
    image_width=400,
    image_height=300
)

canvas = builder.build()
canvas.save("photo-gallery.json")
```

## Editing Existing Canvas

Load, modify, and save with automatic validation:

```python
from scripts.canvas import Canvas

# Load existing canvas
canvas = Canvas.load("existing.json")

# Add new image
img_id = canvas.add_image(
    src="https://example.com/new-image.jpg",
    position={"x": 500, "y": 300},
    size={"width": 400, "height": 300},
    name="New Photo"
)

# Remove an image by ID
canvas.remove_item("img-old-id")

# Update item properties
canvas.update_item("img-2", opacity=0.8, rotation=15)

# Change theme
canvas.set_theme("dark")

# Validate and save
canvas.save("updated.json")  # Validates automatically
```

## Creating Canvas from Scratch

Build programmatically with Canvas class:

```python
from scripts.canvas import Canvas

# Create empty canvas
canvas = Canvas.create_empty(
    name="My Canvas",
    theme="light",
    description="Optional description"
)

# Add individual items
canvas.add_image(
    src="https://example.com/img1.jpg",
    position={"x": 100, "y": 100},
    size={"width": 400, "height": 300},
    rotation=0,
    opacity=1.0,
    name="First Image"
)

canvas.add_video(
    src="https://example.com/video.mp4",
    duration=30.5,
    position={"x": 600, "y": 100},
    size={"width": 400, "height": 300},
    volume=0.5
)

# Save with validation
canvas.save("my-canvas.json")
```

## Layout Algorithms

Pre-built positioning algorithms in `scripts/layouts.py`:

### Grid Layout
Organized rows and columns with consistent spacing:

```python
from scripts.layouts import grid_layout

items = grid_layout(
    urls=["url1.jpg", "url2.jpg", "url3.jpg"],
    columns=3,
    spacing=50,
    image_width=300,
    image_height=200
)

# Add to canvas
for item in items:
    canvas.data["images"].append(item)
```

### Scattered Layout
Natural, random arrangement with varied sizes and rotations:

```python
from scripts.layouts import scatter_layout

items = scatter_layout(
    urls=["url1.jpg", "url2.jpg"],
    canvas_width=1600,
    canvas_height=1200,
    min_size=200,
    max_size=400,
    max_rotation=15  # degrees
)
```

### Timeline Layout
Horizontal sequence for chronological arrangements:

```python
from scripts.layouts import timeline_layout

items = timeline_layout(
    items=[
        {"url": "img1.jpg", "type": "image", "name": "Scene 1"},
        {"url": "vid.mp4", "type": "video", "duration": 10, "name": "Scene 2"},
    ],
    item_width=320,
    item_height=180,
    spacing=100
)
```

### Circular Layout
Radial arrangement around a center point:

```python
from scripts.layouts import circular_layout

items = circular_layout(
    urls=["url1.jpg", "url2.jpg", "url3.jpg"],
    radius=400,
    center_x=600,
    center_y=600,
    image_size=300
)
```

## Batch Operations with Builder

Combine multiple operations with method chaining:

```python
from scripts.builder import CanvasBuilder

builder = CanvasBuilder("Complex Canvas")

# Chain multiple operations
builder.set_viewport(0, 0, 0.8) \
    .set_theme("dark") \
    .add_image_grid(grid_urls, columns=3, spacing=50) \
    .add_image_scatter(scattered_urls, canvas_width=1600) \
    .add_timeline(timeline_items, spacing=100)

canvas = builder.build()
canvas.save("complex-canvas.json")
```

## Validation

Validation runs automatically before saving (can be disabled):

```python
# Automatic validation (default)
canvas.save("output.json")  # Validates before saving

# Manual validation
is_valid = canvas.validate()  # Returns True/False, prints errors

# Skip validation (not recommended)
canvas.save("output.json", validate=False)
```

Validator checks:
- Required fields present
- Unique IDs for all items
- Valid ranges (opacity 0-1, scale >0, viewport scale 0.1-5.0)
- Theme is "light" or "dark"
- Valid timestamps (ISO 8601 format)
- Positive sizes and durations

## Common Operations

### Get Item Information
```python
# Get single item by ID
item = canvas.get_item("img-1")

# Get all items
all_items = canvas.get_all_items()  # Returns images + videos

# Access data directly
num_images = len(canvas.data["images"])
num_videos = len(canvas.data["videos"])
```

### Update Multiple Properties
```python
# Update any properties
canvas.update_item("img-1",
    opacity=0.5,
    rotation=45,
    scale={"x": 1.2, "y": 1.2},
    name="Updated Name"
)
```

### Export to JSON String
```python
# Pretty-printed JSON
json_str = canvas.to_json(pretty=True)

# Compact JSON
json_str = canvas.to_json(pretty=False)
```

## Canvas JSON Format

Each canvas JSON file contains:

```json
{
  "version": "1.0.0",
  "metadata": {
    "name": "Canvas Name",
    "description": "Optional description",
    "createdAt": "2024-01-01T00:00:00Z",
    "modifiedAt": "2024-01-01T00:00:00Z"
  },
  "canvas": {
    "viewport": {"x": 0, "y": 0, "scale": 1},
    "settings": {
      "showGrid": true,
      "showMinimap": true,
      "theme": "light"
    }
  },
  "images": [/* array of image objects */],
  "videos": [/* array of video objects */]
}
```

**Required fields for images:**
- `id`: Unique identifier (auto-generated)
- `src`: URL or data URI
- `position`: `{"x": float, "y": float}`
- `size`: `{"width": float, "height": float}`
- `rotation`: Degrees (0 = no rotation)
- `scale`: `{"x": float, "y": float}` (1 = original size)
- `opacity`: 0-1 (1 = fully opaque)
- `zIndex`: Stacking order (auto-assigned)

**Videos include additional fields:**
- `duration`: Length in seconds
- `currentTime`: Playback position (default: 0)
- `volume`: 0-1 (default: 0.5)
- `isPlaying`: Boolean (default: false)

## Professional Standards

Follow these guidelines for quality outputs:

**IDs:**
- Always use UUID4 (auto-generated via `uuid.uuid4()`)
- Never manually create IDs

**Timestamps:**
- ISO 8601 format with timezone: `"2024-01-01T00:00:00Z"`
- Auto-generated via `datetime.utcnow().isoformat() + "Z"`

**Positioning:**
- Leave 100px margins from edges
- Check for overlaps in scattered layouts
- Use consistent spacing in grids (50-100px typical)

**Ranges:**
- Opacity: 0-1
- Scale: 0.5-2.0 recommended (must be positive)
- Rotation: -15° to +15° for natural look
- Viewport scale: 0.1-5.0

**URLs:**
- Always use absolute URLs
- Never use relative paths
- Support data URIs for embedded images

**Theme:**
- Only "light" or "dark"
- No other values accepted

## Resources

### scripts/

Python modules for canvas manipulation:

- **canvas.py** - Main Canvas class with CRUD operations
- **builder.py** - CanvasBuilder fluent API for complex layouts
- **validator.py** - Validation against JSON Schema and business rules
- **layouts.py** - Layout algorithms (grid, scatter, timeline, circular)

All scripts use standard library plus optional `jsonschema` for validation.

### references/

Detailed format specification:

- **canvas-json-format-spec.md** - Complete technical specification
- **programmatic-generation-guide.md** - Algorithms and best practices
- **canvas-json-examples.md** - Real-world example canvas files
- **canvas-json-schema.json** - JSON Schema for validation
- **typescript-canvas-sdk.md** - TypeScript patterns (for reference)

Reference these files when:
- Understanding format details
- Implementing custom layouts
- Debugging validation errors
- Extending the skill

## Dependencies

- **Python 3.8+** (required)
- **jsonschema** (optional): `pip install jsonschema` - for schema validation

No other dependencies required - uses Python standard library.

## Troubleshooting

### Validation Fails

**Problem:** `canvas.save()` raises ValueError

**Solutions:**
1. Check error messages printed by validator
2. Common issues:
   - Duplicate IDs (use UUID4)
   - Invalid ranges (opacity >1, negative scale)
   - Wrong theme value (must be "light" or "dark")
   - Missing required fields

**Debug:**
```python
# Run validation separately to see all errors
is_valid = canvas.validate()  # Prints all errors
```

### Images Not Positioned Correctly

**Problem:** Items overlap or are off-canvas

**Solutions:**
1. Check canvas dimensions vs item positions
2. Use layout algorithms instead of manual positioning
3. Add margins (100px from edges recommended)

### Cannot Load Existing Canvas

**Problem:** `Canvas.load()` fails

**Solutions:**
1. Check JSON syntax is valid
2. Verify file path is correct
3. Check file permissions

**Debug:**
```python
import json
with open("file.json") as f:
    data = json.load(f)  # Will show JSON syntax errors
```

---

**Quick Reference:**
- Create: `Canvas.create_empty("Name")` or `CanvasBuilder("Name")`
- Load: `Canvas.load("file.json")`
- Add: `canvas.add_image()` / `canvas.add_video()`
- Remove: `canvas.remove_item(id)`
- Update: `canvas.update_item(id, **props)`
- Save: `canvas.save("file.json")`  # Validates automatically
