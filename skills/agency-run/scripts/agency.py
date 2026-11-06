#!/usr/bin/env python3
"""agency: the only writer of an agency install's record. Its spec is ../TOOL.md (signed, D75).

The root is $HOME (or --root): bot/user.md, work/agency/{log.jsonl,now.md,CUSTOMER.md}, work/, work/outbox/,
artifacts/<customer id>/. Subcommands:
  log <ev> '<json>'            append one event
  task start <id>              print what to read, mark it running
  task done <id> [--out P] [--check pass|fail] [--checked YYYY-MM-DD] [--why TEXT]
                               a pass hashes the checked files and copies them into artifacts/<customer id>/;
                               a fail records the evaluator's fail and leaves the task open
  task wait <id> --on WHO|<task-id> [--due YYYY-MM-DD]   on a task id, the task is blocked
  task drop <id> --why TEXT    withdraws its shared files unless a send listed them
  view tail [N] | lane <id> | tasks [--open] | facts | skills
  status                       the operator's view on stdout; writes now.md, the customer-safe card
  check [--fix]                the session check; --fix moves stray shared files to work/recovered/ and
                               drops a truncated last log line, logging each as an error
  send <task-id> [--urgent]    writes a checked comms task's email to work/outbox/<task>.eml and the same file,
                               for the owner, to artifacts/<customer id>/outbox/
  send <task-id> --by khalid   logs the owner's send of it and files both copies under their outbox/sent/
  migrate <workspace|bundle.tar> [--goal G] [--dry-run]   copies a v5 workspace into this install
  --version                    the core's version (../VERSION)
Stdlib only. Events are never edited; every read replays the log (there is no plan file).
"""
import argparse, copy, datetime as dt, glob, hashlib, html as H, json, math, mimetypes, os, re, shutil, sys, tarfile, tempfile
from email.message import EmailMessage
from email.utils import formatdate

TOOLS = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.dirname(TOOLS)  # agency-run/
KINDS_PATH = os.path.join(SKILL, 'knowledge', 'kinds.json')
LOGO = os.path.join(SKILL, '..', 'agency-report-pdf', 'assets', 'slate-logo-96.png')
STANDING = ('discovery', 'plan', 'comms')
EVENTS = {'onboarded', 'params', 'fact', 'goal', 'lane_opened', 'lane_set', 'lane_renamed', 'task_added', 'task_refined',
          'task_started', 'task_waiting', 'task_done', 'task_dropped', 'read', 'sent', 'received',
          'meeting', 'decision', 'error', 'skill_built', 'skill_proven', 'session'}
HISTORY = ('skill_built', 'skill_proven')  # replayed from old logs, never added (A15)
OPEN = ('ready', 'running', 'waiting', 'blocked')
TASK_STATES = OPEN + ('done', 'dropped')
LANE_STATES = ('planned', 'active', 'paused', 'stopped', 'done')
DAYS = ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun')
PICK = {'plan': -1, 'discovery': 100, 'comms': 101}  # plan reviews first, then goal lanes by rank
CAP = 3  # emails we start in 7 days, per agency (D74, D75)
DATE = r'\d{4}-\d\d-\d\d'


def now():
    return dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def day(s):
    """A YYYY-MM-DD date (or the date part of a time), or None: a bad date never takes a command down."""
    try:
        return dt.date.fromisoformat(str(s)[:10])
    except ValueError:
        return None


def kinds():
    k = json.load(open(KINDS_PATH, encoding='utf-8'))
    return {n: v for n, v in k.items() if not n.startswith('_')}


def version():
    return open(os.path.join(SKILL, 'VERSION'), encoding='utf-8').read().strip()


def read_user(path):
    """bot/user.md: `Label: value` lines (a `- **Label:** value` line too); comments and tags skipped.
    Keys are the labels in lower case, spaces and hyphens as underscores."""
    if not os.path.isfile(path):
        return {}
    text = re.sub(r'<!--.*?-->', '', open(path, encoding='utf-8').read(), flags=re.S)
    out = {}
    for l in text.splitlines():
        l = l.replace('**', '').replace('`', '').strip()
        m = re.match(r'(?:[-*]\s+)?([A-Za-z][A-Za-z0-9 _-]{0,40}?)\s*:\s*(.*)$', l)
        if m and not l.startswith(('#', '<')):
            out[re.sub(r'[\s-]+', '_', m.group(1).strip().lower())] = m.group(2).strip()
    return out


class Home:
    """An install's files under its root ($HOME on a machine)."""

    def __init__(self, root):
        self.root = os.path.abspath(root)
        self.log_path = self.p('work', 'agency', 'log.jsonl')
        self.truncated = None  # the text of a truncated last log line, once events() has read it
        self._warned = False

    def p(self, *a):
        return os.path.join(self.root, *a)

    def events(self):
        if not os.path.exists(self.log_path):
            return []
        lines = [l for l in open(self.log_path, encoding='utf-8', errors='replace').read().split('\n') if l.strip()]
        out = []
        for i, l in enumerate(lines):
            try:
                out.append(json.loads(l))
            except json.JSONDecodeError as x:
                if i < len(lines) - 1:
                    raise ValueError(f'log line {i + 1} does not parse ({x}): the log does not replay')
                self.truncated = l  # a lost machine: skipped, reported, dropped by the next append
                if not self._warned:
                    print('warning: the log\'s last line is truncated (a lost machine); skipped. The next command '
                          'that appends drops it, or run `agency check --fix`', file=sys.stderr)
                    self._warned = True
        return out

    def plan(self):
        return replay(self.events())

    def user(self):
        return read_user(self.p('bot', 'user.md'))

    def cid(self):
        c = self.user().get('customer_id', '')
        if not re.fullmatch(r'[a-z0-9]+(-[a-z0-9]+)*', c) or c == 'attachments':
            raise ValueError(f'bot/user.md needs its customer id (lowercase letters, digits and hyphens; not '
                             f'"attachments"), not {c!r}: the owner sets it at hire')
        return c

    def art(self, rel):
        """Where a pass shares work/<path>: artifacts/<customer id>/<path>."""
        return f'artifacts/{self.cid()}/' + rel[len('work/'):]

    def shared(self, path):
        """A shared path from an event: an old event's artifacts/X replays as artifacts/<customer id>/X."""
        pre = f'artifacts/{self.cid()}/'
        if path.startswith('artifacts/') and not path.startswith(pre):
            return pre + path[len('artifacts/'):]
        return path

    def write_line(self, text):
        os.makedirs(os.path.dirname(self.log_path), exist_ok=True)
        with open(self.log_path, 'ab') as f:
            if f.tell() and open(self.log_path, 'rb').read()[-1:] != b'\n':
                f.write(b'\n')
            f.write(text.encode('utf-8') + b'\n')

    def drop_truncated(self):
        """Drops a truncated last log line and logs its text as an error. True if there was one."""
        self.events()
        if self.truncated is None:
            return False
        data = open(self.log_path, 'rb').read().rstrip(b'\n')
        cut = data.rfind(b'\n') + 1
        with open(self.log_path, 'r+b') as f:
            f.truncate(cut)
        self.write_line(json.dumps({'t': now(), 'ev': 'error', 'by': 'agent',
                                    'text': f'dropped a truncated last log line: {self.truncated}'}, ensure_ascii=False))
        self.truncated = None
        return True


def empty_plan():
    return {'customer': None, 'goals': [], 'lanes': [], 'tasks': [], 'renamed': {}}


def find(items, id_):
    for x in items:
        if x.get('id') == id_:
            return x
    return None


def lane_id(plan, id_):
    """A renamed lane's old id resolves to its new one (A7)."""
    seen = set()
    while id_ in plan['renamed'] and id_ not in seen:
        seen.add(id_)
        id_ = plan['renamed'][id_]
    return id_


def merge(obj, fields):
    for k, v in fields.items():
        if k == 'id':
            continue
        if v is None:
            obj.pop(k, None)
        else:
            obj[k] = v


