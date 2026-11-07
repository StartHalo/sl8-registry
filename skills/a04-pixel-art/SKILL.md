---
name: a04-pixel-art
description: The pixel art agency's own skill - the sprite-pack lane (style sheet, sprites drawn as character grids, a sheet per batch, checks) and scripts/png.py, which renders a grid spec to PNG and checks a PNG's size, palette and sprite count with no image library. Use when a plan task opens the sprite-pack lane, and for every task that draws, revises or checks a sprite.
metadata:
  status: draft
  version: 0.1.0
---

# a04-pixel-art

| Entry | Library id |
|---|---|
| `lanes/sprite-pack.md` | `pixel-art/sprite-pack` |

## Drawing a sprite

A sprite is a grid of characters, one per pixel, `.` for transparent and one character per palette colour.
Write the spec as JSON in `work/pixel/` and render it; never hand-write image bytes.

```json
{"palette": {"k": "#1b1b1b", "w": "#f4f4f4", "r": "#c0392b"},
 "size": 16, "scale": 4, "columns": 4,
 "sprites": [{"name": "heart", "rows": ["................", "..kk......kk....", "..."]}]}
```

- `python3 scripts/png.py render work/pixel/batch-1.json work/pixel/batch-1.png` draws every sprite in a sheet
  (`columns` across, each `size`x`size`, enlarged `scale` times, 1 transparent pixel between cells at 1x).
- `python3 scripts/png.py check work/pixel/batch-1.png --spec work/pixel/batch-1.json` prints JSON and exits 1
  on a problem: rows not `size` long, a character outside the palette, more colours than `user.md` allows, an
  empty sprite, or a PNG that doesn't match its spec.
- Paths: the script is at `~/.sl8/bot/.claude/skills/a04-pixel-art/scripts/png.py`. Python 3 standard library only.

The check is the deliverable's `done_when` floor; the evaluator then judges the look against the style sheet.
