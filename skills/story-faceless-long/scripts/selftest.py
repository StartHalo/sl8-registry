#!/usr/bin/env python3
"""Free self-test of the story-faceless-long scripts on synthetic fixtures (no model, no network).

  python3 $HOME/.agents/skills/story-faceless-long/scripts/selftest.py [--keep]

Builds three tone-and-test-pattern blocks, a locked script, takes, a bed, a song and a set of
still frames in a temporary folder, then runs every gate and assembler mode, including the
known-bad cases each must refuse. Prints one line per check and exits 0 only when all pass.
Run it once on a new machine before the first paid job.
"""
import json, os, shutil, subprocess, sys, tempfile

sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.abspath(__file__))
RESULTS = []


def sh(*cmd):
    return subprocess.run(list(cmd), capture_output=True, text=True)


def py(script, *args):
    return sh(sys.executable, os.path.join(HERE, script), *args)


def ff(*args):
    r = sh("ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y", *args)
    if r.returncode:
        raise SystemExit(f"fixture failed: {r.stderr[-300:]}")


def check(name, ok, detail=""):
    RESULTS.append(ok)
    print(("ok   " if ok else "FAIL ") + name + (f"  ({detail})" if detail and not ok else ""))


LINES = [
    "Most of the ocean floor is unseen. The maps we trust are careful guesses drawn from scattered soundings and old logs.",
    "Sailors once dropped weighted ropes over the side, counting the length paid out until the line finally went slack below.",
    "Today a single research ship sweeps sound across the seabed and draws a picture far wider than any harbor town.",
]
SHOTS = [
    ["WIDE, low angle: the research ship rides a grey swell", "CLOSE-UP on the captain lifting a brass lamp",
     "MEDIUM: the crew unrolls a blank chart across a table", "EXTREME CLOSE-UP on the empty chart corner",
     "WIDE: the ship turns toward a darkening horizon"],
    ["MEDIUM: a sailor feeds rope over the rail", "CLOSE-UP on knots sliding through wet hands",
     "WIDE: the rope vanishes into black water", "EXTREME CLOSE-UP on the chart gaining one inked dot",
     "MEDIUM: the sailor shrugs and starts again"],
    ["WIDE: sonar fans glow beneath the hull", "CLOSE-UP on the chart filling with bright contour lines",
     "MEDIUM: the captain leans in, eyebrows raised", "EXTREME CLOSE-UP on a ridge appearing on the map",
     "WIDE: the ship sails on over the mapped floor"],
]


def manifest():
    return {
        "topic": "mapping the sea floor", "genre": "education", "animation_mode": "fully_animated",
        "channel_type": "Explainer", "style": "editorial",
        "through_line": {"name": "the chart", "asset": "prop-chart", "progression": "empty to full",
                         "resolution": "the chart is covered in contour lines"},
        "arc": {"hook": "unseen floor", "build": ["ropes"], "turn": "sound", "payoff": "the map"},
        "assets": [{"id": "loc-deck", "kind": "location", "name": "deck"}, {"id": "loc-hold", "kind": "location", "name": "chart room"},
                   {"id": "char-captain", "kind": "character", "name": "captain"}, {"id": "prop-chart", "kind": "prop", "name": "chart"}],
        "blocks": [{"n": i + 1, "arc_role": ["hook", "turn", "payoff"][i], "vo_line": LINES[i],
                    "location": ["loc-deck", "loc-hold", "loc-deck"][i], "through_line_state": ["blank", "one dot", "full"][i],
                    "shots": SHOTS[i], "assets_used": [["loc-deck", "char-captain", "prop-chart"], ["loc-hold", "prop-chart"],
                                                        ["loc-deck", "prop-chart", "char-captain"]][i]} for i in range(3)],
        "sources": ["https://example.org/ocean-mapping"],
    }


