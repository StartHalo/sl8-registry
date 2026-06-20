#!/usr/bin/env python3
"""
fidelity-qc.py — the BLOCKING fidelity gate for every generative output.

Compares a CANDIDATE image (a lifestyle scene, an alternate angle, any generative
edit) against the approved REFERENCE (the hero/cutout) on PRODUCT IDENTITY only:
color, shape, label/text, material/surface. The scene/background is allowed to
differ; the PRODUCT is not. This is the safety net for the load-bearing PoC finding:
reachable fal edit models have no hard fidelity lock, and a generative re-background
once turned a mug into a leather luggage tag — this gate catches that.

Shared pattern: called by bot-022-lifestyle-composer (scenes) and by packshot-studio
(alternate angles / any generative edit). Decision is the CALLER's: this script
emits a verdict; the SKILL drops/flags/ships on it.

Mechanism: a Claude vision compare via the in-sandbox `claude` CLI (vision-capable,
headless, keyless host-session — no separate API key). Both images are sent; Claude
returns a strict JSON verdict, which we validate and persist.

Verdicts:
  pass    — same product, confidence >= --threshold (default 0.80). Ship.
  drift   — the product changed (shape/label/color/material) or is a different
            product. DO NOT ship; regenerate re-anchored, then drop+flag.
  review  — reflective/metallic/fine-text class OR confidence below threshold.
            Ship but FLAG for human review; never certify.

Usage:
  fidelity-qc.py --candidate <scene.jpg> --reference <hero.jpg> --out <verdict.json>
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

JUDGE_PROMPT = """You are a product-photography fidelity inspector for an e-commerce listing.

You are given TWO images:
  - REFERENCE: the approved product photo (the source of truth for the product).
  - CANDIDATE: a generated lifestyle/scene image that is supposed to show the SAME product.

Judge ONLY the PRODUCT, not the background or scene. The scene, lighting, props, and
camera angle are ALLOWED to differ. The PRODUCT must be the SAME object: same overall
shape and proportions, same color, same label/printed text/logo, same material and
surface finish. A generative model sometimes hallucinates a DIFFERENT product that
merely shares a color or motif — that is the failure you must catch.

Score each dimension 0.0-1.0 (1.0 = identical to the reference product):
  identity  — is it recognizably the same product, not a different object?
  color     — same color(s)?
  shape     — same shape/proportions/silhouette?
  label     — same label/printed text/logo, legible and matching?
  surface   — same material/finish (matte/gloss/metal/fabric)?

Then decide a verdict:
  - "pass"   if it is clearly the same product (no meaningful drift on any dimension).
  - "drift"  if the product changed in shape, label, color, or material, or it is a
             different product.
  - "review" if the product is reflective/metallic, has fine/small text you cannot
             confidently verify, or you are otherwise unsure — when in doubt, "review",
             never "pass".

Set "confidence" to your overall confidence (0.0-1.0) that the candidate shows the
same product as the reference.

Respond with ONLY a single JSON object, no prose, no code fences:
{"verdict":"pass|drift|review","confidence":0.0,"dims":{"identity":0.0,"color":0.0,"shape":0.0,"label":0.0,"surface":0.0},"findings":"one short sentence on the most important difference, or 'same product' if none"}
"""


def run_claude(claude_bin, model, reference, candidate):
    """Call the claude CLI with both images attached; return raw stdout text."""
    # The claude CLI accepts image paths as arguments alongside -p. Order them so the
    # prompt names REFERENCE then CANDIDATE; the prompt text states which is which.
    cmd = [claude_bin, "-p", JUDGE_PROMPT,
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
    ap = argparse.ArgumentParser(description="Blocking fidelity QC: candidate vs reference product.")
    ap.add_argument("--candidate", required=True, help="the generated image to check")
    ap.add_argument("--reference", required=True, help="the approved hero/cutout (source of truth)")
    ap.add_argument("--out", required=True, help="path to write the verdict JSON")
    ap.add_argument("--threshold", type=float, default=0.80,
                    help="min confidence for a 'pass' to stand (default 0.80)")
    ap.add_argument("--claude-bin", default=os.environ.get("CLAUDE_BIN", "claude"))
    ap.add_argument("--model", default=os.environ.get("FIDELITY_QC_MODEL", ""),
                    help="optional vision-capable model id for claude --model")
    args = ap.parse_args()

    for label, p in (("candidate", args.candidate), ("reference", args.reference)):
        if not os.path.isfile(p):
            sys.stderr.write(f"fidelity-qc: {label} not found: {p}\n")
            _write_block(args.out, p, args.candidate, args.reference,
                         "missing input image -> cannot certify")
            sys.exit(2)

    try:
        raw = run_claude(args.claude_bin, args.model, args.reference, args.candidate)
        verdict = parse_verdict(raw)
    except Exception as e:  # claude missing/failed/unparseable -> block as review
        sys.stderr.write(f"fidelity-qc: could not obtain a verdict ({e}) -> review+block\n")
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
    verdict["threshold"] = args.threshold
    os.makedirs(os.path.dirname(os.path.abspath(args.out)) or ".", exist_ok=True)
    with open(args.out, "w") as f:
        json.dump(verdict, f, indent=2)

    sys.stderr.write(f"fidelity-qc: {verdict['verdict']} (confidence {verdict.get('confidence')}) -> {args.out}\n")
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
