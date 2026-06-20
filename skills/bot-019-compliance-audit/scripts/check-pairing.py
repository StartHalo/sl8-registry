#!/usr/bin/env python3
"""AB-723 original-pairing check (check 3) — deterministic.

For each altered file, verify: (1) an unaltered original is present (local path or URL),
(2) any original URL is public + login-free (heuristic), (3) the original is ADJACENT to the altered
file in the publish sequence (AB-723 / CRMLS 11.5.2 require "immediately before or after").

Usage:
  python3 check-pairing.py --sequence <ordered file names...> --altered name3,name7 \
     [--originals name3=orig3.jpg,name7=https://host/orig7.jpg]
Emits JSON: {"results":[{file, original, original_present, public_no_login, adjacent(bool|null), ok, fix}]}
"""
import argparse
import json
import os
import re

LOGIN_HINTS = re.compile(r"(login|sign[-_]?in|/auth|account|password|[?&]token=)", re.I)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sequence", nargs="+", required=True, help="ordered file names as they'll publish")
    ap.add_argument("--altered", default="")
    ap.add_argument("--originals", default="", help="comma list of altered=original (path or URL)")
    a = ap.parse_args()

    seq = [os.path.basename(x) for x in a.sequence]
    altered = [os.path.basename(x.strip()) for x in a.altered.split(",") if x.strip()]
    omap = {}
    for pair in a.originals.split(","):
        if "=" in pair:
            k, v = pair.split("=", 1)
            omap[os.path.basename(k.strip())] = v.strip()

    results = []
    for fb in altered:
        orig = omap.get(fb)
        present = bool(orig)
        is_url = bool(orig and re.match(r"https?://", orig))
        public_no_login = (not present) or (not is_url) or (not LOGIN_HINTS.search(orig))
        adjacent = None
        if present and not is_url:
            ob = os.path.basename(orig)
            if fb in seq and ob in seq:
                i, j = seq.index(fb), seq.index(ob)
                adjacent = abs(i - j) == 1
        ok = present and public_no_login and (adjacent is not False)
        fix = []
        if not present:
            fix.append("attach the unaltered original (AB-723 requires it)")
        if present and is_url and not public_no_login:
            fix.append("host the original at a PUBLIC, login-free URL/QR")
        if adjacent is False:
            fix.append("place the original immediately before/after the altered image in the photo sequence")
        results.append({"file": fb, "original": orig, "original_present": present,
                        "public_no_login": public_no_login, "adjacent": adjacent,
                        "ok": ok, "fix": "; ".join(fix)})
    print(json.dumps({"results": results}, indent=2))


if __name__ == "__main__":
    main()
