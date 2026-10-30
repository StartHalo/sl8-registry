#!/usr/bin/env python3
"""composite.py: cards, spine, timeline and overlay for marketing-site-creator-video.

SL8-authored from the behaviour the capability assessment records for WF20-a1 steps 5, 16-20 and
its enrichment (no vendor file is copied). Local only: ffmpeg, ffprobe and Pillow.

  composite.py cards --capture capture.jsonl --out-dir DIR [--hero LABEL] [--screens DIR]
      Usable cards from capture.mjs's lines (or the customer's screenshots, used as sent).
      Exit 0 three or more cards; 4 the capture failed (bot wall, dead page, under three cards).
  composite.py frames --clip clip.mp4 --out-dir DIR [--n 6] [--times 1.2,3.4]
  composite.py spine --clips c1.mp4 c2.mp4 ... --out creator_full.mp4
      Joins the clips by stream copy when codec, size, frame rate and audio format all match,
      else re-encodes once and says so.
  composite.py timeline --cards cards.json --beats beats.json --spine creator_full.mp4
                        [--timed timed.json] --out timeline.json [--card-s 1.4] [--gap 0.4]
      Inset windows: from spoken word onsets (--timed, from captions.py align) or from authored
      word counts. Refuses a card whose "marker" is still null. Exit 1 when fewer than --min-cards (3) windows fit.
  composite.py overlay --spine creator_full.mp4 --timeline timeline.json --out final.mp4 [--print]
      One encode: each card contain-fit in 0.78W x 0.60H, centred, raised 0.04H, audio copied.
      With no windows the spine is copied as the talking-head-only final.
  composite.py samesound A B      exit 0 when the decoded audio of A and B is identical.
Exit 1 a check failed; 2 usage or a missing tool.
"""
import argparse, json, os, re, shutil, subprocess, sys

FLAT_SHARE = 0.004   # a still with under 0.4% of pixels away from its dominant colour reads as blank (unverified threshold)
BAND_SHARE = 0.25    # a flat run over 25% of the full page's height is reported as a blank band


def die(msg, code=1):
    print(f'composite.py: {msg}', file=sys.stderr)
    sys.exit(code)


def need(tool):
    if not shutil.which(tool):
        die(f'{tool} is not on this machine (no runtime installs, HR21)', 2)


def probe(path):
    need('ffprobe')
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries',
                        'format=duration:stream=codec_type,codec_name,width,height,r_frame_rate,pix_fmt,sample_rate,channels',
                        '-of', 'json', path], capture_output=True, text=True)
    if r.returncode:
        die(f'ffprobe failed on {path}: {r.stderr.strip()[:200]}')
    d = json.loads(r.stdout)
    v = next((s for s in d.get('streams', []) if s.get('codec_type') == 'video'), {})
    a = next((s for s in d.get('streams', []) if s.get('codec_type') == 'audio'), {})
    return {'duration': float(d.get('format', {}).get('duration', 0) or 0),
            'v': (v.get('codec_name'), v.get('width'), v.get('height'), v.get('r_frame_rate'), v.get('pix_fmt')),
            'a': (a.get('codec_name'), a.get('sample_rate'), a.get('channels')) if a else None,
            'width': v.get('width'), 'height': v.get('height'), 'fps': v.get('r_frame_rate')}


def pil():
    try:
        from PIL import Image
    except ImportError:
        die('Pillow is not on this machine', 2)
    Image.MAX_IMAGE_PIXELS = None   # full pages run 20-25k px tall; never ImageMagick on them
    return Image


def blankness(path):
    Image = pil()
    im = Image.open(path).convert('L')
    w = 120
    im = im.resize((w, max(1, int(im.height * w / im.width))))
    px = im.tobytes()
    hist = im.histogram()
    dom = max(range(256), key=lambda i: hist[i])
    busy = sum(1 for p in px if abs(p - dom) > 16) / len(px)
    flat_rows, run, worst = 0, 0, 0
    for y in range(im.height):
        row = px[y * w:(y + 1) * w]
        if max(row) - min(row) <= 6:
            flat_rows += 1; run += 1; worst = max(worst, run)
        else:
            run = 0
    return {'busy_share': round(busy, 4), 'longest_flat_share': round(worst / im.height, 3)}


