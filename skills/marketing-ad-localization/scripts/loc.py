#!/usr/bin/env python3
"""Campaign helpers for marketing-ad-localization (SL8-authored; no vendor file copied).

  loc.py plan --source-root DIR --source-code en --targets de,fr --project-dir artifacts/<p> [--map map.json]
              [--mode RGB] [--min-bytes 50000] [--width W --height H]
  loc.py crops IMAGE --out DIR [--tile 1024]
  loc.py canvas IN --width W --height H --out OUT   (the format follows OUT's extension: .png, .jpg/.jpeg, .webp;
              also the way to convert an accepted candidate to its target name's format)
  loc.py verify LANGUAGE_MANIFEST [--report FILE]
  loc.py verify-project PROJECT_MANIFEST [--report FILE]
  loc.py sheets ROOT --output DIR [--columns 5]
  loc.py ocr ROOT --langs eng+deu --output FILE [--tsv-dir DIR]
  loc.py proof --copy FILE --font FONT --out PNG [--rtl] [--line-spacing 1.35] [--size 64] [--latin-only]
  loc.py reconcile PROJECT_MANIFEST --export CSV --column NAME
  loc.py hashlock write DIR --out FILE | loc.py hashlock verify FILE

Exit codes: 0 pass or written; 1 a check failed or a refusal; 2 bad usage or a missing tool.
Python 3.11 with Pillow; tesseract for `ocr`; Pillow with libraqm for `proof` on complex scripts.
"""
import argparse
import csv
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

IMG_EXT = {'.png', '.jpg', '.jpeg', '.webp'}


def die(msg, code=1):
    print(json.dumps({'ok': False, 'error': msg}), file=sys.stderr)
    sys.exit(code)


def pil():
    try:
        from PIL import Image  # noqa: F401
        import PIL
        return PIL
    except Exception:
        die('Pillow is not importable; the machine is broken (HR21: report, never install)', 2)


def images_in(folder):
    return sorted(p for p in Path(folder).iterdir() if p.is_file() and p.suffix.lower() in IMG_EXT and not p.name.startswith('.'))


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for block in iter(lambda: f.read(1 << 20), b''):
            h.update(block)
    return h.hexdigest()


def swap_token(name, src, tgt):
    """Replace only a leading language token (followed by a space, dash, underscore or dot)."""
    m = re.match(rf'^({re.escape(src)})(?=[\s_.\-])', name, re.I)
    if not m:
        return name
    tok = tgt.upper() if m.group(1).isupper() else tgt.lower() if m.group(1).islower() else tgt
    return tok + name[m.end():]


