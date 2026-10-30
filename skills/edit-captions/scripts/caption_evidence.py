#!/usr/bin/env python3
"""Frame evidence and the final review receipt for the clearance route (SL8-authored from WF24-a1 steps 12, 18).

  count:   print how many samples, sheets and image reads the whole route needs for an SRT (no frames cut).
  python3 caption_evidence.py count --srt work/<p>/caps.srt

  prepare: sample every cue at both edges and at most 0.25 s apart, snap each sample to a decoded
           frame, write the frames, 6-frame contact sheets, evidence.json and review-template.json.
  python3 caption_evidence.py prepare --video V --srt work/<p>/caps.srt --out-dir work/<p>/clean-evidence

  verify:  check the agent's review of a burned file and write the receipt that binds the exact file.
  python3 caption_evidence.py verify --video OUT --srt work/<p>/caps.srt --evidence work/<p>/final-evidence/evidence.json \
      --review work/<p>/review.json --receipt OUT.caption-review.json [--captions-record OUT.captions.json]

The sheets are evidence for the agent to open and look at; this script never judges a frame.
Verify also refuses notes under 12 characters and one identical note across a cue.
Exit: 0 written; 1 refused (hash mismatch, review incomplete or failed, bad input); 2 ffmpeg or Pillow missing.
"""
import argparse, json, math, os, re, shutil, subprocess, sys

sys.dont_write_bytecode = True  # keep the skill folder free of caches
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import caption_guard as G  # noqa: E402

STEP = 0.25   # largest gap between samples inside a cue, seconds
BATCH = 24    # frames extracted per ffmpeg call
PER_SHEET = 6  # 3 columns x 2 rows


OWN = re.compile(r"^(sheet-\d+\.jpg|regions-\d+\.jpg|frame-\d+\.jpg|_batch_.*\.jpg|evidence\.json|"
                 r"region-evidence\.json|review-template\.json|region-review-template\.json)$")
MIN_NOTE = 12  # characters: "ok" says nothing about a frame


def clean_out_dir(d):
    """Remove only what these scripts write, so a hand-written map or review in the folder survives."""
    for old in os.listdir(d):
        if OWN.match(old):
            os.remove(os.path.join(d, old))


def read_count(caps):
    """Samples, and the sheets the three passes open (clean 6 a sheet, regions 3, final 6)."""
    n = sum(len(sample_times(s, e)) for s, e, _ in caps)
    return n, math.ceil(n / PER_SHEET), math.ceil(n / 3), math.ceil(n / PER_SHEET)


def fail(code, msg):
    print(f"FAIL {msg}", file=sys.stderr)
    sys.exit(code)


def sample_times(start, end):
    """Both edges (inset by up to 0.02 s) and evenly spaced points at most STEP apart."""
    dur = end - start
    inset = min(0.02, dur / 4)
    span = dur - 2 * inset
    n = max(2, math.ceil(span / STEP) + 1)
    return [start + inset + span * k / (n - 1) for k in range(n)]


def frame_times(video):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                        "frame=best_effort_timestamp_time", "-of", "csv=p=0", video], capture_output=True, text=True)
    ts = [float(x.split(",")[0]) for x in r.stdout.split() if x.split(",")[0] not in ("", "N/A")]
    if r.returncode or not ts:
        fail(1, f"ffprobe cannot list the decoded frames of {video}")
    return ts


def snap(t, ts, lo, hi):
    """Index of the decoded frame nearest t, preferring frames shown inside [lo, hi)."""
    inside = [i for i, x in enumerate(ts) if lo <= x < hi] or range(len(ts))
    return min(inside, key=lambda i: abs(ts[i] - t))


def extract(video, indices, out_dir):
    files = {}
    idx = sorted(set(indices))
    for b in range(0, len(idx), BATCH):
        part = idx[b:b + BATCH]
        expr = "+".join(f"eq(n\\,{i})" for i in part)
        tmp = os.path.join(out_dir, f"_batch_{b:05d}_%03d.jpg")
        r = subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", video, "-vf", f"select='{expr}'",
                            "-fps_mode", "passthrough", "-q:v", "2", tmp])
        got = sorted(f for f in os.listdir(out_dir) if f.startswith(f"_batch_{b:05d}_"))
        if r.returncode or len(got) != len(part):
            fail(1, f"frame extraction returned {len(got)} of {len(part)} frames")
        for i, f in zip(part, got):
            dst = os.path.join(out_dir, f"frame-{i:06d}.jpg")
            os.replace(os.path.join(out_dir, f), dst)
            files[i] = dst
    return files


