#!/usr/bin/env python3
"""loop_decide.py: the decisions, prompts and params of video-ambient-loop (WF48-a1 steps 2, 4, 5, 6, 8).

  decide    --project P --request TEXT [overrides]
            Decides scene, look, frame, length, music, model, resolution and route from the request words
            (an override flag always wins), builds the picture, clip and music prompts from
            references/scenes.json and references/lines.json, checks their words, and writes
            artifacts/P/loop.json (the job state) and work/P/{frame,clip,music}.params.json.
  count     --project P (--cell-s F | --window-s F) [--tail-s F]
            Sets N (or K) from the measured cell (or window) so the video comes to the length asked, and
            prints the length to say in the hand-off.
  frame-url --project P --result work/P/frame.result.json [--data-uri]
            Veo route only: puts the picture's hosted URL (or a data URI of the local file) into
            first_frame_url and last_frame_url of work/P/clip.params.json (those fields take no ai-gen
            media flag).

Overrides: --scene SLUG|custom --look film|real --frame 9:16|16:9|1:1 --length 30|60|120|145|<seconds>
  --music yes|no --music-model ID --model ID --quality best|default --variety --silent
  --allow-words (keep a kit's line that breaks a word rule, recorded)
  --route cell|hardcut --test-pass --picture TEXT --motion TEXT --sound TEXT --light TEXT
  --picture-add TEXT --motion-add TEXT --restart picture|clip|video --lever TEXT
Prints one JSON line. Exit 0 written; 1 a word check failed (nothing written); 2 usage.
Python 3.11, standard library only.
"""
import argparse
import base64
import json
import math
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(os.path.dirname(HERE), 'references')

# Lengths: vendor N and the lengths a 6.0333 s cell gives (research:everygen/rainambient-fe45fe@On the timeline...),
# hard-cut window counts for 6.9 s windows (@Without the timeline (stitch specification)).
LENGTHS = {
    30: {'words': 'about half a minute', 'track_words': 'about one minute', 'n': 6, 'vendor_s': 36.2, 'k': 5},
    60: {'words': 'about a minute', 'n': 10, 'vendor_s': 60.33, 'k': 9},
    120: {'words': 'about two minutes', 'n': 20, 'vendor_s': 120.67, 'k': 17},
    145: {'words': 'about two and a half minutes', 'n': 24, 'vendor_s': 144.8, 'k': 21},
}
FRAME_WORDS = {'9:16': 'vertical', '16:9': 'wide', '1:1': 'square'}
SEEDANCE20 = 'bytedance/seedance-2.0/image-to-video'
MODELS = {
    SEEDANCE20: {'duration': '7', 'aspect': True, 'resolutions': ['720p', '1080p'], 'last_frame': True, 'route': 'cell', 'audio_field': 'generate_audio'},
    'bytedance/seedance-2.0/fast/image-to-video': {'duration': '7', 'aspect': True, 'resolutions': ['720p'], 'last_frame': True, 'route': 'cell', 'audio_field': 'generate_audio'},
    'bytedance/seedance-2.5/image-to-video': {'duration': '7', 'aspect': False, 'resolutions': ['720p', '1080p'], 'last_frame': False, 'route': 'cell', 'audio_field': 'generate_audio'},
    'fal-ai/veo3.1/fast/first-last-frame-to-video': {'duration': '8s', 'aspect': True, 'aspects': ['9:16', '16:9'], 'resolutions': ['720p', '1080p'], 'frame_urls': True, 'route': 'hardcut', 'window': 7.7, 'audio_field': 'generate_audio', 'extra': {'auto_fix': False, 'safety_tolerance': '4'}},
    'fal-ai/kling-video/v3/pro/image-to-video': {'duration': '7', 'aspect': False, 'resolutions': [], 'route': 'hardcut', 'audio_field': 'generate_audio', 'note': 'kling-note'},
}
MODEL_WORDS = [
    (r'\bveo\b', 'fal-ai/veo3.1/fast/first-last-frame-to-video'),
    (r'\bkling\b', 'fal-ai/kling-video/v3/pro/image-to-video'),
    (r'\bseedance\s*2\.5\b', 'bytedance/seedance-2.5/image-to-video'),
]
MUSIC_MODELS = {'lyria': 'fal-ai/lyria3/pro', 'elevenlabs': 'fal-ai/elevenlabs/music'}

