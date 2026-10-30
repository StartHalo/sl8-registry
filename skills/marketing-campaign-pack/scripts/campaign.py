#!/usr/bin/env python3
"""Campaign matrix checks for marketing-campaign-pack (SL8-authored; no vendor file copied).

  python3 campaign.py check    <matrix.json>                      matrix before generation: intake, roles, seven fields, seven layers, variants
  python3 campaign.py total    <matrix.json> [--budget N] [--reserve R]  sum of the per-row quotes (one call per row) plus the regeneration reserve; exit 1 over budget or an unknown price
  python3 campaign.py guide    <image> --out <png> [--band T,B,S] draw the 9:16 everywhere-safe band on a still or a frame, for review
  python3 campaign.py manifest <matrix.json> --project-dir <dir>  campaign/manifest.json and .md from the matrix and media-ai-gen's manifest.json

Each command prints one JSON line of figures. Exit 0 ok, 1 the input fails a rule (each failure is listed), 2 usage
or unreadable input. It never writes PASS for taste: the four-check review is the agent's look at the files.
"""
import json
import os
import re
import sys

ROLES = ['hook', 'proof', 'context', 'conversion', 'retention']
FIELDS = ['role', 'channel', 'crop', 'format', 'route', 'prompt_summary', 'guardrails']
COPY_MODES = ['no generated text', 'safe space', 'exact provided wording']
REQUIRED_INTAKE = ['objective', 'audience', 'offer', 'channels']
FORMATS = {'png', 'jpg', 'jpeg', 'webp', 'mp4'}
# Seedance 2.0 aspect enum and duration form (facts schema-seedance20-aspect, schema-seedance20-duration, 2026-10-06).
SEEDANCE_ASPECT = {'21:9', '16:9', '4:3', '1:1', '3:4', '9:16'}
VARIANT_FIXED = ['crop', 'format', 'route', 'references', 'portrait', 'speech']
CREATOR_ROUTES = ('veed/', 'fal-ai/creatify/')
DELEGATES = {'none', 'image-product-presets'}
GUARD_WORDS = {'fake claims': r'claim', 'extra logos': r'logo', 'distorted UI': r'\bUI\b|interface', 'fake proof': r'proof'}


def out(obj, code):
    print(json.dumps(obj, ensure_ascii=False))
    sys.exit(code)


