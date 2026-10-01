// Offline self-test of the router's scripts: node --test test/scripts.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const S = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'scripts')
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'smr-'))
const env = { ...process.env, SL8_ARTIFACTS: path.join(tmp, 'artifacts'), SL8_TODAY: '2031-01-15' }
const run = (script, ...a) => spawnSync('node', [path.join(S, script), ...a], { env, encoding: 'utf8' })
const ok = (script, ...a) => { const r = run(script, ...a); assert.equal(r.status, 0, r.stderr + r.stdout); return r.stdout }
const A = path.join(tmp, 'artifacts')
const P = path.join(A, 'demo-plan')
const put = (rel, text, base = P) => { fs.mkdirSync(path.dirname(path.join(base, rel)), { recursive: true }); fs.writeFileSync(path.join(base, rel), text) }
const sections = (list, extra = '') => list.map((h) => `## ${h}\n\n- none\n`).join('\n') + extra
const deliverable = sections(['What was done', 'Findings', 'Decisions', 'Assumptions'])
const S1 = ['Key findings', 'Customers and segments', 'Competitors and alternatives', 'The company', 'External factors']
const S3 = ['Target segments', 'Positioning', 'Sales motion', 'Partnerships and sequence', 'The obstacle', 'Ruled out', 'Critique', 'Messaging sheet', 'Open decisions']
const S4 = ['Channel ranking', 'Content plan', 'Review sites and marketplaces', 'Pricing message', 'Open decisions']
const actions = (rows) => `## Actions\n\n| Week | Owner | Channel | Action | Hours | Cost |\n|---|---|---|---|---|---|\n${rows.map((r) => `| ${r.join(' | ')} |`).join('\n')}\n\n`
const weekly = (rows) => `## Weekly hours\n\n| Week | Hours |\n|---|---|\n${rows.map(([w, h]) => `| ${w} | ${h} |`).join('\n')}\n\n`

test('context: missing, then set, assume, refuse secrets', () => {
  assert.deepEqual(JSON.parse(ok('context.mjs', 'read')).missing, ['company', 'site', 'what', 'buyer'])
  ok('context.mjs', 'set', 'company', 'Northwind Labs | Shiftly', 'site', 'https://shiftly.example')
  const r = JSON.parse(ok('context.mjs', 'read'))
  assert.equal(r.fields.company.value, 'Northwind Labs | Shiftly')
  assert.deepEqual(r.missing, ['what', 'buyer'])
  ok('context.mjs', 'set', 'what', 'rota planning for clinics', 'buyer', 'practice managers', '--source', 'website')
  ok('context.mjs', 'assume')
  const r2 = JSON.parse(ok('context.mjs', 'read'))
  assert.equal(r2.fields.hours.source, 'assumed')
  assert.equal(r2.fields.what.source, 'website')
  assert.deepEqual(r2.missing, [])
  assert.notEqual(run('context.mjs', 'set', 'preferences', 'api key sk-123').status, 0)
})

test('state: init, next groups steps by skill, check gates on sections', () => {
  const n = JSON.parse(ok('state.mjs', 'init', 'demo-plan', '--kind', 'plan', '--goal', 'more paying teams', '--trigger', 'quarter', '--budget', '600'))
  assert.deepEqual(n, { kind: 'run', skill: 'saas-mkt-situation', steps: ['S1'] })
  assert.notEqual(run('state.mjs', 'init', 'demo-plan', '--goal', 'x').status, 0, 'no second init')
  put('01-situation.md', sections(S1) + '\nChurn [TBD]\n\n## Open decisions\n\n- none\n')
  assert.equal(run('state.mjs', 'check', 'demo-plan', 'S1').status, 1, '[TBD] without an open decision fails, and M1 is missing')
  put('01-situation.md', sections(S1) + '\nChurn [TBD]\n\n## Open decisions\n\n- Monthly churn: send your figure\n')
  put('deliverables/M1-situation.md', deliverable)
  ok('state.mjs', 'check', 'demo-plan', 'S1')
  assert.deepEqual(JSON.parse(ok('state.mjs', 'next', 'demo-plan')), { kind: 'run', skill: 'saas-mkt-strategy', steps: ['S2', 'S3'] })
  const s = JSON.parse(ok('state.mjs', 'show', 'demo-plan'))
  assert.deepEqual(s.milestones, ['deliverables/M1-situation.md'])
  assert.equal(s.decisions[0], 'S1 · Monthly churn: send your figure')
  assert.equal(s.budget, '600')
})

