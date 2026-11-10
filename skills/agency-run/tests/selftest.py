#!/usr/bin/env python3
"""The core's selftest (TOOL.md section 5: every core release replays every earlier event shape; contract A18).

Run: python3 v5/skills/agency-run/tests/selftest.py   (stdlib only; exit 0 when every case passes)
Fixtures (made-up data, customer "Fixture Co"):
  fixtures/workspace/  an old-layout v5 workspace: new-skill tasks, skill_built and skill_proven, .agency/ and repo:
                       paths, 4.4 sends, artifacts/X, nulls, a recurring read, a blocked plan task, a failed check
  fixtures/install/    an install in the new layout: params, lane_renamed (an old id used after it), sent files under
                       artifacts/<customer id>/, an owner upload, a bot migrations.json, and a truncated last line
  fixtures/job6.jsonl  job 6 of the 5 Nov production test (a test install; addresses [test-address]), for outcome.json
"""
import json, os, shutil, subprocess, sys, tarfile, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
TOOL = os.path.join(HERE, '..', 'scripts', 'agency.py')
HOOK = os.path.join(HERE, '..', 'scripts', 'hook.py')
FIX = os.path.join(HERE, 'fixtures')
USER = os.path.join(FIX, 'install', 'bot', 'user.md')
fails = []


def run(home, *args, stdin=None, tool=TOOL, env=None):
    base = {k: v for k, v in os.environ.items() if k not in ('SL8_JOB', 'SL8_DIR')}
    r = subprocess.run([sys.executable, tool, *args], capture_output=True, text=True, input=stdin,
                       env={**base, 'HOME': home, **(env or {})})
    return r.returncode, r.stdout + r.stderr


def ok(name, cond, out=''):
    print(('PASS ' if cond else 'FAIL ') + name)
    if not cond:
        fails.append(name)
        print('  ' + out.strip().replace('\n', '\n  ')[:2000])


def home_from(fixture=None):
    h = tempfile.mkdtemp(prefix='agency-selftest-')
    if fixture:
        shutil.copytree(os.path.join(FIX, fixture), h, dirs_exist_ok=True)
    return h


def lines(h):
    return open(os.path.join(h, 'work', 'agency', 'log.jsonl'), encoding='utf-8').read().splitlines()


# 1. the old workspace: migrate (dry run, then for real), replay, a second migrate refused
h = home_from()
os.makedirs(os.path.join(h, 'bot')); shutil.copy(USER, os.path.join(h, 'bot', 'user.md'))
src = os.path.join(FIX, 'workspace')
c, o = run(h, 'migrate', src, '--dry-run')
ok('migrate --dry-run lists the copies and writes nothing', c == 0 and 'artifacts/fixtureco/aso/report.md' in o
   and '.agency' not in o and not os.path.exists(os.path.join(h, 'work')), o)
c, o = run(h, 'migrate', src)
ok('migrate copies the workspace', c == 0 and lines(h) == open(os.path.join(src, 'log.jsonl')).read().splitlines(), o)
ok('migrate: artifacts/X lands in artifacts/<customer id>/X, byte for byte',
   open(os.path.join(h, 'artifacts', 'fixtureco', 'aso', 'report.md'), 'rb').read()
   == open(os.path.join(src, 'artifacts', 'aso', 'report.md'), 'rb').read())
cust = open(os.path.join(h, 'work', 'agency', 'CUSTOMER.md')).read()
ok('migrate: CUSTOMER.md without "This engagement"', 'This engagement' not in cust and '## People' in cust, cust)
ok('migrate: no old equipment', not os.path.exists(os.path.join(h, '.agency')) and not os.path.exists(os.path.join(h, 'AGENTS.md')))
c, o = run(h, 'migrate', src)
ok('migrate refuses an install that already has a log', c == 1 and 'already has a log' in o, o)
c, o = run(h, 'check')
ok('check passes on the migrated old shapes (new-skill, skill_built, .agency/, artifacts/X)', c == 0 and 'check: ok' in o, o)
n = len(lines(h))
c, o = run(h, 'status')
card = open(os.path.join(h, 'work', 'agency', 'now.md')).read()
new = [json.loads(l) for l in lines(h)[n:]]
ok('status replays the old shapes, logs params once, then the standing titles (1.1.0)',
   c == 0 and [e['ev'] for e in new] == ['params'] + ['lane_set'] * len(new[1:])
   and {e['lane'] for e in new[1:]} <= {'discovery', 'plan', 'comms'}, o)
ok('the card is customer-safe', all(x not in card for x in ('khalid', 'customer:', 'Printed by', 'standing', 'Focus',
                                                            'T1', 'C1 ', 'FOLLOW', 'NOT SENT', 'review it')), card)
ok('the card has the goal, our work with its stage, the wait and the last email',
   card.startswith('# Fixture Co · ') and 'Goal: 1,000 installs by 2027-01-31 · 180' in card
   and 'Store pages that convert · active · S01' in card and 'Your console access (asked 2026-10-12, by 2026-12-01)' in card
   and 'Last email: 2026-10-10 · Strategy v1' in card, card)
n = len(lines(h))
run(h, 'status')
ok('status logs params only when user.md changed', len(lines(h)) == n)

# 2. --goal: only that goal's lanes and their events, with the standing lanes; a bundle (.tar)
h2 = home_from()
os.makedirs(os.path.join(h2, 'bot')); shutil.copy(USER, os.path.join(h2, 'bot', 'user.md'))
tar = os.path.join(h2, 'ws.tar')
with tarfile.open(tar, 'w') as tf:
    tf.add(src, arcname='workspaces/fixtureco')
c, o = run(h2, 'migrate', tar, '--goal', 'G1')
log = [json.loads(l) for l in lines(h2)]
ok('migrate <bundle.tar> --goal G1 keeps G1, G1b and the standing lanes, drops G2 and its lane',
   c == 0 and {e['goal']['id'] for e in log if e['ev'] == 'goal'} == {'G1', 'G1b'}
   and not any(e.get('task') == 'V1' or (e['ev'] == 'read' and e['what'] == 'views') for e in log)
   and not os.path.exists(os.path.join(h2, 'artifacts', 'fixtureco', 'video')), o)
c, o = run(h2, 'check')
ok('check passes after a --goal migrate', c == 0, o)

# 3. the new-layout install: truncated last line, lane_renamed, artifacts/<customer id>/
h3 = home_from('install')
c, o = run(h3, 'view', 'tail', '3')
ok('a read command skips a truncated last line with a warning', c == 0 and 'truncated' in o and 'lost mach' not in o.split('warning')[0], o)
c, o = run(h3, 'check')
ok('check reports the truncated last line', c == 1 and 'truncated' in o, o)
c, o = run(h3, 'check', '--fix')
last = json.loads(lines(h3)[-1])
ok('check --fix drops it and logs its text as an error', c == 0 and last['ev'] == 'error' and 'lost mach' in last['text'], o)
c, o = run(h3, 'status')
ren = [json.loads(l) for l in lines(h3) if '"lane_renamed"' in l]
ok('status logs a lane_renamed per bot migration not yet logged', c == 0 and len(ren) == 2 and ren[-1]['to'] == 'aso-store-pages', o)
run(h3, 'status')
ok('a migration is logged once', sum('"lane_renamed"' in l for l in lines(h3)) == 2)
c, o = run(h3, 'view', 'lane', 'aso-fixture')
ok('an old lane id resolves to the new one', c == 0 and '"aso-store-pages"' in o and 'aso-fixture-S01' in o, o)
c, o = run(h3, 'log', 'fact', '{"text": "x", "src": "selftest"}')
ok('the first append after a truncated line works', c == 0)
h4 = home_from('install')
c, o = run(h4, 'log', 'fact', '{"text": "after a lost machine", "src": "selftest"}')
evs = [json.loads(l) for l in lines(h4)[-2:]]
ok('the first command that appends drops a truncated line, logging it as an error',
   c == 0 and evs[0]['ev'] == 'error' and 'lost mach' in evs[0]['text'] and evs[1]['ev'] == 'fact', o)
