#!/usr/bin/env python3
"""Protected regions: review sheets and the region receipt (SL8-authored from WF24-a1 step 13).

The agent writes protected_regions.json from the clean evidence it has looked at:
  {"video_sha256": "<from evidence.json>", "reviewed_duration": <file duration>,
   "reviewed_intervals": [{"start": 0, "end": <duration>}],
   "regions": [{"start": s, "end": e, "box": [left, top, right, bottom], "what": "speaker face"}]}
Boxes are fractions 0..1 of the source frame (never of a sheet). An empty regions list means the
reviewed footage has no protected subject.

  prepare: python3 caption_regions.py prepare --video work/<p>/clean_master.mp4 --srt work/<p>/caps.srt \
      --regions work/<p>/protected_regions.json --clean-evidence work/<p>/clean-evidence/evidence.json \
      --out-dir work/<p>/region-evidence
           draws three views per sample (clean, boxes, unprotected: the exact union of the boxes greyed,
           no padding), three samples per sheet, and writes region-evidence.json and region-review-template.json.
  verify:  python3 caption_regions.py verify ... --evidence work/<p>/region-evidence/region-evidence.json \
      --review work/<p>/region-review.json --receipt work/<p>/region-review-receipt.json

Each region map counts against the source's budget in caption_guard.py (2 maps; frozen by the first render).
Exit: 0 written; 1 refused (hashes, coverage, boxes, review, budget); 2 ffmpeg or Pillow missing.
"""
import argparse, json, os, shutil, sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import caption_guard as G  # noqa: E402
import caption_evidence as E  # noqa: E402

GREY = (64, 64, 64)
PER_SHEET = 3


def fail(code, msg):
    print(f"FAIL {msg}", file=sys.stderr)
    sys.exit(code)


def check_map(a, ev, vsha, ssha, caps):
    """Return (regions json, problems) after the source, duration, interval and box checks."""
    problems = []
    rg = json.load(open(a.regions))
    if ev.get("video_sha256") != vsha:
        problems.append("the clean evidence was taken from another file: run caption_evidence.py prepare again")
    if ev.get("srt_sha256") != ssha:
        problems.append("the SRT changed since the clean evidence was taken")
    if rg.get("video_sha256") != vsha:
        problems.append("protected_regions.json video_sha256 is not the clean master's (copy it from evidence.json)")
    dur = G.duration(a.video)
    if abs(float(rg.get("reviewed_duration") or -1) - dur) > 0.3:
        problems.append(f"reviewed_duration {rg.get('reviewed_duration')} is not the file duration {dur:.3f} (within 0.3 s)")
    iv = sorted((float(x["start"]), float(x["end"])) for x in rg.get("reviewed_intervals") or [])
    for c, (s, e, _) in enumerate(caps, 1):
        t = s
        for x0, x1 in iv:  # walk the sorted intervals across the cue
            if x0 <= t + 1e-3 and x1 > t:
                t = x1
            if t >= e - 1e-3:
                break
        if t < e - 1e-3:
            problems.append(f"cue {c} ({s:.2f}-{e:.2f} s) is not inside reviewed_intervals")
    regions = rg.get("regions")
    if not isinstance(regions, list):
        problems.append("regions must be a list (an empty list means no protected subject)")
        regions = []
    for k, r in enumerate(regions, 1):
        b = r.get("box")
        ok = isinstance(b, list) and len(b) == 4 and all(isinstance(v, (int, float)) for v in b)
        if not ok or not (0 <= b[0] < b[2] <= 1 and 0 <= b[1] < b[3] <= 1):
            problems.append(f"region {k}: box must be [left, top, right, bottom] with 0 <= left < right <= 1 and 0 <= top < bottom <= 1")
        if not float(r.get("start", 0)) < float(r.get("end", 0)):
            problems.append(f"region {k}: start must be before end")
    return rg, problems


def active(regions, t):
    return [k for k, r in enumerate(regions) if float(r["start"]) <= t < float(r["end"])]


