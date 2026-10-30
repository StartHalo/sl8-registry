#!/usr/bin/env python3
"""Shoot plan helper for marketing-commercial (SL8-authored; no network, no paid call).

  python3 shoot.py check  <shoot.json>                       exit 0 when the plan is ready to quote
  python3 shoot.py prompt <shoot.json> <asset id>            print the eight-layer prompt as sent
  python3 shoot.py params <shoot.json> <asset id> --out F    write the params file (prompt + pinned fields)
  python3 shoot.py report <shoot.json> --manifest M [--out F] delivery table: every attempt with endpoint,
                                                             request id, lever, credits, files, defects
  python3 shoot.py box    <shoot.json> <asset id> --size WxH [--avoid WxH+X+Y]
                                                             copy box in pixels from the asset's copy_box
  python3 shoot.py fit    --gen-box WxH+X+Y --pack-size wxh   place the packshot cutout over the generated product

The plan shape is in references/shoot-plan.md. Exit codes: 0 ok, 1 the plan or a row fails a
rule (each failure printed), 2 usage or an unreadable file.
"""
import json
import re
import sys

LAYERS = ["invariant", "role", "setting", "lighting", "camera", "composition", "tone", "guardrails"]
# One batch axis moves one layer; the invariant and the guardrails never move.
AXIS_LAYER = {"background": "setting", "crop": "composition", "lighting": "lighting",
              "platform": "composition", "colour": "tone"}
GUARD_WORDS = [("logo", "preserve the logo/package"), ("text", "no extra text"), ("label", "no distorted labels")]
EDIT_MODELS = re.compile(r"/edit$")
TEXT_MODELS = re.compile(r"^openai/gpt-image-2")
SEEDANCE = re.compile(r"^bytedance/seedance-2\.0/")
GROK = re.compile(r"^xai/grok-imagine-video/")
# 4:5 and 9:16 sizes are multiples of 16 but not confirmed against the schema's pixel limits (HR2):
# read the raw OpenAPI before the first submit on a GPT Image route at those ratios.
GPT_UNCONFIRMED = {"4:5", "9:16"}
GPT_SIZES = {"1:1": {"width": 1536, "height": 1536}, "3:4": {"width": 1536, "height": 2048},
             "4:3": {"width": 2048, "height": 1536}, "4:5": {"width": 1536, "height": 1920},
             "9:16": {"width": 1152, "height": 2048}, "16:9": {"width": 2048, "height": 1152}}
NB_RATIOS = {"1:1", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "2:3", "3:2", "21:9"}
SEEDANCE_RATIOS = {"21:9", "16:9", "4:3", "1:1", "3:4", "9:16"}
# HR10: how the packshot's label reaches a delivered file.
LABEL_CHOICES = ("composite", "waiver", "not legible")


def die(msg, code=2):
    print(msg, file=sys.stderr)
    sys.exit(code)


def load(path):
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, ValueError) as exc:
        die(f"cannot read {path}: {exc}")


def layers_for(plan, asset):
    base = dict(plan.get("skeleton", {}))
    base.update(asset.get("layers", {}))
    return base


def prompt_text(plan, asset):
    lay = layers_for(plan, asset)
    parts = [str(lay[k]).strip().rstrip(".") for k in LAYERS if str(lay.get(k, "")).strip()]
    return " ".join(t[0].upper() + t[1:] + "." for t in parts)


def find(plan, aid):
    for a in plan.get("assets", []):
        if a.get("id") == aid:
            return a
    die(f"no asset '{aid}' in the plan")