def apply(plan, e):
    """The replay rules (lld section 3, R1). Pure: same events, same plan."""
    ev = e['ev']
    if ev == 'onboarded':
        plan['customer'] = e.get('customer')
    elif ev == 'goal':
        if not isinstance(e.get('goal'), dict) or 'id' not in e['goal']:
            raise ValueError('a goal event carries the whole goal object, with its id (R1)')
        g = copy.deepcopy(e['goal'])
        old = find(plan['goals'], g['id'])
        if old:
            plan['goals'][plan['goals'].index(old)] = g
        else:
            plan['goals'].append(g)
    elif ev == 'lane_opened':
        lane = copy.deepcopy(e['lane'])
        lane['id'] = lane_id(plan, lane['id'])
        if find(plan['lanes'], lane['id']):
            raise ValueError(f'lane {lane["id"]} already exists (use lane_set)')
        plan['lanes'].append(lane)
    elif ev == 'lane_set':
        lane = find(plan['lanes'], lane_id(plan, e['lane']))
        if not lane:
            raise ValueError(f'unknown lane {e["lane"]}')
        merge(lane, e.get('set', {}))
    elif ev == 'lane_renamed':
        old, new = e['from'], e['to']
        plan['renamed'][old] = new
        lane = find(plan['lanes'], old)
        if lane and not find(plan['lanes'], new):
            lane['id'] = new
        for t in plan['tasks']:
            if t.get('lane') == old:
                t['lane'] = new
    elif ev == 'task_added':
        t = copy.deepcopy(e['task'])
        if find(plan['tasks'], t['id']):
            raise ValueError(f'task {t["id"]} already exists (use task_refined)')
        t.setdefault('state', 'ready')
        if t.get('lane'):
            t['lane'] = lane_id(plan, t['lane'])
        plan['tasks'].append(t)
    elif ev == 'task_refined':
        t = find(plan['tasks'], e['task']['id'])
        if not t:
            raise ValueError(f'unknown task {e["task"]["id"]}')
        merge(t, e['task'])
        if t.get('lane'):
            t['lane'] = lane_id(plan, t['lane'])
    elif ev in ('task_started', 'task_waiting', 'task_done', 'task_dropped'):
        t = find(plan['tasks'], e['task'])
        if not t:
            raise ValueError(f'unknown task {e["task"]}')
        if ev == 'task_started':
            t['state'] = 'running'
        elif ev == 'task_waiting':
            t['state'] = 'blocked' if find(plan['tasks'], e.get('on')) else 'waiting'
            merge(t, {k: e[k] for k in ('on', 'due') if e.get(k)})
        elif ev == 'task_dropped':
            t['state'] = 'dropped'
            t['why'] = e.get('why')
        else:
            if t.get('every'):
                t['state'] = 'ready'
                t['last_run'] = e['t']
            else:
                t['state'] = 'done'
            for k in ('out', 'check', 'hashes'):
                if e.get(k) is not None:
                    t[k] = e[k]
            if e.get('check'):
                t['checked_at'] = e.get('checked_at') or e['t']
    elif ev == 'read':
        t = find(plan['tasks'], e.get('task'))
        if t and t.get('every'):
            t['last_run'] = e['t']
        for g in plan['goals']:
            if g.get('metric') and g['metric'] == e.get('what'):
                g['figure'] = {'value': e.get('value'), 'at': e['t'][:10], 'src': e.get('src')}
    return plan


def replay(events):
    plan = empty_plan()
    for e in events:
        apply(plan, e)
    return plan


def task_problems(t, K, lanes):
    probs = []
    if t.get('lane') not in lanes:
        probs.append(f'task {t.get("id")}: unknown lane {t.get("lane")}')
    k = K.get(t.get('kind'))
    if not k:
        return probs + [f'task {t.get("id")}: unknown kind {t.get("kind")}']
    if t.get('every') and t['kind'] in ('comms', 'deliverable'):
        probs.append(f'task {t["id"]}: a {t["kind"]} task never recurs: make a recurring work task that '
                     'drafts it and adds that week\'s comms task (D61)')
    if t.get('state', 'ready') in OPEN:
        for f in k.get('needs', []):
            if t.get(f) in (None, '', []):
                probs.append(f'task {t["id"]} ({t["kind"]}): needs {f}')
    return probs


def bad_date(v):
    return v is not None and not (re.fullmatch(DATE, str(v)) and day(v))


def validate(plan, e):
    """Refuse an event that would leave the plan invalid (lld section 7, the log tool)."""
    if e['ev'] not in EVENTS:
        raise ValueError(f'unknown event {e["ev"]}')
    if e['ev'] in HISTORY:
        raise ValueError(f'{e["ev"]} is history: replayed from old logs, never added. Nothing is built on the '
                         'machine: write the lesson to work/lessons.md (A15)')
    if not re.match(r'\d{4}-\d\d-\d\dT', str(e.get('t'))):
        raise ValueError(f'bad time {e.get("t")} (UTC, ISO 8601)')
    if e['ev'] == 'lane_renamed' and not all(isinstance(e.get(k), str) and e[k] for k in ('from', 'to', 'release')):
        raise ValueError('a lane_renamed needs from, to and release')
    for v in ([e['task'].get('due')] if e['ev'] in ('task_added', 'task_refined') and isinstance(e.get('task'), dict)
              else [e.get('due')] if e['ev'] == 'task_waiting'
              else [e['goal'].get('by')] if e['ev'] == 'goal' and isinstance(e.get('goal'), dict) else []):
        if bad_date(v):
            raise ValueError(f'{v!r} is not a date: write it YYYY-MM-DD')
    if e['ev'] in ('task_added', 'task_refined') and isinstance(e.get('task'), dict) \
            and e['task'].get('kind') == 'new-skill':
        raise ValueError('a new-skill task is refused: nothing is built on the machine; write the lesson to '
                         'work/lessons.md, tagged [core] or [<agency>] (A15)')
    if e['ev'] == 'read':
        if e.get('task') and not find(plan['tasks'], e['task']):
            raise ValueError(f'unknown task {e["task"]}')
        v = e.get('value')
        if any(g.get('metric') == e.get('what') for g in plan['goals']) and (
                isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v)):
            raise ValueError(f'a read of a goal\'s metric needs a number, not {v!r}')
    K = kinds()
    if e['ev'] == 'task_done':
        t = find(plan['tasks'], e.get('task'))
        if t and K.get(t.get('kind'), {}).get('evaluate') and e.get('check') != 'pass' \
                and not str(e.get('why', '')).startswith('4.4'):
            raise ValueError(f'{t["id"]} is a {t["kind"]}: it is done only with an evaluator pass '
                             '(or why "4.4: ..." for work done before the move, R7)')
    trial = apply(copy.deepcopy(plan), e)
    lanes = {l['id'] for l in trial['lanes']}
    for l in trial['lanes']:
        if l.get('state') not in LANE_STATES:
            raise ValueError(f'lane {l["id"]}: state {l.get("state")} is not one of {", ".join(LANE_STATES)}')
    for t in trial['tasks']:
        if t.get('state') not in TASK_STATES:
            raise ValueError(f'task {t["id"]}: state {t.get("state")} is not one of {", ".join(TASK_STATES)}')
    if e['ev'] in ('task_added', 'task_refined'):
        tid = e['task']['id']
        probs = task_problems(find(trial['tasks'], tid), K, lanes)
        if probs:
            raise ValueError('; '.join(probs))
    return trial


def append(h, e):
    e.setdefault('t', now())
    e.setdefault('by', 'agent')
    events = h.events()
    if e['ev'] == 'sent':
        if not e.get('id'):
            raise ValueError('a sent event needs an id')
        if any(x.get('ev') == 'sent' and x.get('id') == e['id'] for x in events):
            raise ValueError(f'already sent: {e["id"]} (nothing is sent twice)')
    validate(replay(events), e)
    h.drop_truncated()  # the first command that appends drops a truncated last line, logging it
    h.write_line(json.dumps(e, ensure_ascii=False))
    return e


