#!/usr/bin/env python3
"""story-one-take-short helper (SL8-authored, stdlib only).

  story_take.py show [slug ...]                       print rows of references/prompts.json
  story_take.py assemble --take take.json --out DIR [--max-chars N]
        build DIR/prompt.txt and DIR/params.json from a take plan, run the scripted pre-flight
        lines and write DIR/check.json (with generated_at). Exit 0 ready, 1 a check failed (nothing
        to send), 2 bad input (wrong type or shape; check.json carries the error). Any earlier
        prompt.txt and params.json in DIR are deleted first, so after a failed run nothing stale
        is left to submit. Submit only when check.json says ok: true.
  story_take.py probe --clip FILE --params DIR/params.json [--out FILE]
        ffprobe the delivered clip and compare it with what was sent. "issues" (no video, no audio,
        wrong orientation or size) exit 1; "notes" (a length off by over 0.5 s, the fps) exit 0.
        2 bad input or ffprobe missing.
  story_take.py frames --clip FILE --take take.json --out DIR
        one PNG at the middle of every beat plus one late in the payoff hold. Beat times are scaled
        by (measured length / planned duration), so a short clip still shows each beat; the scale,
        the actual times and a note are printed. Exit 0, 1 ffmpeg failed, 2 bad input or no ffmpeg.

The take plan (written by the agent at step 12, work/<p>/take.json):
  {"archetype": "A".."H", "turn": "...", "aspect": "9:16"|"16:9", "duration": "10".."15",
   "tier": "base"|"fast", "resolution": "480p", "n": 1..3,
   "characters": "...", "setting": "...", "first_frame": "...",
   "beats": [{"start": 0.0, "end": 2.5, "text": "..."}, ...],   # the last beat is the payoff
   "audio": {"score": "...", "sfx": "...", "voice": ""},           # voice: one line or ""
   "negatives": ["animals", "multi-cut"], "extra": ["..."],
   "animal": "kitten" | ["kitten", "dog"],      # one clause per species when animals is chosen
   "extra_params": {"<schema flag>": false}}    # optional: a schema flag to pin (HR4, HR16), merged
                                                 # into params.json and listed in check.json
"""
import json
import os
import re
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TABLE = os.path.join(HERE, '..', 'references', 'prompts.json')
ENDPOINT = {'base': 'bytedance/seedance-2.0/text-to-video', 'fast': 'bytedance/seedance-2.0/fast/text-to-video'}
# shots (min, max), usual durations, payoff hold floor; from the archetype rows (G has no cuts)
ARCH = {
    'A': ((4, 6), ('12',), 2.0), 'B': ((5, 8), ('12', '13', '14', '15'), 2.0),
    'C': ((5, 7), ('12', '13', '14', '15'), 2.0), 'D': ((7, 9), ('15',), 3.0),
    'E': ((5, 6), ('10', '11', '12', '13', '14', '15'), 2.0), 'F': ((5, 7), ('15',), 3.0),
    'G': ((1, 1), ('10', '11', '12', '13', '14', '15'), 2.0), 'H': ((7, 8), ('15',), 2.0),
}
BANNED = [r'\bfloat(s|ing)?\b', r'\bdrift(s|ing)?\b', r'\bglid(e|es|ing)\b', r'\bhover(s|ing)?\b',
          r'\bslowly moves\b', r'\bslow[- ]?motion\b', r'\bslo-?mo\b', r'\bethereal\b', r'\bseamlessly transitions?\b']
TEXTY = r'\b(?:(?:sign|poster|label|banner|billboard|note|card|shirt)\s+(?:reads?|says?|saying)|text|lettering|letters|written words?|writing on)\b'
MOOD_COLOUR = r'\b(golden|rosy|blue-tinted|teal|amber|crimson|moody|warm glow|cool tones?|pastel)\b'
STRICT_LEN = ('D', 'F', 'H')  # a different length is an error for these archetypes
CORE = ('prompt', 'resolution', 'aspect_ratio', 'duration', 'generate_audio')
FAST_MAX = 12  # video facts row beh-seedance-fast-ceiling (2026-07-04): 480p works to 12 s


def table():
    with open(TABLE, encoding='utf-8') as f:
        return {r['slug']: r for r in json.load(f)['rows']}


def fail(code, msg):
    print(json.dumps({'ok': False, 'error': msg}))
    sys.exit(code)