# ---------------------------------------------------------------- plan
def cmd_plan(a):
    PIL = pil()
    from PIL import Image
    src_root = Path(a.source_root).resolve()
    if not src_root.is_dir():
        die(f'no source root {src_root}')
    proj = Path(a.project_dir).resolve()
    run = proj / 'run'
    pm_path = run / 'project-manifest.json'
    if pm_path.exists():
        die(f'{pm_path} exists: the contract is locked; resume from it (never re-plan from the filesystem)')
    mapping = json.loads(Path(a.map).read_text()) if a.map else {}
    batches = sorted(d for d in src_root.iterdir() if d.is_dir() and not d.name.startswith('.') and images_in(d))
    flat = images_in(src_root)
    if flat and batches:
        die('source root mixes loose images and batch folders; give one layout')
    if not flat and not batches:
        die('no images under the source root')
    deep = sorted(str(p.relative_to(src_root)) for p in src_root.rglob('*')
                  if p.is_file() and p.suffix.lower() in IMG_EXT and not p.name.startswith('.')
                  and len(p.relative_to(src_root).parts) > 2)
    if deep:
        die(f'images below the batch folders would be skipped (one level only): {deep[:5]}; flatten them or plan each folder apart')
    targets = [t.strip() for t in a.targets.split(',') if t.strip()]
    if len(set(t.lower() for t in targets)) != len(targets) or a.source_code.lower() in [t.lower() for t in targets]:
        die('target codes must be distinct and differ from the source code')
    groups = [('.', flat)] if flat else [(d.name, images_in(d)) for d in batches]
    lang_paths = []
    total = 0
    (run / 'manifests').mkdir(parents=True, exist_ok=True)
    for code in targets:
        lmap = mapping.get(code, {})
        target_root = proj / 'final' / code
        out_batches = []
        seen = set()
        for folder, files in groups:
            tfolder = '.' if folder == '.' else lmap.get(folder, swap_token(folder, a.source_code, code))
            items = []
            for f in files:
                rel = f.name if folder == '.' else f'{folder}/{f.name}'
                tname = lmap.get(rel, swap_token(f.name, a.source_code, code))
                key = f'{tfolder}/{tname}'
                if key in seen:
                    die(f'two sources map to {key} for {code}')
                seen.add(key)
                with Image.open(f) as im:
                    w, h = im.size
                items.append({'source': f.name, 'target': tname,
                              'width': a.width or w, 'height': a.height or h})
            out_batches.append({'source_folder': folder, 'target_folder': tfolder,
                                'expected_count': len(files), 'items': items})
            total += len(files)
        man = {'language': code, 'source_code': a.source_code, 'target_code': code,
               'source_root': str(src_root), 'target_root': str(target_root),
               'mode': a.mode, 'min_bytes': a.min_bytes,
               'ocr_path': str(proj / 'qa' / code / 'ocr.json'), 'batches': out_batches}
        p = run / 'manifests' / f'{code}.json'
        p.write_text(json.dumps(man, indent=1, ensure_ascii=False))
        lang_paths.append(f'manifests/{code}.json')
        for b in out_batches:
            (target_root / b['target_folder']).mkdir(parents=True, exist_ok=True)
        (proj / 'qa' / code).mkdir(parents=True, exist_ok=True)
    pm = {'project': proj.name, 'source_root': str(src_root), 'project_dir': str(proj),
          'languages_expected': len(targets), 'folders_expected': len(groups) * len(targets),
          'images_expected': total, 'source_images_expected': sum(len(g[1]) for g in groups),
          'language_manifests': lang_paths,
          'counting_rule': 'finals only: files directly inside final/<code>/<target folder>/; qa/, run/, candidates/ and source/ are never counted',
          'uploader_reconciled': False}
    pm_path.write_text(json.dumps(pm, indent=1, ensure_ascii=False))
    print(json.dumps({'ok': True, 'project_manifest': str(pm_path), 'languages': targets,
                      'folders_per_language': len(groups), 'sources': pm['source_images_expected'],
                      'finals_expected': total,
                      'mapping_sample': {t: json.loads((run / 'manifests' / f'{t}.json').read_text())['batches'][0]['items'][0]['target'] for t in targets}},
                     ensure_ascii=False, indent=1))


# ---------------------------------------------------------------- crops / canvas
def cmd_crops(a):
    pil()
    from PIL import Image
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    with Image.open(a.image) as im:
        w, h = im.size
        n = 0
        for y in range(0, h, a.tile):
            for x in range(0, w, a.tile):
                tile = im.crop((x, y, min(x + a.tile, w), min(y + a.tile, h)))
                p = out / f'{Path(a.image).stem}_x{x}_y{y}.png'
                tile.save(p)
                n += 1
    print(json.dumps({'ok': True, 'tiles': n, 'size': [w, h], 'dir': str(out)}))


