#!/usr/bin/env python3
"""marketing-static-copywriting helper (SL8-authored, stdlib only).

  python3 copyset.py lint   <copy-set.json>
  python3 copyset.py lock   <entry.json> --ledger <qa/<code>/translation-provenance.json> [--copy-set <copy-set.json>] [--replace --reason TEXT]
  python3 copyset.py export <copy-set.json> --variant <id> [--slot <name>] --out <file> [--force]

lint prints what it measured, one line per finding: FAIL (a rule the script can measure),
LEAD (the agent reads the line and writes what it saw) or REPORT (customer-supplied wording:
reported with an alternative, never blocked). Exit 0 no FAIL, 1 a FAIL, 2 unreadable input or an unwritable file.
The word lists are English; for another language they are skipped and the agent reads every line.
export re-runs the lint and refuses on a FAIL unless --force. lock with --copy-set also checks the
locked text against the brand (protected terms, figures, and for English the absolutes and urgency).
"""
import json
import os
import re
import sys
import tempfile
from datetime import date, datetime, timezone

CHECKLIST = ['brand', 'numbers', 'absolutes', 'price-outcome', 'urgency', 'concept', 'list-ending',
             'money', 'brand-bans', 'claims', 'plain', 'axes', 'scam-text']
FORMATS = ['checklist', 'problem-relief', 'question', 'testimonial', 'pov']
ANGLES = ['time', 'money', 'stress', 'confidence', 'other']
LENGTHS = ['punch', 'setup', 'other']
BARE = {'pass', 'passed', 'ok', 'okay', 'yes', 'no', 'true', 'done', 'fine', 'n/a', 'na', 'none', 'nothing',
        'nothing found', 'nothing to report', 'all good', 'looks good', 'good', 'clean', 'checked', 'ok checked',
        '-', ''}
MIN_SEEN = 20      # characters a checklist answer or a lead answer needs to say what was seen
CJK_PUNCH = 16     # a punch headline in zh, ja or th: fewer than this many characters
NO_SPACE_LANGS = ('zh', 'ja', 'th')

ABSOLUTE = re.compile(r"\b(never|always|guarantee[ds]?|forever|every single time|no more ever)\b|(?<!\w)100\s?%", re.I)
SOFT_WILL = re.compile(r"\bwill\b|'ll\b", re.I)
URGENCY = re.compile(r"\b(tonight|today only|this week only|hours? left|\d+ hours? (only|to go)|last chance|ends? (soon|today|tomorrow|tonight|now|on \w+|(mon|tues|wednes|thurs|fri|satur|sun)day)|limited time|hurry|act now|only \d+ left|before it'?s gone|while (supplies|stocks?) last|today'?s the day|countdown)\b", re.I)
DISCOUNT = re.compile(r"(\d+\s?%\s?off|\bdiscount\b|\bsale\b|\bhalf price\b|\bfree (shipping|trial|gift|delivery|plan|month|sample|returns)\b|\bfor free\b)", re.I)
NUMBER = re.compile(r"(?<![\w./])\$?\d[\d,.]*\s?%?(?![A-Za-z\d])")
SPELLED = re.compile(r"\b(two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|dozen)\b", re.I)
TESTIMONIAL_ATTR = re.compile(r"(\u2605|\bstars?\b|\b5/5\b|\b(customers?|users?|clients?|people|everyone) (say|said|love|loves|tell|rave)\b|\bverified\b|\u2014\s*[A-Z][a-z]+|^\s*-\s*[A-Z][a-z]+\s*$)", re.I | re.M)
MONEY = re.compile(r"\b(ad budget|ad spend|advertising spend|marketing budget|agency fees?|your agency|ads? bill)\b", re.I)
OUTCOME_END = re.compile(r"\b(sales|orders|viral|revenue|profit|rich|money rolls?|pour(s|ing)? in|flood(s|ing)? in|customers come)\b", re.I)


def load(path):
    try:
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        print(f'ERROR cannot read {path}: {e}')
        sys.exit(2)


def words(s):
    return re.findall(r"[\w'%$]+", s)


def units(s, lang):
    """Word count; for zh, ja and th (no spaces between words) a character count."""
    if lang[:2] in NO_SPACE_LANGS:
        return len(re.sub(r'\s', '', s))
    return len(words(s))


def text_of(v):
    slots = v.get('slots') or {}
    return '\n'.join(str(slots[k]) for k in slots if str(slots[k]).strip())