def check(plan):
    bad = []
    if not str(plan.get("project", "")).strip():
        bad.append("project: missing (kebab-case project name)")
    inv = str(plan.get("invariant", "")).strip()
    if not inv:
        bad.append("invariant: missing (one sentence: object, material, packaging, scale, logo rules)")
    elif re.search(r"[.!?]\s+[A-Z]", inv) or ";" in inv:
        bad.append("invariant: one sentence only (no second sentence, no semicolon chain)")
    sk = plan.get("skeleton", {})
    for k in LAYERS:
        if not str(sk.get(k, "")).strip():
            bad.append(f"skeleton.{k}: missing (all eight layers, invariant first, guardrails last)")
    if inv and str(sk.get("invariant", "")).strip() and inv.rstrip(".") not in str(sk.get("invariant")):
        bad.append("skeleton.invariant: must contain the plan's invariant sentence unchanged")
    g = str(sk.get("guardrails", "")).lower()
    for word, what in GUARD_WORDS:
        if word not in g:
            bad.append(f"skeleton.guardrails: must say '{what}'")
    if "logo" in g and not re.search(r"(preserv|unchanged|exact|as in the reference)[^.;]*logo|logo[^.;]*(preserv|unchanged|exact|as in the reference)", g):
        bad.append("skeleton.guardrails: the logo idea must preserve it (preserve, unchanged or exactly), not only mention it")
    sources = plan.get("source", [])
    fidelity = plan.get("fidelity", bool(sources))
    batch = bool(plan.get("batch"))
    assets = plan.get("assets", [])
    if not assets:
        bad.append("assets: none planned")
    ids = [a.get("id") for a in assets]
    if len(ids) != len(set(ids)):
        bad.append("assets: ids must be unique")
    stills = {a.get("id"): a for a in assets if a.get("kind", "still") == "still"}
    seen_axes, baseline = set(), []
    for a in assets:
        aid = a.get("id", "?")
        kind = a.get("kind", "still")
        model = str(a.get("model", ""))
        over = a.get("layers", {})
        if not model:
            bad.append(f"{aid}: model missing")
        for k in over:
            if k not in LAYERS:
                bad.append(f"{aid}: unknown layer '{k}'")
        if "invariant" in over or "guardrails" in over:
            bad.append(f"{aid}: the invariant and guardrail layers are the plan's, never overridden")
        if not str(a.get("summary", "")).strip():
            bad.append(f"{aid}: summary missing (the prompt summary the delivery shows)")
        uses_packshot = bool(sources) and (
            (kind == "still" and EDIT_MODELS.search(model))
            or (kind == "video" and EDIT_MODELS.search(str(stills.get(a.get("from_still"), {}).get("model", "")))))
        if "label" in a and a["label"] == "n/a" and not uses_packshot:
            pass
        elif uses_packshot:
            label = a.get("label", "composite" if kind == "still" else "not legible")
            if label not in LABEL_CHOICES:
                bad.append(f"{aid}: label must be one of {', '.join(LABEL_CHOICES)} (HR10, SKILL.md step 3)")
            elif label == "composite" and kind != "still":
                bad.append(f"{aid}: a clip cannot composite the packshot label: use waiver or not legible")
            elif label == "waiver" and not str(a.get("waiver", "")).strip():
                bad.append(f"{aid}: label waiver needs the brief's words in waiver (HR10, HR20)")
        for r in a.get("refs", []):
            if r not in sources:
                bad.append(f"{aid}: refs entry {r} is not in plan.source")
        cb = a.get("copy_box")
        if cb is not None:
            try:
                x, y, w, h = (float(cb[k]) for k in ("x", "y", "w", "h"))
                if not (0 <= x and 0 <= y and w > 0 and h > 0 and x + w <= 1 and y + h <= 1):
                    raise ValueError
            except (KeyError, TypeError, ValueError):
                bad.append(f"{aid}: copy_box needs x, y, w, h as fractions of the frame, inside it")
        if kind == "still":
            ratio = a.get("ratio")
            if not ratio:
                bad.append(f"{aid}: ratio missing")
            if fidelity and sources and not EDIT_MODELS.search(model):
                bad.append(f"{aid}: a source file is held and fidelity matters: use an edit route (or set fidelity false with a reason)")
            if EDIT_MODELS.search(model) and not sources:
                bad.append(f"{aid}: an edit route needs a source file (plan.source)")
            copy = a.get("copy", "safe-space")
            if copy not in ("safe-space", "none", "exact"):
                bad.append(f"{aid}: copy must be safe-space, none or exact")
            if copy == "exact":
                if not str(a.get("copy_text", "")).strip():
                    bad.append(f"{aid}: copy exact needs copy_text (the approved wording, verbatim)")
                if not TEXT_MODELS.search(model):
                    bad.append(f"{aid}: exact copy runs only on openai/gpt-image-2 (or its /edit)")
                if not str(a.get("waiver", "")).strip():
                    bad.append(f"{aid}: exact copy is a departure from HR10: record the brief's words in waiver")
            if TEXT_MODELS.search(model) and ratio and ratio not in GPT_SIZES:
                bad.append(f"{aid}: no image_size for ratio {ratio} in the table; add one (multiples of 16)")
            if EDIT_MODELS.search(model) and ratio and a.get("fallback") != "none" and not (ratio in GPT_SIZES and ratio in NB_RATIOS):
                bad.append(f"{aid}: ratio {ratio} is not in both the Nano Banana and GPT Image tables, so the chain's fallback would fail at a paid step; use a ratio in both or set fallback \"none\" (no fallback, a failure then opens a gate)")
            if not TEXT_MODELS.search(model) and model.startswith("fal-ai/nano-banana") and ratio and ratio not in NB_RATIOS:
                bad.append(f"{aid}: ratio {ratio} is not a Nano Banana aspect_ratio")
        elif kind == "video":
            explore = bool(a.get("exploration"))
            src = a.get("from_still")
            if not explore:
                if src not in stills:
                    bad.append(f"{aid}: a reveal names the approved still it starts from (from_still), or sets exploration true")
                if model.endswith("text-to-video"):
                    bad.append(f"{aid}: text-to-video only for exploration")
            elif not model.endswith("text-to-video") and src not in stills:
                bad.append(f"{aid}: image-to-video needs from_still")
            if src in stills and a.get("ratio", stills[src].get("ratio")) != stills[src].get("ratio"):
                bad.append(f"{aid}: the clip's ratio must equal its still's ({stills[src].get('ratio')})")
            dur = a.get("duration")
            if SEEDANCE.search(model):
                if not (isinstance(dur, str) and dur.isdigit() and 4 <= int(dur) <= 15):
                    bad.append(f"{aid}: Seedance duration is a bare-integer string \"4\" to \"15\" (never \"5s\" or \"auto\")")
                r = a.get("ratio", stills.get(src, {}).get("ratio"))
                if r not in SEEDANCE_RATIOS:
                    bad.append(f"{aid}: Seedance has no {r}; make the still and the clip at 1:1 or 3:4 and say so")
            if GROK.search(model) and not (isinstance(dur, int) and not isinstance(dur, bool) and 1 <= dur <= 15):
                bad.append(f"{aid}: Grok Imagine duration is an integer 1 to 15")
            if GROK.search(model) and not a.get("extra_params"):
                bad.append(f"{aid}: Grok Imagine has no price or schema row here: read ai-gen info and the raw OpenAPI and put the pinned fields in extra_params (HR2, HR4)")
        else:
            bad.append(f"{aid}: kind must be still or video")
        if batch and kind == "still":
            axis = a.get("axis") or {}
            if len(axis) != 1:
                bad.append(f"{aid}: a batch variant names exactly one axis (background, crop, lighting, platform or colour)")
                continue
            (ax, val), = axis.items()
            if ax not in AXIS_LAYER:
                bad.append(f"{aid}: axis '{ax}' is not one of {', '.join(AXIS_LAYER)}")
                continue
            if (ax, str(val)) in seen_axes:
                bad.append(f"{aid}: axis {ax}={val} is already used by another variant")
            seen_axes.add((ax, str(val)))
            moved = [k for k in over if str(over[k]) != str(sk.get(k))]
            allowed = {AXIS_LAYER[ax]}
            extra = [k for k in moved if k not in allowed]
            if extra:
                bad.append(f"{aid}: axis {ax} moves only layer {AXIS_LAYER[ax]}; also moved: {', '.join(extra)}")
            plan_ratio = plan.get("ratio", a.get("ratio"))
            ratio_moved = a.get("ratio") != plan_ratio
            if ratio_moved and ax not in ("crop", "platform"):
                bad.append(f"{aid}: in a batch the ratio changes only on a crop or platform variant")
            differs = AXIS_LAYER[ax] in moved or (ax == "platform" and ratio_moved)
            if ax == "platform" and not ratio_moved:
                bad.append(f"{aid}: a platform variant changes the ratio from the plan's {plan_ratio}")
            if not differs:
                baseline.append(aid)
    if len(baseline) > 1:
        bad.append(f"assets {', '.join(baseline)}: more than one variant moves no layer, so they would be duplicates; only the skeleton itself may be unmoved")
    return bad


