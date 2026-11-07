#!/usr/bin/env python3
"""Render pixel art sprite specs to PNG and check PNGs, with the Python standard library only.

  png.py render SPEC.json OUT.png
  png.py check  FILE.png [--spec SPEC.json] [--max-colours N] [--count N]

A spec: {"palette": {"k": "#1b1b1b", ...}, "size": 16, "scale": 4, "columns": 4,
         "sprites": [{"name": "heart", "rows": ["....kk..", ...]}]}
"." is transparent. Each sprite is size x size; the sheet puts `columns` sprites across with a
1-pixel transparent gap (at 1x) between cells, then enlarges everything `scale` times.
`check` prints one JSON object and exits 1 when it finds a problem.
"""
import argparse
import json
import struct
import sys
import zlib

TRANSPARENT = "."


def parse_hex(value):
    v = value.strip().lstrip("#")
    if len(v) not in (6, 8) or any(c not in "0123456789abcdefABCDEF" for c in v):
        raise ValueError(f"not a hex colour: {value!r}")
    r, g, b = int(v[0:2], 16), int(v[2:4], 16), int(v[4:6], 16)
    a = int(v[6:8], 16) if len(v) == 8 else 255
    return (r, g, b, a)


def spec_problems(spec):
    """Problems with a spec, as strings (empty when it is good)."""
    problems = []
    palette = spec.get("palette")
    size = spec.get("size")
    sprites = spec.get("sprites")
    if not isinstance(palette, dict) or not palette:
        return ["palette must be a non-empty object of one character to a hex colour"]
    for ch, colour in palette.items():
        if len(ch) != 1 or ch == TRANSPARENT:
            problems.append(f"palette key {ch!r} must be one character other than '.'")
        try:
            parse_hex(colour)
        except ValueError as exc:
            problems.append(str(exc))
    if not isinstance(size, int) or not 4 <= size <= 64:
        problems.append("size must be a whole number from 4 to 64")
        return problems
    if not isinstance(sprites, list) or not sprites:
        return problems + ["sprites must be a non-empty list"]
    names = set()
    for i, sprite in enumerate(sprites):
        name = sprite.get("name") or f"#{i + 1}"
        if name in names:
            problems.append(f"sprite name {name!r} is used twice")
        names.add(name)
        rows = sprite.get("rows")
        if not isinstance(rows, list) or len(rows) != size:
            problems.append(f"{name}: needs {size} rows, has {len(rows) if isinstance(rows, list) else 0}")
            continue
        filled = 0
        for y, row in enumerate(rows):
            if len(row) != size:
                problems.append(f"{name}: row {y + 1} is {len(row)} long, not {size}")
            for ch in row:
                if ch == TRANSPARENT:
                    continue
                if ch not in palette:
                    problems.append(f"{name}: row {y + 1} uses {ch!r}, not in the palette")
                    break
                filled += 1
        if filled == 0:
            problems.append(f"{name}: is empty")
    return problems


def sheet_geometry(spec):
    size = spec["size"]
    scale = int(spec.get("scale", 1))
    count = len(spec["sprites"])
    columns = max(1, min(int(spec.get("columns", count)), count))
    rows = (count + columns - 1) // columns
    cell = size + 1
    width = (columns * cell - 1) * scale
    height = (rows * cell - 1) * scale
    return size, scale, columns, width, height


def render_pixels(spec):
    """RGBA rows for the whole sheet."""
    size, scale, columns, width, height = sheet_geometry(spec)
    colours = {ch: parse_hex(c) for ch, c in spec["palette"].items()}
    clear = (0, 0, 0, 0)
    grid = [[clear] * width for _ in range(height)]
    for index, sprite in enumerate(spec["sprites"]):
        ox = (index % columns) * (size + 1) * scale
        oy = (index // columns) * (size + 1) * scale
        for y, row in enumerate(sprite["rows"]):
            for x, ch in enumerate(row):
                if ch == TRANSPARENT:
                    continue
                for dy in range(scale):
                    line = grid[oy + y * scale + dy]
                    for dx in range(scale):
                        line[ox + x * scale + dx] = colours[ch]
    return width, height, grid


def write_png(path, width, height, grid):
    raw = bytearray()
    for line in grid:
        raw.append(0)
        for r, g, b, a in line:
            raw += bytes((r, g, b, a))

    def chunk(kind, data):
        body = kind + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)

    header = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    with open(path, "wb") as fh:
        fh.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header)
                 + chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + chunk(b"IEND", b""))