def arg(name, default=None):
    a = sys.argv
    if name in a and a.index(name) + 1 < len(a):
        v = a[a.index(name) + 1]
        if v.startswith('--'):
            fail(2, f'{name} needs a value, got the flag {v}')
        return v
    return default


def need(binary):
    if not shutil.which(binary):
        fail(2, f'{binary} missing: the machine is broken (HR21), report it')


def now():
    import datetime
    return datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')


def clean(out):
    for n in ('prompt.txt', 'params.json'):
        try:
            os.remove(os.path.join(out, n))
        except OSError:
            pass


def bad(out, msg):
    """Bad input: delete stale files, write check.json, exit 2."""
    r = {'ok': False, 'exit': 2, 'error': msg, 'generated_at': now()}
    if out:
        os.makedirs(out, exist_ok=True)
        clean(out)
        with open(os.path.join(out, 'check.json'), 'w', encoding='utf-8') as f:
            json.dump(r, f, indent=1)
    print(json.dumps(r))
    sys.exit(2)


def num(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool)


def animal_clauses(line, animal):
    """The animals line with one 'only one X' clause per species."""
    names = [str(x) for x in animal] if isinstance(animal, list) else [str(animal or 'animal')]
    tail = ', only one [animal] on screen at any moment with no duplicate'
    head = line.replace(tail, '')
    if len(names) > 1:
        head = head.replace('anatomy correct for the species', 'anatomy correct for each species')
    return head + ''.join(f', only one {n} on screen at any moment with no duplicate' for n in names)


def show():
    rows = table()
    want = [s for s in sys.argv[2:] if not s.startswith('--')] or list(rows)
    for s in want:
        if s not in rows:
            fail(2, f'no row {s}; rows: {", ".join(rows)}')
        r = rows[s]
        print(f'## {s} · {r["title"]}\n{r["prompt"]}\n')


def style_block(rows, aspect):
    block = rows['style-block']['prompt']
    return block.replace('vertical 9:16', 'widescreen 16:9') if aspect == '16:9' else block


