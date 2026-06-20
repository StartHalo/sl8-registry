#!/usr/bin/env python3
"""
brand-kit.py — resolve + lock a brand kit (palette / font / logo) into reusable form.

The deep-dive (§5) is honest that the brand lock is PARTIAL at the API level: Recraft's
saved font/composition system lives in the Studio app, not the API. What the API DOES
expose is a `colors` palette array + a `style` enum, plus `--ref` logo attachment and
a font NAME baked into the prompt. This script turns a human-friendly brand kit into:

  1. a Recraft `colors=` POSITIONAL value  (palette lock at the API level)
  2. a one-line "brand clause" to PREPEND to every text-graphic prompt
     (font name + palette hex + logo-placement instruction — the prompt-level lock)
  3. a logo `--ref` path passthrough for gen-graphic.sh -r
  4. (optional) a deterministic logo lockup stamped onto a finished master via Pillow

It reads a brand.json (or CLI flags) and writes brand-lock.json that gen-graphic.sh /
the bot consume. Pure local — no model call.

Pillow self-bootstrap (only needed for `stamp` mode): sl8-video ships NO Pillow.

brand.json shape (all optional):
  {
    "palette": ["#1B7F5C", "#111111", "#FFFFFF"],   # hex; first = primary
    "font": "Montserrat",                            # font NAME baked into prompts
    "logo": "inputs/logo.png",                       # logo file -> --ref + optional stamp
    "logo_corner": "bottom-right",                   # for stamp mode
    "style": "digital_illustration"                  # Recraft style enum
  }

Usage:
  brand-kit.py resolve <brand.json> <out brand-lock.json>
      [--palette "#1B7F5C,#111111"] [--font Montserrat] [--logo inputs/logo.png]
      [--style digital_illustration]
  brand-kit.py stamp <master.jpg> <logo.png> <out.jpg>
      [--corner bottom-right] [--scale 0.16] [--margin 0.04]

Exit 0 ok / 2 usage / 3 logo file missing (resolve still writes the rest + flags it).
"""
import json
import sys


def hex_to_rgb_obj(h):
    h = h.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return {"r": int(h[0:2], 16), "g": int(h[2:4], 16), "b": int(h[4:6], 16)}


def _argval(args, flag, default):
    if flag in args:
        i = args.index(flag)
        if i + 1 < len(args):
            return args[i + 1]
    return default


def cmd_resolve(args):
    pos = [a for a in args if not a.startswith("--")]
    # Strip the values of value-taking flags from pos.
    flags_with_val = {"--palette", "--font", "--logo", "--style"}
    pos = []
    skip = False
    for a in args:
        if skip:
            skip = False
            continue
        if a in flags_with_val:
            skip = True
            continue
        if a.startswith("--"):
            continue
        pos.append(a)

    if len(pos) < 2:
        sys.stderr.write("usage: brand-kit.py resolve <brand.json> <out brand-lock.json> "
                         "[--palette ...] [--font ...] [--logo ...] [--style ...]\n")
        return 2

    brand_path, out_path = pos[0], pos[1]

    brand = {}
    try:
        with open(brand_path) as f:
            brand = json.load(f) or {}
    except Exception:
        brand = {}  # brand.json optional — flags can supply everything

    # CLI flags override file.
    pal_flag = _argval(args, "--palette", None)
    if pal_flag:
        brand["palette"] = [p.strip() for p in pal_flag.split(",") if p.strip()]
    font_flag = _argval(args, "--font", None)
    if font_flag:
        brand["font"] = font_flag
    logo_flag = _argval(args, "--logo", None)
    if logo_flag:
        brand["logo"] = logo_flag
    style_flag = _argval(args, "--style", None)
    if style_flag:
        brand["style"] = style_flag

    palette = brand.get("palette") or []
    font = brand.get("font") or ""
    logo = brand.get("logo") or ""
    style = brand.get("style") or "digital_illustration"

    rc = 0
    flags = []

    # 1) Recraft colors= positional value (palette lock).
    colors_param = ""
    if palette:
        try:
            color_objs = [hex_to_rgb_obj(h) for h in palette]
            colors_param = "colors=" + json.dumps(color_objs, separators=(",", ":"))
        except Exception:
            flags.append("could not parse one or more palette hex values")
    else:
        flags.append("no palette supplied — Recraft palette lock unavailable; brand clause omits hex")

    # 2) Brand clause prepended to text-graphic prompts (the prompt-level lock).
    hex_list = ", ".join(palette) if palette else ""
    clause_bits = []
    if font:
        clause_bits.append(f"use the {font} typeface (or a very close clean sans-serif) for all text")
    if hex_list:
        clause_bits.append(f"use ONLY this brand palette: {hex_list}")
    if logo:
        clause_bits.append("leave clear space in one corner for the brand logo (do not draw a logo)")
    clause_bits.append("keep all text crisp, correctly spelled, and high-contrast against its background")
    brand_clause = "Brand lock: " + "; ".join(clause_bits) + "."

    # 3) Logo --ref passthrough.
    logo_ref = ""
    if logo:
        import os
        if os.path.exists(logo):
            logo_ref = logo
        else:
            flags.append(f"logo file not found: {logo} (logo --ref + stamp unavailable)")
            rc = 3

    lock = {
        "palette": palette,
        "font": font,
        "style": style,
        "logo": logo_ref,
        "colors_param": colors_param,     # pass to gen-graphic.sh as a POSITIONAL arg
        "style_param": f"style={style}",  # Recraft style enum
        "brand_clause": brand_clause,     # PREPEND to text-graphic prompts
        "logo_ref": logo_ref,             # pass to gen-graphic.sh -r
        "partial_lock_note": ("Brand lock is PARTIAL at the API level: palette (Recraft colors=) "
                              "is enforced; font/composition are prompt-level only (the saved "
                              "font/template kit lives in Recraft Studio, not the API). "
                              "Stamp the real logo deterministically with `brand-kit.py stamp`."),
        "flags": flags,
    }
    with open(out_path, "w") as f:
        f.write(json.dumps(lock, indent=2) + "\n")
    print(json.dumps(lock, indent=2))
    return rc


