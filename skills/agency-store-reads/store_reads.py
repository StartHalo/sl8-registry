#!/usr/bin/env python3
"""Read public app-store data with plain GETs: Google Play installs, listing fields and search ranks;
App Store lookup, listing fields and search ranks. Prints one JSON object per line (append it to a
.jsonl log yourself). No account, no key, nothing written to any store.

  store_reads.py play-installs <package>...                 exact lifetime installs (Android, worldwide)
  store_reads.py play-listing  <package> [--gl us] [--hl en] title, short description, installs, developer...
  store_reads.py play-rank     <package> --kw "<words>"... [--cc us,gb]   position in the first 30 results
  store_reads.py ios-lookup    <app id>... [--cc us]        iTunes lookup API: name, version, ratings, price
  store_reads.py ios-listing   <app id> [--cc us]           apps.apple.com page: name, subtitle, description...
  store_reads.py ios-rank      <app id> --kw "<words>"... [--cc us,gb]   position in up to 200 results

  --file <path>   parse a saved page or reply (.gz too) instead of reading live (one kw and cc)
  --save <dir>    keep each raw reply in <dir>, named by store, app, country and time
Apple throttles (403/429): calls are paced 4.5 s apart and retried with backoff.
"""
import datetime, gzip, hashlib, html, json, os, re, sys, time, urllib.error, urllib.parse, urllib.request

UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
INSTALLS = re.compile(r'"([\d,]+\+)",(\d+),(\d+),"[\d.]+[KMB]?\+"')
_last_apple = [0.0]


def opt(name, default=None, many=False):
    vals = [sys.argv[i + 1] for i, a in enumerate(sys.argv[:-1]) if a == name]
    return vals if many else (vals[-1] if vals else default)


def positional():
    out, skip = [], False
    for a in sys.argv[2:]:
        if skip: skip = False; continue
        if a.startswith('--'): skip = True; continue
        out.append(a)
    return out


def now():
    return datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def get(url, label):
    """GET with retries; returns (text, meta). With --file, reads the file instead."""
    f = opt('--file')
    if f:
        raw = open(f, 'rb').read()
        raw = gzip.decompress(raw) if f.endswith('.gz') else raw
        return raw.decode('utf-8', 'ignore'), {'source': f}
    apple = 'apple.com' in url
    for attempt in range(5):
        if apple:
            time.sleep(max(0, 4.5 - (time.time() - _last_apple[0]))); _last_apple[0] = time.time()
        t = now()
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9'})
            with urllib.request.urlopen(req, timeout=60) as r:
                raw, status, final = r.read(), r.status, r.geturl()
            break
        except urllib.error.HTTPError as e:
            if e.code in (403, 429) or e.code >= 500:
                time.sleep(8 * (attempt + 1)); continue
            return None, {'url': url, 'read_utc': t, 'status': e.code}
        except Exception as e:
            err = str(e); time.sleep(8 * (attempt + 1))
    else:
        return None, {'url': url, 'read_utc': t, 'status': 'failed after retries'}
    meta = {'url': url, 'final_url': final, 'read_utc': t, 'status': status, 'sha256': hashlib.sha256(raw).hexdigest()}
    if opt('--save'):
        os.makedirs(opt('--save'), exist_ok=True)
        p = os.path.join(opt('--save'), re.sub(r'[^\w.-]+', '_', f"{label}_{t}") + '.html')
        open(p, 'wb').write(raw); meta['saved'] = p
    return raw.decode('utf-8', 'ignore'), meta


def loads(text):
    """JSON, tolerating stray backslashes (seen in a hand-redacted saved reply)."""
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return json.loads(re.sub(r'\\(?![\\"/bfnrtu])', r'\\\\', text))


def out(obj):
    print(json.dumps(obj, ensure_ascii=False))


# ---------- Google Play ----------

def play_url(pkg, gl='us', hl='en'):
    return f'https://play.google.com/store/apps/details?id={urllib.parse.quote(pkg)}&hl={hl}&gl={gl}'


def play_data(page):
    """The app's data block (ds:5) in the page, as google-play-scraper reads it."""
    m = re.search(r"AF_initDataCallback\(\{key: 'ds:5', hash: '[^']*', data:(.*?), sideChannel: \{\}\}\);</script>", page, re.S)
    return json.loads(m.group(1)) if m else None


def at(d, *path):
    try:
        for k in path: d = d[k]
        return d
    except (IndexError, KeyError, TypeError):
        return None


def play_installs(pkgs):
    for pkg in pkgs:
        page, meta = get(play_url(pkg), f'play_{pkg}')
        m = INSTALLS.search(page or '')
        out({'store': 'play', 'app': pkg, 'band': m and m.group(1), 'installs': m and int(m.group(3)), **meta})


def play_listing(pkg):
    page, meta = get(play_url(pkg, opt('--gl', 'us'), opt('--hl', 'en')), f'play_{pkg}')
    d = play_data(page or '')
    a = at(d, 1, 2) if d else None
    desc = at(a, 72, 0, 1) or ''
    shots = at(a, 78, 0) or []
    out({'store': 'play', 'app': pkg, 'gl': opt('--gl', 'us'), 'hl': opt('--hl', 'en'),
         'title': at(a, 0, 0), 'short_description': at(a, 73, 0, 1),
         'description_chars': len(html.unescape(re.sub(r'<br>', '\n', desc))),
         'band': at(a, 13, 0), 'min_installs': at(a, 13, 1), 'installs': at(a, 13, 2),
         'score': at(a, 51, 0, 1), 'ratings': at(a, 51, 2, 1),
         'developer': at(a, 68, 0), 'genre': at(a, 79, 0, 0, 0), 'released': at(a, 10, 0),
         'icon': at(a, 95, 0, 3, 2), 'screenshots': len(shots),
         'note': None if a else 'no app data found: the page layout may have changed', **meta})