def norm_num(s):
    return re.sub(r'[\s,$]', '', s).rstrip('.')


def parse_end(v):
    try:
        return datetime.strptime(str(v).strip(), '%Y-%m-%d').date()
    except ValueError:
        return None


def lint_core(cs):
    """Returns the findings as (level, where, message) tuples."""
    out = []  # (level, where, message)
    add = lambda lvl, where, msg: out.append((lvl, where, msg))
    lang = str(cs.get('language', 'en')).lower()
    english = lang.startswith('en')
    brand = cs.get('brand') or {}
    if not str(cs.get('copy_target', '')).strip():
        add('FAIL', 'set', 'copy_target is empty: write the one sentence first (step 4)')
    elif len(re.findall(r'[.!?](\s|$)', str(cs['copy_target']).strip())) > 1:
        add('FAIL', 'set', 'copy_target has more than one sentence')
    if not str(brand.get('name', '')).strip():
        add('FAIL', 'set', 'brand.name missing: name the brand used (step 2)')
    if not brand.get('sources'):
        add('FAIL', 'set', 'brand.sources empty: list the files the claims, bans and terms were read from (step 3)')
    for key in ('bans', 'protected_terms'):
        if key not in brand:
            add('FAIL', 'set', f'brand.{key} missing (an empty list is allowed when the brand has none, and says so)')
    if not [c for c in (brand.get('claims') or []) if str(c).strip()]:
        add('FAIL', 'set', 'no claims to write from: stop and report what is missing (step 3)')
    allowed = {norm_num(n) for n in (cs.get('allowed_numbers') or [])}
    promo = cs.get('promotion')
    promo_ok = False
    if promo is not None:
        if not isinstance(promo, dict):
            add('FAIL', 'set', 'promotion must be null or {"text": ..., "ends": "YYYY-MM-DD"} (platform-rules d)')
        else:
            end = parse_end(promo.get('ends', ''))
            if end is None:
                add('FAIL', 'set', 'promotion.ends is not a YYYY-MM-DD date: urgency needs a real dated promotion (platform-rules d)')
            elif end < date.today():
                add('FAIL', 'set', f'promotion ended {end}: drop the urgency or give the running promotion (platform-rules d)')
            else:
                promo_ok = True
    limits = cs.get('limits') or {}
    used_slots = {k for v in (cs.get('variants') or []) for k in (v.get('slots') or {})}
    for slot in limits:
        if used_slots and slot not in used_slots:
            add('FAIL', 'set', f"limit names slot '{slot}' that no variant uses ({', '.join(sorted(used_slots))})")
    if lang[:2] in NO_SPACE_LANGS and limits:
        add('LEAD', 'set', f'language {lang}: limits and the punch check count characters (punch under {CJK_PUNCH}); is the limit meant in characters?')
    terms = [t for t in (brand.get('protected_terms') or []) if str(t).strip()]
    variants = cs.get('variants') or []
    if not variants:
        add('FAIL', 'set', 'no variants')

    for v in variants:
        vid = str(v.get('id', '?'))
        body = text_of(v)
        if not body:
            add('FAIL', vid, 'no slot text')
            continue
        supplied = bool(v.get('supplied'))
        found = []  # findings that apply to authored copy
        for slot, maxw in limits.items():
            n = units(str((v.get('slots') or {}).get(slot, '')), lang)
            if n > int(maxw):
                found.append(('FAIL', f'{slot} has {n} words, limit {maxw}'))
        for t in terms:
            for m in re.finditer(re.escape(t), body, re.I):
                if m.group(0) != t:
                    found.append(('FAIL', f"protected term written '{m.group(0)}', expected '{t}'"))
        if english:
            for m in ABSOLUTE.finditer(body):
                found.append(('FAIL', f"absolute '{m.group(0)}': use reduction phrasing (platform-rules b)"))
            if SOFT_WILL.search(body):
                found.append(('LEAD', "'will' found: is it a promise about results? (writing-rules 6)"))
            if URGENCY.search(body) and not promo_ok:
                found.append(('FAIL', f"urgency '{URGENCY.search(body).group(0)}' with no dated promotion in the set (platform-rules d)"))
            if MONEY.search(body):
                found.append(('LEAD', f"money framing '{MONEY.search(body).group(0)}': high risk, prefer the pain underneath (money-framing)"))
            if v.get('format') == 'checklist':
                last = [ln for ln in body.splitlines() if ln.strip()][-1]
                if OUTCOME_END.search(last):
                    found.append(('LEAD', f"checklist ends on '{OUTCOME_END.search(last).group(0)}': end on a feature or relief (platform-rules f)"))
            if SPELLED.search(body):
                found.append(('LEAD', f"spelled-out figure '{SPELLED.search(body).group(0)}': is it a claim or a number the brand can stand behind? (platform-rules a)"))
            w = words(body)
            worst = None  # (kinds count, kinds): scan every window, keep the worst
            for i in range(max(1, len(w) - 19)):
                win = ' '.join(w[i:i + 20])
                kinds = {k for k, rx in (('discount', DISCOUNT), ('urgency', URGENCY), ('stat', NUMBER), ('guarantee', ABSOLUTE)) if rx.search(win)}
                if len(kinds) >= 2 and (worst is None or len(kinds) > worst[0]):
                    worst = (len(kinds), kinds)
                if len(kinds) >= 3:
                    break
            if worst and worst[0] >= 3:
                found.append(('FAIL', f"stacks {', '.join(sorted(worst[1]))} inside 20 words (writing-rules 5)"))
            elif worst:
                found.append(('LEAD', f"{' and '.join(sorted(worst[1]))} inside 20 words: one idea per ad? (writing-rules 5)"))
            if v.get('format') == 'testimonial' and not v.get('supplied') and TESTIMONIAL_ATTR.search(body):
                found.append(('FAIL', f"testimonial variant carries an attribution or rating '{TESTIMONIAL_ATTR.search(body).group(0).strip()}': a testimonial is a generic voice with no name, role, number or customer attribution (HR17, HR18)"))
        for m in NUMBER.finditer(body):
            n = norm_num(m.group(0))
            if n and n not in allowed:
                found.append(('FAIL', f"figure '{m.group(0).strip()}' is not in allowed_numbers (a claim, a real price or the dated promotion) (platform-rules a)"))
        if supplied:
            for _, msg in found:
                add('REPORT', vid, msg)
            risks = [r for r in (v.get('risks') or []) if isinstance(r, dict) and r.get('pattern') and r.get('alternative')]
            if found and len(risks) < len(found):
                add('FAIL', vid, f'supplied wording has {len(found)} findings but risks[] has {len(risks)} entries with a pattern and an alternative: one per finding (supplied-copy)')
        else:
            for lvl, msg in found:
                add(lvl, vid, msg)
        if v.get('length') == 'punch':
            slots = v.get('slots') or {}
            hslot = 'headline' if 'headline' in slots else next(iter(slots), None)
            hs = str(slots.get(hslot, ''))
            n = units(hs, lang)
            cap = CJK_PUNCH if lang[:2] in NO_SPACE_LANGS else 10
            if n >= cap:
                add('FAIL', vid, f'length punch but the {hslot} slot has {n} {"characters" if lang[:2] in NO_SPACE_LANGS else "words"} (fewer than {cap} expected; the punch is counted on the headline slot)')

    authored = [v for v in variants if not v.get('supplied')]
    try:
        want = int(cs.get('count', 5))
    except (TypeError, ValueError):
        want = 5
        add('FAIL', 'set', 'count is not a number')
    if cs.get('mode', 'test') == 'test' and variants:
        if len(authored) != want:
            add('FAIL', 'set', f'{len(authored)} authored variants, count is {want} (supplied variants are not counted; use mode single for one line)')
        for axis, allowed_vals in (('format', FORMATS), ('angle', ANGLES), ('length', LENGTHS)):
            bad = [str(v.get('id')) for v in authored if v.get(axis) not in allowed_vals]
            if bad:
                add('FAIL', 'set', f"{axis} missing or unknown on {', '.join(bad)} (one of {', '.join(allowed_vals)})")
        fmts = [v.get('format') for v in authored]
        if len(set(fmts)) < min(len(authored), len(FORMATS)):
            add('FAIL', 'set', f'formats repeat ({", ".join(map(str, fmts))}): one of each (variation 2)')
        entries = [str(v.get('entry', '')).strip().lower() for v in authored]
        if '' in entries or len(set(entries)) < len(entries):
            add('FAIL', 'set', 'entry points missing or repeated (variation 1)')
        if want >= 2 and len({v.get('angle') for v in authored}) < 2:
            add('FAIL', 'set', 'every variant uses the same angle (variation 4)')
        if want >= 5:
            lens = [v.get('length') for v in authored]
            if 'punch' not in lens or 'setup' not in lens:
                add('FAIL', 'set', 'needs at least one punch (under 10 words) and one setup variant (variation 3)')

    ck = cs.get('checklist') or {}
    for k in CHECKLIST:
        val = str(ck.get(k, '')).strip()
        plain = re.sub(r'[^\w\s/-]', '', val.lower()).strip()
        if plain in BARE:
            add('FAIL', 'checklist', f"item '{k}' {'missing' if not val else 'is a bare ' + repr(val)}: write what was seen (HR14)")
        elif len(val) < MIN_SEEN:
            add('FAIL', 'checklist', f"item '{k}' is too short ({len(val)} characters): say which lines you read and what you saw (HR14)")

    # every LEAD of this run needs an answer in leads[] (where = variant id or set)
    answers = {}
    for a in cs.get('leads') or []:
        if isinstance(a, dict) and len(str(a.get('seen', '')).strip()) >= MIN_SEEN:
            answers.setdefault(str(a.get('where', '')), []).append(a)
    for lvl, where, msg in list(out):
        if lvl == 'LEAD' and where not in answers:
            add('FAIL', where, f'LEAD has no answer: add {{"where": "{where}", "seen": "what you read and decided"}} to leads[] ({msg[:60]}...)')
    if not english:
        add('LEAD', 'set', f'word-list checks skipped for language {lang}: read every line against references/rules.json')
    return out


