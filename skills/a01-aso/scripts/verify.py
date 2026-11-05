#!/usr/bin/env python3
"""Check an ASO engagement folder E (work/aso/<app>-<country>/<store>/cycle-<n>/). Stdlib only, reads files, changes nothing.

Usage: python3 scripts/verify.py <E>      (python3 scripts/verify.py example/ checks the simulated example)

Adapted from Khalid's ASO guide, sl8-studio/sl8-resesarch research/aso/v1.0/validation/verify_package.py
@ 9616aff4 (read 1 Nov 2026): its file, CSV, keyword-join and metadata-count checks, pointed at one live
engagement instead of the guide package. Prints one line per failure and 'verify: ok', exit 1 on failure.
"""
import csv, json, re, sys
from pathlib import Path

T = Path(__file__).resolve().parent.parent / 'templates'
E = Path(sys.argv[1] if len(sys.argv) > 1 else '.')
ORDER = ['01_Intake.md', '02_Baseline.csv', '02_Audit.md', '02_Reviews.csv', '03_Keywords_Raw.csv',
         '03_Keyword_Decisions.csv', '04_Metadata.md', '05_Creative_and_Experiment.md', '06_Release.md',
         '07_Observations.csv', '07_Results.md', '08_Client_Report.md', '08_Roadmap.md']
bad = []


def rows(name):
    with (E / name).open(newline='', encoding='utf-8') as f:
        return list(csv.DictReader(f))


have = [n for n in ORDER if (E / n).exists()]
if not have:
    sys.exit(f'verify: no engagement files in {E}')
# Stage continuity: a stage's file needs every earlier one (S05 may be prepared beside S04).
last = max(ORDER.index(n) for n in have)
for n in ORDER[:last]:
    if n not in have and not (n == '04_Metadata.md' and '05_Creative_and_Experiment.md' in have) \
            and not (n == '05_Creative_and_Experiment.md' and '04_Metadata.md' in have):
        bad.append(f'{n}: missing, but a later stage file exists')
modes = set()
for n in have:
    text = (E / n).read_text(encoding='utf-8')
    if n.endswith('.csv'):
        header = next(csv.reader(text.splitlines()), [])
        tmpl = next(csv.reader((T / n).read_text(encoding='utf-8').splitlines()))
        if header != tmpl:
            bad.append(f'{n}: columns differ from templates/{n}')
            continue
        data = rows(n)
        modes |= {r['mode'] for r in data if 'mode' in r}
        key = header[0]
        ids = [r[key] for r in data]
        if len(ids) != len(set(ids)):
            bad.append(f'{n}: {key} values are not unique')
        for r in data:
            c = r.get('count')
            if c not in (None, '') and not re.fullmatch(r'\d+', c):
                bad.append(f'{n}: {r[key]} count "{c}" is not a nonnegative whole number (blank means unknown)')
            if c not in (None, '') and not (r.get('unit') and r.get('definition') and r.get('source')):
                bad.append(f'{n}: {r[key]} has a count without unit, definition or source')
    else:
        m = re.search(r'\b(LIVE|DRAFT|SIMULATED)\b', text)
        modes |= {m.group(1)} if m else set()
        if not m:
            bad.append(f'{n}: no mode (LIVE, DRAFT or SIMULATED)')
        left = re.findall(r'\[(?:[a-z][^\]\n]{0,60})\](?!\()', text)
        if left:
            bad.append(f'{n}: template prompts left unfilled: {", ".join(sorted(set(left))[:3])}')
if len(modes) > 1:
    bad.append(f'modes mixed across files: {", ".join(sorted(modes))} (a simulated result is never a live one)')
# Keywords: every decision joins one candidate; labels; Reject/Later take no field; units kept.
if {'03_Keywords_Raw.csv', '03_Keyword_Decisions.csv'} <= set(have) and not any(b.startswith('03_') for b in bad):
    raw, dec = rows('03_Keywords_Raw.csv'), rows('03_Keyword_Decisions.csv')
    if {r['candidate_id'] for r in raw} != {r['candidate_id'] for r in dec}:
        bad.append('03: raw candidates and decisions do not join one to one')
    for r in dec:
        if r['decision'] not in ('Keep', 'Test', 'Later', 'Reject'):
            bad.append(f'03: {r["candidate_id"]} decision "{r["decision"]}" is not Keep, Test, Later or Reject')
        if r['decision'] in ('Reject', 'Later') and r['target_field'] != 'none':
            bad.append(f'03: {r["candidate_id"]} is {r["decision"]} but targets {r["target_field"]}')
    for r in raw:
        if r['demand_value'] and not (r['provider'] not in ('', 'none') and r['demand_scale']):
            bad.append(f'03: {r["candidate_id"]} has a demand value without its provider and scale')
# Baseline and observations measure the same metrics.
if {'02_Baseline.csv', '07_Observations.csv'} <= set(have) and not any(b.startswith(('02_B', '07_O')) for b in bad):
    before = {(r['store'], r['metric']) for r in rows('02_Baseline.csv')}
    after = {(r['store'], r['metric']) for r in rows('07_Observations.csv')}
    if before - after:
        bad.append(f'07: baseline metrics not observed again: {sorted(before - after)[:3]}')
# Field counts: metadata-checks.json, recounted (characters, or UTF-8 bytes for Apple's keyword field).
mc = E / 'metadata-checks.json'
if '04_Metadata.md' in have and not mc.exists():
    bad.append('metadata-checks.json: missing (the exact final strings with count, unit and limit)')
if mc.exists():
    for name, v in json.loads(mc.read_text(encoding='utf-8')).get('fields', {}).items():
        n = len(v['text'].encode('utf-8')) if v['unit'] == 'UTF-8 bytes' else len(v['text'])
        if n != v['count'] or n > v['limit']:
            bad.append(f'metadata-checks.json: {name} is {n} {v["unit"]} (recorded {v["count"]}, limit {v["limit"]})')
print('\n'.join(bad) or 'verify: ok')
sys.exit(1 if bad else 0)