def play_rank(pkg, kws, ccs):
    for cc in ccs:
        for kw in kws:
            q = urllib.parse.urlencode({'q': kw, 'c': 'apps', 'hl': 'en', 'gl': cc})
            page, meta = get(f'https://play.google.com/store/search?{q}', f'playsearch_{cc}_{kw}')
            ids = []
            for i in re.findall(r'/store/apps/details\?id=([\w.]+)', page or ''):
                if i not in ids: ids.append(i)
            out({'store': 'play', 'app': pkg, 'cc': cc, 'keyword': kw,
                 'rank': ids.index(pkg) + 1 if pkg in ids else None, 'of': len(ids), **meta})
            time.sleep(1)


# ---------- App Store ----------

def ios_lookup(ids, cc):
    page, meta = get(f'https://itunes.apple.com/lookup?id={",".join(ids)}&country={cc}&entity=software', 'ios_lookup')
    res = loads(page)['results'] if page else []
    for r in res:
        out({'store': 'appstore', 'app': r.get('trackId'), 'cc': cc, 'name': r.get('trackName'),
             'version': r.get('version'), 'updated': r.get('currentVersionReleaseDate'),
             'released': r.get('releaseDate'), 'ratings': r.get('userRatingCount'),
             'score': r.get('averageUserRating'), 'price': r.get('formattedPrice'),
             'genre': r.get('primaryGenreName'), 'seller': r.get('sellerName'), 'url': r.get('trackViewUrl'), **meta})
    if not res:
        out({'store': 'appstore', 'app': ids, 'cc': cc, 'note': 'no result: not offered in this storefront?', **meta})


def ios_listing(app, cc):
    page, meta = get(f'https://apps.apple.com/{cc}/app/id{app}', f'ios_{app}_{cc}')
    rec = {'store': 'appstore', 'app': app, 'cc': cc}
    if not page:
        out({**rec, **meta}); return
    clean = lambda t: html.unescape(re.sub(r'<[^>]+>', '', t)).strip()
    i = page.find('<h1'); j = page.find('</h1>', i)
    rec['name'] = clean(page[i:j + 5]) if i >= 0 else None
    # The subtitle is only the <p class="subtitle"> in the app's own title block (other apps on the page
    # have their own); when it equals the app's category, the app has no subtitle.
    block = page[j + 5:page.find('</section>', j)] if i >= 0 else ''
    sub = [clean(t) for c, t in re.findall(r'<p class="([^"]*)"[^>]*>(.*?)</p>', block, re.S) if c.split()[0] == 'subtitle']
    m = re.search(r'<script id=software-application type="application/ld\+json">(.*?)</script>', page, re.S)
    genre = (loads(m.group(1)) if m else {}).get('genre') or []
    rec['subtitle'] = None if (not sub or sub[0] in genre) else sub[0]
    rec['genre'] = genre
    m = re.search(r'<script type="application/json" id="serialized-server-data">(.*?)</script>', page, re.S)
    dd = at(loads(m.group(1)), 'data', 0, 'data') if m else None
    sm = (dd or {}).get('shelfMapping', {})
    desc = next((it['paragraph']['text'] for it in (sm.get('description') or {}).get('items', [])
                 if it.get('$kind') == 'ProductDescription'), '')
    r = next((it for it in (sm.get('productRatings') or {}).get('items', []) if it.get('$kind') == 'Ratings'), {})
    shots = sum(len(sm[k].get('items', [])) for k in sm if k.startswith('product_media_phone'))
    rec.update({'description_first_line': next((l.strip() for l in desc.split('\n') if l.strip()), None),
                'description_chars': len(desc), 'ratings': r.get('totalNumberOfRatings'),
                'score': r.get('ratingAverage'), 'phone_screenshots': shots,
                'note': None if dd else 'no page data found: the page layout may have changed'})
    out({**rec, **meta})


def ios_rank(app, kws, ccs):
    for cc in ccs:
        for kw in kws:
            q = urllib.parse.urlencode({'term': kw, 'country': cc, 'entity': 'software', 'limit': 200})
            page, meta = get(f'https://itunes.apple.com/search?{q}', f'iossearch_{cc}_{kw}')
            ids = [r['trackId'] for r in loads(page)['results']] if page else []
            out({'store': 'appstore', 'app': app, 'cc': cc, 'keyword': kw,
                 'rank': ids.index(int(app)) + 1 if int(app) in ids else None, 'of': len(ids), **meta})


def main():
    if sys.argv[1:] and ('-h' in sys.argv[1:] or '--help' in sys.argv[1:]):
        print(__doc__); sys.exit(0)
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    cmd, args = sys.argv[1], positional()
    ccs = (opt('--cc', 'us')).lower().split(',')
    kws = opt('--kw', many=True)
    if cmd == 'play-installs': play_installs(args)
    elif cmd == 'play-listing': play_listing(args[0])
    elif cmd == 'play-rank': play_rank(args[0], kws, ccs)
    elif cmd == 'ios-lookup': ios_lookup(args, ccs[0])
    elif cmd == 'ios-listing': ios_listing(args[0], ccs[0])
    elif cmd == 'ios-rank': ios_rank(args[0], kws, ccs)
    else: sys.exit(__doc__)


if __name__ == '__main__':
    main()
