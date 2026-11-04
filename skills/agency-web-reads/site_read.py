#!/usr/bin/env python3
"""Read a live website with GET requests only: each page's redirect chain and status, and what search
engines and AI assistants read from it. Never posts, never submits a form, never logs in.

  site_read.py <url> [<url or /path> ...] [--site] [--render] [--out <dir>] [--json]

  <url> ...   pages to read; a /path is joined to the first URL's site
  --site      also read the site files: /robots.txt, the sitemap(s) it names (else /sitemap.xml),
              /llms.txt; prints the sitemap's URL count and the URLs
  --out <dir> save each reply: <name>.html or its own extension (body) and <name>.headers.txt (every hop's status and headers),
              plus read-started-utc.txt
  --render    read each page as a browser shows it: the pre-installed Playwright Chromium runs its
              scripts and scrolls to the end (render.cjs, next to this file); the saved body is the
              HTML after scripts. For pages whose text a script adds. Site files are still plain GETs.
  --json      one JSON object per page instead of the text summary
Per page: the chain (status -> location ...), final status, content type, last-modified, title,
meta description, canonical, robots meta, h1s, JSON-LD types, word count.
"""
import datetime, gzip, html, json, os, re, subprocess, sys, urllib.error, urllib.parse, urllib.request

UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


OPENER = urllib.request.build_opener(NoRedirect)


def fetch(url, hops=10):
    """GET, following redirects by hand so every hop is recorded. Returns (chain, body)."""
    chain = []
    for _ in range(hops):
        req = urllib.request.Request(url, method='GET', headers={'User-Agent': UA, 'Accept-Encoding': 'gzip'})
        try:
            r = OPENER.open(req, timeout=60)
            code, headers, body = r.status, r.headers, r.read()
        except urllib.error.HTTPError as e:
            code, headers, body = e.code, e.headers, (e.read() if e.fp else b'')
        except Exception as e:
            chain.append({'url': url, 'status': f'error: {e}'}); return chain, b''
        if headers.get('Content-Encoding') == 'gzip':
            body = gzip.decompress(body)
        chain.append({'url': url, 'status': code, 'headers': dict(headers.items())})
        loc = headers.get('Location')
        if code in (301, 302, 303, 307, 308) and loc:
            url = urllib.parse.urljoin(url, loc); continue
        return chain, body
    return chain, b''


def rendered(urls):
    """(chain, body) per URL, from render.cjs: the page after its scripts ran."""
    r = subprocess.run(['node', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'render.cjs'), *urls],
                       capture_output=True, text=True, timeout=120 + 60 * len(urls))
    rows = [json.loads(l) for l in r.stdout.splitlines() if l.startswith('{')]
    if len(rows) != len(urls):
        sys.exit(f'render.cjs failed: {r.stderr.strip()[-500:]}')
    return [(x['chain'], x['body'].encode('utf-8')) for x in rows]


def meta(page, attr, name):
    m = re.search(rf'<meta[^>]+{attr}=["\']?{name}(?=["\'\s>])[^>]*>', page, re.I)
    c = re.search(r'content=(?:"([^"]*)"|\'([^\']*)\'|([^\s>]+))', m.group(0), re.I) if m else None
    return html.unescape(next(g for g in c.groups() if g is not None)).strip() if c else None


def summary(url, chain, body):
    last = chain[-1]
    h = {k.lower(): v for k, v in last.get('headers', {}).items()}
    page = body.decode('utf-8', 'ignore')
    is_html = 'html' in h.get('content-type', '')
    text = lambda s: re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s))).strip()
    out = {'asked': url, 'chain': [f"{c['status']} {c['url']}" for c in chain], 'final_url': last['url'],
           'status': last['status'], 'content_type': h.get('content-type'), 'last_modified': h.get('last-modified'),
           'bytes': len(body), 'read_utc': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}
    if is_html:
        t = re.search(r'<title[^>]*>(.*?)</title>', page, re.S | re.I)
        canon = re.search(r'<link[^>]+rel=["\']canonical["\'][^>]*>', page, re.I)
        types = []
        for blk in re.findall(r'<script[^>]+application/ld\+json[^>]*>(.*?)</script>', page, re.S | re.I):
            try:
                d = json.loads(blk)
            except json.JSONDecodeError:
                types.append('(invalid JSON-LD)'); continue
            items = d if isinstance(d, list) else d.get('@graph', [d])
            types += [str(i.get('@type')) for i in items if isinstance(i, dict)]
        bare = re.sub(r'<(script|style|noscript)[^>]*>.*?</\1>', ' ', page, flags=re.S | re.I)
        body_txt = text(bare)
        out.update({'title': text(t.group(1)) if t else None, 'description': meta(page, 'name', 'description'),
                    'canonical': (re.search(r'href=["\']([^"\']*)', canon.group(0)) or [None, None])[1] if canon else None,
                    'robots': meta(page, 'name', 'robots'),
                    'h1': [text(x) for x in re.findall(r'<h1[^>]*>(.*?)</h1>', bare, re.S | re.I)],
                    'jsonld_types': types, 'words': len(body_txt.split())})
    return out