def views(img, boxes):
    """clean | boxes | unprotected (the exact union of the boxes greyed, no padding)."""
    from PIL import ImageDraw
    W, H = img.size
    px = [(b[0] * W, b[1] * H, b[2] * W, b[3] * H) for b in boxes]
    drawn, hidden = img.copy(), img.copy()
    d, h = ImageDraw.Draw(drawn), ImageDraw.Draw(hidden)
    for x0, y0, x1, y1 in px:
        d.rectangle([x0, y0, x1, y1], outline=(255, 40, 40), width=max(2, W // 240))
        h.rectangle([x0, y0, x1 - 1, y1 - 1], fill=GREY)
    return [img, drawn, hidden]


def prepare(a):
    try:
        from PIL import Image
    except ImportError:
        fail(2, "Pillow is missing: the machine is broken (HR21: report, never install)")
    ev = json.load(open(a.clean_evidence))
    vsha, ssha = G.sha(a.video), G.sha(a.srt)
    try:
        caps = G.cues(a.srt)
    except G.GuardError as e:
        fail(1, str(e))
    rg, problems = check_map(a, ev, vsha, ssha, caps)
    if problems:
        for p in problems:
            print(f"  {p}", file=sys.stderr)
        fail(1, "protected_regions.json refused")
    rsha = G.sha(a.regions)
    try:
        st = G.register_map(vsha, rsha)
    except G.GuardError as e:
        fail(1, str(e))
    os.makedirs(a.out_dir, exist_ok=True)
    E.clean_out_dir(a.out_dir)
    src = os.path.dirname(os.path.abspath(a.clean_evidence))
    samples = [{k: s[k] for k in ("id", "cue", "t", "frame", "frame_sha256")} for s in ev["samples"]]
    for s in samples:
        s["regions"] = active(rg["regions"], s["t"])
    first = Image.open(os.path.join(src, samples[0]["frame"]))
    box = (240, 427) if first.height > first.width else (427, 240)

    def strip(s):
        img = Image.open(os.path.join(src, s["frame"])).convert("RGB")
        vs = [E.fit(v, box) for v in views(img, [rg["regions"][k]["box"] for k in s["regions"]])]
        out = Image.new("RGB", (box[0] * 3, box[1]), (24, 24, 24))
        for k, v in enumerate(vs):
            out.paste(v, (k * box[0], 0))
        return out
    names = E.sheets(samples, a.out_dir, "regions", strip, PER_SHEET, 1, "clean | boxes | unprotected")
    rev = {"schema_version": 2, "review_view": "source_boxes_unprotected", "video_sha256": vsha, "srt_sha256": ssha,
           "regions_sha256": rsha, "clean_evidence_sha256": G.sha(a.clean_evidence),
           "map_version": st["maps"].index(rsha) + 1, "maps_left": G.MAX_MAPS - len(st["maps"]),
           "samples": samples, "sheets": names}
    json.dump(rev, open(os.path.join(a.out_dir, "region-evidence.json"), "w"), indent=1)
    tpl = {"video_sha256": vsha, "regions_sha256": rsha,
           "samples": [{"id": s["id"], "unprotected_subjects": None, "subjects_covered": None, "note": ""} for s in samples]}
    json.dump(tpl, open(os.path.join(a.out_dir, "region-review-template.json"), "w"), indent=1)
    print(json.dumps({"evidence": os.path.join(a.out_dir, "region-evidence.json"), "samples": len(samples),
                      "map_version": rev["map_version"], "sheets": [os.path.join(a.out_dir, n) for n in names]}))


def verify(a):
    if os.path.exists(a.receipt):
        os.remove(a.receipt)
    ev = json.load(open(a.clean_evidence))
    rev = json.load(open(a.evidence))
    review = json.load(open(a.review))
    vsha, ssha, rsha = G.sha(a.video), G.sha(a.srt), G.sha(a.regions)
    caps = G.cues(a.srt)
    rg, problems = check_map(a, ev, vsha, ssha, caps)
    if rev.get("schema_version") != 2 or rev.get("video_sha256") != vsha or rev.get("srt_sha256") != ssha \
            or rev.get("regions_sha256") != rsha or rev.get("clean_evidence_sha256") != G.sha(a.clean_evidence):
        problems.append("region-evidence.json does not bind this video, SRT, map and clean evidence: run prepare again")
    st = G.current(vsha)
    if not st or rsha not in st["maps"]:
        problems.append("this map was never prepared against the source's budget")
    elif st["frozen_map"] and st["frozen_map"] != rsha:
        problems.append("another map is frozen for this source")
    got = {r.get("id"): r for r in review.get("samples", [])}
    by_cue = {}
    for s in rev.get("samples", []):
        r = got.get(s["id"])
        if r is None:
            problems.append(f"{s['id']}: not reviewed")
            continue
        if r.get("unprotected_subjects") != []:
            problems.append(f"{s['id']}: unprotected_subjects {r.get('unprotected_subjects')!r} (every subject outside a box must be boxed first)")
        if r.get("subjects_covered") is not True:
            problems.append(f"{s['id']}: subjects_covered is {r.get('subjects_covered')!r}")
        note = str(r.get("note") or "").strip()
        if not note:
            problems.append(f"{s['id']}: no note")
        by_cue.setdefault(s["cue"], []).append(note)
    for c, notes in by_cue.items():
        if len(notes) > 1 and len(set(notes)) == 1:
            problems.append(f"cue {c}: every sample has the same note; describe each frame")
    if problems:
        for p in problems[:40]:
            print(f"  {p}", file=sys.stderr)
        fail(1, f"region review not verified ({len(problems)} problem(s)); no receipt written")
    receipt = {"verdict": "REGIONS_REVIEWED", "video_sha256": vsha, "srt_sha256": ssha, "regions_sha256": rsha,
               "region_evidence_sha256": G.sha(a.evidence), "review_sha256": G.sha(a.review),
               "reviewed_intervals": rg["reviewed_intervals"], "regions": len(rg["regions"]),
               "samples": len(rev.get("samples", []))}
    json.dump(receipt, open(a.receipt, "w"), indent=1)
    print(json.dumps({"receipt": a.receipt, "verdict": receipt["verdict"], "samples": receipt["samples"]}))


def main():
    p = argparse.ArgumentParser()
    p.add_argument("cmd", choices=["prepare", "verify"])
    for f in ("--video", "--srt", "--regions", "--clean-evidence"):
        p.add_argument(f, required=True)
    p.add_argument("--out-dir")
    p.add_argument("--evidence")
    p.add_argument("--review")
    p.add_argument("--receipt")
    a = p.parse_args()
    for tool in ("ffmpeg", "ffprobe"):
        if not shutil.which(tool):
            fail(2, f"{tool} is missing: the machine is broken (HR21: report, never install)")
    for f in (a.video, a.srt, a.regions, a.clean_evidence):
        if not os.path.isfile(f):
            fail(1, f"no file at {f}")
    if a.cmd == "prepare":
        if not a.out_dir:
            fail(1, "prepare needs --out-dir")
        prepare(a)
    else:
        if not (a.evidence and a.review and a.receipt):
            fail(1, "verify needs --evidence, --review and --receipt")
        verify(a)


if __name__ == "__main__":
    main()
