#!/usr/bin/env python3
"""
tryon-qc.py — the BLOCKING fidelity + misrepresentation gate for every try-on output.

A virtual try-on model has NO hard fidelity lock: it can smooth a cheap knit into a
luxe one, straighten a warped print, lengthen a crop, or slim a fit — exactly the
Vinted/BBC dropship-scam failure where the received item "didn't correspond ... fabric
quality, garment details, cut, and fit all differed substantially." This gate catches
that BEFORE the seller ships it, on TWO axes:

  1. FIDELITY — is the on-model garment the SAME garment as the flat-lay reference?
     fabric/texture, print/pattern, color, buttons/seams/trim, cut/length/silhouette.
  2. MISREPRESENTATION — did the try-on FLATTER the garment beyond the real item? A
     cheap fabric rendered luxe, a wrinkled garment pressed smooth, a loose fit slimmed,
     a short hem lengthened. This is the returns-and-fraud axis; it is graded SEPARATELY
     from cosmetic defects, because a flattered-but-pretty image is the dangerous one.

It ALSO catches the routine per-generation defects that get output thrown away:
mangled hands, warped print, broken fabric drape, face drift across a catalog.

Mechanism: a Claude vision compare via the in-sandbox `claude` CLI (vision-capable,
headless, keyless host-session — no separate API key). Both images are attached; Claude
returns a strict JSON verdict, which we validate and persist. (Image paths are passed to
the claude CLI as args — this script does not decode pixels itself, so no Pillow.)

Verdicts (the CALLER drops/flags/ships on these — this script only judges):
  pass    — same garment AND not flattered, confidence >= --threshold (default 0.80).
            Ship.
  drift   — the garment changed (fabric/print/color/cut/length) or is a different
            garment. DO NOT ship; regenerate (different seed/mode) then drop+flag.
  flatter — the garment is recognizably the same BUT rendered more flattering than the
            real item (fabric upgraded, fit slimmed, hem lengthened, wrinkles removed).
            This is the MISREPRESENTATION gate: DO NOT ship as a catalog truth-claim;
            escalate to the seller. Treated as blocking, like drift.
  review  — mangled hands / warped print / fine-print text you cannot verify / face
            uncertain / confidence below threshold. Ship ONLY with a prominent flag;
            never certify.

Usage:
  tryon-qc.py --candidate <on-model.png> --garment <flat-lay.jpg> --out <verdict.json>
              [--model-ref <house-model.jpg>] [--threshold 0.80]
              [--claude-bin claude] [--model <id>]

Exit codes (the verdict JSON is the source of truth either way):
  0  verdict == pass
  3  verdict == review
  4  verdict == drift
  5  verdict == flatter   (misrepresentation — blocking, distinct from drift)
  2  could not obtain a verdict (claude missing / unparseable) -> treat as review+block
"""
import argparse
import json
import os
import subprocess
import sys

JUDGE_PROMPT = """You are a virtual-try-on fidelity AND misrepresentation inspector for an apparel listing.

You are given images:
  - GARMENT: the seller's real flat-lay / ghost-mannequin photo of the garment (the source
    of truth — this is the actual item a buyer will receive).
  - CANDIDATE: an AI-generated on-model image that is supposed to show the SAME garment worn
    by a model.
  - (Optionally) MODEL_REF: the intended house model's face, for catalog face-consistency.

Judge the GARMENT as worn in the CANDIDATE against the real GARMENT. The model, pose, scene,
lighting, and background are ALLOWED to differ — only the GARMENT must be the same item, and
it must NOT be made to look better than the real one.

Score each dimension 0.0-1.0 (1.0 = matches the real garment exactly):
  fabric    — same fabric type/texture/weight/sheen (a cheap knit must NOT look luxe).
  print     — same print/pattern, not warped, straightened, or re-drawn.
  color     — same color(s), no shifted hue.
  trim      — same buttons, zippers, seams, stitching, collar, pockets.
  cut_fit   — same cut, length, and fit/drape (a loose fit must NOT be slimmed; a short
              hem must NOT be lengthened; wrinkles must NOT be pressed smooth if the real
              item is wrinkled).
  realism   — no mangled hands, broken drape, or warped artifacts in the rendered person.

Then decide ONE verdict:
  - "pass"    if it is clearly the SAME garment, NOT flattered beyond the real item, and has
              no disqualifying render defect.
  - "drift"   if the garment changed (fabric/print/color/trim/cut/length) or is a different
              garment.
  - "flatter" if it is recognizably the same garment BUT rendered MORE FLATTERING than the
              real item: fabric upgraded to look more premium, fit slimmed, hem/length
              extended, wrinkles/defects removed, drape idealized. This is misrepresentation
              even when "pretty" — flag it, do NOT call it pass.
  - "review"  if hands are mangled, the print is warped, there is fine print/text you cannot
              verify, the face is uncertain vs MODEL_REF, or you are otherwise unsure — when
              in doubt, "review", never "pass".

Set "confidence" to your overall confidence (0.0-1.0) that the candidate honestly shows the
same garment as the real GARMENT without flattering it.

Respond with ONLY a single JSON object, no prose, no code fences:
{"verdict":"pass|drift|flatter|review","confidence":0.0,"dims":{"fabric":0.0,"print":0.0,"color":0.0,"trim":0.0,"cut_fit":0.0,"realism":0.0},"findings":"one short sentence on the most important difference or 'same garment, not flattered' if none"}
"""

