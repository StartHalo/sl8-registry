#!/usr/bin/env python3
"""remap_captions.py: captions inside a multi-cut (WF26-a1 step 10). Source-timed words are remapped
to output time through the range that contains them (works when ranges are reordered or sped up); a
word that straddles a cut is DROPPED (the cut is kept) and listed; words outside every kept range are
left out. The result goes through make_ass.py's grouping, timing and looks, so it is burned last by
cut_reframe.py --captions. SL8-authored; Python 3.11 stdlib only.

  python3 remap_captions.py <edit-plan.json> --words stt.json [--wpc 3] [--style clean|karaoke|...]
      --ass work/<p>/caps.ass [--srt work/<p>/caps.srt] [--json work/<p>/caps.json] [look flags]

Output time of a kept word: t = P_i + (s - start_i) / speed_i, P_i = output start of range i.
Exit: 0 written; 1 nothing to caption or bad input; 2 usage.
"""
import argparse, json, os, sys

sys.dont_write_bytecode = True   # no __pycache__ inside the installed skill
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_ass  # noqa: E402

DEFAULT_WPC = 3   # the cut contract's words per caption: 3 by default, 7 at most


def remap(plan, words):
    segs = plan["segments"]
    starts, t = [], 0.0
    for s in segs:
        starts.append(t)
        t += (float(s["end"]) - float(s["start"])) / float(s.get("speed", 1) or 1)
    kept, dropped, outside = [], [], 0
    for w in words:
        home = None
        for i, s in enumerate(segs):
            a, b = float(s["start"]), float(s["end"])
            if a <= w["start"] and w["end"] <= b:
                home = i
                break
        if home is None:
            straddles = [i for i, s in enumerate(segs) if w["start"] < float(s["end"]) and w["end"] > float(s["start"])]
            if straddles:
                dropped.append({"text": w["text"], "start": w["start"], "end": w["end"], "ranges": straddles})
            else:
                outside += 1
            continue
        s = segs[home]
        sp = float(s.get("speed", 1) or 1)
        a = float(s["start"])
        kept.append({**w, "start": starts[home] + (w["start"] - a) / sp, "end": starts[home] + (w["end"] - a) / sp,
                     "seg": home, "src_start": w["start"], "src_end": w["end"]})
    kept.sort(key=lambda x: x["start"])
    return kept, dropped, outside


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("plan")
    p.add_argument("--words", required=True)
    p.add_argument("--corrections")
    make_ass.add_look_args(p)
    a = p.parse_args()
    if not a.ass:
        make_ass.fail(2, "--ass is required")
    with open(a.plan, encoding="utf-8") as f:
        plan = json.load(f)
    if not plan.get("segments"):
        make_ass.fail(1, f"{a.plan}: no segments")
    words = make_ass.load_words(a.words)
    if not words:
        make_ass.fail(1, f"{a.words}: no word entries with times; with sentence timing only, render the cuts first and caption the result (step 11)")
    if a.corrections:
        words = make_ass.apply_corrections(words, json.loads(a.corrections))
    if any(words[i]["start"] < words[i - 1]["start"] - 1e-6 for i in range(1, len(words))):
        make_ass.fail(1, f"{a.words}: words are not in source order")
    kept, dropped, outside = remap(plan, words)
    if not kept:
        make_ass.fail(1, "no word lies inside a kept range")
    import validate_plan
    fps = float(validate_plan.resolve_fps(plan) or 30)
    a.wpc = a.wpc or DEFAULT_WPC
    ass, srt, report = make_ass.build(words=kept, width=int(plan["width"]), height=int(plan["height"]), fps=fps,
                                      **make_ass.look_kwargs(a))
    report.update({"plan": a.plan, "remapped_words": len(kept), "words_outside_kept_ranges": outside,
                   "dropped_straddling_words": dropped})
    if dropped:
        print(f"NOTE {len(dropped)} word(s) straddle a cut and were dropped: " + ", ".join(d["text"] for d in dropped), file=sys.stderr)
    make_ass.write_outputs(ass, srt, report, a)


if __name__ == "__main__":
    main()
