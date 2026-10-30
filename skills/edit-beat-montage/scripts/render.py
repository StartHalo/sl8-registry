#!/usr/bin/env python3
"""EDL frame renderer for a beat-cut montage (edit-beat-montage).

  render.py <edl.json> --check [--beats work/<p>/beats.json]
      validates the EDL (contiguous shots, sources long enough, words inside their shot, fonts
      installed) and prints the plan; nothing is rendered. With --beats it also prints, for every
      shot start and for total_frames, the beat number and the offset in frames from the beat grid,
      and fails when an offset is over 1 frame unless the EDL lists that frame in "off_grid" with a
      reason: {"off_grid": [{"f": 77, "why": "vocal hit"}]}.
  render.py <edl.json> --preview work/<p>/preview [--frames 12,40,77]
      PNG frames only: the middle of every shot, each title's entrance and middle, each transition.
  render.py <edl.json> --slice 0:60 --out work/<p>/slice.mp4
      frames [a, b) through the full pipeline: the two-second test of a new EDL.
  render.py <edl.json> --out work/<p>/video.mp4 [--no-interp]
      (--no-interp renders speed under 1 by frame blending instead of motion interpolation: the fast
      fallback when minterpolate is too slow.) The picture, once: per shot ffmpeg decodes raw RGB frames into numpy, the script applies
      levels, black-and-white, motion, transitions, flashes and titles, and pipes the frames into
      one libx264 encode (slow, CRF 16, yuv420p, BT.709). No audio: mix_master.py adds it.
  render.py <edl.json> --plain --out work/<p>/video.mp4
      fallback: one ffmpeg filter graph of trims and crops on the same cut frames, no per-frame
      Python; grade, motion, flashes and titles are dropped.

The EDL fields and every default are in references/edl.md. Exit 0 done; 1 a bad EDL or a failed
render (nothing usable written); 2 a tool, library or font is missing.
SL8-authored from the recipe recorded in the capability assessment (WF27-a1 steps 10-12); the
vendor supplies no render engine, so every constant marked "assumed" in references/edl.md is ours.
"""
import argparse
import json
import math
import os
import shutil
import subprocess
import sys
import tempfile
import zlib

sys.dont_write_bytecode = True

D = {"tau": 4.0, "shake_tau": 6.0, "zoom_strength": 0.18, "whip_frac": 0.12, "bright": 0.6,
     "stroke": 0.045, "pop_frames": 3, "trail": (0.35, 0.15), "shadow": (0.16, 0.62), "glow": (0.07, 0.32),
     "tshake_tau": 8.0, "grain": 2.5 / 255, "contrast": 1.12, "s_curve": 0.3}
NO_INTERP = False  # set by --no-interp
WEIGHT = {"regular": "", "bold": ":weight=bold", "heavy": ":weight=black", "black": ":weight=black"}


def fail(code, msg):
    print(f"FAIL {msg}", file=sys.stderr)
    sys.exit(code)


def warn(msg):
    print(f"WARN {msg}", file=sys.stderr)


def need(tool):
    if not shutil.which(tool):
        fail(2, f"{tool} is not on PATH: the machine is broken (HR21), report it")


def probe(path):
    p = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                        "format=duration:stream=codec_type,codec_name,width,height,nb_frames:stream_tags=rotate:"
                        "stream_side_data=rotation", "-of", "json", path], capture_output=True)
    if p.returncode != 0:
        fail(1, f"{path}: ffprobe cannot read it")
    d = json.loads(p.stdout)
    v = next((s for s in d.get("streams", []) if s.get("codec_type") == "video"), None)
    if v is None:
        fail(1, f"{path}: no picture stream")
    w, h, rot = int(v["width"]), int(v["height"]), 0
    try:
        rot = int(float((v.get("tags") or {}).get("rotate", 0)))
    except ValueError:
        pass
    for sd in v.get("side_data_list") or []:
        if "rotation" in sd:
            rot = int(float(sd["rotation"]))
    if abs(rot) % 180 == 90:
        w, h = h, w
    dur = float(d.get("format", {}).get("duration") or 0)
    still = v.get("codec_name") in ("png", "mjpeg", "webp", "bmp", "tiff", "gif") and (
        dur == 0 or str(v.get("nb_frames")) in ("1", "None"))
    return {"w": w, "h": h, "dur": dur, "still": still}