def main():
    keep = "--keep" in sys.argv
    t = tempfile.mkdtemp(prefix="sfl-selftest-")
    try:
        man = os.path.join(t, "script_manifest.json")
        json.dump(manifest(), open(man, "w"))
        r = py("faceless_script.py", "validate", "--script", man, "--duration-seconds", "30")
        check("validate accepts a clean 3-block script and writes script.lock",
              r.returncode == 0 and os.path.exists(os.path.join(t, "script.lock")), r.stdout[-400:])
        bad = manifest()
        bad["blocks"][1]["vo_line"] = "Sailors dropped 3 ropes, you know, over the side and counted."
        bad["blocks"][2]["shots"][1] = "CLOSE-UP"
        json.dump(bad, open(os.path.join(t, "bad.json"), "w"))
        r = py("faceless_script.py", "validate", "--script", os.path.join(t, "bad.json"), "--duration-seconds", "30")
        errs = json.loads(r.stdout).get("errors", []) if r.stdout.strip().startswith("{") else []
        check("validate refuses digits, filler, a short line and repeated sizes", r.returncode == 1 and len(errs) >= 3)
        clips, takes, voices = (os.path.join(t, d) for d in ("blocks", "takes", "voices"))
        for d in (clips, takes, voices):
            os.makedirs(d)
        for k in range(1, 4):
            ff("-f", "lavfi", "-i", f"testsrc2=size=640x360:rate=25:duration=10", "-f", "lavfi", "-i",
               f"sine=frequency={300 + 90 * k}:duration=10,volume=0.2", "-c:v", "libx264", "-pix_fmt", "yuv420p",
               "-c:a", "aac", "-shortest", os.path.join(clips, f"block{k:02d}.mp4"))
            ff("-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-f", "lavfi", "-i", "sine=frequency=220:sample_rate=24000:duration=8.4",
               "-filter_complex", "[0:a]atrim=0:0.4[a];[1:a]volume=0.3[b];[0:a]atrim=0:0.6[c];[a][b][c]concat=n=3:v=0:a=1",
               "-c:a", "libmp3lame", "-q:a", "4", os.path.join(takes, f"take{k:02d}.mp3"))
        r = py("takes.py", "all", "--script", man, "--src-dir", takes, "--voice-dir", voices, "--duration-seconds", "30",
               "--stt", "none", "--report", os.path.join(t, "takes.json"))
        rep = json.loads(r.stdout) if r.stdout.strip().startswith("{") else {}
        states = [b.get("state") for b in rep.get("measure", {}).get("blocks", [])]
        check("takes converts and measures three in-window takes", r.returncode == 0 and states == ["pass"] * 3, str(states))
        ff("-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-f", "lavfi", "-i", "sine=frequency=220:sample_rate=24000:duration=9.9",
           "-filter_complex", "[0:a]atrim=0:0.05[a];[1:a]volume=0.3[b];[a][b]concat=n=2:v=0:a=1", os.path.join(t, "long.wav"))
        shutil.copy(os.path.join(voices, "voice02.wav"), os.path.join(t, "voice02.keep"))
        shutil.copy(os.path.join(t, "long.wav"), os.path.join(voices, "voice02.wav"))
        r = py("takes.py", "measure", "--script", man, "--voice-dir", voices, "--duration-seconds", "30")
        rep = json.loads(r.stdout) if r.stdout.strip().startswith("{") else {}
        check("takes flags an overlong take with a recommended word count",
              r.returncode == 1 and rep.get("measure", {}).get("overlong_blocks") == [2] and "2" in json.dumps(rep["measure"]["recommended_words"]))
        shutil.copy(os.path.join(t, "voice02.keep"), os.path.join(voices, "voice02.wav"))
        ff("-f", "lavfi", "-i", "sine=frequency=110:duration=12,volume=0.5", os.path.join(t, "bed.mp3"))
        out = os.path.join(t, "out", "final_clean.mp4")
        r = py("assemble.py", "--script", man, "--clips-dir", clips, "--voice-dir", voices, "--blocks", "3",
               "--duration-seconds", "30", "--out", out, "--allow-unverified-audio", "--music", os.path.join(t, "bed.mp3"),
               "--music-vol", "0.05")
        side = json.load(open(out + ".assembly.json")) if os.path.exists(out + ".assembly.json") else {}
        check("assemble builds 3 x 10 s with a ducked bed, sidecar and poster",
              r.returncode == 0 and os.path.exists(out) and side.get("ok") and abs(side["asserts"]["final_s"] - 30) <= 1
              and os.path.exists(side.get("poster", "")), r.stdout[-600:])
        pb = side.get("per_block") or [{}]
        check("sidecar carries speech_abs_s and lead_silence_s for edit-captions",
              all("speech_abs_s" in b and "lead_silence_s" in b for b in pb) and abs(pb[0]["speech_abs_s"] - 0.8) < 0.15,
              json.dumps(pb[0])[:200])
        import importlib.util
        spec = importlib.util.spec_from_file_location("sfl_assemble", os.path.join(HERE, "assemble.py"))
        asm = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(asm)
        names = [f"block{k:02d}.mp4" for k in range(1, 121)]
        check("clip names block01..block120 sort by number (100+ blocks)", asm.clip_names(reversed(names), 120)[0]
              and not asm.clip_names(names[:-1], 120)[0])
        short = os.path.join(t, "short")
        os.makedirs(short)
        for k in range(1, 4):
            ff("-f", "lavfi", "-i", "testsrc2=size=640x360:rate=25:duration=9.7", "-f", "lavfi", "-i",
               f"sine=frequency={300 + 90 * k}:duration=9.7,volume=0.2", "-c:v", "libx264", "-pix_fmt", "yuv420p",
               "-c:a", "aac", "-shortest", os.path.join(short, f"block{k:02d}.mp4"))
        r = py("assemble.py", "--script", man, "--clips-dir", short, "--voice-dir", voices, "--blocks", "3",
               "--duration-seconds", "30", "--out", os.path.join(t, "out9", "final_clean.mp4"), "--allow-unverified-audio", "--aspect", "16:9")
        s9 = json.load(open(os.path.join(t, "out9", "final_clean.mp4.assembly.json"))) if r.returncode == 0 else {}
        check("assemble holds the last frame of 9.7 s clips so audio and video stay together",
              r.returncode == 0 and abs(s9["asserts"]["video_s"] - s9["asserts"]["audio_s"]) <= 0.25, r.stdout[-300:])
        r = py("assemble.py", "--script", man, "--clips-dir", clips, "--voice-dir", voices, "--blocks", "3",
               "--duration-seconds", "30", "--out", os.path.join(t, "outa", "x.mp4"), "--allow-unverified-audio", "--aspect", "9:16")
        check("assemble refuses clips of the wrong aspect", r.returncode == 1 and "not 9:16" in r.stdout)
        five = os.path.join(t, "five")
        os.makedirs(five)
        ff("-f", "lavfi", "-i", "testsrc2=size=640x360:rate=25:duration=2", "-f", "lavfi", "-i", "smptehdbars=size=640x360:rate=25:duration=2",
           "-f", "lavfi", "-i", "life=size=640x360:rate=25:mold=10:life_color=#ff8800:seed=3", "-f", "lavfi", "-i",
           "rgbtestsrc=size=640x360:rate=25:duration=2", "-f", "lavfi", "-i", "mandelbrot=size=640x360:rate=25", "-f", "lavfi", "-i",
           "sine=frequency=300:duration=10", "-filter_complex",
           "[2:v]trim=duration=2,setpts=PTS-STARTPTS[l];[4:v]trim=duration=2,setpts=PTS-STARTPTS[m];[0:v][1:v][l][3:v][m]concat=n=5:v=1:a=0,format=yuv420p[v]",
           "-map", "[v]", "-map", "5:a", "-c:v", "libx264", "-c:a", "aac", "-shortest", os.path.join(five, "block01.mp4"))
        r = py("clipcheck.py", "--clips-dir", five, "--aspect", "16:9", "--no-stt")
        check("clipcheck passes a five-shot clip with four cuts", r.returncode == 0, r.stdout[-300:])
        shutil.copy(os.path.join(clips, "block01.mp4"), os.path.join(five, "block01.mp4"))
        r = py("clipcheck.py", "--clips-dir", five, "--aspect", "16:9", "--no-stt")
        check("clipcheck refuses a clip with no cuts and a shot over 3 s", r.returncode == 1 and "cuts" in r.stdout)
        cal = os.path.join(t, "calib")
        os.makedirs(cal)
        shutil.copy(os.path.join(takes, "take01.mp3"), os.path.join(cal, "calib01.mp3"))
        json.dump([LINES[0]], open(os.path.join(cal, "lines.json"), "w"))
        r = py("takes.py", "rate", "--dir", cal, "--lines", os.path.join(cal, "lines.json"))
        rr = json.loads(r.stdout) if r.returncode == 0 else {}
        check("takes rate reads the voice and prints the bands to pass on", r.returncode == 0 and rr.get("wps", 0) > 1 and "--words-min" in rr.get("pass_on", ""), r.stdout[-300:])
        zh = manifest()
        zh["blocks"][0]["vo_line"] = "这是一个没有空格的句子这是一个没有空格的句子"
        json.dump(zh, open(os.path.join(t, "zh.json"), "w"))
        r = py("faceless_script.py", "validate", "--script", os.path.join(t, "zh.json"), "--duration-seconds", "30")
        check("validate declines an unspaced script", r.returncode == 1 and "not offered on this machine yet" in r.stdout)
        r = py("assemble.py", "--script", man, "--clips-dir", clips, "--voice-dir", voices, "--blocks", "3",
               "--out", os.path.join(t, "out", "x.mp4"))
        check("assemble refuses unverified takes without the degraded-route flag", r.returncode == 1)
        edited = manifest()
        edited["blocks"][0]["vo_line"] = LINES[0].replace("careful", "rough")
        json.dump(edited, open(man, "w"))
        r = py("assemble.py", "--script", man, "--clips-dir", clips, "--voice-dir", voices, "--blocks", "3",
               "--out", os.path.join(t, "out", "y.mp4"), "--allow-unverified-audio")
        check("assemble refuses narration edited after the lock", r.returncode == 1 and "lock" in r.stdout)
        json.dump(manifest(), open(man, "w"))
        ff("-f", "lavfi", "-i", "sine=frequency=330:duration=31,volume=0.4", os.path.join(t, "song.wav"))
        r = py("assemble.py", "--song", os.path.join(t, "song.wav"), "--clips-dir", clips, "--blocks", "3",
               "--out", os.path.join(t, "out", "final.mp4"))
        side = json.load(open(os.path.join(t, "out", "final.mp4.assembly.json"))) if r.returncode == 0 else {}
        check("song mode assembles under the song and marks the sidecar", r.returncode == 0 and side.get("song") is True, r.stdout[-300:])
        sp, ly = os.path.join(t, "song_prompt.txt"), os.path.join(t, "song_lyrics.txt")
        open(sp, "w").write("Gentle children's song sung by a warm bright female singer; a steady constant beat at 100 BPM, "
                            "simple 4/4, no tempo changes; eight-syllable lines sung one syllable per beat, each line starting "
                            "on beat one as one 4-bar phrase; the chorus repeats verbatim; ukulele and glockenspiel.")
        verse = "Little Robin hops along\nPecking seeds and singing songs\nUnder trees and over grass\nWaving hello as we pass"
        chorus = "Clap your hands and stomp your feet\nJump up high and find the beat\nSpin around and touch the ground\nRobin dances round and round"
        open(ly, "w").write(f"[Intro]\n[Verse]\n{verse}\n[Chorus]\n{chorus}\n[Verse]\n{verse}\n[Chorus]\n{chorus}\n[Outro]\n")
        r = py("faceless_script.py", "song-prompt", "--prompt", sp, "--lyrics", ly)
        check("song-prompt passes a metered prompt and verbatim choruses", r.returncode == 0, r.stdout[-400:])
        open(sp, "a").write(" Add a breakdown and speed up at 120 BPM.")
        r = py("faceless_script.py", "song-prompt", "--prompt", sp, "--lyrics", ly)
        check("song-prompt refuses a tempo change and a second BPM", r.returncode == 1)
        beats = [{"n": i + 1, "phrase": p, "image_mode": "new" if i % 3 == 0 else "variation",
                  **({"variation_of": i, "change_only": "eyes open"} if i % 3 else {})}
                 for i, p in enumerate(["the boy woke slowly", "his eyes opened to light", "he squinted at the window",
                                        "he sat up on the bed", "his feet found the floor", "he stretched both arms wide",
                                        "he walked down the hall", "the kitchen smelled of bread", "his mother waved hello",
                                        "he sat down to eat", "the toast was still warm", "he smiled and took a bite"])]
        pm = os.path.join(t, "picture.json")
        json.dump({"genre": "storytelling", "animation_mode": "scene_based", "beats": beats}, open(pm, "w"))
        r = py("faceless_script.py", "picture", "--script", pm, "--duration-seconds", "24")
        check("picture accepts a 24 s stills script", r.returncode == 0, r.stdout[-400:])
        words, tt = [], 0.3
        for b in beats:
            for w in b["phrase"].split():
                words.append({"text": w, "start": round(tt, 2), "end": round(tt + 0.32, 2), "type": "word"})
                tt += 0.4
            tt += 0.1
        json.dump({"raw": {"words": words}}, open(os.path.join(t, "words.json"), "w"))
        ff("-f", "lavfi", "-i", f"sine=frequency=200:duration={tt + 0.2:.2f},volume=0.3", os.path.join(t, "narration.wav"))
        sm = os.path.join(t, "scene_manifest.json")
        r = py("timeline.py", "build", "--script", pm, "--audio", os.path.join(t, "narration.wav"), "--requested-duration", "24",
               "--out", sm, "--words-json", os.path.join(t, "words.json"))
        check("timeline builds contiguous frames from a word clock", r.returncode == 0, r.stdout[-400:])
        tl = json.load(open(sm)) if r.returncode == 0 else {"frames": []}
        proj = os.path.join(t, "project")
        os.makedirs(os.path.join(proj, "keyframes"))
        rows = []
        for fr in tl["frames"]:
            f = os.path.join(proj, "keyframes", f"{fr['output_slot']}.png")
            ff("-f", "lavfi", "-i", f"color=c=0x{(fr['n'] * 2654435761) % 0xFFFFFF:06x}:s=640x360", "-frames:v", "1", f)
            rows.append({"item": fr["output_slot"], "status": "done", "files": [{"path": f"keyframes/{fr['output_slot']}.png"}],
                         "parents": [fr["reference_output_slot"]] if fr["reference_output_slot"] else []})
        json.dump({"assets": rows}, open(os.path.join(proj, "manifest.json"), "w"))
        bound = os.path.join(t, "scene_manifest.bound.json")
        r = py("timeline.py", "bind", "--timeline", sm, "--project-dir", proj, "--frames-dir", os.path.join(t, "frames"), "--out", bound)
        check("bind materializes every frame slot", r.returncode == 0, r.stdout[-300:])
        r = py("assemble.py", "--stills", "--timeline", bound, "--narration", os.path.join(t, "narration.wav"),
               "--duration-seconds", "24", "--out", os.path.join(t, "out", "stills.mp4"))
        check("stills mode assembles the slideshow with its asserts", r.returncode == 0, r.stdout[-500:])
        bf = json.load(open(bound))["frames"] if os.path.exists(bound) else [{}]
        font = [] if shutil.which("fc-match") else ["--font-file", next((f for f in (
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
            if os.path.exists(f)), "")]
        r = py("cover_text.py", "--image", bf[0].get("path", ""), "--text", "The ocean nobody has seen",
               "--out", os.path.join(t, "cover.jpg"), *font)
        check("cover_text composites an exact hook", r.returncode == 0, r.stdout[-300:])
    finally:
        if keep:
            print(f"kept {t}")
        else:
            shutil.rmtree(t, ignore_errors=True)
    print(f"{sum(RESULTS)}/{len(RESULTS)} checks passed")
    return 0 if all(RESULTS) else 1


if __name__ == "__main__":
    sys.exit(main())
