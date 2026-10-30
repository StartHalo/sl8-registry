#!/usr/bin/env python3
"""Burn an SRT into a video in one render from the clean master (SL8-authored from WF24-a1 steps 10, 11, 14, 16).

  python3 burn_captions.py --in work/<p>/clean_master.mp4 --srt work/<p>/caps.srt \
      --out artifacts/<p>/captions/final_subbed.mp4 --style bold|paper|clean [--profile default|faceless|safe] \
      [--font-key tiktok|montserrat|anton|caveat|patrick|marker|metropolis|noto] [--font-file PATH] \
      [--no-outline] [--no-caps] [--single-line] [--stroke-frac F] [--fontsize-frac F] [--marginv N] \
      [--protected-regions work/<p>/protected_regions.json --region-review work/<p>/region-review-receipt.json]

bold and paper draw each caption as a Pillow label and overlay it with ffmpeg; clean uses libass.
--profile safe (the clearance route) needs a verified region receipt for this exact source, SRT and
map, spends one of the source's two render attempts (caption_guard.py), and places every caption
clear of the protected boxes shown during it (caption_placement.py), each caption shown exactly for
its speech. Audio is stream-copied. Writes <out>.captions.json (placement record, not a claim of inspection).
Exit: 0 rendered; 1 refused (bad SRT, a caption that cannot fit, a readability refusal, a missing or
stale region receipt) or the render failed; 2 a needed font, filter or tool is missing; 3 safe profile
caption_incomplete (no clear position for an interval, or the source's retry budget is used): no
video is written, return the clean master and the interval.
"""
import argparse, atexit, hashlib, json, os, re, shutil, subprocess, sys, tempfile

sys.dont_write_bytecode = True  # the clearance helpers sit beside this script; keep the folder free of caches
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

FACES = {"tiktok": "TikTok Sans:bold", "montserrat": "Montserrat:extrabold", "anton": "Anton",
         "caveat": "Caveat", "patrick": "Patrick Hand", "marker": "Permanent Marker",
         "metropolis": "Metropolis:extrabold", "noto": "Noto Sans:bold"}
FALLBACK = ["montserrat", "anton", "caveat", "noto"]
CUE = re.compile(r"^(\d+):(\d+):(\d+)[,.](\d{1,3})\s*-->\s*(\d+):(\d+):(\d+)[,.](\d{1,3})\s*$")


def fail(code, msg):
    print(f"FAIL {msg}", file=sys.stderr)
    sys.exit(code)


def sha(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def probe(path):
    """Displayed frame size: the coded size, swapped when a rotation of 90 or 270 degrees is flagged."""
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                          "stream=width,height:stream_tags=rotate:stream_side_data=rotation", "-of", "json", path],
                         capture_output=True, text=True)
    if out.returncode or not json.loads(out.stdout or "{}").get("streams"):
        fail(1, f"ffprobe cannot read a video stream in {path}")
    s = json.loads(out.stdout)["streams"][0]
    w, h = int(s["width"]), int(s["height"])
    rot = s.get("tags", {}).get("rotate") or next((d.get("rotation") for d in s.get("side_data_list", []) if "rotation" in d), 0)
    if abs(int(float(rot or 0))) % 180 == 90:
        w, h = h, w
    return w, h


def srt(path):
    caps = []
    text = open(path, encoding="utf-8-sig").read().strip()
    if not text:
        fail(1, f"{path}: empty SRT")
    for n, block in enumerate(re.split(r"\n\s*\n", text), 1):
        lines = [l for l in block.splitlines() if l.strip()]
        i = next((k for k, l in enumerate(lines) if "-->" in l), None)
        m = CUE.match(lines[i].strip()) if i is not None else None
        if not m:
            fail(1, f"SRT block {n} has no valid timing line: a malformed block fails the whole burn")
        g = [int(x) for x in m.groups()]
        start = g[0] * 3600 + g[1] * 60 + g[2] + int(m.group(4).ljust(3, "0")) / 1000
        end = g[4] * 3600 + g[5] * 60 + g[6] + int(m.group(8).ljust(3, "0")) / 1000
        words = " ".join(lines[i + 1:]).strip()
        if not words:
            fail(1, f"SRT block {n} has no text")
        if end <= start:
            fail(1, f"SRT block {n} ends before it starts")
        caps.append([start, end, words])
    return caps