def files_in(h, path):
    """The files a work/ path stands for: itself, or every file in the folder."""
    full = h.p(path)
    if os.path.isfile(full):
        return [path]
    return sorted(os.path.relpath(os.path.join(dp, fn), h.root).replace(os.sep, '/')
                  for dp, _, fs in os.walk(full) for fn in fs if not fn.startswith('.'))


def sha256(path):
    return hashlib.sha256(open(path, 'rb').read()).hexdigest()


def write_atomic(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + '.tmp'
    with open(tmp, 'wb') as f:
        f.write(data)
    os.replace(tmp, path)


# ---------------------------------------------------------------- commands

def cmd_log(h, a):
    e = json.loads(a.json, parse_constant=lambda c: (_ for _ in ()).throw(ValueError(f'{c} is not a number'))) if a.json else {}
    if not isinstance(e, dict):
        raise ValueError('the event is a JSON object')
    e['ev'] = a.ev
    append(h, e)
    print(f'logged {a.ev}')


def cmd_task(h, a):
    plan = h.plan()
    t = find(plan['tasks'], a.id)
    if not t:
        sys.exit(f'unknown task {a.id}')
    if a.action == 'start':
        if t.get('state') in ('done', 'dropped'):
            sys.exit(f'{a.id} is {t["state"]}: add a new task, or refine this one back to ready first')
        reads = list(t.get('refs', []))
        follows = t.get('follows')
        for f in ([follows] if isinstance(follows, str) else follows or []):
            ft = find(plan['tasks'], f)
            if ft:
                reads = [x for x in [ft.get('out'), *(ft.get('refs') or [])] if x] + reads
                if ft.get('notes'):
                    print(f'notes of {f}: {ft["notes"]}')
        skill = t.get('skill') or kinds().get(t.get('kind'), {}).get('skill')
        if str(skill).startswith('named on the task'):
            skill = 'agency-task'
        print(f'{t["id"]} · {t.get("title", "")}\n  do: {t.get("do", "")}\n'
              f'  done when: {t.get("done_when") or "the evaluator passes it, then it is sent"}')
        if t.get('notes'):
            print(f'  notes: {t["notes"]}')
        print(f'  skill: {skill}\n  read first:')
        for r in reads:
            mark = '' if r.startswith(('http', 'repo:')) or os.path.exists(h.p(r)) else '  (missing)'
            print(f'    {r}{mark}')
        append(h, {'ev': 'task_started', 'task': a.id, 'refs_read': reads})
    elif a.action == 'done':
        if a.check == 'fail':  # the evaluator's fail is recorded; the task stays open
            keep = re.sub(r';? ?check fail(: \S+)?', '', t.get('notes') or '').strip('; ')  # the resume note, without older fails
            notes = '; '.join(x for x in (keep, f'check fail: {a.why}' if a.why else 'check fail') if x)
            append(h, {'ev': 'task_refined', 'task': {'id': a.id, 'check': 'fail', 'notes': notes},
                       'why': 'evaluator fail'})
            print(f'{a.id} failed its check; still {t.get("state")}')
            return
        if a.checked and not (re.fullmatch(DATE, a.checked) and day(a.checked)):
            sys.exit('--checked takes the date of the check, YYYY-MM-DD')
        if a.out and not a.out.startswith('work/'):
            sys.exit(f'{a.id}: --out {a.out} is outside work/: everything we make is in work/ (nothing was recorded)')
        hashes, share = {}, []
        if a.check == 'pass':  # P5: fingerprint what the pass covers; C2: share it by copying it
            if not kinds().get(t.get('kind'), {}).get('evaluate'):
                sys.exit(f'{a.id} is a {t.get("kind")} task: only deliverable and comms tasks are checked '
                         '(nothing was recorded)')
            out = a.out or t.get('out')
            if not out or not str(out).startswith('work/'):
                sys.exit(f'{a.id}: its out {out} is not in work/: copy it into work/ and refine the task (nothing was recorded)')
            if not os.path.exists(h.p(out)):
                sys.exit(f'{a.id}: its out {out} does not exist: nothing to fingerprint (nothing was recorded)')
            if os.path.isdir(h.p(out)):
                sys.exit(f'{a.id}: its out {out} is a folder: name the file the customer gets, so nothing internal '
                         'is shared (nothing was recorded)')
            h.cid()  # a pass needs the customer's folder
            for path in [out] + (t.get('refs') or [] if t.get('kind') == 'comms' else []):
                if str(path).startswith('work/') and os.path.exists(h.p(path)):
                    for f in files_in(h, path.rstrip('/')):
                        hashes[f] = sha256(h.p(f))
                        if not (t.get('kind') == 'comms' and path == out):  # the email text itself is not shared
                            share.append(f)
        e = {'ev': 'task_done', 'task': a.id, 'out': a.out, 'check': a.check, 'why': a.why,
             **({'hashes': hashes} if hashes else {}),
             **({'checked_at': a.checked + 'T00:00:00Z'} if a.checked else {})}
        validate(h.plan(), {**e, 't': now()})  # refused before anything is copied
        try:  # copied before the pass is logged: a failed copy leaves no logged pass
            for f in share:
                os.makedirs(os.path.dirname(h.p(h.art(f))), exist_ok=True)
                shutil.copy2(h.p(f), h.p(h.art(f)))
        except OSError as x:
            sys.exit(f'the copy into artifacts/ failed ({x}); the pass was not logged')
        append(h, e)
        print(f'{a.id} done' + (f'; {len(share)} file(s) shared in artifacts/{h.cid()}/' if share else ''))
    elif a.action == 'wait':
        if not a.on:
            sys.exit('task wait needs --on: who or what it waits on (customer, or what is missing) or the task id it is blocked by')
        append(h, {'ev': 'task_waiting', 'task': a.id, 'on': a.on, 'due': a.due})
        print(f'{a.id} {find(h.plan()["tasks"], a.id)["state"]} on {a.on}')
    elif a.action == 'drop':
        if not a.why:
            sys.exit('dropping a task needs --why')
        append(h, {'ev': 'task_dropped', 'task': a.id, 'why': a.why})
        if not t.get('hashes'):
            print(f'{a.id} dropped')
            return
        keep = {h.shared(f) for e in h.events() if e['ev'] == 'sent' for f in e.get('files') or []}  # sent stays
        keep |= {h.art(f) for x in h.plan()['tasks'] if x['id'] != a.id and x.get('state') != 'dropped'
                 for f in x.get('hashes') or {}}  # another task's pass still covers it
        gone = [h.art(f) for f in t['hashes'] if h.art(f) not in keep and os.path.isfile(h.p(h.art(f)))]
        for f in gone:
            os.remove(h.p(f))
        print(f'{a.id} dropped' + (f'; withdrawn: {", ".join(gone)}' if gone else ''))


def cmd_view(h, a):
    plan = h.plan()
    if a.what == 'tail':
        n = int(a.arg or 30)
        for e in h.events()[-n:]:
            print(json.dumps(e, ensure_ascii=False))
    elif a.what == 'lane':
        lid = lane_id(plan, a.arg)
        print(json.dumps(find(plan['lanes'], lid), ensure_ascii=False, indent=1))
        for t in plan['tasks']:
            if t.get('lane') == lid:
                print(f'  {t["id"]:>5} {t.get("state", ""):8} {t.get("kind", ""):11} {t.get("title", "")}')
    elif a.what == 'tasks':
        if not a.open:
            for t in sorted(plan['tasks'], key=lambda t: (t.get('lane', ''), num(t['id']))):
                print(line(t))
            return
        pick, to_send, to_ask, other = open_tasks(h, plan)
        print('pick, in this order (running first, then plan, goal lanes by rank, discovery, comms):')
        for t in pick:
            print(line(t))
        for title, ts in (('to send (checked, not sent): run the agency-comms skill', to_send),
                          ('to ask (the customer\'s; asked through comms, never picked; FOLLOW UP ones are due a reminder)', to_ask),
                          ('waiting, blocked, paused lane, or recurring and not due', other)):
            if ts:
                print(title + ':')
                for t in ts:
                    print(line(t))
    elif a.what == 'facts':
        for e in h.events():
            if e['ev'] == 'fact':
                print(f'{e["t"][:10]}  {e.get("text")}  [{e.get("src", "")}]')
    elif a.what == 'skills':  # the core's skills beside agency-run, then the bot's
        for sk in (os.path.dirname(SKILL), h.p('.sl8', 'bot', '.claude', 'skills')):
            for d in sorted(os.listdir(sk)) if os.path.isdir(sk) else []:
                f = os.path.join(sk, d, 'SKILL.md')
                if os.path.exists(f):
                    text = open(f, encoding='utf-8').read()
                    head = text.split('---')[1] if text.startswith('---') else ''
                    desc = re.search(r'^description:\s*(.+)$', head, re.M)
                    status = re.search(r'^\s*status:\s*(\S+)', head, re.M)
                    print(f'{d:20} [{status.group(1) if status else "proven"}] {desc.group(1)[:140] if desc else ""}')


def num(tid):
    d = re.sub(r'\D', '', str(tid))
    return (int(d) if d else 0, str(tid))


def line(t):
    extra = f'  every {t["every"]}, last {str(t.get("last_run", "never"))[:10]}' if t.get('every') else ''
    extra += f'  on {t["on"]}' if t.get('on') else ''
    extra += f'  due {t["due"]}' if t.get('due') else ''
    extra += f'  FOLLOW UP ({t["_follow"]})' if t.get('_follow') else ''
    extra += f'  (released: {t["on"]} is finished, or has run since)' if t.get('_released') else ''
    extra += '  NOT SENT: carry it in a comms task, or drop it with why' if t.get('_unsent') else ''
    return f'{t["id"]:>5} {t.get("lane", ""):18} {t.get("state", ""):8} {t.get("kind", ""):11} {t.get("title", "")}{extra}'


def due_now(t, today=None):
    """A recurring task is due when it has not run since its last due day (missed runs run next session)."""
    today = today or dt.date.today()
    last = day(t.get('last_run'))
    if not last:
        return True
    every = str(t.get('every')).lower()[:3]
    if every in DAYS:
        d = today - dt.timedelta(days=(today.weekday() - DAYS.index(every)) % 7)  # the latest such day
        return last < d
    return last < today  # daily


def sent_tasks(events):
    out = set()
    for e in events:
        if e.get('ev') == 'sent':
            out.update([e['task']] if isinstance(e.get('task'), str) else e.get('tasks') or [])
            out.add(e.get('id'))
    return out


def open_tasks(h, plan):
    """The pick list and the rest, as the agency-run skill uses them (TOOL.md section 7)."""
    lanes = {l['id']: l for l in plan['lanes']}
    events = h.events()
    sent = sent_tasks(events)
    carried = {r.rstrip('/') for c in plan['tasks'] if c.get('kind') == 'comms' and c.get('state') in OPEN + ('done',)
               for r in c.get('refs') or []}
    inside = lambda a, b: a == b or a.startswith(b + '/')  # a is b, or a file in folder b
    since = {e['task']['id']: e['t'] for e in events if e['ev'] == 'task_added'}  # added already waiting: from then
    since.update({e['task']: e['t'] for e in events if e['ev'] == 'task_waiting'})  # when each wait began
    moved = next((e['t'] for e in events if e['ev'] == 'session' and str(e.get('summary', '')).startswith('moved from 4.4')), '')
    done_at = {e['task']: e['t'] for e in events if e['ev'] == 'task_done'}
    today = dt.date.today()
    pick, to_send, to_ask, other = [], [], [], []
    for t in plan['tasks']:
        t = dict(t)
        st, lane = t.get('state'), lanes.get(t.get('lane'), {})
        blocker = find(plan['tasks'], t.get('on')) if st == 'blocked' else None
        if blocker and (blocker.get('state') in ('done', 'dropped') or
                        str(blocker.get('last_run') or '') >= since.get(t['id'], '~')):  # a recurring blocker that ran since
            st, t['_released'] = 'ready', True  # the task it waited on is finished: back on the list
        due = day(t.get('due'))
        if t.get('kind') == 'comms' and st == 'done' and t.get('check') == 'pass' and t['id'] not in sent \
                and t.get('send_id', t['id']) not in sent:
            to_send.append(t)
        elif t.get('kind') == 'deliverable' and st == 'done' and t['id'] not in sent and t.get('out') and \
                done_at.get(t['id'], '') > moved and not str(t.get('why', '')).startswith('4.4') and \
                not any(inside(f, t['out'].rstrip('/')) or inside(t['out'].rstrip('/'), f) for f in carried):
            t['_unsent'] = True
            to_send.append(t)
        elif st not in OPEN:
            continue
        elif st == 'waiting' and t.get('kind') == 'customer' and lane.get('state') == 'active' and (
                (due < today) if due else
                (t['id'] in since and day(since[t['id']]) and (today - day(since[t['id']])).days >= 7)):
            t['_follow'] = 'past its date' if due and due < today else 'a week since asked'
            to_ask.append(t)
        elif st in ('waiting', 'blocked') or lane.get('state') != 'active' or (t.get('every') and not due_now(t)):
            other.append(t)
        elif t.get('kind') == 'customer':
            to_ask.append(t)
        else:
            pick.append(t)
    key = lambda t: (t.get('state') != 'running', PICK.get(t.get('lane'), lanes.get(t.get('lane'), {}).get('rank') or 99),
                     num(t['id']))
    return sorted(pick, key=key), to_send, to_ask, other


def coming(plan, t, r):
    """A ref still to be made: it sits in the output of an unfinished task this one follows or waits on."""
    ids = t.get('follows') or []
    ids = ([ids] if isinstance(ids, str) else list(ids)) + ([t['on']] if t.get('on') else [])
    for i in ids:
        u = find(plan['tasks'], i)
        if u and u.get('state') in OPEN and u.get('out'):
            o = u['out'].rstrip('/')
            if r == o or r.startswith(o + '/'):
                return True
    return False


def coverage(events, plan, shared, norm):
    """What a pass or a send shares: ({shared path}, {shared path: the hash of its latest pass}).
    `shared` maps a work/ path to its shared path; `norm` reads a sent event's shared path."""
    covered, expect = set(), {}
    for e in events:
        if e['ev'] == 'task_done' and e.get('check') == 'pass':
            t = find(plan['tasks'], e.get('task')) or {}
            draft = e.get('out') or t.get('out')
            for f, x in (e.get('hashes') or {}).items():
                if t.get('kind') == 'comms' and f == draft:
                    continue  # the email text is hashed, never shared
                covered.add(shared(f))
                expect[shared(f)] = x
        elif e['ev'] == 'sent':
            covered.update(norm(f) for f in e.get('files') or [])
    return covered, expect


def check(h):
    """The session check (TOOL.md section 8): valid, checked, replays. Returns (problems, stray shared files)."""
    try:
        events, K = h.events(), kinds()
        plan = replay(events)
    except Exception as x:  # a broken log is a problem to fix, not to hide
        return [f'replays: the log does not replay: {x}'], []
    probs = []
    if h.truncated is not None:
        probs.append('replays: the log\'s last line is truncated (a lost machine): `agency check --fix` drops it, '
                     'logging it as an error')
    lanes = {l['id']: l for l in plan['lanes']}
    # 1 valid
    for s in STANDING:
        if s not in lanes:
            probs.append(f'valid: standing lane {s} is missing')
    for l in plan['lanes']:
        if not l.get('standing') and l.get('state') == 'active':
            for f in ('goal', 'scope', 'gauge', 'done', 'pause', 'rank'):
                if l.get(f) in (None, ''):
                    probs.append(f'valid: lane {l["id"]} needs {f}')
    for t in plan['tasks']:
        probs += ['valid: ' + p for p in task_problems(t, K, lanes)]
        if t.get('state') in OPEN:
            for r in t.get('refs') or []:
                if r.startswith('work/') and not os.path.exists(h.p(r)) and not coming(plan, t, r):
                    probs.append(f'valid: task {t["id"]}: ref {r} does not exist')
    try:
        cid = h.cid()
    except ValueError as x:
        return probs + [f'valid: {x}'], []
    # 2 checked (R6: a send made another way is checked after the fact too; R7: 4.4 work is not)
    covered, expect = coverage(events, plan, h.art, h.shared)
    for e in events:
        if e['ev'] == 'sent':
            for tid in ([e['task']] if isinstance(e.get('task'), str) else e.get('tasks') or []):
                t = find(plan['tasks'], tid)
                if t and t.get('check') != 'pass' and not str(t.get('why', '')).startswith('4.4') \
                        and not done_under_44(events, tid):
                    probs.append(f'checked: sent {e.get("id")} carried {tid} without an evaluator pass')
    stray, box = [], h.art('work/outbox/')
    for dp, _, fs in os.walk(h.p('artifacts', cid)):
        for fn in sorted(fs):
            rel = os.path.relpath(os.path.join(dp, fn), h.root).replace(os.sep, '/')
            if fn.startswith('.'):
                continue
            twin = 'work/outbox/' + rel[len(box):] if rel.startswith(box) else None
            if twin and os.path.isfile(h.p(twin)):  # the owner's copy of an email send wrote (D78)
                if not rel.startswith(box + 'sent/') and sha256(h.p(rel)) != sha256(h.p(twin)):  # a sent one is a record
                    probs.append(f'checked: {rel} differs from {twin}, the email send wrote (changed after it was '
                                 f'written): `agency send {fn[:-4]}` writes both again')
            elif not (rel in covered or any(f.endswith('/') and rel.startswith(f) for f in covered)):
                stray.append(rel)
                probs.append(f'checked: {rel} is shared but no pass or sent event covers it')
            elif rel in expect and sha256(h.p(rel)) != expect[rel]:
                probs.append(f'checked: {rel} differs from what its pass checked (changed after it was shared): '
                             're-check its task')
    if os.path.isfile(h.p('outcome.json')):  # A16 (D82): shared means copied into artifacts/ this job
        try:
            status = json.load(open(h.p('outcome.json'), encoding='utf-8')).get('status')
        except (ValueError, AttributeError):
            status = None
            probs.append('outcome: outcome.json is not a JSON object with a status')
        files = shared_this_job(h, events, plan)
        if status == 'partial' and files:
            probs.append(f'outcome: outcome.json says partial, but this job shared {", ".join(files)}: '
                         'write delivered with them')
    return probs, stray


def shared_this_job(h, events, plan):
    """What this job copied into artifacts/<customer id>/ and is still there: each pass's copies, and the owner's copy
    of the email `send` wrote for a comms task passed this job. A job is the events since the previous job's
    `session` end."""
    ends = [i for i, e in enumerate(events) if e['ev'] == 'session' and e.get('phase') == 'end']
    passed = [e for e in events[ends[-2] + 1 if len(ends) > 1 else 0:]
              if e['ev'] == 'task_done' and e.get('check') == 'pass']
    files = coverage(passed, plan, h.art, h.shared)[0] | {h.art(f'work/outbox/{e["task"]}.eml') for e in passed}
    return sorted(f for f in files if os.path.isfile(h.p(f)))


def done_under_44(events, tid):
    return any(e['ev'] == 'task_done' and e.get('task') == tid and str(e.get('why', '')).startswith('4.4')
               for e in events)


def cmd_check(h, a):
    probs, stray = check(h)
    if a.fix and (stray or h.truncated is not None):
        h.drop_truncated()
        cid_dir = None
        for rel in stray:  # A14: a file with no event (a lost machine) goes to work/recovered/
            cid_dir = cid_dir or f'artifacts/{h.cid()}/'
            dest = 'work/recovered/' + rel[len(cid_dir):]
            os.makedirs(os.path.dirname(h.p(dest)), exist_ok=True)
            shutil.move(h.p(rel), h.p(dest))
            h.write_line(json.dumps({'t': now(), 'ev': 'error', 'by': 'agent',
                                     'text': f'check --fix: {rel} was shared with no event; moved to {dest}'},
                                    ensure_ascii=False))
            print(f'fixed: moved {rel} to {dest}')
        probs, stray = check(h)
    for p in probs:
        print('FAIL', p)
    print('check: ok' if not probs else f'check: {len(probs)} problem(s); fix them first')
    sys.exit(1 if probs else 0)


def cmd_send(h, a):
    """Everything is checked before anything is written. With no email service, the checked email is
    written as work/outbox/<task>.eml (D57) and copied to artifacts/<customer id>/outbox/, where the owner
    gets it (D78); `--by khalid` logs the owner's send."""
    plan = h.plan()
    t = find(plan['tasks'], a.id)
    if not t or t.get('kind') != 'comms':
        sys.exit(f'{a.id} is not a comms task')
    if t.get('check') != 'pass':
        sys.exit(f'{a.id} has no evaluator pass: finish it with `task done {a.id} --check pass` first (R8)')
    draft = t.get('out')
    if not draft or not os.path.exists(h.p(draft)):
        sys.exit(f'{a.id} needs out: the email text in work/ (subject on the first line)')
    to = t.get('to')
    if not to:
        sys.exit(f'{a.id} needs to: the recipient address')
    sid = t.get('send_id') or a.id  # a comms task goes out once
    events = h.events()
    if any(e.get('ev') == 'sent' and e.get('id') == sid for e in events):
        sys.exit(f'already sent: {sid}')
    lines = open(h.p(draft), encoding='utf-8').read().split('\n')
    subject, body = lines[0].removeprefix('Subject:').strip(), '\n'.join(lines[1:]).strip()
    outbox, filed = f'work/outbox/{a.id}.eml', f'work/outbox/sent/{a.id}.eml'
    if a.by:  # the owner sent the .eml (D57): always loggable, whatever changed since
        if not os.path.exists(h.p(outbox)) and not os.path.exists(h.p(filed)):
            sys.exit(f'{outbox} does not exist: run `send {a.id}` first')
        for src, dst in ((outbox, filed), (h.art(outbox), h.art(filed))):  # and the owner's copy (D78)
            if os.path.exists(h.p(src)):  # the files move before the event that records them (A14)
                os.makedirs(os.path.dirname(h.p(dst)), exist_ok=True)
                os.replace(h.p(src), h.p(dst))
        append(h, {'ev': 'sent', 'id': sid, 'task': a.id, 'by': a.by, 'to': to, 'subject': subject,
                   'files': [h.art(f) for f in t.get('hashes') or {} if f != draft], 'text_ref': filed})
        print(f'logged {sid} as sent by {a.by}; filed {filed}')
        return
    checked = t.get('checked_at')
    if checked and dt.datetime.now(dt.timezone.utc) - dt.datetime.fromisoformat(checked.replace('Z', '+00:00')) > dt.timedelta(days=7):
        sys.exit(f'{a.id} was checked more than a week ago: refresh and re-check first (R4)')
    refs = t.get('refs') or []
    if not isinstance(refs, list):
        sys.exit(f'{a.id}: refs must be a list of work/ paths')
    files = []
    for r in refs:
        if not r.startswith('work/'):
            sys.exit(f'{a.id}: ref {r} is not in work/: copy it into work/ and refine the task (nothing was sent)')
        if not os.path.exists(h.p(r)):
            sys.exit(f'{r} does not exist (nothing was sent)')
        bad = [x['id'] for x in plan['tasks'] if x.get('check') == 'fail' and x.get('out')
               and (x['out'] == r or r.startswith(x['out'].rstrip('/') + '/'))]
        if bad:
            sys.exit(f'{r} is the output of {", ".join(bad)}, whose check failed: re-check it first (nothing was sent)')
        files += files_in(h, r.rstrip('/'))
    hashes = t.get('hashes') or {}
    changed = [f for f in [draft] + files if hashes.get(f) != sha256(h.p(f))]
    if changed:  # P5: what goes is exactly what passed
        sys.exit(f'changed since its pass (or not covered by it): {", ".join(changed)}; '
                 f'check {a.id} again first (nothing was sent)')
    shared = [h.art(f) for f in files]
    gone = [d for d in shared if not os.path.isfile(h.p(d))]
    if gone:  # its pass shares them; a drop withdrew them (D66)
        sys.exit(f'not shared: {", ".join(gone)}; check {a.id} again first (nothing was sent)')
    edited = [d for f, d in zip(files, shared) if sha256(h.p(d)) != hashes[f]]
    if edited:  # the customer's copy must be what passed
        sys.exit(f'the shared copy differs from what passed: {", ".join(edited)}; check {a.id} again first (nothing was sent)')
    if not subject.lower().startswith('re:') and not a.urgent:  # the cap (D74, D75): emails we start, per agency
        week = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=7)
        recent = sum(1 for e in events if e.get('ev') == 'sent' and not str(e.get('subject', '')).lower().startswith('re:')
                     and dt.datetime.fromisoformat(str(e['t']).replace('Z', '+00:00')) > week)
        waiting = [f for f in outbox_waiting(h, events) if f != f'{a.id}.eml']
        if recent + len(waiting) >= CAP:
            sys.exit(f'the email limit: {recent} sent in the last 7 days and {len(waiting)} waiting in work/outbox/ '
                     f'(at most {CAP} we start a week): carry this in the next email, or `--urgent` if it is '
                     'something broken, a risk to them or a deadline (nothing was written)')
    u = h.user()
    reply, bcc = u.get('reply_address', ''), u.get('bcc', '')
    if not re.fullmatch(r'[\w.+-]+@[\w-]+\.[\w.]+', reply):
        sys.exit('bot/user.md needs its reply address: the owner sets it (nothing was written)')
    if not bcc:
        sys.exit('bot/user.md needs its Bcc: the owner sets it (nothing was written)')
    to_owner = to.strip().lower() == bcc.strip().lower()
    if to_owner and files:
        sys.exit(f'{a.id} goes to the owner: name work/ paths in its text instead of refs; '
                 'no work/ files are attached to an email for the owner (nothing was written)')
    if files and '{{links}}' not in body:
        sys.exit(f'{draft} needs a {{{{links}}}} line: send puts each attached file\'s name there (D70)')
    names = attachment_names(files)
    body = body.replace('{{links}}', '\n'.join(f'- {names[f]} (attached)' for f in files))
    msg = EmailMessage()
    msg['From'] = msg['Reply-To'] = f'Slate Agency <{reply}>'
    msg['To'], msg['Subject'] = to, subject
    if not to_owner:
        msg['Bcc'] = bcc
    msg['X-Unsent'] = '1'  # mail apps open it as a draft
    msg['Date'] = formatdate(localtime=False)
    compose(msg, body)  # the checked text, with the attachments' names in place
    for f in files:  # the work/ files, verified against their pass hashes above (D70)
        kind = (mimetypes.guess_type(f)[0] or 'application/octet-stream').split('/')
        msg.add_attachment(open(h.p(f), 'rb').read(), kind[0], kind[1], filename=names[f])
    data = msg.as_bytes()
    for path in (outbox, h.art(outbox)):  # the same bytes in the customer's folder, where the owner gets it (D78)
        write_atomic(h.p(path), data)
    print(f'wrote {outbox} and the owner\'s copy {h.art(outbox)} to send; once sent, `send {a.id} --by khalid`.')


