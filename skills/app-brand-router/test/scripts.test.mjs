// Offline self-test of the router's scripts: node --test test/scripts.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const S = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'scripts')
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'abr-'))
const env = { ...process.env, SL8_ARTIFACTS: path.join(tmp, 'artifacts'), SL8_TODAY: '2031-01-15' }
const run = (script, ...a) => spawnSync('node', [path.join(S, script), ...a], { env, encoding: 'utf8' })
const ok = (script, ...a) => { const r = run(script, ...a); assert.equal(r.status, 0, r.stderr + r.stdout); return r.stdout }
const P = path.join(tmp, 'artifacts', 'demo-brand')
const put = (rel, text) => { fs.mkdirSync(path.dirname(path.join(P, rel)), { recursive: true }); fs.writeFileSync(path.join(P, rel), text) }
const read = (rel) => fs.readFileSync(path.join(P, rel), 'utf8')
const secs = (list) => list.map((h) => `## ${h}\n\n- none\n`).join('\n')
const deliverable = secs(['What was done', 'Findings', 'Decisions', 'Assumptions'])
const S1 = (extra = '') => secs(['Key findings', 'The problem', 'Touchpoint audit']) + '\n## Competitors\n\n### Quietly\n### Restwise\n\n' + secs(['Review themes', 'Category clichés', 'Verbal audit']) + extra
const S2 = (decision = '- none') => secs(['Focus', 'Audience', 'Positioning', 'Onliness statement', 'Onliness check', 'Brand vision', 'Promise', 'We will not', 'Health-claims limits']) + `\n## Decisions for you\n\n- Approve the positioning (proposed: approve or change)\n\n## Open decisions\n\n${decision}\n`
const S3 = secs(['Personality']) + '\n## Voice\n\n### Calm, not sleepy\n### Clear, not clinical\n### Warm, not cute\n\n' + secs(['Tone by context', 'Messages', 'Look and feel']) + '\n## Palette\n\n- Ink #1F2A44\n\n' + secs(['Type', 'Imagery and icons']) + '\n## Distinctive assets\n\n- the half-moon\n- ink blue\n- the pause line\n\n' + secs(['Trial applications', 'Open decisions'])
const S4 = (subtitle) => `## Store listing\n\n| Field | Proposed text |\n|---|---|\n| App name | Breathwell |\n| Subtitle | ${subtitle} |\n\n` + secs(['Onboarding', 'Social', 'Email', 'Health-claims check', 'Open decisions'])
const S5 = secs(['Owner and home', "Do and don't", 'Templates', 'Consistency checklist', 'Review cadence and triggers', 'Open decisions'])

test('context: same eight fields as the marketing bot; missing, set, assume, refuse secrets', () => {
  assert.deepEqual(JSON.parse(ok('context.mjs', 'read')).missing, ['company', 'app', 'what'])
  ok('context.mjs', 'set', 'company', 'Northwind Health', 'app', 'Breathwell | https://example.test/app')
  assert.deepEqual(JSON.parse(ok('context.mjs', 'read')).missing, ['what'])
  ok('context.mjs', 'assume')
  const r = JSON.parse(ok('context.mjs', 'read'))
  assert.equal(r.fields.health.source, 'assumed')
  assert.equal(r.fields.what, undefined)
  assert.notEqual(run('context.mjs', 'set', 'preferences', 'api key sk-123').status, 0)
})

test('context: reads a profile the marketing bot wrote, asks for nothing it holds', () => {
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'abr-ctx-'))
  fs.mkdirSync(path.join(t, 'artifacts'))
  fs.writeFileSync(path.join(t, 'artifacts', 'context.md'), `# Company profile\n\n| Field | Value | Source | Updated |\n|---|---|---|---|\n| Company name | Northwind Health | you | 2031-01-01 |\n| App name and store link(s) | Breathwell | you | 2031-01-01 |\n| What the app does | guided breathing | store listing | 2031-01-01 |\n| Business model | — |  |  |\n| Platforms | — |  |  |\n| Health-feature category | — |  |  |\n| Markets and languages | — |  |  |\n| Preferences | plain and direct tone; 90-day plan horizon; no leadership summary | assumed | 2031-01-01 |\n`)
  const r = spawnSync('node', [path.join(S, 'context.mjs'), 'read'], { env: { ...env, SL8_ARTIFACTS: path.join(t, 'artifacts') }, encoding: 'utf8' })
  assert.deepEqual(JSON.parse(r.stdout).missing, [])
  fs.rmSync(t, { recursive: true, force: true })
})