def audio_len(path):
    p = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                       capture_output=True, text=True)
    try:
        return float(p.stdout.strip())
    except ValueError:
        return None


def resolve_font(style, weight):
    if style.get("file"):
        if not os.path.exists(style["file"]):
            fail(2, f"font file {style['file']} does not exist")
        return style["file"]
    fam = style.get("font")
    if not fam:
        fail(1, "a style needs 'font' (an installed family) or 'file'")
    if not (shutil.which("fc-match") and shutil.which("fc-list")):
        fail(2, "fc-match / fc-list missing: cannot prove the face is installed (never a default font)")
    listed = subprocess.run(["fc-list", ":", "family"], capture_output=True, text=True).stdout.lower()
    names = {n.strip() for line in listed.splitlines() for n in line.split(",")}
    if fam.lower() not in names:
        fail(2, f"face '{fam}' is not installed (fc-list): pick the closest installed bold face, "
                "never a default font")
    out = subprocess.run(["fc-match", "-f", "%{file}|%{family}", fam + WEIGHT.get(weight, "")],
                         capture_output=True, text=True).stdout
    path, _, got = out.partition("|")
    if fam.lower() not in [g.strip().lower() for g in got.split(",")]:
        fail(2, f"fc-match gave '{got}' for '{fam}': the face is not usable")
    return path


def load(path):
    try:
        e = json.load(open(path, encoding="utf-8"))
    except (OSError, ValueError) as x:
        fail(1, f"{path}: not readable JSON ({x})")
    try:
        return load_checked(e)
    except (KeyError, TypeError) as x:
        fail(1, f"{path}: the EDL is missing or has a wrong value for {x} (see references/edl.md)")