def attachment_names(files):
    """Each attached file's name: its own name, or, when two share it, its path under work/ with / as -."""
    base = [os.path.basename(f) for f in files]
    return {f: b if base.count(b) == 1 else re.sub(r"^work/", "", f).replace("/", "-") for f, b in zip(files, base)}


def outbox_waiting(h, events):
    """The emails waiting for the owner: work/outbox/<task>.eml whose task has no sent event (an old workspace's
    sent ones stay in work/outbox/)."""
    box, sent = h.p('work', 'outbox'), sent_tasks(events)
    return sorted(f for f in os.listdir(box) if f.endswith('.eml') and f[:-4] not in sent) if os.path.isdir(box) else []


def compose(msg, body):
    """The branded email (D68): a plain-text part and an HTML part of the same checked text, then the
    signature: the Slate Agency logo (inline, by Content-ID), "Slate Agency" and the agency address.
    A draft's own last line "Slate Agency" is the signature, so it is not repeated."""
    addr = re.search(r'<(.+)>', msg['From']).group(1)
    lines = body.rstrip().split('\n')
    if lines[-1].strip() == 'Slate Agency':
        body = '\n'.join(lines[:-1]).rstrip()
    msg.set_content(f'{body}\nSlate Agency\n{addr}\n')
    logo = os.path.exists(LOGO)
    msg.add_alternative(
        '<!doctype html><html><body style="margin:0;padding:24px;background:#ffffff">'
        '<div style="max-width:600px;font:15px/1.55 Arial,Helvetica,sans-serif;color:#3F3D3A">'
        f'{to_html(body)}'
        '<table role="presentation" style="margin-top:28px;border-top:1px solid #CFCCC7;padding-top:14px"><tr>'
        + ('<td style="padding-right:12px;vertical-align:middle"><img src="cid:slate-logo" alt="Slate Agency" width="44" height="32" style="display:block"></td>' if logo else '') +
        '<td style="vertical-align:middle;font:14px/1.4 Arial,Helvetica,sans-serif">'
        '<b style="color:#1C1B1A">Slate Agency</b><br>'
        f'<a href="mailto:{H.escape(addr)}" style="color:#B93A0C;text-decoration:none">{H.escape(addr)}</a></td>'
        '</tr></table></div></body></html>', subtype='html')
    if logo:
        msg.get_payload()[1].add_related(open(LOGO, 'rb').read(), 'image', 'png', cid='<slate-logo>',
                                         disposition='inline', filename='slate-logo.png')