# Word rules (research:everygen/rainambient-fe45fe@Decide, don't ask (decision rules); fine points #9-#14).
RE = {
    'real': r'\breal\b(?!istic)|\breal footage\b|\bphone\b|\biphone\b|\bunfiltered\b|\bno filter\b|\bwithout (a )?filter\b',
    'film': r'\bcinematic\b|\bfilm look\b|\bfilmic\b',
    'wide': r'\bwide\b|\blandscape\b|\bhorizontal\b|\b16\s*:\s*9\b|\byoutube\b|\btv\b|\btelevision\b',
    'square': r'\bsquare\b|\b1\s*:\s*1\b',
    'vertical': r'\bvertical\b|\bportrait\b|\b9\s*:\s*16\b|\btiktok\b|\breels?\b|\bshorts\b|\bstory\b',
    'short': r'\bshort\b|\bquick\b',
    'long_mood': r'\bsleep\w*|\bstudy\w*|\bstudying\b|\breading\b|\bfocus\w*|\brelax\w*|\bmeditat\w*|\bbackground\b|\bambien\w*|\bmusic\b|\bpiano\b|\blo-?fi\b|\bhours\b|\ball night\b|\bovernight\b',
    'hour_plus': r'\bhours\b|\ball night\b|\bovernight\b',
    'music': r'\bmusic\b|\bpiano\b|\blo-?fi\b|\bsong\b',
    'no_music': r'\bno music\b|\bwithout music\b|\bjust the rain\b|\brain only\b|\bno piano\b',
    'silent': r'\bno sound\b|\bsilent\b|\bwithout sound\b|\bmuted?\b|\bno audio\b',
    'best': r'\bbest quality\b|\bhighest quality\b|\bbest possible\b|\b1080p\b|\bfull hd\b',
    'variety': r'\bvariety\b|\bless repetitive\b|\bmore varied\b|\bvary\b|\bvariation\b',
    'thunder': r'\bthunder\w*|\blightning\b',
    'travelling': r'\bmist\w*|\bfog\w*|\bclouds?\b|\bsteam\w*',
}
# Words that break a loop clip (fine points #47-#53; approach step 4 check).
FREEZE = r'\b(still|static|frozen|motionless)\b'
SHRINK = r'\b(gently|slightly|subtle|subtly|barely)\b'
TRAVEL = r'\b(wind|winds|windy|gust|gusts|gusting|breeze|fog|steam|steaming|lightning|time-?lapse)\b'
SOUND_BAD = r'\b(voice|voices|talk|talking|speech|people|person|music|song|singing|piano|thunder|bird|birds|birdsong|gust|gusts|wind|windy|rustle|rustling|breeze)\b'
NUMWORDS = {'a': 1, 'an': 1, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8,
            'nine': 9, 'ten': 10, 'eleven': 11, 'twelve': 12, 'fifteen': 15, 'twenty': 20, 'thirty': 30, 'forty': 40,
            'forty-five': 45, 'fifty': 50, 'sixty': 60, 'ninety': 90}
UNIT = {'s': 1, 'sec': 1, 'secs': 1, 'second': 1, 'seconds': 1, 'm': 60, 'min': 60, 'mins': 60, 'minute': 60,
        'minutes': 60, 'h': 3600, 'hr': 3600, 'hrs': 3600, 'hour': 3600, 'hours': 3600}


def out(code, body):
    print(json.dumps(body, ensure_ascii=False))
    sys.exit(code)


def load(name):
    with open(os.path.join(REF, name), encoding='utf-8') as f:
        return json.load(f)


def has(key, text):
    return re.search(RE[key], text) is not None


