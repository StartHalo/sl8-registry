#!/usr/bin/env python3
"""Mechanical checks on a finished story-youtube-script markdown file (WF55-a1 step 18).

SL8-authored (not in the source method). Prints figures, never a verdict on taste (HR14).

  python3 script_check.py <script.md> --genre <slug> --minutes <n> [--lane <lane>]
      [--wpm LO-HI] [--vertical] [--monetization-requested] [--json <out.json>]
      [--hooks-heading TEXT] [--script-heading TEXT] [--map-heading TEXT] [--allow PHRASE ...]

A callback phrase ("as I promised", "remember that") must carry a pointer on its line or the next:
[CALLBACK -> m:ss], where m:ss is a script time earlier than the callback.

Exit 0: every measured rule holds (items marked CONFIRM still need the writer to point at
the earlier line); 1: at least one FAIL; 2: bad usage or unreadable input.
Standard library only.
"""
import argparse
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
GENRES = os.path.join(HERE, '..', 'references', 'genres.json')
TS = re.compile(r'\[(?:(\d+):)?(\d{1,2}):(\d{2})\]')
BRACKET = re.compile(r'\[[^\]]*\]')
WORD = re.compile(r"\d+(?:[,.:]\d+)*(?![^\W_])|[^\W_]+(?:['’-][^\W_]+)*")
POINTER = re.compile(r'\[CALLBACK\s*(?:->|→)\s*(?:(\d+):)?(\d{1,2}):(\d{2})\]', re.I)
GRADING = re.compile(r'\bPASS(ED)?\b|\bFAIL(ED)?\b|\b\d+(\.\d+)?\s*/\s*10\b|complian|✓|✔', re.I)
SELF_REPORT = re.compile(r'\bwpm\b|\b\d+\s*words\b|complian|retention[- ]optimi[sz]ed|\bon[- ]target\b', re.I)


def secs(m):
    h = int(m.group(1)) if m.group(1) else 0
    return h * 3600 + int(m.group(2)) * 60 + int(m.group(3)) if m.group(1) else int(m.group(2)) * 60 + int(m.group(3))


def section(lines, heading):
    """Lines (with 1-based numbers) under the level-2 heading that starts with `heading`."""
    out, on = [], False
    for i, line in enumerate(lines, 1):
        if line.startswith('## '):
            on = line[3:].strip().lower().startswith(heading.lower())
            continue
        if on:
            out.append((i, line))
    return out


