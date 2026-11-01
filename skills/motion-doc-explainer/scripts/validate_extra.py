#!/usr/bin/env python3
"""Job-file checks that sit beside preflight.py (SL8-authored; standard library only).

  python3 validate_extra.py <job>     exit 0 when the job files agree with each other, 1 with one line per problem

<job> is work/<project>/ holding config.json, chunks/, assets/manifest.json and, once TTS has run, audio/.
preflight.py checks the markup grammar. This checks what preflight does not read:
  - config.json holds mode, lang, title and description, and mode is square, portrait or landscape
  - every file assets/manifest.json lists exists, with the byte size and image format the manifest records
  - every attachment="att-NN" in the chunks is in the manifest, and no two manifest rows share an id
  - each chunk is at most 64,000 bytes and the chunks together at most 512,000
  - when audio/ exists: every say-NN.mp3 has a say-NN.words.json, and its words are a list of
    {text, start, end} with start < end and starts that never go backwards
"""
import json, os, re, sys

MODES = {"square", "portrait", "landscape"}
MAGIC = {"png": b"\x89PNG\r\n\x1a\n", "jpeg": b"\xff\xd8\xff", "gif": b"GIF8", "webp": b"RIFF"}


def check(job):
    problems = []
    P = problems.append
    cfg_path = os.path.join(job, "config.json")
    if not os.path.exists(cfg_path):
        return ["config.json is missing"]
    cfg = json.load(open(cfg_path, encoding="utf-8"))
    for key in ("mode", "lang", "title", "description"):
        if not cfg.get(key):
            P(f"config.json has no {key}")
    if cfg.get("mode") and cfg["mode"] not in MODES:
        P(f"config.json mode {cfg['mode']!r} is not one of {sorted(MODES)}")

    man_path = os.path.join(job, "assets", "manifest.json")
    ids = []
    if os.path.exists(man_path):
        for row in json.load(open(man_path, encoding="utf-8")).get("assets", []):
            ids.append(row.get("id"))
            assets = os.path.realpath(os.path.join(job, "assets"))
            path = os.path.realpath(os.path.join(assets, row.get("file", "")))
            if not path.startswith(assets + os.sep):
                P(f"{row.get('id')}: file {row.get('file')!r} points outside assets/")
                continue
            if not os.path.isfile(path):
                P(f"{row.get('id')}: assets/{row.get('file')} is missing")
                continue
            if row.get("bytes") is not None and os.path.getsize(path) != row["bytes"]:
                P(f"{row['id']}: assets/{row['file']} is {os.path.getsize(path)} bytes, the manifest says {row['bytes']}")
            fmt = row.get("format")
            if fmt in MAGIC and not open(path, "rb").read(12).startswith(MAGIC[fmt]):
                P(f"{row['id']}: assets/{row['file']} does not start like a {fmt} file")
    if len(ids) != len(set(ids)):
        P("assets/manifest.json repeats an id")

    cdir = os.path.join(job, "chunks")
    sizes = []
    if os.path.isdir(cdir):
        for name in sorted(os.listdir(cdir)):
            if not name.endswith(".xml"):
                continue
            raw = open(os.path.join(cdir, name), "rb").read()
            sizes.append(len(raw))
            if len(raw) > 64000:
                P(f"chunks/{name} is {len(raw)} bytes (at most 64,000 per chunk)")
            for att in re.findall(rb'attachment="([^"]+)"', raw):
                if att.decode() not in ids:
                    P(f"chunks/{name}: attachment {att.decode()!r} is not in assets/manifest.json")
    else:
        P("chunks/ is missing")
    if sum(sizes) > 512000:
        P(f"chunks total {sum(sizes)} bytes (at most 512,000)")

    adir = os.path.join(job, "audio")
    if os.path.isdir(adir):
        for name in sorted(os.listdir(adir)):
            m = re.fullmatch(r"say-(\d+)\.mp3", name)
            if not m:
                continue
            wp = os.path.join(adir, f"say-{m.group(1)}.words.json")
            if not os.path.exists(wp):
                P(f"audio/{name} has no say-{m.group(1)}.words.json")
                continue
            data = json.load(open(wp, encoding="utf-8"))
            words = data.get("words") if isinstance(data, dict) else data
            if not isinstance(words, list) or not words:
                P(f"{os.path.basename(wp)}: no words list")
                continue
            prev = 0.0
            for i, w in enumerate(words):
                if not (isinstance(w, dict) and "text" in w and "start" in w and "end" in w) or not w["start"] < w["end"]:
                    P(f"{os.path.basename(wp)}: word {i} needs text, start and end with start < end")
                    break
                if w["start"] < prev:
                    P(f"{os.path.basename(wp)}: word {i} starts before the word before it")
                    break
                prev = w["start"]
    return problems


def main(argv):
    if len(argv) != 2 or argv[1].startswith("-"):
        print(__doc__)
        return 2
    problems = check(argv[1])
    for p in problems:
        print(f"[extra] {p}")
    print(f"validate_extra: {'ok' if not problems else str(len(problems)) + ' problem(s)'}")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
