#!/usr/bin/env python3
"""
motion-prompt.py — build a STRICT-PRODUCT image-to-video motion prompt.

This is pure string assembly (no model, no network). It encodes the two
load-bearing disciplines from references/seedance-dialect.md +
references/motion-discipline.md:

  1. The strict-product formula (verbatim from seedance.tv):
       [format], [product] on [surface], [one camera move], [lighting],
       [commercial style], keep [logo/label/shape] stable, no extra text,
       no distorted details.
  2. ONE camera move only, drawn from the SAFE whitelist (slow push-in /
     subtle orbit / gentle pull-out / soft light sweep). Aggressive moves
     ("fast", whip-pan, zoom-crash, fast spin) MELT product geometry, so they
     are rejected — the script substitutes the closest safe move and records a
     note. Shorter prompts with one clear motion beat long prompts with many
     creative instructions.

It emits the assembled prompt to stdout (and, with --out, to a file), plus a
companion JSON note (with --note) recording the chosen move, any substitution,
and the requested duration/aspect so the caller (gen-video.sh) and the QC step
can read the intent without re-parsing prose.

Usage:
  motion-prompt.py --product "<name>" [options]
    --product NAME        product name/description (required; e.g. "a matte
                          black water bottle"). NEVER invent detail the source
                          frame does not show — pass only what the hero shows.
    --move MOVE           one camera move (default push-in). One of the SAFE
                          whitelist; an aggressive move is auto-substituted.
    --surface TEXT        the surface/setting (default "a clean studio surface")
    --lighting TEXT       lighting (default "soft diffused studio lighting")
    --style TEXT          commercial style (default "premium commercial ecommerce style")
    --stable TEXT         what must stay stable (default "the logo, label and product shape")
    --format TEXT         the format clause (default "9:16 vertical product video")
    --aspect 9:16         aspect ratio recorded into the note (default 9:16)
    --duration 5          duration seconds recorded into the note (default 5)
    --multishot           emit the time-coded multi-shot (parenthetical-seconds)
                          hero-arc variant instead of the single-move line.
    --no-suffix           omit the community quality suffix.
    --out FILE            also write the prompt text to FILE.
    --note FILE           also write the JSON note to FILE.

Exit codes:
  0  prompt written
  2  usage error (no --product)
"""
import json
import sys

# The SAFE camera-move whitelist → the directional clause it expands to.
# Keys are normalized (lowercased, spaces/hyphens/underscores stripped).
SAFE_MOVES = {
    "pushin": "a slow, smooth push-in toward the product",
    "push-in": "a slow, smooth push-in toward the product",
    "dollyin": "a slow, smooth push-in toward the product",
    "orbit": "a subtle, slow orbit around the product",
    "subtleorbit": "a subtle, slow orbit around the product",
    "rotate": "a subtle, slow orbit around the product",
    "pullout": "a gentle pull-out to a centered hero frame",
    "pull-out": "a gentle pull-out to a centered hero frame",
    "dollyout": "a gentle pull-out to a centered hero frame",
    "lightsweep": "a soft light sweep rakes gently across the product surface, the camera holds nearly still",
    "light-sweep": "a soft light sweep rakes gently across the product surface, the camera holds nearly still",
    "static": "the camera holds a slow, almost-static locked frame on the product",
    "lockedoff": "the camera holds a slow, almost-static locked frame on the product",
}
DEFAULT_MOVE = "pushin"

# Aggressive / banned moves → the SAFE move we substitute, plus a human label.
# These melt geometry (per motion-discipline.md); we never pass them through.
BANNED_MOVES = {
    "fast": ("pushin", "fast (unqualified) — accelerates everything, guarantees jitter/warp"),
    "whippan": ("orbit", "whip-pan — melts geometry"),
    "whip-pan": ("orbit", "whip-pan — melts geometry"),
    "crash": ("pushin", "zoom-crash — melts geometry"),
    "crashzoom": ("pushin", "crash-zoom — melts geometry"),
    "fastspin": ("orbit", "fast spin — melts geometry"),
    "fastorbit": ("orbit", "fast orbit — melts geometry"),
    "shake": ("static", "camera shake — destabilizes the product"),
    "handheld": ("static", "aggressive handheld — destabilizes the product"),
    "flythrough": ("pushin", "fly-through — invents geometry"),
    "snapzoom": ("pushin", "snap-zoom — melts geometry"),
}

QUALITY_SUFFIX = (
    "sharp clarity, natural colors, stable picture, no blur, no ghosting, "
    "no flickering, no warped text, no distorted details"
)


def _norm(s):
    return "".join(c for c in s.lower() if c.isalnum())


