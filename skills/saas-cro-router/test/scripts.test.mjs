// Offline self-test of the router's scripts: node --test test/scripts.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const S = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'scripts')
const SKILLS = path.join(S, '..', '..')
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cro-'))
const env = { ...process.env, SL8_ARTIFACTS: path.join(tmp, 'artifacts'), SL8_TODAY: '2031-01-15' }
const run = (script, ...a) => spawnSync('node', [path.join(S, script), ...a], { env, encoding: 'utf8' })
const ok = (script, ...a) => { const r = run(script, ...a); assert.equal(r.status, 0, r.stderr + r.stdout); return r.stdout }
const P = path.join(tmp, 'artifacts', 'demo-review')
const put = (rel, text) => { fs.mkdirSync(path.dirname(path.join(P, rel)), { recursive: true }); fs.writeFileSync(path.join(P, rel), text) }
const sec = (list) => list.map((h) => `## ${h}\n\n- none\n`).join('\n')
const deliverable = (list) => `# D\n\n${sec(list)}`
const HEAD = 'id,issue,bucket,location,evidence,action,stars,effort,owner,how_we_know,status'
const row = (id, bucket, stars) => `${id},"Issue ${id}, with a comma",${bucket},/pricing,"""Contact us"" quoted",Do it,${stars},small,founder,demo requests per 100 visits,proposed`

test('context: url required, site fields, assume, refuse secrets', () => {
  const r0 = JSON.parse(ok('context.mjs', 'read'))
  assert.deepEqual(r0.missing, ['url'])
  assert.notEqual(run('context.mjs', 'set', 'url', 'example.test').status, 0, 'url needs a scheme')
  ok('context.mjs', 'set', 'url', 'https://example.test', 'product', 'Ledgerly | invoicing for agencies', '--source', 'site')
  const r = JSON.parse(ok('context.mjs', 'read'))
  assert.equal(r.fields.product.value, 'Ledgerly | invoicing for agencies')
  assert.deepEqual(r.missing, [])
  assert.deepEqual(r.fromSite, ['buyers', 'path'])
  const a = JSON.parse(ok('context.mjs', 'assume'))
  assert.deepEqual(a.changed, ['price', 'traffic', 'tools', 'time'])
  assert.equal(JSON.parse(ok('context.mjs', 'read')).fields.traffic.source, 'assumed')
  assert.notEqual(run('context.mjs', 'set', 'tools', 'GA4 api key abc').status, 0)
})

test('state: init, S11 out of scope, next groups by skill, S1 and S3 checks', () => {
  const n = JSON.parse(ok('state.mjs', 'init', 'demo-review', '--goal', 'more demo requests'))
  assert.deepEqual(n, { kind: 'run', skill: 'saas-cro-framing-funnel', steps: ['S1'] })
  const s = JSON.parse(ok('state.mjs', 'show', 'demo-review'))
  assert.equal(s.steps.find((x) => x.id === 'S11').status, 'not in scope')
  put('01-goals-funnel.md', sec(['Paths and conversions', 'KPIs and baselines', 'Competitors', 'Assumptions', 'Open decisions']) + '\n## Key pages\n\n### Home\nno link\n')
  assert.equal(run('state.mjs', 'check', 'demo-review', 'S1').status, 1, 'a key page needs a URL')
  put('01-goals-funnel.md', sec(['Paths and conversions', 'KPIs and baselines', 'Competitors', 'Assumptions']) + '\n## Key pages\n\n### Home\nhttps://example.test/\n\n## Open decisions\n\n- Monthly demo requests not known (blocks S11)\n')
  ok('state.mjs', 'check', 'demo-review', 'S1')
  assert.deepEqual(JSON.parse(ok('state.mjs', 'next', 'demo-review')), { kind: 'run', skill: 'saas-cro-reviewing-pages', steps: ['S2', 'S3'] })
  put('02-technical.md', sec(['Checked', 'Issues', 'Not checked', 'Open decisions']))
  put('03-heuristic.md', sec(['Inventory', 'Considered but rejected', 'Not verified', 'Open decisions']) + '\n## Findings\n\n### F1 Vague headline\n- Lens: clarity\n')
  assert.equal(run('state.mjs', 'check', 'demo-review', 'S2-S3').status, 1, 'a finding needs Evidence:')
  put('03-heuristic.md', sec(['Inventory', 'Considered but rejected', 'Not verified', 'Open decisions']) + '\n## Findings\n\n### F1 Vague headline\n- **Lens:** clarity\n- **Evidence:** "Do more" [pages/home.md]\n')
  ok('state.mjs', 'check', 'demo-review', 'S2-S3')
})

