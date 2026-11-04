#!/usr/bin/env python3
"""Build a Slate Agency print report: A4 or US Letter sheets with running header and footer.

Usage:  python3 build_report.py <folder>/report.json [out_dir] [--assets <dir>] [--shots <dir>]
        python3 build_report.py <folder>/report.src.html [out_dir] [--assets <dir>] [--shots <dir>]

report.json (the usual source: one block per page) holds title, short, status, file, size and
"blocks": [{"type": "<a <template id> in template/blocks.html>", "<field>": "..."}, ...]. Each
{{field}} in the block's template is filled with the block's value (HTML allowed; a list becomes
<li id="sN"> items; "code" is shown as typed; the cover's optional "logo" is the customer's logo
file, relative to report.json, shown on the "Prepared for" card). A missing field, a starter placeholder left
("[Capitalised text]") or a bad or missing screenshot fails the build. It writes report.src.html next to the JSON,
then builds that. A new version is an edit of report.json.

The report.src.html file holds, at the top:

  <title>Document name</title>                    artifact and browser title (the document name)
  <meta name="doc-short" content="...">           running-header title, e.g. "Product Market and Growth Strategy"
  <meta name="doc-status" content="...">          footer text, e.g. "Draft for review · not for distribution"
  <meta name="doc-file" content="...">            output file name without extension (see naming rule)
  <meta name="doc-size" content="a4|letter">      paper size; a4 if left out
then one <section class="sheet ..." data-section="..."> per page. Sheets with class "cover" or
"back" get no running header or footer. Placeholders: __LOGO__ (logo data URI), __ICONS__ (the
shared icon set), __SHOT_<name>__ (the data URI of <name>.png in the shots folder: <folder>/shots/,
or --shots <dir>; the build fails if one is missing). Optional per-report CSS goes in one <style> block in the source.

Writes to out_dir (default: the source folder):
  <doc-file>.html   the artifact page (no doctype; the artifact host wraps it)
  <doc-file>.pdf    the PDF, one page per sheet
and prints one line per page. Exits 1 if a page overflows or the PDF page count is wrong.
--shots: the folder of PNG screenshots for __SHOT_<name>__ (default: shots/ next to the source).
--assets: the folder with fonts/, slate-print.css, slate-logo-96.png and icons.svg (default: assets/ next
to this script). Chromium: $CHROME_PATH, else the pre-installed Playwright Chromium, else chromium on PATH.
"""
import base64, glob, json, os, re, shutil, subprocess, sys, tempfile, html as H

HERE = os.path.dirname(os.path.abspath(__file__))
DS = os.path.join(HERE, 'assets')


def find_chrome():
    """The Playwright Chromium moves between versions (chromium-1194 became chromium-1243), so search."""
    cands = [os.environ.get('CHROME_PATH', ''), '/opt/pw-browsers/chromium']
    cands += sorted(glob.glob('/opt/pw-browsers/chromium-*/chrome-linux*/chrome'), reverse=True)
    cands += [shutil.which(n) or '' for n in ('chromium', 'chromium-browser', 'google-chrome')]
    return next((p for p in cands if p and os.path.exists(p)), None) or sys.exit('no Chromium found: set CHROME_PATH')


CHROME = None
FONT_FILES = [('Slate Inter', 'Inter-Variable-latin.woff2', '200 700'),
              ('Slate Plex Mono', 'IBMPlexMono-400-latin.woff2', '400'),
              ('Slate Plex Mono', 'IBMPlexMono-500-latin.woff2', '500'),
              ('Slate Plex Mono', 'IBMPlexMono-600-latin.woff2', '600')]
