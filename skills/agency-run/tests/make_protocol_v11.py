#!/usr/bin/env python3
"""Writes tests/fixtures/installs/protocol-v11/: a made-up install (customer "Fernhollow") whose log core 1.1.0 wrote
with SL8_JOB set, carrying every protocol 1.1 field (D85; design §4.1): job, lane.title, lane.stages (the status
backfill, from A01's stages.json), lane.due, task.due, task.caused_by, task.approve (customer and owner),
received.task and session.note. selftest.py replays it on 1.0.2 and 1.1.0; Slate's C3 fixtures read it.

Run: python3 v5/skills/agency-run/tests/make_protocol_v11.py   (rewrites the folder; times move, nothing else)
"""
import json, os, shutil, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
TOOL = os.path.join(HERE, '..', 'scripts', 'agency.py')
A01 = os.path.join(HERE, '..', '..', '..', 'agencies', 'aso', 'skills', 'a01-aso', 'lanes', 'stages.json')
OUT = os.path.join(HERE, 'fixtures', 'installs', 'protocol-v11')
JOB = 'exec_fixture-1'

home = tempfile.mkdtemp(prefix='protocol-v11-')
P = lambda *r: os.path.join(home, *r)
put = lambda rel, text: (os.makedirs(os.path.dirname(P(rel)), exist_ok=True), open(P(rel), 'w').write(text))
put('bot/user.md', 'Customer: Fernhollow\nCustomer id: fernhollow\nContact: Ren (ren@fernhollow.example)\n'
                   'Reply address: fernhollow+agency@slateworkspace.com\nBcc: owner@example.com\n')
put('bot/setup.md', '<AGENCY>\nid: aso\nlanes: aso/store-pages: lanes/store-pages.md\n</AGENCY>\n')
os.makedirs(P('.sl8', 'bot', '.claude', 'skills', 'a01-aso', 'lanes'))
shutil.copy(A01, P('.sl8', 'bot', '.claude', 'skills', 'a01-aso', 'lanes', 'stages.json'))
put('work/aso/fern-us/report.md', 'made up\n')
put('work/aso/fern-us/sample.md', 'made up sample\n')


def run(*args):
    r = subprocess.run([sys.executable, TOOL, *args], capture_output=True, text=True,
                       env={**{k: v for k, v in os.environ.items() if k not in ('SL8_DIR',)}, 'HOME': home, 'SL8_JOB': JOB})
    if r.returncode:
        sys.exit(f'agency {" ".join(args[:2])} failed: {r.stdout}{r.stderr}')


log = lambda ev, obj: run('log', ev, json.dumps(obj))
L = 'aso-fern-us'
log('onboarded', {'customer': 'Fernhollow'})
for s in ('discovery', 'plan', 'comms'):
    log('lane_opened', {'lane': {'id': s, 'standing': True, 'state': 'active'}})
log('goal', {'goal': {'id': 'G1', 'text': 'More organic installs in the US', 'metric': 'installs', 'from': 0, 'to': 1000,
                      'by': '2027-01-31', 'state': 'active', 'figure': {'value': None}}})
log('lane_opened', {'lane': {'id': L, 'goal': 'G1', 'title': 'Store pages, Fernhollow in the US', 'scope': 'both stores, US',
                             'rank': 1, 'state': 'active', 'why': 'installs = impressions x conversion', 'gauge': 'conversion',
                             'done': 'cycle 1 reported', 'pause': 'no access in 3 weeks', 'library': 'aso/store-pages',
                             'due': '2027-01-15'}})
run('status')  # the backfill writes the lane's stages
log('task_added', {'task': {'id': f'{L}-S01', 'lane': L, 'kind': 'work', 'title': 'Intake: scope, product truth, access',
                            'do': 'fill the intake', 'done_when': 'intake per store', 'owner': 'us', 'due': '2026-11-20'}})
run('task', 'start', f'{L}-S01')
run('task', 'done', f'{L}-S01')
log('task_added', {'task': {'id': 'D1', 'lane': L, 'kind': 'deliverable', 'title': 'The store page report',
                            'do': 'write it', 'refs': ['work/aso/fern-us/'], 'done_when': 'evaluator passes',
                            'out': 'work/aso/fern-us/report.md', 'owner': 'us', 'caused_by': f'{L}-S01'}})
run('task', 'start', 'D1')
run('task', 'done', 'D1', '--check', 'pass')
log('task_added', {'task': {'id': 'A1', 'lane': L, 'kind': 'customer', 'title': 'Approve the store page report',
                            'do': 'read and approve it', 'owner': 'customer',
                            'approve': 'artifacts/fernhollow/aso/fern-us/report.md', 'caused_by': 'D1'}})
run('task', 'wait', 'A1', '--on', 'customer:ren', '--due', '2026-11-14')
log('task_added', {'task': {'id': 'K1', 'lane': L, 'kind': 'work', 'title': 'Approve the screenshot sample',
                            'do': 'look at the sample', 'done_when': 'approved or changed', 'owner': 'khalid',
                            'approve': 'work/aso/fern-us/sample.md'}})
log('received', {'from': 'customer:ren', 'channel': 'email', 'ref': 'work/inputs/reply.md', 'task': 'A1'})
log('session', {'phase': 'end', 'summary': 'intake and report done; approval asked',
                'note': 'It finished the intake and the report, and asked for the report to be approved.'})
run('status')

shutil.rmtree(OUT, ignore_errors=True)
for rel in ('bot/user.md', 'bot/setup.md', 'work/agency/log.jsonl', '.sl8/bot/.claude/skills/a01-aso/lanes/stages.json'):
    os.makedirs(os.path.dirname(os.path.join(OUT, rel)), exist_ok=True)
    shutil.copy(P(rel), os.path.join(OUT, rel))
for top in ('work/aso', 'artifacts'):  # what `approve` names, so its paths resolve
    shutil.copytree(P(top), os.path.join(OUT, top))
shutil.rmtree(home)
print(f'wrote {os.path.relpath(OUT, os.getcwd())}')
