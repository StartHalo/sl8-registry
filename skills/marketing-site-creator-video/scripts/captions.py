#!/usr/bin/env python3
"""captions.py: word clock, script alignment and burned captions for marketing-site-creator-video.

SL8-authored from the behaviour the capability assessment records for WF20-a1 steps 19 and 21 and its
Scribe v2 enrichment (no vendor file is copied). The caption TEXT always comes from script.txt; the
transcript is only the clock.

  captions.py words --stt envelope.json --out words.json
      Scribe v2 result (ai-gen JSON envelope) -> [[start, end, text], ...], keeping type "word" only.
  captions.py words --local media --lang en [--model small] --out words.json
      Local faster-whisper (baked weights only, never downloaded) -> the same shape.
  captions.py align --words words.json --script script.txt --out timed.json [--allow-qa-misses]
      Every script word gets a time; a heard word that is not in the script is a QA miss.
  captions.py build --timed timed.json --hook hook.txt --mode both|subtitles|hook --video final.mp4
                    --out-dir DIR [--font NAME]
      Writes DIR/captions.ass (bottom, sentence case) and/or DIR/hook.ass (top plate, capitals).
  captions.py burn --video final.mp4 --mode both|subtitles|hook --dir DIR --out final_captioned.mp4 [--fontsdir DIR]
Exit 0 ok; 1 failed; 2 a tool, library or weights missing; 3 QA gate: a heard word is not in the
script (a display form to fix in script.txt, or an ad-libbed filler: --allow-qa-misses; qa_miss_times lists each miss with its time);
4 no speech found (burn nothing; deliver the uncaptioned final).
"""
import argparse, difflib, json, os, re, shutil, subprocess, sys, tempfile

PAIR_CHARS = 11      # two words share a caption only when together they fit in 11 characters
JOIN_GAP = 0.35      # ... and the pause between them is under 0.35 s
TAIL = 0.15          # a caption stays 0.15 s after its last word, then the screen clears
MIN_HOLD = 0.20      # shortest caption on screen
SUBST = 0.6          # a mis-heard span is replaced by the script's words above this similarity
BREAK = re.compile(r'[.!?:;]["\')\]]*$')


def die(msg, code=1):
    print(f'captions.py: {msg}', file=sys.stderr)
    sys.exit(code)


def norm(t):
    return re.sub(r'[^\w]+', '', t.lower())


def save(p, obj):
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)


def cmd_words(a):
    if a.stt:
        env = json.load(open(a.stt, encoding='utf-8'))
        if env.get('success') is False:
            die(f"the transcription failed: {env.get('error', {}).get('message', '')[:200]}")
        raw = env.get('raw') or {}
        ws = raw.get('words') or (raw.get('output') or {}).get('words') or env.get('words') or []
        text = (env.get('text') or raw.get('text') or '').strip()
        out = [[round(float(w['start']), 3), round(float(w['end']), 3), w['text'].strip()]
               for w in ws if w.get('type', 'word') == 'word' and str(w.get('text', '')).strip()]
        if not out:
            if text:
                die('the result has text but no word timings: a failed transcription (switch engine), never spread the script over time')
            save(a.out, []); print(json.dumps({'words': 0, 'speech': False})); return 4
    else:
        try:
            from faster_whisper import WhisperModel
        except ImportError:
            die('faster-whisper is not on this machine (no runtime installs, HR21)', 2)
        if not shutil.which('ffmpeg'):
            die('ffmpeg is not on this machine', 2)
        wav = tempfile.mktemp(suffix='.wav')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', a.local, '-vn', '-ac', '1', '-ar', '16000', wav], check=True)
        try:
            model = WhisperModel(a.model, device='cpu', compute_type='int8', local_files_only=True)
        except Exception as e:  # weights are baked at build; never fetched in a job
            die(f'faster-whisper weights for "{a.model}" are not on this machine ({str(e)[:120]})', 2)
        segs, _ = model.transcribe(wav, language=a.lang, word_timestamps=True, vad_filter=True,
                                   condition_on_previous_text=False, beam_size=5)
        out = []
        for s in segs:
            for w in s.words or []:
                t = w.word.strip()
                if not t:
                    continue
                if out and t[0] in ".-'":   # a piece glued to the word before it
                    out[-1][2] += t; out[-1][1] = round(w.end, 3)
                else:
                    out.append([round(w.start, 3), round(w.end, 3), t])
        os.unlink(wav)
        if not out:
            save(a.out, []); print(json.dumps({'words': 0, 'speech': False})); return 4
    save(a.out, out)
    print(json.dumps({'words': len(out), 'speech': True, 'first': out[0][0], 'last': out[-1][1]}))
    return 0


def glue(words):
    out = []
    for s, e, t in words:
        t = t.strip()
        if out and t and t[0] in ".-'":
            out[-1] = [out[-1][0], e, out[-1][2] + t]
        elif t:
            out.append([s, e, t])
    return out