def named_seconds(text):
    """The first length the request names, in seconds, or None."""
    t = text.replace('-', ' ')
    m = re.search(r'\bhalf (a|an) (minute|hour)\b', t)
    if m:
        return 30 if m.group(2) == 'minute' else 1800
    unit = r'(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|hr|h)\b'
    m = re.search(r'(\d+(?:\.\d+)?)\s*' + unit, t)
    if m:
        val = float(m.group(1)) * UNIT[m.group(2)]
        m2 = re.search(r'(\d+(?:\.\d+)?)\s*(?:minutes?|mins?|m)\s*(?:and\s*)?(\d+)\s*(?:seconds?|secs?|s)\b', t)
        if m2:
            val = float(m2.group(1)) * 60 + float(m2.group(2))
        return val
    m = re.search(r'\b(' + '|'.join(sorted(NUMWORDS, key=len, reverse=True)) + r')\s+(and a half\s+)?' + unit, t)
    if m:
        val = NUMWORDS[m.group(1)] + (0.5 if m.group(2) else 0)
        return val * UNIT[m.group(3)]
    m = re.search(r'\b(' + '|'.join(sorted(NUMWORDS, key=len, reverse=True)) + r')\s+(seconds?|minutes?|hours?)\s+and a half\b', t)
    if m:
        return (NUMWORDS[m.group(1)] + 0.5) * UNIT[m.group(2)]
    return None


def snap(seconds):
    """Four lengths only (fine point #11): below 60 s gives 30; 60 to 89 gives 60; 90 to 120 gives 120; above, 145."""
    if seconds < 60:
        return 30
    if seconds < 90:
        return 60
    if seconds <= 120:
        return 120
    return 145


def words_of_seconds(s):
    s = int(round(s))
    names = {0: 'zero', 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine',
             10: 'ten', 15: 'fifteen', 20: 'twenty', 25: 'twenty-five', 30: 'thirty', 35: 'thirty-five', 40: 'forty',
             45: 'forty-five', 50: 'fifty', 55: 'fifty-five'}
    mins, secs = divmod(s, 60)
    parts = []
    if mins:
        parts.append(f"{names.get(mins, str(mins))} minute{'s' if mins != 1 else ''}")
    if secs:
        parts.append(f"{names.get(secs, str(secs))} seconds")
    return 'about ' + ' and '.join(parts)


def check_words(lines):
    """Exit-1 checks of the lines a clip prompt is built from (approach steps 4 and 8)."""
    fails = []
    m = lines['motion']
    for rx, why in ((FREEZE, 'freezes the rain, even negated (#49)'), (SHRINK, 'comes out as almost no motion (#51)'),
                    (TRAVEL, 'travelling motion or wind returns at every repeat (#47, #52)')):
        for hit in re.findall(rx, m, flags=re.I):
            fails.append(f"motion line: '{hit}' {why}")
    for hit in re.findall(SOUND_BAD, lines['sound'], flags=re.I):
        fails.append(f"sound line: '{hit}' brings a voice, music or a standout sound into every repeat (#53, #99)")
    return fails