def params(plan, asset):
    model = str(asset.get("model", ""))
    p = {"prompt": prompt_text(plan, asset)}
    kind = asset.get("kind", "still")
    if kind == "still":
        n = int(asset.get("count", 1))
        if TEXT_MODELS.search(model):
            if asset["ratio"] in GPT_UNCONFIRMED:
                print(f"note: GPT Image size for {asset['ratio']} is not confirmed against the schema's pixel limits: read the raw OpenAPI first (HR2)", file=sys.stderr)
            p.update({"image_size": GPT_SIZES[asset["ratio"]], "quality": "high", "num_images": n,
                      "output_format": "png", "sync_mode": False})
        elif model.startswith("fal-ai/nano-banana"):
            p.update({"aspect_ratio": asset["ratio"], "resolution": asset.get("resolution", "2K"), "num_images": n,
                      "output_format": "png", "sync_mode": False, "enable_web_search": False})
        else:
            print(f"note: {model} has no pinned fields here; add them from ai-gen info and the raw OpenAPI (HR2, HR4)", file=sys.stderr)
    else:
        src = asset.get("from_still")
        ratio = asset.get("ratio") or next((a.get("ratio") for a in plan.get("assets", []) if a.get("id") == src), None)
        if SEEDANCE.search(model):
            p.update({"duration": asset.get("duration", "5"), "resolution": asset.get("resolution", "720p"),
                      "generate_audio": bool(asset.get("audio", False))})
            if ratio:
                p["aspect_ratio"] = ratio
        elif GROK.search(model):
            p.update({"duration": asset.get("duration", 5)})
            if model.endswith("text-to-video") and ratio:
                p["aspect_ratio"] = ratio
        else:
            print(f"note: {model} has no pinned fields here; add them from ai-gen info and the raw OpenAPI (HR2, HR4)", file=sys.stderr)
    p.update(asset.get("extra_params", {}))
    return p