def load_checked(e):
    errs, warns = [], []
    for k, v in (e.get("render") or {}).items():
        if k not in D:
            errs.append(f"render.{k} is not a render constant ({', '.join(sorted(D))})")
        else:
            D[k] = tuple(v) if isinstance(D[k], tuple) else type(D[k])(v)
    for k in ("w", "h", "fps", "total_frames", "shots"):
        if k not in e:
            errs.append(f"missing header field '{k}'")
    if errs:
        fail(1, "; ".join(errs))
    W, H, fps, total = int(e["w"]), int(e["h"]), float(e["fps"]), int(e["total_frames"])
    if W % 2 or H % 2 or W <= 0 or H <= 0:
        errs.append("w and h must be positive even numbers")
    e.setdefault("styles", {"title": {"font": "Anton", "color": "#FFFFFF"}})
    e.setdefault("flashes", {})
    e.setdefault("text", [])
    e.setdefault("lines", [])
    shots = sorted(e["shots"], key=lambda s: s["start_f"])
    prev = 0
    for i, s in enumerate(shots):
        s.setdefault("in", 0.0)
        s.setdefault("cx", 0.5)
        s.setdefault("cy", 0.5)
        s.setdefault("zoom", 1.0)
        s.setdefault("speed", 1.0)
        s.setdefault("interp", s["speed"] < 1 and not NO_INTERP)
        for k in ("punch", "push", "shake"):
            s.setdefault(k, 0.0)
        s.setdefault("tau", D["tau"])
        s.setdefault("lv", "auto")
        s.setdefault("bw", False)
        n = s["end_f"] - s["start_f"]
        tag = f"shot {i + 1} ({s['start_f']}-{s['end_f']})"
        if s["start_f"] != prev:
            errs.append(f"{tag}: starts at {s['start_f']}, expected {prev} (shots must be contiguous)")
        prev = s["end_f"]
        if n < 1:
            errs.append(f"{tag}: end_f must be after start_f")
        if s["zoom"] < 1 or s["speed"] <= 0:
            errs.append(f"{tag}: zoom must be >= 1 and speed > 0")
        if not os.path.exists(s["src"]):
            errs.append(f"{tag}: src {s['src']} does not exist")
            continue
        info = probe(s["src"])
        s["_info"] = info
        if not info["still"]:
            need_s = n / fps * s["speed"]
            if s["in"] + need_s > info["dur"] + 0.5 / fps:
                errs.append(f"{tag}: needs {need_s:.2f} s of {s['src']} from {s['in']} s, it has {info['dur']:.2f} s")
        for side in ("tin", "tout"):
            t = s.get(side)
            if t:
                if t.get("type") not in ("zoom", "whip"):
                    errs.append(f"{tag}: {side}.type must be zoom or whip")
                t.setdefault("f", 3)
                t.setdefault("dir", "left")
                if t["dir"] not in ("left", "right", "up", "down"):
                    errs.append(f"{tag}: {side}.dir must be left, right, up or down")
                if t["f"] * 2 > n:
                    errs.append(f"{tag}: {side} of {t['f']} frames is longer than half the shot")
        lv = s["lv"]
        if not (lv in ("auto", "night", "off") or isinstance(lv, dict)):
            errs.append(f"{tag}: lv must be auto, night, off or an object")
    if prev != total:
        errs.append(f"shots end at {prev}, total_frames is {total}")
    e["shots"] = shots
    for t in e["text"]:
        t.setdefault("cx", 0.5)
        t.setdefault("cy", 0.85)
        t.setdefault("cap", 0.06)
        t.setdefault("pop", 0.2)
        t.setdefault("tshake", 0)
        t.setdefault("squeeze", 1.0)
        t.setdefault("weight", "bold")
        t.setdefault("max_w", 0.9)
        t.setdefault("style", "title")
        if not (0 <= t["f0"] < t["f1"] <= total):
            errs.append(f"text '{t['word']}': needs 0 <= f0 < f1 <= total_frames")
        elif not any(s["start_f"] <= t["f0"] and t["f1"] <= s["end_f"] for s in shots):
            errs.append(f"text '{t['word']}' ({t['f0']}-{t['f1']}) crosses a cut: split it into two entries with the same "
                        "text, one per shot (words.py place does this), or move the cut to a beat clear of the word")
        if t["style"] not in e["styles"]:
            errs.append(f"text '{t['word']}': style '{t['style']}' is not in styles")
    for ln in e["lines"]:
        if not os.path.exists(ln.get("src", "")):
            errs.append(f"line at frame {ln.get('f')}: src missing")
        cover = next((s for s in shots if s["start_f"] <= ln["f"] < s["end_f"]), None)
        if cover is not None and cover["speed"] != 1:
            errs.append(f"line at frame {ln['f']}: shot at {cover['start_f']} has speed {cover['speed']}; lines are "
                        "not offered on a retimed shot (the picture changes speed, the line does not)")
    if e.get("audio"):
        if not os.path.exists(e["audio"]):
            errs.append(f"audio {e['audio']} does not exist")
        else:
            al = audio_len(e["audio"])
            need_a = e.get("audio_in", 0) + total / fps
            if al is not None and al + 1e-3 < need_a:
                errs.append(f"audio is {al:.2f} s; the edit needs {need_a:.2f} s from audio_in")
    else:
        warns.append("no audio in the EDL: mix_master.py will refuse it (see SKILL.md step 6)")
    return e, errs, warns


def crop_box(info, W, H, s):
    sw, sh = info["w"], info["h"]
    A = W / H
    cw0, ch0 = (sh * A, sh) if sw / sh > A else (sw, sw / A)
    cw, ch = cw0 / s["zoom"], ch0 / s["zoom"]
    x = min(max(s["cx"] * sw - cw / 2, 0), sw - cw)
    y = min(max(s["cy"] * sh - ch / 2, 0), sh - ch)
    return int(cw) // 2 * 2, int(ch) // 2 * 2, int(x), int(y)


