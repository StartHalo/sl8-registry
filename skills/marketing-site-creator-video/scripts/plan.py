#!/usr/bin/env python3
"""plan.py: clip plan, monologue checks and clip prompts for marketing-site-creator-video.

SL8-authored from the behaviour the capability assessment records for WF20-a1 steps 3 and 10-13
(no vendor file is copied). Pure Python, no network, no paid calls.

  plan.py clips --duration D [--out plan.json]
      Clip lengths: ceil(D/15) clips of 15 s, the remainder last; a last clip under 4 s borrows from
      the one before it (16 -> 12+4, 31 -> 15+12+4). D is a whole number of seconds, 4 or more.
  plan.py script --monologue m.json --plan plan.json --out-dir DIR
      Checks the monologue and writes DIR/script.txt, DIR/hook.txt and DIR/beats.json.
  plan.py prompt --k K --plan plan.json --monologue m.json --scene TEXT --ambience TEXT
                 --closer device|product|neutral [--uk-look] --out FILE
      Composes clip K's prompt from references/prompts.json.
  plan.py check --dir DIR --plan plan.json --monologue m.json [--product NAME ...]
      Pre-submit check of every DIR/clip_<K>.prompt.txt.
  plan.py params --k K --plan plan.json [--prompt-file FILE] --out FILE [--resolution 1080p] [--aspect 9:16]
      Clip K's request params with exact JSON types (duration as a string, audio pinned on), for both
      ai-gen estimate and ai-gen run. Without --prompt-file it writes a quote-only file (step 8 prices
      every clip before the prompts exist).

m.json: {"site": "Name as spelled", "hook": "...", "body": [{"section_label": "hero", "text": "..."}],
         "closer": "...", "clips": ["clip 1 words", "clip 2 words", ...]}
The clips, joined, must be exactly hook + body + closer.
Exit 0 ok; 1 a check failed (every failure is printed); 2 usage.
"""
import argparse, json, math, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PROMPTS = os.path.join(HERE, '..', 'references', 'prompts.json')

FILLER_OPENERS = ['ok', 'okay', 'so', 'wait', 'um', 'well', 'like', 'honestly', 'no joke']
POINTING_OPENERS = ['these are', 'this is', "here's", 'here is', 'meet', 'i found', 'i want to show',
                    'let me show', 'say hello to']
BANNED = ['literally', 'obsessed', 'game-changer', 'game changer', 'holy grail', 'hits different', 'elevate',
          'seamless', 'effortless', 'synergy', 'leverage', 'unlock', 'supercharge', 'revolutionary']
NUMBER_WORDS = r'\b(two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|hundred|thousand|million|percent)\b'
TOKEN = re.compile(r'\d|[$€£¥%]|\b(second|minute|hour|day|week|month|year)s?\b', re.I)


def words(t):
    return [w for w in re.split(r'\s+', t.strip()) if w]


def norm(t):
    return re.sub(r'[^a-z0-9]+', ' ', t.lower()).split()


def band(d):
    """Word band for a clip of d seconds: the method's density table, capped so the top never exceeds the
    stated pace of 2.7 words a second (13 s: 35, 14 s: 38, 15 s: 40); under 10 s, the pace rule (MKT-D401)."""
    if d >= 13:
        lo, hi = 35, 40
    elif d >= 11:
        lo, hi = 28, 33
    elif d == 10:
        lo, hi = 22, 26
    else:
        return round(2.2 * d), round(2.6 * d)
    return min(lo, round(2.4 * d)), min(hi, math.floor(2.7 * d))


def plan_clips(d):
    if d != int(d) or d < 4:
        raise ValueError('duration must be a whole number of seconds, 4 or more')
    d = int(d)
    n = math.ceil(d / 15)
    durs = [15] * (n - 1) + [d - 15 * (n - 1)]
    if n > 1 and durs[-1] < 4:
        short = 4 - durs[-1]
        durs[-2] -= short
        durs[-1] = 4
    return {'duration_seconds': d, 'clip_count': n, 'clip_durations': durs}


def load(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)


def cmd_clips(a):
    try:
        out = plan_clips(float(a.duration))
    except ValueError as e:
        print(f'plan.py: {e}', file=sys.stderr)
        return 2
    s = json.dumps(out)
    if a.out:
        open(a.out, 'w').write(s + '\n')
    print(s)
    return 0