test('state: init with touchpoints; work types are refused as touchpoints (№96)', () => {
  assert.notEqual(run('state.mjs', 'init', 'bad-tp', '--goal', 'g', '--touchpoints', 'store listing, analytics').status, 0)
  const n = JSON.parse(ok('state.mjs', 'init', 'demo-brand', '--goal', 'a brand we can use', '--trigger', 'relaunch'))
  assert.deepEqual(n, { kind: 'run', skill: 'app-brand-research', steps: ['S1'] })
  assert.deepEqual(JSON.parse(ok('state.mjs', 'show', 'demo-brand')).touchpoints, ['store listing', 'onboarding', 'social', 'email'])
})

test('state: S1 and S2 gate on headings, [TBD], limits and milestones', () => {
  put('01-research.md', S1('\nInstalls [TBD]\n\n## Open decisions\n\n- none\n'))
  assert.equal(run('state.mjs', 'check', 'demo-brand', 'S1').status, 1, '[TBD] with no open decision fails; M1 missing')
  put('01-research.md', S1('\nInstalls [TBD]\n\n## Open decisions\n\n- Monthly installs: send the console figure\n'))
  put('deliverables/M1-findings.md', deliverable)
  ok('state.mjs', 'check', 'demo-brand', 'S1')
  put('02-brand-brief.md', S2('- [blocking] Is the app a regulated medical device?'))
  put('deliverables/M2-brand-brief.md', deliverable)
  ok('state.mjs', 'check', 'demo-brand', 'S2')
  const s = JSON.parse(ok('state.mjs', 'show', 'demo-brand'))
  assert.deepEqual(s.milestones, ['deliverables/M1-findings.md', 'deliverables/M2-brand-brief.md'])
  assert.ok(s.decisions.includes('S2 · [blocking] Is the app a regulated medical device?'))
})

