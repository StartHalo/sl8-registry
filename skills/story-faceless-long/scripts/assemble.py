#!/usr/bin/env python3
"""The one assembler for story-faceless-long (SL8-authored from the method recorded as WF53-a1).

Motion montage (every channel but Picture Story and song mode):
  assemble.py --script work/<p>/script_manifest.json --clips-dir work/<p>/blocks \
      --voice-dir work/<p>/voices --blocks N --duration-seconds S --out work/<p>/output/final_clean.mp4 \
      (--takes work/<p>/takes.json | --allow-unverified-audio) [--accept-soft-blocks 4,7] \
      [--music work/<p>/bed.mp3 --music-vol 0.10] [--sfx-vol 0.12] [--stepped 12] [--aspect 16:9]
Song mode (the song is the clock; no narrator, no bed):
  assemble.py --song work/<p>/song.wav --clips-dir ... --blocks N --out work/<p>/output/final.mp4
Picture Story (stills timed to one continuous narration):
  assemble.py --stills --timeline work/<p>/scene_manifest.bound.json --narration work/<p>/voices/narration.wav \
      --duration-seconds S --out work/<p>/output/final_clean.mp4 [--music bed --music-vol 0.10]

Fixed N x 10 s, speech centred per block, no atempo, level law with a voice-keyed duck, -16 LUFS
after the duck, asserts, poster and sidecar (<out>.assembly.json). Exit 0 written and every assert
passed; 1 an assert or a pairing check failed (nothing is delivered); 2 bad input or a tool failed.
"""
import argparse, atexit, hashlib, json, math, os, re, shutil, subprocess, sys, tempfile

sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.abspath(__file__))
CLIP = 10.0
NOISE, MIN_SIL = "-45dB", 0.25
VOICE_I, FINAL_I, TP, LRA = -19, -16, -1.5, 11
DUCK = "sidechaincompress=threshold=0.02:ratio=8:attack=10:release=300"
WARN = []
TMPS = []
KEEP = [False]


def _cleanup():
    if not KEEP[0]:
        for d in TMPS:
            shutil.rmtree(d, ignore_errors=True)


atexit.register(_cleanup)


def die(code, msg):
    print(json.dumps({"ok": False, "error": msg, "warnings": WARN}, indent=1))
    sys.exit(code)


def run(cmd, check=True):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if check and r.returncode:
        die(2, f"{os.path.basename(cmd[0])} failed: {' '.join(cmd[:6])} ... {r.stderr.strip()[-400:]}")
    return r


def ff(*args):
    return run(["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y", *args])


def probe(path):
    r = run(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=index,codec_type,width,height,r_frame_rate,duration",
             "-of", "json", path])
    d = json.loads(r.stdout or "{}")
    v = next((s for s in d.get("streams", []) if s.get("codec_type") == "video"), None)
    a = next((s for s in d.get("streams", []) if s.get("codec_type") == "audio"), None)
    return {"duration": float(d.get("format", {}).get("duration") or 0), "video": v, "audio": a}


def stream_dur(path, sel):
    r = run(["ffprobe", "-v", "error", "-select_streams", sel, "-show_entries", "stream=duration:format=duration", "-of", "json", path])
    d = json.loads(r.stdout or "{}")
    s = (d.get("streams") or [{}])[0].get("duration")
    return float(s or d.get("format", {}).get("duration") or 0)


def silences(path, noise=NOISE, d=MIN_SIL, extra=""):
    r = run(["ffmpeg", "-nostdin", "-hide_banner", "-i", path, "-af", f"{extra}silencedetect=noise={noise}:d={d}", "-f", "null", "-"], check=False)
    out, cur = [], None
    for ln in r.stderr.splitlines():
        m = re.search(r"silence_start: (-?[\d.]+)", ln)
        if m:
            cur = [max(0.0, float(m.group(1))), None]
            out.append(cur)
        m = re.search(r"silence_end: ([\d.]+)", ln)
        if m and cur is not None:
            cur[1] = float(m.group(1))
    return out


def speech(path):
    dur = probe(path)["duration"]
    sil = silences(path)
    for s in sil:
        if s[1] is None:
            s[1] = dur
    s0, s1 = 0.0, dur
    if sil and sil[0][0] <= 0.02:
        s0 = sil[0][1]
    if sil and sil[-1][1] >= dur - 0.02 and sil[-1][0] > s0:
        s1 = sil[-1][0]
    pauses = [round(b - a, 3) for a, b in sil if a > s0 + 0.01 and b < s1 - 0.01 and b - a >= 0.8]
    return dur, s0, max(s0, s1), pauses