def cmd_cards(a):
    os.makedirs(a.out_dir, exist_ok=True)
    cards, skipped, reasons, facts = [], [], [], []
    if a.screens:
        for f in sorted(os.listdir(a.screens)):
            if not re.search(r'\.(png|jpe?g|webp)$', f, re.I):
                continue
            p = os.path.join(a.screens, f)
            b = blankness(p)
            label = re.sub(r'^section_', '', os.path.splitext(f)[0])
            if b['busy_share'] < FLAT_SHARE:
                skipped.append({'label': label, 'why': 'blank still'})
            else:   # used as sent: no mobilising, no 3:4 crop, no hero band, never cover-cropped
                cards.append({'label': label, 'path': p, 'source': 'screenshot', 'rect': None, 'marker': None, **b})
    else:
        lines = [json.loads(l) for l in open(a.capture) if l.strip().startswith('{')]
        page = next((l for l in lines if l.get('kind') == 'page'), {})
        full = next((l for l in lines if l.get('kind') == 'full'), {})
        if page.get('botwall'):
            reasons.append(f"bot-wall markers in the page: {', '.join(page['botwall'])}")
        if not full.get('exists') or full.get('bytes', 0) < 20000:
            reasons.append(f"full-page capture missing or only {full.get('bytes', 0)} bytes")
        elif full.get('path'):
            exp = (full.get('doc_css_height') or 0) * (full.get('scale') or 1)
            if exp and full.get('height') and full['height'] < exp * 0.97:
                facts.append(f"full-page image is {full['height']} px tall but the page needs about {int(exp)}: it was cut (the 16384 px surface limit); rerun capture.mjs with --full-scale css")
                print('WARN ' + facts[-1])
            fb = blankness(full['path'])
            if fb['longest_flat_share'] > BAND_SHARE:
                facts.append(f"site_full.png has a blank band over {int(fb['longest_flat_share'] * 100)}% of its height (pinned hero or reveal that never fired): look at it before using the section map")
                print('WARN ' + facts[-1])
        viewport_h = None
        for l in lines:
            if l.get('kind') != 'section':
                continue
            if l.get('error'):
                skipped.append({'label': l['label'], 'why': l['error']}); continue
            if not l.get('exists'):
                skipped.append({'label': l['label'], 'why': 'file missing'}); continue
            if l.get('rect') is None:
                skipped.append({'label': l['label'], 'why': 'never painted (rect null)'}); continue
            b = blankness(l['path'])
            if b['busy_share'] < FLAT_SHARE:
                skipped.append({'label': l['label'], 'why': 'blank still'}); continue
            viewport_h = viewport_h or pil().open(l['path']).height
            cards.append({'label': l['label'], 'path': l['path'], 'source': 'capture', 'rect': l['rect'], 'marker': None, **b})
        if a.hero and not any(c['label'].lower() == a.hero.lower() for c in cards) and full.get('exists') and full.get('bytes', 0) >= 20000:
            Image = pil()
            im = Image.open(full['path'])
            heads = next((l for l in lines if l.get('kind') == 'headings'), {}).get('items', [])
            h1 = next((h for h in heads if a.hero.lower() in h['text'].lower()), None)
            dpr = full.get('scale') or next((l['rect']['dpr'] for l in lines if l.get('kind') == 'section' and l.get('rect')), 3)
            band = int((viewport_h or 664 * 3) * dpr / (next((l['rect']['dpr'] for l in lines if l.get('kind') == 'section' and l.get('rect')), 3)))
            if h1:   # by the document-absolute rect, never a y-fraction
                top = max(0, int(h1['top'] * dpr - band / 3))
                box, how = (0, top, im.width, min(im.height, top + band)), 'crop by rect'
            else:
                box, how = (0, 0, im.width, int(im.height * 0.35)), 'top 35% (last resort)'
            p = os.path.join(a.out_dir, 'card_hero.png')
            im.crop(box).save(p)
            cards.insert(0, {'label': a.hero, 'path': p, 'source': how, 'rect': None, 'marker': None, **blankness(p)})
    if a.hero:
        cards.sort(key=lambda c: 0 if c['label'].lower() == a.hero.lower() else 1)
    if len(cards) < 3:
        reasons.append(f'{len(cards)} usable cards (3 needed)')
    out = {'status': 'failed' if reasons else 'ok', 'reasons': reasons, 'facts': facts, 'cards': cards, 'skipped': skipped}
    json.dump(out, open(os.path.join(a.out_dir, 'cards.json'), 'w'), indent=1)
    print(json.dumps({'status': out['status'], 'cards': len(cards), 'skipped': len(skipped), 'reasons': reasons}))
    return 4 if reasons else 0