def assemble():
    take_path, out = arg('--take'), arg('--out')
    if not take_path or not out:
        fail(2, 'assemble needs --take and --out')
    os.makedirs(out, exist_ok=True)
    clean(out)  # nothing stale can be submitted after this run, whatever happens
    try:
        with open(take_path, encoding='utf-8') as f:
            t = json.load(f)
    except (OSError, ValueError) as e:
        bad(out, f'cannot read take plan: {e}')
    if not isinstance(t, dict):
        bad(out, 'the take plan must be a JSON object')
    rows = table()
    errs, warns = [], []
    a = str(t.get('archetype', '')).upper()
    if a not in ARCH:
        bad(out, 'archetype must be one of A-H')
    shots, usual, hold_floor = ARCH[a]
    aspect = t.get('aspect', '9:16')
    tier = t.get('tier', 'base')
    res = t.get('resolution', '480p')
    raw_dur = t.get('duration', '12')
    n = t.get('n')
    beats = t.get('beats') or []
    audio = t.get('audio') or {}
    negs = t.get('negatives', [])
    extra = t.get('extra', [])
    animal = t.get('animal')
    xp = t.get('extra_params') or {}
    if isinstance(raw_dur, bool) or not isinstance(raw_dur, (str, int, float)):
        bad(out, 'duration must be a string such as "12"')
    dur = str(raw_dur)
    for k in ('aspect', 'tier', 'resolution'):
        if not isinstance(t.get(k, ''), str):
            bad(out, f'{k} must be a string')
    for k in ('turn', 'characters', 'setting', 'first_frame'):
        if not isinstance(t.get(k, ''), str):
            bad(out, f'{k} must be a string')
    if n is not None and (isinstance(n, bool) or not isinstance(n, int)):
        bad(out, 'n must be a whole number 1 to 3')
    if not isinstance(beats, list) or not all(isinstance(b, dict) for b in beats):
        bad(out, 'beats must be a list of objects {start, end, text}')
    for i, b in enumerate(beats, 1):
        if not num(b.get('start')) or not num(b.get('end')):
            bad(out, f'beat {i}: start and end must be numbers (seconds)')
    if not isinstance(audio, dict):
        bad(out, 'audio must be an object {score, sfx, voice}')
    if not isinstance(negs, list) or not all(isinstance(x, str) for x in negs):
        bad(out, 'negatives must be a list of names')
    if not isinstance(extra, list):
        bad(out, 'extra must be a list of strings')
    if animal is not None and not (isinstance(animal, str) or (isinstance(animal, list) and all(isinstance(x, str) for x in animal))):
        bad(out, 'animal must be a string or a list of strings')
    if not isinstance(xp, dict) or any(k in CORE for k in xp):
        bad(out, f'extra_params must be an object that does not set {", ".join(CORE)}')
    for k in ('turn', 'characters', 'setting', 'first_frame'):
        if not str(t.get(k, '')).strip():
            errs.append(f'{k} is empty')
    if aspect not in ('9:16', '16:9'):
        errs.append(f'aspect {aspect}: 9:16 by default, 16:9 only on a landscape request')
    if tier not in ENDPOINT:
        errs.append(f'tier {tier}: base or fast')
    dur_i = int(dur) if re.fullmatch(r'1[0-5]', dur) else None
    if dur_i is None:
        errs.append(f'duration "{dur}": a whole-second string from "10" to "15", never "auto"')
    elif tier == 'fast' and dur_i > FAST_MAX:
        errs.append(f'fast tier draft at {dur} s: the fast tier is known to work only up to {FAST_MAX} s at 480p')
    if res != '480p':
        warns.append(f'resolution {res}: the method default is 480p (a kit or brief named another)')
    if dur_i is not None and dur not in usual:
        msg = f'duration {dur} s is not the recipe length for archetype {a} ({"/".join(usual)} s)'
        if a in STRICT_LEN:
            errs.append(msg + ': change the plan to the recipe length or pick another archetype')
        else:
            warns.append(msg + ' (a default; write the reason in PROGRESS.md)')
    if n is None or not 1 <= n <= 3:
        errs.append('n (characters in frame) must be 1, 2 or 3: more than 3 moving characters is on the unrenderable row')
    if not beats:
        errs.append('no beats')
    cursor = 0.0
    for i, b in enumerate(beats, 1):
        s, e = float(b['start']), float(b['end'])
        if abs(s - cursor) > 0.05:
            errs.append(f'beat {i} starts at {s} s, expected {cursor} s (beats run end to end from 0)')
        if e - s <= 0:
            errs.append(f'beat {i} has no length')
        if e - s > 4.0 + 1e-6:
            errs.append(f'beat {i} lasts {e - s:.1f} s: over 4 s a beat goes static; split it with cut,')
        if not str(b.get('text', '')).strip():
            errs.append(f'beat {i} has no text')
        cursor = e
    if beats and dur_i is not None and abs(cursor - dur_i) > 0.05:
        errs.append(f'beats end at {cursor} s but duration is {dur} s')
    if not shots[0] <= len(beats) <= shots[1] and a != 'G':
        errs.append(f'archetype {a} takes {shots[0]}-{shots[1]} shots; the plan has {len(beats)}')
    if a == 'G' and len(beats) > 4:
        warns.append('archetype G: one unbroken shot; the beats are timed segments, written without cut,')
    if beats and hold_floor:
        last = float(beats[-1]['end']) - float(beats[-1]['start'])
        if last + 1e-6 < hold_floor:
            errs.append(f'payoff hold {last:.1f} s: archetype {a} holds the payoff at least {hold_floor:.0f} s')
    voice = str(audio.get('voice', '') or '').strip()
    if not str(audio.get('score', '')).strip() or not str(audio.get('sfx', '')).strip():
        errs.append('audio needs SCORE and SFX')
    if voice and a in ('E', 'F'):
        errs.append(f'archetype {a} takes no VOICE line')
    if voice.count('{') > 1 or '\n' in voice:
        errs.append('at most one VOICE line')
    neg = rows['negatives']['lines']
    for k in negs:
        if k not in neg:
            errs.append(f'negative {k}: one of {", ".join(neg)}')
    if 'animals' in negs and not animal:
        errs.append('the animals line needs "animal" (the animal, or a list of species, that must not be copied)')

    style = style_block(rows, aspect)
    cons = rows['constraints-block']['prompt'].replace('[N]', str(n))
    tail = [animal_clauses(neg[k], animal) if k == 'animals' else neg[k] for k in negs if k in neg]
    tail += [x for x in extra if str(x).strip()]
    parts = [style, '', f'CHARACTERS: {t.get("characters", "").strip()}', '',
             f'SETTING: {t.get("setting", "").strip()}', '', f'FIRST FRAME: {t.get("first_frame", "").strip()}', '']
    for i, b in enumerate(beats):
        lead = '' if i == 0 or a == 'G' else 'cut, '
        parts += [f'{lead}{float(b["start"]):.1f}-{float(b["end"]):.1f}s - {str(b["text"]).strip()}', '']
    au = f'AUDIO: SCORE - {str(audio.get("score", "")).strip()} · SFX - {str(audio.get("sfx", "")).strip()}'
    if voice:
        au += f' · VOICE - {voice if voice.startswith("{") else "{" + voice + "}"}'
    parts += [au, '', ' · '.join([cons.rstrip('.')] + tail) + '.']
    prompt = '\n'.join(parts)

    body = prompt[len(style):prompt.rfind('CONSTRAINTS:')]
    if not prompt.startswith(style):
        errs.append('style block is not first and unchanged')
    if not prompt[prompt.rfind('CONSTRAINTS:'):].startswith(cons.rstrip('.')):
        errs.append('constraints block is not last and unchanged')
    if '[N]' in prompt or '[STYLE' in prompt or '[CONSTRAINTS' in prompt:
        errs.append('a placeholder is left in the prompt')
    for pat in BANNED:
        m = re.search(pat, body, re.I)
        if m:
            errs.append(f'banned motion word "{m.group(0)}" in the beats or cast')
    m = re.search(r'\b(caption|subtitle|title card|on-screen text|logo)\b', body, re.I) or re.search(TEXTY, body, re.I)
    if m:
        errs.append(f'text, captions, signs or logos requested in the content ("{m.group(0)}"): nothing is lettered by the model')
    m = re.search(MOOD_COLOUR, body, re.I)
    if a != 'F' and m:
        errs.append(f'colour word "{m.group(0)}" may describe mood: one light source, no colour for mood (only F writes one cool-to-warm change)')
    if re.search(r'mirror', re.sub(r'no mirrors', '', body, flags=re.I), re.I):
        errs.append('a mirror appears in the content: write only "No mirrors."')
    if 'identical in every cut' not in t.get('characters', ''):
        warns.append('characters should end with "identical in every cut"')
    if a != 'G' and prompt.count('\ncut, ') != max(len(beats) - 1, 0):
        errs.append('every beat after the first must open with cut,')
    max_chars = arg('--max-chars')
    if max_chars and not max_chars.isdigit():
        bad(out, '--max-chars needs a whole number')
    if max_chars and len(prompt) > int(max_chars):
        errs.append(f'prompt is {len(prompt)} characters, over the schema limit {max_chars}: shorten beats, never the two blocks')

    params = {'prompt': prompt, 'resolution': res, 'aspect_ratio': aspect, 'duration': dur, 'generate_audio': True}
    params.update(xp)
    report = {'ok': not errs, 'endpoint': ENDPOINT.get(tier), 'archetype': a, 'turn': t.get('turn'),
              'chars': len(prompt), 'shots': len(beats), 'duration': dur, 'aspect': aspect, 'resolution': res,
              'extra_params': xp, 'generated_at': now(),
              'preflight_scripted': [1, 2, 3, 12, 13, 16],
              'preflight_partial': {'7': 'payoff hold length only; the agent confirms it is not a small prop',
                                    '10': 'colour words for mood only; the agent confirms one named light source'},
              'preflight_agent': [4, 5, 6, 7, 8, 9, 10, 11, 14, 15],
              'errors': errs, 'warnings': warns}
    if errs:
        clean(out)
    else:
        with open(os.path.join(out, 'prompt.txt'), 'w', encoding='utf-8') as f:
            f.write(prompt)
        with open(os.path.join(out, 'params.json'), 'w', encoding='utf-8') as f:
            json.dump(params, f, ensure_ascii=False, indent=1)
    with open(os.path.join(out, 'check.json'), 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=1)
    print(json.dumps(report, ensure_ascii=False, indent=1))
    sys.exit(0 if not errs else 1)