def lint(path):
    cs = load(path)
    out = lint_core(cs)
    variants = cs.get('variants') or []
    for lvl, where, msg in out:
        print(f'{lvl:6} {where:9} {msg}')
    f = sum(1 for o in out if o[0] == 'FAIL')
    l = sum(1 for o in out if o[0] == 'LEAD')
    r = sum(1 for o in out if o[0] == 'REPORT')
    print(f'copy lint: {len(variants)} variants, {f} fail, {l} leads, {r} reports')
    return 1 if f else 0


def write_atomic(path, text):
    """Write beside the target then replace; make the folder first. Returns None or an error line."""
    try:
        d = os.path.dirname(os.path.abspath(path))
        os.makedirs(d, exist_ok=True)
        fd, tmp = tempfile.mkstemp(dir=d, prefix='.copyset-')
        try:
            with os.fdopen(fd, 'w', encoding='utf-8') as f:
                f.write(text)
            os.replace(tmp, path)
        except BaseException:
            if os.path.exists(tmp):
                os.unlink(tmp)
            raise
    except OSError as err:
        return f'ERROR cannot write {path}: {err}'
    return None


def check_locked_text(e, cs):
    """Checks of the locked text against the brand in a copy set; returns FAIL/LEAD lines."""
    res = []
    brand = cs.get('brand') or {}
    tokens = set(map(str, e.get('protected_tokens') or []))
    for t in brand.get('protected_terms') or []:
        if str(t).strip() and str(t) not in tokens:
            res.append(('FAIL', f"brand protected term '{t}' is not in protected_tokens"))
    copy = '\n'.join(str(e.get(k, '')) for k in ('headline', 'body', 'cta'))
    allowed = {norm_num(n) for n in (cs.get('allowed_numbers') or [])}
    for v in cs.get('variants') or []:
        allowed |= {norm_num(m.group(0)) for m in NUMBER.finditer(text_of(v))}
    for m in NUMBER.finditer(copy):
        n = norm_num(m.group(0))
        if n and n not in allowed:
            res.append(('FAIL', f"figure '{m.group(0).strip()}' is not in allowed_numbers or the source copy (platform-rules a)"))
    lang = str(e.get('language', 'en')).lower()
    if lang.startswith('en'):
        for m in ABSOLUTE.finditer(copy):
            res.append(('FAIL', f"absolute '{m.group(0)}' in the locked text (platform-rules b)"))
        if URGENCY.search(copy):
            res.append(('LEAD', f"urgency '{URGENCY.search(copy).group(0)}' in the locked text: only for a real dated promotion"))
    else:
        res.append(('LEAD', f'word lists skipped for {lang}: read the locked text against absolutes, urgency and both layers'))
    return res