def save(out_dir, url, chain, body):
    """<path>.html (or its own extension); a reply that isn't 200 is <path>.<status>.html, so a 404 body never
    looks like the real file; a name that differs from one already saved only by case gets _2."""
    parts = urllib.parse.urlsplit(url)
    name = re.sub(r'[^\w.-]+', '_', parts.path.strip('/') or 'home')
    if FIRST_HOST and parts.netloc != FIRST_HOST[0]:
        name = parts.netloc + '_' + name
    status = chain[-1].get('status') if chain else None
    if status != 200:
        name = f'{name}.{status if isinstance(status, int) else "error"}'
    taken = {f.lower(): f for f in os.listdir(out_dir)}
    while (name + '.headers.txt').lower() in taken and (name + '.headers.txt') not in taken.values():
        name += '_2'
    ext = re.search(r'\.\w{2,4}$', name) and status == 200
    open(os.path.join(out_dir, name if ext else name + '.html'), 'wb').write(body)
    with open(os.path.join(out_dir, name + '.headers.txt'), 'w') as f:
        for c in chain:
            f.write(f"GET {c['url']}\nHTTP {c['status']}\n" + ''.join(f'{k}: {v}\n' for k, v in c.get('headers', {}).items()) + '\n')


FIRST_HOST = []


def main():
    a = sys.argv[1:]
    if a and ('-h' in a or '--help' in a):
        print(__doc__); sys.exit(0)
    if not a:
        sys.exit(__doc__)
    out_dir = a[a.index('--out') + 1] if '--out' in a else None
    as_json, site = '--json' in a, '--site' in a
    urls = [x for i, x in enumerate(a) if not x.startswith('--') and (i == 0 or a[i - 1] != '--out')]
    base = urllib.parse.urlsplit(urls[0])
    FIRST_HOST.append(base.netloc)
    root = f'{base.scheme}://{base.netloc}'
    urls = [root + u if u.startswith('/') else u for u in urls]
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)
        open(os.path.join(out_dir, 'read-started-utc.txt'), 'w').write(datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ\n'))
    results = []
    reads = rendered(urls) if '--render' in a else [fetch(u) for u in urls]
    for u, (chain, body) in zip(urls, reads):
        results.append(summary(u, chain, body))
        if '--render' in a: results[-1]['rendered'] = True
        if out_dir: save(out_dir, u, chain, body)
    if site:
        files = {}
        for p in ('/robots.txt', '/llms.txt'):
            chain, body = fetch(root + p)
            files[p] = {'status': chain[-1]['status'], 'chain': [f"{c['status']} {c['url']}" for c in chain],
                        'text': body.decode('utf-8', 'ignore') if chain[-1]['status'] == 200 else ''}
            if out_dir: save(out_dir, root + p, chain, body)
        maps = re.findall(r'(?im)^\s*sitemap:\s*(\S+)', files['/robots.txt']['text']) or [root + '/sitemap.xml']
        locs, seen = [], set()
        while maps:
            sm = maps.pop(0)
            if sm in seen or len(seen) > 50: continue
            seen.add(sm)
            chain, body = fetch(sm)
            if out_dir: save(out_dir, sm, chain, body)
            x = body.decode('utf-8', 'ignore')
            found = [html.unescape(l) for l in re.findall(r'<loc>\s*(.*?)\s*</loc>', x, re.S)]
            (maps.extend if '<sitemapindex' in x else locs.extend)(found)
            files[sm] = {'status': chain[-1]['status'], 'urls': len(found)}
        results.append({'site': root, 'robots_txt': files['/robots.txt']['status'], 'llms_txt': files['/llms.txt']['status'],
                        'sitemaps': {k: v for k, v in files.items() if k.startswith('http')},
                        'sitemap_urls': len(locs), 'urls': locs,
                        'robots_lines': [l for l in files['/robots.txt']['text'].splitlines() if l.strip()][:40]})
    for r in results:
        if as_json:
            print(json.dumps(r, ensure_ascii=False)); continue
        if 'site' in r:
            print(f"\nSITE {r['site']}: robots.txt {r['robots_txt']}, llms.txt {r['llms_txt']}, sitemap URLs {r['sitemap_urls']}")
            for l in r['robots_lines']: print(f'  robots| {l}')
            for u in r['urls']: print(f'  {u}')
            continue
        print(f"\n{r['asked']}\n  {' -> '.join(r['chain'])}\n  {r['status']} {r['content_type']} {r['bytes']} bytes, last-modified {r['last_modified']}, read {r['read_utc']}")
        for k in ('rendered', 'title', 'description', 'canonical', 'robots', 'h1', 'jsonld_types', 'words'):
            if k in r: print(f'  {k}: {r[k]}')


if __name__ == '__main__':
    main()