def credits_of(row):
    c = row.get("credits") or {}
    for k in ("ledger", "used", "estimate"):
        if c.get(k) is not None:
            return c[k], k
    return None, ""


def report(plan, manifest):
    """Every attempt per asset (attempt, lever, status, credits), the delivered file marked."""
    rows = manifest.get("assets", [])
    out = ["| asset | attempt | lever | endpoint | request id | files | credits | status | delivered | prompt summary | label | defects |",
           "|---|---|---|---|---|---|---|---|---|---|---|---|"]
    total, missing = 0, 0
    for a in plan.get("assets", []):
        aid = a.get("id")
        mine = [r for r in rows if r.get("item") in (aid, f"{aid}-fit")]
        gen = [r for r in mine if r.get("item") == aid]
        fit = [r for r in mine if r.get("item") == f"{aid}-fit"]
        ok = [r for r in gen if r.get("status") in ("done", "accepted")]
        pick = a.get("deliver")
        chosen = next((r for r in gen if r.get("attempt") == pick), None) if pick else (ok[-1] if ok else None)
        label = a.get("label", "composite" if plan.get("source") and a.get("kind", "still") == "still" and EDIT_MODELS.search(str(a.get("model", ""))) else "n/a")
        defects = "; ".join(a.get("defects", [])) or "none found"
        if not mine:
            out.append("| " + " | ".join(str(c) for c in [aid, "-", "-", a.get("model", ""), "not generated", "none", "-", "not run", "no", str(a.get("summary", "")).replace("|", "/"), label, defects.replace("|", "/")]) + " |")
            continue
        for r in sorted(mine, key=lambda r: (r.get("item") != aid, r.get("attempt", 0))):
            c, basis = credits_of(r)
            if c is None and r.get("tool") and not r.get("endpoint"):
                c, basis = 0, "local step"
            if c is None:
                missing += 1
            else:
                total += c
            files = ", ".join(f.get("path", str(f)) if isinstance(f, dict) else str(f) for f in r.get("files", [])) or "none"
            rid = r.get("request_id") or ("none (local step)" if r.get("tool") else "none (sync call)")
            is_fit = r.get("item") != aid
            delivered = "yes" if (is_fit and chosen is not None and r.get("status") in ("done", "accepted")) or r is chosen else "no"
            cells = [aid, r.get("attempt", "-"), r.get("lever", "-"), r.get("endpoint") or r.get("tool") or a.get("model", ""), rid, files,
                     f"{c} ({basis})" if c is not None else "unknown", r.get("status", "?"), delivered,
                     str(a.get("summary", "")).replace("|", "/"), label, defects.replace("|", "/")]
            out.append("| " + " | ".join(str(x) for x in cells) + " |")
    out.append("")
    gens = sum(1 for a in plan.get("assets", []) if any(r.get("item") == a.get("id") for r in rows))
    out.append(f"{len(plan.get('assets', []))} planned; {gens} generated. Credits across the rows above: {total}"
               + (f" ({missing} row(s) unpriced)" if missing else "") + ". The account total is `manifest.mjs budget`.")
    return "\n".join(out) + "\n"