def cmd_canvas(a):
    pil()
    from PIL import Image
    with Image.open(a.input) as im:
        im.load()
        w, h = im.size
        scale = max(a.width / w, a.height / h)
        nw, nh = max(a.width, round(w * scale)), max(a.height, round(h * scale))
        r = im.resize((nw, nh), Image.LANCZOS) if (nw, nh) != (w, h) else im.copy()
        left, top = (nw - a.width) // 2, (nh - a.height) // 2
        r = r.crop((left, top, left + a.width, top + a.height))
        if r.mode not in ('RGB', 'RGBA', 'L'):
            r = r.convert('RGB')
        ext = Path(a.out).suffix.lower()
        if ext in ('.jpg', '.jpeg'):
            r.convert('RGB').save(a.out, format='JPEG', quality=95)
        elif ext == '.webp':
            r.convert('RGB').save(a.out, format='WEBP', quality=95)
        else:
            r.save(a.out, format='PNG')
    with Image.open(a.out) as chk:
        ok = chk.size == (a.width, a.height)
        print(json.dumps({'ok': ok, 'in': [w, h], 'out': list(chk.size),
                          'cropped_px': {'x': nw - a.width, 'y': nh - a.height},
                          'note': 'look at the result: a crop that cuts text or a face fails the asset gate'}))
    sys.exit(0 if ok else 1)


# ---------------------------------------------------------------- verify
def verify_language(man_path):
    pil()
    from PIL import Image
    man = json.loads(Path(man_path).read_text())
    fails = []
    tr = Path(man['target_root'])
    sr = Path(man['source_root'])
    batches = man.get('batches') or []
    if not batches:
        fails.append('manifest has no batches')
    expected_folders = {b['target_folder'] for b in batches if b['target_folder'] != '.'}
    if expected_folders and tr.is_dir():
        actual = {d.name for d in tr.iterdir() if d.is_dir() and not d.name.startswith('.')}
        if actual != expected_folders:
            fails.append({'folder_set': {'missing': sorted(expected_folders - actual), 'unexpected': sorted(actual - expected_folders)}})
    hashes, dims, count, total_expected = {}, [], 0, 0
    for b in batches:
        exp = b.get('expected_count')
        if not isinstance(exp, int) or exp <= 0:
            fails.append({'batch': b['target_folder'], 'expected_count': 'missing or 0: fill it from the locked contract'})
            continue
        total_expected += exp
        sdir = sr if b['source_folder'] == '.' else sr / b['source_folder']
        tdir = tr if b['target_folder'] == '.' else tr / b['target_folder']
        sfiles = images_in(sdir) if sdir.is_dir() else []
        tfiles = images_in(tdir) if tdir.is_dir() else []
        if len(sfiles) != exp:
            fails.append({'batch': b['target_folder'], 'source_count': len(sfiles), 'expected': exp})
        if len(tfiles) != exp:
            fails.append({'batch': b['target_folder'], 'target_count': len(tfiles), 'expected': exp})
        want = {i['target']: i for i in b.get('items', [])}
        have = {f.name for f in tfiles}
        if set(want) != have:
            fails.append({'batch': b['target_folder'], 'mapping': {'missing': sorted(set(want) - have), 'unexpected': sorted(have - set(want))}})
        for f in tfiles:
            count += 1
            item = want.get(f.name)
            try:
                with Image.open(f) as im:
                    im.verify()
                with Image.open(f) as im:
                    im.load()
                    mode, size, fmt = im.mode, im.size, (im.format or '').upper()
            except Exception as e:  # noqa: BLE001
                fails.append({'file': str(f), 'decode': str(e)})
                continue
            dims.append(size)
            want_fmt = {'.png': 'PNG', '.jpg': 'JPEG', '.jpeg': 'JPEG', '.webp': 'WEBP'}.get(f.suffix.lower())
            if want_fmt and fmt != want_fmt:
                fails.append({'file': f.name, 'format': fmt, 'expected_for_extension': want_fmt})
            if man.get('mode') and mode != man['mode']:
                fails.append({'file': f.name, 'mode': mode, 'expected': man['mode']})
            if item and (size[0], size[1]) != (item['width'], item['height']):
                fails.append({'file': f.name, 'size': list(size), 'expected': [item['width'], item['height']]})
            if f.stat().st_size <= int(man.get('min_bytes') or 0):
                fails.append({'file': f.name, 'bytes': f.stat().st_size, 'floor': man.get('min_bytes')})
            hashes.setdefault(sha256(f), []).append(str(f))
    dups = [v for v in hashes.values() if len(v) > 1]
    if dups:
        fails.append({'duplicate_hashes': dups})
    if count != total_expected:
        fails.append({'image_count': count, 'expected': total_expected})
    ocr = None
    op = man.get('ocr_path')
    if op and Path(op).exists():
        data = json.loads(Path(op).read_text())
        ocr = {'files': len(data), 'errors': sum(1 for d in data if d.get('error')),
               'lines': sum(len(d.get('lines') or []) for d in data),
               'zero_line_files': sum(1 for d in data if not d.get('lines'))}
    rng = None
    if dims:
        rng = {'width': [min(d[0] for d in dims), max(d[0] for d in dims)], 'height': [min(d[1] for d in dims), max(d[1] for d in dims)]}
    return {'language': man.get('language'), 'passed': not fails, 'failure_count': len(fails),
            'image_count': count, 'unique_hashes': len(hashes), 'dimension_range': rng, 'ocr': ocr,
            'failures': fails}, hashes