def font_path(key, override):
    if override:
        if not os.path.isfile(override):
            fail(2, f"--font-file {override} does not exist")
        return override
    if not shutil.which("fc-match"):
        fail(2, "fc-match is missing (fontconfig): the machine is broken; or pass --font-file")
    r = subprocess.run(["fc-match", "-f", "%{file}\t%{family}", FACES[key]], capture_output=True, text=True)
    if r.returncode or "\t" not in r.stdout:
        return None
    file, family = r.stdout.split("\t", 1)
    want = FACES[key].split(":")[0].lower()
    return file if want in family.lower() else None  # fc-match always answers: check it is the face asked for


def load(face, size):
    from PIL import ImageFont
    f = ImageFont.truetype(face, size)
    for name in (b"ExtraBold", b"Bold", "ExtraBold", "Bold"):  # a variable face otherwise renders at its default weight
        try:
            f.set_variation_by_name(name)
            break
        except Exception:  # noqa: BLE001 - not a variable font, or no such instance
            continue
    return f


def covers(font, text):
    """A glyph the face lacks draws as its missing-glyph shape: compare every letter with an unassigned code point."""
    from PIL import Image, ImageDraw

    def ink(ch):
        im = Image.new("L", (font.size * 2, font.size * 2))
        ImageDraw.Draw(im).text((0, 0), ch, font=font, fill=255)
        return im.tobytes()
    missing = ink("\U0010FFFD")
    return all(ink(ch) != missing for ch in set(text) if ch.strip())


def pick_font(key, override, text, size):
    for k in [key] + [f for f in FALLBACK if f != key]:
        p = font_path(k, override if k == key else None)
        if p and covers(load(p, size), text):
            if k != key:
                print(f"WARN face '{key}' lacks glyphs for this text or is not installed; using '{k}'", file=sys.stderr)
            return p
    fail(2, f"no installed face covers the caption text (wanted {key}); the machine is missing fonts (HR21: report, never install)")


def wrap(text, font, maxw, single):
    words = text.split()
    if single or len(words) < 2 or font.getlength(text) <= maxw:
        return [text]
    best = min(range(1, len(words)), key=lambda i: abs(font.getlength(" ".join(words[:i])) - font.getlength(" ".join(words[i:]))))
    return [" ".join(words[:best]), " ".join(words[best:])]  # at most two balanced lines


def fitted_size(texts, face, base, floor, factor, maxw, single):
    size = base
    while size > floor:
        f = load(face, size)
        if all(max(f.getlength(l) for l in wrap(t, f, maxw, single)) <= maxw for t in texts):
            return size
        size = max(floor, int(size * factor))
    return floor  # one fitted size for the whole video


