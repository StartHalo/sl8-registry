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


def run(home, *args, stdin=None, tool=TOOL):
    r = subprocess.run([sys.executable, tool, *args], capture_output=True, text=True, input=stdin,
                       env={**os.environ, 'HOME': home})
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
c, o = run(h, 'status')
card = open(os.path.join(h, 'work', 'agency', 'now.md')).read()
ok('status replays the old shapes and logs params once', c == 0 and json.loads(lines(h)[-1])['ev'] == 'params', o)
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

print(f'\nselftest: {"ok" if not fails else str(len(fails)) + " failed"}')
sys.exit(1 if fails else 0)