def lock(entry_path, ledger, replace=False, reason='', copy_set=None):
    e = load(entry_path)
    problems = []
    for k in ('source', 'target', 'headline', 'body', 'cta', 'protected_tokens', 'product_marks', 'notes'):
        if k not in e:
            problems.append(f'field {k} missing')
    copy = '\n'.join(str(e.get(k, '')) for k in ('headline', 'body', 'cta'))
    if not copy.strip():
        problems.append('headline, body and cta are all empty')
    marks = ' '.join(map(str, e.get('product_marks') or []))
    for t in e.get('protected_tokens') or []:
        if t not in copy and t not in marks:
            problems.append(f"protected token '{t}' is not in the copy or the product marks, letter for letter")
    if copy_set:
        for lvl, msg in check_locked_text(e, load(copy_set)):
            if lvl == 'FAIL':
                problems.append(msg)
            else:
                print('LEAD  ', msg)
    else:
        print('LEAD   no --copy-set: protected terms, figures and absolutes in the locked text were not checked against the brand')
    try:
        with open(ledger, encoding='utf-8') as f:
            led = json.load(f)
    except FileNotFoundError:
        led = {'entries': []}
    except (OSError, json.JSONDecodeError) as err:
        print(f'ERROR ledger {ledger} is not readable JSON: {err}')
        return 2
    norm = lambda p: os.path.normpath(str(p))
    live = [x for x in led.get('entries', []) if norm(x.get('source')) == norm(e.get('source')) and not x.get('superseded_by')]
    if live and not replace:
        problems.append(f"{e.get('source')} was already locked at {live[-1].get('locked_at')}: a change after a render needs --replace --reason")
    if replace and not reason.strip():
        problems.append('--replace needs --reason')
    if problems:
        for p in problems:
            print('FAIL  ', p)
        return 1
    e['source'] = norm(e['source'])
    e['locked_at'] = datetime.now(timezone.utc).isoformat(timespec='seconds')
    if replace and live:
        e['replaces'] = {'locked_at': live[-1].get('locked_at'), 'reason': reason}
        for x in live:
            x['superseded_by'] = e['locked_at']
    led.setdefault('entries', []).append(e)
    err = write_atomic(ledger, json.dumps(led, ensure_ascii=False, indent=1) + '\n')
    if err:
        print(err)
        return 2
    print(f"locked {e['source']} -> {e['target']} at {e['locked_at']} in {ledger} ({len(led['entries'])} entries, {len([x for x in led['entries'] if not x.get('superseded_by')])} live)")
    return 0