def to_html(text):
    """The email text as simple HTML: a paragraph per block (a wrapped line joins the one before),
    "- " and "1. " lines as list items (an indented line continues the item), links live."""
    def inline(t):
        return re.sub(r'(https?://[^\s<]+[^\s<.,;:)])', r'<a href="\1" style="color:#B93A0C">\1</a>', H.escape(t, quote=False))
    out = []
    for block in re.split(r'\n\s*\n', text.strip()):
        parts = []  # [kind, [items]]: kind p, ul or ol
        for l in block.split('\n'):
            m = re.match(r'(- |\d+\. )(.*)', l)
            k = None if not m else 'ul' if m.group(1) == '- ' else 'ol'
            if k:
                if not parts or parts[-1][0] != k:
                    parts.append([k, []])
                parts[-1][1].append(m.group(2))
            elif parts and (parts[-1][0] == 'p' or l[:1].isspace()):
                parts[-1][1][-1] += ' ' + l.strip()
            else:
                parts.append(['p', [l.strip()]])
        for k, items in parts:
            out.append(f'<p style="margin:0 0 14px">{inline(items[0])}</p>' if k == 'p' else
                       f'<{k} style="margin:0 0 14px;padding-left:22px">'
                       + ''.join(f'<li style="margin:0 0 6px">{inline(x)}</li>' for x in items) + f'</{k}>')
    return ''.join(out)


