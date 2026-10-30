#!/usr/bin/env python3
"""story-found-footage helper: the local steps of the found-footage story method (WF37-a1-s1).

Written by SL8 from the behaviour the capability assessment records; no vendor file is copied.
Every subcommand prints one JSON report on stdout. Exit codes: 0 pass, 1 a check failed (the
report says which), 2 bad input, an unusable input file or a missing tool.
--allow R: every hard rule below is a default; a kit or brief that names another value passes --allow <rule>,
which turns that failure into a note and records the rule in the report's `allowed` list (copy it into plan.json). Nothing here calls a model or the network.

  preflight                                   ffmpeg filters, fonts, python modules
  narration --text F --length S [--allow R]   word table, hook, punctuation, stock phrases, break tag
  plan --shots L [--allow R] [--no-timestamp] shot-list rules that a script can check
  params KIND --out O [--allow R] [--set k=v] one params file per model call, defaults pinned, prompt checked
  timing --text F --words W --audio A --target S --out T
                                              sentence ends from Scribe v2 words, transcript diff, pace
  fit --timing T --shots L [--per-sentence] [--drop N] [--render-margin S] [--write]
                                              shot windows on sentence ends, render lengths
  clipcheck --clip C --shot-length X --out-dir D [--audio yes|no] [--render-length N] [--tolerance S]
                                              duration, shortfall, audio stream, whole-clip contact sheet, frames, frozen control
  sound --shots L [--loud 0-3]                which clip's sound each shot plays (the calm-clip rule)
  stitch --shots L --timing T --narration A --out O [--bed-out B] [--no-timestamp] [--loud 0-3]
                                              one ffmpeg stitch: bed, narration, hold, timestamp, -16 LUFS
  captions --timing T --video V --out O [--ass-only]
                                              low-key caption groups as ASS, burned in one encode
"""
import argparse
import difflib
import json
import math
import os
import re
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REFS = os.path.join(HERE, '..', 'references')

WORD_TABLE = {30: (85, 95), 35: (100, 110), 40: (115, 125), 45: (130, 140)}
PROMPT_LIMITS = {'place': 1300, 'subject': 1100, 'shot': 1100, 'seedance': 1100, 'kling': 1100, 'minimax': 1100}
HARD_LIMIT = 2500
MODELS = {
    'tts': 'fal-ai/elevenlabs/tts/multilingual-v2',
    'stt': 'fal-ai/elevenlabs/speech-to-text/scribe-v2',
    'place': 'fal-ai/nano-banana-2',
    'subject': 'fal-ai/nano-banana-2',
    'shot': 'fal-ai/nano-banana-pro/edit',
    'seedance': 'bytedance/seedance-2.0/image-to-video',
    'kling': 'fal-ai/kling-video/v3/pro/image-to-video',
    'minimax': 'minimax/h3/image-to-video',
    'music': 'fal-ai/elevenlabs/music',
}
# Minimum and maximum render length per clip route (facts: Seedance "4"-"15", Kling "3"-"15", H3 integer 5-15).
RENDER_RANGE = {'seedance': (4, 15), 'kling': (3, 15), 'minimax': (5, 15)}
COLOR_WORDS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'violet', 'pink', 'brown', 'gold', 'golden',
               'silver', 'tan', 'beige', 'teal', 'navy', 'maroon', 'ginger', 'turquoise', 'crimson', 'scarlet', 'amber']
# Brand readings only. Plain words that are also brands ('ring', 'nest', 'blink') match only beside a camera word,
# so 'a nest in the tree' or 'a ring of keys' never trips the check.
BRANDS = ['arlo', 'eufy', 'wyze', 'gopro', 'axon', 'garmin', 'browning', 'bushnell', 'reolink', 'hikvision',
          'lorex', 'nextbase', 'vantrue', 'stealth cam', 'tesla',
          'ring doorbell', 'ring camera', 'ring cam', 'ring video', 'ring spotlight', 'nest cam', 'nest camera',
          'nest doorbell', 'nest hello', 'blink camera', 'blink mini', 'blink outdoor', 'blink cam']
# Not calm (WF37-a1-s1 step 14, research everygen/foundfootagestories-179c12#82), as word stems.
NOT_CALM = ['bark', 'howl', 'whine', 'meow', 'cries', 'crying', 'scratch', 'dig', 'tear', 'strain', 'struggl',
            'squeez', 'pulled', 'towel', 'shakes off', 'shaking off', 'shout', 'siren', 'horn', 'crash',
            'hard braking', 'brakes hard', 'grab', 'rubbing', 'rubs']


class Rules:
    """Collects hard-rule failures; a rule named by --allow becomes a note and is listed under `allowed`."""

    def __init__(self, allow):
        self.allow = set(allow or [])
        self.fails, self.notes, self.allowed = [], [], []

    def fail(self, rule, msg):
        if rule in self.allow:
            self.notes.append(f'{msg} (allowed by the brief: --allow {rule})')
            if rule not in self.allowed:
                self.allowed.append(rule)
        else:
            self.fails.append(f'{msg} [override: --allow {rule}]')


def report(obj, code):
    print(json.dumps(obj, indent=1, ensure_ascii=False))
    sys.exit(code)


def die(msg, code=2):
    report({'ok': False, 'error': msg}, code)


def need(tool):
    if not shutil.which(tool):
        die(f'{tool} is not on this machine: the machine is broken, report it (HR21)')


def run(cmd, check=True):
    p = subprocess.run(cmd, capture_output=True, text=True, stdin=subprocess.DEVNULL)
    if check and p.returncode != 0:
        die(f'command failed ({p.returncode}): {" ".join(cmd)}\n{p.stderr[-1500:]}')
    return p


def probe(path):
    need('ffprobe')
    if not os.path.exists(path):
        die(f'missing file {path}')
    p = run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration:stream=index,codec_type,duration,width,height',
             '-of', 'json', path])
    d = json.loads(p.stdout)
    streams = d.get('streams', [])
    return {
        'duration': float(d.get('format', {}).get('duration') or 0),
        'audio_streams': sum(1 for s in streams if s.get('codec_type') == 'audio'),
        'video_streams': sum(1 for s in streams if s.get('codec_type') == 'video'),
        'size': next(([s.get('width'), s.get('height')] for s in streams if s.get('codec_type') == 'video'), None),
    }


def read_json(path):
    try:
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    except (OSError, ValueError) as e:
        die(f'cannot read {path}: {e}')


def write_json(path, obj):
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(obj, f, indent=1, ensure_ascii=False)
        f.write('\n')


def load_lines(name):
    with open(os.path.join(REFS, name), encoding='utf-8') as f:
        return [l.rstrip('\n') for l in f if l.strip() and not l.startswith('#')]


def prompt_rows():
    return {r['slug']: r['prompt'] for r in read_json(os.path.join(REFS, 'prompts.json'))['rows']}


# ---------------------------------------------------------------- text helpers
BREAK = re.compile(r'<break time="1s" />')


def sentences_of(text):
    plain = BREAK.sub(' ', text)
    parts = [s.strip() for s in re.split(r'(?<=\.)\s+', plain.strip()) if s.strip()]
    return parts


def tokens(s):
    return [t for t in re.findall(r"[A-Za-z0-9']+", s)]


def norm(t):
    return t.lower().replace("'", '').replace('\u2019', '')


ONES = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split()
TENS = 'zero ten twenty thirty forty fifty sixty seventy eighty ninety'.split()