def cmd_script(a):
    m, plan = load(a.monologue), load(a.plan)
    fails, warns = [], []
    hook, body, closer, clips = m.get('hook', ''), m.get('body', []), m.get('closer', ''), m.get('clips', [])
    site = m.get('site', '')
    hw = words(hook)
    if not hw or len(hw) > 6:
        fails.append(f'hook has {len(hw)} words; the hook (and the plate) takes at most 6')
    low = ' '.join(norm(hook))
    for o in FILLER_OPENERS + POINTING_OPENERS:
        if low == o or low.startswith(o + ' '):
            fails.append(f'hook opens with "{o}": open on the claim itself')
    if not TOKEN.search(hook):
        warns.append('hook has no number, price, % or time unit: keep it only if it carries a contrast or a named result')
    if not body:
        fails.append('no body beats')
    elif site and site.lower() not in body[0].get('text', '').lower():
        fails.append(f'the first body beat does not name the site "{site}" (the hero card anchors there)')
    labels = [b.get('section_label') for b in body]
    if len(set(labels)) != len(labels) or not all(labels):
        fails.append('every body beat needs its own section_label (one beat per card)')
    full = ' '.join([hook] + [b.get('text', '') for b in body] + [closer]).strip()
    if norm(' '.join(clips)) != norm(full):
        fails.append('the clips joined are not exactly hook + body + closer')
    durs = plan.get('clip_durations', [])
    if len(clips) != len(durs):
        fails.append(f'{len(clips)} clip texts for {len(durs)} planned clips')
    for k, (t, d) in enumerate(zip(clips, durs), 1):
        n, (lo, hi) = len(words(t)), band(d)
        if n > hi:
            fails.append(f'clip {k}: {n} words for {d} s (band {lo}-{hi}); over the band the model crams the words')
        elif n < lo:
            warns.append(f'clip {k}: {n} words for {d} s (band {lo}-{hi}, aim for the middle)')
    lowfull = full.lower()
    if clips and closer.strip():
        ctoks, last = norm(closer), norm(clips[-1])
        if last[-len(ctoks):] != ctoks:
            warns.append('the closer is not the end of the last clip')
        elif len(last) > len(ctoks) + 12:
            warns.append(f'the last clip carries {len(last) - len(ctoks)} body words before the closer: the model places the closing action unpredictably, so keep the closer clip mostly the closer')
    tot = max(1, len(words(full)))
    for nm, n_, lo_, hi_ in [('hook', len(hw), 0.04, 0.16), ('body', sum(len(words(b.get('text', ''))) for b in body), 0.55, 0.80), ('closer', len(words(closer)), 0.08, 0.22)]:
        if not lo_ <= n_ / tot <= hi_:
            warns.append(f'the {nm} is {round(100 * n_ / tot)}% of the words (the method: hook 8-12%, body about 70%, closer about 15%)')
    for b in BANNED:
        if re.search(r'\b' + re.escape(b) + r'\b', lowfull):
            fails.append(f'banned word: "{b}"')
    if '[pause]' in lowfull:
        fails.append('"[pause]" would be spoken and captioned: write an ellipsis (...) for the one engineered pause')
    pauses = len(re.findall(r'\.\.\.|…', full))
    if pauses > 1:
        fails.append(f'{pauses} engineered pauses; at most one, in the hook or the closer')
    if re.search(NUMBER_WORDS, lowfull):
        warns.append('a number is spelled out: write numbers as digits so captions align (check each hit)')
    if not re.search(r"\b\w+'(s|re|m|ll|ve|d|t)\b", full):
        warns.append('no contractions: spoken lines use them')
    for sent in re.split(r'(?<=[.!?])\s+', full):
        caps = [w for w in words(sent) if re.fullmatch(r"[A-Z]{2,}[!?.,']*", w) and w.strip("!?.,'") not in (site.upper(),)]
        if len(caps) > 2:
            warns.append(f'more than two CAPS words in: "{sent[:60]}"')
    for f in fails:
        print(f'FAIL {f}')
    for w in warns:
        print(f'WARN {w}')
    if fails:
        return 1
    os.makedirs(a.out_dir, exist_ok=True)
    open(os.path.join(a.out_dir, 'script.txt'), 'w', encoding='utf-8').write(full + '\n')
    open(os.path.join(a.out_dir, 'hook.txt'), 'w', encoding='utf-8').write(hook.strip() + '\n')
    beats = {'hook': {'text': hook, 'words': len(hw)},
             'body': [{'section_label': b['section_label'], 'text': b['text'], 'words': len(words(b['text']))} for b in body],
             'closer': {'text': closer, 'words': len(words(closer))},
             'total_words': len(words(full))}
    json.dump(beats, open(os.path.join(a.out_dir, 'beats.json'), 'w'), indent=1)
    print(json.dumps({'ok': True, 'total_words': beats['total_words'], 'warnings': len(warns)}))
    return 0


def rows():
    return {r['slug']: r['prompt'] for r in load(PROMPTS)['rows']}


def cmd_prompt(a):
    r, m, plan = rows(), load(a.monologue), load(a.plan)
    clips = m['clips']
    n = len(clips)
    if not 1 <= a.k <= n:
        print(f'plan.py: --k must be 1..{n}', file=sys.stderr)
        return 2
    closer = a.k == n
    accent = r['clip-accent-uk'] if a.uk_look else ''
    parts = [
        r['clip-subject'],
        r['clip-framing'],
        r['clip-setting'].replace('{scene}', a.scene.strip().rstrip('.')),
        r['clip-delivery'].replace('{accent_extra}', accent),
        r['clip-spoken'].replace('{line}', clips[a.k - 1].strip()),
        r['clip-audio'].replace('{ambience}', a.ambience.strip().rstrip('.')),
        r['clip-body-ban'] if not closer else r['clip-body-ban'].replace('.', ' until the last beat.', 1),
    ]
    if closer:
        parts.append(r[{'device': 'clip-closer-device', 'product': 'clip-closer-product', 'neutral': 'clip-closer-neutral'}[a.closer]])
    parts.append(r['clip-ui-ban'])
    text = '\n'.join(parts) + '\n'
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    open(a.out, 'w', encoding='utf-8').write(text)
    print(json.dumps({'k': a.k, 'closer': closer, 'duration': plan['clip_durations'][a.k - 1], 'out': a.out}))
    return 0