def sheets(samples, out_dir, prefix, tile_fn, per_sheet, cols, caption=""):
    """Contact sheets of per_sheet tiles in `cols` columns, each labelled with its sample id and time."""
    from PIL import Image, ImageDraw
    names = []
    for s0 in range(0, len(samples), per_sheet):
        group = samples[s0:s0 + per_sheet]
        tiles = [tile_fn(s) for s in group]
        tw, th = tiles[0].size
        sheet = Image.new("RGB", (tw * cols, (th + 22) * math.ceil(len(tiles) / cols)), (24, 24, 24))
        d = ImageDraw.Draw(sheet)
        for k, (t, s) in enumerate(zip(tiles, group)):
            x, y = (k % cols) * tw, (k // cols) * (th + 22)
            sheet.paste(t, (x, y + 22))
            d.text((x + 6, y + 5), f"{s['id']}  t={s['t']:.3f}s  {caption}", fill=(255, 255, 0))
        name = os.path.join(out_dir, f"{prefix}-{s0 // per_sheet:03d}.jpg")
        sheet.save(name, quality=85)
        for s in group:
            s["sheet"] = os.path.basename(name)
        names.append(os.path.basename(name))
    return names


def fit(img, box):
    from PIL import Image
    im = img.copy()
    im.thumbnail(box)
    tile = Image.new("RGB", box, (24, 24, 24))
    tile.paste(im, ((box[0] - im.width) // 2, (box[1] - im.height) // 2))
    return tile


def prepare(a):
    try:
        from PIL import Image
    except ImportError:
        fail(2, "Pillow is missing: the machine is broken (HR21: report, never install)")
    for f in (a.video, a.srt):
        if not os.path.isfile(f):
            fail(1, f"no file at {f}")
    try:
        caps = G.cues(a.srt)
    except G.GuardError as e:
        fail(1, str(e))
    os.makedirs(a.out_dir, exist_ok=True)
    clean_out_dir(a.out_dir)  # stale evidence never mixes with new; other files are left alone
    ts = frame_times(a.video)
    samples = []
    for c, (s, e, text) in enumerate(caps, 1):
        for k, t in enumerate(sample_times(s, e)):
            i = snap(t, ts, s, e)
            samples.append({"id": f"c{c:03d}-s{k:02d}", "cue": c, "cue_start": s, "cue_end": e, "text": text,
                            "t": round(ts[i], 3), "frame_index": i})
    files = extract(a.video, [s["frame_index"] for s in samples], a.out_dir)
    for s in samples:
        s["frame"] = os.path.basename(files[s["frame_index"]])
        s["frame_sha256"] = G.sha(files[s["frame_index"]])
    first = Image.open(files[samples[0]["frame_index"]])
    box = (360, 640) if first.height > first.width else (640, 360)
    names = sheets(samples, a.out_dir, "sheet", lambda s: fit(Image.open(os.path.join(a.out_dir, s["frame"])).convert("RGB"), box), PER_SHEET, 3)
    ev = {"schema_version": 1, "video": os.path.abspath(a.video), "video_sha256": G.sha(a.video),
          "srt_sha256": G.sha(a.srt), "duration": G.duration(a.video), "frame_size": list(first.size),
          "sampling": f"cue edges inset min(0.02 s, duration/4), at most {STEP} s apart; samples, not tracking",
          "cues": [{"cue": c, "start": s, "end": e} for c, (s, e, _) in enumerate(caps, 1)],
          "samples": samples, "sheets": names}
    json.dump(ev, open(os.path.join(a.out_dir, "evidence.json"), "w"), indent=1)
    tpl = {"video_sha256": ev["video_sha256"],
           "samples": [{"id": s["id"], "clear": None, "text_ok": None, "note": ""} for s in samples]}
    json.dump(tpl, open(os.path.join(a.out_dir, "review-template.json"), "w"), indent=1)
    print(json.dumps({"evidence": os.path.join(a.out_dir, "evidence.json"), "samples": len(samples),
                      "sheet_count": len(names), "sheets": [os.path.join(a.out_dir, n) for n in names]}))


def count(a):
    if not os.path.isfile(a.srt):
        fail(1, f"no file at {a.srt}")
    try:
        caps = G.cues(a.srt)
    except G.GuardError as e:
        fail(1, str(e))
    n, c, r, f = read_count(caps)
    print(json.dumps({"samples": n, "sheet_reads": {"clean": c, "regions": r, "final": f, "total": c + r + f},
                      "caption_seconds": round(sum(e - s for s, e, _ in caps), 1)}))


def verify(a):
    if os.path.exists(a.receipt):
        os.remove(a.receipt)  # a rerun invalidates the old receipt until it passes again
    problems = []
    ev = json.load(open(a.evidence))
    review = json.load(open(a.review))
    vsha, ssha = G.sha(a.video), G.sha(a.srt)
    if ev.get("schema_version") != 1:
        problems.append("evidence.json is not schema 1")
    if ev.get("video_sha256") != vsha:
        problems.append("the video is not the file the evidence was taken from: run prepare again")
    if ev.get("srt_sha256") != ssha:
        problems.append("the SRT changed since the evidence was taken: run prepare again")
    if review.get("video_sha256") not in (None, vsha):
        problems.append("review.json names another video")
    d = os.path.dirname(os.path.abspath(a.evidence))
    for s in ev.get("samples", []):
        f = os.path.join(d, s["frame"])
        if not os.path.isfile(f) or G.sha(f) != s["frame_sha256"]:
            problems.append(f"{s['id']}: evidence frame missing or changed")
    want = [s["id"] for s in ev.get("samples", [])]
    got = {r.get("id"): r for r in review.get("samples", [])}
    cue_of = {s["id"]: s["cue"] for s in ev.get("samples", [])}
    by_cue = {}
    for i in want:
        r = got.get(i)
        if r is None:
            problems.append(f"{i}: not reviewed")
            continue
        if r.get("clear") is not True or r.get("text_ok") is not True:
            problems.append(f"{i}: clear={r.get('clear')} text_ok={r.get('text_ok')}")
        note = str(r.get("note") or "").strip()
        if len(note) < MIN_NOTE:
            problems.append(f"{i}: note too short (say what the frame shows, {MIN_NOTE}+ characters)")
        by_cue.setdefault(cue_of.get(i), []).append(note)
    for c, notes in by_cue.items():
        if len(notes) > 1 and len(set(notes)) == 1:
            problems.append(f"cue {c}: every sample has the same note; describe each frame")
    extra = set(got) - set(want)
    if extra:
        problems.append(f"review lists samples the evidence does not: {sorted(extra)[:5]}")
    rec_path = a.captions_record or a.video + ".captions.json"
    rec = json.load(open(rec_path)) if os.path.isfile(rec_path) else None
    if not rec or rec.get("profile") != "safe" or rec.get("video_sha256") != vsha:
        problems.append(f"{rec_path} is missing or is not a safe-profile record of this exact file")
    else:
        st = G.current(rec.get("source_sha256", ""))
        last = (st or {}).get("renders", [{}])[-1] if (st or {}).get("renders") else {}
        if last.get("verdict") != "RENDERED" or last.get("video_sha256") != vsha:
            problems.append("the guard state does not show this file as the source's latest render")
    if problems:
        for p in problems[:40]:
            print(f"  {p}", file=sys.stderr)
        fail(1, f"caption review not verified ({len(problems)} problem(s)); no receipt written")
    receipt = {"verdict": "CAPTIONS_REVIEWED", "video": os.path.abspath(a.video), "video_sha256": vsha,
               "srt_sha256": ssha, "evidence_sha256": G.sha(a.evidence), "review_sha256": G.sha(a.review),
               "samples": len(want), "sheets": ev.get("sheets", []),
               "review_kind": "self-reviewed by the agent; no detector",
               "method": "sampled frames viewed by the agent, at most 0.25 s apart plus cue edges; not frame-by-frame"}
    json.dump(receipt, open(a.receipt, "w"), indent=1)
    print(json.dumps({"receipt": a.receipt, "verdict": receipt["verdict"], "samples": len(want)}))


def main():
    p = argparse.ArgumentParser()
    p.add_argument("cmd", choices=["prepare", "verify", "count"])
    p.add_argument("--video")
    p.add_argument("--srt", required=True)
    p.add_argument("--out-dir")
    p.add_argument("--evidence")
    p.add_argument("--review")
    p.add_argument("--receipt")
    p.add_argument("--captions-record")
    a = p.parse_args()
    if a.cmd == "count":
        return count(a)
    if not a.video:
        fail(1, f"{a.cmd} needs --video")
    for tool in ("ffmpeg", "ffprobe"):
        if not shutil.which(tool):
            fail(2, f"{tool} is missing: the machine is broken (HR21: report, never install)")
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