def cmd_verify(a):
    rep, _ = verify_language(a.manifest)
    if a.report:
        Path(a.report).write_text(json.dumps(rep, indent=1, ensure_ascii=False))
    print(json.dumps({k: v for k, v in rep.items() if k != 'failures'} | {'first_failures': rep['failures'][:5]}, ensure_ascii=False))
    sys.exit(0 if rep['passed'] else 1)


def cmd_verify_project(a):
    pm_path = Path(a.manifest).resolve()
    pm = json.loads(pm_path.read_text())
    fails, langs, glob, folders, images = [], [], {}, 0, 0
    for key in ('languages_expected', 'folders_expected', 'images_expected'):
        if not isinstance(pm.get(key), int) or pm[key] <= 0:
            fails.append({key: 'missing or 0: fill it from the request, never from the filesystem'})
    for rel in pm.get('language_manifests', []):
        mp = (pm_path.parent / rel) if not os.path.isabs(rel) else Path(rel)
        rep, hashes = verify_language(mp)
        langs.append({k: rep[k] for k in ('language', 'passed', 'failure_count', 'image_count')})
        if not rep['passed']:
            fails.append({'language': rep['language'], 'failures': rep['failures'][:10]})
        man = json.loads(mp.read_text())
        folders += len(man.get('batches', []))
        images += rep['image_count']
        for h, files in hashes.items():
            glob.setdefault(h, []).extend(files)
    shared = [v for v in glob.values() if len(v) > 1]
    if shared:
        fails.append({'hash_shared': shared[:20]})
    for key, got in (('languages_expected', len(langs)), ('folders_expected', folders), ('images_expected', images)):
        if isinstance(pm.get(key), int) and pm[key] != got:
            fails.append({key: pm[key], 'actual': got})
    rep = {'project': pm.get('project'), 'passed': not fails, 'languages': langs, 'folders': folders,
           'images': images, 'unique_hashes': len(glob), 'failures': fails}
    if a.report:
        Path(a.report).write_text(json.dumps(rep, indent=1, ensure_ascii=False))
    print(json.dumps({k: v for k, v in rep.items() if k != 'failures'} | {'failure_count': len(fails)}, ensure_ascii=False))
    sys.exit(0 if rep['passed'] else 1)


# ---------------------------------------------------------------- sheets
def label_font(size):
    from PIL import ImageFont
    path = None
    if shutil.which('fc-match'):
        try:
            path = subprocess.run(['fc-match', '-f', '%{file}', 'DejaVu Sans'], capture_output=True, text=True, timeout=10).stdout.strip()
        except Exception:  # noqa: BLE001
            path = None
    try:
        return ImageFont.truetype(path, size) if path else ImageFont.load_default()
    except Exception:  # noqa: BLE001
        return ImageFont.load_default()