test('state: S5–S8 share a file and need a kit item when evidence is missing; research kit at S8', () => {
  put('04-analytics.md', sec(['Data received', 'Health check', 'Leaks', 'Instrument items', 'Open decisions']))
  put('05-research.md', '## S5 Mouse tracking and session replays\n\nnot available: no recordings\n\n## S6 Qualitative surveys and interviews\n\nnot available, see K1\n\n## S7 User testing\n\nnot available, K2\n\n## S8 Copy testing\n\nnot available, K3\n\n## Open decisions\n\n- Monthly demo requests not known (blocks S11)\n')
  put('deliverables/research-kit.md', deliverable(['What to send back', 'Assumptions']) + '\n## What to run\n\n### K1\n### K2\n### K3\n')
  const r = run('state.mjs', 'check', 'demo-review', 'S4-S8')
  assert.equal(r.status, 1)
  assert.match(r.stdout, /S5 Mouse tracking.*names no kit item/)
  put('05-research.md', fs.readFileSync(path.join(P, '05-research.md'), 'utf8').replace('no recordings', 'no recordings; K4 installs free recording'))
  ok('state.mjs', 'check', 'demo-review', 'S4-S8')
  const s = JSON.parse(ok('state.mjs', 'show', 'demo-review'))
  assert.equal(s.decisions.filter((d) => /demo requests not known/.test(d)).length, 1, 'a decision repeated across steps is kept once')
  assert.ok(s.milestones.includes('deliverables/research-kit.md'))
})

test('state: S9 action sheet rules, S10 hypotheses', () => {
  put('09-action-sheet.md', sec(['Action sheet', 'Open decisions']) + '\n## Change first\n\n1. [A1] Cut the form to 4 fields\n2. [A9] Missing id\n')
  put('action-sheet.csv', [HEAD, ...[1, 2, 3, 4, 5, 6, 7, 8].map((i) => row(`A${i}`, i % 2 ? 'Just Do It' : 'Test', 3))].join('\n') + '\n')
  put('deliverables/M1-conversion-review.md', deliverable(['What was done', 'Change first', 'Findings', 'What this review could not see', 'Decisions', 'Assumptions']))
  const r = run('state.mjs', 'check', 'demo-review', 'S9')
  assert.equal(r.status, 1)
  assert.match(r.stdout, /stars are flattened/)
  assert.match(r.stdout, /A9, which is not in action-sheet.csv/)
  put('action-sheet.csv', [HEAD, ...[1, 2, 3, 4, 5, 6, 7, 8].map((i) => row(`A${i}`, i % 2 ? 'Just Do It' : 'Test', (i % 3) + 2))].join('\n') + '\n')
  put('09-action-sheet.md', sec(['Action sheet', 'Open decisions']) + '\n## Change first\n\n1. [A1] Cut the form to 4 fields\n2. [A3] One call to action\n')
  ok('state.mjs', 'check', 'demo-review', 'S9')
  put('10-hypotheses.md', sec(['Measurement plan', 'Open decisions']) + '\n## Hypotheses\n\n### H1\nWe believe that doing X for Y will make Z happen.\n')
  assert.equal(run('state.mjs', 'check', 'demo-review', 'S10').status, 1, "needs We'll know and Route")
  put('10-hypotheses.md', sec(['Measurement plan', 'Open decisions']) + "\n## Hypotheses\n\n### H1\nWe believe that doing X for Y will make Z happen. We'll know this when we see D and feedback E.\n- Route: ship and instrument\n")
  put('deliverables/M2-test-plan.md', deliverable(['What was done', 'How each change will be judged', 'Decisions', 'Assumptions']))
  ok('state.mjs', 'check', 'demo-review', 'S10')
  assert.equal(JSON.parse(ok('state.mjs', 'next', 'demo-review')).kind, 'complete')
})

