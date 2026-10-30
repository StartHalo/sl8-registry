#!/usr/bin/env python3
"""triage.py: source-quality triage before any paid call, for voice-dub.

SL8-authored from the behaviour WF23-a1 step 7 records (frames and audio of the first ~10 s, scene
cuts, volume) with HeyGen's lip-sync ceiling as the reading guide (heygentranslate-6301ed#27, #28).
It measures; the agent still looks at the frames it writes, and the customer decides on borderline
sources after the disclaimer.

  python3 triage.py <source video> --out-dir work/<p>/triage [--window 10] [--scene 0.4] [--short 2.0]

Writes <out-dir>/frame_NN.png (1 fps over the window) and <out-dir>/triage.json:
streams (video and audio present, width, height, duration, bitrate), audio levels over the window
(volumedetect), scene cuts over the WHOLE source with the shots shorter than --short seconds, and,
when OpenCV is importable, the largest frontal face per frame (height in pixels; frames without one).
Flags: no_audio, near_silent, low_res (frame height under 720), short_shots, few_faces, small_face.
The scene threshold 0.4 and the face reading are ours (untested).
Exit: 0 written; 1 unreadable source; 2 no audio stream (dubbing is the wrong tool).
"""
import argparse, glob, json, os, re, subprocess, sys


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("--out-dir", required=True)
    ap.add_argument("--window", type=float, default=10.0)
    ap.add_argument("--scene", type=float, default=0.4)
    ap.add_argument("--short", type=float, default=2.0)
    a = ap.parse_args()
    os.makedirs(a.out_dir, exist_ok=True)

    p = run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height,bit_rate:format=duration,bit_rate",
             "-of", "json", a.src])
    if p.returncode != 0:
        print(p.stderr.strip() or "ffprobe failed", file=sys.stderr)
        return 1
    info = json.loads(p.stdout)
    vs = [s for s in info.get("streams", []) if s.get("codec_type") == "video"]
    au = [s for s in info.get("streams", []) if s.get("codec_type") == "audio"]
    fmt = info.get("format", {})
    dur = float(fmt.get("duration") or 0)
    rep = {"source": a.src, "duration_s": dur, "video": bool(vs), "audio": bool(au),
           "width": vs[0].get("width") if vs else None, "height": vs[0].get("height") if vs else None,
           "bit_rate": fmt.get("bit_rate"), "window_s": a.window, "flags": []}
    if not au:
        rep["flags"].append("no_audio")
    else:
        v = run(["ffmpeg", "-hide_banner", "-nostats", "-t", str(a.window), "-i", a.src, "-vn",
                 "-af", "volumedetect", "-f", "null", "-"])
        mean = re.search(r"mean_volume:\s*(-?[\d.]+)", v.stderr)
        peak = re.search(r"max_volume:\s*(-?[\d.]+)", v.stderr)
        rep["mean_volume_db"] = float(mean.group(1)) if mean else None
        rep["max_volume_db"] = float(peak.group(1)) if peak else None
        if rep["max_volume_db"] is not None and rep["max_volume_db"] < -45:
            rep["flags"].append("near_silent")
    if vs:
        if rep["height"] and min(rep["height"], rep["width"] or rep["height"]) < 720:
            rep["flags"].append("low_res")
        for f in glob.glob(os.path.join(a.out_dir, "frame_*.png")):
            os.remove(f)
        run(["ffmpeg", "-v", "error", "-y", "-t", str(a.window), "-i", a.src, "-vf", "fps=1",
             os.path.join(a.out_dir, "frame_%02d.png")])
        frames = sorted(glob.glob(os.path.join(a.out_dir, "frame_*.png")))
        rep["frames"] = frames
        s = run(["ffmpeg", "-hide_banner", "-nostats", "-i", a.src, "-an", "-vf",
                 f"select='gt(scene,{a.scene})',showinfo", "-f", "null", "-"])
        cuts = [float(x) for x in re.findall(r"pts_time:([\d.]+)", s.stderr)]
        bounds = [0.0] + cuts + ([dur] if dur else [])
        shots = [round(b - x, 3) for x, b in zip(bounds, bounds[1:]) if b > x]
        rep["cuts_s"] = cuts
        rep["shots"] = len(shots)
        rep["short_shots"] = [x for x in shots if x < a.short]
        if rep["short_shots"]:
            rep["flags"].append("short_shots")
        try:
            import cv2  # baked on the Studio machine (opencv); optional here
            casc = cv2.CascadeClassifier(os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml"))
            faces = []
            for f in frames:
                g = cv2.cvtColor(cv2.imread(f), cv2.COLOR_BGR2GRAY)
                found = casc.detectMultiScale(g, scaleFactor=1.1, minNeighbors=5, minSize=(40, 40))
                faces.append(int(max((h for (_, _, _, h) in found), default=0)))
            rep["face_height_px"] = faces
            with_face = [h for h in faces if h]
            rep["frames_with_face"] = f"{len(with_face)}/{len(faces)}"
            if faces and len(with_face) < len(faces) / 2:
                rep["flags"].append("few_faces")
            if with_face and max(with_face) < 0.2 * (rep["height"] or 0):
                rep["flags"].append("small_face")
        except Exception as e:  # no OpenCV or no cascade file: say so, the agent judges the frames
            rep["face_check"] = f"not run ({type(e).__name__}); judge the frames by eye"
    with open(os.path.join(a.out_dir, "triage.json"), "w", encoding="utf-8") as f:
        json.dump(rep, f, indent=1)
    print(json.dumps(rep, indent=1))
    return 2 if not au else 0


if __name__ == "__main__":
    sys.exit(main())