art = os.path.join(h4, 'artifacts', 'fixtureco', 'aso', 'report.md')
open(art, 'a').write('edited by hand\n')
open(os.path.join(h4, 'artifacts', 'fixtureco', 'stray.md'), 'w').write('no event\n')
c, o = run(h4, 'check')
ok('check catches an edited shared copy and a stray file (not the owner\'s uploads)',
   c == 1 and 'aso/report.md differs' in o and 'stray.md is shared' in o and 'attachments' not in o, o)
c, o = run(h4, 'check', '--fix')
ok('check --fix moves the stray file to work/recovered/ and logs it; the edited copy stays a FAIL',
   c == 1 and os.path.exists(os.path.join(h4, 'work', 'recovered', 'stray.md')) and 'stray' not in o.split('fixed:')[-1].split('\n', 1)[-1]
   and json.loads(lines(h4)[-1])['ev'] == 'error', o)
# a stray outside artifacts/<customer id>/ (agency#88: `touch artifacts/x` in the 5 Nov production test)
h4b = home_from('install')
run(h4b, 'check', '--fix')
os.makedirs(os.path.join(h4b, 'artifacts', 'notes'))
for rel in ('x', 'notes/y.md'):
    open(os.path.join(h4b, 'artifacts', rel), 'w').write('')
c, o = run(h4b, 'check')
ok('check reports a file under artifacts/ outside the customer folder (not the owner\'s uploads)',
   c == 1 and 'artifacts/x is outside artifacts/fixtureco/' in o and 'artifacts/notes/y.md is outside' in o
   and 'attachments' not in o, o)
n = len(lines(h4b))
c, o = run(h4b, 'check', '--fix')
errs = [json.loads(l) for l in lines(h4b)[n:]]
ok('check --fix moves each one to work/recovered/, path kept, with an error event each, and passes',
   c == 0 and all(os.path.isfile(os.path.join(h4b, 'work', 'recovered', 'artifacts', r)) and
                  not os.path.exists(os.path.join(h4b, 'artifacts', r)) for r in ('x', 'notes/y.md'))
   and os.path.isfile(os.path.join(h4b, 'artifacts', 'attachments', 'upload.pdf'))
   and [e['ev'] for e in errs] == ['error', 'error'] and 'artifacts/x' in errs[1]['text'] + errs[0]['text'], o)
# --fix never overwrites: an earlier recovered file, and two strays with one target (review of agency#98, F1)
h4c = home_from('install')
run(h4c, 'check', '--fix')
P = lambda *r: os.path.join(h4c, *r)
for rel, text in (('work/recovered/artifacts/x', 'earlier'), ('artifacts/x', 'outside'),
                  ('artifacts/fixtureco/artifacts/x', 'inside')):
    os.makedirs(os.path.dirname(P(rel)), exist_ok=True)
    open(P(rel), 'w').write(text)
n = len(lines(h4c))
c, o = run(h4c, 'check', '--fix')
rec = sorted(open(os.path.join(dp, f)).read() for dp, _, fs in os.walk(P('work', 'recovered', 'artifacts')) for f in fs)
dests = [json.loads(l)['text'].rsplit('moved to ', 1)[-1] for l in lines(h4c)[n:]]
ok('check --fix keeps every file when targets collide, and each event names a destination that holds it',
   c == 0 and rec == ['earlier', 'inside', 'outside'] and len(dests) == 2 and len(set(dests)) == 2
   and all(os.path.isfile(P(d)) for d in dests), o)
# a file where --fix needs a folder: that file is reported and left, the rest still move (F2)
h4d = home_from('install')
run(h4d, 'check', '--fix')
P = lambda *r: os.path.join(h4d, *r)
for rel in ('work/recovered/artifacts/notes', 'artifacts/notes/y.md', 'artifacts/z'):
    os.makedirs(os.path.dirname(P(rel)), exist_ok=True)
    open(P(rel), 'w').write('')
n = len(lines(h4d))
c, o = run(h4d, 'check', '--fix')
texts = ' '.join(json.loads(l)['text'] for l in lines(h4d)[n:])
ok('check --fix reports a stray it cannot move, keeps it, and moves the others',
   c == 1 and 'Traceback' not in o and os.path.isfile(P('artifacts', 'notes', 'y.md'))
   and os.path.isfile(P('work', 'recovered', 'artifacts', 'z')) and 'artifacts/notes/y.md not moved' in texts, o)
# a symlinked folder under artifacts/, at the top or deeper, is a stray; --fix moves the link, not its target (F3)
h4e = home_from('install')
run(h4e, 'check', '--fix')
P = lambda *r: os.path.join(h4e, *r)
os.makedirs(P('work', 'elsewhere')); open(P('work', 'elsewhere', 'f.md'), 'w').write('kept')
os.makedirs(P('artifacts', 'sub'))
os.symlink(P('work', 'elsewhere'), P('artifacts', 'linked'))
os.symlink(P('work', 'elsewhere'), P('artifacts', 'sub', 'linked'))
c, o = run(h4e, 'check')
ok('check reports a symlinked folder under artifacts/ outside the customer folder',
   c == 1 and 'artifacts/linked is outside' in o and 'artifacts/sub/linked is outside' in o, o)
c, o = run(h4e, 'check', '--fix')
ok('check --fix moves each link itself and leaves its target',
   c == 0 and os.path.islink(P('work', 'recovered', 'artifacts', 'linked'))
   and os.path.islink(P('work', 'recovered', 'artifacts', 'sub', 'linked'))
   and open(P('work', 'elsewhere', 'f.md')).read() == 'kept' and not os.path.lexists(P('artifacts', 'linked')), o)

# params cover the free-text sections of user.md (A10, D83 2 A), and an upgrade from labels-only params is quiet
h4f = home_from('install')
run(h4f, 'check', '--fix')
um = os.path.join(h4f, 'bot', 'user.md')
params = lambda: [json.loads(l) for l in lines(h4f) if '"params"' in l]
c, o = run(h4f, 'status')
ok('the first status on 1.0.2 records the section digests of an unchanged labels-only user.md, with no plan review',
   c == 0 and len(params()) == 2 and 'sections' in params()[-1] and 'plan review' not in o, o)
free = ('<USER>\n## About the customer\n<!-- example: who they are -->\nA school app, three founders.\n\n'
        '## About the product\nDismissal planning for schools.\n\n## Goal and scope\n1,000 installs by 2027-01-31; '
        'both store pages.\n\nCustomer: Fixture Co\nCustomer id: fixtureco\n'
        'Reply address: fixtureco-aso+agency@slateworkspace.com\nBcc: owner@example.com\n</USER>\n')
open(um, 'w').write(free)
c, o = run(h4f, 'status')
ok('a move to the free-text user.md logs params with a plan review', c == 0 and len(params()) == 3
   and 'take-in adds a plan review' in o, o)