def decide(a):
    scenes = load('scenes.json')
    lines = {r['slug']: r['prompt'] for r in load('lines.json')['rows']}
    rows = {r['slug']: r for r in scenes['rows']}
    text = ' '.join((a.request or '').lower().split())
    reasons = []
    notes = []

    # Scene (fine point #9 for the no-place real request; scenes.json mood rows).
    scene = a.scene
    if scene is None:
        # the storm row is looked at first: "thunderstorm over the lake" is the storm, not the lake (review R13)
        for r in sorted(scenes['rows'], key=lambda r: r['slug'] != 'storm'):
            if any(re.search(r'\b' + re.escape(w) + r'\b', text) for w in r['match']):
                scene = r['slug']; reasons.append(f"scene '{scene}': named in the request"); break
    if scene is None and has('real', text) and not has('film', text):
        scene = scenes['real_no_place_scene']; reasons.append(f"scene '{scene}': a real look with no place named")
    if scene is None:
        for mrow in scenes['mood']:
            if any(re.search(r'\b' + re.escape(w) + r'\w*', text) for w in mrow['words']):
                scene = mrow['scene']; reasons.append(f"scene '{scene}': mood words ({', '.join(mrow['words'][:3])}...)"); break
    if scene is None:
        scene = scenes['default_scene']; reasons.append(f"scene '{scene}': nothing named, the default")
    if scene != 'custom' and scene not in rows:
        out(2, {'error': f'unknown scene {scene}', 'scenes': sorted(rows)})
    row = rows.get(scene, {'slug': 'custom', 'name': 'scene', 'plan': 'The scene you described', 'handoff': 'rainy scene',
                           'look': 'film', 'trees': False, 'weak': False, 'light': {}, 'tested': 'described by the customer; not run'})

    # Look (film wins when both appear; 'realistic', or a bare 'footage' or 'film', leaves the look as it is).
    if a.look:
        look = a.look; reasons.append(f'look {look}: override')
    elif has('film', text):
        look = 'film'; reasons.append('look film: cinematic or film-look words (film wins over real words)')
    elif has('real', text):
        look = 'real'; reasons.append('look real: real, phone, unfiltered or no-filter words')
    else:
        look = row['look']; reasons.append(f"look {look}: the scene's own")

    # Length (fine points #11, #12).
    longer_than_longest = False
    if a.length:
        target = snap(float(a.length)); longer_than_longest = float(a.length) > 150; reasons.append(f'length {target}: override')
    else:
        sec = named_seconds(text)
        if sec is not None:
            target = snap(sec); longer_than_longest = sec > 150; reasons.append(f'length {target}: {round(sec)} s named, snapped to one of four')
        elif has('short', text):
            target = 60; reasons.append('length 60: short or quick, no number')
        elif has('long_mood', text):
            target = 145; reasons.append('length 145: a sleep, study, focus, ambience, music or overnight word')
        else:
            target = 60; reasons.append('length 60: nothing named')
    named = named_seconds(text) if not a.length else float(a.length)
    hour_plus = (named is not None and named >= 3600) or has('hour_plus', text)

    # Frame (fine point #10): explicit frame words win; then an hour or more; vertical by default.
    if a.frame:
        frame = a.frame; reasons.append(f'frame {frame}: override')
    elif has('square', text):
        frame = '1:1'; reasons.append('frame 1:1: square named')
    elif has('wide', text):
        frame = '16:9'; reasons.append('frame 16:9: wide words')
    elif has('vertical', text):
        frame = '9:16'; reasons.append('frame 9:16: vertical words')
    elif hour_plus:
        frame = '16:9'; reasons.append('frame 16:9: an hour or more (watched on a big screen)')
    else:
        frame = '9:16'; reasons.append('frame 9:16: the default')

    # Sound and music.
    silent = a.silent or has('silent', text)
    if a.music:
        music = a.music == 'yes'
    else:
        music = has('music', text) and not has('no_music', text)
    if silent:
        music = False
    music_model = a.music_model or MUSIC_MODELS['elevenlabs']  # Lyria has no price on record: it cannot run inside a budget (HR5; VID-D391)
    music_model = MUSIC_MODELS.get(music_model, music_model)

    # Model, resolution, route.
    model = a.model
    if model is None:
        for rx, mid in MODEL_WORDS:
            if re.search(rx, text):
                model = mid; reasons.append(f'model {mid}: named in the request'); break
    if a.test_pass:
        model = 'bytedance/seedance-2.0/fast/image-to-video'; reasons.append('model: the fast tier for a test pass')
    if model is None:
        model = SEEDANCE20
    spec = MODELS.get(model)
    unknown_model = spec is None
    if unknown_model:
        # any other id: everything is written except the clip params, which the agent writes from `ai-gen info` (review R5)
        spec = {'duration': '7', 'aspect': False, 'resolutions': [], 'route': 'hardcut', 'audio_field': 'generate_audio'}
        notes.append(f'write work/{a.project}/clip.params.json by hand from `ai-gen info {model}`; hard-cut route; the flags in clip_flags are a guess')
    if spec.get('aspects') and frame not in spec['aspects']:
        notes.append(f'{model} makes no {frame}: the default model is used instead (Veo has no square)')
        model, spec = SEEDANCE20, MODELS[SEEDANCE20]
    best = a.quality == 'best' or (a.quality is None and has('best', text))
    resolution = None
    if spec['resolutions']:
        resolution = '1080p' if best and '1080p' in spec['resolutions'] else spec['resolutions'][0]
        if best and resolution != '1080p':
            notes.append(f'{model} has no 1080p; {resolution} is used')
    elif best:
        notes.append(f'{model} has no resolution field: best quality cannot be set')
    route = a.route or spec['route']
    if route == 'cell' and spec['route'] == 'hardcut':
        notes.append('the blended cell needs a 7-second Seedance clip; this model takes the hard-cut route')
        route = 'hardcut'
    variety = a.variety or has('variety', text)

    # Lines (scene row, overrides, the fix-table clauses the agent passes).
    ln = {
        'picture': a.picture or row.get('picture', ''),
        'light': a.light or row['light'].get(look, ''),
        'motion': a.motion or row.get('motion', ''),
        'sound': a.sound or row.get('sound', ''),
    }
    if not all(ln.values()):
        out(2, {'error': 'a custom scene needs --picture, --light, --motion and --sound (write them by the rules in SKILL.md step 4)'})
    if a.picture_add:
        ln['picture'] = ln['picture'].rstrip('. ') + ', ' + a.picture_add.strip().rstrip('.') + '.'
    if a.motion_add:
        ln['motion'] = ln['motion'].rstrip('. ') + ', ' + a.motion_add.strip().rstrip('.') + '.'
    if row.get('trees') and 'windless' not in ln['motion']:
        ln['motion'] = ln['motion'].rstrip('. ') + ', ' + lines['windless'] + '.'
    if has('travelling', text) and 'mist' not in ln['motion']:
        ln['motion'] = ln['motion'].rstrip('. ') + '; ' + lines['mist-resting'] + '.'
        notes.append('a travelling element was asked for: kept resting; add the mist-note line to the hand-off')
    fails = check_words(ln)
    allowed = []
    if a.allow_words and fails:  # a kit or brief line that breaks a word rule is kept and recorded as a deliberate choice (review R4)
        allowed, fails = fails, []

    # Prompts.
    rain = lines[row.get('rain_sentence', 'rain-sentence')]
    body = lines['clip-body']
    if look == 'real':
        body = body + ' ' + lines['real-look-insert']
    sound = lines['clip-sound'].replace('[sound line from the scene row]', ln['sound'])
    clip_prompt = ' '.join([ln['motion'].strip(), rain, body, sound, lines['clip-close']])
    if re.search(FREEZE, clip_prompt, flags=re.I) and not a.allow_words:
        fails.append('clip prompt: a stillness word anywhere freezes the rain (#49)')
    if re.search(r'\bphone\b', clip_prompt, flags=re.I) and not a.allow_words:
        fails.append("clip prompt: the word 'phone' may add a handheld wobble (#45)")
    if len(clip_prompt) >= 1300:
        fails.append(f'clip prompt is {len(clip_prompt)} characters; keep it under 1,300 (#44)')
    look_line = lines['film-look-picture'] if look == 'film' else lines['real-look-picture']
    picture_prompt = ' '.join([ln['picture'].strip(), ln['light'].strip(), look_line, lines['picture-rules']])
    if fails:
        out(1, {'ok': False, 'fails': fails, 'lines': ln})

    n = LENGTHS[target]['n']
    video_s_expected = LENGTHS[target]['vendor_s']
    track_s = int(math.ceil((video_s_expected + 20) / 5.0) * 5)  # the video plus a little (approach step 6)
    music_prompt = lines['music-line']
    if music_model != MUSIC_MODELS['elevenlabs']:  # Lyria or another prompt-only model: no length field
        music_prompt = music_prompt.replace('[the track length in words]', words_of_seconds(track_s))
        music_params = {'prompt': music_prompt}
    else:
        music_prompt = music_prompt.replace(' of [the track length in words]', '')
        ms = int(round(video_s_expected * 1000))
        if ms > 60000 and ms % 60000 < 2000:
            ms -= ms % 60000  # one started minute less; the rain carries the last moment (approach step 6)
        music_params = {'prompt': music_prompt, 'music_length_ms': ms, 'force_instrumental': True}

    # Params files: exact JSON types, estimate and run from the same file (commands.md).
    frame_params = {'prompt': picture_prompt, 'aspect_ratio': frame, 'resolution': '2K' if best else '1K', 'num_images': 1,
                    'safety_tolerance': '4', 'enable_web_search': False, 'limit_generations': True}
    clip_params = {'prompt': clip_prompt, 'duration': spec['duration'], spec['audio_field']: not silent}
    if resolution:
        clip_params['resolution'] = resolution
    if spec.get('aspect'):
        clip_params['aspect_ratio'] = frame
    if spec.get('frame_urls'):
        clip_params['first_frame_url'] = 'FILL: loop_decide.py frame-url'
        clip_params['last_frame_url'] = 'FILL: loop_decide.py frame-url'
    clip_params.update(spec.get('extra', {}))

    art = os.path.join(a.artifacts, a.project)
    work = os.path.join(a.work, a.project)
    os.makedirs(art, exist_ok=True)
    os.makedirs(work, exist_ok=True)
    prev = {}
    state_path = os.path.join(art, 'loop.json')
    if os.path.exists(state_path):
        with open(state_path, encoding='utf-8') as f:
            prev = json.load(f)
    plan_parts = [row['plan'] if scene != 'custom' else 'The scene you described']
    if look == 'real':
        plan_parts.append('real and unfiltered')
    plan_parts += [FRAME_WORDS[frame], LENGTHS[target]['words']]
    state = {
        'schema': 'sl8.video-ambient-loop/1',
        'project': a.project,
        'request': a.request,
        'decided': {
            'scene': scene, 'scene_name': row['name'], 'look': look, 'frame': frame, 'length': target,
            'length_words': LENGTHS[target]['words'], 'n': n, 'k_hardcut': LENGTHS[target]['k'],
            'video_s_vendor': video_s_expected, 'longer_than_longest': longer_than_longest,
            'music': music, 'music_model': music_model if music else None, 'track_s_asked': track_s if music else None,
            'silent': silent, 'variety': variety, 'video_model': model, 'resolution': resolution, 'route': route,
            'window_s': spec.get('window'), 'thunder_asked': has('thunder', text), 'weak_scene': bool(row.get('weak')),
            'kling_note': spec.get('note') == 'kling-note',
            'clip_flags': ('--image <picture> --last-frame <picture>' if spec.get('last_frame') else
                           'none: the picture goes in first_frame_url and last_frame_url (frame-url)' if spec.get('frame_urls') else
                           '--image <picture>'),
        },
        'reasons': reasons,
        'allowed_word_breaks': allowed,
        'notes': notes + ([row['note']] if row.get('note') else []),
        'lines': ln,
        'prompts': {'picture': picture_prompt, 'clip': clip_prompt, 'clip_chars': len(clip_prompt), 'music': music_prompt if music else None},
        'plan_line': ', '.join(plan_parts) + '.',
        'handoff_scene': row['handoff'],
        'restart_at': a.restart,
        'lever': a.lever,
        'history': (prev.get('history') or []) + ([{'decided': prev.get('decided'), 'lines': prev.get('lines')}] if prev.get('decided') else []),
        'tested': row.get('tested'),
    }
    files = {'state': state_path, 'frame_params': os.path.join(work, 'frame.params.json'), 'clip_params': os.path.join(work, 'clip.params.json')}
    if music:
        files['music_params'] = os.path.join(work, 'music.params.json')
    if unknown_model:
        del files['clip_params']
    for key, obj in (('state', state), ('frame_params', frame_params), ('clip_params', clip_params), ('music_params', music_params)):
        if key in files:
            with open(files[key], 'w', encoding='utf-8') as f:
                json.dump(obj, f, indent=2, ensure_ascii=False)
                f.write('\n')
    out(0, {'ok': True, 'decided': state['decided'], 'plan_line': state['plan_line'], 'clip_chars': len(clip_prompt),
            'reasons': reasons, 'notes': state['notes'], 'files': files})