test('dashboard: blockers from blocking decisions, change-first with status; status writes only STATUS.md', () => {
  const before = fs.readFileSync(path.join(P, 'state.md'), 'utf8')
  ok('status.mjs', 'demo-review', '--summary', 'first review')
  assert.equal(fs.readFileSync(path.join(P, 'state.md'), 'utf8'), before, 'status never writes state')
  const st = fs.readFileSync(path.join(P, 'STATUS.md'), 'utf8')
  for (const h of ['Steps', 'Blockers', 'Decisions waiting on you', 'Change first', 'Next step', 'What changed since last time', 'Deliverables']) assert.match(st, new RegExp(`## ${h}`))
  assert.match(st, /## Blockers\n\n- S1 · Monthly demo requests not known \(blocks S11\)/)
  assert.match(st, /continue demo-review" with your answer to: Monthly demo requests/)
  assert.match(st, /1\. \[A1\] Cut the form to 4 fields · \*\*proposed\*\*/)
  assert.match(st, /M1 Conversion review/)
  assert.doesNotMatch(st, /channel/i)
  ok('state.mjs', 'decide', 'demo-review', 'demo requests not known')
  ok('status.mjs', 'demo-review')
  assert.match(fs.readFileSync(path.join(P, 'STATUS.md'), 'utf8'), /when you have results/)
})

test('resume with evidence: snapshot keeps v1, reopen reruns only touched steps then ranking, changed sections named', () => {
  const kept = JSON.parse(ok('version.mjs', 'snapshot', 'demo-review'))
  assert.ok(kept.kept.includes('versions/action-sheet-v1.csv'))
  assert.ok(kept.kept.includes('versions/M1-conversion-review-v1.md'))
  assert.equal(kept.sheetVersion, 2)
  const st = JSON.parse(ok('state.mjs', 'show', 'demo-review'))
  st.sheetVersion = 1 // force a clash with the kept v1 files
  const file = path.join(P, 'state.md'); const text = fs.readFileSync(file, 'utf8')
  fs.writeFileSync(file, text.replace(/```json\n[\s\S]*\n```\s*$/, '```json\n' + JSON.stringify(st, null, 2) + '\n```\n'))
  assert.notEqual(run('version.mjs', 'snapshot', 'demo-review').status, 0, 'never overwrites an earlier version')
  st.sheetVersion = 2
  fs.writeFileSync(file, text)
})

test('reopen, results, redo', () => {
  const n = JSON.parse(ok('state.mjs', 'reopen', 'demo-review', 'S6', '--reason', '5 customer calls'))
  assert.deepEqual(n, { kind: 'run', skill: 'saas-cro-reading-evidence', steps: ['S6'] })
  const s = JSON.parse(ok('state.mjs', 'show', 'demo-review'))
  assert.deepEqual(s.steps.filter((x) => x.status === 'not started').map((x) => x.id), ['S6', 'S9', 'S10'])
  put('05-research.md', fs.readFileSync(path.join(P, '05-research.md'), 'utf8').replace('not available, see K1', 'Three of five customers feared setup time [inputs/evidence-2031-01-15.md] (High)'))
  ok('state.mjs', 'check', 'demo-review', 'S6')
  const h = JSON.parse(ok('state.mjs', 'show', 'demo-review')).history.join('\n')
  assert.match(h, /changed 05-research\.md: S6 Qualitative surveys and interviews/)
  ok('state.mjs', 'check', 'demo-review', 'S9-S10')
  const r = JSON.parse(ok('state.mjs', 'results', 'demo-review'))
  assert.equal(r.file, '11-results-v1.md')
  assert.deepEqual(r.next, { kind: 'run', skill: 'saas-cro-reading-results', steps: ['S11'] }, 'results are read before re-ranking')
  put('11-results-v1.md', sec(['Results', 'Caveats', 'Open decisions']) + '\n## Verdicts\n\n- A1 keep\n')
  put('deliverables/M3-results-v1.md', deliverable(['What was done', 'Verdicts', 'Decisions', 'Assumptions']))
  assert.equal(run('state.mjs', 'check', 'demo-review', 'S11').status, 1, 'verdicts must be labelled indicative')
  put('11-results-v1.md', sec(['Results', 'Caveats', 'Open decisions']) + '\n## Verdicts\n\n- A1 keep (indicative)\n')
  ok('state.mjs', 'check', 'demo-review', 'S11')
  assert.deepEqual(JSON.parse(ok('state.mjs', 'next', 'demo-review')).steps, ['S9', 'S10'])
  const d = JSON.parse(ok('state.mjs', 'redo', 'demo-review', '--from', 'S3', '--reason', 'new pricing page'))
  assert.equal(d.steps[0], 'S3')
  const s2 = JSON.parse(ok('state.mjs', 'show', 'demo-review'))
  assert.equal(s2.steps.find((x) => x.id === 'S11').status, 'done', 'redo never touches results already read')
})

test('test job and close', () => {
  ok('state.mjs', 'init', 'test-show-prices', '--kind', 'test', '--goal', 'show prices instead of contact us')
  const T = path.join(tmp, 'artifacts', 'test-show-prices')
  fs.writeFileSync(path.join(T, 'tests', 'show-prices.md'), sec(['The change', 'The arithmetic', 'Route', 'Measures', 'Decision rule', 'What to send back']) + '\n## Hypothesis\n\nWe believe that doing X …\n')
  ok('state.mjs', 'test', 'test-show-prices', 'show-prices')
  assert.equal(JSON.parse(ok('state.mjs', 'next', 'test-show-prices')).kind, 'complete')
  assert.notEqual(run('state.mjs', 'close', 'test-show-prices').status, 0, 'close needs a closing summary')
  fs.writeFileSync(path.join(T, 'deliverables', 'closing-summary.md'), deliverable(['What was recommended', 'What was shipped', 'Results supplied', 'Still open']))
  ok('state.mjs', 'close', 'test-show-prices')
  assert.equal(JSON.parse(ok('state.mjs', 'next', 'test-show-prices')).kind, 'closed')
  assert.notEqual(run('state.mjs', 'init', '../escape', '--goal', 'x').status, 0, 'no path escape')
})

test('input: never overwrites', () => {
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'cro-in-'))
  const e = { ...env, SL8_ARTIFACTS: path.join(t, 'artifacts') }
  const r = (...a) => spawnSync('node', [path.join(S, 'state.mjs'), ...a], { env: e, encoding: 'utf8', input: 'hello\n' })
  assert.equal(r('init', 'p1', '--goal', 'g').status, 0)
  assert.equal(r('input', 'p1', 'request').stdout.trim(), 'inputs/request-2031-01-15.md')
  assert.equal(r('input', 'p1', 'request').stdout.trim(), 'inputs/request-2031-01-15-2.md')
  assert.notEqual(r('input', 'p1', '../x').status, 0)
  fs.rmSync(t, { recursive: true, force: true })
})