open(um, 'w').write(free.replace('three founders.', 'three  founders.\n<!-- a note -->'))
c, o = run(h4f, 'status')
ok('a change to whitespace or a comment in a section logs nothing', c == 0 and len(params()) == 3, o)
open(um, 'w').write(free.replace('1,000 installs', '5,000 installs'))
c, o = run(h4f, 'status')
ok('an edit to the goal and scope text alone logs params with a plan review',
   c == 0 and len(params()) == 4 and params()[-1]['params'] == params()[-2]['params']
   and params()[-1]['sections'] != params()[-2]['sections'] and 'take-in adds a plan review' in o, o)
open(um, 'w').write(free.replace('1,000 installs', '5,000 installs').replace('owner@example.com', 'other@example.com'))
c, o = run(h4f, 'status')
ok('an edit to a label logs params with a plan review',
   c == 0 and len(params()) == 5 and params()[-1]['params']['bcc'] == 'other@example.com' and 'plan review' in o, o)

# 4. refusals: nothing is built on the machine; dates; out outside work/; skill history
h5 = home_from('install')
run(h5, 'check', '--fix')
for name, args in (
        ('a new-skill task', ['log', 'task_added', '{"task": {"id": "N1", "lane": "discovery", "kind": "new-skill", "do": "x", "refs": ["work/x"], "done_when": "y"}}']),
        ('a skill_built event', ['log', 'skill_built', '{"skill": "x"}']),
        ('a skill_proven event', ['log', 'skill_proven', '{"skill": "x"}']),
        ('a due that is not YYYY-MM-DD', ['task', 'wait', 'aso-fixture-S01', '--on', 'customer:ana', '--due', 'Friday']),
        ('a goal date that is not YYYY-MM-DD', ['log', 'goal', '{"goal": {"id": "G9", "text": "x", "by": "next spring", "state": "active"}}']),
        ('an out outside work/', ['task', 'done', 'D2', '--out', 'artifacts/fixtureco/x.md', '--check', 'pass'])):
    n = len(lines(h5))
    c, o = run(h5, *args)
    ok(f'refused: {name}', c == 1 and len(lines(h5)) == n, o)

# 5. the hook: the record by path, everything else free; only on an agency install (D76)
h6 = home_from()
c, o = run(h6, stdin=json.dumps({'tool_name': 'Write', 'tool_input': {'file_path': os.path.join(h6, 'artifacts', 'x.md')}, 'cwd': h6}), tool=HOOK)
ok('hook: an install without <AGENCY> lets a write to artifacts/ through → exit 0', c == 0, o)
open(os.path.join(h5, 'bot', 'setup.md'), 'w').write('<AGENCY>\nid: fixture\n</AGENCY>\n')
for name, call, code in (
        ('a shell append to work/agency/log.jsonl', {'tool_name': 'Bash', 'tool_input': {'command': 'echo x >> work/agency/log.jsonl'}}, 2),
        ('a shell write to artifacts/<customer id>/', {'tool_name': 'Bash', 'tool_input': {'command': 'cp work/a.md ~/artifacts/fixtureco/'}}, 2),
        ('rm in artifacts/', {'tool_name': 'Bash', 'tool_input': {'command': 'rm -f artifacts/fixtureco/a.md'}}, 2),
        ('Write to work/agency/now.md', {'tool_name': 'Write', 'tool_input': {'file_path': 'HOME/work/agency/now.md'}}, 2),
        ('Edit in artifacts/', {'tool_name': 'Edit', 'tool_input': {'file_path': 'HOME/artifacts/fixtureco/a.md'}}, 2),
        ('a write in work/', {'tool_name': 'Bash', 'tool_input': {'command': 'echo x > work/notes.md'}}, 0),
        ('a write to work/meetings/now.md', {'tool_name': 'Bash', 'tool_input': {'command': 'echo x > work/meetings/now.md'}}, 0),
        ('a copy out of artifacts/', {'tool_name': 'Bash', 'tool_input': {'command': 'cp artifacts/fixtureco/a.md work/inputs/'}}, 0),
        ('reading the log', {'tool_name': 'Bash', 'tool_input': {'command': 'tail -5 work/agency/log.jsonl'}}, 0),
        ('the tool writing an email and its owner\'s copy', {'tool_name': 'Bash', 'tool_input': {'command': 'agency send C9'}}, 0),
        ('Write to work/agency/CUSTOMER.md', {'tool_name': 'Write', 'tool_input': {'file_path': 'HOME/work/agency/CUSTOMER.md'}}, 0)):
    call['tool_input'] = {k: v.replace('HOME', h5) for k, v in call['tool_input'].items()}
    c, o = run(h5, stdin=json.dumps({**call, 'cwd': h5}), tool=HOOK)
    ok(f'hook: {name} → exit {code}', c == code, o)

# 6. --version
c, o = run(h5, '--version')
sys.path.insert(0, os.path.dirname(TOOL)); sys.dont_write_bytecode = True
import agency  # noqa: E402
names = agency.attachment_names(['work/aso/us/play/04_Metadata.md', 'work/aso/us/ios/04_Metadata.md', 'work/discovery/summary.pdf'])
ok('two attachments with one name get their paths as names; a unique one keeps its own',
   names == {'work/aso/us/play/04_Metadata.md': 'aso-us-play-04_Metadata.md', 'work/aso/us/ios/04_Metadata.md': 'aso-us-ios-04_Metadata.md', 'work/discovery/summary.pdf': 'summary.pdf'}, names)
ok('--version prints VERSION', c == 0 and o.strip() == open(os.path.join(HERE, '..', 'VERSION')).read().strip(), o)

# 7. send: the waiting email in work/outbox/ and the owner's copy in artifacts/<customer id>/outbox/ (D57, D78)
h7 = home_from('install')
run(h7, 'check', '--fix')
os.makedirs(os.path.join(h7, 'work', 'comms'))
open(os.path.join(h7, 'work', 'comms', 'C9.md'), 'w').write('Subject: Your report\n\nHi Ana,\n\n{{links}}\n\nSlate Agency\n')
run(h7, 'log', 'task_added', json.dumps({'task': {'id': 'C9', 'lane': 'comms', 'kind': 'comms', 'title': 'The report',
                                                  'do': 'send it', 'to': 'ana@example.com', 'out': 'work/comms/C9.md',
                                                  'refs': ['work/aso/report.md']}}))
run(h7, 'task', 'done', 'C9', '--check', 'pass')
c, o = run(h7, 'send', 'C9')
read = lambda *p: open(os.path.join(h7, *p), 'rb').read() if os.path.isfile(os.path.join(h7, *p)) else None
box, own = ('work', 'outbox', 'C9.eml'), ('artifacts', 'fixtureco', 'outbox', 'C9.eml')
ok('send writes the email to work/outbox/ and the same bytes to artifacts/<customer id>/outbox/',
   c == 0 and b'X-Unsent: 1' in (read(*box) or b'') and read(*box) == read(*own), o)
c, o = run(h7, 'check')
ok('check passes with the owner\'s copy waiting', c == 0, o)
if read(*own):
    open(os.path.join(h7, *own), 'ab').write(b'edited by hand\n')