def _argval(args, flag, default):
    if flag in args:
        i = args.index(flag)
        if i + 1 < len(args):
            return args[i + 1]
    return default


def resolve_move(requested):
    """Return (clause, normalized_key, substitution_note_or_None)."""
    key = _norm(requested) if requested else _norm(DEFAULT_MOVE)
    if key in BANNED_MOVES:
        safe_key, why = BANNED_MOVES[key]
        return SAFE_MOVES[safe_key], safe_key, (
            f"requested move '{requested}' is BANNED ({why}); "
            f"substituted the safe move '{safe_key}'"
        )
    if key in SAFE_MOVES:
        return SAFE_MOVES[key], key, None
    # Unknown move → default to the safest (push-in) and flag it.
    return SAFE_MOVES[DEFAULT_MOVE], DEFAULT_MOVE, (
        f"unknown move '{requested}' — defaulted to '{DEFAULT_MOVE}' "
        f"(only the safe whitelist is allowed; see motion-discipline.md)"
    )


def build_single(product, move_clause, surface, lighting, style, stable, fmt, suffix):
    """The strict-product single-move line (the default, safest path)."""
    line = (
        f"{fmt}, {product} on {surface}, {move_clause}, {lighting}, {style}; "
        f"keep {stable} stable and readable; preserve the product color, shape "
        f"and proportions exactly; do not add, remove, or invent any detail, "
        f"object, prop, or text; no warped text, no distorted details"
    )
    if suffix:
        line += f". {QUALITY_SUFFIX}"
    return line


def build_multishot(product, move_clause, surface, lighting, style, stable, fmt, suffix):
    """
    The time-coded 4-beat hero arc (parenthetical-seconds Seedance dialect).
    Still ONE primary move per beat, all slow. The chosen move seeds beat 2/4.
    """
    beats = [
        f"(0-3s) macro shot of {product} on {surface}, shallow depth of field, "
        f"soft rim light catching the edges, keep {stable} stable",
        f"(3-7s) {move_clause}, {lighting} rakes gently across the surface "
        f"revealing the label texture, keep {stable} readable",
        f"(7-11s) slow detail moment, preserve the product color, shape and "
        f"proportions exactly; no invented detail, no warped text",
        f"(11-15s) gentle pull-out to a centered hero frame, product isolated, "
        f"{style}, sharp clarity, stable picture",
    ]
    body = f"{fmt}. " + " ".join(beats)
    if suffix:
        body += f". {QUALITY_SUFFIX}"
    return body


def main():
    args = sys.argv[1:]
    product = _argval(args, "--product", None)
    if not product:
        sys.stderr.write(
            "usage: motion-prompt.py --product \"<name>\" [--move push-in] "
            "[--surface ...] [--lighting ...] [--style ...] [--stable ...] "
            "[--format ...] [--aspect 9:16] [--duration 5] [--multishot] "
            "[--no-suffix] [--out FILE] [--note FILE]\n")
        sys.exit(2)

    move_req = _argval(args, "--move", DEFAULT_MOVE)
    surface = _argval(args, "--surface", "a clean studio surface")
    lighting = _argval(args, "--lighting", "soft diffused studio lighting")
    style = _argval(args, "--style", "premium commercial ecommerce style")
    stable = _argval(args, "--stable", "the logo, label and product shape")
    fmt = _argval(args, "--format", "9:16 vertical product video")
    aspect = _argval(args, "--aspect", "9:16")
    duration = _argval(args, "--duration", "5")
    suffix = "--no-suffix" not in args
    multishot = "--multishot" in args

    move_clause, move_key, sub_note = resolve_move(move_req)

    if multishot:
        prompt = build_multishot(product, move_clause, surface, lighting, style,
                                 stable, fmt, suffix)
    else:
        prompt = build_single(product, move_clause, surface, lighting, style,
                              stable, fmt, suffix)

    out = _argval(args, "--out", None)
    if out:
        with open(out, "w") as f:
            f.write(prompt + "\n")

    note_path = _argval(args, "--note", None)
    if note_path:
        note = {
            "product": product,
            "requested_move": move_req,
            "resolved_move": move_key,
            "substitution": sub_note,        # None if the requested move was safe
            "multishot": multishot,
            "aspect": aspect,
            "duration": duration,
            "quality_suffix": suffix,
            "prompt": prompt,
        }
        with open(note_path, "w") as f:
            f.write(json.dumps(note, indent=2) + "\n")

    if sub_note:
        sys.stderr.write(f"motion-prompt: {sub_note}\n")

    print(prompt)
    sys.exit(0)


if __name__ == "__main__":
    main()
