// Offline self-test of the router's scripts: node --test test/
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const S = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'scripts')
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'amr-'))
const env = { ...process.env, SL8_ARTIFACTS: path.join(tmp, 'artifacts'), SL8_TODAY: '2031-01-15' }
const run = (script, ...a) => spawnSync('node', [path.join(S, script), ...a], { env, encoding: 'utf8' })
const ok = (script, ...a) => { const r = run(script, ...a); assert.equal(r.status, 0, r.stderr + r.stdout); return r.stdout }
const P = path.join(tmp, 'artifacts', 'demo-plan')
const put = (rel, text) => { fs.mkdirSync(path.dirname(path.join(P, rel)), { recursive: true }); fs.writeFileSync(path.join(P, rel), text) }
const sections = (list, extra = '') => list.map((h) => `## ${h}\n\n- none\n`).join('\n') + extra
const deliverable = sections(['What was done', 'Findings', 'Decisions', 'Assumptions'])

test('context: missing, then set, assume, refuse secrets', () => {
  assert.deepEqual(JSON.parse(ok('context.mjs', 'read')).missing, ['company', 'app', 'what'])
  ok('context.mjs', 'set', 'company', 'Northwind Health', 'app', 'Breathwell | https://example.test/app')
  const r = JSON.parse(ok('context.mjs', 'read'))
  assert.equal(r.fields.app.value, 'Breathwell | https://example.test/app')
  assert.deepEqual(r.missing, ['what'])
  JSON.parse(ok('context.mjs', 'assume'))
  const r2 = JSON.parse(ok('context.mjs', 'read'))
  assert.equal(r2.fields.model.source, 'assumed')
  assert.equal(r2.fields.what, undefined)
  assert.notEqual(run('context.mjs', 'set', 'preferences', 'api key sk-123').status, 0)
})

test('state: init, next groups steps by skill, check gates on sections', () => {
  const n = JSON.parse(ok('state.mjs', 'init', 'demo-plan', '--kind', 'plan', '--goal', 'grow weekly actives', '--trigger', 'quarter'))
  assert.deepEqual(n, { kind: 'run', skill: 'analysing-app-situation', steps: ['S1'] })
  assert.notEqual(run('state.mjs', 'init', 'demo-plan', '--goal', 'x').status, 0, 'no second init')
  put('01-situation.md', sections(['Key findings', 'Customers and segments', 'Competitors', 'Growth levers', 'External factors and health policy']) + '\nRetention [TBD]\n\n## Open decisions\n\n- none\n')
  assert.equal(run('state.mjs', 'check', 'demo-plan', 'S1').status, 1, '[TBD] without an open decision fails, and M1 is missing')
  put('01-situation.md', sections(['Key findings', 'Customers and segments', 'Competitors', 'Growth levers', 'External factors and health policy']) + '\nRetention [TBD]\n\n## Open decisions\n\n- D30 retention: send the console figure\n')
  put('deliverables/M1-situation.md', deliverable)
  ok('state.mjs', 'check', 'demo-plan', 'S1')
  assert.deepEqual(JSON.parse(ok('state.mjs', 'next', 'demo-plan')), { kind: 'run', skill: 'setting-app-marketing-strategy', steps: ['S2', 'S3'] })
  const s = JSON.parse(ok('state.mjs', 'show', 'demo-plan'))
  assert.deepEqual(s.milestones, ['deliverables/M1-situation.md'])
  assert.equal(s.decisions[0], 'S1 · D30 retention: send the console figure')
})

test('state: limits, wait and resume, reopen', () => {
  put('02-objectives.md', '## Objectives\n\n### O1\n### O2\n### O3\n### O4\n\n' + sections(['North-star metric', 'Open decisions']))
  assert.equal(run('state.mjs', 'check', 'demo-plan', 'S2').status, 1, 'four objectives fail')
  put('02-objectives.md', '## Objectives\n\n### O1\n### O2\n\n' + sections(['North-star metric', 'Open decisions']))
  put('03-strategy.md', sections(['Targets', 'Positioning', '3Cs check', 'The obstacle', 'Ruled out', 'Critique', 'Open decisions']) + '\n## Decisions for you\n\n- Approve the target segment\n')
  put('deliverables/M2-strategy.md', deliverable)
  ok('state.mjs', 'check', 'demo-plan', 'S2-S3')
  ok('state.mjs', 'wait', 'demo-plan', 'S4', '--reason', 'approve the strategy (M2)')
  assert.equal(JSON.parse(ok('state.mjs', 'next', 'demo-plan')).kind, 'waiting')
  assert.deepEqual(JSON.parse(ok('state.mjs', 'resume', 'demo-plan')).steps, ['S4', 'S5', 'S6'])
  ok('state.mjs', 'reopen', 'demo-plan', 'S3', '--reason', 'target changed')
  const s = JSON.parse(ok('state.mjs', 'show', 'demo-plan'))
  assert.equal(s.steps[2].status, 'not started')
  assert.equal(s.steps[1].status, 'done')
  assert.ok(!s.decisions.some((d) => d.startsWith('S3')))
})