def cmd_stamp(args):
    flags_with_val = {"--corner", "--scale", "--margin"}
    pos = []
    skip = False
    for a in args:
        if skip:
            skip = False
            continue
        if a in flags_with_val:
            skip = True
            continue
        if a.startswith("--"):
            continue
        pos.append(a)

    if len(pos) < 3:
        sys.stderr.write("usage: brand-kit.py stamp <master.jpg> <logo.png> <out.jpg> "
                         "[--corner bottom-right] [--scale 0.16] [--margin 0.04]\n")
        return 2

    master_path, logo_path, out_path = pos[0], pos[1], pos[2]
    corner = _argval(args, "--corner", "bottom-right")
    try:
        scale = float(_argval(args, "--scale", "0.16"))
    except Exception:
        scale = 0.16
    try:
        margin = float(_argval(args, "--margin", "0.04"))
    except Exception:
        margin = 0.04

    try:
        from PIL import Image
    except Exception:
        import subprocess
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "--quiet", "--disable-pip-version-check",
             "--break-system-packages", "Pillow"],
            check=False,
        )
        try:
            from PIL import Image
        except Exception:
            sys.stderr.write("brand-kit stamp: Pillow (PIL) required and could not be auto-installed.\n")
            return 2

    try:
        master = Image.open(master_path).convert("RGBA")
    except Exception as e:
        sys.stderr.write(f"brand-kit stamp: cannot read master {master_path!r}: {e}\n")
        return 2
    try:
        logo = Image.open(logo_path).convert("RGBA")
    except Exception as e:
        sys.stderr.write(f"brand-kit stamp: cannot read logo {logo_path!r}: {e}\n")
        return 2

    mw, mh = master.size
    target_w = max(1, int(mw * scale))
    lw, lh = logo.size
    target_h = max(1, int(lh * (target_w / lw)))
    logo = logo.resize((target_w, target_h), Image.LANCZOS)

    mx = int(mw * margin)
    my = int(mh * margin)
    positions = {
        "bottom-right": (mw - target_w - mx, mh - target_h - my),
        "bottom-left":  (mx, mh - target_h - my),
        "top-right":    (mw - target_w - mx, my),
        "top-left":     (mx, my),
    }
    px, py = positions.get(corner, positions["bottom-right"])

    master.alpha_composite(logo, (px, py))
    out = master.convert("RGB")
    out.info = {}
    out.save(out_path, "JPEG", quality=95)
    sys.stderr.write(f"stamped {logo_path} at {corner} -> {out_path}\n")
    print(out_path)
    return 0


def main():
    if len(sys.argv) < 2:
        sys.stderr.write("usage: brand-kit.py {resolve|stamp} ...\n")
        sys.exit(2)
    sub = sys.argv[1]
    rest = sys.argv[2:]
    if sub == "resolve":
        sys.exit(cmd_resolve(rest))
    elif sub == "stamp":
        sys.exit(cmd_stamp(rest))
    else:
        sys.stderr.write(f"brand-kit.py: unknown subcommand {sub!r} (resolve|stamp)\n")
        sys.exit(2)


if __name__ == "__main__":
    main()