def health(events, g, plan, today):
    """The how-to-run formula: behind = (needed - pace) / needed."""
    fig = (g.get('figure') or {}).get('value')
    by = day(g.get('by'))
    if fig is None or g.get('to') is None or not by:
        return 'unknown: ' + ('no figure yet' if fig is None else 'no target or date') + '; judge by the lead measures'
    if fig >= g['to']:
        return 'met'
    left = (by - today).days
    if left <= 0:
        return 'red: past its date'
    reads = [(dt.datetime.fromisoformat(e['t'].replace('Z', '+00:00')), e['value']) for e in events if e['ev'] == 'read'
             and e.get('what') == g.get('metric') and isinstance(e.get('value'), (int, float))]
    needed = (g['to'] - fig) / left
    base = [r for r in reads if reads and (reads[-1][0] - r[0]).days >= 5]
    if not base:
        return f'unknown: under 5 days of reads; needs {needed:,.0f} a day'
    (t0, v0), (t1, v1) = base[-1], reads[-1]
    pace = (v1 - v0) / ((t1 - t0).total_seconds() / 86400)
    behind = (needed - pace) / needed
    late = [t for t in plan['tasks'] if t.get('state') == 'waiting' and day(t.get('due')) and any(
        l['id'] == t.get('lane') and g['id'] in str(l.get('goal', '')).split() for l in plan['lanes'])
        and sum(1 for i in range((today - day(t['due'])).days)
                if (today - dt.timedelta(days=i)).weekday() < 5) > 3]
    word = 'red' if behind > .15 else 'amber' if behind > .05 or late else 'green'
    return (f'{word}: {pace:,.0f} a day against {needed:,.0f} needed, {max(behind, 0):.0%} behind'
            + (f'; {", ".join(t["id"] for t in late)} more than 3 working days late' if late else ''))