def read_png(path):
    """(width, height, rows of RGBA tuples) for 8-bit RGB or RGBA, non-interlaced PNGs."""
    with open(path, "rb") as fh:
        data = fh.read()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("not a PNG file")
    pos, idat, width = 8, bytearray(), None
    while pos < len(data):
        length = struct.unpack(">I", data[pos:pos + 4])[0]
        kind = data[pos + 4:pos + 8]
        body = data[pos + 8:pos + 8 + length]
        pos += 12 + length
        if kind == b"IHDR":
            width, height, depth, ctype, _, _, interlace = struct.unpack(">IIBBBBB", body)
            if depth != 8 or ctype not in (2, 6) or interlace:
                raise ValueError("only 8-bit RGB or RGBA, non-interlaced PNGs are read")
            channels = 4 if ctype == 6 else 3
        elif kind == b"IDAT":
            idat += body
        elif kind == b"IEND":
            break
    if width is None:
        raise ValueError("no IHDR chunk")
    raw = zlib.decompress(bytes(idat))
    stride = width * channels
    rows, prev, i = [], bytearray(stride), 0
    for _ in range(height):
        ftype, line = raw[i], bytearray(raw[i + 1:i + 1 + stride])
        i += 1 + stride
        for x in range(stride):
            a = line[x - channels] if x >= channels else 0
            b = prev[x]
            c = prev[x - channels] if x >= channels else 0
            if ftype == 1:
                line[x] = (line[x] + a) & 0xFF
            elif ftype == 2:
                line[x] = (line[x] + b) & 0xFF
            elif ftype == 3:
                line[x] = (line[x] + (a + b) // 2) & 0xFF
            elif ftype == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                pred = a if pa <= pb and pa <= pc else (b if pb <= pc else c)
                line[x] = (line[x] + pred) & 0xFF
        rows.append([tuple(line[x:x + channels]) + ((255,) if channels == 3 else ())
                     for x in range(0, stride, channels)])
        prev = line
    return width, height, rows


def cmd_render(args):
    with open(args.spec) as fh:
        spec = json.load(fh)
    problems = spec_problems(spec)
    if problems:
        print(json.dumps({"ok": False, "problems": problems}, indent=1))
        return 1
    width, height, grid = render_pixels(spec)
    write_png(args.out, width, height, grid)
    print(json.dumps({"ok": True, "out": args.out, "width": width, "height": height,
                      "sprites": len(spec["sprites"])}))
    return 0


def cmd_check(args):
    problems, report = [], {"file": args.file}
    try:
        width, height, rows = read_png(args.file)
    except (OSError, ValueError, zlib.error) as exc:
        print(json.dumps({"ok": False, "file": args.file, "problems": [str(exc)]}, indent=1))
        return 1
    colours = {px[:3] for row in rows for px in row if px[3] > 0}
    report.update(width=width, height=height, colours=len(colours))
    if not colours:
        problems.append("the image is empty")
    if args.max_colours is not None and len(colours) > args.max_colours:
        problems.append(f"{len(colours)} colours, more than {args.max_colours}")
    if args.spec:
        with open(args.spec) as fh:
            spec = json.load(fh)
        problems += spec_problems(spec)
        if not problems:
            w, h, grid = render_pixels(spec)
            report["sprites"] = len(spec["sprites"])
            if (w, h) != (width, height):
                problems.append(f"PNG is {width}x{height}, its spec renders {w}x{h}")
            elif any(tuple(a) != tuple(b) for ra, rb in zip(rows, grid) for a, b in zip(ra, rb)
                     if a[3] > 0 or b[3] > 0):
                problems.append("PNG pixels differ from what its spec renders")
            palette = {parse_hex(c)[:3] for c in spec["palette"].values()}
            if colours - palette:
                problems.append("PNG uses colours outside the spec's palette")
            if args.count is not None and len(spec["sprites"]) != args.count:
                problems.append(f"{len(spec['sprites'])} sprites, expected {args.count}")
    elif args.count is not None:
        problems.append("--count needs --spec")
    report["ok"] = not problems
    report["problems"] = problems
    print(json.dumps(report, indent=1))
    return 0 if not problems else 1


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("render", help="render a spec to a PNG sheet")
    r.add_argument("spec")
    r.add_argument("out")
    c = sub.add_parser("check", help="check a PNG (and that it matches its spec)")
    c.add_argument("file")
    c.add_argument("--spec")
    c.add_argument("--max-colours", type=int)
    c.add_argument("--count", type=int)
    args = parser.parse_args(argv)
    return cmd_render(args) if args.cmd == "render" else cmd_check(args)


if __name__ == "__main__":
    sys.exit(main())