test('version and status: keep the plan, dashboard writes only STATUS.md', () => {
  assert.equal(JSON.parse(ok('version.mjs', 'snapshot', 'demo-plan')).kept, null)
  put('marketing-plan.md', '# plan v1\n\n## Assumptions\n\n- none\n')
  assert.equal(JSON.parse(ok('version.mjs', 'snapshot', 'demo-plan')).kept, 'versions/marketing-plan-v1.md')
  const before = fs.readFileSync(path.join(P, 'state.md'), 'utf8')
  ok('status.mjs', 'demo-plan', '--summary', 'test')
  assert.equal(fs.readFileSync(path.join(P, 'state.md'), 'utf8'), before, 'status never writes state')
  const st = fs.readFileSync(path.join(P, 'STATUS.md'), 'utf8')
  for (const h of ['Steps', 'Blockers', 'Decisions waiting on you', 'Next step', 'What changed since last time', 'Deliverables']) assert.match(st, new RegExp(`## ${h}`))
  assert.match(st, /earlier: marketing-plan-v1/)
})

test('campaign: M4 at S6, close needs a closing file', () => {
  ok('state.mjs', 'init', 'launch-x', '--kind', 'campaign', '--goal', 'launch feature x', '--parent', 'demo-plan')
  assert.notEqual(run('state.mjs', 'close', 'launch-x').status, 0)
  fs.writeFileSync(path.join(tmp, 'artifacts', 'launch-x', '99-closing.md'), '# closed\n')
  ok('state.mjs', 'close', 'launch-x')
  assert.equal(JSON.parse(ok('state.mjs', 'next', 'launch-x')).kind, 'closed')
  assert.equal(JSON.parse(ok('state.mjs', 'list')).length, 2)
  assert.notEqual(run('state.mjs', 'init', '../escape', '--goal', 'x').status, 0, 'no path escape')
  execFileSync('rm', ['-rf', tmp])
})

test('input: never overwrites', () => {
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'amr-in-'))
  const e = { ...env, SL8_ARTIFACTS: path.join(t, 'artifacts') }
  const r = (...a) => spawnSync('node', [path.join(S, 'state.mjs'), ...a], { env: e, encoding: 'utf8', input: 'hello\n' })
  assert.equal(r('init', 'p1', '--goal', 'g').status, 0)
  assert.equal(r('input', 'p1', 'request').stdout.trim(), 'inputs/request-2031-01-15.md')
  assert.equal(r('input', 'p1', 'request').stdout.trim(), 'inputs/request-2031-01-15-2.md')
  assert.notEqual(r('input', 'p1', '../x').status, 0)
  fs.rmSync(t, { recursive: true, force: true })
})

test('machine layout: .claude/skills/<id> links to .agents/skills/<id>; scripts still find home artifacts/ from any folder', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'amr-home-'))
  fs.mkdirSync(path.join(home, '.agents/skills'), { recursive: true })
  fs.mkdirSync(path.join(home, '.claude/skills'), { recursive: true })
  fs.cpSync(path.join(S, '..'), path.join(home, '.agents/skills/app-marketing-router'), { recursive: true })
  fs.symlinkSync('../../.agents/skills/app-marketing-router', path.join(home, '.claude/skills/app-marketing-router'))
  fs.mkdirSync(path.join(home, 'artifacts/seeded-plan'), { recursive: true })
  const e = { ...process.env }; delete e.SL8_ARTIFACTS
  const cwd = path.join(home, '.claude/skills/app-marketing-router')
  const r = spawnSync('node', ['scripts/state.mjs', 'init', 'seeded-plan-2', '--goal', 'g'], { cwd, env: e, encoding: 'utf8' })
  assert.equal(r.status, 0, r.stderr)
  assert.ok(fs.existsSync(path.join(home, 'artifacts/seeded-plan-2/state.md')), 'written to the home artifacts/, not the skill folder')
  assert.ok(!fs.existsSync(path.join(cwd, 'artifacts')), 'nothing written inside the skill folder')
  fs.rmSync(home, { recursive: true, force: true })
})