def stage(plan, lane):
    """A lane's stage: its latest done stage task (ids <lane>-S<nn>), or None (TOOL.md section 6)."""
    done = [m.group(1) for t in plan['tasks'] if t.get('lane') == lane and t.get('state') == 'done'
            for m in [re.search(r'-(S\d\d)$', str(t['id']))] if m]
    return max(done) if done else None


def card(h, plan, events, pick, other, to_ask, stamp):
    """now.md: the customer-safe card (TOOL.md section 9), read by the owner and the customer."""
    words = {'met': 'on track', 'green': 'on track', 'amber': 'behind', 'red': 'well behind'}
    name = h.user().get('customer') or plan.get('customer') or ''
    out = [f'# {name} · {stamp.strftime("%Y-%m-%d %H:%M")} UTC']
    for g in plan['goals']:
        if g.get('state') != 'active':
            continue
        f = g.get('figure') or {}
        fig = f'{f["value"]:,} ({f.get("at")})' if isinstance(f.get('value'), (int, float)) else 'no figure yet'
        word = words.get(health(events, g, plan, stamp.date()).split(':')[0], 'not yet known')
        out.append(f'Goal: {g.get("text", "")}' + (f' by {g["by"]}' if g.get('by') else '') + f' · {fig} · {word}')
    nxt = {}
    for t in pick + other:
        if t.get('kind') != 'customer':
            nxt.setdefault(t.get('lane'), t)
    lanes = sorted((l for l in plan['lanes'] if not l.get('standing') and l.get('state') not in ('stopped', 'done')),
                   key=lambda l: l.get('rank') or 99)
    if lanes:
        out.append('Our work:')
    for l in lanes:
        s, n = stage(plan, l['id']), nxt.get(l['id'])
        out.append(f'  {l.get("title") or l["id"]} · {l.get("state")}' + (f' · {s}' if s else '')
                   + (f' · now: {n.get("title", "")}' if n else ''))
    since = {e['task']['id']: e['t'] for e in events if e['ev'] == 'task_added'}
    since.update({e['task']: e['t'] for e in events if e['ev'] == 'task_waiting'})
    asked = [t for t in to_ask + other if t.get('kind') == 'customer' and t.get('state') == 'waiting']
    if asked:
        out.append('We\'re waiting on you for:')
    for t in asked:
        out.append(f'  {t.get("title", "")} (asked {str(since.get(t["id"], ""))[:10]}'
                   + (f', by {t["due"][:10]}' if day(t.get('due')) else '') + ')')
    sent = next((e for e in reversed(events) if e['ev'] == 'sent'), None)
    if sent:
        out.append(f'Last email: {sent["t"][:10]} · {sent.get("subject", "")}')
    return '\n'.join(('  ' if l.startswith('  ') else '') + ' '.join(l.split()) for l in out) + '\n'  # one line each


def cmd_status(h, a):
    """The operator's full view on stdout; now.md, the customer-safe card, written from the log (P2).
    Logs params when user.md changed, and a lane_renamed per migration of the bot not yet logged (A7, A10)."""
    events = h.events()
    u = h.user()
    last = next((e for e in reversed(events) if e['ev'] == 'params'), None)
    if events and u and (last or {}).get('params') != u:  # from job 1's onboarding on
        append(h, {'ev': 'params', 'params': u})
        print('logged params: bot/user.md changed; take-in adds a plan review')
    done = {(e.get('from'), e.get('to'), e.get('release')) for e in events if e['ev'] == 'lane_renamed'}
    for mf in [] if not events else sorted(glob.glob(h.p('.sl8', 'bot', '.claude', 'skills', '*', 'lanes', 'migrations.json'))):
        for m in json.load(open(mf, encoding='utf-8')):
            if (m.get('from'), m.get('to'), m.get('release')) not in done:
                append(h, {'ev': 'lane_renamed', 'from': m.get('from'), 'to': m.get('to'), 'release': m.get('release')})
                done.add((m.get('from'), m.get('to'), m.get('release')))
                print(f'logged lane_renamed {m.get("from")} → {m.get("to")} ({m.get("release")})')
    plan, events, stamp = h.plan(), h.events(), dt.datetime.now(dt.timezone.utc)
    today = stamp.date()
    pick, to_send, to_ask, other = open_tasks(h, plan)
    title = lambda t: f'{t["id"]} {t.get("title", "")}'
    out = [f'# {u.get("customer") or plan.get("customer") or ""} · operator view · {today}']
    goals = [g for g in plan['goals'] if g.get('state') == 'active']
    out.append('Goals:' if goals else 'Goals: none yet')
    for g in goals:
        f = g.get('figure') or {}
        fig = f'{f["value"]:,} ({f.get("at")}, {str(f.get("src", ""))[:50]})' if isinstance(f.get('value'), (int, float)) else 'unknown'
        out.append(f'  {"  " if g.get("part_of") else ""}{g["id"]} {g.get("text", "")}'
                   f'{" by " + g["by"] if g.get("by") else ""} · {fig} · {health(events, g, plan, today)}')
    nxt = {}
    for t in pick + other:
        nxt.setdefault(t.get('lane'), t)
    lanes = sorted((l for l in plan['lanes'] if not l.get('standing') and l.get('state') not in ('stopped', 'done')),
                   key=lambda l: l.get('rank') or 99)
    out.append('Lanes, by rank:')
    for l in lanes:
        n, s = nxt.get(l['id']), stage(plan, l['id'])
        out.append(f'  {l.get("rank", "-")} {l["id"]} ({l.get("goal", "")}) · {l.get("state")}' + (f' · {s}' if s else '')
                   + (f' · next {title(n)}' + (f' ({n["state"]})' if n['state'] != 'ready' else '') if n
                      else ' · no open task: review it' if l.get('state') == 'active' else ''))
    out.append('  standing: ' + ' · '.join(STANDING))
    waits = [t for t in other if t.get('state') in ('waiting', 'blocked')] + [t for t in to_ask if t.get('state') == 'waiting']
    for head, ts in (('Waiting', waits), ('To ask', [t for t in to_ask if t.get('state') != 'waiting'])):
        if ts:
            out.append(f'{head}: ' + '; '.join(title(t) + (f' (on {t.get("on", "customer")}' + (
                f', due {t["due"][:10]}' if t.get('due') else '') + (', FOLLOW UP' if t.get('_follow') else '') + ')'
                if head == 'Waiting' else '') for t in ts))
    for t in to_send:
        out.append(f'To send: {title(t)}' + (' · NOT SENT: carry it in a comms task' if t.get('_unsent') else ''))
    box = outbox_waiting(h, events)
    if box:
        out.append(f'Waiting for the owner in artifacts/{u.get("customer_id", "<customer id>")}/outbox/: ' + ', '.join(box))
    out.append(f'Focus: {title(pick[0])}' if pick else 'Focus: the pick list is empty')
    if len(pick) > 1:
        out.append('Next: ' + '; '.join(title(t) for t in pick[1:4]))
    last = next((e for e in reversed(events) if e['ev'] == 'session'), None)
    if last:
        out.append(f'Last session: {last["t"][:10]} · {last.get("summary", "")}')
    sent = next((e for e in reversed(events) if e['ev'] == 'sent'), None)
    if sent:
        out.append(f'Last sent: {sent.get("id")} {sent["t"][:10]} by {sent.get("by", "agent")}: {sent.get("subject", "")}')
    write_atomic(h.p('work', 'agency', 'now.md'), card(h, plan, events, pick, other, to_ask, stamp).encode('utf-8'))
    print('\n'.join(out) + '\nThe card (work/agency/now.md, customer-safe) is written.')