def cmd_frames(a):
    need('ffmpeg')
    os.makedirs(a.out_dir, exist_ok=True)
    d = probe(a.clip)['duration']
    times = [round(d * (i + 0.5) / a.n, 2) for i in range(a.n)]
    times += [float(t) for t in (a.times.split(',') if a.times else []) if t]
    stem = os.path.splitext(os.path.basename(a.clip))[0]
    out = []
    for t in sorted(set(times)):
        p = os.path.join(a.out_dir, f'{stem}_{t:06.2f}.png')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(t), '-i', a.clip, '-frames:v', '1', p], check=False)
        if os.path.exists(p):
            out.append(p)
    print(json.dumps({'clip': a.clip, 'frames': out}))
    return 0 if out else 1


def cmd_spine(a):
    need('ffmpeg')
    infos = [probe(c) for c in a.clips]
    same = all(i['v'] == infos[0]['v'] and i['a'] == infos[0]['a'] for i in infos)
    if any(i['a'] is None for i in infos):
        die('a clip has no audio stream: the voice is the spine (check generate_audio)')
    lst = a.out + '.txt'
    with open(lst, 'w') as f:
        for c in a.clips:
            f.write("file '%s'\n" % os.path.abspath(c).replace("'", "'\\''"))
    if same:
        cmd = ['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', a.out]
    else:
        print('WARN clips differ in codec, size, frame rate or audio format: re-encoding the join once')
        fps = infos[0]['fps']
        cmd = ['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
               '-profile:v', 'high', '-r', fps, '-vf', f"scale={infos[0]['width']}:{infos[0]['height']}", '-c:a', 'aac',
               '-ar', str(infos[0]['a'][1]), '-b:a', '192k', a.out]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        die(f'concat failed: {r.stderr.strip()[:300]}')
    o = probe(a.out)
    total = sum(i['duration'] for i in infos)
    ok = abs(o['duration'] - total) <= 0.1 * len(infos) + 0.1
    print(json.dumps({'out': a.out, 'T': round(o['duration'], 3), 'sum_clips': round(total, 3), 'fps': o['fps'],
                      'width': o['width'], 'height': o['height'], 'reencoded': not same, 'duration_ok': ok}))
    return 0 if ok else 1


def cmd_timeline(a):
    # exit 1 when fewer than --min-cards insets fit
    cards = json.load(open(a.cards))['cards']
    beats = json.load(open(a.beats))
    T = probe(a.spine)['duration']
    by = {c['label'].lower(): c for c in cards}
    unmarked = [c['label'] for c in cards if not c.get('marker')]
    if unmarked:
        die(f'cards without a site marker recorded: {", ".join(unmarked)} (look at each card and set "marker", or drop the card)')
    hook_n, closer_n, total = beats['hook']['words'], beats['closer']['words'], beats['total_words']
    starts, cum = [], hook_n
    for b in beats['body']:
        starts.append(cum); cum += b['words']
    if a.timed:
        tw = json.load(open(a.timed))['words']
        onset = {w[3]: w[0] for w in tw}
        idx = sorted(onset)

        def t_of(i):   # first spoken onset at or after script token i
            later = [k for k in idx if k >= i]
            return onset[later[0]] if later else T
        mode = 'transcript'
    else:
        def t_of(i):
            return T * i / total
        mode = 'word-count'
    t_hook = min(2.0, t_of(hook_n))
    t_closer = t_of(total - closer_n)
    wins, dropped, prev_e = [], [], -1.0
    for k, b in enumerate(beats['body']):
        c = by.get(b['section_label'].lower())
        if not c:
            dropped.append({'label': b['section_label'], 'why': 'no card'}); continue
        if k == 0 and cards and c is not cards[0]:
            print('WARN the first body beat is not the first (hero) card')
        s = max(t_of(starts[k]), t_hook, prev_e + a.gap if prev_e >= 0 else 0)
        e = s + a.card_s
        if e > t_closer:
            dropped.append({'label': b['section_label'], 'why': f'window {s:.2f}-{e:.2f} runs into the closer at {t_closer:.2f}'}); continue
        wins.append({'label': c['label'], 'path': c['path'], 's': round(s, 3), 'e': round(e, 3)})
        prev_e = e
    out = {'T': round(T, 3), 'mode': mode, 't_hook': round(t_hook, 3), 't_closer': round(t_closer, 3), 'windows': wins, 'dropped': dropped}
    json.dump(out, open(a.out, 'w'), indent=1)
    print(json.dumps({'mode': mode, 'windows': len(wins), 'dropped': len(dropped), 't_hook': out['t_hook'], 't_closer': out['t_closer']}))
    if len(wins) < a.min_cards:
        print(f"FAIL {len(wins)} inset windows fit (need {a.min_cards}); dropped: {json.dumps(dropped)}. Shorten with --card-s 1.2 --gap 0.3 (the lowest values the method allows) and rerun, or deliver the talking-head-only final")
        return 1
    return 0


