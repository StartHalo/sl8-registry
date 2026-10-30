#!/usr/bin/env python3
"""Retry budget and shared helpers for the clearance route (SL8-authored from WF24-a1 steps 12-14, 18).

The budget is kept per clean source, keyed by the source file's sha256, so renaming a file does not
reset it: at most 2 region maps (the first plus one correction) and 2 render attempts. The first
render attempt freezes the map, even when placement then fails. State lives in
$CAPTION_GUARD_DIR (default work/caption-guards, made absolute) as <source sha256>.json under a file lock. It is a
local guard against retry loops, not a security boundary; never delete it to reset retries.

  python3 caption_guard.py status --video work/<p>/clean_master.mp4

Exit: 0 printed; 1 bad input.
"""
import argparse, contextlib, fcntl, hashlib, json, os, re, subprocess, sys

MAX_MAPS = 2
MAX_RENDERS = 2
CUE = re.compile(r"^(\d+):(\d+):(\d+)[,.](\d{1,3})\s*-->\s*(\d+):(\d+):(\d+)[,.](\d{1,3})\s*$")


class GuardError(Exception):
    """A refusal the caller turns into a non-zero exit."""


class BudgetError(GuardError):
    """The render or map budget is used: the caller returns the latest reviewed file, not 'no clear position'."""


def sha(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def cues(path):
    """SRT cues as [start, end, text]; any malformed block refuses the file."""
    text = open(path, encoding="utf-8-sig").read().strip()
    if not text:
        raise GuardError(f"{path}: empty SRT")
    out = []
    for n, block in enumerate(re.split(r"\n\s*\n", text), 1):
        lines = [l for l in block.splitlines() if l.strip()]
        i = next((k for k, l in enumerate(lines) if "-->" in l), None)
        m = CUE.match(lines[i].strip()) if i is not None else None
        if not m or not " ".join(lines[i + 1:]).strip():
            raise GuardError(f"SRT block {n} is malformed")
        g = [int(x) for x in m.groups()]
        s = g[0] * 3600 + g[1] * 60 + g[2] + int(m.group(4).ljust(3, "0")) / 1000
        e = g[4] * 3600 + g[5] * 60 + g[6] + int(m.group(8).ljust(3, "0")) / 1000
        if e <= s:
            raise GuardError(f"SRT block {n} ends before it starts")
        out.append([s, e, " ".join(lines[i + 1:]).strip()])
    return out


def duration(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                       capture_output=True, text=True)
    try:
        return float(r.stdout.strip())
    except ValueError:
        raise GuardError(f"ffprobe cannot read the duration of {path}")


def state_dir():
    d = os.path.abspath(os.environ.get("CAPTION_GUARD_DIR") or os.path.join("work", "caption-guards"))
    os.makedirs(d, exist_ok=True)
    return d


@contextlib.contextmanager
def state(source_sha):
    """Read-modify-write the per-source state under an exclusive lock."""
    path = os.path.join(state_dir(), f"{source_sha}.json")
    with open(path + ".lock", "a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        st = json.load(open(path)) if os.path.exists(path) else \
            {"source_sha256": source_sha, "maps": [], "frozen_map": None, "renders": []}
        yield st
        tmp = path + ".tmp"
        json.dump(st, open(tmp, "w"), indent=1)
        os.replace(tmp, path)


def register_map(source_sha, regions_sha):
    """Count a region map against the budget; a frozen map cannot change."""
    with state(source_sha) as st:
        if regions_sha in st["maps"]:
            return st
        if st["frozen_map"]:
            raise GuardError("the region map was frozen by the first render attempt: it cannot change for this source")
        if len(st["maps"]) >= MAX_MAPS:
            raise BudgetError(f"region-map budget used ({MAX_MAPS} maps for this source): return caption_incomplete")
        st["maps"].append(regions_sha)
        return st


def _alive(pid):
    try:
        os.kill(int(pid), 0)
        return True
    except (OSError, TypeError, ValueError):
        return False


def counted(st):
    """Attempts that spend the budget: a render that never produced a file and was not a placement
    refusal (ffmpeg FAILED, or a STARTED run whose process is gone) is not counted."""
    for r in st["renders"]:
        if r.get("verdict") == "STARTED" and not _alive(r.get("pid")):
            r["verdict"] = "ABANDONED"
    return [r for r in st["renders"] if r.get("verdict") not in ("FAILED", "ABANDONED")]


def latest_render(st):
    ok = [r for r in st["renders"] if r.get("verdict") == "RENDERED" and r.get("out")]
    return ok[-1]["out"] if ok else None


def begin_render(source_sha, regions_sha, out=None):
    """Count a render attempt and freeze the map; refuse a third attempt or a different map."""
    with state(source_sha) as st:
        if regions_sha not in st["maps"]:
            raise GuardError("this region map was never prepared for this source (run caption_regions.py prepare)")
        if st["frozen_map"] and st["frozen_map"] != regions_sha:
            raise GuardError("a different region map is frozen for this source")
        if len(counted(st)) >= MAX_RENDERS:
            lr = latest_render(st)
            raise BudgetError(f"render budget used ({MAX_RENDERS} attempts for this source); "
                              + (f"return the latest rendered file {lr}" if lr else "return the clean master"))
        st["frozen_map"] = regions_sha
        st["renders"].append({"attempt": len(st["renders"]) + 1, "verdict": "STARTED", "pid": os.getpid(), "out": out})
        return len(st["renders"])


def end_render(source_sha, attempt, verdict, out_sha=None, interval=None):
    with state(source_sha) as st:
        st["renders"][attempt - 1].update(verdict=verdict, video_sha256=out_sha, interval=interval)


def current(source_sha):
    path = os.path.join(state_dir(), f"{source_sha}.json")
    return json.load(open(path)) if os.path.exists(path) else None


def main():
    p = argparse.ArgumentParser()
    p.add_argument("cmd", choices=["status"])
    p.add_argument("--video", required=True)
    a = p.parse_args()
    if not os.path.isfile(a.video):
        print(f"FAIL no video at {a.video}", file=sys.stderr)
        sys.exit(1)
    s = sha(a.video)
    st = current(s) or {"source_sha256": s, "maps": [], "frozen_map": None, "renders": []}
    print(json.dumps({**st, "maps_left": MAX_MAPS - len(st["maps"]), "renders_left": MAX_RENDERS - len(counted(st)),
                      "latest_render": latest_render(st)}))


if __name__ == "__main__":
    main()