c, o = run(h7, 'check')
ok('check reports a hand edit of the owner\'s copy', c == 1 and 'outbox/C9.eml differs' in o, o)
c, o = run(h7, 'send', 'C9')
ok('send again writes both copies again', c == 0 and read(*box) == read(*own) and run(h7, 'check')[0] == 0, o)
c, o = run(h7, 'send', 'C9', '--by', 'khalid')
ok('send --by khalid moves both copies to their outbox/sent/',
   c == 0 and read(*box) is None and read(*own) is None and read('work', 'outbox', 'sent', 'C9.eml')
   and read('work', 'outbox', 'sent', 'C9.eml') == read('artifacts', 'fixtureco', 'outbox', 'sent', 'C9.eml')
   and json.loads(lines(h7)[-1])['text_ref'] == 'work/outbox/sent/C9.eml', o)
c, o = run(h7, 'check')
ok('check passes once it is sent', c == 0, o)
open(os.path.join(h7, 'artifacts', 'fixtureco', 'outbox', 'X.eml'), 'w').write('no twin\n')
c, o = run(h7, 'check')
ok('check reports an owner copy with no email in work/outbox/ as a stray', c == 1 and 'outbox/X.eml is shared but no pass or sent event covers it' in o, o)

# 8. outcome.json (A16, D82): job 6 of the 5 Nov production test shared two files and wrote "partial"
h8 = home_from()
put = lambda rel, text: (os.makedirs(os.path.dirname(os.path.join(h8, rel)), exist_ok=True),
                         open(os.path.join(h8, rel), 'w').write(text))
put('bot/user.md', open(USER).read().replace('fixtureco', 'larkspoon-test'))
earlier = [{'ev': 'task_added', 'task': {'id': i, 'lane': l, 'kind': k}, 't': '2026-11-05T18:20:00Z', 'by': 'agent'}
           for i, l, k in (('D4', 'discovery', 'deliverable'), ('P1', 'plan', 'plan'), ('D3', 'comms', 'customer'))]
earlier.append({'ev': 'session', 'phase': 'end', 't': '2026-11-05T18:56:28Z', 'by': 'agent'})  # job 5's end
put('work/agency/log.jsonl', ''.join(json.dumps(e) + '\n' for e in earlier) + open(os.path.join(FIX, 'job6.jsonl')).read())
for rel in ('artifacts/larkspoon-test/discovery/summary.md', 'work/outbox/C1.eml', 'artifacts/larkspoon-test/outbox/C1.eml'):
    put(rel, 'made up\n')
both = ['artifacts/larkspoon-test/discovery/summary.md', 'artifacts/larkspoon-test/outbox/C1.eml']
hh = agency.Home(h8)
ok('job 6 replayed: delivered, naming the pass\'s copy and the email send wrote', getattr(agency, 'shared_this_job', None)
   and agency.shared_this_job(hh, hh.events(), hh.plan()) == both)
put('outcome.json', json.dumps({'status': 'partial', 'reason': 'nothing shared this job: the plan and the first email'}))
c, o = run(h8, 'check')
ok('check reports a partial outcome.json when this job shared files', c == 1 and all(f in o for f in both)
   and 'FAIL outcome' in o, o)
put('outcome.json', json.dumps({'status': 'delivered', 'deliverables': [{'path': '/home/user/' + f} for f in both]}))
c, o = run(h8, 'check')
ok('check accepts delivered', 'FAIL outcome' not in o, o)

# 9. core 1.1.0, protocol 1.1 (D85; protocol design §4.1-§4.8, AC2.1-AC2.11)
J = {'SL8_JOB': 'exec_test-1'}
A01 = os.path.join(HERE, '..', '..', '..', 'agencies', 'aso', 'skills', 'a01-aso', 'lanes', 'stages.json')
STAGES = json.load(open(A01))['aso/store-pages'] if os.path.isfile(A01) else []
log = lambda h, ev, obj, env=None: run(h, 'log', ev, json.dumps(obj), env=env)
last = lambda h: json.loads(lines(h)[-1])
raw = lambda h, *evs: open(os.path.join(h, 'work', 'agency', 'log.jsonl'), 'a').write(''.join(json.dumps(e) + '\n' for e in evs))
card_of = lambda h: open(os.path.join(h, 'work', 'agency', 'now.md')).read()
W = lambda i, **k: {'task': {'id': i, 'lane': 'aso-pages', 'kind': 'work', 'title': f'Work {i[1:]}', 'do': 'x',
                              'done_when': 'y', **k}}


def fresh(name='install'):
    h = home_from(name)
    run(h, 'check', '--fix')
    return h


def stages_in(h, skill='a01-aso', data=None):
    d = os.path.join(h, '.sl8', 'bot', '.claude', 'skills', skill, 'lanes')
    os.makedirs(d, exist_ok=True)
    json.dump(data or {'aso/store-pages': STAGES}, open(os.path.join(d, 'stages.json'), 'w'))


ok('A01 ships lanes/stages.json with its eight stages', [s['id'] for s in STAGES] == [f'S0{i}' for i in range(1, 9)]
   and STAGES[2]['name'] == 'Keywords' and STAGES[7]['name'] == 'Report and roadmap', A01)

# AC2.1: every new field's validation, refusals included
h9 = fresh()
os.makedirs(os.path.join(h9, 'work', 'k')); open(os.path.join(h9, 'work', 'k', 'sample.md'), 'w').write('s')
long = 'x' * 61
for name, ev, obj in (
        ('job from the agent', 'fact', {'text': 'x', 'src': 'y', 'job': 'exec_1'}),
        ('a goal lane_opened without a title', 'lane_opened', {'lane': {'id': 'x2', 'goal': 'G1', 'state': 'planned'}}),
        ('a lane title over 60 characters', 'lane_opened', {'lane': {'id': 'x2', 'goal': 'G1', 'state': 'planned', 'title': long}}),
        ('a lane_set that nulls a title', 'lane_set', {'lane': 'aso-pages', 'set': {'title': None}, 'why': 'x'}),
        ('a lane_set with an empty title', 'lane_set', {'lane': 'aso-pages', 'set': {'title': ' '}, 'why': 'x'}),
        ('a task title over 120 characters', 'task_added', W('W1', title='x' * 121)),
        ('a lane due that is not YYYY-MM-DD', 'lane_set', {'lane': 'aso-pages', 'set': {'due': 'Friday'}, 'why': 'x'}),
        ('received.task unknown', 'received', {'from': 'customer:ana', 'channel': 'email', 'ref': 'artifacts/attachments/upload.pdf', 'task': 'NOPE'}),
        ('caused_by unknown', 'task_added', W('W1', caused_by='NOPE')),
        ('approve on our own task', 'task_added', W('W1', owner='us', approve='work/aso/report.md')),
        ('a customer approve outside artifacts/<customer id>/', 'task_added',
         {'task': {'id': 'A9', 'lane': 'discovery', 'kind': 'customer', 'title': 'Approve it', 'do': 'x', 'owner': 'customer', 'approve': 'work/aso/report.md'}}),
        ('a customer approve that does not exist', 'task_added',
         {'task': {'id': 'A9', 'lane': 'discovery', 'kind': 'customer', 'title': 'Approve it', 'do': 'x', 'owner': 'customer', 'approve': 'artifacts/fixtureco/none.md'}}),
        ('an owner approve outside work/', 'task_added', W('K9', owner='khalid', approve='artifacts/fixtureco/aso/report.md')),
        ('an owner approve that does not exist', 'task_added', W('K9', owner='khalid', approve='work/k/none.md')),
        ('stage ids that are not Snn', 'lane_set', {'lane': 'aso-pages', 'set': {'stages': [{'id': 'S1', 'name': 'Intake'}]}, 'why': 'x'}),
        ('stages out of order', 'lane_set', {'lane': 'aso-pages', 'set': {'stages': [{'id': 'S02', 'name': 'A'}, {'id': 'S01', 'name': 'B'}]}, 'why': 'x'}),
        ('a repeated stage id', 'lane_set', {'lane': 'aso-pages', 'set': {'stages': [{'id': 'S01', 'name': 'A'}, {'id': 'S01', 'name': 'B'}]}, 'why': 'x'}),
        ('a stage name over 40 characters', 'lane_set', {'lane': 'aso-pages', 'set': {'stages': [{'id': 'S01', 'name': 'x' * 41}]}, 'why': 'x'}),
        ('more than 20 stages', 'lane_set', {'lane': 'aso-pages', 'set': {'stages': [{'id': f'S{i:02}', 'name': 'x'} for i in range(1, 22)]}, 'why': 'x'}),
        ('a note with an id and a stage code', 'session', {'phase': 'end', 'note': 'It finished aso-fixture-S01.'}),
        ('a note with a raw date', 'session', {'phase': 'end', 'note': 'Asked again on 2026-11-05.'}),
        ('a note with the owner\'s name', 'session', {'phase': 'end', 'note': 'Khalid sends it today.'}),
        ('a note with a path', 'session', {'phase': 'end', 'note': 'The report is in work/aso/report.md.'}),
        ('a note over 200 characters', 'session', {'phase': 'end', 'note': 'x' * 201})):
    n = len(lines(h9))
    c, o = log(h9, ev, obj)
    ok(f'refused: {name}', c == 1 and len(lines(h9)) == n and 'refused' in o, o)