def cmd_align(a):
    heard = glue(json.load(open(a.words, encoding='utf-8')))
    if not heard:
        die('no speech in words.json: burn nothing', 4)
    script = open(a.script, encoding='utf-8').read().split()
    A, B = [norm(w[2]) for w in heard], [norm(w) for w in script]
    times = [None] * len(script)
    misses, unheard, miss_at = [], [], []
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(a=A, b=B, autojunk=False).get_opcodes():
        if tag == 'equal':
            for i, j in zip(range(i1, i2), range(j1, j2)):
                times[j] = (heard[i][0], heard[i][1])
        elif tag == 'replace':
            ratio = difflib.SequenceMatcher(a=''.join(A[i1:i2]), b=''.join(B[j1:j2])).ratio()
            if ratio > SUBST:   # the script's spelling over the heard span's time, shared by length
                s0, e0 = heard[i1][0], heard[i2 - 1][1]
                lens = [max(1, len(B[j])) for j in range(j1, j2)]
                t = s0
                for j, L in zip(range(j1, j2), lens):
                    d = (e0 - s0) * L / sum(lens)
                    times[j] = (round(t, 3), round(t + d, 3)); t += d
            else:
                misses += [heard[i][2] for i in range(i1, i2)]
                miss_at += [[heard[i][2], heard[i][0], heard[i][1]] for i in range(i1, i2)]
                unheard += script[j1:j2]
        elif tag == 'delete':
            misses += [heard[i][2] for i in range(i1, i2)]
            miss_at += [[heard[i][2], heard[i][0], heard[i][1]] for i in range(i1, i2)]
        elif tag == 'insert':
            unheard += script[j1:j2]
    # Unheard script words share the gap between their timed neighbours.
    j = 0
    while j < len(times):
        if times[j] is not None:
            j += 1; continue
        k = j
        while k < len(times) and times[k] is None:
            k += 1
        lo = times[j - 1][1] if j > 0 else (times[k][0] if k < len(times) else 0.0)
        hi = times[k][0] if k < len(times) else lo + 0.3 * (k - j)
        step = max(0.0, hi - lo) / (k - j)
        for n in range(j, k):
            times[n] = (round(lo + step * (n - j), 3), round(lo + step * (n - j + 1), 3))
        j = k
    sim = difflib.SequenceMatcher(a=A, b=B, autojunk=False).ratio()
    out = {'words': [[t[0], t[1], w, i] for i, (w, t) in enumerate(zip(script, times))],
           'qa_misses': misses, 'qa_miss_times': miss_at, 'unheard': unheard, 'similarity': round(sim, 3)}
    save(a.out, out)
    print(json.dumps({'script_words': len(script), 'heard_words': len(heard), 'similarity': out['similarity'],
                      'qa_misses': misses, 'qa_miss_times': miss_at, 'unheard': unheard}))
    if misses and not a.allow_qa_misses:
        print('FAIL heard words not in the script. Two causes, test the first one first: (1) a display form differs (a brand spelled another way, a number as a word): fix script.txt and rerun; (2) the creator ad-libbed a filler or reaction ("oh", "uh", "ha"): the clock is still right, so rerun with --allow-qa-misses and leave script.txt as it is. qa_miss_times above gives each heard word with its start and end')
        return 3
    return 0


def group(words):
    caps, i = [], 0
    while i < len(words):
        s, e, w = words[i][0], words[i][1], words[i][2]
        if i + 1 < len(words):
            n = words[i + 1]
            if not BREAK.search(w) and len(w) + 1 + len(n[2]) <= PAIR_CHARS and n[0] - e < JOIN_GAP:
                caps.append([s, n[1], f'{w} {n[2]}']); i += 2; continue
        caps.append([s, e, w]); i += 1
    for k, c in enumerate(caps):
        end = max(c[1] + TAIL, c[0] + MIN_HOLD)
        if k + 1 < len(caps):
            end = min(end, caps[k + 1][0])   # never overlap the next caption
        c[1] = round(max(end, c[0] + 0.04), 3)
        c[2] = c[2].rstrip(',;')
    return caps


def ts(t):
    cs = int(round(max(0.0, t) * 100))   # whole centiseconds first, so 59.996 never prints 60.00
    return f'{cs // 360000}:{cs // 6000 % 60:02d}:{cs // 100 % 60:02d}.{cs % 100:02d}'