test('state: S1 needs "Earlier strategy" only when one was supplied', () => {
  ok('state.mjs', 'init', 'rev-plan', '--goal', 'next version', '--trigger', 'revision of an earlier strategy')
  const R = path.join(A, 'rev-plan')
  put('01-situation.md', sections([...S1, 'Open decisions']), R)
  put('deliverables/M1-situation.md', deliverable, R)
  ok('state.mjs', 'check', 'rev-plan', 'S1')
  spawnSync('node', [path.join(S, 'state.mjs'), 'input', 'rev-plan', 'earlier-strategy'], { env, input: 'old plan\n' })
  assert.equal(run('state.mjs', 'check', 'rev-plan', 'S1').status, 1, 'earlier strategy given but not read')
  put('01-situation.md', sections([...S1, 'Earlier strategy', 'Open decisions']), R)
  ok('state.mjs', 'check', 'rev-plan', 'S1')
})

test('state: limits, wait and resume, reopen', () => {
  put('02-objectives.md', '## Objectives\n\n### O1\n### O2\n### O3\n### O4\n\n' + sections(['Revenue lever', 'Benchmarks used', 'Open decisions']))
  assert.equal(run('state.mjs', 'check', 'demo-plan', 'S2').status, 1, 'four objectives fail')
  put('02-objectives.md', '## Objectives\n\n### O1\n### O2\n\n' + sections(['Revenue lever', 'Benchmarks used', 'Open decisions']))
  put('03-strategy.md', sections(S3) + '\n## Decisions for you\n\n- Blocking: approve the target segment\n- Approve the one-line pitch\n')
  put('deliverables/M2-strategy.md', deliverable)
  ok('state.mjs', 'check', 'demo-plan', 'S2-S3')
  ok('state.mjs', 'wait', 'demo-plan', 'S4', '--reason', 'approve the strategy (M2)')
  assert.equal(JSON.parse(ok('state.mjs', 'next', 'demo-plan')).kind, 'waiting')
  assert.deepEqual(JSON.parse(ok('state.mjs', 'resume', 'demo-plan')).steps, ['S4', 'S5', 'S6'])
})