c, o = log(h9, 'lane_opened', {'lane': {'id': 'x2', 'goal': 'G1', 'state': 'planned'}})
ok('the refusal of an untitled lane is one line with its fix', 'needs a title (1–60 chars): add "title"' in o, o)
for name, ev, obj, want in (
        ('received.task of a known task', 'received', {'from': 'customer:ana', 'channel': 'email', 'ref': 'artifacts/attachments/upload.pdf', 'task': 'D2'}, ('task', 'D2')),
        ('caused_by a known task', 'task_added', W('W1', caused_by='D2'), None),
        ('a customer approve of a shared file', 'task_added',
         {'task': {'id': 'A9', 'lane': 'discovery', 'kind': 'customer', 'title': 'Approve it', 'do': 'x', 'owner': 'customer', 'approve': 'artifacts/fixtureco/aso/report.md'}}, None),
        ('an owner approve of a work/ sample', 'task_added', W('K9', owner='khalid', approve='work/k/sample.md'), None),
        ('a lane due', 'lane_set', {'lane': 'aso-pages', 'set': {'due': '2026-12-01'}, 'why': 'x'}, None),
        ('stages', 'lane_set', {'lane': 'aso-pages', 'set': {'stages': STAGES}, 'why': 'x'}, None),
        ('a clean note', 'session', {'phase': 'end', 'note': 'It moved the keyword research on and asked for the console export.'}, None)):
    c, o = log(h9, ev, obj)
    ok(f'accepted: {name}', c == 0 and (not want or last(h9)[want[0]] == want[1]), o)
plan9 = agency.replay([json.loads(l) for l in lines(h9)])
ok('the new fields replay onto the plan', agency.find(plan9['tasks'], 'W1')['caused_by'] == 'D2'
   and agency.find(plan9['tasks'], 'K9')['approve'] == 'work/k/sample.md'
   and agency.find(plan9['lanes'], 'aso-pages')['due'] == '2026-12-01'
   and agency.find(plan9['lanes'], 'aso-pages')['stages'] == STAGES)

# AC2.2: R1-R6 verdicts equal title-rules.json
rules = json.load(open(os.path.join(FIX, 'title-rules.json')))['cases']
bad = [(c_['text'], c_['expect'], agency.title_rules(c_['text'], c_['ids'], c_.get('limit', 120)))
       for c_ in rules if sorted(agency.title_rules(c_['text'], c_['ids'], c_.get('limit', 120))) != c_['expect']] \
    if hasattr(agency, 'title_rules') else ['no title_rules']
ok(f'R1-R6 give every verdict in title-rules.json ({len(rules)} cases)', len(rules) >= 40 and not bad, json.dumps(bad))

# AC2.3: check warns about titles in history and in a new title, exempts standing lanes, and exits 0
h10 = fresh()
raw(h10, {'t': '2026-10-25T10:00:00Z', 'ev': 'task_added', 'by': 'agent', 'task': {**W('D3')['task'], 'title': 'Ask for the console export'}},
    {'t': '2026-10-25T10:00:00Z', 'ev': 'task_added', 'by': 'agent', 'task': {**W('H1')['task'], 'title': 'S01 Intake: scope, product truth'}},
    {'t': '2026-10-25T10:00:00Z', 'ev': 'task_added', 'by': 'agent', 'task': {**W('H2')['task'], 'title': 'After D3, the audit'}},
    {'t': '2026-10-25T10:00:00Z', 'ev': 'task_added', 'by': 'agent', 'task': {**W('H3')['task'], 'title': 'Read by 2026-11-05'}},
    {'t': '2026-10-25T10:00:00Z', 'ev': 'task_added', 'by': 'agent', 'task': {**W('H4')['task'], 'title': 'Ask Khalid to send it'}},
    {'t': '2026-10-25T10:00:00Z', 'ev': 'lane_set', 'by': 'agent', 'lane': 'comms', 'set': {'title': 'comms'}, 'why': 'x'})
c, o = log(h10, 'task_added', {'task': {**W('N1')['task'], 'title': 'S01 Intake again'}})
ok('a new title with "S01 " is accepted (check warns; it is not refused)', c == 0, o)
c, o = run(h10, 'check')
warns = [l for l in o.splitlines() if l.startswith('WARN title:')]
ok('check warns R3, R2, R5, R6 on history and the new title, with a fix command each, and exits 0',
   c == 0 and 'check: ok' in o and len(warns) == 5
   and all(any(f'task {i}: {r}:' in w and "agency log task_refined" in w for w in warns)
           for i, r in (('H1', 'R3'), ('H2', 'R2'), ('H3', 'R5'), ('H4', 'R6'), ('N1', 'R3'))), o)
ok('check exempts the standing lanes', 'lane comms' not in o, o)

# AC2.4: job is stamped only with SL8_JOB set, on every event append() writes
h11 = fresh()
log(h11, 'fact', {'text': 'a', 'src': 'b'})
no_job = 'job' not in last(h11)
log(h11, 'fact', {'text': 'a', 'src': 'b'}, env={'SL8_JOB': 'not valid!'})
bad_job = 'job' not in last(h11)
log(h11, 'fact', {'text': 'a', 'src': 'b'}, env=J)
fact_job = last(h11).get('job')
log(h11, 'task_added', W('W5'), env=J)
run(h11, 'task', 'start', 'W5', env=J)
start_job = last(h11).get('job')
n = len(lines(h11))
run(h11, 'status', env=J)
status_new = [json.loads(l) for l in lines(h11)[n:]]
ok('job: none without SL8_JOB or with a bad one; the execution id on log, task and status events',
   no_job and bad_job and fact_job == start_job == 'exec_test-1' and status_new and all(e.get('job') == 'exec_test-1' for e in status_new),
   json.dumps(status_new))