def load(p):
    try:
        with open(p, encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:  # noqa: BLE001
        out({'error': f'cannot read {p}: {e}'}, 2)


def empty(v):
    return v is None or (isinstance(v, str) and not v.strip()) or (isinstance(v, (list, dict)) and not v)


def check(path):
    m = load(path)
    fails, notes = [], []
    intake = m.get('intake') or {}
    for k in REQUIRED_INTAKE:
        if empty(intake.get(k)):
            fails.append(f'intake.{k} is required')
    channels = intake.get('channels') or []
    claims = intake.get('claims') or {}
    approved = [str(c) for c in (claims.get('approved_copy') or [])]
    assets = m.get('assets') or []
    if not assets:
        fails.append('no assets: the matrix must list one row per asset before any generation')
    ids, seen_roles = set(), set()
    vs = m.get('visual_system')
    if empty(vs):
        fails.append('visual_system (the layer 4 text reused by every asset) is missing')
    by_id = {a.get('id'): a for a in assets}
    for i, a in enumerate(assets):
        aid = a.get('id') or f'#{i}'
        if aid in ids:
            fails.append(f'{aid}: duplicate id')
        ids.add(aid)
        if not re.fullmatch(r'[a-z0-9]+(-[a-z0-9]+)*', str(aid)):
            fails.append(f'{aid}: id must be kebab-case (<role>-<channel>-v<n>)')
        for f in FIELDS:
            if empty(a.get(f)):
                fails.append(f'{aid}: field {f} is empty')
        role = a.get('role')
        if role not in ROLES:
            fails.append(f'{aid}: role {role!r} is not one of {ROLES}')
        seen_roles.add(role)
        ch = a.get('channel')
        if channels and ch and not any(str(ch).lower().startswith(str(c).lower()) or str(c).lower() in str(ch).lower() for c in channels):
            fails.append(f'{aid}: channel {ch!r} is not among intake.channels')
        crop = str(a.get('crop') or '')
        if not re.fullmatch(r'\d+:\d+', crop):
            fails.append(f'{aid}: crop {crop!r} must be W:H')
        fmt = str(a.get('format') or '').lower()
        if fmt and fmt not in FORMATS:
            fails.append(f'{aid}: format {fmt!r} not in {sorted(FORMATS)}')
        if a.get('count') not in (None, 1):
            fails.append(f'{aid}: count {a.get("count")!r}: a row is one call; add sibling rows (params num_images stays 1)')
        if a.get('delegate') is not None and a.get('delegate') not in DELEGATES:
            fails.append(f'{aid}: delegate {a.get("delegate")!r} is not one of {sorted(DELEGATES)}')
        mode = a.get('copy_mode')
        if mode not in COPY_MODES:
            fails.append(f'{aid}: copy_mode {mode!r} is not one of {COPY_MODES}')
        if mode == 'exact provided wording':
            words = str(a.get('copy') or '')
            if not words or words not in approved:
                fails.append(f'{aid}: exact wording must be one entry of intake.claims.approved_copy, verbatim')
            if 'gpt-image-2' not in str(a.get('route') or ''):
                fails.append(f'{aid}: exact wording is sent to openai/gpt-image-2 (route is {a.get("route")!r})')
            if empty(a.get('waiver')):
                fails.append(f'{aid}: exact wording needs a waiver naming the manifest.mjs waive record (HR10, HR20)')
        layers = a.get('layers') or {}
        for n in range(1, 8):
            if empty(layers.get(str(n))):
                fails.append(f'{aid}: prompt layer {n} is empty')
        if vs and layers.get('4') and layers.get('4') != vs and empty(a.get('visual_system_override')):
            fails.append(f'{aid}: layer 4 differs from visual_system (state visual_system_override with a reason)')
        g = ' '.join([str(layers.get('7') or ''), str(a.get('guardrails') or '')])
        for name, rx in GUARD_WORDS.items():
            if not re.search(rx, g, re.I):
                fails.append(f'{aid}: guardrails do not name {name}')
        route = str(a.get('route') or '')
        if route.startswith(CREATOR_ROUTES) or not empty(a.get('portrait')):
            if empty(a.get('consent')):
                fails.append(f'{aid}: a creator-ad row needs consent (HR17); without it spend nothing for the row')
            if not isinstance(a.get('price'), dict) or not isinstance(a['price'].get('credits'), (int, float)):
                fails.append(f'{aid}: a creator-ad row needs a numeric price (an unpriced route cannot run inside a budget)')
        if fmt == 'mp4' and 'seedance' in route:
            if crop not in SEEDANCE_ASPECT:
                fails.append(f'{aid}: Seedance 2.0 has no {crop} aspect (enum {sorted(SEEDANCE_ASPECT)})')
            d = a.get('duration')
            if not (isinstance(d, str) and d.isdigit() and 4 <= int(d) <= 15):
                fails.append(f'{aid}: Seedance duration must be a bare-integer string "4" to "15", got {d!r}')
            if 'image-to-video' in route:
                src = a.get('from_still')
                if not src or src not in by_id:
                    fails.append(f'{aid}: image-to-video needs from_still naming a still row in this matrix')
                elif by_id[src].get('crop') != crop:
                    fails.append(f'{aid}: still {src} is {by_id[src].get("crop")}, the clip is {crop}: make the still at the clip ratio')
        base = a.get('variant_of')
        if base:
            b = by_id.get(base)
            if not b:
                fails.append(f'{aid}: variant_of {base!r} is not a row')
            else:
                bl = b.get('layers') or {}
                diff = [str(n) for n in range(1, 8) if str(n) != '6' and bl.get(str(n)) != layers.get(str(n))]
                if diff:
                    fails.append(f'{aid}: variant of {base} differs outside layer 6 (layers {",".join(diff)})')
                for k in VARIANT_FIXED:
                    if b.get(k) != a.get(k):
                        fails.append(f'{aid}: variant of {base} differs on {k}: only layer 6 may differ')
                if bl.get('6') == layers.get('6'):
                    fails.append(f'{aid}: variant of {base} has the same layer 6: name the one axis that differs')
    omitted = m.get('omitted_roles') or {}
    for r in ROLES:
        if r not in seen_roles and empty(omitted.get(r)):
            fails.append(f'role {r} has no asset and no stated reason in omitted_roles')
    figs = {'assets': len(assets), 'roles': sorted(r for r in seen_roles if r), 'omitted_roles': sorted(omitted),
            'videos': sum(1 for a in assets if str(a.get('format', '')).lower() == 'mp4'),
            'variants': sum(1 for a in assets if a.get('variant_of'))}
    out({'check': 'matrix', 'file': path, 'figures': figs, 'fails': fails, 'notes': notes}, 1 if fails else 0)


def total(path, budget=None, reserve=None):
    m = load(path)
    s, unknown, rows = 0, [], 0
    stills, clips = [], []
    for a in m.get('assets') or []:
        rows += 1
        p = a.get('price')
        c = p.get('credits') if isinstance(p, dict) else None
        if isinstance(c, (int, float)):
            s += c  # one row is one call
            (clips if str(a.get('format', '')).lower() == 'mp4' else stills).append(c)
        else:
            unknown.append(a.get('id'))
    # default reserve: one regeneration of the dearest still and of the dearest clip (SKILL.md step 8)
    res = reserve if reserve is not None else (max(stills, default=0) + max(clips, default=0))
    if budget is None:
        budget = (m.get('budget') or {}).get('credits')
    over = budget is not None and s + res > budget
    out({'check': 'total', 'rows': rows, 'credits': round(s, 2), 'reserve': round(res, 2), 'with_reserve': round(s + res, 2),
         'budget': budget, 'over_budget': over if budget is not None else None, 'price_unknown': unknown,
         'note': 'credits only (about 250 credits = $1); a row without a quote is price unknown, never a remembered rate; no budget given means open a spend gate'},
        1 if (unknown or over) else 0)


def guide(img, outp, band):
    try:
        from PIL import Image, ImageDraw
    except Exception as e:  # noqa: BLE001
        out({'error': f'Pillow missing: {e} (report it; never install, HR21)'}, 2)
    t, b, s = band
    im = Image.open(img).convert('RGBA')
    w, h = im.size
    ov = Image.new('RGBA', im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    red = (255, 0, 0, 90)
    d.rectangle([0, 0, w, int(h * t)], fill=red)
    d.rectangle([0, h - int(h * b), w, h], fill=red)
    d.rectangle([0, 0, int(w * s), h], fill=red)
    d.rectangle([w - int(w * s), 0, w, h], fill=red)
    Image.alpha_composite(im, ov).convert('RGB').save(outp)
    out({'check': 'guide', 'file': img, 'out': outp, 'w': w, 'h': h, 'aspect': round(w / h, 4),
         'band': {'top': t, 'bottom': b, 'sides': s},
         'note': 'review aid only: look for hook, product, proof and copy inside the clear area'}, 0)


def manifest(path, pdir):
    m = load(path)
    mf = os.path.join(pdir, 'manifest.json')
    rows = load(mf).get('assets', []) if os.path.exists(mf) else []
    items, defects = [], []
    for a in m.get('assets') or []:
        mine = [r for r in rows if r.get('item') == a.get('id')]
        last = mine[-1] if mine else {}
        files = [f.get('path') if isinstance(f, dict) else f for f in (last.get('files') or [])]
        items.append({k: a.get(k) for k in FIELDS} | {
            'id': a.get('id'), 'variation_axis': (a.get('layers') or {}).get('6'), 'endpoint': last.get('endpoint'),
            'request_id': last.get('request_id'), 'delegate': a.get('delegate') or 'none', 'review': a.get('review') or '',
            'credits_used': (last.get('credits') or {}).get('used') if isinstance(last.get('credits'), dict) else None, 'files': files, 'attempts': len(mine),
            'status': last.get('status') or 'not generated', 'defects': a.get('defects') or []})
        for dft in a.get('defects') or []:
            defects.append({'asset': a.get('id'), 'defect': dft})
        if mine and last.get('status') == 'failed' and not (a.get('defects') or []):
            defects.append({'asset': a.get('id'), 'defect': 'last attempt failed (status failed in manifest.json)'})
        if not mine:
            defects.append({'asset': a.get('id'), 'defect': 'no generation recorded in manifest.json'})
    res = {'schema': 'sl8.campaign.manifest/1', 'project': m.get('project'), 'assets': items, 'defects': defects}
    cdir = os.path.join(pdir, 'campaign')
    os.makedirs(cdir, exist_ok=True)
    with open(os.path.join(cdir, 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(res, f, indent=1, ensure_ascii=False)
    md = ['# Campaign manifest', '', '| id | role | channel | crop | format | route | delegate | variation axis | credits used | files | status | review |',
          '|---|---|---|---|---|---|---|---|---|---|---|---|']
    for it in items:
        md.append('| ' + ' | '.join(str(x).replace('|', '/') for x in [it['id'], it['role'], it['channel'], it['crop'], it['format'],
                  it['endpoint'] or it['route'], it['delegate'], it['variation_axis'], it['credits_used'] if it['credits_used'] is not None else '-', ', '.join(it['files']) or '-', it['status'], it['review'] or '-']) + ' |')
    md += ['', '## Defects', '']
    md += [f'- {d["asset"]}: {d["defect"]}' for d in defects] or ['- none found']
    with open(os.path.join(cdir, 'manifest.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(md) + '\n')
    out({'check': 'manifest', 'assets': len(items), 'defects': len(defects), 'out': os.path.join(cdir, 'manifest.json')}, 0)


def main(a):
    if len(a) < 2:
        out({'error': __doc__.strip().splitlines()[0]}, 2)
    cmd, arg = a[0], a[1]
    opt = lambda n, d=None: a[a.index(n) + 1] if n in a and a.index(n) + 1 < len(a) else d  # noqa: E731
    if cmd == 'check':
        check(arg)
    elif cmd == 'total':
        b, r = opt('--budget'), opt('--reserve')
        total(arg, float(b) if b else None, float(r) if r else None)
    elif cmd == 'guide':
        o = opt('--out')
        if not o:
            out({'error': 'guide needs --out'}, 2)
        band = [float(x) for x in opt('--band', '0.14,0.35,0.06').split(',')]
        guide(arg, o, band)
    elif cmd == 'manifest':
        d = opt('--project-dir')
        if not d:
            out({'error': 'manifest needs --project-dir'}, 2)
        manifest(arg, d)
    else:
        out({'error': f'unknown command {cmd}'}, 2)


if __name__ == '__main__':
    main(sys.argv[1:])