def cmd_check(a):
    r, m, plan = rows(), load(a.monologue), load(a.plan)
    fixed = [r['clip-ui-ban'], r['clip-closer-device'], r['clip-closer-product'], r['clip-closer-neutral']]
    n = len(plan['clip_durations'])
    fails = []
    for k in range(1, n + 1):
        p = os.path.join(a.dir, f'clip_{k}.prompt.txt')
        if not os.path.exists(p):
            fails.append(f'clip {k}: {p} missing (write every prompt before submitting any)')
            continue
        t = open(p, encoding='utf-8').read()
        spoken = re.search(r'Says, word for word in English: "(.*)"', t)
        if not spoken:
            fails.append(f'clip {k}: no spoken line')
        elif norm(spoken.group(1)) != norm(m['clips'][k - 1]):
            fails.append(f'clip {k}: the spoken line differs from the monologue')
        visual = t.replace(spoken.group(0), '') if spoken else t
        for f in fixed:
            visual = visual.replace(f, '')
        for pat, why in [(r'hard cut|\bcut [12]\b|\bslots?\b|\bboards?\b', 'a cut, slot or board (several shots)'),
                         (r'\bwebsites?\b|\bui\b|\bscreens?\b|\bbrowsers?\b|\binterfaces?\b|\bmonitors?\b', 'a website, interface, screen or browser in the picture')]:
            hit = re.search(pat, visual, re.I)
            if hit:
                fails.append(f'clip {k}: "{hit.group(0)}" = {why}')
        if k < n:
            for name in a.product or []:
                if name and name.lower() in visual.lower():
                    fails.append(f'clip {k}: the product "{name}" is in the picture of a body clip')
        for need, what in [('9:16', 'framing'), ('two thirds', 'creator share of frame'), ('American accent', 'accent'),
                           ('2.4 to 2.7', 'pace'), ('front camera mic', 'phone mic'), ('No music', 'no music'), (r['clip-ui-ban'], 'the display ban')]:
            if need not in t:
                fails.append(f'clip {k}: the {what} line is missing')
    for f in fails:
        print(f'FAIL {f}')
    print(json.dumps({'clips': n, 'problems': len(fails)}))
    return 1 if fails else 0


def cmd_params(a):
    plan = load(a.plan)
    d = plan['clip_durations'][a.k - 1]
    if a.prompt_file:
        prompt = open(a.prompt_file, encoding='utf-8').read().strip()
    else:   # a quote needs only resolution, duration, aspect and audio: the price does not depend on the words
        prompt = 'quote only'
        print('WARN no --prompt-file: this params file is for ai-gen estimate only; never submit it')
    params = {'prompt': prompt, 'aspect_ratio': a.aspect, 'resolution': a.resolution, 'duration': str(d), 'generate_audio': True}
    json.dump(params, open(a.out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(json.dumps({'k': a.k, 'duration': str(d), 'resolution': a.resolution, 'aspect_ratio': a.aspect, 'out': a.out}))
    return 0


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    sp = ap.add_subparsers(dest='cmd', required=True)
    c = sp.add_parser('clips'); c.add_argument('--duration', required=True); c.add_argument('--out')
    s = sp.add_parser('script'); s.add_argument('--monologue', required=True); s.add_argument('--plan', required=True); s.add_argument('--out-dir', required=True)
    p = sp.add_parser('prompt'); p.add_argument('--k', type=int, required=True); p.add_argument('--plan', required=True)
    p.add_argument('--monologue', required=True); p.add_argument('--scene', required=True); p.add_argument('--ambience', required=True)
    p.add_argument('--closer', choices=['device', 'product', 'neutral'], default='device'); p.add_argument('--uk-look', action='store_true'); p.add_argument('--out', required=True)
    k = sp.add_parser('check'); k.add_argument('--dir', required=True); k.add_argument('--plan', required=True); k.add_argument('--monologue', required=True)
    k.add_argument('--product', action='append')
    q = sp.add_parser('params'); q.add_argument('--k', type=int, required=True); q.add_argument('--plan', required=True)
    q.add_argument('--prompt-file'); q.add_argument('--out', required=True)
    q.add_argument('--resolution', default='1080p'); q.add_argument('--aspect', default='9:16')
    a = ap.parse_args()
    return {'clips': cmd_clips, 'script': cmd_script, 'prompt': cmd_prompt, 'check': cmd_check, 'params': cmd_params}[a.cmd](a)


if __name__ == '__main__':
    sys.exit(main())