# AC2.5: the live list through a fake emitter (§4.4): the tasks this job touched, by first touch
EMIT = ("import fs from 'node:fs';let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{"
        "if(process.env.EMIT_MODE==='fail')process.exit(3);"
        "if(process.env.EMIT_MODE==='sleep'){setTimeout(()=>{},5000);return}"
        "fs.appendFileSync(process.env.HOME+'/.sl8/posts.jsonl',JSON.stringify({mode:process.argv[2],body:JSON.parse(s)})+'\\n')})")
h12 = fresh()
os.makedirs(os.path.join(h12, '.sl8'), exist_ok=True)
posts = lambda: [json.loads(l) for l in open(os.path.join(h12, '.sl8', 'posts.jsonl'))] if os.path.isfile(os.path.join(h12, '.sl8', 'posts.jsonl')) else []
for i in ('W6', 'W7', 'W8'):
    log(h12, 'task_added', W(i))
log(h12, 'task_added', W('R1', every='mon'))
run(h12, 'task', 'start', 'W8', env={'SL8_JOB': 'exec_earlier'})  # an earlier job's touch is not this job's
open(os.path.join(h12, '.sl8', 'emit.mjs'), 'w').write(EMIT)
run(h12, 'status', env=J)
p0 = posts()
log(h12, 'task_added', W('W9'), env=J)
p1 = posts()
run(h12, 'task', 'start', 'W6', env=J)
p2 = posts()
log(h12, 'fact', {'text': 'a', 'src': 'b'}, env=J)
p3 = posts()
run(h12, 'task', 'wait', 'W6', '--on', 'customer:ana', env=J)
run(h12, 'task', 'start', 'W7', env=J)
run(h12, 'task', 'done', 'W7', env=J)
run(h12, 'task', 'start', 'R1', env=J)
run(h12, 'task', 'done', 'R1', env=J)
run(h12, 'task', 'start', 'W9', env=J)
run(h12, 'task', 'drop', 'W9', '--why', 'not needed', env=J)
p4 = posts()
n4 = len(p4)
run(h12, 'status', env=J)
run(h12, 'task', 'start', 'W6')  # no SL8_JOB: nothing posted
ok('status at orient posts the empty list once', [p['body'] for p in p0] == [{'steps': []}] and p0[0]['mode'] == 'agency-plan', json.dumps(p0))
ok('a task event that touches nothing, and a non-task event, post nothing', len(p1) == 1 and len(p3) == len(p2) == 2, json.dumps(p3))
ok('task start posts the task by its title and its id as the key, in progress',
   p2[-1]['body'] == {'steps': [{'key': 'W6', 'title': 'Work 6', 'status': 'in_progress'}]}, json.dumps(p2))
ok('wait, done, a recurring task done and a drop post the list as it stands; an unchanged list posts nothing',
   p4[-1]['body'] == {'steps': [{'key': 'W6', 'title': 'Work 6', 'status': 'pending'},
                                {'key': 'W7', 'title': 'Work 7', 'status': 'completed'},
                                {'key': 'R1', 'title': 'Work 1', 'status': 'completed'}]}
   and len(posts()) == n4 and os.path.isfile(os.path.join(h12, '.sl8', 'agency-plan.last')), json.dumps(p4[-3:]))
for mode, name in ((None, 'no emitter'), ('fail', 'a failing emitter'), ('sleep', 'an emitter that sleeps 5 s')):
    hh = fresh()
    if mode:
        os.makedirs(os.path.join(hh, '.sl8'), exist_ok=True)
        open(os.path.join(hh, '.sl8', 'emit.mjs'), 'w').write(EMIT)
    log(hh, 'task_added', W('W6'))
    t0 = __import__('time').monotonic()
    c, o = run(hh, 'task', 'start', 'W6', env={**J, **({'EMIT_MODE': mode} if mode else {})})
    took = __import__('time').monotonic() - t0
    ok(f'with {name}, task start exits 0 within 2.5 s ({took:.1f} s)', c == 0 and took < 2.5 and last(hh)['ev'] == 'task_started', o)

# AC2.6: the card's waiting list is open_asks.customer, `on: customer:` asks included; open_asks per fixture
h13 = fresh()
log(h13, 'task_added', W('W6', title='The console export'))
run(h13, 'task', 'wait', 'W6', '--on', 'customer:ana')
run(h13, 'status')
ok('the card lists an ask made with `on: customer:<name>`', '  The console export (asked ' in card_of(h13).split("We're waiting on you for:")[-1], card_of(h13))
for name, want in (('larkspoon', {'owner': [], 'customer': ['T8', 'T9', 'T11', 'T13']}),
                   ('brightloom', {'owner': [], 'customer': []}),
                   ('quillfeather', {'owner': ['K1'], 'customer': ['A1']})):
    hh = agency.Home(os.path.join(FIX, 'installs', name))
    got = agency.open_asks(hh.plan(), []) if hasattr(agency, 'open_asks') else None
    ok(f'open_asks on {name} equals its hand-checked asks', got == want, json.dumps(got))
plan13 = agency.replay([json.loads(l) for l in lines(h13)]) if hasattr(agency, 'open_asks') else None
ok('open_asks counts an email waiting for the owner', plan13 is not None and
   agency.open_asks(plan13, ['C9.eml']) == {'owner': ['work/outbox/C9.eml'], 'customer': ['W6']})

# AC2.9: the card names the stage; without stages it shows the id as today
h14 = fresh()
run(h14, 'status')
before = card_of(h14)
log(h14, 'lane_set', {'lane': 'aso-pages', 'set': {'stages': STAGES}, 'why': 'x'})
run(h14, 'status')
intake = card_of(h14)
log(h14, 'task_added', W('aso-store-pages-S03', title='Keyword research'))
run(h14, 'task', 'done', 'aso-store-pages-S03')
run(h14, 'status')
ok('the card shows the stage id with no stages, then "Intake", then "Keywords" at S03',
   'Store pages that convert · active · S01' in before and 'Store pages that convert · active · Intake' in intake
   and 'active · Keywords' in card_of(h14) and 'S03' not in card_of(h14), before + intake + card_of(h14))

# AC2.10: the backfill (§4.8): standing titles and library stage names, once, only where absent
LARK = os.path.join(FIX, 'installs', 'larkspoon')
h15 = home_from(os.path.join('installs', 'larkspoon'))
stages_in(h15)
n = len(lines(h15))
c, o = run(h15, 'status')
new15 = [json.loads(l) for l in lines(h15)[n:]]
sets = [e for e in new15 if e['ev'] == 'lane_set']
ok('one status on Larkspoon appends three standing titles and two stages lane_sets, a line each',
   c == 0 and [(e['lane'], list(e['set'])) for e in sets] == [('discovery', ['title']), ('plan', ['title']), ('comms', ['title']),
                                                            ('aso-larkspoon-us', ['stages']), ('aso-larkspoon-de', ['stages'])]
   and [e['set'].get('title') for e in sets[:3]] == ['Discovery', 'Plan', 'Messages']
   and all(e['set'].get('stages', STAGES) == STAGES for e in sets) and o.count('logged lane_set') == 5, o)