VALID = ("pass", "drift", "flatter", "review")
EXIT = {"pass": 0, "review": 3, "drift": 4, "flatter": 5}


def run_claude(claude_bin, model, garment, candidate, model_ref):
    """Call the claude CLI with the garment + candidate (+ optional model ref) attached."""
    cmd = [claude_bin, "-p", JUDGE_PROMPT, "--image", garment, "--image", candidate]
    if model_ref:
        cmd += ["--image", model_ref]
    cmd += ["--output-format", "text"]
    if model:
        cmd += ["--model", model]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    if proc.returncode != 0:
        raise RuntimeError(f"claude exited {proc.returncode}: {proc.stderr.strip()[:400]}")
    return proc.stdout.strip()


def parse_verdict(text):
    """Extract the first JSON object from the model's reply and validate it."""
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError(f"no JSON object in reply: {text[:200]!r}")
    obj = json.loads(text[start:end + 1])
    if obj.get("verdict") not in VALID:
        raise ValueError(f"bad verdict field: {obj.get('verdict')!r}")
    obj.setdefault("confidence", 0.0)
    obj.setdefault("dims", {})
    obj.setdefault("findings", "")
    return obj


def main():
    ap = argparse.ArgumentParser(
        description="Blocking try-on QC: candidate on-model vs the real garment (fidelity + flattery).")
    ap.add_argument("--candidate", required=True, help="the generated on-model image to check")
    ap.add_argument("--garment", required=True,
                    help="the seller's real flat-lay/ghost-mannequin garment photo (source of truth)")
    ap.add_argument("--out", required=True, help="path to write the verdict JSON")
    ap.add_argument("--model-ref", default="",
                    help="optional intended house-model face image for catalog consistency")
    ap.add_argument("--threshold", type=float, default=0.80,
                    help="min confidence for a 'pass' to stand (default 0.80)")
    ap.add_argument("--claude-bin", default=os.environ.get("CLAUDE_BIN", "claude"))
    ap.add_argument("--model", default=os.environ.get("TRYON_QC_MODEL", ""),
                    help="optional vision-capable model id for claude --model")
    args = ap.parse_args()

    inputs = [("candidate", args.candidate), ("garment", args.garment)]
    if args.model_ref:
        inputs.append(("model-ref", args.model_ref))
    for label, p in inputs:
        if not os.path.isfile(p):
            sys.stderr.write(f"tryon-qc: {label} not found: {p}\n")
            _write_block(args.out, p, args.candidate, args.garment,
                         "missing input image -> cannot certify")
            sys.exit(2)

    try:
        raw = run_claude(args.claude_bin, args.model, args.garment, args.candidate,
                         args.model_ref or None)
        verdict = parse_verdict(raw)
    except Exception as e:  # claude missing/failed/unparseable -> block as review
        sys.stderr.write(f"tryon-qc: could not obtain a verdict ({e}) -> review+block\n")
        _write_block(args.out, "verdict-error", args.candidate, args.garment, str(e))
        sys.exit(2)

    # A "pass" below the confidence threshold is downgraded to "review" (never ship a
    # low-confidence pass silently).
    if verdict["verdict"] == "pass" and float(verdict.get("confidence", 0)) < args.threshold:
        verdict["verdict"] = "review"
        verdict["findings"] = (verdict.get("findings", "") +
                               f" [downgraded: confidence {verdict.get('confidence')} < {args.threshold}]").strip()

    verdict["candidate"] = args.candidate
    verdict["garment"] = args.garment
    if args.model_ref:
        verdict["model_ref"] = args.model_ref
    verdict["threshold"] = args.threshold
    os.makedirs(os.path.dirname(os.path.abspath(args.out)) or ".", exist_ok=True)
    with open(args.out, "w") as f:
        json.dump(verdict, f, indent=2)

    sys.stderr.write(f"tryon-qc: {verdict['verdict']} (confidence {verdict.get('confidence')}) -> {args.out}\n")
    print(json.dumps(verdict))
    sys.exit(EXIT[verdict["verdict"]])


def _write_block(out, src, candidate, garment, findings):
    """Persist a blocking review verdict when no real judgment was possible."""
    obj = {"verdict": "review", "confidence": 0.0,
           "dims": {}, "findings": f"BLOCK: {findings}",
           "candidate": candidate, "garment": garment, "source": src}
    try:
        os.makedirs(os.path.dirname(os.path.abspath(out)) or ".", exist_ok=True)
        with open(out, "w") as f:
            json.dump(obj, f, indent=2)
    except Exception:
        pass


if __name__ == "__main__":
    main()