def decode_args(s, fps, W, H, n, scale_to=None, levels_pass=False):
    cw, ch, x, y = crop_box(s["_info"], W, H, s)
    ow, oh = scale_to or (W, H)
    # Crop and scale come first, so retiming and interpolation work on the output-sized picture.
    chain = f"crop={cw}:{ch}:{x}:{y},scale={ow}:{oh}:flags=lanczos,setsar=1,"
    if s["_info"]["still"]:
        chain += "format=rgb24"
        inp = ["-loop", "1", "-framerate", f"{fps}", "-i", s["src"]]
    else:
        if s["speed"] != 1:
            chain += f"setpts=PTS/{s['speed']},"
            # The levels pass only needs luma statistics: never interpolate for it.
            if s["interp"] and s["speed"] < 1 and not levels_pass and not NO_INTERP:
                chain += f"minterpolate=fps={fps}:mi_mode=mci,"
        chain += f"fps={fps},format=rgb24"
        inp = ["-ss", f"{s['in']:.4f}", "-i", s["src"]]
    return ["ffmpeg", "-v", "error", "-nostdin"] + inp + ["-an", "-vf", chain, "-frames:v", str(n),
                                                          "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]


LAST_ERR = [""]


def frames(cmd, w, h):
    errf = tempfile.TemporaryFile()  # a pipe nobody reads would block the decoder on a damaged clip
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=errf)
    size = w * h * 3
    try:
        while True:
            buf = p.stdout.read(size)
            if len(buf) < size:
                break
            yield buf
    finally:
        p.stdout.close()
        p.kill()
        p.wait()
        errf.seek(0)
        LAST_ERR[0] = errf.read()[-300:].decode("utf-8", "replace").strip()
        errf.close()