def mean_db(path, af=""):
    r = run(["ffmpeg", "-nostdin", "-hide_banner", "-i", path, "-af", f"{af}volumedetect", "-f", "null", "-"], check=False)
    m = re.search(r"mean_volume: (-?[\d.]+) dB", r.stderr)
    return float(m.group(1)) if m else -91.0


def lufs(path):
    r = run(["ffmpeg", "-nostdin", "-hide_banner", "-i", path, "-af", "ebur128", "-f", "null", "-"], check=False)
    m = re.findall(r"I:\s+(-?[\d.]+) LUFS", r.stderr)
    return float(m[-1]) if m else -70.0


def loudnorm_2pass(src, dst, extra_out=()):
    r = run(["ffmpeg", "-nostdin", "-hide_banner", "-i", src, "-af", f"loudnorm=I={FINAL_I}:TP={TP}:LRA={LRA}:print_format=json",
             "-f", "null", "-"], check=False)
    js = re.findall(r"\{[^{}]*\"input_i\"[^{}]*\}", r.stderr, re.S)
    if not js:
        die(2, "loudnorm measurement pass printed no figures")
    m = json.loads(js[-1])
    af = (f"loudnorm=I={FINAL_I}:TP={TP}:LRA={LRA}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
          f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    ff("-i", src, "-af", af, "-ar", "48000", "-ac", "2", *extra_out, dst)
    return {"input_i": float(m["input_i"]), "target_i": FINAL_I}


def ids(s):
    return {int(x) for x in str(s or "").replace(" ", "").split(",") if x}


def fps_of(v):
    num, _, den = str(v.get("r_frame_rate") or "30/1").partition("/")
    f = float(num) / float(den or 1)
    return v.get("r_frame_rate") or "30/1", (f if f > 0 else 30.0)


def freeze(path, start, length, d):
    r = run(["ffmpeg", "-nostdin", "-hide_banner", "-ss", f"{start:.3f}", "-t", f"{length:.3f}", "-i", path,
             "-vf", f"freezedetect=n=-60dB:d={d}", "-map", "0:v:0", "-f", "null", "-"], check=False)
    return "freeze_start" in r.stderr


def concat_list(paths, txt):
    with open(txt, "w", encoding="utf-8") as f:
        for p in paths:
            f.write("file '" + os.path.abspath(p).replace("'", "'\\''") + "'\n")


def clip_names(files, n):
    """(ok, found): the folder holds exactly block01..blockNN, sorted by the number in the name."""
    found = sorted((f for f in files if re.fullmatch(r"block\d{2,3}\.mp4", f)), key=lambda f: int(f[5:-4]))
    return found == [f"block{k:02d}.mp4" for k in range(1, n + 1)], found


def sha(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def silence_windows_ok(final, n_blocks):
    """Narration in every window: no 6 s stretch quieter than -18 dB may cover [2 s, 8 s] of a block."""
    bad = []
    for a, b in silences(final, "-18dB", 6):
        b = b if b is not None else n_blocks * CLIP
        for k in range(n_blocks):
            if a <= k * CLIP + 2 and b >= k * CLIP + 8:
                bad.append(k + 1)
    return sorted(set(bad))


def decode_ok(path):
    r = run(["ffmpeg", "-nostdin", "-hide_banner", "-v", "error", "-xerror", "-i", path, "-f", "null", "-"], check=False)
    return r.returncode == 0


def bed_track(music, total, tmp, voice_mean, vol):
    bed_raw = os.path.join(tmp, "bed_raw.wav")
    ff("-stream_loop", "-1", "-i", music, "-t", f"{total:.3f}", "-ar", "48000", "-ac", "2", bed_raw)
    trim = max(-40.0, min(0.0, 20 * math.log10(max(min(vol, 0.20), 1e-4) / 0.10)))
    gain = (voice_mean - 14) - mean_db(bed_raw) + trim
    bed = os.path.join(tmp, "bed.wav")
    ff("-i", bed_raw, "-af", f"volume={gain:.2f}dB", bed)
    return bed, {"file": music, "music_vol": vol, "trim_db": round(trim, 2), "gain_db": round(gain, 2)}


def duck_and_mix(voice, others, bed, out_wav, tmp):
    """Duck the bed under the voice (keyed sidechain), mix everything, then the caller normalises."""
    stems = {}
    if bed:
        ducked = os.path.join(tmp, "bed_ducked.wav")
        ff("-i", bed, "-i", voice, "-filter_complex", f"[0:a][1:a]{DUCK}[d]", "-map", "[d]", ducked)
        stems = {"voice_lufs": lufs(voice), "bed_lufs": lufs(bed), "bed_ducked_lufs": lufs(ducked)}
        stems["speech_over_bed_db"] = round(stems["voice_lufs"] - stems["bed_ducked_lufs"], 2)
        stems["duck_depth_db"] = round(stems["bed_lufs"] - stems["bed_ducked_lufs"], 2)
        others = others + [ducked]
    ins = [voice] + others
    args = []
    for p in ins:
        args += ["-i", p]
    graph = "".join(f"[{i}:a]" for i in range(len(ins))) + f"amix=inputs={len(ins)}:duration=first:normalize=0[m]"
    ff(*args, "-filter_complex", graph, "-map", "[m]", "-ar", "48000", "-ac", "2", out_wav)
    return stems


def motion(a):
    n = a.blocks
    work = os.path.dirname(os.path.abspath(a.out))
    os.makedirs(work, exist_ok=True)
    tmp = tempfile.mkdtemp(prefix="sfl-asm-", dir=work)
    TMPS.append(tmp)
    receipts = []
    m = json.load(open(a.script, encoding="utf-8")) if a.script else {"blocks": []}
    blocks = m.get("blocks") or []
    song = bool(a.song)
    if not song:
        r = run([sys.executable, os.path.join(HERE, "faceless_script.py"), "verify-lock", "--script", a.script], check=False)
        if r.returncode:
            die(1, "script.lock does not match the manifest: narration changed after validation (rerun the validator)")
        if len(blocks) != n:
            die(1, f"--blocks {n} but the manifest has {len(blocks)} blocks")
        if a.takes:
            rep = json.load(open(a.takes, encoding="utf-8"))
            ver = rep.get("verify") or {}
            if not rep.get("pass") or ver.get("route") in (None, "none") or ver.get("mismatch_blocks"):
                die(1, "the take report is not a clean measured and transcribed wave: fix the takes first")
        elif a.allow_unverified_audio:
            receipts.append("AUDIO_CONTENT_UNVERIFIED=no-stt")
        else:
            die(1, "pass --takes <report from takes.py all> (or --allow-unverified-audio on the degraded route)")
    elif a.accept_soft_blocks:
        die(1, "--accept-soft-blocks is refused in song mode")
    ok_names, clips = clip_names(os.listdir(a.clips_dir), n)
    if not ok_names:
        die(1, f"clips must be exactly block01..block{n:02d}; found {clips[:3]}...({len(clips)})")
    pairs, kinds = [], {}
    for k in range(1, n + 1):
        kinds[k] = (blocks[k - 1].get("block_kind") if blocks else None) or "narration"
        v = None if song else os.path.join(a.voice_dir, f"voice{k:02d}.wav")
        if v and not os.path.exists(v):
            die(1, f"block {k}: no {v}")
        pairs.append((os.path.join(a.clips_dir, f"block{k:02d}.mp4"), v))
    if not song:
        extra = sorted(f for f in os.listdir(a.voice_dir) if re.fullmatch(r"voice\d{2,3}\.wav", f) and int(f[5:-4]) > n)
        if extra:
            die(1, f"voice files past --blocks {n}: {extra}")
    with open(os.path.join(work, "pairs.txt"), "w", encoding="utf-8") as f:
        for c, v in pairs:
            f.write(f"{c}\t{v or '-'}\n")
    first = probe(pairs[0][0])
    if not first["video"]:
        die(2, "the first clip has no video stream")
    rate_s, fps = fps_of(first["video"])
    W, H = int(first["video"]["width"]), int(first["video"]["height"])
    soft = ids(a.accept_soft_blocks)
    per, vparts, aparts, sparts = [], [], [], []
    for k, (clip, voice) in enumerate(pairs, 1):
        pc = probe(clip)
        if not pc["video"]:
            die(2, f"block {k}: no video stream")
        vdur = stream_dur(clip, "v:0")
        if vdur < CLIP - 0.5:
            die(1, f"block {k}: clip is {vdur:.2f} s, shorter than {CLIP - 0.5:g} s (retry the block)")
        pad = max(0.0, CLIP - vdur)   # a model may return 9.5-9.99 s: hold the last frame so the video stays N x 10 s
        if pad > 0.2:
            WARN.append(f"block {k}: clip is {vdur:.2f} s, last frame held {pad:.2f} s")
        if a.aspect:
            aw, _, ah = a.aspect.partition(":")
            if abs((W / H) / (float(aw) / float(ah)) - 1) > 0.02:
                die(1, f"block {k}: {W}x{H} is not {a.aspect}")
        if (int(pc["video"]["width"]), int(pc["video"]["height"])) != (W, H):
            die(1, f"block {k}: {pc['video']['width']}x{pc['video']['height']} differs from block 1 ({W}x{H})")
        row = {"n": k, "clip": os.path.basename(clip), "block_kind": kinds[k],
               "freeze_head": freeze(clip, 0, 1.5, 1.0), "freeze_tail": freeze(clip, max(0, pc["duration"] - 2), 2, 1.2)}
        if row["freeze_head"]:
            WARN.append(f"block {k}: static opening (regenerate the block)")
        if row["freeze_tail"]:
            WARN.append(f"block {k}: static tail")
        vf = f"fps={a.stepped},fps={rate_s}" if a.stepped else f"fps={rate_s}"
        if pad > 0.001:
            vf += f",tpad=stop_mode=clone:stop_duration={pad:.3f}"
        vp = os.path.join(tmp, f"v{k:03d}.mp4")
        ff("-i", clip, "-t", f"{CLIP:.3f}", "-an", "-vf", f"{vf},setsar=1,format=yuv420p", "-c:v", "libx264", "-preset", "medium",
           "-crf", "18", "-r", rate_s, vp)
        vparts.append(vp)
        sp = os.path.join(tmp, f"s{k:03d}.wav")
        if pc["audio"] and kinds[k] != "dialogue":
            ff("-i", clip, "-vn", "-t", f"{CLIP:.3f}", "-af", f"apad=whole_dur={CLIP}", "-ar", "48000", "-ac", "2", sp)
        else:
            if not pc["audio"]:
                WARN.append(f"block {k}: clip has no audio stream (diegetic sound missing)")
            ff("-f", "lavfi", "-i", f"anullsrc=r=48000:cl=stereo", "-t", f"{CLIP:.3f}", sp)
        sparts.append(sp)
        if voice:
            ap = os.path.join(tmp, f"a{k:03d}.wav")
            if kinds[k] == "dialogue":
                ff("-i", voice, "-af", f"aresample=48000,atrim=0:{CLIP},apad=whole_dur={CLIP}", "-ac", "2", ap)
                row.update({"voice": os.path.basename(voice), "voice_path": voice, "speech_s": 0, "native_dialogue": True})
            else:
                fdur, s0, s1, pauses = speech(voice)
                spd = s1 - s0
                lo = 7.2 if k in soft else CLIP - 2.2
                hi = CLIP - 0.5
                if not (lo - 0.01 <= spd <= hi + 0.01):
                    die(1, f"block {k}: {spd:.2f} s of speech is outside {lo:.2f}-{hi:.2f} s (retry the take, never stretch it)")
                if pauses:
                    WARN.append(f"block {k}: internal pause {max(pauses):.2f} s")
                # Centre the detected speech: delay the take, or trim its own leading silence.
                t0 = (CLIP - spd) / 2
                pre, cut = (t0 - s0, 0.0) if s0 <= t0 else (0.0, s0 - t0)
                af =(f"loudnorm=I={VOICE_I}:TP={TP}:LRA={LRA},aresample=48000,atrim=start={cut:.3f},asetpts=N/SR/TB,"
                      f"adelay={int(round(pre * 1000))}|{int(round(pre * 1000))},atrim=0:{CLIP},apad=whole_dur={CLIP}")
                ff("-i", voice, "-af", af, "-ac", "2", ap)
                row.update({"voice": os.path.basename(voice), "voice_path": voice, "speech_s": round(spd, 3),
                            "speech_abs_s": round((k - 1) * CLIP + t0, 3),
                            "lead_silence_s": round(s0, 3), "internal_pauses": pauses, "soft_accepted": k in soft})
            aparts.append(ap)
        per.append(row)
    total = n * CLIP
    vcat = os.path.join(tmp, "video.mp4")
    concat_list(vparts, os.path.join(tmp, "v.txt"))
    ff("-f", "concat", "-safe", "0", "-i", os.path.join(tmp, "v.txt"), "-c", "copy", vcat)
    sfx_raw = os.path.join(tmp, "sfx_raw.wav")
    concat_list(sparts, os.path.join(tmp, "s.txt"))
    ff("-f", "concat", "-safe", "0", "-i", os.path.join(tmp, "s.txt"), "-ar", "48000", "-ac", "2", sfx_raw)
    asserts, bed_info, stems = {}, None, {}
    if song:
        sd = probe(a.song)["duration"]
        asserts["song_vs_video_s"] = round(sd - total, 2)
        if abs(sd - total) > 3:
            die(1, f"song is {sd:.1f} s for a {total:.0f} s cut (must be within 3 s): map the blocks to the measured song")
        lead = os.path.join(tmp, "song.wav")
        ff("-i", a.song, "-af", f"apad=whole_dur={total},atrim=0:{total}", "-ar", "48000", "-ac", "2", lead)
        ref_mean, sfx_vol = mean_db(lead), (a.sfx_vol if a.sfx_vol_set else 0.06)
    else:
        lead = os.path.join(tmp, "voice.wav")
        concat_list(aparts, os.path.join(tmp, "a.txt"))
        ff("-f", "concat", "-safe", "0", "-i", os.path.join(tmp, "a.txt"), "-ar", "48000", "-ac", "2", lead)
        ref_mean, sfx_vol = mean_db(lead), a.sfx_vol
    # Clip sound sits about 18 dB under the reference, capped at +10 dB of gain, per block.
    sfx_parts = []
    trim = 20 * math.log10(max(min(sfx_vol, 0.20), 1e-4) / 0.12)
    for k, sp in enumerate(sparts, 1):
        md = mean_db(sp)
        g = min(10.0, (ref_mean - 18) - md + trim) if md > -90 else 0.0
        per[k - 1]["sfx_gain_db"] = round(g, 2)
        gp = os.path.join(tmp, f"g{k:03d}.wav")
        ff("-i", sp, "-af", f"volume={g:.2f}dB", gp)
        sfx_parts.append(gp)
    sfx = os.path.join(tmp, "sfx.wav")
    concat_list(sfx_parts, os.path.join(tmp, "g.txt"))
    ff("-f", "concat", "-safe", "0", "-i", os.path.join(tmp, "g.txt"), "-ar", "48000", "-ac", "2", sfx)
    bed = None
    if a.music and not song:
        bed, bed_info = bed_track(a.music, total, tmp, ref_mean, a.music_vol)
    mix = os.path.join(tmp, "mix.wav")
    stems = duck_and_mix(lead, [sfx], bed, mix, tmp)
    if bed:
        asserts.update(stems)
        if stems["speech_over_bed_db"] < 9:
            die(1, f"the bed sits {stems['speech_over_bed_db']} dB under the speech (needs 9 or more): lower --music-vol")
        if stems["duck_depth_db"] > 12 or stems["bed_ducked_lufs"] < -69:
            die(1, f"the duck removed {stems['duck_depth_db']} dB of bed (12 at most; the music has stopped)")
    if not song:
        low = []
        for k in range(n):
            s, e = k * CLIP, (k + 1) * CLIP
            mv = mean_db(mix, f"atrim={s}:{e},")
            vv = mean_db(lead, f"atrim={s}:{e},")
            if vv > -90 and mv < vv - 3:
                low.append(k + 1)
        if low:
            die(1, f"mixed blocks {low} fall more than 3 dB under their voice-only twin")
    fin_a = os.path.join(tmp, "final.m4a")
    asserts["loudness"] = loudnorm_2pass(mix, fin_a, ("-c:a", "aac", "-b:a", "192k"))
    ff("-i", vcat, "-i", fin_a, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "copy", "-t", f"{total:.3f}",
       "-movflags", "+faststart", a.out)
    return finish(a, tmp, total, n, per, asserts, bed_info, receipts, song, {"fps": rate_s, "size": [W, H]},
                  audio_tol=0.25, check_windows=True)


def finish(a, tmp, total, billing_blocks, per, asserts, bed_info, receipts, song, video_info, audio_tol, check_windows,
           frames=None):
    vd, ad, fd = stream_dur(a.out, "v:0"), stream_dur(a.out, "a:0"), probe(a.out)["duration"]
    asserts.update({"final_s": round(fd, 3), "video_s": round(vd, 3), "audio_s": round(ad, 3), "target_s": total})
    fails = []
    if abs(fd - total) > 1.0:
        fails.append(f"final is {fd:.2f} s, not {total:.0f} s (+/-1)")
    if abs(vd - ad) > audio_tol:
        fails.append(f"audio and video differ by {abs(vd - ad):.2f} s (limit {audio_tol})")
    if check_windows and not song:
        empty = silence_windows_ok(a.out, billing_blocks)
        if empty:
            fails.append(f"no narration in the window of blocks {empty}")
    if not decode_ok(a.out):
        fails.append("the file does not decode cleanly")
    asserts["lufs_final"] = lufs(a.out)
    poster = os.path.splitext(a.out)[0] + "_poster.jpg"
    ff("-ss", "1", "-i", a.out, "-frames:v", "1", "-q:v", "3", poster)
    side = {"manifest_version": 2, "mode": "song" if song else ("stills" if frames is not None else "motion"),
            "song": song, "blocks": billing_blocks, "clip_s": CLIP, "duration_s": total, **video_info,
            "per_block": per, "frames": frames, "bed": bed_info, "asserts": asserts, "receipts": receipts,
            "warnings": WARN, "poster": poster, "sha256": sha(a.out), "ok": not fails, "failures": fails}
    with open(a.out + ".assembly.json", "w", encoding="utf-8") as f:
        json.dump(side, f, indent=1)
    if receipts:
        with open(os.path.join(os.path.dirname(os.path.abspath(a.out)), "receipts.txt"), "a", encoding="utf-8") as f:
            f.write("\n".join(receipts) + "\n")
    print(json.dumps({"ok": not fails, "out": a.out, "sidecar": a.out + ".assembly.json", "poster": poster,
                      "failures": fails, "warnings": WARN, "asserts": asserts}, indent=1))
    if fails:
        os.replace(a.out, a.out + ".rejected.mp4")
        return 1
    return 0


def stills(a):
    tl = json.load(open(a.timeline, encoding="utf-8"))
    frames = tl.get("frames") or []
    if tl.get("manifest_version") != 2 or not frames:
        die(1, "the timeline is not a bound scene manifest (manifest_version 2 with frames)")
    work = os.path.dirname(os.path.abspath(a.out))
    os.makedirs(work, exist_ok=True)
    tmp = tempfile.mkdtemp(prefix="sfl-asm-", dir=work)
    TMPS.append(tmp)
    narr = probe(a.narration)["duration"]
    fails = []
    for i, fr in enumerate(frames, 1):
        if fr.get("n") != i:
            die(1, f"frame numbers must ascend 1..N with no gap (found {fr.get('n')} at {i})")
        if not fr.get("path") or not os.path.exists(fr["path"]) or os.path.getsize(fr["path"]) < 64:
            die(1, f"frame {i}: no materialized file")
        if i > 1 and abs(fr["start"] - frames[i - 2]["end"]) > 0.002:
            die(1, f"frame {i} does not start where frame {i - 1} ends")
    durs = [float(fr["end"]) - float(fr["start"]) for fr in frames]
    holds = [d for d in durs[:-1] if d > 1.5] + ([durs[-1]] if durs[-1] > 1.8 else [])
    if holds:
        fails.append(f"{len(holds)} frames hold longer than 1.5 s")
    floor = int(narr / 1.5)
    if len(frames) < floor:
        fails.append(f"{len(frames)} frames for {narr:.1f} s of narration; the floor is {floor}")
    distinct = len({sha(fr['path']) for fr in frames})
    if distinct < floor:
        fails.append(f"only {distinct} distinct pictures; the floor is {floor}")
    sizes = []
    for fr in frames:
        p = probe(fr["path"])["video"] or {}
        sizes.append((int(p.get("width") or 0), int(p.get("height") or 0)))
    r0 = sizes[0][0] / max(1, sizes[0][1])
    odd = [i + 1 for i, (w, h) in enumerate(sizes) if abs(w / max(1, h) - r0) / r0 > 0.02]
    if odd:
        fails.append(f"frames {odd[:5]} are another aspect (an asset sheet leaked in)")
    total = sum(durs)
    if not (narr - 0.2 <= total <= narr + 0.5):
        fails.append(f"frames last {total:.2f} s for {narr:.2f} s of narration (-0.2/+0.5)")
    if fails:
        die(1, "; ".join(fails))
    W, H = sizes[0]
    s = min(1.0, 1920 / max(W, H))
    W2, H2 = int(W * s) // 2 * 2, int(H * s) // 2 * 2
    lst = os.path.join(tmp, "f.txt")
    with open(lst, "w", encoding="utf-8") as f:
        for fr, d in zip(frames, durs):
            f.write("file '" + os.path.abspath(fr["path"]).replace("'", "'\\''") + f"'\nduration {d:.3f}\n")
        f.write("file '" + os.path.abspath(frames[-1]["path"]).replace("'", "'\\''") + "'\n")
    vid = os.path.join(tmp, "video.mp4")
    ff("-f", "concat", "-safe", "0", "-i", lst, "-vf", f"scale={W2}:{H2}:flags=lanczos,setsar=1,fps=30,format=yuv420p",
       "-c:v", "libx264", "-crf", "18", "-t", f"{total:.3f}", vid)
    voice = os.path.join(tmp, "voice.wav")
    ff("-i", a.narration, "-af", f"loudnorm=I={VOICE_I}:TP={TP}:LRA={LRA},aresample=48000,apad=whole_dur={total:.3f},atrim=0:{total:.3f}",
       "-ac", "2", voice)
    bed, bed_info = (bed_track(a.music, total, tmp, mean_db(voice), a.music_vol) if a.music else (None, None))
    mix = os.path.join(tmp, "mix.wav")
    asserts = duck_and_mix(voice, [], bed, mix, tmp) or {}
    if bed and (asserts["speech_over_bed_db"] < 9 or asserts["duck_depth_db"] > 12):
        die(1, f"bed level out of range: {asserts}")
    fin_a = os.path.join(tmp, "final.m4a")
    asserts["loudness"] = loudnorm_2pass(mix, fin_a, ("-c:a", "aac", "-b:a", "192k"))
    ff("-i", vid, "-i", fin_a, "-map", "0:v:0", "-map", "1:a:0", "-c", "copy", "-movflags", "+faststart", a.out)
    billing = math.ceil((a.duration_seconds or narr) / 10)
    return finish(a, tmp, total, billing, [], asserts, bed_info, [], False, {"fps": "30/1", "size": [W2, H2]},
                  audio_tol=0.75, check_windows=False,
                  frames={"count": len(frames), "distinct": distinct, "max_hold_s": round(max(durs), 3), "narration_s": round(narr, 3)})


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--script")
    p.add_argument("--clips-dir")
    p.add_argument("--voice-dir")
    p.add_argument("--blocks", type=int)
    p.add_argument("--duration-seconds", type=float, default=0)
    p.add_argument("--out", required=True)
    p.add_argument("--takes")
    p.add_argument("--allow-unverified-audio", action="store_true")
    p.add_argument("--accept-soft-blocks", default="")
    p.add_argument("--music")
    p.add_argument("--music-vol", type=float, default=0.10)
    p.add_argument("--sfx-vol", type=float)
    p.add_argument("--stepped", type=int)
    p.add_argument("--song")
    p.add_argument("--aspect", help="W:H every clip must match, for example 16:9")
    p.add_argument("--stills", action="store_true")
    p.add_argument("--timeline")
    p.add_argument("--narration")
    p.add_argument("--keep-temp", action="store_true")
    a = p.parse_args()
    KEEP[0] = a.keep_temp
    a.sfx_vol_set = a.sfx_vol is not None
    a.sfx_vol = a.sfx_vol if a.sfx_vol is not None else 0.12
    a.music_vol = min(a.music_vol, 0.20)
    if a.stepped is not None and not (2 <= a.stepped <= 30):
        p.error("--stepped takes 2-30 drawings a second")
    if a.music and a.song:
        p.error("--music and --song are exclusive: the song is the music")
    if a.stills:
        if not (a.timeline and a.narration):
            p.error("--stills needs --timeline and --narration")
        return stills(a)
    if not (a.clips_dir and a.blocks):
        p.error("motion and song modes need --clips-dir and --blocks")
    if not a.song and not (a.script and a.voice_dir):
        p.error("motion mode needs --script and --voice-dir")
    if not a.duration_seconds:
        a.duration_seconds = a.blocks * CLIP
    return motion(a)


if __name__ == "__main__":
    sys.exit(main())