def count(a):
    """Set N (blend route) or K (hard-cut route) from the measured cell or window, not from the asked clip length (review R1, R7)."""
    sp = os.path.join(a.artifacts, a.project, 'loop.json')
    if not os.path.exists(sp):
        out(2, {'error': f'no {sp}: run decide first'})
    with open(sp, encoding='utf-8') as f:
        state = json.load(f)
    d = state['decided']
    unit = a.cell_s if a.cell_s else a.window_s
    if not unit or unit <= 0:
        out(2, {'error': 'pass --cell-s (blend route) or --window-s (hard-cut route), the measured figure'})
    asked = float(d['length'])
    cap = max(LENGTHS[k]['vendor_s'] for k in LENGTHS) + 5.0  # never past the longest tier
    n = max(1, int(round(asked / unit)))
    while n > 1 and n * unit > cap:
        n -= 1
    total = n * unit + (a.tail_s or 0)
    key = 'n' if a.cell_s else 'k_measured'
    d[key] = n
    d['expected_s'] = round(total, 2)
    d['expected_words'] = words_of_seconds(total)
    d['unit_s'] = round(unit, 4)
    with open(sp, 'w', encoding='utf-8') as f:
        json.dump(state, f, indent=2, ensure_ascii=False)
        f.write('\n')
    out(0, {'ok': True, key: n, 'expected_s': d['expected_s'], 'asked_s': asked, 'within_5pct': abs(total - asked) <= 0.05 * asked,
            'handoff_length_words': d['expected_words'], 'note': 'say this length in the hand-off, not the asked one'})