def probe():
    clip, pfile = arg('--clip'), arg('--params')
    if not clip or not pfile or not os.path.exists(clip):
        fail(2, 'probe needs --clip (an existing file) and --params')
    need('ffprobe')
    with open(pfile, encoding='utf-8') as f:
        p = json.load(f)
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration:stream=codec_type,codec_name,width,height,r_frame_rate',
                        '-of', 'json', clip], capture_output=True, text=True)
    if r.returncode:
        fail(1, f'ffprobe failed: {r.stderr.strip()[:300]}')
    d = json.loads(r.stdout)
    v = [s for s in d.get('streams', []) if s.get('codec_type') == 'video']
    au = [s for s in d.get('streams', []) if s.get('codec_type') == 'audio']
    dur = float(d.get('format', {}).get('duration', 0) or 0)
    w, h = (v[0].get('width', 0), v[0].get('height', 0)) if v else (0, 0)
    want = float(p.get('duration', 0))
    issues, notes = [], []
    fps = None
    if v and '/' in str(v[0].get('r_frame_rate', '')):
        num_, den_ = str(v[0]['r_frame_rate']).split('/', 1)
        fps = round(float(num_) / float(den_), 3) if float(den_ or 0) else None
    if not v:
        issues.append('no video stream')
    if not au and p.get('generate_audio'):
        issues.append('no audio stream although generate_audio was true')
    if abs(dur - want) > 0.5:
        notes.append(f'duration {dur:.2f} s against {want:.0f} s requested (more than 0.5 s off): a note, not by itself a reason to re-render (STO-L369)')
    portrait = p.get('aspect_ratio') == '9:16'
    if v and portrait and not w < h:
        issues.append(f'{w}x{h} is not portrait')
    if v and not portrait and not w > h:
        issues.append(f'{w}x{h} is not landscape')
    if v and p.get('resolution') == '480p' and not 440 <= min(w, h) <= 520:
        issues.append(f'short side {min(w, h)} px is not 480-class')
    res = {'clip': clip, 'duration_s': round(dur, 3), 'width': w, 'height': h, 'video': bool(v), 'audio_streams': len(au),
           'audio_codec': au[0].get('codec_name') if au else None, 'fps': fps, 'requested': {k: p.get(k) for k in ('duration', 'aspect_ratio', 'resolution', 'generate_audio')},
           'issues': issues, 'notes': notes, 'settings_line': f'Seedance 2.0 · {p.get("resolution")} · aspect_ratio {p.get("aspect_ratio")} · '
                                               f'{dur:.1f} s measured ({p.get("duration")} requested) · audio {"on" if au else "missing"} · one generation'}
    if arg('--out'):
        with open(arg('--out'), 'w', encoding='utf-8') as f:
            json.dump(res, f, indent=1)
    print(json.dumps(res, indent=1))
    sys.exit(1 if issues else 0)