HEADROOM_MM = 6     # free space every inner page must keep at the bottom of its body
SIZES = {'a4': ('A4', 794, 1123), 'letter': ('letter', 816, 1056)}
# On narrow screens each sheet is scaled with a transform inside a wrapper sized to the scaled
# page. A transform never re-flows text, so line breaks match print and PDF exactly.
FIT = """<script>
(function(){var PW=%d,PH=%d;function fit(){var w=document.documentElement.clientWidth,z=Math.min(1,(w-16)/PW);
document.querySelectorAll('.sheet').forEach(function(s){var p=s.parentNode;
 if(!p.classList.contains('sheet-fit')){var d=document.createElement('div');d.className='sheet-fit';p.insertBefore(d,s);d.appendChild(s);p=d;}
 p.style.width=(PW*z)+'px';p.style.height=(PH*z)+'px';s.style.transformOrigin='top left';s.style.transform=z<1?'scale('+z+')':'';});}
addEventListener('resize',fit);document.addEventListener('DOMContentLoaded',fit);fit();})();
</script>
<style>.sheet-fit{flex:none}@media print{.sheet-fit{width:auto!important;height:auto!important}}</style>"""
CHECK = """<script>
addEventListener('load',function(){(document.fonts?document.fonts.ready:Promise.resolve()).then(function(){setTimeout(function(){
 var MM=96/25.4,NEED=%s*MM,out=[];
 document.querySelectorAll('.sheet').forEach(function(s,i){
  var bad=[],free=null,body=s.querySelector(':scope>.pg-body');
  if(body){
   var r=body.getBoundingClientRect(),cs=getComputedStyle(body),limit=r.bottom-parseFloat(cs.paddingBottom),low=r.top;
   body.querySelectorAll('*').forEach(function(e){if(e.closest('svg'))return;var b=e.getBoundingClientRect();if(!b.width&&!b.height)return;
    if(b.bottom>low)low=b.bottom;if(b.right>r.right+.5)bad.push('wide:'+(e.className||e.tagName));});
   free=(limit-low)/MM;if(body.scrollHeight>body.clientHeight+1||free<NEED/MM-0.01)bad.push('free '+free.toFixed(1)+'mm');
  }else{
   var r=s.getBoundingClientRect();
   s.querySelectorAll('*').forEach(function(e){if(e.closest('.band,.edge,svg'))return;var b=e.getBoundingClientRect();if(!b.width&&!b.height)return;
    if(b.bottom>r.bottom-8*MM||b.right>r.right-8*MM)bad.push('edge:'+(e.className||e.tagName));});
  }
  out.push({page:i+1,section:s.dataset.section||'',free:free,over:bad.slice(0,3)});});
 var p=document.createElement('pre');p.id='CHECK';p.textContent=JSON.stringify(out);document.body.appendChild(p);
},600);});});
</script>"""
# For the check, stretchy blocks (.fill, .push, centred special pages) take only the room their
# content needs, so the free space measured is real.
MEASURE = "<style>.pg-body .fill{flex:0 0 auto!important}.pg-body .push{margin-top:0!important}.pg-body{justify-content:flex-start!important}</style>"
FALLBACK = "<style>:root{--sans:Arial,sans-serif!important;--mono:'Courier New',monospace!important}</style>"


def meta(s, name, default=None):
    m = re.search(rf'<meta name="{name}" content="([^"]+)">', s)
    if m:
        return m.group(1)
    if default is None:
        sys.exit(f'missing <meta name="{name}">')
    return default


def render(src):
    """report.json -> report.src.html next to it, from the block templates in template/blocks.html."""
    d = json.load(open(src, encoding='utf-8'))
    tpl = dict(re.findall(r'<template id="([\w-]+)">\n?(.*?)</template>', open(os.path.join(HERE, 'template', 'blocks.html'), encoding='utf-8').read(), re.S))
    def fill(i, b):
        if b.get('type') not in tpl:
            sys.exit(f'block {i}: unknown type {b.get("type")!r}; known: {", ".join(tpl)}')
        def val(m):
            k = m.group(1)
            if k == 'logo':  # optional: the customer's logo file, relative to report.json; inlined
                return logo_img(src, b.get('logo'), b.get('client', ''))
            if k not in b:
                sys.exit(f'block {i} ({b["type"]}): missing field "{k}"')
            v = b[k]
            if k == 'code':
                return H.escape(str(v), quote=False)
            return ''.join(f'<li id="s{n}">{x}</li>' for n, x in enumerate(v, 1)) if isinstance(v, list) else str(v)
        return re.sub(r'\{\{(\w+)\}\}', val, tpl[b['type']])
    missing = [k for k in ('title', 'short', 'status', 'file', 'blocks') if not d.get(k)]
    if missing:
        sys.exit(f'{src}: missing {", ".join(missing)}')
    left = re.findall(r'\[[A-Z][^\]\n]*\]', json.dumps(d, ensure_ascii=False))
    if left:
        sys.exit(f'{src}: starter placeholder left: {left[0]}')
    head = (f'<title>{H.escape(d["title"])}</title>\n' + ''.join(
        f'<meta name="doc-{k}" content="{H.escape(d[k])}">\n' for k in ('short', 'status', 'file', 'size') if k in d))
    body = '\n'.join(fill(i, b) for i, b in enumerate(d['blocks'], 1))
    out = os.path.join(os.path.dirname(os.path.abspath(src)), 'report.src.html')
    open(out, 'w', encoding='utf-8').write(f'{head}<!-- Made from report.json by build_report.py: edit report.json, not this file. -->\n__ICONS__\n<div class="doc">\n{body}\n</div>\n')
    return out