def export(path, vid, slot, out, force=False):
    cs = load(path)
    v = next((x for x in cs.get('variants') or [] if str(x.get('id')) == vid), None)
    if v is None:
        print(f'ERROR no variant {vid}')
        return 1
    findings = lint_core(cs)
    for lvl, where, msg in findings:
        if where == vid and lvl in ('REPORT', 'LEAD'):
            print(f'{lvl:6} {where:9} {msg}')
    fails = [x for x in findings if x[0] == 'FAIL']
    if fails and not force:
        for lvl, where, msg in fails:
            print(f'{lvl:6} {where:9} {msg}')
        print(f'refused: {len(fails)} lint FAIL(s) in the copy set; fix them or use --force')
        return 1
    slots = v.get('slots') or {}
    if slot:
        if slot not in slots:
            print(f'ERROR variant {vid} has no slot {slot}')
            return 1
        text = str(slots[slot])
    else:
        text = '\n\n'.join(str(slots[k]) for k in slots if str(slots[k]).strip())
    err = write_atomic(out, text + '\n')
    if err:
        print(err)
        return 2
    print(f'wrote {out}: variant {vid}{" slot " + slot if slot else ""}, {len(words(text))} words, verbatim{" (forced past " + str(len(fails)) + " FAIL)" if fails else ""}')
    return 0


def opt(args, name, default=None):
    return args[args.index(name) + 1] if name in args and args.index(name) + 1 < len(args) else default


def main(argv):
    if len(argv) < 2 or argv[0] not in ('lint', 'lock', 'export'):
        print(__doc__)
        return 2
    cmd, target, rest = argv[0], argv[1], argv[2:]
    if cmd == 'lint':
        return lint(target)
    if cmd == 'lock':
        ledger = opt(rest, '--ledger')
        if not ledger:
            print('ERROR lock needs --ledger')
            return 2
        return lock(target, ledger, '--replace' in rest, opt(rest, '--reason', '') or '', opt(rest, '--copy-set'))
    vid, out = opt(rest, '--variant'), opt(rest, '--out')
    if not vid or not out:
        print('ERROR export needs --variant and --out')
        return 2
    return export(target, vid, opt(rest, '--slot'), out, '--force' in rest)


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