def parse_box(text):
    m = re.fullmatch(r"(\d+)x(\d+)\+(\d+)\+(\d+)", text or "")
    if not m:
        die(f"'{text}' is not WxH+X+Y")
    return tuple(int(v) for v in m.groups())


def fit(argv):
    """Where the packshot cutout goes over the generated product (same place and scale, SKILL.md step 8)."""
    if "--gen-box" not in argv or "--pack-size" not in argv:
        die("fit needs --gen-box WxH+X+Y (the generated cutout's trim box) and --pack-size wxh (the packshot cutout, trimmed)")
    gw, gh, gx, gy = parse_box(argv[argv.index("--gen-box") + 1])
    m = re.fullmatch(r"(\d+)x(\d+)", argv[argv.index("--pack-size") + 1])
    if not m:
        die("--pack-size is wxh")
    pw, ph = int(m.group(1)), int(m.group(2))
    if min(gw, gh, pw, ph) <= 0:
        die("sizes must be positive")
    nw = round(pw * gh / ph)
    if abs(nw - gw) / gw > 0.05:
        print(f"refused: scaled to the generated height the packshot is {nw} px wide against the generated {gw} px: the angle or crop changed. "
              "Do not composite; set the asset's label to waiver or not legible (HR10).")
        return 1
    x = gx + (gw - nw) // 2
    print(f"resize x{gh} geometry +{x}+{gy}")
    return 0


def box(plan, asset, argv):
    if "--size" not in argv:
        die("box needs --size WxH (the final image in pixels)")
    m = re.fullmatch(r"(\d+)x(\d+)", argv[argv.index("--size") + 1])
    if not m:
        die("--size is WxH")
    w, h = int(m.group(1)), int(m.group(2))
    cb = asset.get("copy_box")
    if not cb:
        die(f"{asset.get('id')} has no copy_box in the plan")
    bw, bh, bx, by = round(cb["w"] * w), round(cb["h"] * h), round(cb["x"] * w), round(cb["y"] * h)
    if "--avoid" in argv:
        aw, ah, ax, ay = parse_box(argv[argv.index("--avoid") + 1])
        if bx < ax + aw and ax < bx + bw and by < ay + ah and ay < by + bh:
            print(f"overlap: the copy box {bw}x{bh}+{bx}+{by} covers the product {aw}x{ah}+{ax}+{ay}; move copy_box or regenerate with more room (layer 6)")
            return 1
    print(f"{bw}x{bh}+{bx}+{by}")
    return 0


def main(argv):
    if len(argv) < 2:
        die(__doc__)
    cmd = argv[0]
    if cmd == "fit":
        return fit(argv[1:])
    path = argv[1]
    plan = load(path)
    if cmd == "box":
        if len(argv) < 3:
            die("box needs an asset id")
        return box(plan, find(plan, argv[2]), argv)
    if cmd == "check":
        bad = check(plan)
        for b in bad:
            print(f"FAIL {b}")
        print(f"check: {len(plan.get('assets', []))} assets, {len(bad)} problem(s)")
        return 1 if bad else 0
    if cmd == "prompt":
        if len(argv) < 3:
            die("prompt needs an asset id")
        print(prompt_text(plan, find(plan, argv[2])))
        return 0
    if cmd == "params":
        if len(argv) < 3 or "--out" not in argv:
            die("params needs an asset id and --out <file>")
        bad = check(plan)
        if bad:
            for b in bad:
                print(f"FAIL {b}")
            return 1
        p = params(plan, find(plan, argv[2]))
        out = argv[argv.index("--out") + 1]
        with open(out, "w", encoding="utf-8") as fh:
            json.dump(p, fh, indent=1, ensure_ascii=False)
            fh.write("\n")
        print(json.dumps({k: v for k, v in p.items() if k != "prompt"}))
        return 0
    if cmd == "report":
        if "--manifest" not in argv:
            die("report needs --manifest <artifacts/<project>/manifest.json>")
        text = report(plan, load(argv[argv.index("--manifest") + 1]))
        if "--out" in argv:
            with open(argv[argv.index("--out") + 1], "w", encoding="utf-8") as fh:
                fh.write(text)
        sys.stdout.write(text)
        return 0
    die(__doc__)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