def cmd_migrate(h, a):
    """Copies a v5 workspace (a folder, or a .tar of one) into this install (contract section 9), byte for byte:
    log.jsonl, now.md and CUSTOMER.md (without "This engagement") into work/agency/, work/ into work/,
    artifacts/ into artifacts/<customer id>/. With --goal, only that goal's lanes (and its sub-goals') and their
    events move, with the standing lanes; only the shared files the kept events cover are copied."""
    if os.path.exists(h.log_path):
        sys.exit(f'this install already has a log ({os.path.relpath(h.log_path, h.root)}): migrate only into a new install')
    cid, src, tmp = h.cid(), a.source, None
    try:
        if os.path.isfile(src):
            tmp = tempfile.mkdtemp()
            with tarfile.open(src) as tf:
                tf.extractall(tmp, **({'filter': 'data'} if hasattr(tarfile, 'data_filter') else {}))
            found = sorted((dp for dp, _, fs in os.walk(tmp) if 'log.jsonl' in fs), key=len)
            if not found:
                sys.exit(f'{src} holds no log.jsonl: not a workspace bundle')
            src = found[0]
        if not os.path.isfile(os.path.join(src, 'log.jsonl')):
            sys.exit(f'{src} has no log.jsonl: not a v5 workspace')
        raw = open(os.path.join(src, 'log.jsonl'), 'rb').read().split(b'\n')
        events = []
        for l in raw:
            try:
                events.append(json.loads(l) if l.strip() else None)
            except json.JSONDecodeError:
                events.append(None)  # a truncated last line moves as it is; the first append drops it
        keep = [True] * len(raw)
        if a.goal:
            plan = replay([e for e in events if e])
            goals = {a.goal}
            while True:
                more = {g['id'] for g in plan['goals'] if g.get('part_of') in goals} - goals
                if not more:
                    break
                goals |= more
            if not find(plan['goals'], a.goal):
                sys.exit(f'no goal {a.goal} in {src}')
            lanes = {l['id'] for l in plan['lanes'] if l.get('standing') or set(str(l.get('goal', '')).split()) & goals}
            lanes |= {o for o, n in plan['renamed'].items() if n in lanes}
            tasks = {t['id'] for t in plan['tasks'] if t.get('lane') in lanes}
            other = {g['metric'] for g in plan['goals'] if g['id'] not in goals and g.get('metric')} - \
                {g['metric'] for g in plan['goals'] if g['id'] in goals and g.get('metric')}
            for i, e in enumerate(events):
                if not e:
                    continue
                ev, tk = e.get('ev'), e.get('task')
                tid = tk.get('id') if isinstance(tk, dict) else tk
                if ev == 'goal':
                    keep[i] = e['goal'].get('id') in goals
                elif ev == 'lane_opened':
                    keep[i] = e['lane'].get('id') in lanes
                elif ev == 'lane_set':
                    keep[i] = e.get('lane') in lanes
                elif ev.startswith('task_'):
                    keep[i] = tid in tasks
                elif ev == 'read':
                    keep[i] = tid in tasks if tid else e.get('what') not in other
                elif ev == 'sent':
                    ts = [tk] if isinstance(tk, str) else e.get('tasks') or []
                    keep[i] = not ts or any(x in tasks for x in ts)
        log = b'\n'.join(l for l, k in zip(raw, keep) if k)
        kept = [e for e, k in zip(events, keep) if k and e]
        covered = None
        if a.goal:  # only what the kept events share
            covered, _ = coverage(kept, replay(kept), lambda f: 'artifacts/' + f[len('work/'):], lambda f: f)
        copies = []
        for top, dest in (('work', 'work'), ('artifacts', f'artifacts/{cid}')):
            for dp, _, fs in os.walk(os.path.join(src, top)):
                for fn in sorted(fs):
                    rel = os.path.relpath(os.path.join(dp, fn), src).replace(os.sep, '/')
                    if covered is not None and top == 'artifacts' and not (
                            rel in covered or any(c.endswith('/') and rel.startswith(c) for c in covered)):
                        continue
                    copies.append((rel, dest + rel[len(top):]))
        cust = os.path.join(src, 'CUSTOMER.md')
        text = re.sub(r'(?ms)^## This engagement\b.*?(?=^## |\Z)', '',
                      open(cust, encoding='utf-8').read()) if os.path.isfile(cust) else None
        moved = sum(1 for l, k in zip(raw, keep) if k and l.strip())
        if a.dry_run:
            print(f'would copy: log.jsonl ({moved} of {sum(1 for l in raw if l.strip())} lines) → work/agency/log.jsonl')
            for f in ('now.md',) + (('CUSTOMER.md (without "This engagement")',) if text is not None else ()):
                print(f'would copy: {f} → work/agency/{f.split()[0]}')
            for s, d in copies:
                print(f'would copy: {s} → {d}')
            return
        for s, d in copies:  # the files first, the log last (A14)
            os.makedirs(os.path.dirname(h.p(d)), exist_ok=True)
            shutil.copy2(os.path.join(src, s), h.p(d))
        os.makedirs(h.p('work', 'agency'), exist_ok=True)
        if text is not None:
            write_atomic(h.p('work', 'agency', 'CUSTOMER.md'), text.encode('utf-8'))
        if os.path.isfile(os.path.join(src, 'now.md')):
            shutil.copy2(os.path.join(src, 'now.md'), h.p('work', 'agency', 'now.md'))
        write_atomic(h.log_path, log + (b'' if log.endswith(b'\n') or not log else b'\n'))
        print(f'migrated {src}: {moved} log lines, {len(copies)} files into {h.root}; next `agency status` and `agency check`')
    finally:
        if tmp:
            shutil.rmtree(tmp, ignore_errors=True)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--root', default=os.environ.get('HOME', '.'), help='the install\'s root (default: $HOME)')
    ap.add_argument('--version', action='version', version=version())
    sp = ap.add_subparsers(dest='cmd', required=True)
    p = sp.add_parser('log'); p.add_argument('ev'); p.add_argument('json', nargs='?')
    p = sp.add_parser('task'); p.add_argument('action', choices=['start', 'done', 'wait', 'drop'])
    p.add_argument('id'); p.add_argument('--out'); p.add_argument('--check', choices=['pass', 'fail'])
    p.add_argument('--why'); p.add_argument('--on'); p.add_argument('--due'); p.add_argument('--checked')
    p = sp.add_parser('view'); p.add_argument('what', choices=['tail', 'lane', 'tasks', 'facts', 'skills'])
    p.add_argument('arg', nargs='?'); p.add_argument('--open', action='store_true')
    sp.add_parser('status')
    p = sp.add_parser('check'); p.add_argument('--fix', action='store_true')
    p = sp.add_parser('send'); p.add_argument('id'); p.add_argument('--by', choices=['khalid'])
    p.add_argument('--urgent', action='store_true')
    p = sp.add_parser('migrate'); p.add_argument('source'); p.add_argument('--goal'); p.add_argument('--dry-run', action='store_true')
    a = ap.parse_args(argv)
    h = Home(a.root)
    try:
        {'log': cmd_log, 'task': cmd_task, 'view': cmd_view, 'status': cmd_status, 'check': cmd_check,
         'send': cmd_send, 'migrate': cmd_migrate}[a.cmd](h, a)
    except (ValueError, KeyError, TypeError, AttributeError, json.JSONDecodeError, OSError, tarfile.TarError) as x:
        sys.exit(f'refused: {x}')


if __name__ == '__main__':
    main()