def spoken(text):
    text = BRACKET.sub(' ', text)
    text = re.sub(r'[*_`>#|]', ' ', text)
    return text


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('file')
    ap.add_argument('--genre', required=True)
    ap.add_argument('--minutes', type=float, required=True)
    ap.add_argument('--lane')
    ap.add_argument('--wpm', help='LO-HI, overrides the lane pace')
    ap.add_argument('--vertical', action='store_true')
    ap.add_argument('--monetization-requested', action='store_true')
    ap.add_argument('--allow', action='append', default=[], help='a money word that is the video\'s subject, not a plug')
    ap.add_argument('--json')
    ap.add_argument('--hooks-heading', default='Hook options')
    ap.add_argument('--script-heading', default='Script')
    ap.add_argument('--map-heading', default='Retention map')
    a = ap.parse_args()

    if a.minutes <= 0:
        print('--minutes must be greater than 0')
        return 2
    try:
        cfg = json.load(open(GENRES, encoding='utf-8'))
        lines = open(a.file, encoding='utf-8').read().splitlines()
    except (OSError, ValueError) as e:
        print(f'cannot read input: {e}')
        return 2
    rows = {r['slug']: r for r in cfg['rows']}
    if a.genre not in rows:
        print(f'unknown genre {a.genre}; one of: {", ".join(rows)}')
        return 2
    g = rows[a.genre]
    lane = a.lane or g['default_lane']
    if lane not in g['lanes']:
        print(f'unknown lane {lane} for {a.genre}; one of: {", ".join(g["lanes"])}')
        return 2
    short = a.minutes <= cfg['short_form_max_min']
    if a.wpm:
        try:
            lo, hi = (float(x) for x in a.wpm.split('-'))
        except ValueError:
            print(f'--wpm must look like 140-150, got {a.wpm}')
            return 2
        if not 0 < lo <= hi:
            print(f'--wpm must look like 140-150, got {a.wpm}')
            return 2
    elif short and 'short_form_wpm' in g:
        lo, hi = g['short_form_wpm']
    else:
        lo, hi = g['lanes'][lane]['wpm']
    lmin = g['lanes'][lane].get('minutes')
    tol = cfg['word_tolerance']
    fails, confirm, figs = [], [], {}

    def fail(msg):
        fails.append(msg)
        print(f'FAIL {msg}')

    def ok(msg):
        print(f'ok   {msg}')

    # Title line: no self-reported pacing or compliance claims.
    titles = [(i, l) for i, l in enumerate(lines, 1) if re.match(r'#{1,3} ', l)]
    for i, l in titles:
        if SELF_REPORT.search(l):
            fail(f'line {i}: a heading reports on the script itself: {l.strip()}')

    hooks = section(lines, a.hooks_heading)
    script = section(lines, a.script_heading)
    rmap = section(lines, a.map_heading)
    for name, sec in (('hooks', hooks), ('script', script), ('retention map', rmap)):
        if not sec:
            fail(f'no "{name}" section found')

    # Three hooks, each within the genre's limit.
    blocks, cur = [], None
    for i, l in hooks:
        if l.startswith('### '):
            cur = [i, l[4:].strip(), []]
            blocks.append(cur)
        elif cur is not None:
            cur[2].append(l)
    figs['hooks'] = len(blocks)
    if len(blocks) != 3:
        fail(f'{len(blocks)} hook headings (### ...) under "{a.hooks_heading}"; three are required')
    else:
        ok('three hook headings')
    for i, title, body in blocks:
        text = spoken(' '.join(body))
        n = len(WORD.findall(text))
        sentences = len([s for s in re.split(r'[.!?]+(?:\s|$)', text) if WORD.search(s)])
        if 'hook_sentences_max' in g:
            cap = round(g['hook_limit_s'] * hi / 60)
            msg = f'hook at line {i} ({title}): {sentences} sentences, {n} words (max {g["hook_sentences_max"]} sentences, about {cap} words in {g["hook_limit_s"]} s)'
            (fail if sentences > g['hook_sentences_max'] or n > cap * (1 + tol) else ok)(msg)
        elif 'hook_words' in g:
            wlo, whi = g['hook_words']
            msg = f'hook at line {i} ({title}): {n} words (range {wlo}-{whi})'
            (fail if not (wlo <= n <= whi) else ok)(msg)

    # Word budget for the spoken script.
    body = '\n'.join(l for _, l in script if not l.startswith('#'))
    words = len(WORD.findall(spoken(body)))
    blo, bhi = a.minutes * lo, a.minutes * hi
    if lmin and not short and not lmin[0] <= a.minutes <= lmin[1]:
        print(f'info {a.minutes:g} min is outside the usual {lmin[0]}-{lmin[1]} min of lane {lane} (a default, not a failure)')
    figs.update(words=words, budget=[round(blo), round(bhi)], tolerance=tol, lane=lane, short_form=short)
    msg = f'{words} spoken words; budget {round(blo)}-{round(bhi)} ({a.minutes:g} min x {lo:g}-{hi:g} wpm, lane {lane}), tolerance {int(tol * 100)}%'
    (fail if not (blo * (1 - tol) <= words <= bhi * (1 + tol)) else ok)(msg)

    # Timestamps in the script: start at 0:00, never go back, spacing per mode.
    stamps = []
    for i, l in script:
        for m in TS.finditer(l):
            stamps.append((i, secs(m), m.group(0)))
    figs['timestamps'] = len(stamps)
    if not stamps:
        fail('no [m:ss] timestamps in the script')
    else:
        if stamps[0][1] != 0:
            fail(f'first timestamp is {stamps[0][2]}, not [0:00]')
        back = [(i, t) for (i, s, t), (_, p, _) in zip(stamps[1:], stamps) if s < p]
        for i, t in back:
            fail(f'line {i}: timestamp {t} goes back in time')
        gaps = [s - p for (_, s, _), (_, p, _) in zip(stamps[1:], stamps)]
        biggest = max(gaps) if gaps else 0
        end = a.minutes * 60
        if stamps[-1][1] > end * (1 + tol):
            fail(f'last timestamp {stamps[-1][2]} is past the target {a.minutes:g} min')
        limit = cfg['short_form']['timestamp_gap_s'][1] if short else g.get('long_form_timestamp_gap_s')
        if limit:
            (fail if biggest > limit else ok)(f'largest timestamp gap {biggest} s (limit {limit} s)')
        else:
            ok(f'largest timestamp gap {biggest} s (no limit set for this genre in long form)')
        figs['largest_gap_s'] = biggest

    # Words against seconds in each timed section (the last runs to the target length).
    if stamps:
        segs, cur = [], None
        for i, l in script:
            pos = 0
            for m in TS.finditer(l):
                if cur is not None:
                    cur[2].append(l[pos:m.start()])
                cur = [i, secs(m), []]
                segs.append(cur)
                pos = m.end()
            if cur is not None:
                cur[2].append(l[pos:])
        sec_tol = cfg.get('section_rate_tolerance', 0.25)
        bad = 0
        for k, (i, t0, parts) in enumerate(segs):
            t1 = segs[k + 1][1] if k + 1 < len(segs) else a.minutes * 60
            if t1 - t0 < 10:
                continue
            w = len(WORD.findall(spoken(' '.join(parts))))
            rate = w * 60 / (t1 - t0)
            if not (lo * (1 - sec_tol) <= rate <= hi * (1 + sec_tol)):
                bad += 1
                fail(f'line {i}: {w} words in the {t1 - t0:g} s from {t0 // 60}:{t0 % 60:02d} is {rate:.0f} wpm; lane band {lo:g}-{hi:g} wpm, tolerance {int(sec_tol * 100)}%')
        if not bad:
            ok(f'every timed section is within the lane band (tolerance {int(sec_tol * 100)}%)')

    # Retention map: every line timestamped, every timestamp in the script, no grades.
    stamp_set = {s_ for _, s_, _ in stamps}
    map_lines = [(i, l) for i, l in rmap if l.strip()]
    figs['retention_lines'] = len(map_lines)
    for i, l in map_lines:
        m = TS.search(l)
        if not m:
            fail(f'line {i}: retention map line has no [m:ss] timestamp')
        elif secs(m) not in stamp_set:
            fail(f'line {i}: retention map timestamp {m.group(0)} is not a timestamp in the script')
        if GRADING.search(l):
            fail(f'line {i}: retention map grades instead of naming a device')
    if short:
        rlo, rhi = cfg['short_form']['retention_lines']
        (fail if not (rlo <= len(map_lines) <= rhi) else ok)(f'{len(map_lines)} retention map lines (short form {rlo}-{rhi})')
    else:
        ok(f'{len(map_lines)} retention map lines')

    # Phrases: banned openers, callbacks, monetization. Matched over the joined hook and script
    # text so a phrase wrapped across lines is found; line numbers come from offsets.
    import bisect
    joined, starts, times, t_now = [], [], [], 0
    off = 0
    for i, l in hooks + script:
        m0 = TS.search(l)
        if m0:
            t_now = secs(m0)
        sp = spoken(l).lower().replace('’', "'")
        starts.append((off, i, t_now))
        joined.append(sp)
        off += len(sp) + 1
    text = ' '.join(joined)
    offs = [o for o, _, _ in starts]

    def where(pos):
        k = bisect.bisect_right(offs, pos) - 1
        return starts[k][1], starts[k][2]

    def rx(p):
        parts = [re.escape(w) for w in p.split()]
        return r'(?<!\w)' + r'\s+'.join(parts) + r'(?!\w)'

    banned = cfg['banned_everywhere'] + g.get('banned', [])
    for p in banned:
        for m in re.finditer(rx(p), text):
            fail(f'line {where(m.start())[0]}: banned phrase "{p}"')
    raw = {i: l for i, l in hooks + script}
    for p in cfg['callback_phrases']:
        for m in re.finditer(rx(p), text):
            ln, now = where(m.start())
            ptr = POINTER.search(raw.get(ln, '')) or POINTER.search(raw.get(ln + 1, ''))
            if not ptr:
                fail(f'line {ln}: callback "{p}" has no [CALLBACK -> m:ss] pointer to the line it recalls')
            elif secs(ptr) not in stamp_set or secs(ptr) >= now:
                fail(f'line {ln}: callback "{p}" points to {ptr.group(0)}, which is not an earlier script time')
            else:
                confirm.append(f'line {ln}: callback "{p}" points to {ptr.group(0)}: check the earlier line plants it')
    allowed = [x.lower() for x in a.allow]
    if not a.monetization_requested:
        for p in cfg['monetization_phrases']:
            for m in re.finditer(r'\b(?:' + p + r')', text):
                if any(w in m.group(0) for w in allowed):
                    continue
                fail(f'line {where(m.start())[0]}: monetization phrase "{m.group(0)}" with no requested integration (pass --allow "{m.group(0)}" if it is the video\'s subject)')
    for c in confirm:
        print(f'CONFIRM {c}')

    # Vertical Shorts: a picture cue on the first timed line or before the first spoken word.
    if a.vertical:
        first_spoken = next((i for i, l in script if WORD.search(spoken(TS.sub(' ', l))) ), None)
        limit_i = min(x for x in (first_spoken, stamps[0][0] if stamps else None) if x is not None) if (first_spoken or stamps) else None
        cue = next((i for i, l in script if limit_i is not None and i <= limit_i and BRACKET.search(TS.sub('', l).replace('[VERIFY', ''))), None)
        sec_ = cfg['short_form']['vertical_first_visual_s']
        (ok if cue else fail)(f'vertical: a picture cue on the first line or before the first spoken word (key picture within {sec_} s)' if cue else f'vertical: no picture cue on the [0:00] line or before the first spoken word (key picture within {sec_} s)')

    verify = [(i, l.strip()) for i, l in script if '[VERIFY' in l]
    figs['verify_tags'] = len(verify)
    print(f'info {len(verify)} [VERIFY: ...] tag(s) to list in the delivery')

    if a.json:
        try:
            os.makedirs(os.path.dirname(os.path.abspath(a.json)), exist_ok=True)
            with open(a.json, 'w', encoding='utf-8') as fh:
                json.dump({'figures': figs, 'fails': fails, 'confirm': confirm}, fh, indent=1)
        except OSError as e:
            print(f'cannot write {a.json}: {e}')
            print(f'script_check: {len(fails)} problem(s), {len(confirm)} to confirm')
            return 2
    print(f'script_check: {len(fails)} problem(s), {len(confirm)} to confirm')
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(main())
