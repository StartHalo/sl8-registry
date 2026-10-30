#!/usr/bin/env python3
"""consent.py: the consent gate of voice-dub as a script (HR13, HR19), SL8-authored.

  python3 consent.py <consent.json> --speakers N

consent.json: {"speakers": [{"name": "<name>", "consent": "owner" | "written permission from <name>"}, ...]}
Exactly the two forms media-audio-generation admits, nothing else (a legal assurance, "only a test",
"internal use" are not forms). The number of entries must equal the confirmed speaker count N.
Prints one line per speaker and a verdict line; this printout is step 2's artefact.
Exit: 0 every speaker has one of the two forms and the count matches; 1 unreadable file;
3 anything else (empty file, wrong form, wrong count): steps 4-21 do not run.
This script checks form only. Until SL8's consent text and privacy note are approved (learnings
VID-L499) the skill still refuses a real person's voice or face, whatever this script says.
"""
import argparse, json, re, sys

FORM = re.compile(r"^written permission from \S.*$")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("file")
    ap.add_argument("--speakers", type=int, required=True)
    a = ap.parse_args()
    try:
        with open(a.file, encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, ValueError) as e:
        print(f"cannot read {a.file}: {e}", file=sys.stderr)
        return 1
    rows = data.get("speakers") if isinstance(data, dict) else None
    if not isinstance(rows, list) or not rows:
        print("CONSENT BLOCKED: no speakers recorded")
        return 3
    bad = []
    for i, r in enumerate(rows, 1):
        name = (r.get("name") or "").strip() if isinstance(r, dict) else ""
        c = r.get("consent") if isinstance(r, dict) else None
        ok = bool(name) and isinstance(c, str) and (c == "owner" or bool(FORM.match(c)))
        print(f"speaker {i} {name or '(no name)'}: {c!r} -> {'ok' if ok else 'BLOCKED'}")
        if not ok:
            bad.append(i)
    if len(rows) != a.speakers:
        print(f"CONSENT BLOCKED: {len(rows)} entries for {a.speakers} confirmed speakers")
        return 3
    if bad:
        print(f"CONSENT BLOCKED: speakers {bad} lack a named speaker and exactly 'owner' or 'written permission from <name>'")
        return 3
    print(f"CONSENT OK: {len(rows)} speaker(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