def ass(path, W, H, font, size, align, margin_v, events):
    esc = lambda s: s.replace('\\', '\\\\').replace('{', '(').replace('}', ')')
    lines = ['[Script Info]', 'ScriptType: v4.00+', f'PlayResX: {W}', f'PlayResY: {H}', 'ScaledBorderAndShadow: yes', 'WrapStyle: 0', '',
             '[V4+ Styles]',
             'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
             f'Style: Cap,{font},{size},&H00FFFFFF,&H000000FF,&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,{max(2, round(size / 16))},0,{align},{round(W * 0.06)},{round(W * 0.06)},{margin_v},1',
             '', '[Events]', 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text']
    lines += [f'Dialogue: 0,{ts(s)},{ts(e)},Cap,,0,0,0,,{esc(t)}' for s, e, t in events]
    open(path, 'w', encoding='utf-8').write('\n'.join(lines) + '\n')


def size_of(video):
    r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height',
                        '-of', 'csv=p=0', video], capture_output=True, text=True)
    if r.returncode:
        die(f'ffprobe failed on {video}', 2)
    w, h = r.stdout.strip().split(',')[:2]
    return int(w), int(h)


def no_emoji(t):
    return re.sub('[\U0001F000-\U0001FAFF☀-➿️‍]', '', t).strip()


def cmd_build(a):
    tw = json.load(open(a.timed, encoding='utf-8'))['words']
    if not tw:
        die('no timed words: burn nothing', 4)
    W, H = size_of(a.video)
    os.makedirs(a.out_dir, exist_ok=True)
    k = H / 1920
    hook = open(a.hook, encoding='utf-8').read().split() if a.mode in ('both', 'hook') else []
    n = len(hook)
    out = {'mode': a.mode, 'width': W, 'height': H}
    if hook:
        if n >= len(tw):
            die('hook.txt is as long as the whole script')
        plate_end = tw[n][0]    # the first whole body word starts: never a guessed pause, never a fixed 2 s
        text = no_emoji(' '.join(hook)).upper()
        ass(os.path.join(a.out_dir, 'hook.ass'), W, H, a.font, round(88 * k), 8, round(0.10 * H), [[tw[0][0], plate_end, text]])
        out['plate'] = [tw[0][0], plate_end, text]
    if a.mode in ('both', 'subtitles'):
        body = [w for w in tw if w[3] >= n] if a.mode == 'both' else tw
        caps = [[s, e, no_emoji(t)] for s, e, t in group(body)]
        caps = [c for c in caps if c[2]]
        ass(os.path.join(a.out_dir, 'captions.ass'), W, H, a.font, round(50 * k), 2, round(0.15 * H), caps)
        out['captions'] = len(caps)
        save(os.path.join(a.out_dir, 'segments.json'), caps)
    print(json.dumps(out, ensure_ascii=False))
    return 0


def cmd_burn(a):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-filters'], capture_output=True, text=True)
    if not re.search(r'^\s*\S+\s+ass\s', r.stdout, re.M):
        die('this ffmpeg has no ass filter (libass): captions cannot be burned', 2)
    files = {'both': ['captions.ass', 'hook.ass'], 'subtitles': ['captions.ass'], 'hook': ['hook.ass']}[a.mode]
    fd = f":fontsdir='{a.fontsdir}'" if a.fontsdir else ''
    vf = ','.join(f"ass='{os.path.join(a.dir, f)}'{fd}" for f in files)
    r = subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', a.video, '-vf', vf, '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
                        '-profile:v', 'high', '-crf', '18', '-preset', 'medium', '-movflags', '+faststart', '-c:a', 'copy', a.out], capture_output=True, text=True)
    if r.returncode or not os.path.exists(a.out):
        die(f'burn failed: {r.stderr.strip()[:300]}')
    print(json.dumps({'out': a.out, 'layers': files}))
    return 0


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    sp = ap.add_subparsers(dest='cmd', required=True)
    w = sp.add_parser('words'); g = w.add_mutually_exclusive_group(required=True); g.add_argument('--stt'); g.add_argument('--local')
    w.add_argument('--lang'); w.add_argument('--model', default='small'); w.add_argument('--out', required=True)
    al = sp.add_parser('align'); al.add_argument('--words', required=True); al.add_argument('--script', required=True)
    al.add_argument('--out', required=True); al.add_argument('--allow-qa-misses', action='store_true')
    b = sp.add_parser('build'); b.add_argument('--timed', required=True); b.add_argument('--hook'); b.add_argument('--video', required=True)
    b.add_argument('--mode', choices=['both', 'subtitles', 'hook'], default='both'); b.add_argument('--out-dir', required=True)
    b.add_argument('--font', default='Metropolis')
    u = sp.add_parser('burn'); u.add_argument('--video', required=True); u.add_argument('--mode', choices=['both', 'subtitles', 'hook'], default='both')
    u.add_argument('--dir', required=True); u.add_argument('--out', required=True); u.add_argument('--fontsdir')
    a = ap.parse_args()
    if a.cmd == 'build' and a.mode in ('both', 'hook') and not a.hook:
        ap.error('--hook is required for modes both and hook')
    return {'words': cmd_words, 'align': cmd_align, 'build': cmd_build, 'burn': cmd_burn}[a.cmd](a)


if __name__ == '__main__':
    sys.exit(main())