ok('the card then says "Report and roadmap", not "S08"', 'active · Report and roadmap' in card_of(h15) and 'S08' not in card_of(h15), card_of(h15))
n = len(lines(h15))
c, o = run(h15, 'status')
ok('a second status appends nothing', c == 0 and len(lines(h15)) == n and 'logged lane_set' not in o, o)
V11 = os.path.join(FIX, 'installs', 'larkspoon-v11', 'work', 'agency', 'log.jsonl')
PV11 = os.path.join(FIX, 'installs', 'protocol-v11', 'work', 'agency', 'log.jsonl')
strip = lambda es: [{k: v for k, v in e.items() if k != 't'} for e in es]
ok('the committed larkspoon-v11 log is Larkspoon after one 1.1.0 status with the A01 stages.json',
   os.path.isfile(V11) and strip(json.loads(l) for l in open(V11).read().splitlines())
   == strip(json.loads(l) for l in open(os.path.join(LARK, 'work', 'agency', 'log.jsonl')).read().splitlines()) + strip(new15))
h16 = home_from(os.path.join('installs', 'quillfeather'))
stages_in(h16)
raw(h16, {'t': '2026-10-25T10:00:00Z', 'ev': 'lane_set', 'by': 'agent', 'lane': 'aso-reviews', 'set': {'library': 'aso/other'}, 'why': 'x'})
n = len(lines(h16))
c, o = run(h16, 'status')
new = [json.loads(l) for l in lines(h16)[n:] if '"lane_set"' in l]
ok('lanes without a library, or with one missing from stages.json, get nothing; only the standing titles',
   c == 0 and [e['lane'] for e in new] == ['discovery', 'plan', 'comms'], o)
h17 = home_from()
c, o = log(h17, 'lane_opened', {'lane': {'id': 'plan', 'standing': True, 'state': 'active'}})
ok('a standing lane_opened without a title is written with its standard title', c == 0 and last(h17)['lane'].get('title') == 'Plan', o)
# N7 (PM ruling, design §4.8): a library twice in one stages.json, or in two with different stages, gets no stages
# and one `WARN stages:` line (exit unchanged); identical copies count as one
h18 = home_from(os.path.join('installs', 'larkspoon'))
stages_in(h18)
stages_in(h18, 'a09-copy', {'aso/store-pages': STAGES[:2]})
c, o = run(h18, 'status')
ok('a library in two stages.json files with different stages gets no stages from status',
   c == 0 and '"stages"' not in ''.join(lines(h18)), o)
c, o = run(h18, 'check')
ok('check prints one WARN stages line for it and its exit is unchanged',
   o.count('WARN stages: aso/store-pages: defined more than once') == 1 and 'FAIL valid: stages' not in o
   and c == run(home_from(os.path.join('installs', 'larkspoon')), 'check')[0], o)
h18b = home_from(os.path.join('installs', 'larkspoon'))
stages_in(h18b)
stages_in(h18b, 'a09-copy')
c, o = run(h18b, 'status')
c2, o2 = run(h18b, 'check')
ok('identical copies in two stages.json files count as one', c == 0 and o.count(': stages') == 2 and 'WARN stages' not in o2, o + o2)
h18c = home_from(os.path.join('installs', 'larkspoon'))
d = os.path.join(h18c, '.sl8', 'bot', '.claude', 'skills', 'a01-aso', 'lanes')
os.makedirs(d)
open(os.path.join(d, 'stages.json'), 'w').write('{"aso/store-pages": %s, "aso/store-pages": %s}' % (json.dumps(STAGES), json.dumps(STAGES[:1])))
c, o = run(h18c, 'status')
c2, o2 = run(h18c, 'check')
ok('a library twice in one stages.json gets no stages and one WARN stages line',
   c == 0 and '"stages"' not in ''.join(lines(h18c)) and o2.count('WARN stages: aso/store-pages: defined more than once') == 1, o + o2)

# AC2.11: an old goal lane without a title: check warns R1 with its fix and exits 0; status does not title it
h19 = fresh()
lane = {'goal': 'G1', 'scope': 's', 'rank': 2, 'why': 'w', 'gauge': 'g', 'done': 'd', 'pause': 'p'}
raw(h19, {'t': '2026-10-25T10:00:00Z', 'ev': 'lane_opened', 'by': 'agent', 'lane': {'id': 'old-lane', 'state': 'active', **lane}},
    {'t': '2026-10-25T10:00:00Z', 'ev': 'lane_opened', 'by': 'agent', 'lane': {'id': 'old-paused', 'state': 'paused', **lane, 'rank': 3}})
c, o = run(h19, 'check')
warns = [l for l in o.splitlines() if l.startswith('WARN')]
fix = warns[0].split(': R1: ', 1)[-1] if warns else ''
ok('check prints one R1 line for the active untitled goal lane, with its lane_set fix, and exits 0',
   c == 0 and len(warns) == 1 and warns[0].startswith('WARN title: lane old-lane: R1: agency log lane_set ')
   and 'old-paused' not in o, o)
n = len(lines(h19))
run(h19, 'status')
ok('status appends no title for it', not any('"old-lane"' in l for l in lines(h19)[n:]))
args = __import__('shlex').split(fix.replace('…', 'Store pages, the second app'))
c, o = run(h19, *args[1:])
c2, o2 = run(h19, 'check')
ok('after its fix line, check prints nothing for it', c == 0 and 'WARN' not in o2 and c2 == 0, o + o2)

# AC2.7: replay both ways. 1.1.0 replays every 1.0.x log to the plan 1.0.2 gives, and 1.0.2 replays larkspoon-v11
OLD = os.environ.get('AGENCY_CORE_102')  # a 1.0.2 agency.py; else the repo's main at 2011631, when git has it
if not OLD:
    g = subprocess.run(['git', '-C', HERE, 'show', '2011631:v5/skills/agency-run/scripts/agency.py'], capture_output=True, text=True)
    if g.returncode == 0:
        d = tempfile.mkdtemp(prefix='agency-102-')
        for sub in ('scripts', 'knowledge'):
            os.makedirs(os.path.join(d, sub))
        shutil.copy(os.path.join(HERE, '..', 'knowledge', 'kinds.json'), os.path.join(d, 'knowledge'))
        open(os.path.join(d, 'VERSION'), 'w').write('1.0.2\n')
        OLD = os.path.join(d, 'scripts', 'agency.py')
        open(OLD, 'w').write(g.stdout)
if not OLD:
    print('SKIP replay both ways: no 1.0.2 agency.py (set AGENCY_CORE_102, or run inside the agency repo)')
else:
    import importlib.util
    spec = importlib.util.spec_from_file_location('agency102', OLD)
    old = importlib.util.module_from_spec(spec); spec.loader.exec_module(old)
    logs = [os.path.join(FIX, 'workspace', 'log.jsonl'), os.path.join(FIX, 'install', 'work', 'agency', 'log.jsonl'),
            os.path.join(h8, 'work', 'agency', 'log.jsonl')] + [os.path.join(FIX, 'installs', n, 'work', 'agency', 'log.jsonl')
                                                for n in ('larkspoon', 'brightloom', 'quillfeather')]
    for p in logs:
        evs = [json.loads(l) for l in open(p).read().splitlines()[:-1 if 'install/work' in p else None] if l.strip()]
        ok(f'1.1.0 replays {os.path.relpath(p, FIX) if p.startswith(FIX) else "job6.jsonl (after jobs 1-5)"} to the plan 1.0.2 gives', agency.replay(evs) == old.replay(evs))
    evs = [json.loads(l) for l in open(V11)]
    ok('1.0.2 replays larkspoon-v11 (backfill events included) to the plan 1.1.0 gives, stages and titles carried',
       old.replay(evs) == agency.replay(evs) and agency.find(old.replay(evs)['lanes'], 'plan').get('title') == 'Plan'
       and agency.find(old.replay(evs)['lanes'], 'aso-larkspoon-us').get('stages') == STAGES)
    hv = home_from(os.path.join('installs', 'larkspoon-v11'))
    c, o = run(hv, 'status', tool=OLD)
    ok('the 1.0.2 tool runs status on larkspoon-v11', c == 0 and 'Store pages, Larkspoon the US' in card_of(hv), o)
    ok('shared_this_job is unchanged on the fixtures', agency.shared_this_job(hh := agency.Home(h8), hh.events(), hh.plan())
       == old.shared_this_job(old.Home(h8), old.Home(h8).events(), old.Home(h8).plan()))
    evs = [json.loads(l) for l in open(PV11)] if os.path.isfile(PV11) else []
    ok('1.0.2 replays protocol-v11 (every new field) to the plan 1.1.0 gives', evs and old.replay(evs) == agency.replay(evs))
    hv = home_from(os.path.join('installs', 'protocol-v11'))
    c, o = run(hv, 'status', tool=OLD)
    c2, o2 = run(hv, 'check', tool=OLD)
    ok('the 1.0.2 tool runs status and check on protocol-v11', c == 0 and c2 == 0, o + o2)

