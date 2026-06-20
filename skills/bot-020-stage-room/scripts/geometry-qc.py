#!/usr/bin/env python3
"""
geometry-qc.py — the BLOCKING architecture-integrity gate for every edited listing photo.

Compares a CANDIDATE image (a virtually-staged room, a decluttered/twilight/sky-swapped
photo, a restyled room, a renovation "after" concept) against the unaltered ORIGINAL on
ARCHITECTURE only: walls, windows, doors, ceiling/roofline, the room footprint, the camera
angle/framing — and on DEFECT-HONESTY (no structural defect erased, no permanent fixture
added/removed, no dimensions changed). The decor/furniture/lighting/finishes ARE allowed to
change (that is the intended edit, named in --expected-change); the building is not.

This is the real-estate analogue of BOT-022's fidelity-qc.py. The load-bearing fact it
defends: reachable fal edit models have NO hard geometry lock (no ControlNet/depth/mask), so
a naive "stage this room" prompt can shift a window, re-proportion a wall, change the camera,
or quietly erase a defect — turning a marketing edit into AB-723 material misrepresentation
(a California misdemeanor + DRE discipline + MLS fines). This gate catches that.

Shared pattern: bundled in each BOT-020 generation skill (stage-room, fix-photo,
restyle-room). The decision is the CALLER's: this script emits a verdict; the SKILL
regenerates / drops / flags on it.

Mechanism: a Claude vision compare via the in-sandbox `claude` CLI (vision-capable,
headless, keyless host-session — no separate API key). Both images are sent; Claude returns
a strict JSON verdict, which we validate and persist.

Verdicts:
  pass    — architecture unchanged, confidence >= --threshold (default 0.80). Ship.
  drift   — a wall/window/door/ceiling moved, was added or removed; the camera changed; the
            room footprint changed; OR a structural defect was erased / a permanent fixture
            added or removed. DO NOT ship; regenerate with a reinforced preserve clause, then
            keep-best + FLAG.
  review  — the change cannot be confidently verified (occlusion, heavy restyle, unsure).
            Ship but FLAG for human review; never certify. When in doubt, "review", never "pass".

Usage:
  geometry-qc.py --candidate <edited.jpg> --reference <original.jpg> --out <verdict.json>
                 [--expected-change "added furniture / virtual staging"]
                 [--threshold 0.80] [--claude-bin claude] [--model <id>]

Exit codes (for scripting; the verdict JSON is the source of truth either way):
  0  verdict == pass
  3  verdict == review
  4  verdict == drift
  2  could not obtain a verdict (claude missing / unparseable) -> treat as review+block
"""
import argparse
import json
import os
import subprocess
import sys

JUDGE_PROMPT_TMPL = """You are an architectural-integrity inspector for a real-estate listing photo.

You are given TWO images:
  - REFERENCE: the UNALTERED ORIGINAL listing photo (the source of truth for the property).
  - CANDIDATE: an AI-edited version of that same photo.

The edit was SUPPOSED to change ONLY this: {expected_change}.
That intended change is ALLOWED and must NOT be counted against the candidate. For example,
if the edit is virtual staging, added furniture/decor is expected; if it is a twilight or
sky edit, the lighting/sky is expected to change; if it is a restyle, finishes/paint/fixtures
are expected to change. Judge ONLY whether the PROPERTY'S ARCHITECTURE is otherwise the SAME.

Under California AB-723, a listing edit must be "better, not different": you may improve the
look, but you may NOT move, add, or remove structure, change the dimensions/footprint, change
the camera so the space reads differently, erase a structural defect, or add/remove a
permanent fixture. Those are misrepresentations — the failures you must catch.

Score each dimension 0.0-1.0 (1.0 = identical to the reference architecture):
  walls    — same walls in the same places, same proportions; none added/removed/moved/warped?
  windows  — same windows/doors/openings, same count, size, and position; none invented or deleted?
  ceiling  — same ceiling height/line and (for exteriors) the same roofline/structure?
  camera   — same camera angle, framing, lens, and perspective (the space reads the same size)?
  footprint — same room footprint/dimensions; the space is not enlarged, shrunk, or reshaped?
  defect_honesty — no structural defect (crack, stain, sag, damage) erased and no permanent
                   fixture (radiator, vent, built-in, beam, column) added or removed?

Then decide a verdict:
  - "pass"   if the architecture is clearly unchanged (only the intended edit differs).
  - "drift"  if any wall/window/door/ceiling/footprint moved, was added or removed; if the
             camera changed so the space reads differently; or if a structural defect was
             erased or a permanent fixture was added/removed.
  - "review" if you cannot confidently verify the architecture (heavy occlusion by new
             furniture, a bold restyle, an unsure call) — when in doubt, "review", never "pass".

Set "confidence" to your overall confidence (0.0-1.0) that the candidate preserves the
reference property's architecture (ignoring the intended change).

Respond with ONLY a single JSON object, no prose, no code fences:
{{"verdict":"pass|drift|review","confidence":0.0,"dims":{{"walls":0.0,"windows":0.0,"ceiling":0.0,"camera":0.0,"footprint":0.0,"defect_honesty":0.0}},"findings":"one short sentence on the most important architectural difference, or 'architecture preserved' if none"}}
"""