def cmd_overlay(a):
    need('ffmpeg')
    tl = json.load(open(a.timeline))
    info = probe(a.spine)
    W, H, fps = info['width'], info['height'], info['fps']
    if not tl['windows']:
        cmd = ['ffmpeg', '-v', 'error', '-y', '-i', a.spine, '-c', 'copy', a.out]
    else:
        wbox, hbox, up = W * 78 // 100, H * 60 // 100, H * 4 // 100
        cmd = ['ffmpeg', '-v', 'error', '-y', '-i', a.spine]
        chains, last = [], '0:v'
        for i, w in enumerate(tl['windows'], 1):
            cmd += ['-loop', '1', '-t', f"{tl['T']:.3f}", '-i', w['path']]
            chains.append(f'[{i}:v]scale={wbox}:{hbox}:force_original_aspect_ratio=decrease[c{i}]')
            chains.append(f"[{last}][c{i}]overlay=(W-w)/2:(H-h)/2-{up}:enable='between(t,{w['s']},{w['e']})':eof_action=pass[v{i}]")
            last = f'v{i}'
        cmd += ['-filter_complex', ';'.join(chains), '-map', f'[{last}]', '-map', '0:a', '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
                '-profile:v', 'high', '-crf', '18', '-preset', 'medium', '-movflags', '+faststart', '-r', fps, '-c:a', 'copy', '-shortest', a.out]
    if a.print:
        print(' '.join(c if re.fullmatch(r'[\w./:=+-]+', c) else "'" + c.replace("'", "'\\''") + "'" for c in cmd))
        return 0
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode or not os.path.exists(a.out):
        die(f'overlay failed: {r.stderr.strip()[:300]}')
    o = probe(a.out)
    ok = abs(o['duration'] - info['duration']) <= 0.1 and (o['width'], o['height']) == (W, H)
    print(json.dumps({'out': a.out, 'duration': round(o['duration'], 3), 'width': o['width'], 'height': o['height'],
                      'insets': len(tl['windows']), 'talking_head_only': not tl['windows'], 'ok': ok}))
    return 0 if ok else 1


def audio_md5(p):
    need('ffmpeg')
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-map', '0:a:0', '-f', 'md5', '-'], capture_output=True, text=True)
    return r.stdout.strip() if r.returncode == 0 else None


def cmd_samesound(a):
    x, y = audio_md5(a.a), audio_md5(a.b)
    same = bool(x) and x == y
    print(json.dumps({'same_audio': same, 'a': x, 'b': y}))
    return 0 if same else 1


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    sp = ap.add_subparsers(dest='cmd', required=True)
    c = sp.add_parser('cards'); c.add_argument('--capture'); c.add_argument('--out-dir', required=True); c.add_argument('--hero'); c.add_argument('--screens')
    f = sp.add_parser('frames'); f.add_argument('--clip', required=True); f.add_argument('--out-dir', required=True); f.add_argument('--n', type=int, default=6); f.add_argument('--times')
    s = sp.add_parser('spine'); s.add_argument('--clips', nargs='+', required=True); s.add_argument('--out', required=True)
    t = sp.add_parser('timeline'); t.add_argument('--cards', required=True); t.add_argument('--beats', required=True); t.add_argument('--spine', required=True)
    t.add_argument('--timed'); t.add_argument('--out', required=True); t.add_argument('--card-s', type=float, default=1.4); t.add_argument('--gap', type=float, default=0.4); t.add_argument('--min-cards', type=int, default=3)
    o = sp.add_parser('overlay'); o.add_argument('--spine', required=True); o.add_argument('--timeline', required=True); o.add_argument('--out', required=True); o.add_argument('--print', action='store_true')
    m = sp.add_parser('samesound'); m.add_argument('a'); m.add_argument('b')
    a = ap.parse_args()
    if a.cmd == 'cards' and not (a.capture or a.screens):
        ap.error('cards needs --capture or --screens')
    return {'cards': cmd_cards, 'frames': cmd_frames, 'spine': cmd_spine, 'timeline': cmd_timeline, 'overlay': cmd_overlay, 'samesound': cmd_samesound}[a.cmd](a)


if __name__ == '__main__':
    sys.exit(main())
