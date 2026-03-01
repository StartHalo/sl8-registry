#!/usr/bin/env python3
"""
Create a canvas with 4 greeting card images in a 2x2 grid layout.
"""
import json
import subprocess

# Import canvas modules
from scripts.builder import CanvasBuilder

# Extract URLs from the JSON files using bash
urls = []
names = ["Birthday Card", "Thank You Card", "Holiday Card", "Congratulations Card"]

for i in range(1, 5):
    cmd = f"tail -20 /tmp/greeting{i}.json | grep -A 20 '^{{' | python3 -c \"import sys, json; data = json.load(sys.stdin); print(data['storageUrl'])\""
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode == 0 and result.stdout.strip():
        urls.append(result.stdout.strip())
        print(f"✓ {names[i-1]}")
    else:
        print(f"✗ Failed to extract URL for {names[i-1]}")

print(f"\nFound {len(urls)} image URLs")

if len(urls) != 4:
    print("Error: Expected 4 URLs but found", len(urls))
    exit(1)

# Create canvas with grid layout
builder = CanvasBuilder("Greeting Cards Gallery", description="Four AI-generated greeting cards")

# Add images in a 2x2 grid
builder.add_image_grid(
    image_urls=urls,
    columns=2,          # 2 columns for 2x2 grid
    spacing=100,        # 100px spacing between cards
    image_width=800,    # Each card 800px wide
    image_height=800    # Each card 800px tall
)

# Set viewport to center on the grid
builder.set_viewport(x=-200, y=-200, scale=0.6)

# Build and save
canvas = builder.build()
output_path = "/tmp/greeting-cards-canvas.json"
canvas.save(output_path)

print(f"\n✅ Canvas created successfully!")
print(f"📄 Saved to: {output_path}")
print(f"🖼️  Contains {len(urls)} greeting card images in a 2x2 grid")
print(f"\n🎨 Cards included:")
for i, name in enumerate(names):
    print(f"   {i+1}. {name}")