def frames():
    clip, tp, out = arg('--clip'), arg('--take'), arg('--out')
    if not clip or not tp or not out or not os.path.exists(clip):
        fail(2, 'frames needs --clip (an existing file), --take and --out')
    need('ffprobe')
    need('ffmpeg')
    try:
        with open(tp, encoding='utf-8') as f:
            t = json.load(f)
        beats = t.get('beats') or []
        planned = float(t.get('duration') or 0)
        beats = [(float(b['start']), float(b['end'])) for b in beats]
    except (OSError, ValueError, TypeError, KeyError, AttributeError) as e:
        fail(2, f'cannot read the take plan: {e}')
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', clip], capture_output=True, text=True)
    length = float(r.stdout.strip() or 0)
    scale = length / planned if length and planned else 1.0
    os.makedirs(out, exist_ok=True)
    marks = [(f'b{i}', (a + b) / 2, f'beat {i}') for i, (a, b) in enumerate(beats, 1)]
    if beats:
        a, b = beats[-1]
        marks.append(('payoff-late', a + 0.85 * (b - a), 'late in the payoff hold'))
    done, bad_ = [], []
    for name, at, stands in marks:
        at = max(0.0, min(at * scale, length - 0.05)) if length else at
        dest = os.path.join(out, f'{name}.png')
        q = subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{at:.2f}', '-i', clip, '-frames:v', '1', dest], capture_output=True, text=True)
        (done if q.returncode == 0 and os.path.exists(dest) else bad_).append({'frame': dest, 'at_s': round(at, 2), 'stands_for': stands})
    res = {'clip_s': length, 'planned_s': planned, 'scale': round(scale, 4), 'frames': done, 'failed': bad_}
    if planned and abs(length - planned) > 0.5:
        res['note'] = (f'the clip is {length:.2f} s against {planned:.0f} s planned: every frame time is scaled by {scale:.3f}, '
                       'so each frame stands for its beat only approximately; say so when you describe them')
    print(json.dumps(res, indent=1))
    sys.exit(1 if bad_ else 0)


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else ''
    try:
        {'show': show, 'assemble': assemble, 'probe': probe, 'frames': frames}.get(cmd, lambda: fail(2, __doc__))()
    except SystemExit:
        raise
    except Exception as e:  # a crash is bad input or a broken machine, never a failed pre-flight line
        fail(2, f'{cmd} could not run: {type(e).__name__}: {e}')
