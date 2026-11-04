#!/usr/bin/env python3
"""Which app carries which search words in the listing fields each store searches (that we can see).

  keyword_gap.py <listings.jsonl> --kw "<words>" [--kw ...] [--app <id> ...: mark our app; give both store ids]

<listings.jsonl>: lines printed by `store_reads.py play-listing` and `ios-listing`.
A search is "carried" when every word of it is in: Google Play title + short description (Play also
searches the long description; left out, as leaders' run to thousands of characters); App Store name
+ subtitle (the keyword field is not public, so App Store counts are a floor). Lower case, punctuation
as spaces, "baby's" as "baby"; on the App Store a plural counts as its singular (Apple treats them as
duplicates: developer.apple.com/app-store/search/). Prints a Markdown table per store and country.
"""
import json, re, sys


def words(text, plural=False):
    text = re.sub(r"'s\b", '', (text or '').lower().replace('’', "'"))
    w = set(re.findall(r'[a-z0-9]+', text))
    if plural:
        w |= {x[:-1] for x in w if len(x) > 3 and x.endswith('s') and not x.endswith('ss')}
    return w


def fields(r):
    if r['store'] == 'appstore':
        return ' '.join(filter(None, [r.get('name'), r.get('subtitle')]))
    return ' '.join(filter(None, [r.get('title'), r.get('short_description')]))


def main():
    a = sys.argv[1:]
    if a and ('-h' in a or '--help' in a):
        print(__doc__); sys.exit(0)
    if not a or '--kw' not in a:
        sys.exit(__doc__)
    kws = [a[i + 1] for i, x in enumerate(a[:-1]) if x == '--kw']
    ours = {a[i + 1] for i, x in enumerate(a[:-1]) if x == '--app'}
    rows = [json.loads(l) for l in open(a[0], encoding='utf-8') if l.strip()]
    groups = {}
    for r in rows:
        if r.get('name') or r.get('title'):
            groups.setdefault((r['store'], r.get('cc') or r.get('gl')), []).append(r)
    for (store, cc), rs in sorted(groups.items()):
        print(f'### {store} · {cc}\n')
        print('| Search words | Apps that carry it | of |' + (' ours |' if ours else ''))
        print('|---|---|---|' + ('---|' if ours else ''))
        for kw in kws:
            have = [r for r in rs if set(kw.lower().split()) <= words(fields(r), store == 'appstore')]
            names = ', '.join(str(r.get('name') or r.get('title')).replace('|', '\\|') for r in have if str(r['app']) not in ours) or 'none'
            mine = (' yes |' if any(str(r['app']) in ours for r in have) else ' no |') if ours else ''
            print(f'| {kw} | {names} | {len([r for r in have if str(r["app"]) not in ours])} of '
                  f'{len([r for r in rs if str(r["app"]) not in ours])} |{mine}')
        print()


if __name__ == '__main__':
    main()