def label(text, face, size, style, a, W):
    from PIL import Image, ImageDraw, ImageFilter
    import random
    f = load(face, size)
    lines = wrap(text, f, W * a.width, a.single_line)
    stroke = 0 if (a.no_outline or style == "paper") else max(1, round(size * a.stroke_frac))
    lh = int(size * 1.25)
    tw = int(max(f.getlength(l) for l in lines)) + 2 * stroke
    pad = int(size * (0.6 if style == "paper" else 0.3))
    img = Image.new("RGBA", (tw + 2 * pad, lh * len(lines) + 2 * pad), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if style == "paper":
        rnd = random.Random(text)
        scrap = Image.new("RGBA", img.size, (0, 0, 0, 0))
        sd = ImageDraw.Draw(scrap)
        w, h = img.size
        edge = [(x, rnd.randint(0, 3)) for x in range(0, w, 6)] + [(w - rnd.randint(0, 3), y) for y in range(0, h, 6)] + \
               [(x, h - rnd.randint(0, 3)) for x in range(w, 0, -6)] + [(rnd.randint(0, 3), y) for y in range(h, 0, -6)]
        sd.polygon(edge, fill=(245, 241, 231, 255))  # cream scrap with rough edges
        for _ in range(w * h // 300):
            x, y = rnd.randrange(w), rnd.randrange(h)
            if scrap.getpixel((x, y))[3]:
                sd.point((x, y), fill=(225, 219, 205, 255))  # fibre noise
        shadow = scrap.split()[3].filter(ImageFilter.GaussianBlur(4))
        base = Image.new("RGBA", img.size, (0, 0, 0, 0))
        base.paste((0, 0, 0, 90), (3, 4), shadow)
        img = Image.alpha_composite(base, scrap)
        d = ImageDraw.Draw(img)
        ink, outline = (38, 32, 28, 255), None
    else:
        ink, outline = (255, 255, 255, 255), (0, 0, 0, 255)
        if a.no_outline:
            sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
            sdraw = ImageDraw.Draw(sh)
            for i, l in enumerate(lines):
                sdraw.text((pad + 2 + (tw - f.getlength(l)) / 2, pad + 2 + i * lh), l, font=f, fill=(0, 0, 0, 160))
            img = Image.alpha_composite(img, sh.filter(ImageFilter.GaussianBlur(2)))
            d = ImageDraw.Draw(img)
    for i, l in enumerate(lines):
        d.text((pad + (tw - f.getlength(l)) / 2, pad + i * lh), l, font=f, fill=ink,
               stroke_width=stroke, stroke_fill=outline)
    return img


def hold(caps, a):
    """Default profile: bridge continuous speech, keep a tail after a real pause, min/max duration."""
    out = []
    for i, (s, e, t) in enumerate(caps):
        nxt = caps[i + 1][0] if i + 1 < len(caps) else None
        end = e + a.tail
        if nxt is not None and nxt - e <= a.bridge:
            end = nxt - a.gap  # continuous speech: hold until the next caption
        end = max(end, s + a.min_dur)
        end = min(end, max(s + a.max_dur, e))  # cap the hold, never cut the speech
        if nxt is not None:
            end = min(end, nxt - a.gap)  # never overlap the next caption (may trim the last gap of speech)
        out.append([s, max(end, s + 0.05), t])
    return out


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--in", dest="src", required=True)
    p.add_argument("--srt", required=True)
    p.add_argument("--out", required=True)
    p.add_argument("--style", choices=["bold", "paper", "clean"], default="bold")
    p.add_argument("--profile", choices=["default", "faceless", "safe"], default="default")
    p.add_argument("--protected-regions")
    p.add_argument("--region-review", help="the receipt written by caption_regions.py verify")
    p.add_argument("--fontsize-frac", type=float, help="caption size as a fraction of H (safe default 0.026)")
    p.add_argument("--font-key", choices=sorted(FACES))
    p.add_argument("--font-file")
    p.add_argument("--no-outline", action="store_true")
    p.add_argument("--no-caps", action="store_true")
    p.add_argument("--single-line", action="store_true")
    p.add_argument("--stroke-frac", type=float, default=0.07)
    p.add_argument("--marginv", type=int, default=34)
    p.add_argument("--fonts-dir", default="/usr/share/fonts")
    p.add_argument("--bridge", type=float, default=1.0)
    p.add_argument("--tail", type=float, default=0.6)
    p.add_argument("--min-dur", type=float, default=1.2)
    p.add_argument("--max-dur", type=float, default=3.5)
    p.add_argument("--gap", type=float, default=0.06)
    a = p.parse_args()

    for tool in ("ffmpeg", "ffprobe"):
        if not shutil.which(tool):
            fail(2, f"{tool} is missing: the machine is broken (HR21: report, never install)")
    if not os.path.isfile(a.src):
        fail(1, f"no input video at {a.src}")
    W, H = probe(a.src)
    portrait = H > W
    caps = srt(a.srt)
    safe = a.profile == "safe"
    if safe:
        import caption_guard as G
        if a.style == "clean":
            fail(1, "the safe profile places Pillow labels: use --style bold or paper")
        if not (a.protected_regions and a.region_review):
            fail(1, "--profile safe needs --protected-regions and --region-review (the verified receipt)")
        src_sha, rsha, ssha = sha(a.src), sha(a.protected_regions), sha(a.srt)
        rec = json.load(open(a.region_review))
        regions = json.load(open(a.protected_regions))
        if rec.get("verdict") != "REGIONS_REVIEWED" or rec.get("video_sha256") != src_sha \
                or rec.get("regions_sha256") != rsha or rec.get("srt_sha256") != ssha or regions.get("video_sha256") != src_sha:
            fail(1, "the region receipt does not bind this source, map and SRT: review the regions again (caption_regions.py)")
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    tmp = tempfile.mkdtemp(prefix="burn-")
    atexit.register(shutil.rmtree, tmp, True)  # label PNGs and the graph never pile up in temp
    enc = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
           "-c:a", "copy", "-movflags", "+faststart"]
    record = {"verdict": "RENDERED", "style": a.style, "profile": a.profile, "frame": [W, H],
              "visual_review": "NOT_REQUIRED" if a.profile == "faceless" else "PENDING",
              "source_sha256": sha(a.src), "srt_sha256": sha(a.srt), "cues": []}

    if a.style == "clean":
        if a.marginv >= 90:
            fail(1, "--marginv >= 90 lifts captions towards mid-frame: declined (readability)")
        filters = subprocess.run(["ffmpeg", "-hide_banner", "-filters"], capture_output=True, text=True).stdout
        if not re.search(r"\ssubtitles\s", filters):
            fail(2, "this ffmpeg has no subtitles (libass) filter: the clean look is not available; use bold or paper")
        if not a.font_file and not font_path("tiktok", None):
            fail(2, "TikTok Sans is not installed: the clean look would fall back silently in libass")
        lines = open(a.srt, encoding="utf-8-sig").read().splitlines()
        up = [l if (re.match(r"^\d+$", l.strip()) or "-->" in l or a.no_caps) else l.upper() for l in lines]
        cs = os.path.join(tmp, "caps.srt")
        open(cs, "w", encoding="utf-8").write("\n".join(up) + "\n")
        style = (f"FontName=TikTok Sans,Bold=1,Fontsize=13,MarginV={a.marginv},Outline=2,Shadow=1,"
                 "BorderStyle=1,Alignment=2,PrimaryColour=&H00FFFFFF")
        vf = f"subtitles='{cs}':fontsdir='{a.fonts_dir}':force_style='{style}'"
        r = subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", a.src, "-vf", vf, *enc, a.out])
        if r.returncode:
            fail(1, "ffmpeg render failed")
        record.update(cues=[{"start": s, "end": e, "placement": f"libass bottom, MarginV {a.marginv}"} for s, e, _ in caps],
                      video_sha256=sha(a.out))
        json.dump(record, open(a.out + ".captions.json", "w"), indent=1)
        print(json.dumps({"out": a.out, "style": "clean", "cues": len(caps), "frame": [W, H]}))
        return

    faceless = a.profile == "faceless"
    if a.style == "paper":
        key, base_f, floor, factor = a.font_key or "patrick", 0.032, 12, 0.9
        bottom, a.width = (0.17 if portrait else 0.10), 0.72
    else:
        key, base_f, floor, factor = a.font_key or "tiktok", 0.046, 14, 0.94
        bottom, a.width = 0.17, (0.77 if portrait else 0.85)
    if faceless:
        a.single_line, a.width = True, (0.70 if portrait else 0.82)
        bottom = 0.17 if portrait else 0.10
        floor = max(floor, int(H * 0.02))
    if safe:
        base_f, a.width = (a.fontsize_frac or 0.026), 0.70
        floor = max(14, int(H * 0.02))
    elif a.fontsize_frac:
        base_f = a.fontsize_frac
    texts = [t if (a.no_caps or a.style == "paper" or faceless) else t.upper() for _, _, t in caps]
    face = pick_font(key, a.font_file, "".join(texts), int(H * base_f))
    size = fitted_size(texts, face, int(H * base_f), floor, factor, W * a.width, a.single_line)
    timed = hold(caps, a) if a.profile == "default" else caps  # safe and faceless: exactly the speech
    record["font"], record["size_px"] = face, size

    labels = []
    for i, ((s, e, _), t) in enumerate(zip(timed, texts)):
        img = label(t, face, size, a.style, a, W)
        if img.width > W or (W - img.width) // 2 < 0 or img.height > H:
            fail(1, f"cue {i + 1} does not fit the frame at the minimum size: re-chunk it from the existing word clock")
        labels.append(img)
    attempt = None
    if safe:
        from caption_placement import place
        try:
            attempt = G.begin_render(src_sha, rsha, os.path.abspath(a.out))  # spends an attempt, freezes the map
        except G.BudgetError as e:
            print(json.dumps({"verdict": "BUDGET_USED", "reason": str(e)}))
            fail(3, f"budget_used: {e}")
        except G.GuardError as e:
            print(json.dumps({"verdict": "CAPTION_INCOMPLETE", "reason": str(e)}))
            fail(3, f"caption_incomplete: {e}")
        record.update(regions_sha256=rsha, region_receipt_sha256=sha(a.region_review), render_attempt=attempt)
    graph, prev = [], "0:v"
    for i, ((s, e, _), img) in enumerate(zip(timed, labels)):
        if safe:
            bx0, by0, bx1, by1 = img.getchannel("A").getbbox() or (0, 0, img.width, img.height)
            shown = [r["box"] for r in regions["regions"] if float(r["start"]) < e and float(r["end"]) > s]
            pos = place(bx1 - bx0, by1 - by0, W, H, [(b[0] * W, b[1] * H, b[2] * W, b[3] * H) for b in shown])
            if not pos:
                G.end_render(src_sha, attempt, "CAPTION_INCOMPLETE", interval=[s, e])
                record.update(verdict="CAPTION_INCOMPLETE", interval=[round(s, 3), round(e, 3)], cue=i + 1)
                json.dump(record, open(a.out + ".captions.json", "w"), indent=1)
                print(json.dumps({"verdict": "CAPTION_INCOMPLETE", "cue": i + 1, "interval": [round(s, 3), round(e, 3)]}))
                fail(3, f"caption_incomplete: no clear position for cue {i + 1} ({s:.2f}-{e:.2f} s); return the clean master")
            x, y = pos["x"] - bx0, pos["y"] - by0
            ink = [pos["x"], pos["y"], pos["x"] + bx1 - bx0, pos["y"] + by1 - by0]
        else:
            x = (W - img.width) // 2
            y = int(H * (1 - bottom)) - img.height
            if y < 0:
                fail(1, f"cue {i + 1} does not fit the frame at the minimum size: re-chunk it from the existing word clock")
            if faceless and y < H * 0.60:
                fail(1, f"cue {i + 1} needs more than the lower 40% of the frame")
            ink, pos = [x, y, x + img.width, y + img.height], None
        f = os.path.join(tmp, f"cap_{i:04d}.png")
        img.save(f)
        cue = {"start": round(s, 3), "end": round(e, 3),
               "box": [round(ink[0] / W, 4), round(ink[1] / H, 4), round(ink[2] / W, 4), round(ink[3] / H, 4)]}
        if pos:
            cue.update(band=pos["band"], align=pos["align"])
        record["cues"].append(cue)
        graph.append(f"movie={f}[c{i}];[{prev}][c{i}]overlay={x}:{y}:enable='gte(t,{s:.3f})*lt(t,{e:.3f})'[v{i}]")
        prev = f"v{i}"
    script = os.path.join(tmp, "graph.txt")
    open(script, "w").write(";\n".join(graph))
    r = subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", a.src, "-filter_complex_script", script,
                        "-map", f"[{prev}]", "-map", "0:a?", *enc, a.out])
    if r.returncode:
        if safe:
            G.end_render(src_sha, attempt, "FAILED")
        fail(1, "ffmpeg render failed")
    record["video_sha256"] = sha(a.out)
    if safe:
        G.end_render(src_sha, attempt, "RENDERED", out_sha=record["video_sha256"])
    json.dump(record, open(a.out + ".captions.json", "w"), indent=1)
    print(json.dumps({"out": a.out, "style": a.style, "profile": a.profile, "font": face, "size_px": size,
                      "cues": len(caps), "frame": [W, H]}))


if __name__ == "__main__":
    main()