def frame_url(a):
    work = os.path.join(a.work, a.project)
    cp = os.path.join(work, 'clip.params.json')
    with open(cp, encoding='utf-8') as f:
        params = json.load(f)
    with open(a.result, encoding='utf-8') as f:
        env = json.load(f)
    if a.data_uri:
        local = (env.get('files') or [{}])[0].get('local_path')
        if not local or not os.path.exists(local):  # the picture was renamed: use the kept copy (review R6)
            sp = os.path.join(a.artifacts, a.project, 'loop.json')
            if os.path.exists(sp):
                with open(sp, encoding='utf-8') as f:
                    sc = json.load(f).get('decided', {}).get('scene')
                kept = os.path.join(a.artifacts, a.project, 'keyframes', f'{sc}-picture.png')
                local = kept if os.path.exists(kept) else None
        if not local or not os.path.exists(local):
            out(2, {'error': 'no local picture in the envelope (files[0].local_path)'})
        raw = open(local, 'rb').read()
        if len(raw) > 3 * 1024 * 1024:
            out(1, {'ok': False, 'error': f'{len(raw)} bytes: over the 3 MB inline cap; use the hosted URL while it is fresh'})
        mime = 'image/png' if local.lower().endswith('.png') else 'image/jpeg'
        url = f'data:{mime};base64,' + base64.b64encode(raw).decode()
    else:
        urls = env.get('hosted_urls') or [x.get('url') for x in env.get('files') or [] if x.get('url')]
        if not urls:
            out(2, {'error': 'no hosted URL in the envelope; pass --data-uri'})
        url = urls[0]
    params['first_frame_url'] = url
    params['last_frame_url'] = url
    with open(cp, 'w', encoding='utf-8') as f:
        json.dump(params, f, indent=2, ensure_ascii=False)
        f.write('\n')
    out(0, {'ok': True, 'clip_params': cp, 'kind': 'data-uri' if a.data_uri else 'hosted-url', 'note': 'hosted URLs expire: run the clip call now'})


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest='cmd', required=True)
    d = sub.add_parser('decide')
    d.add_argument('--project', required=True)
    d.add_argument('--request', default='')
    d.add_argument('--scene')
    d.add_argument('--look', choices=['film', 'real'])
    d.add_argument('--frame', choices=['9:16', '16:9', '1:1'])
    d.add_argument('--length')
    d.add_argument('--music', choices=['yes', 'no'])
    d.add_argument('--music-model')
    d.add_argument('--model')
    d.add_argument('--quality', choices=['best', 'default'])
    d.add_argument('--variety', action='store_true')
    d.add_argument('--silent', action='store_true')
    d.add_argument('--allow-words', action='store_true')
    d.add_argument('--route', choices=['cell', 'hardcut'])
    d.add_argument('--test-pass', action='store_true')
    for k in ('picture', 'motion', 'sound', 'light', 'picture-add', 'motion-add', 'lever'):
        d.add_argument('--' + k)
    d.add_argument('--restart', choices=['picture', 'clip', 'video'])
    f = sub.add_parser('frame-url')
    f.add_argument('--project', required=True)
    f.add_argument('--result', required=True)
    f.add_argument('--data-uri', action='store_true')
    c = sub.add_parser('count')
    c.add_argument('--project', required=True)
    c.add_argument('--cell-s', type=float)
    c.add_argument('--window-s', type=float)
    c.add_argument('--tail-s', type=float)
    for s in (d, f, c):
        s.add_argument('--artifacts', default='artifacts')
        s.add_argument('--work', default='work')
    try:
        a = p.parse_args()
    except SystemExit as e:
        sys.exit(2 if e.code else 0)
    if not re.match(r'^[a-z0-9][a-z0-9._-]*$', a.project):
        out(2, {'error': '--project must be a kebab-case name'})
    if a.cmd == 'decide':
        if a.length is not None:
            try:
                float(a.length)
            except ValueError:
                out(2, {'error': '--length takes seconds (30, 60, 120, 145 or any number to snap)'})
        decide(a)
    elif a.cmd == 'count':
        count(a)
    else:
        frame_url(a)


if __name__ == '__main__':
    main()