test('state: S4 test channels, S5 hours, channels and budget', () => {
  put('04-tactics.md', sections(S4) + '\n## Channels to test\n\n- Review sites\n- Communities\n- Paid search\n- Paid social\n')
  assert.equal(run('state.mjs', 'check', 'demo-plan', 'S4').status, 1, 'four test channels fail')
  put('04-tactics.md', sections(S4) + '\n## Channels to test\n\n- Review sites\n- Communities\n')
  ok('state.mjs', 'check', 'demo-plan', 'S4')
  const tail = sections(['Resources', 'Open decisions'])
  put('05-actions.md', actions([['Wk 1', 'founder', 'Review sites and directories', 'Ask 10 customers for reviews', '2', '$0'], ['Wk 1', 'founder', 'Content', 'Write a comparison page', '4', '$0']]) + weekly([['Wk 1', '6']]) + tail)
  const r = run('state.mjs', 'check', 'demo-plan', 'S5')
  assert.equal(r.status, 1)
  assert.match(r.stdout, /plans 6 hours; the founder has 5/)
  assert.match(r.stdout, /not on the bot's list.*Content/)
  put('05-actions.md', actions([['Wk 1', 'founder', 'Review sites and directories', 'Ask 10 customers for reviews', '2', '$0'], ['Wk 1', 'founder', 'Paid search', 'Run a two-week test', '2', '$700']]) + weekly([['Wk 1', '4']]) + tail)
  assert.match(run('state.mjs', 'check', 'demo-plan', 'S5').stdout, /cost \$700; the budget for the horizon is \$600/)
  put('05-actions.md', actions([['Wk 1', 'founder', 'Review sites and directories', 'Ask 10 customers for reviews', '2', '$0'], ['Wk 1', 'founder', 'internal', 'Set up tracking', '2', '$0']]) + weekly([['Wk 1', '4']]) + tail)
  ok('state.mjs', 'check', 'demo-plan', 'S5')
  ok('state.mjs', 'facts', 'demo-plan', '--hours', '3')
  assert.equal(run('state.mjs', 'check', 'demo-plan', 'S5').status, 1, 'project hours override the profile')
  ok('state.mjs', 'facts', 'demo-plan', '--hours', '5')
  ok('state.mjs', 'check', 'demo-plan', 'S5')
})

test('state: the plan needs a summary, and "what changed" from an earlier strategy when one was given', () => {
  put('06-control.md', sections(['Measures', 'Channel test decisions', 'Review date', 'Open decisions']))
  put('deliverables/M3-plan.md', deliverable)
  put('marketing-plan.md', '# plan\n\n## Assumptions\n\n- none\n')
  assert.match(run('state.mjs', 'check', 'demo-plan', 'S6').stdout, /no "## One-page summary"/)
  put('marketing-plan.md', '# plan\n\n## One-page summary\n\nBets.\n\n## Assumptions\n\n- none\n')
  ok('state.mjs', 'check', 'demo-plan', 'S6')
  assert.equal(JSON.parse(ok('state.mjs', 'next', 'demo-plan')).kind, 'complete')
})

test('status: blocking decisions are blockers, grouped, no repeats; writes only STATUS.md', () => {
  const st = JSON.parse(ok('state.mjs', 'show', 'demo-plan'))
  assert.ok(st.decisions.includes('S3 · Blocking: approve the target segment'))
  const before = fs.readFileSync(path.join(P, 'state.md'), 'utf8')
  ok('status.mjs', 'demo-plan', '--summary', 'test')
  assert.equal(fs.readFileSync(path.join(P, 'state.md'), 'utf8'), before, 'status never writes state')
  const md = fs.readFileSync(path.join(P, 'STATUS.md'), 'utf8')
  for (const h of ['Steps', 'Blockers', 'Decisions waiting on you', 'Next step', 'What changed since last time', 'Deliverables']) assert.match(md, new RegExp(`## ${h}`))
  assert.match(md, /State:\*\* blocked/)
  assert.match(md, /## Blockers\n\n- S3 · approve the target segment/)
  assert.match(md, /\*\*S3 Strategy\*\*\n- \*\*Blocking:\*\* approve the target segment/)
  assert.match(md, /with your answer to the blocking decision/)
})

test('status: "Confirm first" and "blocks" lines are blockers; check-failure lines are not changes', () => {
  const D = path.join(A, 'cf-plan')
  ok('state.mjs', 'init', 'cf-plan', '--goal', 'g')
  put('01-situation.md', sections([...S1]) + '\n## Open decisions\n\n- Confirm first: what "next term" means (assumed January)\n- Your budget\n', D)
  put('deliverables/M1-situation.md', deliverable, D)
  put('02-objectives.md', '## Objectives\n\n### O1\n\n' + sections(['Revenue lever', 'Benchmarks used']) + '\n## Open decisions\n\n- Meaning of next term. Blocks the dates of every objective.\n', D)
  ok('state.mjs', 'check', 'cf-plan', 'S1-S2')
  ok('status.mjs', 'cf-plan')
  const md = fs.readFileSync(path.join(D, 'STATUS.md'), 'utf8')
  assert.match(md, /State:\*\* blocked/)
  assert.match(md, /## Blockers\n\n- S1 · what "next term" means/)
  assert.match(md, /\*\*Blocking:\*\* what "next term" means/)
  assert.doesNotMatch(md, /check failed|started S/)
  assert.match(md, /continue cf-plan" with your answer/)
  fs.writeFileSync(path.join(D, '99-closing.md'), '# closed\n')
  ok('state.mjs', 'close', 'cf-plan')
})

test('version: snapshot keeps every file; diff names each changed section', () => {
  const k = JSON.parse(ok('version.mjs', 'snapshot', 'demo-plan'))
  assert.equal(k.kept, 'versions/v1')
  assert.ok(k.files.includes('marketing-plan.md') && k.files.includes('03-strategy.md'))
  assert.equal(JSON.parse(ok('version.mjs', 'diff', 'demo-plan')).changed.length, 0)
  put('02-objectives.md', '## Objectives\n\n### O1 changed\n### O2\n\n' + sections(['Revenue lever', 'Benchmarks used', 'Open decisions']))
  const d = JSON.parse(ok('version.mjs', 'diff', 'demo-plan'))
  assert.deepEqual(d, { against: 'v1', changed: ['02-objectives.md › Objectives'] })
  ok('status.mjs', 'demo-plan')
  assert.match(fs.readFileSync(path.join(P, 'STATUS.md'), 'utf8'), /02-objectives\.md › Objectives/)
})

test('reopen keeps the current version first, once', () => {
  ok('state.mjs', 'check', 'demo-plan', 'S2')
  const v = JSON.parse(ok('state.mjs', 'show', 'demo-plan')).planVersion
  ok('state.mjs', 'reopen', 'demo-plan', 'S4', '--reason', 'channel change')
  const s = JSON.parse(ok('state.mjs', 'show', 'demo-plan'))
  assert.equal(s.planVersion, v + 1)
  assert.ok(fs.existsSync(path.join(P, 'versions', `v${v}`, 'marketing-plan.md')))
  ok('state.mjs', 'reopen', 'demo-plan', 'S3', '--reason', 'and the target')
  assert.equal(JSON.parse(ok('state.mjs', 'show', 'demo-plan')).planVersion, v + 1, 'no second copy of the same version')
  ok('state.mjs', 'check', 'demo-plan', 'S3-S6')
  ok('version.mjs', 'snapshot', 'demo-plan')
  ok('state.mjs', 'reopen', 'demo-plan', 'S4', '--reason', 'update: a channel failed')
  assert.equal(JSON.parse(ok('state.mjs', 'show', 'demo-plan')).planVersion, v + 2, 'update: the router\'s snapshot is not repeated by reopen')
})

test('launch: named launch-<x>, M4 at S6, never offered an update; close needs a closing file', () => {
  assert.notEqual(run('state.mjs', 'init', 'hubspot', '--kind', 'launch', '--goal', 'x').status, 0)
  assert.equal(JSON.parse(ok('state.mjs', 'list')).filter((p) => p.kind === 'plan' && p.state !== 'closed').length, 2)
  fs.writeFileSync(path.join(A, 'rev-plan', '99-closing.md'), '# closed\n')
  ok('state.mjs', 'close', 'rev-plan')
  ok('state.mjs', 'init', 'launch-x', '--kind', 'launch', '--goal', 'launch integration x')
  assert.equal(JSON.parse(ok('state.mjs', 'show', 'launch-x')).parent, 'demo-plan', 'a launch links to the only open plan')
  const L = path.join(A, 'launch-x')
  for (const [i, f] of ['01-situation.md', '02-objectives.md', '03-strategy.md', '04-tactics.md', '05-actions.md', '06-control.md'].entries()) {
    const extra = { 0: sections([...S1, 'Open decisions']), 1: '## Objectives\n\n### O1\n\n' + sections(['Revenue lever', 'Benchmarks used', 'Open decisions']), 2: sections([...S3, 'Decisions for you']), 3: sections(S4) + '\n## Channels to test\n\n- Communities\n', 4: actions([['Wk 1', 'founder', 'Communities', 'Post the launch note', '1', '$0']]) + weekly([['Wk 1', '1']]) + sections(['Resources', 'Open decisions']), 5: sections(['Measures', 'Channel test decisions', 'Review date', 'Open decisions']) }[i]
    put(f, extra, L)
  }
  put('deliverables/M4-launch-x.md', deliverable, L)
  put('launch-plan.md', '## One-page summary\n\nx\n\n## Assumptions\n\n- none\n', L)
  ok('state.mjs', 'check', 'launch-x', 'S1-S6')
  ok('status.mjs', 'launch-x')
  const md = fs.readFileSync(path.join(L, 'STATUS.md'), 'utf8')
  assert.doesNotMatch(md, /update launch-x/)
  assert.doesNotMatch(md, /continue launch-x/)
  assert.match(md, /Close launch-x/)
  assert.notEqual(run('state.mjs', 'close', 'launch-x').status, 0)
  fs.writeFileSync(path.join(L, '99-closing.md'), '# closed\n')
  ok('state.mjs', 'close', 'launch-x')
  assert.equal(JSON.parse(ok('state.mjs', 'next', 'launch-x')).kind, 'closed')
  assert.notEqual(run('state.mjs', 'init', '../escape', '--goal', 'x').status, 0, 'no path escape')
})

test('input: never overwrites', () => {
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'smr-in-'))
  const e = { ...env, SL8_ARTIFACTS: path.join(t, 'artifacts') }
  const r = (...a) => spawnSync('node', [path.join(S, 'state.mjs'), ...a], { env: e, encoding: 'utf8', input: 'hello\n' })
  assert.equal(r('init', 'p1', '--goal', 'g').status, 0)
  assert.equal(r('input', 'p1', 'request').stdout.trim(), 'inputs/request-2031-01-15.md')
  assert.equal(r('input', 'p1', 'request').stdout.trim(), 'inputs/request-2031-01-15-2.md')
  assert.notEqual(r('input', 'p1', '../x').status, 0)
  fs.rmSync(t, { recursive: true, force: true })
})

test('machine layout: .claude/skills/<id> links to .agents/skills/<id>; scripts still find home artifacts/ from any folder', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'smr-home-'))
  fs.mkdirSync(path.join(home, '.agents/skills'), { recursive: true })
  fs.mkdirSync(path.join(home, '.claude/skills'), { recursive: true })
  fs.cpSync(path.join(S, '..'), path.join(home, '.agents/skills/saas-mkt-router'), { recursive: true })
  fs.symlinkSync('../../.agents/skills/saas-mkt-router', path.join(home, '.claude/skills/saas-mkt-router'))
  fs.mkdirSync(path.join(home, 'artifacts'), { recursive: true })
  const e = { ...process.env }; delete e.SL8_ARTIFACTS
  const cwd = path.join(home, '.claude/skills/saas-mkt-router')
  const r = spawnSync('node', ['scripts/state.mjs', 'init', 'seeded-plan', '--goal', 'g'], { cwd, env: e, encoding: 'utf8' })
  assert.equal(r.status, 0, r.stderr)
  assert.ok(fs.existsSync(path.join(home, 'artifacts/seeded-plan/state.md')), 'written to the home artifacts/, not the skill folder')
  assert.ok(!fs.existsSync(path.join(cwd, 'artifacts')), 'nothing written inside the skill folder')
  fs.rmSync(home, { recursive: true, force: true })
  fs.rmSync(tmp, { recursive: true, force: true })
})