def cmd_sheets(a):
    pil()
    from PIL import Image, ImageDraw, ImageOps
    root = Path(a.root)
    out = Path(a.output)
    out.mkdir(parents=True, exist_ok=True)
    folders = sorted(d for d in root.iterdir() if d.is_dir() and not d.name.startswith('.')) or [root]
    made = []
    font = label_font(15)
    for d in folders:
        files = images_in(d)
        if not files:
            continue
        with Image.open(files[0]) as first:
            ratio = first.size[0] / first.size[1]
        tw = 282 if ratio <= 1 else 400
        th = round(tw / ratio)
        cols = max(1, min(a.columns, len(files)))
        rows = -(-len(files) // cols)
        margin, gap, lab = 24, 18, 40
        sheet = Image.new('RGB', (margin * 2 + cols * tw + (cols - 1) * gap, margin * 2 + rows * (th + lab) + (rows - 1) * gap), '#191919')
        draw = ImageDraw.Draw(sheet)
        for i, f in enumerate(files):
            r, c = divmod(i, cols)
            x, y = margin + c * (tw + gap), margin + r * (th + lab + gap)
            with Image.open(f) as im:
                t = ImageOps.contain(im.convert('RGB'), (tw, th), Image.LANCZOS)
            sheet.paste(t, (x + (tw - t.size[0]) // 2, y + (th - t.size[1]) // 2))
            name = f.name if len(f.name) <= 40 else f.name[:37] + '...'
            draw.text((x, y + th + 6), name, fill='#e6e6e6', font=font)
        stem = re.sub(r'[^\w.]+', '-', d.name).strip('-') if d != root else 'all'
        p = out / f'{stem}-contact-sheet.jpg'
        sheet.save(p, quality=92)
        made.append({'folder': d.name, 'tiles': len(files), 'sheet': str(p)})
    print(json.dumps({'ok': True, 'sheets': made, 'note': 'triage only: open full-resolution finals for edges, clipping and margins'}, ensure_ascii=False))


# ---------------------------------------------------------------- ocr
def cmd_ocr(a):
    if not shutil.which('tesseract'):
        die('tesseract is not on this machine; record OCR as unavailable (a lead only, never a failure)', 2)
    root = Path(a.root)
    files = sorted(p for p in root.rglob('*') if p.is_file() and p.suffix.lower() in IMG_EXT and not any(part.startswith('.') for part in p.relative_to(root).parts))
    tsv_dir = Path(a.tsv_dir) if a.tsv_dir else None
    if tsv_dir:
        tsv_dir.mkdir(parents=True, exist_ok=True)
    out = []
    for f in files:
        rec = {'path': str(f), 'lines': [], 'error': None}
        try:
            from PIL import Image
            with Image.open(f) as im:
                W, H = im.size
            r = subprocess.run(['tesseract', str(f), 'stdout', '-l', a.langs, '--psm', '11', 'tsv'], capture_output=True, text=True, timeout=300)
            if r.returncode != 0:
                rec['error'] = (r.stderr.strip() or f'tesseract exit {r.returncode}')[:400]
            else:
                if tsv_dir:
                    (tsv_dir / f'{f.stem}.tsv').write_text(r.stdout)
                lines = {}
                for row in csv.DictReader(r.stdout.splitlines(), delimiter='\t', quoting=csv.QUOTE_NONE):
                    txt = (row.get('text') or '').strip()
                    if row.get('level') != '5' or not txt:
                        continue
                    k = (row['block_num'], row['par_num'], row['line_num'])
                    x, y, w, h, conf = int(row['left']), int(row['top']), int(row['width']), int(row['height']), float(row['conf'])
                    L = lines.setdefault(k, {'words': [], 'conf': [], 'x0': x, 'y0': y, 'x1': x + w, 'y1': y + h})
                    L['words'].append(txt)
                    L['conf'].append(conf)
                    L['x0'], L['y0'] = min(L['x0'], x), min(L['y0'], y)
                    L['x1'], L['y1'] = max(L['x1'], x + w), max(L['y1'], y + h)
                recs = [{'text': ' '.join(L['words']), 'confidence': round(sum(L['conf']) / len(L['conf']) / 100, 3),
                         'x': round(L['x0'] / W, 4), 'y': round(L['y0'] / H, 4),
                         'width': round((L['x1'] - L['x0']) / W, 4), 'height': round((L['y1'] - L['y0']) / H, 4)} for L in lines.values()]
                recs.sort(key=lambda d: (round(d['y'] / 0.01), d['x']))
                rec['lines'] = recs
        except Exception as e:  # noqa: BLE001
            rec['error'] = str(e)[:400]
        out.append(rec)
    Path(a.output).parent.mkdir(parents=True, exist_ok=True)
    Path(a.output).write_text(json.dumps(out, indent=1, ensure_ascii=False))
    print(json.dumps({'ok': True, 'files': len(out), 'errors': sum(1 for r in out if r['error']),
                      'zero_line_files': sum(1 for r in out if not r['lines']), 'output': a.output,
                      'note': 'OCR is a lead: adjudicate every line against the image and the locked copy'}))


# ---------------------------------------------------------------- proof sheet
def cmd_proof(a):
    pil()
    from PIL import Image, ImageDraw, ImageFont, features
    raqm = bool(features.check('raqm'))
    copy = json.loads(Path(a.copy).read_text())
    strings = copy.get('lines') or [v for k, v in copy.items() if k in ('headline', 'body', 'cta') and v]
    strings += copy.get('protected_tokens', [])
    text = ''.join(strings)
    latin = all(ord(ch) < 0x0250 or ch.isspace() for ch in text)
    if not raqm and not (latin or a.latin_only):
        die('Pillow has no libraqm: complex-script shaping is unavailable, so this proof sheet would lie; report it', 2)
    layout = ImageFont.Layout.RAQM if raqm else ImageFont.Layout.BASIC
    font = ImageFont.truetype(a.font, a.size, layout_engine=layout)
    line_h = round(a.size * a.line_spacing)
    pad = a.size
    probe = ImageDraw.Draw(Image.new('RGB', (10, 10)))
    kw = {'direction': 'rtl'} if a.rtl and raqm else {}
    widths = [probe.textbbox((0, 0), s, font=font, **kw)[2] for s in strings] or [10]
    W = max(widths) + 2 * pad
    H = len(strings) * line_h + 2 * pad
    img = Image.new('RGB', (W, H), 'white')
    d = ImageDraw.Draw(img)
    for i, s in enumerate(strings):
        x = (W - pad - widths[i]) if a.rtl else pad
        d.text((x, pad + i * line_h), s, font=font, fill='black', **kw)
    img.save(a.out)
    print(json.dumps({'ok': True, 'raqm': raqm, 'font': a.font, 'strings': len(strings), 'out': a.out,
                      'note': 'look at it: conjuncts, matras, top bar, language letters, punctuation, direction'}, ensure_ascii=False))


# ---------------------------------------------------------------- reconcile / hashlock
def cmd_reconcile(a):
    pm_path = Path(a.manifest).resolve()
    pm = json.loads(pm_path.read_text())
    finals = {}
    for rel in pm['language_manifests']:
        man = json.loads((pm_path.parent / rel).read_text())
        for b in man['batches']:
            for i in b.get('items', []):
                finals.setdefault(i['target'], []).append((man['language'], b['target_folder']))
    with open(a.export, newline='', encoding='utf-8-sig') as f:
        rows = list(csv.DictReader(f))
    if rows and a.column not in rows[0]:
        die(f'column {a.column} not in the export (columns: {list(rows[0])})')
    seen = {}
    for r in rows:
        n = os.path.basename((r.get(a.column) or '').strip())
        if n:
            seen[n] = seen.get(n, 0) + 1
    missing = sorted(n for n in finals if n not in seen)
    extra = sorted(n for n in seen if n not in finals)
    doubled = sorted(n for n, c in seen.items() if n in finals and c != len(finals[n]))
    out = {'finals': sum(len(v) for v in finals.values()), 'export_rows': len(rows),
           'missing': [{'file': n, 'language': lang, 'folder': folder} for n in missing for lang, folder in finals[n]],
           'not_in_manifest': extra, 'count_differs': doubled,
           'note': 'compare only after the upload has finished; a count taken while it runs is progress, not a total'}
    print(json.dumps(out, indent=1, ensure_ascii=False))
    sys.exit(0 if not missing and not extra and not doubled else 1)


def cmd_hashlock(a):
    if a.action == 'write':
        root = Path(a.target)
        files = sorted(p for p in root.rglob('*') if p.is_file())
        lock = {'root': str(root.resolve()), 'files': {str(p.relative_to(root)): sha256(p) for p in files}}
        Path(a.out).write_text(json.dumps(lock, indent=1))
        print(json.dumps({'ok': True, 'files': len(files), 'lock': a.out}))
        return
    lock = json.loads(Path(a.target).read_text())
    root = Path(lock['root'])
    bad = [k for k, h in lock['files'].items() if not (root / k).exists() or sha256(root / k) != h]
    now = {str(p.relative_to(root)) for p in root.rglob('*') if p.is_file()}
    added = sorted(now - set(lock['files']))
    print(json.dumps({'ok': not bad and not added, 'changed_or_missing': bad, 'added': added}))
    sys.exit(0 if not bad and not added else 1)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest='cmd', required=True)
    p = sp.add_parser('plan')
    p.add_argument('--source-root', required=True)
    p.add_argument('--source-code', required=True)
    p.add_argument('--targets', required=True)
    p.add_argument('--project-dir', required=True)
    p.add_argument('--map')
    p.add_argument('--mode', default='RGB')
    p.add_argument('--min-bytes', type=int, default=50000)
    p.add_argument('--width', type=int)
    p.add_argument('--height', type=int)
    p = sp.add_parser('crops')
    p.add_argument('image')
    p.add_argument('--out', required=True)
    p.add_argument('--tile', type=int, default=1024)
    p = sp.add_parser('canvas')
    p.add_argument('input')
    p.add_argument('--width', type=int, required=True)
    p.add_argument('--height', type=int, required=True)
    p.add_argument('--out', required=True)
    p = sp.add_parser('verify')
    p.add_argument('manifest')
    p.add_argument('--report')
    p = sp.add_parser('verify-project')
    p.add_argument('manifest')
    p.add_argument('--report')
    p = sp.add_parser('sheets')
    p.add_argument('root')
    p.add_argument('--output', required=True)
    p.add_argument('--columns', type=int, default=5)
    p = sp.add_parser('ocr')
    p.add_argument('root')
    p.add_argument('--langs', required=True)
    p.add_argument('--output', required=True)
    p.add_argument('--tsv-dir')
    p = sp.add_parser('proof')
    p.add_argument('--copy', required=True)
    p.add_argument('--font', required=True)
    p.add_argument('--out', required=True)
    p.add_argument('--rtl', action='store_true')
    p.add_argument('--line-spacing', type=float, default=1.35)
    p.add_argument('--size', type=int, default=64)
    p.add_argument('--latin-only', action='store_true')
    p = sp.add_parser('reconcile')
    p.add_argument('manifest')
    p.add_argument('--export', required=True)
    p.add_argument('--column', required=True)
    p = sp.add_parser('hashlock')
    p.add_argument('action', choices=['write', 'verify'])
    p.add_argument('target')
    p.add_argument('--out')
    a = ap.parse_args()
    if a.cmd == 'hashlock' and a.action == 'write' and not a.out:
        die('hashlock write needs --out', 2)
    {'plan': cmd_plan, 'crops': cmd_crops, 'canvas': cmd_canvas, 'verify': cmd_verify,
     'verify-project': cmd_verify_project, 'sheets': cmd_sheets, 'ocr': cmd_ocr, 'proof': cmd_proof,
     'reconcile': cmd_reconcile, 'hashlock': cmd_hashlock}[a.cmd](a)


if __name__ == '__main__':
    main()