MIME = {'.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp'}


def logo_img(src, path, client):
    """The customer's logo for the cover's "Prepared for" card, or nothing (the name alone)."""
    if not path:
        return ''
    full = os.path.join(os.path.dirname(os.path.abspath(src)), path)
    mime = MIME.get(os.path.splitext(full)[1].lower())
    if not mime or not os.path.isfile(full):
        sys.exit(f'cover logo: {path} is not an svg, png, jpg or webp file next to report.json')
    return (f'<img class="client-logo" alt="{H.escape(client)} logo" '
            f'src="data:{mime};base64,{base64.b64encode(open(full, "rb").read()).decode()}">')


def build(src, out_dir=None, shots=None):
    global CHROME
    if src.endswith('.json'):
        src = render(src)
    CHROME = CHROME or find_chrome()
    out_dir = out_dir or os.path.dirname(os.path.abspath(src))
    s = open(src, encoding='utf-8').read()
    shots = shots or os.path.join(os.path.dirname(os.path.abspath(src)), 'shots')
    for name in sorted(set(re.findall(r'__SHOT_(.*?)__', s))):
        if not re.fullmatch(r'[A-Za-z0-9_.-]+', name):
            sys.exit(f'bad screenshot name: "{name}" (the PNG name without .png)')
        png = os.path.join(shots, name + '.png')
        if not os.path.exists(png):
            sys.exit(f'missing screenshot: {png}')
        s = s.replace(f'__SHOT_{name}__', 'data:image/png;base64,' + base64.b64encode(open(png, 'rb').read()).decode())
    short, status, fname = meta(s, 'doc-short'), meta(s, 'doc-status'), meta(s, 'doc-file')
    size = meta(s, 'doc-size', 'a4').lower()
    page_size, page_px, page_py = SIZES[size]
    s = re.sub(r'<meta name="doc-[a-z]+" content="[^"]*">\n?', '', s)
    fonts_css = ''.join(
        f"@font-face{{font-family:'{fam}';font-weight:{w};font-style:normal;font-display:block;"
        f"src:url(data:font/woff2;base64,{base64.b64encode(open(os.path.join(DS, 'fonts', f), 'rb').read()).decode()}) format('woff2')}}\n"
        for fam, f, w in FONT_FILES)
    css = fonts_css + open(os.path.join(DS, 'slate-print.css'), encoding='utf-8').read()
    css += f'\n@page{{size:{page_size} portrait;margin:0}}\n'
    logo = 'data:image/png;base64,' + base64.b64encode(
        open(os.path.join(DS, 'slate-logo-96.png'), 'rb').read()).decode()
    icons = open(os.path.join(DS, 'icons.svg'), encoding='utf-8').read()

    sheets = list(re.finditer(r'<section class="sheet([^"]*)"([^>]*)>', s))
    total = len(sheets)
    out, last = [], 0
    for idx, m in enumerate(sheets, 1):
        out.append(s[last:m.end()])
        last = m.end()
        if re.search(r'\b(cover|back)\b', m.group(1)):
            continue
        sec = re.search(r'data-section="([^"]*)"', m.group(2))
        sec = sec.group(1) if sec else ''
        close = s.index('</section>', m.end())
        out.append(
            f'\n<div class="hdr"><span class="l"><img src="__LOGO__" alt="">Slate Agency · {H.escape(short)}</span>'
            f'<span class="r">{sec}</span></div>\n<div class="pg-body">')
        out.append(s[m.end():close])
        out.append(
            f'</div>\n<div class="ftr" style="--prog:{idx / total * 100:.1f}%"><span class="track"></span><span class="bar"></span>'
            f'<span>{H.escape(status)}</span><span class="pg">{idx} / {total}</span></div>\n')
        last = close
    out.append(s[last:])
    s = ''.join(out).replace('__LOGO__', logo).replace('__ICONS__', icons)

    title = re.search(r'<title>.*?</title>', s).group(0)
    s = s.replace(title, '')
    body_open = f'<script>document.body.dataset.size="{size}"</script>'
    page = f'{title}\n<style>\n{css}</style>\n{body_open}\n{s}\n{FIT % (page_px, page_py)}\n'
    os.makedirs(out_dir, exist_ok=True)
    html_out = os.path.join(out_dir, fname + '.html')
    open(html_out, 'w', encoding='utf-8').write(page)

    full = (f'<!doctype html><html lang="en"><head><meta charset="utf-8">'
            f'<meta name="viewport" content="width=device-width,initial-scale=1">{title}'
            f'<style>{css}</style></head><body data-size="{size}">{s}</body></html>')
    pdf = os.path.join(out_dir, fname + '.pdf')
    with tempfile.TemporaryDirectory() as tmp:
        pf = os.path.join(tmp, 'print.html'); open(pf, 'w', encoding='utf-8').write(full)
        flags = [CHROME, '--headless=new', '--no-sandbox', '--disable-gpu', '--virtual-time-budget=8000']
        subprocess.run(flags + ['--no-pdf-header-footer', f'--print-to-pdf={pdf}', 'file://' + pf],
                       capture_output=True, timeout=180)
        runs = {}
        for name, extra, need in (('embedded fonts', '', HEADROOM_MM), ('fallback fonts', FALLBACK, 0)):
            cf = os.path.join(tmp, 'check.html')
            open(cf, 'w', encoding='utf-8').write(full.replace('</head>', MEASURE + extra + '</head>').replace('</body>', CHECK % need + '</body>'))
            dom = subprocess.run(flags + ['--window-size=1000,1200', '--dump-dom', 'file://' + cf],
                                 capture_output=True, text=True, timeout=180).stdout
            res = re.search(r'<pre id="CHECK">(.*?)</pre>', dom, re.S)
            runs[name] = json.loads(H.unescape(res.group(1))) if res else []
    info = subprocess.run(['pdfinfo', pdf], capture_output=True, text=True).stdout
    npdf = re.search(r'Pages:\s+(\d+)', info)
    print(f'{fname}: {total} sheets, {npdf.group(1) if npdf else "?"} PDF pages, {size.upper()}; '
          f'needs {HEADROOM_MM} mm free per page, and no overflow with fallback fonts')
    report, fb = runs.get('embedded fonts', []), runs.get('fallback fonts', [])
    fbad = {r['page']: r['over'] for r in fb if r['over']}
    for r in report:
        free = '' if r['free'] is None else f"free {r['free']:>4.1f} mm"
        flag = 'ok' if not r['over'] and r['page'] not in fbad else 'FAIL ' + '; '.join(r['over'] + [f'fallback: {x}' for x in fbad.get(r['page'], [])])
        print(f"  p{r['page']:>2} {r['section'][:30]:<30} {free:<14} {flag}")
    if not report or not fb:
        print('  check did not run')
    ok = bool(report) and bool(fb) and not any(r['over'] for r in report) and not fbad and npdf and int(npdf.group(1)) == total
    return 0 if ok else 1


if __name__ == '__main__':
    argv = sys.argv[1:]
    if '--assets' in argv:
        i = argv.index('--assets'); DS = os.path.abspath(argv[i + 1]); del argv[i:i + 2]
    shots = None
    if '--shots' in argv:
        i = argv.index('--shots'); shots = os.path.abspath(argv[i + 1]); del argv[i:i + 2]
    if argv and ('-h' in argv or '--help' in argv):
        print(__doc__); sys.exit(0)
    if not argv:
        sys.exit(__doc__)
    sys.exit(build(argv[0], argv[1] if len(argv) > 1 else None, shots))
