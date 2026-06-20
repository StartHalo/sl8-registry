#!/usr/bin/env python3
"""Detect whether each listing image is AI/digitally altered, for the AB-723 audit (check 1).

Primary signal: C2PA Content Credentials via c2patool (digitalSourceType=trainedAlgorithmicMedia).
Fallback: the user's declared-altered list (+ a low-confidence note). C2PA is strippable, so a
NEGATIVE never certifies "not altered" — only a positive is high-confidence.

Usage:
  python3 detect-altered.py --media <f1> <f2> ... [--declared name3,name7] [--c2patool <path>]
Emits JSON to stdout: {"results":[{file, path, altered(bool|null), method, confidence, detail}], "c2patool":bool}
"""
import argparse
import json
import os
import shutil
import subprocess


def c2pa_check(path, c2patool):
    try:
        r = subprocess.run([c2patool, path, "--detailed"], capture_output=True, text=True, timeout=60)
        out = (r.stdout or "") + (r.stderr or "")
        if "trainedAlgorithmicMedia" in out:
            return True, "c2pa", 0.95, "C2PA digitalSourceType=trainedAlgorithmicMedia"
        if r.returncode == 0 and ("manifest" in out.lower() or "claim_generator" in out.lower()):
            return False, "c2pa", 0.6, "C2PA manifest present, no trainedAlgorithmicMedia assertion"
        return None, "c2pa", 0.3, "no C2PA manifest (strippable; cannot certify not-altered)"
    except Exception as e:
        return None, "c2pa-error", 0.0, "c2patool failed: %s" % e


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--media", nargs="+", required=True)
    ap.add_argument("--declared", default="")
    ap.add_argument("--c2patool", default=os.environ.get("C2PATOOL", "c2patool"))
    a = ap.parse_args()

    declared = {x.strip() for x in a.declared.split(",") if x.strip()}
    tool = a.c2patool if (shutil.which(a.c2patool) or os.path.exists(a.c2patool)) else None
    results = []
    for f in a.media:
        name = os.path.basename(f)
        altered, method, conf, detail = None, "none", 0.0, ""
        if tool:
            altered, method, conf, detail = c2pa_check(f, tool)
        if name in declared or f in declared:
            altered = True
            method = "declared+c2pa" if method.startswith("c2pa") else "declared"
            conf = max(conf, 0.9)
            detail = (detail + "; " if detail else "") + "user-declared altered"
        elif not tool:
            method, conf = "heuristic", 0.2
            detail = "no c2patool and not declared -> unknown; treat as possibly altered and ask the user"
        results.append({"file": name, "path": f, "altered": altered, "method": method,
                        "confidence": round(conf, 2), "detail": detail})
    print(json.dumps({"results": results, "c2patool": bool(tool)}, indent=2))


if __name__ == "__main__":
    main()