test('state: S3 voice and asset limits, S4 store field limits', () => {
  put('03-identity.md', S3.replace('### Warm, not cute\n', ''))
  assert.match(run('state.mjs', 'check', 'demo-brand', 'S3').stdout, /2 voice attributes/)
  put('03-identity.md', S3)
  ok('state.mjs', 'check', 'demo-brand', 'S3')
  put('04-touchpoints.md', S4('Breathe out the day, one calm minute at a time'))
  assert.match(run('state.mjs', 'check', 'demo-brand', 'S4').stdout, /Subtitle" is \d+ characters \(limit 30\)/)
  put('04-touchpoints.md', S4('One calm minute at a time'))
  ok('state.mjs', 'check', 'demo-brand', 'S4')
})

test('state: S5 needs the brand book with tokens; status shows blocking decisions (№91, №92)', () => {
  put('05-guidelines.md', S5)
  put('deliverables/M3-brand-book.md', deliverable)
  put('brand-book.md', '# Brand book\n\n## Assumptions\n\n- none\n')
  assert.match(run('state.mjs', 'check', 'demo-brand', 'S5').stdout, /brand-book\.md has no "## Tokens"/)
  put('brand-book.md', '# Brand book\n\n## Assumptions\n\n- none\n\n## Tokens\n\n- ink #1F2A44\n')
  ok('state.mjs', 'check', 'demo-brand', 'S5')
  assert.equal(JSON.parse(ok('state.mjs', 'next', 'demo-brand')).kind, 'complete')
  ok('status.mjs', 'demo-brand', '--summary', 'built the brand')
  const st = read('STATUS.md')
  assert.match(st, /State:\*\* complete, with decisions waiting on you/)
  assert.match(st, /## Blockers\n\n- S2: Is the app a regulated medical device\?/)
  assert.doesNotMatch(st.split('## Decisions waiting on you')[1].split('## Next step')[0], /regulated medical device/, 'a blocking decision is shown once, as a blocker')
  assert.match(st, /continue demo-brand" with your answers to the blocking decisions/)
  assert.doesNotMatch(st, /send[^\n]*\bupdate\b/i, 'no "update" mode is offered')
  assert.doesNotMatch(st, /check failed/, 'internal checks never reach the dashboard (№94)')
})

test('state: reopen keeps the old file; "What changed" must name every changed section (№93)', () => {
  const before = read('01-research.md')
  ok('version.mjs', 'snapshot', 'demo-brand')
  assert.ok(fs.existsSync(path.join(P, 'versions/brand-book-v1.md')))
  ok('state.mjs', 'reopen', 'demo-brand', 'S2', '--reason', 'speak to new parents first')
  const s = JSON.parse(ok('state.mjs', 'show', 'demo-brand'))
  assert.equal(s.steps[0].status, 'done')
  assert.equal(s.steps[1].status, 'not started')
  assert.ok(fs.existsSync(path.join(P, s.prev.S2)), 'the old brief is kept')
  put('02-brand-brief.md', S2().replace('## Promise\n\n- none', '## Promise\n\n- Your data stays yours').replace('## Positioning\n\n- none', '## Positioning\n\n- privacy first') + '\n## What changed\n\n- Positioning now leads with privacy\n')
  assert.match(run('state.mjs', 'check', 'demo-brand', 'S2').stdout, /doesn't name these changed sections: promise/)
  put('02-brand-brief.md', S2().replace('## Promise\n\n- none', '## Promise\n\n- Your data stays yours').replace('## Positioning\n\n- none', '## Positioning\n\n- privacy first') + '\n## What changed\n\n- Positioning now leads with privacy; the Promise follows it\n')
  ok('state.mjs', 'check', 'demo-brand', 'S2')
  assert.equal(read('01-research.md'), before, 'S1 untouched')
  assert.equal(JSON.parse(ok('state.mjs', 'show', 'demo-brand')).prev.S2, undefined)
})

test('piece and review: checked and recorded; brand files unchanged', () => {
  const book = read('brand-book.md')
  put('touchpoints/onboarding.md', secs(['Copy', 'Layout notes', 'Voice and messages used', 'Health-claims check']) + '\n## Open decisions\n\n- Confirm the screen count\n')
  ok('state.mjs', 'piece', 'demo-brand', 'onboarding')
  put('touchpoints/listing.md', S4('One calm minute at a time, every single day').replace('## Onboarding', '## Copy').replace('## Social', '## Layout notes').replace('## Email', '## Voice and messages used'))
  assert.equal(run('state.mjs', 'piece', 'demo-brand', 'listing').status, 1, 'a piece with an over-long store field fails')
  assert.equal(run('state.mjs', 'review', 'demo-brand').status, 1)
  put('reviews/2031-01-15.md', secs(['Summary', 'Findings', 'Swap, hand and focus tests', 'Fix first', 'Open decisions']))
  put('deliverables/M4-review-2031-01-15.md', deliverable)
  ok('state.mjs', 'review', 'demo-brand')
  const s = JSON.parse(ok('state.mjs', 'show', 'demo-brand'))
  assert.ok(s.milestones.includes('touchpoints/onboarding.md') && s.milestones.includes('deliverables/M4-review-2031-01-15.md'))
  assert.ok(s.decisions.includes('P · onboarding: Confirm the screen count'))
  assert.equal(read('brand-book.md'), book)
})

test('status writes only STATUS.md; close needs a closing file; inputs never overwrite', () => {
  const before = read('state.md')
  ok('status.mjs', 'demo-brand')
  assert.equal(read('state.md'), before)
  assert.notEqual(run('state.mjs', 'close', 'demo-brand').status, 0)
  put('99-closing.md', '# closed\n')
  ok('state.mjs', 'close', 'demo-brand')
  assert.equal(JSON.parse(ok('state.mjs', 'next', 'demo-brand')).kind, 'closed')
  const r = (...a) => spawnSync('node', [path.join(S, 'state.mjs'), ...a], { env, encoding: 'utf8', input: 'hello\n' })
  assert.equal(r('input', 'demo-brand', 'request').stdout.trim(), 'inputs/request-2031-01-15.md')
  assert.equal(r('input', 'demo-brand', 'request').stdout.trim(), 'inputs/request-2031-01-15-2.md')
  assert.notEqual(r('input', 'demo-brand', '../x').status, 0)
  assert.notEqual(run('state.mjs', 'init', '../escape', '--goal', 'x').status, 0, 'no path escape')
})

test('machine layout: .claude/skills/<id> links to .agents/skills/<id>; scripts still find home artifacts/', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'abr-home-'))
  fs.mkdirSync(path.join(home, '.agents/skills'), { recursive: true })
  fs.mkdirSync(path.join(home, '.claude/skills'), { recursive: true })
  fs.cpSync(path.join(S, '..'), path.join(home, '.agents/skills/app-brand-router'), { recursive: true })
  fs.symlinkSync('../../.agents/skills/app-brand-router', path.join(home, '.claude/skills/app-brand-router'))
  const e = { ...process.env }; delete e.SL8_ARTIFACTS
  const cwd = path.join(home, '.claude/skills/app-brand-router')
  const r = spawnSync('node', ['scripts/state.mjs', 'init', 'brand-x', '--goal', 'g'], { cwd, env: e, encoding: 'utf8' })
  assert.equal(r.status, 0, r.stderr)
  assert.ok(fs.existsSync(path.join(home, 'artifacts/brand-x/state.md')), 'written to the home artifacts/')
  assert.ok(!fs.existsSync(path.join(cwd, 'artifacts')), 'nothing inside the skill folder')
  fs.rmSync(home, { recursive: true, force: true })
  fs.rmSync(tmp, { recursive: true, force: true })
})
