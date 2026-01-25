"""Layout algorithms for arranging items on canvas."""

import uuid
import random
import math
from typing import List, Dict


def grid_layout(
    urls: List[str],
    columns: int = 3,
    spacing: int = 50,
    image_width: int = 300,
    image_height: int = 200,
    start_x: int = 100,
    start_y: int = 100
) -> List[Dict]:
    """Generate grid layout for images.

    Args:
        urls: List of image URLs
        columns: Number of columns
        spacing: Space between images in pixels
        image_width: Width of each image
        image_height: Height of each image
        start_x: Starting X position
        start_y: Starting Y position

    Returns:
        List of image dicts ready to add to canvas
    """
    items = []

    for i, url in enumerate(urls):
        row = i // columns
        col = i % columns

        x = start_x + col * (image_width + spacing)
        y = start_y + row * (image_height + spacing)

        items.append({
            "id": f"img-{uuid.uuid4()}",
            "src": url,
            "position": {"x": x, "y": y},
            "size": {"width": image_width, "height": image_height},
            "rotation": 0,
            "scale": {"x": 1, "y": 1},
            "opacity": 1,
            "zIndex": i + 1,
            "name": f"Image {i + 1}"
        })

    return items


def scatter_layout(
    urls: List[str],
    canvas_width: int = 1600,
    canvas_height: int = 1200,
    min_size: int = 200,
    max_size: int = 400,
    max_rotation: float = 15,
    start_zindex: int = 1
) -> List[Dict]:
    """Generate scattered layout for natural arrangement.

    Args:
        urls: List of image URLs
        canvas_width: Width of canvas area
        canvas_height: Height of canvas area
        min_size: Minimum image dimension
        max_size: Maximum image dimension
        max_rotation: Maximum rotation in degrees (both directions)
        start_zindex: Starting z-index value

    Returns:
        List of image dicts ready to add to canvas
    """
    items = []
    random.seed(42)  # For reproducibility

    for i, url in enumerate(urls):
        # Random size within range
        width = random.randint(min_size, max_size)
        height = int(width * random.uniform(0.6, 1.4))  # Varied aspect ratio

        # Random position with margin
        margin = 100
        x = random.randint(margin, max(margin + 100, canvas_width - width - margin))
        y = random.randint(margin, max(margin + 100, canvas_height - height - margin))

        # Random rotation
        rotation = random.uniform(-max_rotation, max_rotation)

        # Slight random opacity variation
        opacity = random.uniform(0.9, 1.0)

        items.append({
            "id": f"img-{uuid.uuid4()}",
            "src": url,
            "position": {"x": x, "y": y},
            "size": {"width": width, "height": height},
            "rotation": rotation,
            "scale": {"x": 1, "y": 1},
            "opacity": opacity,
            "zIndex": start_zindex + i,
            "name": f"Image {i + 1}"
        })

    return items


def timeline_layout(
    items: List[Dict],
    item_width: int = 320,
    item_height: int = 180,
    spacing: int = 100,
    start_x: int = 100,
    start_y: int = 200,
    start_zindex: int = 1
) -> List[Dict]:
    """Generate horizontal timeline layout.

    Args:
        items: List of dicts with 'url', 'type' ('image'|'video'), 'duration' (for videos), 'name'
        item_width: Width of each item
        item_height: Height of each item
        spacing: Space between items
        start_x: Starting X position
        start_y: Y position
        start_zindex: Starting z-index value

    Returns:
        List of item dicts ready to add to canvas
    """
    result_items = []
    x_offset = start_x

    for i, item in enumerate(items):
        item_data = {
            "id": f"{item['type']}-{uuid.uuid4()}",
            "src": item['url'],
            "position": {"x": x_offset, "y": start_y},
            "size": {"width": item_width, "height": item_height},
            "rotation": 0,
            "scale": {"x": 1, "y": 1},
            "opacity": 1,
            "zIndex": start_zindex + i,
            "name": item.get('name', f"{item['type'].title()} {i + 1}")
        }

        if item['type'] == 'video':
            item_data.update({
                "duration": item.get('duration', 10),
                "currentTime": 0,
                "volume": 0.5
            })

        result_items.append(item_data)
        x_offset += item_width + spacing

    return result_items


def circular_layout(
    urls: List[str],
    radius: int = 400,
    center_x: int = 600,
    center_y: int = 600,
    image_size: int = 300,
    start_zindex: int = 1
) -> List[Dict]:
    """Generate circular/radial layout.

    Args:
        urls: List of image URLs
        radius: Radius of the circle
        center_x: X coordinate of circle center
        center_y: Y coordinate of circle center
        image_size: Size of each image
        start_zindex: Starting z-index value

    Returns:
        List of image dicts ready to add to canvas
    """
    items = []
    num_images = len(urls)
    angle_step = (2 * math.pi) / num_images

    for i, url in enumerate(urls):
        angle = i * angle_step - (math.pi / 2)  # Start at top

        # Calculate position (offset by half image size to center)
        x = center_x + radius * math.cos(angle) - image_size // 2
        y = center_y + radius * math.sin(angle) - image_size // 2

        # Rotate to face center
        rotation = math.degrees(angle) + 90

        items.append({
            "id": f"img-{uuid.uuid4()}",
            "src": url,
            "position": {"x": x, "y": y},
            "size": {"width": image_size, "height": image_size},
            "rotation": rotation,
            "scale": {"x": 1, "y": 1},
            "opacity": 1,
            "zIndex": start_zindex + i,
            "name": f"Image {i + 1}"
        })

    return items