def run_claude(claude_bin, model, reference, candidate, expected_change):
    """Call the claude CLI with both images attached; return raw stdout text."""
    # The claude CLI accepts image paths as arguments alongside -p. Order them so the
    # prompt names REFERENCE then CANDIDATE; the prompt text states which is which.
    prompt = JUDGE_PROMPT_TMPL.format(expected_change=expected_change or "an unspecified edit")
    cmd = [claude_bin, "-p", prompt,
           "--image", reference, "--image", candidate,
           "--output-format", "text"]
    if model:
        cmd += ["--model", model]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    if proc.returncode != 0:
        raise RuntimeError(f"claude exited {proc.returncode}: {proc.stderr.strip()[:400]}")
    return proc.stdout.strip()


def parse_verdict(text):
    """Extract the first JSON object from the model's reply."""
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError(f"no JSON object in reply: {text[:200]!r}")
    obj = json.loads(text[start:end + 1])
    if obj.get("verdict") not in ("pass", "drift", "review"):
        raise ValueError(f"bad verdict field: {obj.get('verdict')!r}")
    obj.setdefault("confidence", 0.0)
    obj.setdefault("dims", {})
    obj.setdefault("findings", "")
    return obj


def main():
    ap = argparse.ArgumentParser(description="Blocking architecture QC: edited photo vs unaltered original.")
    ap.add_argument("--candidate", required=True, help="the AI-edited listing photo to check")
    ap.add_argument("--reference", required=True, help="the unaltered original (source of truth)")
    ap.add_argument("--out", required=True, help="path to write the verdict JSON")
    ap.add_argument("--expected-change", default=os.environ.get("GEOMETRY_QC_EXPECTED", ""),
                    help="short description of what the edit was SUPPOSED to change (ignored by the judge)")
    ap.add_argument("--threshold", type=float, default=0.80,
                    help="min confidence for a 'pass' to stand (default 0.80)")
    ap.add_argument("--claude-bin", default=os.environ.get("CLAUDE_BIN", "claude"))
    ap.add_argument("--model", default=os.environ.get("GEOMETRY_QC_MODEL", ""),
                    help="optional vision-capable model id for claude --model")
    args = ap.parse_args()

    for label, p in (("candidate", args.candidate), ("reference", args.reference)):
        if not os.path.isfile(p):
            sys.stderr.write(f"geometry-qc: {label} not found: {p}\n")
            _write_block(args.out, p, args.candidate, args.reference,
                         "missing input image -> cannot certify")
            sys.exit(2)

    try:
        raw = run_claude(args.claude_bin, args.model, args.reference, args.candidate,
                         args.expected_change)
        verdict = parse_verdict(raw)
    except Exception as e:  # claude missing/failed/unparseable -> block as review
        sys.stderr.write(f"geometry-qc: could not obtain a verdict ({e}) -> review+block\n")
        _write_block(args.out, "verdict-error", args.candidate, args.reference, str(e))
        sys.exit(2)

    # A "pass" below the confidence threshold is downgraded to "review" (never ship
    # a low-confidence pass silently).
    if verdict["verdict"] == "pass" and float(verdict.get("confidence", 0)) < args.threshold:
        verdict["verdict"] = "review"
        verdict["findings"] = (verdict.get("findings", "") +
                               f" [downgraded: confidence {verdict.get('confidence')} < {args.threshold}]").strip()

    verdict["candidate"] = args.candidate
    verdict["reference"] = args.reference
    verdict["expected_change"] = args.expected_change
    verdict["threshold"] = args.threshold
    os.makedirs(os.path.dirname(os.path.abspath(args.out)) or ".", exist_ok=True)
    with open(args.out, "w") as f:
        json.dump(verdict, f, indent=2)

    sys.stderr.write(f"geometry-qc: {verdict['verdict']} (confidence {verdict.get('confidence')}) -> {args.out}\n")
    print(json.dumps(verdict))
    sys.exit({"pass": 0, "review": 3, "drift": 4}[verdict["verdict"]])


def _write_block(out, src, candidate, reference, findings):
    """Persist a blocking review verdict when no real judgment was possible."""
    obj = {"verdict": "review", "confidence": 0.0,
           "dims": {}, "findings": f"BLOCK: {findings}",
           "candidate": candidate, "reference": reference, "source": src}
    try:
        os.makedirs(os.path.dirname(os.path.abspath(out)) or ".", exist_ok=True)
        with open(out, "w") as f:
            json.dump(obj, f, indent=2)
    except Exception:
        pass


if __name__ == "__main__":
    main()