# 10. the review of agency#124 (S1-S4, N1-N4)
# S3: protocol-v11, written by 1.1.0 with SL8_JOB (make_protocol_v11.py), carries every §4.1 field
pv = [json.loads(l) for l in open(PV11)] if os.path.isfile(PV11) else []
has = lambda f: any(f(e) for e in pv)
tk = lambda e: e.get('task') if isinstance(e.get('task'), dict) else {}
ok('protocol-v11 carries job, lane title, stages, lane and task due, caused_by, both approves, received.task and a note',
   pv and all(e.get('job') == 'exec_fixture-1' for e in pv)
   and has(lambda e: e['ev'] == 'lane_set' and 'stages' in e.get('set', {}))
   and has(lambda e: e['ev'] == 'lane_opened' and e['lane'].get('due') and e['lane'].get('title'))
   and has(lambda e: tk(e).get('due')) and has(lambda e: tk(e).get('caused_by'))
   and {tk(e).get('owner') for e in pv if tk(e).get('approve')} == {'customer', 'khalid'}
   and has(lambda e: e['ev'] == 'received' and e.get('task')) and has(lambda e: e['ev'] == 'session' and e.get('note')))
# N4: the copies of A01's stages.json in the fixtures equal its source (drift)
for name in ('larkspoon-v11', 'protocol-v11'):
    f = os.path.join(FIX, 'installs', name, '.sl8', 'bot', '.claude', 'skills', 'a01-aso', 'lanes', 'stages.json')
    ok(f'{name}\'s stages.json equals A01\'s source', os.path.isfile(f) and json.load(open(f)) == json.load(open(A01)))
# S1: a stage name the customer reads passes R1-R6 at write, and the card prints a name only when it is clean
h20 = fresh()
for name in ('Khalid signs off', 'S01 Intake', 'Read work/aso/report.md', 'Due 2026-11-05', 'Finish aso-pages'):
    n = len(lines(h20))
    c, o = log(h20, 'lane_set', {'lane': 'aso-pages', 'set': {'stages': [{'id': 'S01', 'name': name}]}, 'why': 'x'})
    ok(f'refused: a stage name {name!r}', c == 1 and len(lines(h20)) == n, o)
raw(h20, {'t': '2026-10-25T10:00:00Z', 'ev': 'lane_set', 'by': 'agent', 'lane': 'aso-pages',
          'set': {'stages': [{'id': 'S01', 'name': 'Khalid signs off'}]}, 'why': 'written by hand'})
run(h20, 'status')
ok('the card prints the stage id, not a stage name that breaks R2-R6', 'active · S01' in card_of(h20)
   and 'Khalid' not in card_of(h20), card_of(h20))
c, o = run(h20, 'check')
ok('check warns about that stage name with no fix template to run literally',
   c == 0 and 'stage S01: R6:' in o and '[…]' not in o, o)
# N2: a title that is only the fix template's placeholder is refused
for name, ev, obj in (('a lane title "…"', 'lane_set', {'lane': 'aso-pages', 'set': {'title': '…'}, 'why': 'x'}),
                      ('a task title "..."', 'task_refined', {'task': {'id': 'D2', 'title': '...'}}),
                      ('a stage name "…"', 'lane_set', {'lane': 'aso-pages', 'set': {'stages': [{'id': 'S01', 'name': ' … '}]}, 'why': 'x'})):
    n = len(lines(h20))
    c, o = log(h20, ev, obj)
    ok(f'refused: {name}', c == 1 and len(lines(h20)) == n, o)
# S2: an older bare library name: <agency>/<name> by the bot's <AGENCY> id, else the one key ending in /<name>
def bare(setup=None, extra=None):
    hb = home_from(os.path.join('installs', 'quillfeather'))
    stages_in(hb)
    if extra:
        stages_in(hb, 'a09-other', extra)
    if setup:
        open(os.path.join(hb, 'bot', 'setup.md'), 'w').write(f'<AGENCY>\nid: {setup}\n</AGENCY>\n')
    raw(hb, {'t': '2026-10-25T10:00:00Z', 'ev': 'lane_set', 'by': 'agent', 'lane': 'aso-listing',
             'set': {'library': 'store-pages'}, 'why': 'an older bare name'})
    run(hb, 'status')
    return [json.loads(l) for l in lines(hb) if '"stages"' in l]
got = bare('aso')
ok('a bare library name resolves through the bot\'s <AGENCY> id', len(got) == 1 and got[0]['lane'] == 'aso-listing'
   and got[0]['set']['stages'] == STAGES, json.dumps(got))
ok('without <AGENCY>, a bare name resolves to the one key ending in /<name>', len(bare()) == 1)
ok('a bare name whose <AGENCY> id has no such key gets nothing', bare('conversion') == [])
ok('a bare name two keys end in, with no <AGENCY>, gets nothing',
   bare(extra={'pixel-art/store-pages': STAGES[:1]}) == [])
# S4: the last-report hash is tied to the job: a new job's first report is never skipped
h21 = fresh()
os.makedirs(os.path.join(h21, '.sl8'), exist_ok=True)
open(os.path.join(h21, '.sl8', 'emit.mjs'), 'w').write(EMIT)
run(h21, 'status', env=J)
run(h21, 'status', env={'SL8_JOB': 'exec_test-2'})
run(h21, 'status', env={'SL8_JOB': 'exec_test-2'})
pp = [json.loads(l)['body'] for l in open(os.path.join(h21, '.sl8', 'posts.jsonl'))]
ok('a new job reports its empty list at orient though the last job\'s list was empty too; once per job', pp == [{'steps': []}] * 2, json.dumps(pp))
# N1: an invalid stages.json entry is skipped with its own warning, not also "defined more than once"
h22 = home_from(os.path.join('installs', 'larkspoon'))
stages_in(h22, data={'aso/store-pages': STAGES, 'aso/bad': [{'id': 'S1', 'name': 'x'}]})
c, o = run(h22, 'check')
ok('an invalid stages.json entry warns once, and not as defined more than once',
   o.count('WARN stages: aso/bad:') == 1 and 'defined more than once' not in o, o)

print(f'\nselftest: {"ok" if not fails else str(len(fails)) + " failed"}')
sys.exit(1 if fails else 0)