def level_params(s, fps, W, H, np):
    lv = s["lv"]
    if lv == "off":
        return None
    if isinstance(lv, dict):
        return (float(lv.get("lo", 0)), float(lv.get("hi", 1)), float(lv.get("gain", 1)), float(lv.get("gamma", 1)))
    n = s["end_f"] - s["start_f"]
    sw, sh = max(16, W // 8 // 2 * 2), max(16, H // 8 // 2 * 2)
    ys = []
    for i, buf in enumerate(frames(decode_args(s, fps, W, H, n, (sw, sh), levels_pass=True), sw, sh)):
        if i % 3 == 0:
            f = np.frombuffer(buf, np.uint8).reshape(sh, sw, 3).astype(np.float32) / 255
            ys.append((0.299 * f[..., 0] + 0.587 * f[..., 1] + 0.114 * f[..., 2]).ravel())
    if not ys:
        return None
    y = np.concatenate(ys)
    night = lv == "night"
    lo, hi = float(np.percentile(y, 1)), float(np.percentile(y, 96.5 if night else 99.5))
    dark = float(np.median(y)) < 0.10
    target = 0.88 if dark else 0.95
    gain = min(3.4 if night else 2.6, target / max(hi - lo, 1e-3))
    gamma = 0.72 if night else (0.85 if dark else 1.0)
    return (lo, hi, gain, gamma)


def luts(params, bw, np):
    x = np.arange(256, dtype=np.float32) / 255
    if params:
        lo, _, gain, gamma = params
        x = np.clip((x - lo) * gain, 0, 1) ** gamma
    if bw:
        x = np.clip((x - 0.5) * D["contrast"] + 0.5, 0, 1)
        x = (1 - D["s_curve"]) * x + D["s_curve"] * (0.5 - 0.5 * np.cos(np.pi * x))
    return np.round(x * 255).astype(np.uint8)


def color(arr, lut, bw, rng, np):
    if bw:
        y = (0.299 * arr[..., 0] + 0.587 * arr[..., 1] + 0.114 * arr[..., 2]).astype(np.uint8)
        y = lut[y].astype(np.float32)
        h, w = y.shape
        g = rng.normal(0, D["grain"] * 255, ((h + 1) // 2, (w + 1) // 2)).astype(np.float32)
        y = np.clip(y + np.repeat(np.repeat(g, 2, 0), 2, 1)[:h, :w], 0, 255).astype(np.uint8)
        return np.repeat(y[..., None], 3, axis=2)
    return lut[arr]


def affine(img, z, tx, ty, Image):
    if z == 1 and tx == 0 and ty == 0:
        return img
    W, H = img.size
    cx, cy = W / 2, H / 2
    data = (1 / z, 0, cx - (cx + tx) / z, 0, 1 / z, cy - (cy + ty) / z)
    return img.transform((W, H), Image.Transform.AFFINE, data, resample=Image.Resampling.BILINEAR)


def min_zoom(shift, W, H):
    # The recorded rule is 1 + 2.2 * |shift| / H; on a portrait frame a sideways shift needs the
    # shorter side, so the shorter side is used (never below the recorded value). VID-D311.
    return 1 + 2.2 * abs(shift) / min(W, H)


def picture(buf, s, k, n, g, ctx):
    np, Image, uf = ctx["np"], ctx["Image"], ctx["uf"]
    W, H = ctx["W"], ctx["H"]
    arr = np.frombuffer(buf, np.uint8).reshape(H, W, 3)
    arr = color(arr, s["_lut"], s["bw"], s["_rng"], np)
    z = 1 + s["punch"] * math.exp(-k / max(s["tau"], 1e-3)) + s["push"] * k / max(n, 1)
    amp = s["shake"] * math.exp(-k / D["shake_tau"])
    tx = amp * s["_jit"][k][0]
    ty = amp * s["_jit"][k][1]
    zoom_tr, whip, axis = 0.0, 0.0, 1
    for side, kk in (("tout", n - 1 - k), ("tin", k)):
        t = s.get(side)
        if t and kk < t["f"]:
            r = (t["f"] - kk) / t["f"]  # 1 at the cut, falling away from it
            if t["type"] == "zoom":
                zoom_tr = max(zoom_tr, D["zoom_strength"] * r)
            else:
                sign = -1 if t["dir"] in ("left", "up") else 1
                if side == "tin":
                    sign = -sign  # the incoming shot arrives from the other side
                d = sign * D["whip_frac"] * (W if t["dir"] in ("left", "right") else H) * r
                axis = 1 if t["dir"] in ("left", "right") else 0
                whip = d
    if axis == 1:
        tx += whip
    else:
        ty += whip
    z = max(z, min_zoom(max(abs(tx), abs(ty)), W, H))
    img = Image.fromarray(arr)
    if zoom_tr > 0:
        acc = np.zeros((H, W, 3), np.float32)
        for i in range(12):
            acc += np.asarray(affine(img, z * (1 + zoom_tr * i / 11), tx, ty, Image), np.float32)
        out = (acc / 12).astype(np.uint8)
    else:
        out = np.asarray(affine(img, z, tx, ty, Image))
    if whip:
        out = uf(out, max(3, int(abs(whip))), axis=axis, mode="nearest")
    fl = float(ctx["flashes"].get(str(g), ctx["flashes"].get(g, 0)) or 0)
    if fl > 0:
        out = (out.astype(np.float32) * (1 - fl) + 255 * fl).astype(np.uint8)
    img = Image.fromarray(np.ascontiguousarray(out))
    for t in ctx["text"]:
        if t["f0"] - 2 <= g < t["f1"]:
            title(img, t, g, ctx)
    return img


def sprite(t, scale, bright, ctx):
    key = (id(t), round(scale, 3), bright)
    if key in ctx["cache"]:
        return ctx["cache"][key]
    Image, ImageDraw, ImageFont, ImageFilter = ctx["Image"], ctx["ImageDraw"], ctx["ImageFont"], ctx["ImageFilter"]
    W, H = ctx["W"], ctx["H"]
    st = ctx["styles"][t["style"]]
    font_path = ctx["fonts"][(t["style"], t["weight"])]
    probe_size = 200
    f = ImageFont.truetype(font_path, probe_size)
    if t["weight"] in ("bold", "heavy", "black"):
        try:
            f.set_variation_by_name("Bold")
        except Exception:
            pass
    b = f.getbbox("H")
    cap_px = t["cap"] * H * scale
    size = max(8, int(round(probe_size * cap_px / max(1, b[3] - b[1]))))
    f = ImageFont.truetype(font_path, size)
    if t["weight"] in ("bold", "heavy", "black"):
        try:
            f.set_variation_by_name("Bold")
        except Exception:
            pass
    col = st.get("color", "#FFFFFF")
    sw = max(1, int(round(t.get("stroke", D["stroke"]) * cap_px)))
    pad = int(math.ceil(cap_px * D["shadow"][0] * 3)) + sw
    word = t["word"].upper() if st.get("case", "upper") == "upper" else t["word"]
    bb = f.getbbox(word, stroke_width=sw)
    tw, th = bb[2] - bb[0] + 2 * pad, bb[3] - bb[1] + 2 * pad
    txt = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    ImageDraw.Draw(txt).text((pad - bb[0], pad - bb[1]), word, font=f, fill=col, stroke_width=sw, stroke_fill=col)
    if t["squeeze"] != 1:
        txt = txt.resize((max(1, int(tw * t["squeeze"])), th), Image.Resampling.LANCZOS)
    limit = t["max_w"] * W + 2 * pad
    if txt.width > limit:
        r = limit / txt.width
        txt = txt.resize((max(1, int(txt.width * r)), max(1, int(txt.height * r))), Image.Resampling.LANCZOS)
    if bright:
        a = txt.getchannel("A")
        sh = Image.new("RGBA", txt.size, (0, 0, 0, 0))
        sh.putalpha(a.filter(ImageFilter.GaussianBlur(D["shadow"][0] * cap_px)).point(lambda v: int(v * D["shadow"][1])))
        gl = Image.new("RGBA", txt.size, col)
        gl.putalpha(a.filter(ImageFilter.GaussianBlur(max(1, D["glow"][0] * cap_px))).point(lambda v: int(v * D["glow"][1])))
        txt = Image.alpha_composite(Image.alpha_composite(sh, gl), txt)
    ctx["cache"][key] = txt
    return txt


def title(img, t, g, ctx):
    np, rng = ctx["np"], ctx["np"].random.default_rng
    W, H = ctx["W"], ctx["H"]
    states = [(g, 1.0)] + [(g - i - 1, a) for i, a in enumerate(D["trail"])]
    for gg, alpha in reversed(states):
        if gg < t["f0"] or gg >= t["f1"] or (alpha < 1 and gg - t["f0"] >= D["pop_frames"]):
            continue
        age = gg - t["f0"]
        scale = 1 + t["pop"] * max(0.0, 1 - age / D["pop_frames"])
        cxp, cyp = t["cx"] * W, t["cy"] * H
        if t["tshake"]:
            j = rng(zlib.crc32(f"{t['word']}|{t['f0']}|{gg}".encode())).uniform(-1, 1, 2)
            amp = t["tshake"] * math.exp(-age / D["tshake_tau"])
            cxp, cyp = cxp + amp * j[0], cyp + amp * j[1]
        plain = sprite(t, scale, False, ctx)
        x0, y0 = int(cxp - plain.width / 2), int(cyp - plain.height / 2)
        box = (max(0, x0), max(0, y0), min(W, x0 + plain.width), min(H, y0 + plain.height))
        bright = False
        if box[2] > box[0] and box[3] > box[1]:
            region = np.asarray(img.crop(box).convert("L"), np.float32) / 255
            bright = float(region.mean()) > D["bright"]
        sp = sprite(t, scale, bright, ctx) if bright else plain
        mask = sp.getchannel("A")
        if alpha < 1:
            mask = mask.point(lambda v, a=alpha: int(v * a))
        img.paste(sp.convert("RGB"), (int(cxp - sp.width / 2), int(cyp - sp.height / 2)), mask)


def encoder(out, W, H, fps, preset):
    need("ffmpeg")
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    return subprocess.Popen(["ffmpeg", "-v", "error", "-nostdin", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
                             "-s", f"{W}x{H}", "-r", f"{fps}", "-i", "-", "-an",
                             "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p",
                             "-c:v", "libx264", "-preset", preset, "-crf", "16", "-pix_fmt", "yuv420p",
                             "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
                             "-color_range", "tv", "-movflags", "+faststart", out], stdin=subprocess.PIPE)


def default_preview(e):
    want = {}
    for i, s in enumerate(e["shots"]):
        want.setdefault((s["start_f"] + s["end_f"]) // 2, f"shot{i + 1:02d}-mid")
        if s.get("tin"):
            want.setdefault(s["start_f"] + s["tin"]["f"] // 2, f"shot{i + 1:02d}-{s['tin']['type']}-in")
        if s.get("tout"):
            want.setdefault(s["end_f"] - 1 - s["tout"]["f"] // 2, f"shot{i + 1:02d}-{s['tout']['type']}-out")
    for t in e["text"][:12]:
        want.setdefault(t["f0"], "title-in")
        want.setdefault((t["f0"] + t["f1"]) // 2, "title-mid")
    return want


def render(e, a):
    try:
        import numpy as np
        from PIL import Image, ImageDraw, ImageFont, ImageFilter
        from scipy.ndimage import uniform_filter1d
    except ImportError as x:
        fail(2, f"{x.name} is missing: the machine is broken (HR21), report it")
    need("ffmpeg")
    W, H, fps, total = int(e["w"]), int(e["h"]), float(e["fps"]), int(e["total_frames"])
    fonts = {}
    for t in e["text"]:
        k = (t["style"], t["weight"])
        if k not in fonts:
            fonts[k] = resolve_font(e["styles"][t["style"]], t["weight"])
    ctx = {"np": np, "Image": Image, "ImageDraw": ImageDraw, "ImageFont": ImageFont, "ImageFilter": ImageFilter,
           "uf": uniform_filter1d, "W": W, "H": H, "fonts": fonts, "styles": e["styles"], "cache": {},
           "flashes": e["flashes"], "text": e["text"]}
    lo, hi = 0, total
    want = None
    if a.slice:
        lo, hi = (int(x) for x in a.slice.split(":"))
        if not (0 <= lo < hi <= total):
            fail(1, f"--slice {a.slice} is outside 0:{total}")
    if a.preview:
        want = ({int(x): "frame" for x in a.frames.split(",")} if a.frames else default_preview(e))
        os.makedirs(a.preview, exist_ok=True)
    enc = None if a.preview else encoder(a.out, W, H, fps, a.preset or ("veryfast" if a.slice else "slow"))
    written, previews = 0, []
    for i, s in enumerate(e["shots"]):
        n = s["end_f"] - s["start_f"]
        if s["end_f"] <= lo or s["start_f"] >= hi:
            continue
        if want is not None and not any(s["start_f"] <= f < s["end_f"] for f in want):
            continue
        s["_lut"] = luts(level_params(s, fps, W, H, np), s["bw"], np)
        s["_rng"] = np.random.default_rng(1000 + i)
        s["_jit"] = np.random.default_rng(i).uniform(-1, 1, (n, 2))
        got = 0
        for k, buf in enumerate(frames(decode_args(s, fps, W, H, n), W, H)):
            got = k + 1
            g = s["start_f"] + k
            if g < lo:
                continue
            if g >= hi:
                break
            if want is not None and g not in want:
                continue
            img = picture(buf, s, k, n, g, ctx)
            if want is not None:
                p = os.path.join(a.preview, f"f{g:06d}_{want[g]}.png")
                img.save(p)
                previews.append(p)
            else:
                try:
                    enc.stdin.write(img.tobytes())
                except BrokenPipeError:
                    fail(1, "the encoder stopped (libx264 or the output path); nothing usable written")
                written += 1
        if want is None and got < min(n, hi - s["start_f"]):
            if enc:
                enc.stdin.close()
                enc.wait()
            fail(1, f"shot {i + 1}: {s['src']} gave {got} of {n} frames from {s['in']} s; shorten the shot or move 'in'"
                 + (f" (decoder said: {LAST_ERR[0]})" if LAST_ERR[0] else ""))
    if enc:
        enc.stdin.close()
        if enc.wait() != 0:
            fail(1, "the encoder failed")
        print(json.dumps({"out": a.out, "frames": written, "w": W, "h": H, "fps": fps}))
    else:
        print(json.dumps({"preview": previews}))


def plain(e, a):
    need("ffmpeg")
    W, H, fps, total = int(e["w"]), int(e["h"]), float(e["fps"]), int(e["total_frames"])
    args, graph = [], []
    for i, s in enumerate(e["shots"]):
        n = s["end_f"] - s["start_f"]
        cw, ch, x, y = crop_box(s["_info"], W, H, s)
        if s["_info"]["still"]:
            args += ["-loop", "1", "-framerate", f"{fps}", "-i", s["src"]]
            pre = ""
        else:
            args += ["-ss", f"{s['in']:.4f}", "-i", s["src"]]
            pre = f"setpts=PTS/{s['speed']}," if s["speed"] != 1 else ""
        graph.append(f"[{i}:v]{pre}fps={fps},crop={cw}:{ch}:{x}:{y},scale={W}:{H}:flags=lanczos:"
                     f"out_color_matrix=bt709,setsar=1,format=yuv420p,trim=end_frame={n},setpts=PTS-STARTPTS[v{i}]")
    graph.append("".join(f"[v{i}]" for i in range(len(e["shots"]))) + f"concat=n={len(e['shots'])}:v=1:a=0[v]")
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    cmd = (["ffmpeg", "-v", "error", "-nostdin", "-y"] + args +
           ["-filter_complex", ";".join(graph), "-map", "[v]", "-frames:v", str(total), "-r", f"{fps}",
            "-c:v", "libx264", "-preset", a.preset or "slow", "-crf", "16", "-pix_fmt", "yuv420p",
            "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv",
            "-movflags", "+faststart", a.out])
    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.returncode != 0:
        fail(1, f"plain render failed: {p.stderr.strip()[-400:]}")
    print(json.dumps({"out": a.out, "route": "plain", "dropped": ["levels", "bw", "motion", "transitions",
                                                                    "flashes", "titles"]}))


def beat_check(e, beats_path):
    """Beat number and frame offset of every shot start and of total_frames, from beats.json."""
    g = json.load(open(beats_path, encoding="utf-8"))
    bf = g["timeline"]["beat_frames"]
    if not bf:
        fail(1, f"{beats_path}: no beat frames on the timeline")
    allowed = {int(x["f"]) for x in e.get("off_grid", [])}
    rows, bad = [], []
    for name, f in [(f"shot {i + 1}", s["start_f"]) for i, s in enumerate(e["shots"])] + \
                   [("total_frames", int(e["total_frames"]))]:
        j = min(range(len(bf)), key=lambda i: abs(bf[i] - f))
        off = f - bf[j]
        rows.append({"at": name, "frame": f, "beat": j, "offset_frames": off})
        if abs(off) > 1 and f not in allowed:
            bad.append(f"{name} starts at frame {f}: beat {j} is at {bf[j]} (offset {off} frames); put it on the beat "
                       "or list the frame in the EDL's off_grid with a reason")
    return rows, bad


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("edl")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--preview")
    ap.add_argument("--frames")
    ap.add_argument("--slice")
    ap.add_argument("--out")
    ap.add_argument("--plain", action="store_true")
    ap.add_argument("--beats", help="beats.json: with --check, measure every cut against the beat grid")
    ap.add_argument("--no-interp", action="store_true", help="blend frames for speed under 1 (fast fallback)")
    ap.add_argument("--preset", help="x264 preset (default slow; veryfast for --slice)")
    a = ap.parse_args()
    need("ffprobe")
    if a.plain and (a.slice or a.preview):
        fail(1, "--plain renders the whole edit to --out: it cannot be combined with --slice or --preview")
    if a.beats and not a.check:
        fail(1, "--beats belongs to --check")
    global NO_INTERP
    NO_INTERP = a.no_interp
    e, errs, warns = load(a.edl)
    for w in warns:
        warn(w)
    if errs:
        for x in errs:
            print(f"FAIL {x}", file=sys.stderr)
        sys.exit(1)
    if a.check:
        fonts = {}
        for t in e["text"]:
            k = (t["style"], t["weight"])
            if k not in fonts:
                fonts[k] = resolve_font(e["styles"][t["style"]], t["weight"])
        rows, bad = beat_check(e, a.beats) if a.beats else ([], [])
        if a.beats:
            print(json.dumps({"beat_offsets": rows}))
            for x in bad:
                print(f"FAIL {x}", file=sys.stderr)
            if bad:
                sys.exit(1)
        print(json.dumps({"ok": True, "shots": len(e["shots"]), "frames": e["total_frames"],
                          "seconds": round(e["total_frames"] / float(e["fps"]), 3), "titles": len(e["text"]),
                          "lines": len(e["lines"]), "fonts": {f"{k[0]}/{k[1]}": v for k, v in fonts.items()}}))
        return
    if not a.preview and not a.out:
        fail(1, "give --out (render or --slice) or --preview")
    if a.preview and a.out:
        fail(1, "--preview writes PNGs into its own folder: drop --out")
    plain(e, a) if a.plain else render(e, a)


if __name__ == "__main__":
    main()