def num_words(n):
    if n < 20:
        return [ONES[n]]
    if n < 100:
        return [TENS[n // 10]] + ([ONES[n % 10]] if n % 10 else [])
    if n < 1000:
        return [ONES[n // 100], 'hundred'] + (num_words(n % 100) if n % 100 else [])
    return [str(n)]


def words_of_text(t):
    return len(tokens(BREAK.sub(' ', t)))


# ---------------------------------------------------------------- preflight
def cmd_preflight(a):
    need('ffmpeg')
    need('ffprobe')
    filt = run(['ffmpeg', '-hide_banner', '-filters']).stdout
    want = ['drawtext', 'ass', 'loudnorm', 'ebur128', 'tpad', 'amix', 'silencedetect', 'concat', 'apad', 'anullsrc', 'aloop']
    have = {f: bool(re.search(rf'\s{f}\s', filt)) for f in want}
    fonts = {}
    if shutil.which('fc-match'):
        for fam in ['monospace', 'DejaVu Sans Mono', 'Inter', 'DejaVu Sans']:
            p = run(['fc-match', '-f', '%{family}|%{file}', fam], check=False)
            fonts[fam] = p.stdout.strip()
            if fam == 'Inter' and fam.lower() not in p.stdout.lower().split('|')[0]:
                fonts[fam] += '  (fallback: Inter is not installed)'
    if 'fallback' in fonts.get('Inter', ''):
        notes_font = 'Inter is missing: fc-match answers with a fallback, so captions would burn in another face (say so in the hand-off or pass --font)'
    else:
        notes_font = None
    mods = {}
    for m in ['numpy']:
        mods[m] = subprocess.run([sys.executable, '-c', f'import {m}'], capture_output=True).returncode == 0
    missing = [f for f in ['loudnorm', 'ebur128', 'tpad', 'amix', 'concat', 'apad', 'anullsrc', 'silencedetect', 'aloop'] if not have[f]]
    out = {'ok': not missing, 'filters': have, 'fonts': fonts, 'python': mods,
           'notes': []}
    if notes_font:
        out['notes'].append(notes_font)
    if not have['drawtext']:
        out['notes'].append('no drawtext: the camera timestamp cannot be drawn; stitch with --no-timestamp and say so in the hand-off')
    if not have['ass']:
        out['notes'].append('no ass filter (libass): captions cannot be burned; deliver the stitched video and say captions did not run')
    mono = fonts.get('monospace', '')
    if mono and 'mono' not in mono.lower():
        out['notes'].append(f'no monospace face: fc-match monospace gives {mono.split("|")[0]}; the timestamp uses it (not offered on this machine yet)')
    if missing:
        out['error'] = f'missing ffmpeg filters {missing}: the machine is broken (HR21)'
    report(out, 0 if not missing else 2)


# ---------------------------------------------------------------- narration
def cmd_narration(a):
    with open(a.text, encoding='utf-8') as f:
        raw = f.read()
    text = raw.rstrip('\n')
    R = Rules(a.allow)
    fails, notes = R.fails, R.notes
    if '\n' in text:
        fails.append('narration.txt must be one line: sentences joined by single spaces')
    if re.search(r'  ', text):
        fails.append('double space between sentences')
    breaks = len(BREAK.findall(text))
    if breaks != 1:
        R.fail('break', f'{breaks} break tags; exactly one <break time="1s" /> is allowed, after the full stop before the reveal')
    if re.search(r'<(?!break time="1s" />)', text) or re.search(r'\[|\]|\(|\)', text):
        fails.append('brackets, stage directions or another tag in the narration')
    plain = BREAK.sub(' ', text)
    for ch, name in [('?', 'question mark'), ('!', 'exclamation mark'), (';', 'semicolon'), (':', 'colon')]:
        if ch in plain:
            fails.append(f'{name} in the narration')
    if re.search(r'[\u2013\u2014]|\s-\s|--', plain):
        fails.append('a dash in the narration')
    digits = re.findall(r'\d+', plain)
    if digits and a.allow_digits:
        R.allowed.append('digits')
    if digits and not a.allow_digits:
        fails.append(f'digits {digits}: write numbers, times and symbols as words (only a number an earlier line set up may stay; then pass --allow-digits)')
    if re.search(r'[%$&@#+=/]', plain):
        fails.append('a symbol in the narration: write it as words')
    if not plain.strip().endswith('.'):
        fails.append('the narration must end with a full stop')
    low = plain.lower().replace('\u2019', "'")
    hits = []
    for ph in load_lines('cut-phrases.txt'):
        if ph.startswith('re:'):
            if re.search(ph[3:], plain):
                hits.append(ph)
        elif re.search(r'\b' + re.escape(ph) + r'\b', low):
            hits.append(ph)
    if hits:
        R.fail('stock', f'stock phrases to cut: {hits}')
    sents = sentences_of(text)
    n_words = words_of_text(text)
    hook = len(tokens(sents[0])) if sents else 0
    length = a.length
    row = WORD_TABLE.get(length)
    if row is None:
        lo, hi = round(length * 3 - 5), round(length * 3 + 5)  # the table's own rows are 3L-5 .. 3L+5
        notes.append(f'no table row for {length} s; using about 3 words a second ({lo}-{hi})')
        row = (lo, hi)
    if not row[0] <= n_words <= row[1]:
        R.fail('words', f'{n_words} words; the {length} s row is {row[0]}-{row[1]} (over: cut a sentence, never speed the reader up)')
    if hook > 7:
        R.fail('hook', f'hook has {hook} words; at most 7, spoken inside 2 s')
    first_person = re.findall(r"\b(I|I'm|I've|we|we're|us|our|my)\b", plain)
    if first_person:
        notes.append(f'first-person words {sorted(set(first_person))}: the narrator is third person the whole way')
    if not re.search(r"\b\w+'(s|t|re|ll|d|ve|m)\b", plain):
        notes.append('no contractions at all: the loudest sign a machine wrote it')
    lens = [len(tokens(s)) for s in sents]
    if lens and max(lens) - min(lens) < 4:
        notes.append(f'sentence lengths {lens} are even; mix a long one with a short one')
    report({'ok': not fails, 'words': n_words, 'table_row': list(row), 'sentences': len(sents),
            'sentence_words': lens, 'hook_words': hook, 'fails': fails, 'notes': notes, 'allowed': R.allowed}, 1 if fails else 0)


# ---------------------------------------------------------------- plan
def cmd_plan(a):
    sl = read_json(a.shots)
    R = Rules(a.allow)
    shots = sl.get('shots', [])
    cams = sl.get('cameras', [])
    variant = sl.get('variant', 'base')
    if variant != 'home-base' and not 4 <= len(shots) <= 6:
        R.fail('shot-count', f'{len(shots)} shots; plan 4-6 (about 4 for 30 s, 5 for 35-40, 6 for 45)')
    fixed = [c for c in cams if not c.get('moving')]
    if len(fixed) > 2:
        R.fail('fixed-cameras', f'{len(fixed)} fixed cameras; two at most')
    tiers = {c.get('tier', 'modern') for c in cams}
    if len(tiers) > 1:
        R.fail('camera-tier', f'camera tiers {sorted(tiers)}: one tier per story')
    for c in cams:
        place = c.get('place', '')
        bad = [w for w in COLOR_WORDS if re.search(rf'\b{w}\b', place.lower())]
        if bad:
            R.fail('place-colour', f'camera {c.get("id")}: Place line names colours {bad}')
        if not c.get('moving') and not place:
            R.fail('place-line', f'camera {c.get("id")}: a fixed camera needs a Place line')
        if not c.get('sound'):
            R.fail('sound-line', f'camera {c.get("id")}: no Sound line')
        br = brand_hits(place + ' ' + c.get('sound', ''))
        if br:
            R.fail('brand', f'camera {c.get("id")}: brand wording {br} (a camera brand or product name never goes in a prompt)')
        if not a.no_timestamp and not c.get('readout') and not sl.get('readout'):
            R.fail('readout', f'camera {c.get("id")}: no readout (cameras[].readout); the stitch needs one unless the customer refused the timestamp (then plan with --no-timestamp)')
    subs = sl.get('subjects', [])
    if len(subs) > 3:
        R.fail('subject-lines', f'{len(subs)} subject lines; three at most')
    for s_ in subs:
        if len(s_.get('line', '')) >= 100:
            R.fail('subject-lines', f'subject {s_.get("id")}: line is {len(s_["line"])} characters; under 100')
    night = any(sh.get('light') == 'night' for sh in shots)
    obj = (sl.get('story_object') or {}).get('line', '')
    if night and any(re.search(rf'\b{w}\b', obj.lower()) for w in COLOR_WORDS):
        R.fail('object-colour', 'the story object is named with a colour and a shot is at night')
    away = [sh['n'] for sh in shots if variant == 'home-base' and sh.get('camera') != (cams[0]['id'] if cams else None)]
    if variant == 'home-base' and len(away) > 2:
        R.fail('home-base-away', f'home-base variant: shots {away} are away from the home base; at most two')
    for i in range(1, len(shots)):
        a1, b1 = shots[i - 1], shots[i]
        diff = sum(1 for k in ['distance', 'action', 'subjects', 'object_state', 'light'] if a1.get(k) != b1.get(k))
        if diff < 2:
            R.fail('neighbours', f'shots {a1.get("n")} and {b1.get("n")} differ in {diff} of distance, action, subjects, object state, light; two at least')
    if len(shots) >= 4 and len({sh.get('situation') for sh in shots if sh.get('situation')}) < 3:
        R.fail('situations', 'fewer than three named situations; a story of 30 s or more needs three')
    report({'ok': not R.fails, 'shots': len(shots), 'cameras': len(cams), 'fails': R.fails, 'notes': R.notes,
            'allowed': R.allowed}, 1 if R.fails else 0)


# ---------------------------------------------------------------- params
def brand_hits(text):
    low = text.lower()
    return [b for b in BRANDS if re.search(rf'\b{re.escape(b)}\b', low)]


STEP = re.compile(r'(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*s\s*:')


def check_prompt(kind, prompt, night=False, moving=False, duration=None, R=None):
    R = R or Rules([])
    rows = prompt_rows()
    lim = PROMPT_LIMITS.get(kind)
    if len(prompt) > HARD_LIMIT:
        R.fail('limit', f'prompt {len(prompt)} characters > {HARD_LIMIT} hard limit')
    if lim and len(prompt) >= lim:
        R.fail('limit', f'{kind} prompt {len(prompt)} characters; keep it under {lim}')
    low = prompt.lower()
    br = brand_hits(prompt)
    if br:
        R.fail('brand', f'brand wording {br}: never name a camera brand or product (a match beside a camera word is the brand reading; reword the phrase)')
    if kind in ('place', 'shot') and rows['no-text'].lower().rstrip('.') not in low:
        R.fail('lines', 'the no-text line (references/prompts.json no-text) is missing')
    if (kind == 'place' or (kind == 'shot' and moving)) and rows['own-view'].lower().rstrip('.') not in low:
        R.fail('lines', 'the own-view line (references/prompts.json own-view) is missing')
    if kind in ('place', 'shot') and rows['no-device'].lower() not in low:
        R.fail('lines', 'the no-device wording (references/prompts.json no-device) is missing from the count')
    if kind == 'shot':
        if not moving and 'reference 1' not in low:
            R.fail('lines', 'the keep-items sentence ("Keep the camera and the view of reference 1 exactly: ...") is missing')
        if night and not moving and 'infrared' not in low:
            R.fail('lines', 'a fixed-camera night shot needs the night-fixed insert (references/prompts.json night-fixed)')
        if night and moving and 'dark' not in low:
            R.fail('lines', 'a moving-camera night shot needs the night-moving insert (references/prompts.json night-moving)')
    if kind in ('seedance', 'kling', 'minimax'):
        if 'toward the camera' in low or 'towards the camera' in low:
            R.fail('toward-camera', '"toward the camera": end the subject at a named spot')
        if night:
            bad = [w for w in COLOR_WORDS if re.search(rf'\b{w}\b', low)]
            if bad:
                R.fail('night-colour', f'night clip names colours {bad}')
        steps = [(float(x), float(y)) for x, y in STEP.findall(low)]
        if len(steps) < 2:
            R.fail('clip-steps', 'a clip prompt needs timed steps ("0.0-1.2s: ... 1.2-5s: ...")')
        else:
            if steps[0][0] != 0:
                R.fail('clip-steps', f'the first timed step starts at {steps[0][0]}, not 0.0')
            if not 1.0 <= steps[0][1] <= 1.5:
                R.fail('clip-steps', f'[a] is {steps[0][1]} s; set it between 1.0 and 1.5 s (the model starts each step late)')
            if duration is not None and abs(steps[-1][1] - float(duration)) > 0.01:
                R.fail('clip-steps', f'the last timed step ends at {steps[-1][1]} s, not the clip length {float(duration):g} s')
            if duration is not None and float(duration) <= 5 and len(steps) > 2:
                R.fail('clip-steps', f'{len(steps)} timed steps on a {float(duration):g} s clip; only a clip over 5 s gets a third')
        has_sound = re.search(r'\bsound:', low) is not None
        if kind == 'seedance':
            if not has_sound:
                R.fail('sound', 'a Seedance clip needs its Sound part')
            elif re.search(r'\bsound:[^.]*\b(no sound|silence|silent)\b', low):
                R.fail('sound', 'the Sound part asks for silence; give the place sound instead')
            if has_sound and 'no music' not in low:
                R.fail('sound', 'the Sound part must close with the no-music sentence ("No music, singing, voices or narration.")')
        elif has_sound:
            R.fail('sound', f'{kind}: leave the Sound part out on any route but Seedance')
    return R.fails


def cmd_params(a):
    kind = a.kind
    prompt = None
    if a.prompt_file:
        with open(a.prompt_file, encoding='utf-8') as f:
            prompt = f.read().strip()
    p = {}
    if kind == 'tts':
        with open(a.text, encoding='utf-8') as f:
            text = f.read().rstrip('\n')
        if not a.voice:
            die('tts needs --voice: an omitted voice silently becomes a preset (always send it)')
        p = {'text': text, 'voice': a.voice, 'stability': 0.5, 'similarity_boost': 0.75, 'style': 0,
             'speed': 1, 'apply_text_normalization': 'on'}
        if a.language:
            p['language_code'] = a.language
    elif kind == 'stt':
        p = {'diarize': False, 'tag_audio_events': False}
        if a.language:
            p['language_code'] = a.language
        if a.keyterm:
            p['keyterms'] = a.keyterm
    elif kind in ('place', 'subject', 'shot'):
        p = {'prompt': prompt, 'aspect_ratio': a.aspect, 'resolution': '1K', 'num_images': 1}
    elif kind == 'seedance':
        lo, hi = RENDER_RANGE['seedance']
        p = {'prompt': prompt, 'aspect_ratio': a.aspect, 'resolution': a.resolution or '480p',
             'duration': str(int(a.duration)), 'generate_audio': True}
        if a.model and 'seedance-2.5' in a.model:
            # facts schema-seedance25: the i2v aspect follows the source picture (aspect_ratio is const 'auto', so it is
            # not sent); duration "4".."30". Read ai-gen info for any other default-on field and add it with --set.
            del p['aspect_ratio']
            RENDER_RANGE['seedance'] = (4, 30)
    elif kind == 'kling':
        lo, hi = RENDER_RANGE['kling']
        p = {'prompt': prompt, 'duration': str(int(a.duration)), 'generate_audio': False}
    elif kind == 'minimax':
        lo, hi = RENDER_RANGE['minimax']
        p = {'prompt': prompt, 'duration': int(a.duration), 'resolution': a.resolution or '480P',
             'prompt_expansion_mode': 'disabled'}
    elif kind == 'music':
        p = {'prompt': prompt, 'music_length_ms': int(round(float(a.duration) * 1000)), 'force_instrumental': True}
    else:
        die(f'unknown kind {kind}')
    # defaults-on fields the model would otherwise fill in (HR4): pinned here, or set with --set k=v
    if kind == 'kling':
        p.setdefault('negative_prompt', 'blur, distort, and low quality')  # facts schema-kling-v3-negative: default-on, pinned
    if kind in ('place', 'subject'):
        p.setdefault('thinking_level', 'minimal')  # facts schema-nb2; nano-banana-pro/edit: read ai-gen info, add with --set
    for kv in a.set or []:
        if '=' not in kv:
            die(f'--set needs key=value, got {kv!r}')
        k, v = kv.split('=', 1)
        try:
            v = json.loads(v)
        except ValueError:
            pass
        p[k] = v
    R = Rules(a.allow)
    if kind in RENDER_RANGE:
        lo, hi = RENDER_RANGE[kind]
        if a.duration is None or not lo <= int(a.duration) <= hi:
            R.fail('duration', f'{kind} duration {a.duration}: a whole number of seconds {lo}-{hi}')
    if kind not in ('tts', 'stt') and not prompt:
        R.fail('prompt', 'no prompt (--prompt-file)')
    if prompt and kind != 'music':
        check_prompt(kind, prompt, night=a.night, moving=a.moving, duration=a.duration, R=R)
    fails = R.fails
    if fails:
        report({'ok': False, 'kind': kind, 'fails': fails}, 1)
    write_json(a.out, p)
    declared = {}
    if kind in ('seedance', 'kling', 'minimax'):
        declared = {'duration_s': int(a.duration), 'audio': kind == 'seedance'}
        if kind == 'seedance':
            declared['aspect'] = a.aspect
    elif kind in ('place', 'subject', 'shot'):
        declared = {'aspect': a.aspect}
    report({'ok': True, 'kind': kind, 'model': a.model if (a.model and kind in ('shot', 'seedance')) else MODELS[kind],
            'out': a.out, 'prompt_chars': len(prompt or ''), 'declared': declared, 'allowed': R.allowed,
            'notes': R.notes}, 0)


# ---------------------------------------------------------------- timing
def scribe_words(path):
    d = read_json(path)
    cands = [d.get('words'), (d.get('raw') or {}).get('words'), ((d.get('raw') or {}).get('data') or {}).get('words')]
    words = next((w for w in cands if isinstance(w, list) and w), None)
    if not words:
        die(f'{path}: no words[] in the transcription (a text-only or failed answer is not an alignment; this is not a narration problem, so do not spend the narration redo)', 2)
    out = []
    for w in words:
        if w.get('type', 'word') != 'word':
            continue
        t = str(w.get('text', '')).strip()
        if not re.search(r'[A-Za-z0-9]', t):
            continue
        out.append({'text': t, 'start': float(w['start']), 'end': float(w['end'])})
    return out, d.get('text') or (d.get('raw') or {}).get('text', '')


def cmd_timing(a):
    with open(a.text, encoding='utf-8') as f:
        text = f.read().rstrip('\n')
    sents = sentences_of(text)
    nar = []  # narration words with sentence index and display text
    nn = []   # the same words as spoken tokens, each pointing at its narration word (a number is several tokens)
    for si, s_ in enumerate(sents):
        for m in re.finditer(r"\S+", s_):
            disp = m.group(0)
            core = re.findall(r"[A-Za-z0-9']+", disp)
            if not core:
                continue
            key = norm(''.join(core))
            nar.append({'display': disp, 'norm': key, 'sentence': si})
            if key.isdigit():
                for part in num_words(int(key)):
                    nn.append((part, len(nar) - 1))
            else:
                nn.append((key, len(nar) - 1))
    heard, transcript = scribe_words(a.words)
    hn = []
    for i, w in enumerate(heard):
        t = norm(''.join(re.findall(r"[A-Za-z0-9']+", w['text'])))
        if t.isdigit():
            for part in num_words(int(t)):
                hn.append((part, i))
        else:
            hn.append((t, i))
    sm = difflib.SequenceMatcher(a=[n[0] for n in nn], b=[h[0] for h in hn], autojunk=False)
    span = {}  # narration word -> [first heard word, last heard word]
    mism = []
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == 'equal':
            for k in range(i2 - i1):
                ni, hi_ = nn[i1 + k][1], hn[j1 + k][1]
                if ni in span:
                    span[ni][1] = hi_
                else:
                    span[ni] = [hi_, hi_]
        else:
            shown = []
            for ni in [nn[k][1] for k in range(i1, i2)]:
                if nar[ni]['display'] not in shown:
                    shown.append(nar[ni]['display'])
            mism.append({'op': op, 'narration': ' '.join(shown),
                         'heard': ' '.join(dict.fromkeys(heard[hn[j][1]]['text'] for j in range(j1, j2)))})
    match = [span[k][0] if k in span else None for k in range(len(nar))]
    # times: matched words take Scribe times; the rest share the gap around them
    times = [None] * len(nar)
    for i, m in enumerate(match):
        if m is not None:
            times[i] = (heard[m]['start'], heard[span[i][1]]['end'])
    i = 0
    while i < len(nar):
        if times[i] is not None:
            i += 1
            continue
        j = i
        while j < len(nar) and times[j] is None:
            j += 1
        left = times[i - 1][1] if i > 0 else 0.0
        right = times[j][0] if j < len(nar) else (heard[-1]['end'] if heard else left)
        step = max(right - left, 0.0) / (j - i)
        for k in range(i, j):
            times[k] = (left + step * (k - i), left + step * (k - i + 1))
        i = j
    dur = probe(a.audio)['duration']
    ends, starts = [], []
    for si in range(len(sents)):
        idx = [k for k, n in enumerate(nar) if n['sentence'] == si]
        starts.append(round(times[idx[0]][0], 3))
        ends.append(round(times[idx[-1]][1], 3))
    speech_end = ends[-1] if ends else 0.0
    n_words = len(nar)
    wps = round(n_words / speech_end, 3) if speech_end else None
    off = round(abs(dur - a.target) / a.target * 100, 1)
    fails = []
    if len(ends) != len(sents):
        fails.append('sentence-end count differs from the narration')
    if off > 15:
        fails.append(f'reading is {dur:.2f} s against {a.target} s ({off}% off; over 15%: cut or add a sentence and record once more)')
    if mism:
        fails.append(f'{len(mism)} place(s) where the take differs from narration.txt: listen for a misread word or number; one re-record')
    out = {'durationSeconds': round(dur, 3), 'speechEndSeconds': speech_end, 'sentenceEnds': ends,
           'sentenceStarts': starts, 'sentences': [{'text': s, 'words': len(tokens(s))} for s in sents],
           'words': [{'text': n['display'], 'start': round(times[k][0], 3), 'end': round(times[k][1], 3),
                      'sentence': n['sentence'], 'matched': match[k] is not None} for k, n in enumerate(nar)],
           'words_per_second': wps, 'target': a.target, 'off_target_pct': off, 'mismatches': mism,
           'transcript': transcript}
    write_json(a.out, out)
    report({'ok': not fails, 'out': a.out, 'durationSeconds': out['durationSeconds'], 'speechEndSeconds': speech_end,
            'sentences': len(sents), 'words_per_second': wps, 'off_target_pct': off, 'mismatches': mism,
            'fails': fails}, 1 if fails else 0)


# ---------------------------------------------------------------- fit
def fit_windows(ends, dur, planned, lo=5.0, hi=10.0):
    """Choose n-1 cuts among sentence ends (excluding the last sentence) so each shot is lo..hi s,
    the last shot ends at dur, and the cuts sit as close as possible to the planned ends."""
    n = len(planned)
    if n == 1:
        return [] if lo - 1e-6 <= dur <= hi + 1e-6 else None
    cand = ends[:-1]
    target = []
    acc = 0.0
    for p in planned[:-1]:
        acc += p
        target.append(acc)
    eps = 1e-6
    INF = float('inf')
    # best[i][j]: min cost with cut i at candidate j
    best = [[INF] * len(cand) for _ in range(n - 1)]
    prev = [[-1] * len(cand) for _ in range(n - 1)]
    for j, e in enumerate(cand):
        if lo - eps <= e <= hi + eps:
            best[0][j] = abs(e - target[0]) if n > 1 else INF
    for i in range(1, n - 1):
        for j, e in enumerate(cand):
            for k in range(j):
                if best[i - 1][k] < INF and lo - eps <= e - cand[k] <= hi + eps:
                    c = best[i - 1][k] + abs(e - target[i])
                    if c < best[i][j]:
                        best[i][j], prev[i][j] = c, k
    last = [(best[n - 2][j], j) for j, e in enumerate(cand) if best[n - 2][j] < INF and lo - eps <= dur - e <= hi + eps]
    if not last:
        return None
    _, j = min(last)
    cuts = [j]
    for i in range(n - 2, 0, -1):
        j = prev[i][j]
        cuts.append(j)
    return list(reversed(cuts))


def cmd_fit(a):
    tm = read_json(a.timing)
    sl = read_json(a.shots)
    shots = sl.get('shots', [])
    dur = float(tm['durationSeconds'])
    ends = tm.get('sentenceEnds') or []
    route_default = sl.get('clip_route', 'seedance')
    notes, fails = [], []
    if a.drop:
        # a dropped shot's sentences go to the neighbours: its window is split at the midpoint sentence end
        if not (sl.get('variant') == 'home-base' or a.per_sentence):
            die('--drop is for the home-base variant (one shot per sentence)', 2)
        dn = set(a.drop)
        keep = [sh for sh in shots if sh.get('n') not in dn]
        if len(keep) == len(shots) or not keep:
            die(f'--drop {sorted(dn)}: no such shot, or every shot dropped', 2)
        ends_ = ends
        owner = []  # sentence index -> kept shot position
        for si in range(len(ends_)):
            sh_i = shots[si]
            if sh_i.get('n') not in dn:
                owner.append(keep.index(sh_i))
            else:
                prev_ = next((k for k in range(si - 1, -1, -1) if shots[k].get('n') not in dn), None)
                nxt_ = next((k for k in range(si + 1, len(shots)) if shots[k].get('n') not in dn), None)
                if prev_ is None:
                    owner.append(keep.index(shots[nxt_]))
                elif nxt_ is None:
                    owner.append(keep.index(shots[prev_]))
                else:  # the sentence goes to the neighbour whose own sentence is shorter, so lengths even out
                    lp = ends_[prev_] - (ends_[prev_ - 1] if prev_ else 0.0)
                    ln = ends_[nxt_] - ends_[nxt_ - 1]
                    owner.append(keep.index(shots[prev_]) if lp <= ln else keep.index(shots[nxt_]))
        shots = keep
        sl['shots'] = shots
        windows = []
        for pos in range(len(shots)):
            idx = [si for si, o in enumerate(owner) if o == pos]
            st = 0.0 if idx[0] == 0 else ends_[idx[0] - 1]
            en = dur if idx[-1] == len(ends_) - 1 else ends_[idx[-1]]
            windows.append((st, en, [i_ + 1 for i_ in idx]))
        notes.append(f'dropped shot(s) {sorted(dn)}: the neighbours take their sentences; every neighbour whose clip no longer covers its new window is filmed again (clipcheck says which)')
    elif a.per_sentence or sl.get('variant') == 'home-base':
        if len(shots) != len(ends):
            fails.append(f'home-base variant: {len(shots)} shots for {len(ends)} sentences; one shot per sentence')
            report({'ok': False, 'fails': fails}, 1)
        bounds = [0.0] + ends[:-1] + [dur]
        windows = [(bounds[i], bounds[i + 1], [i + 1]) for i in range(len(shots))]
    else:
        if not ends:
            notes.append('no word timings: the length is split by word counts')
            counts_ = [max(1, sh.get('words', 1)) for sh in shots]
            tot = sum(counts_)
            acc, windows = 0.0, []
            for i, w in enumerate(counts_):
                s = acc
                acc = dur if i == len(counts_) - 1 else acc + dur * w / tot
                windows.append((s, acc, sh_sent(shots[i])))
        else:
            planned = []
            for sh in shots:
                w = sh.get('words') or 15
                planned.append(min(10, max(5, math.ceil(w / 3))))
            cuts = fit_windows(ends, dur, planned)
            if cuts is None:
                fails.append(f'no set of sentence-end cuts gives {len(shots)} shots of 5-10 s over {dur:.2f} s: re-plan the shot count or move a sentence')
                report({'ok': False, 'durationSeconds': dur, 'sentenceEnds': ends, 'planned': planned, 'fails': fails}, 1)
            edges = [0.0] + [ends[j] for j in cuts] + [dur]
            sidx = [0] + [j + 1 for j in cuts] + [len(ends)]
            windows = [(edges[i], edges[i + 1], list(range(sidx[i] + 1, sidx[i + 1] + 1))) for i in range(len(shots))]
    out = []
    for sh, (s, e, sents) in zip(shots, windows):
        route = sh.get('route', route_default)
        lo, hi = RENDER_RANGE.get(route, (4, 15))
        length = round(e - s, 3)
        margin = a.render_margin if route == 'seedance' else 0.0
        render = min(hi, max(lo, math.ceil(length - 1e-6 + margin)))
        if length > hi:
            fails.append(f'shot {sh.get("n")}: {length} s is longer than the {route} route renders ({hi} s)')
        planned_sents = sh.get('sentences')
        if planned_sents and planned_sents != sents:
            notes.append(f'shot {sh.get("n")}: planned sentences {planned_sents}, fitted {sents}; rewrite its prompts to show only those lines')
        sh.update({'window_start': round(s, 3), 'window_end': round(e, 3), 'shot_length': length,
                   'render_length': render, 'sentences': sents})
        out.append({'n': sh.get('n'), 'window': [round(s, 3), round(e, 3)], 'shot_length': length,
                    'render_length': render, 'sentences': sents})
        if sh.get('clip') and a.drop:
            sh['clip_stale'] = True  # window changed: recheck with clipcheck against the new shot_length
    total = round(sum(o['shot_length'] for o in out), 3)
    if abs(total - dur) > 0.01:
        fails.append(f'shot lengths add up to {total}, not {dur}')
    if a.write and not fails:
        write_json(a.shots, sl)
    report({'ok': not fails, 'durationSeconds': dur, 'total': total, 'shots': out, 'notes': notes, 'fails': fails,
            'written': bool(a.write and not fails)}, 1 if fails else 0)


def sh_sent(sh):
    return sh.get('sentences') or []


# ---------------------------------------------------------------- clipcheck
def cmd_clipcheck(a):
    need('ffmpeg')
    pr = probe(a.clip)
    os.makedirs(a.out_dir, exist_ok=True)
    stem = os.path.splitext(os.path.basename(a.clip))[0]
    fails, notes = [], []
    if pr['video_streams'] != 1:
        fails.append(f'{pr["video_streams"]} video streams')
    shortfall = round(max(0.0, a.shot_length - pr['duration']), 3)
    ratio = round(pr['duration'] / a.render_length, 4) if a.render_length else None
    if shortfall > a.tolerance:
        fails.append(f'clip is {pr["duration"]:.2f} s, shorter than its {a.shot_length:.2f} s shot by {shortfall:.2f} s (more than the {a.tolerance:g} s the stitch can hold on the last frame inside the shot: a render failure for the redo round)')
    elif shortfall > 0.05:
        notes.append(f'clip is {shortfall:.2f} s short of its shot; the stitch holds its last frame for that long inside the shot')
    if a.audio == 'yes' and pr['audio_streams'] < 1:
        fails.append('no audio stream on a Seedance clip')
    sheet = os.path.join(a.out_dir, f'{stem}-sheet.png')
    # 12 frames spread over the whole clip, so a late double is as visible as an early one
    run(['ffmpeg', '-v', 'error', '-y', '-i', a.clip, '-vf', f'fps={12 / max(pr["duration"], 0.5):.4f},scale=270:-1,tile=4x3',
         '-frames:v', '1', sheet])
    frames = []
    for label, t in [('start', 0.3), ('mid', pr['duration'] / 2), ('end', max(0.0, pr['duration'] - 0.3))]:
        fp = os.path.join(a.out_dir, f'{stem}-{label}.png')
        run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{t:.3f}', '-i', a.clip, '-frames:v', '1', fp])
        frames.append(fp)
    first = os.path.join(a.out_dir, f'{stem}-first.png')
    run(['ffmpeg', '-v', 'error', '-y', '-i', a.clip, '-frames:v', '1', first])
    fps = run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate', '-of',
               'csv=p=0', a.clip]).stdout.strip() or '24'
    frozen = os.path.join(a.out_dir, f'{stem}-frozen.mp4')
    run(['ffmpeg', '-v', 'error', '-y', '-loop', '1', '-i', first, '-t', f'{pr["duration"]:.3f}', '-r', fps,
         '-pix_fmt', 'yuv420p', '-c:v', 'libx264', frozen])
    report({'ok': not fails, 'clip': a.clip, 'duration': round(pr['duration'], 3), 'audio_streams': pr['audio_streams'],
            'size': pr['size'], 'shortfall_s': shortfall, 'render_ratio': ratio, 'sheet': sheet, 'frames': frames,
            'frozen_control': frozen, 'fails': fails, 'notes': notes}, 1 if fails else 0)


# ---------------------------------------------------------------- sound
def is_calm(sh):
    if isinstance(sh.get('calm'), bool):
        return sh['calm']
    low = (sh.get('clip_prompt') or '').lower()
    return not any(re.search(rf'\b{re.escape(w)}', low) for w in NOT_CALM)


def choose_sound(sl, loud=0):
    shots = sl['shots']
    route_default = sl.get('clip_route', 'seedance')
    routes = [sh.get('route', route_default) for sh in shots]
    plan = []
    if loud >= 3 or all(r != 'seedance' for r in routes):
        why = 'no clip sound asked for' if loud >= 3 else 'no clip was filmed on Seedance: narration only'
        return [{'n': sh.get('n'), 'source': None, 'gain_db': 0, 'why': why} for sh in shots]
    clipdur = [sh.get('clip_duration') or (probe(sh['clip'])['duration'] if sh.get('clip') else 0) for sh in shots]
    calm = [is_calm(sh) and routes[i] == 'seedance' for i, sh in enumerate(shots)]
    if loud == 2:
        last = len(shots) - 1
        src = last if routes[last] == 'seedance' else next((i for i in range(last, -1, -1) if routes[i] == 'seedance'), None)
        return [{'n': sh.get('n'), 'source': src, 'gain_db': 0, 'loop': True, 'why': 'every shot on the last shot\'s sound'} for sh in shots]
    for i, sh in enumerate(shots):
        L = sh.get('shot_length', 0)
        if calm[i]:
            plan.append({'n': sh.get('n'), 'source': i, 'gain_db': 0, 'why': 'calm: its own sound'})
            continue
        tiers = [
            lambda j: shots[j].get('camera') == sh.get('camera') and shots[j].get('light') == sh.get('light'),
            lambda j: shots[j].get('camera') == sh.get('camera'),
            lambda j: True,
        ]
        chosen = None
        for t, test in enumerate(tiers):
            pool = [j for j in range(len(shots)) if j != i and calm[j] and clipdur[j] + 0.01 >= L and test(j)]
            if pool:
                chosen = min(pool, key=lambda j: (abs(j - i), j))
                why = ['nearest calm clip, same place and light', 'nearest calm clip, same place', 'nearest calm clip'][t]
                break
        if chosen is not None:
            plan.append({'n': sh.get('n'), 'source': chosen, 'gain_db': 0, 'why': why})
        elif loud == 1:
            pool = [j for j in range(len(shots)) if calm[j]]
            if pool:
                j = max(pool, key=lambda j: clipdur[j])
                plan.append({'n': sh.get('n'), 'source': j, 'gain_db': 0, 'loop': True, 'why': 'too-loud step 1: the longest calm clip, looped'})
            else:
                plan.append({'n': sh.get('n'), 'source': None, 'gain_db': 0, 'why': 'too-loud step 1: no calm clip; no clip sound'})
        elif routes[i] == 'seedance':
            plan.append({'n': sh.get('n'), 'source': i, 'gain_db': -10, 'why': 'no calm clip long enough: its own sound, lowered 10 dB'})
        else:
            plan.append({'n': sh.get('n'), 'source': None, 'gain_db': 0, 'why': f'{routes[i]} clip and no calm clip long enough: no clip sound under this shot'})
    return plan


def cmd_sound(a):
    sl = read_json(a.shots)
    plan = choose_sound(sl, a.loud)
    report({'ok': True, 'loud': a.loud, 'plan': plan}, 0)


# ---------------------------------------------------------------- stitch
def ebur_integrated(path):
    p = run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-filter_complex', 'ebur128', '-f', 'null', '-'], check=False)
    m = re.findall(r'I:\s+(-?[\d.]+|-inf) LUFS', p.stderr)
    if not m:
        return None
    v = m[-1]
    return None if v == '-inf' else float(v)


def silences(path, floor_db=-60, min_s=1.0):
    p = run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', f'silencedetect=noise={floor_db}dB:d={min_s}', '-f', 'null', '-'], check=False)
    st = [float(x) for x in re.findall(r'silence_start: (-?[\d.]+)', p.stderr)]
    en = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', p.stderr)]
    return [[round(s, 2), round(en[i], 2) if i < len(en) else None] for i, s in enumerate(st)]


def esc_path(p):
    # ffmpeg filter arguments are parsed twice; a plain path needs no quoting at either level
    if not re.fullmatch(r'[A-Za-z0-9_./+-]+', p):
        die(f'path {p!r} has characters an ffmpeg filter argument would need escaped; use a plain path (letters, digits, _ . / + -)')
    return p


def cmd_stitch(a):
    need('ffmpeg')
    sl = read_json(a.shots)
    tm = read_json(a.timing)
    dur = float(tm['durationSeconds'])
    shots = sl['shots']
    W, H = (int(x) for x in (a.size or ('1280x720' if sl.get('aspect') == '16:9' else '720x1280')).split('x'))
    fails, notes = [], []
    if any(not sh.get('clip') for sh in shots):
        fails.append(f'shots {[sh.get("n") for sh in shots if not sh.get("clip")]} have no clip: redo a missing shot first, never stitch without it')
        report({'ok': False, 'fails': fails}, 1)
    for sh in shots:
        pr = probe(sh['clip'])
        sh['clip_duration'] = pr['duration']
        sh['_has_audio'] = pr['audio_streams'] > 0
    # every shot keeps its window, so every cut stays on its sentence end; a clip shorter than its window holds
    # its own last frame inside that shot (never shifts a later cut)
    wins = [float(sh['shot_length']) for sh in shots]
    if abs(sum(wins) - dur) > 0.05:
        fails.append(f'shot windows add up to {sum(wins):.3f} s, not the narration {dur:.3f} s: run fit --write again')
        report({'ok': False, 'fails': fails}, 1)
    holds = [round(max(0.0, w - sh['clip_duration']), 3) for w, sh in zip(wins, shots)]
    hold = round(sum(holds), 3)
    if hold > 5.0:
        fails.append(f'{hold:.2f} s of last-frame hold across the shots (more than 5 s): redo the shortest clips or tell the customer and wait')
        report({'ok': False, 'fails': fails, 'holds': holds, 'hold': hold}, 1)
    for i, h in enumerate(holds):
        if h > 0.05:
            notes.append(f'shot {shots[i].get("n")}: clip is {h:.2f} s short of its window; its last frame is held inside the shot')
    cuts, acc = [], 0.0
    for w in wins[:-1]:
        acc += w
        cuts.append(round(acc, 3))
    ends_ = tm.get('sentenceEnds') or []
    cut_report = [{'cut': c, 'nearest_sentence_end': min(ends_, key=lambda e: abs(e - c)) if ends_ else None} for c in cuts]
    for i, sh in enumerate(shots):
        sh['_play'] = wins[i]
        sh['_clip_play'] = min(wins[i], sh['clip_duration'])
        sh['_hold'] = holds[i]
        sh['shot_length'] = round(wins[i], 3)
    plan = choose_sound(sl, a.loud)
    inputs = []
    def add_input(p):
        if p not in inputs:
            inputs.append(p)
        return inputs.index(p)
    for sh in shots:
        add_input(sh['clip'])
    nar_idx = add_input(a.narration)
    fc = []
    vlabels, alabels = [], []
    for i, sh in enumerate(shots):
        vi = inputs.index(sh['clip'])
        L = sh['_play']
        hold_f = f',tpad=stop_mode=clone:stop_duration={sh["_hold"]:.3f}' if sh['_hold'] > 0.01 else ''
        fc.append(f'[{vi}:v]trim=0:{sh["_clip_play"]:.3f},setpts=PTS-STARTPTS,scale={W}:{H}:force_original_aspect_ratio=increase,'
                  f'crop={W}:{H},setsar=1,fps={a.fps}{hold_f},format=yuv420p[v{i}]')
        vlabels.append(f'[v{i}]')
        sp = plan[i]
        src = sp['source']
        if src is not None and shots[src]['_has_audio']:
            ai = inputs.index(shots[src]['clip'])
            loop = 'aloop=loop=-1:size=2147483647,' if sp.get('loop') else ''
            gain = f',volume={sp["gain_db"]}dB' if sp.get('gain_db') else ''
            fc.append(f'[{ai}:a]{loop}atrim=0:{L:.3f},asetpts=PTS-STARTPTS,aresample=48000,'
                      f'aformat=sample_fmts=fltp:channel_layouts=stereo{gain},apad=whole_dur={L:.3f}[a{i}]')
            if not sp.get('loop') and shots[src]['clip_duration'] + 0.01 < L:
                notes.append(f'shot {sh.get("n")}: borrowed sound is shorter than the shot; silence under the rest')
        else:
            if src is not None:
                notes.append(f'shot {sh.get("n")}: chosen clip has no audio stream; silence under it')
            fc.append(f'anullsrc=r=48000:cl=stereo,atrim=0:{L:.3f},aformat=sample_fmts=fltp:channel_layouts=stereo[a{i}]')
        alabels.append(f'[a{i}]')
    n = len(shots)
    fc.append(''.join(v + al for v, al in zip(vlabels, alabels)) + f'concat=n={n}:v=1:a=1[vc][bedc]')
    vlast = '[vc]'
    # timestamp
    if not a.no_timestamp:
        if not re.search(r'\sdrawtext\s', run(['ffmpeg', '-hide_banner', '-filters']).stdout):
            die('this ffmpeg has no drawtext filter: the camera timestamp cannot be drawn here (rerun with --no-timestamp and say so in the hand-off)', 2)
        font = a.timestamp_font
        if not font and shutil.which('fc-match'):
            font = run(['fc-match', '-f', '%{file}', 'monospace'], check=False).stdout.strip()
        cams = {c['id']: c for c in sl.get('cameras', [])}
        readouts = []
        t0 = 0.0
        for sh in shots:
            r = (cams.get(sh.get('camera')) or {}).get('readout') or sl.get('readout')
            readouts.append((r, t0, t0 + sh['_play']))
            t0 += sh['_play']
        if readouts:
            readouts[-1] = (readouts[-1][0], readouts[-1][1], dur + 1)
        if not any(r for r, _, _ in readouts):
            fails.append('no camera readout in the shot list (cameras[].readout); pass --no-timestamp only when the customer refused it')
            report({'ok': False, 'fails': fails}, 1)
        os.makedirs(a.work, exist_ok=True)
        merged = []
        for r, s, e in readouts:
            if merged and merged[-1][0] == r:
                merged[-1][2] = e
            else:
                merged.append([r, s, e])
        chain = vlast
        for k, (r, s, e) in enumerate(merged):
            tf = os.path.join(a.work, f'readout-{k + 1}.txt')
            with open(tf, 'w', encoding='utf-8') as f:
                f.write(r.upper())
            size = max(14, round(H * 0.026))
            fontpart = f"fontfile={esc_path(font)}:" if font else ''
            enable = '' if len(merged) == 1 else f":enable='between(t,{s:.3f},{e:.3f})'"
            fc.append(f"{chain}drawtext={fontpart}textfile={esc_path(tf)}:x=round(w*0.05):y=round(h*0.035):"
                      f"fontsize={size}:fontcolor=white@0.92:shadowcolor=black@0.6:shadowx=1:shadowy=1{enable}[vt{k}]")
            chain = f'[vt{k}]'
        vlast = chain
    fc.append(f'[bedc]apad=whole_dur={dur:.3f},atrim=0:{dur:.3f},asplit=2[bed][bedstem]')
    fc.append(f'[{nar_idx}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,apad=whole_dur={dur:.3f},atrim=0:{dur:.3f}[nar]')
    fc.append('[bed][nar]amix=inputs=2:duration=longest:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[aout]')
    bed_out = a.bed_out or os.path.join(a.work, 'bed.wav')
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    os.makedirs(os.path.dirname(os.path.abspath(bed_out)), exist_ok=True)
    cmd = ['ffmpeg', '-v', 'error', '-y']
    for p in inputs:
        cmd += ['-i', p]
    cmd += ['-filter_complex', ';'.join(fc), '-map', vlast, '-map', '[aout]', '-t', f'{dur:.3f}',
            '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', str(a.fps),
            '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', a.out,
            '-map', '[bedstem]', '-t', f'{dur:.3f}', '-c:a', 'pcm_s16le', bed_out]
    with open(os.path.join(a.work, 'stitch.cmd.json'), 'w', encoding='utf-8') as f:
        json.dump(cmd, f, indent=1)
    run(cmd)
    pr = probe(a.out)
    if abs(pr['duration'] - dur) > 0.1:
        fails.append(f'stitched {pr["duration"]:.3f} s against narration {dur:.3f} s (more than 0.1 s apart)')
    if pr['audio_streams'] != 1:
        fails.append(f'{pr["audio_streams"]} audio streams; exactly one')
    nar_i = ebur_integrated(a.narration)
    bed_i = ebur_integrated(bed_out)
    sep = None if (nar_i is None or bed_i is None) else round(nar_i - bed_i, 1)
    silent = [] if a.loud >= 3 else silences(bed_out)
    any_sound = any(p['source'] is not None for p in plan)
    if any_sound and sep is not None and sep < 9:
        fails.append(f'narration is only {sep} LU over the clip-sound bed (at least 9): background too loud; restitch one step down the too-loud ladder (--loud {a.loud + 1})')
    if any_sound and silent:
        notes.append(f'clip-sound bed is silent at {silent} (seconds): a short borrowed sound or a clip without audio')
    report({'ok': not fails, 'out': a.out, 'bed': bed_out, 'duration': round(pr['duration'], 3),
            'narration_duration': dur, 'audio_streams': pr['audio_streams'], 'size': pr['size'], 'hold_s': hold, 'holds': holds,
            'cuts': cut_report,
            'narration_lufs': nar_i, 'bed_lufs': bed_i, 'separation_lu': sep, 'bed_silences': silent,
            'sound_plan': plan, 'timestamp': not a.no_timestamp, 'fails': fails, 'notes': notes}, 1 if fails else 0)


# ---------------------------------------------------------------- captions
def ass_time(t):
    t = round(max(0.0, t), 2)  # round first so 59.999 reads 1:00.00, never 0:00:60.00
    h = int(t // 3600)
    m = int(t % 3600 // 60)
    s = t % 60
    return f'{h}:{m:02d}:{s:05.2f}'


def cmd_captions(a):
    tm = read_json(a.timing)
    words = tm.get('words') or []
    if not words:
        die(f'{a.timing}: no aligned words; run footage.py timing first', 1)
    groups, cur = [], []
    for i, w in enumerate(words):
        cur.append(w)
        nxt = words[i + 1] if i + 1 < len(words) else None
        end_sent = nxt is None or nxt['sentence'] != w['sentence']
        pause = nxt is not None and nxt['start'] - w['end'] >= a.pause
        if end_sent or pause or len(cur) >= a.max_words:
            groups.append(cur)
            cur = []
    if cur:
        groups.append(cur)
    events = []
    for k, g in enumerate(groups):
        start = max(g[0]['start'], 0.1) if k == 0 else g[0]['start']  # never at 0
        nxt = groups[k + 1][0]['start'] if k + 1 < len(groups) else None
        end = g[-1]['end'] + a.tail
        if nxt is not None:
            end = min(end, nxt)
        end = max(end, start + 0.3)
        text = ' '.join(w['text'] for w in g).replace('{', '(').replace('}', ')')
        events.append((start, end, text))
    if a.size:
        W, H = (int(x) for x in a.size.split('x'))
    else:
        pr = probe(a.video)
        W, H = pr['size'] or (720, 1280)
    fs = round(H * a.font_frac)
    mv = round(H * a.margin)
    head = ('[Script Info]\nScriptType: v4.00+\nWrapStyle: 0\nScaledBorderAndShadow: yes\n'
            f'PlayResX: {W}\nPlayResY: {H}\n\n[V4+ Styles]\n'
            'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, '
            'Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, '
            'MarginR, MarginV, Encoding\n'
            f'Style: Lowkey,{a.font},{fs},&H00FFFFFF,&H00FFFFFF,&H64000000,&H8C000000,0,0,0,0,100,100,0,0,1,'
            f'{max(1, round(fs * 0.04))},{max(1, round(fs * 0.06))},2,{round(W * 0.06)},{round(W * 0.06)},{mv},1\n\n'
            '[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n')
    body = ''.join(f'Dialogue: 0,{ass_time(s)},{ass_time(e)},Lowkey,,0,0,0,,{t}\n' for s, e, t in events)
    os.makedirs(os.path.dirname(os.path.abspath(a.ass)), exist_ok=True)
    with open(a.ass, 'w', encoding='utf-8') as f:
        f.write(head + body)
    caption_words = sum(len(t.split()) for _, _, t in events)
    fails = []
    if caption_words != len(words):
        fails.append(f'{caption_words} caption words for {len(words)} narration words')
    if a.ass_only or fails:
        report({'ok': not fails, 'ass': a.ass, 'groups': len(events), 'caption_words': caption_words,
                'narration_words': len(words), 'first_start': round(events[0][0], 2), 'fails': fails}, 1 if fails else 0)
    need('ffmpeg')
    if not re.search(r'\sass\s', run(['ffmpeg', '-hide_banner', '-filters']).stdout):
        die('this ffmpeg has no ass filter (libass): captions cannot be burned here', 2)
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    run(['ffmpeg', '-v', 'error', '-y', '-i', a.video, '-vf', f"ass={esc_path(a.ass)}", '-c:v', 'libx264',
         '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', a.out])
    src, out = probe(a.video), probe(a.out)
    if abs(src['duration'] - out['duration']) > 0.1:
        fails.append(f'captioned file is {out["duration"]:.2f} s against {src["duration"]:.2f} s')
    if out['audio_streams'] != 1:
        fails.append(f'{out["audio_streams"]} audio streams after the burn')
    report({'ok': not fails, 'out': a.out, 'ass': a.ass, 'groups': len(events), 'caption_words': caption_words,
            'narration_words': len(words), 'duration': round(out['duration'], 3), 'fails': fails}, 1 if fails else 0)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest='cmd', required=True)
    sp.add_parser('preflight')
    p = sp.add_parser('narration'); p.add_argument('--text', required=True); p.add_argument('--length', type=int, default=35)
    p.add_argument('--allow-digits', action='store_true'); p.add_argument('--allow', action='append', default=[])
    p = sp.add_parser('plan'); p.add_argument('--shots', required=True); p.add_argument('--allow', action='append', default=[])
    p.add_argument('--no-timestamp', action='store_true')
    p = sp.add_parser('params'); p.add_argument('kind', choices=list(MODELS)); p.add_argument('--out', required=True)
    p.add_argument('--prompt-file'); p.add_argument('--text'); p.add_argument('--voice'); p.add_argument('--language')
    p.add_argument('--keyterm', action='append'); p.add_argument('--aspect', default='9:16'); p.add_argument('--resolution')
    p.add_argument('--duration', type=float); p.add_argument('--night', action='store_true'); p.add_argument('--moving', action='store_true')
    p.add_argument('--model'); p.add_argument('--allow', action='append', default=[]); p.add_argument('--set', action='append')
    p = sp.add_parser('timing'); p.add_argument('--text', required=True); p.add_argument('--words', required=True)
    p.add_argument('--audio', required=True); p.add_argument('--target', type=float, required=True); p.add_argument('--out', required=True)
    p = sp.add_parser('fit'); p.add_argument('--timing', required=True); p.add_argument('--shots', required=True)
    p.add_argument('--per-sentence', action='store_true'); p.add_argument('--write', action='store_true')
    p.add_argument('--drop', type=int, action='append'); p.add_argument('--render-margin', type=float, default=1.0)
    p = sp.add_parser('clipcheck'); p.add_argument('--clip', required=True); p.add_argument('--shot-length', type=float, required=True)
    p.add_argument('--out-dir', required=True); p.add_argument('--audio', choices=['yes', 'no'], default='yes')
    p.add_argument('--render-length', type=float); p.add_argument('--tolerance', type=float, default=0.5)
    p = sp.add_parser('sound'); p.add_argument('--shots', required=True); p.add_argument('--loud', type=int, default=0)
    p = sp.add_parser('stitch'); p.add_argument('--shots', required=True); p.add_argument('--timing', required=True)
    p.add_argument('--narration', required=True); p.add_argument('--out', required=True); p.add_argument('--bed-out')
    p.add_argument('--work', default='.'); p.add_argument('--no-timestamp', action='store_true'); p.add_argument('--loud', type=int, default=0)
    p.add_argument('--size'); p.add_argument('--fps', type=int, default=24); p.add_argument('--timestamp-font')
    p = sp.add_parser('captions'); p.add_argument('--timing', required=True); p.add_argument('--video', required=True)
    p.add_argument('--ass', required=True); p.add_argument('--out', default=''); p.add_argument('--ass-only', action='store_true')
    p.add_argument('--max-words', type=int, default=4); p.add_argument('--pause', type=float, default=0.15)
    p.add_argument('--tail', type=float, default=0.5); p.add_argument('--margin', type=float, default=0.25)
    p.add_argument('--font', default='Inter'); p.add_argument('--font-frac', type=float, default=0.030); p.add_argument('--size')
    a = ap.parse_args()
    {'preflight': cmd_preflight, 'narration': cmd_narration, 'plan': cmd_plan, 'params': cmd_params,
     'timing': cmd_timing, 'fit': cmd_fit, 'clipcheck': cmd_clipcheck, 'sound': cmd_sound, 'stitch': cmd_stitch,
     'captions': cmd_captions}[a.cmd](a)


if __name__ == '__main__':
    main()