test('stats.mjs: the three copies are identical, and the arithmetic matches known values', () => {
  const copies = ['saas-cro-ranking-changes', 'saas-cro-reading-results', 'saas-cro-designing-test'].map((d) => path.join(SKILLS, d, 'scripts', 'stats.mjs')).filter((f) => fs.existsSync(f))
  if (copies.length < 3) return // installed alone on the machine: nothing to compare
  const texts = copies.map((f) => fs.readFileSync(f, 'utf8'))
  assert.ok(texts.every((t) => t === texts[0]), 'stats.mjs copies differ: copy the ranking skill\'s version to the other two')
  const st = (...a) => JSON.parse(spawnSync('node', [copies[0], ...a], { encoding: 'utf8' }).stdout)
  assert.equal(st('size', '--baseline', '3%', '--lift', '10%').visitorsPerArm, 53211)
  assert.equal(st('tier', '--conversions', '10').tier, 'low')
  assert.equal(st('tier', '--conversions', '900').tier, 'medium')
  assert.equal(st('tier').known, false)
  const c = st('compare', '--before', '9/1100', '--after', '15/1200')
  assert.equal(c.z, 1.018)
  assert.equal(c.label, 'indicative, not proof')
})

test('machine layout: .claude/skills/<id> links to .agents/skills/<id>; scripts still find home artifacts/ from any folder', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'cro-home-'))
  fs.mkdirSync(path.join(home, '.agents/skills'), { recursive: true })
  fs.mkdirSync(path.join(home, '.claude/skills'), { recursive: true })
  fs.cpSync(path.join(S, '..'), path.join(home, '.agents/skills/saas-cro-router'), { recursive: true })
  fs.symlinkSync('../../.agents/skills/saas-cro-router', path.join(home, '.claude/skills/saas-cro-router'))
  const e = { ...process.env }; delete e.SL8_ARTIFACTS
  const cwd = path.join(home, '.claude/skills/saas-cro-router')
  const r = spawnSync('node', ['scripts/state.mjs', 'init', 'seeded-review', '--goal', 'g'], { cwd, env: e, encoding: 'utf8' })
  // Run through the link, as the agent does: a script must still know it is the main module.
  const c = spawnSync('node', [path.join(home, '.claude/skills/saas-cro-router/scripts/context.mjs'), 'read'], { cwd: home, env: e, encoding: 'utf8' })
  assert.match(c.stdout, /"missing"/, 'context.mjs prints when run through the .claude/skills link')
  const statsDir = path.join(SKILLS, 'saas-cro-ranking-changes', 'scripts')
  if (fs.existsSync(statsDir)) {
    fs.cpSync(statsDir, path.join(home, '.agents/skills/saas-cro-ranking-changes/scripts'), { recursive: true })
    fs.symlinkSync('../../.agents/skills/saas-cro-ranking-changes', path.join(home, '.claude/skills/saas-cro-ranking-changes'))
    const t = spawnSync('node', [path.join(home, '.claude/skills/saas-cro-ranking-changes/scripts/stats.mjs'), 'tier'], { cwd: home, encoding: 'utf8' })
    assert.match(t.stdout, /"tier"/, 'stats.mjs prints when run through the .claude/skills link')
  }
  assert.equal(r.status, 0, r.stderr)
  assert.ok(fs.existsSync(path.join(home, 'artifacts/seeded-review/state.md')), 'written to the home artifacts/, not the skill folder')
  assert.ok(!fs.existsSync(path.join(cwd, 'artifacts')), 'nothing written inside the skill folder')
  fs.rmSync(home, { recursive: true, force: true })
  fs.rmSync(tmp, { recursive: true, force: true })
})
