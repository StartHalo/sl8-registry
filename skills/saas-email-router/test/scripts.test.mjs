// Offline self-test of the router's scripts: node --test test/scripts.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const S = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'scripts')
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ser-'))
const env = { ...process.env, SL8_ARTIFACTS: path.join(tmp, 'artifacts'), SL8_TODAY: '2031-01-15' }
const run = (script, ...a) => spawnSync('node', [path.join(S, script), ...a], { env, encoding: 'utf8' })
const ok = (script, ...a) => { const r = run(script, ...a); assert.equal(r.status, 0, r.stderr + r.stdout); return r.stdout }
const C = path.join(tmp, 'artifacts', 'win-back')
const put = (rel, text) => { fs.mkdirSync(path.dirname(path.join(C, rel)), { recursive: true }); fs.writeFileSync(path.join(C, rel), text) }
const sections = (list, extra = '') => list.map((h) => `## ${h}\n\n- none\n`).join('\n') + extra
const deliverable = sections(['What was done', 'Decisions', 'Assumptions'])
const table = (head, rows) => `| ${head.join(' | ')} |\n|${head.map(() => '---').join('|')}|\n${rows.map((r) => `| ${r.join(' | ')} |`).join('\n')}\n`
const email = (n) => `## Email ${n} · Idea ${n}\n- Send: day ${n * 3}\n- Segment: cold leads\n- Subject: Subject ${n}\n- Preheader: A preheader long enough to read well in the inbox ${n}\n\n### Body\nHi {{first_name}},\n\nBody ${n}.\n\n- Primary CTA: [Book a call](https://example.test/demo)\n- Secondary CTA: none\n- Sign-off: Ana\n- P.S.: none\n`

test('context: required, before-sending, assume never fills sender or address, refuse secrets', () => {
  const r0 = JSON.parse(ok('context.mjs', 'read'))
  assert.deepEqual(r0.missing, ['company', 'website', 'what'])
  assert.deepEqual(r0.beforeSending, ['sender', 'address'])
  ok('context.mjs', 'set', 'company', 'Tallyhub', 'website', 'https://tallyhub.test', 'what', 'Team budgeting | for agencies')
  ok('context.mjs', 'assume')
  const r = JSON.parse(ok('context.mjs', 'read'))
  assert.deepEqual(r.missing, [])
  assert.deepEqual(r.beforeSending, ['sender', 'address'])
  assert.equal(r.fields.region.source, 'assumed')
  assert.equal(r.fields.what.value, 'Team budgeting | for agencies')
  assert.notEqual(run('context.mjs', 'set', 'address', '1 Fake St', '--source', 'assumed').status, 0, 'address is never assumed')
  assert.notEqual(run('context.mjs', 'set', 'voice', 'api key sk-123').status, 0)
})

test('state: init, research then storyboard, checks gate on sections and limits', () => {
  const n = JSON.parse(ok('state.mjs', 'init', 'win-back', '--goal', 'win back cold demo leads'))
  assert.deepEqual(n, { kind: 'run', skill: 'saas-email-research', steps: ['S1', 'S2'] })
  assert.notEqual(run('state.mjs', 'init', 'win-back', '--goal', 'x').status, 0, 'no second init')
  const s1 = (segs) => sections(['Goal and conversion event']) + `\n## Audience and segments\n\n${table(['Segment', 'Who'], segs)}\n` + sections(['Suppressed', 'Customer and non-fit', 'Steps to success', 'Problems', 'Copy material', 'Sources'])
  put('01-insights.md', s1([['a', '1'], ['b', '2'], ['c', '3'], ['d', '4']]) + '\nSender [TBD]\n\n## Open decisions\n\n- none\n')
  assert.equal(run('state.mjs', 'check', 'win-back', 'S1').status, 1, '4 segments and [TBD] with no decision fail')
  put('01-insights.md', s1([['cold leads', 'demo older than 30 days']]) + '\n## Open decisions\n\n- Postal address for the footer (blocks sending)\n- Is the guided trial still offered?\n')
  put('02-resources.md', '## Resources\n\n' + table(['Title', 'URL', 'Serves'], [['Case study', 'https://example.test/case', 'proof']]) + '\n' + sections(['Offers', 'Open decisions']))
  ok('state.mjs', 'check', 'win-back', 'S1-S2')
  assert.deepEqual(JSON.parse(ok('state.mjs', 'next', 'win-back')), { kind: 'run', skill: 'saas-email-storyboard', steps: ['S3', 'S4'] })
  put('03-idea-pool.md', '## Ideas\n\n' + table(['Idea', 'Synopsis', 'Purpose', 'Resource'], [1, 2, 3, 4, 5].map((i) => [`i${i}`, 's', 'p', 'r'])) + '\n' + sections(['Open decisions']))
  put('04-storyboard.md', '## Storyboard\n\n' + table(['#', 'Email', 'Purpose', 'Idea', 'Primary CTA', 'Delay', 'Segment'], [1, 2, 3].map((i) => [i, `e${i}`, 'p', 'i', 'demo', `+${i}d`, 'cold'])) + '\n' + sections(['Exit rule', 'Leftovers', 'Open decisions']) + '\n## Decisions for you\n\n- Approve the 3-email storyboard\n')
  put('deliverables/M1-campaign-plan.md', deliverable)
  assert.equal(run('state.mjs', 'check', 'win-back', 'S3-S4').status, 1, '5 ideas for 3 emails is fewer than 2×')
  put('03-idea-pool.md', '## Ideas\n\n' + table(['Idea', 'Synopsis', 'Purpose', 'Resource'], [1, 2, 3, 4, 5, 6].map((i) => [`i${i}`, 's', 'p', 'r'])) + '\n' + sections(['Open decisions']))
  ok('state.mjs', 'check', 'win-back', 'S3-S4')
  const s = JSON.parse(ok('state.mjs', 'show', 'win-back'))
  assert.deepEqual(s.milestones, ['deliverables/M1-campaign-plan.md'])
  assert.ok(s.decisions.includes('S4 · Approve the 3-email storyboard'))
  assert.ok(s.decisions.includes('S1 · Postal address for the footer (blocks sending)'))
})

test('state: copy must match the storyboard, wait and resume, reopen keeps S9 apart', () => {
  put('05-copy.md', '# Copy\n\n' + email(1) + '\n' + email(2) + '\n## Open decisions\n\n- none\n')
  assert.equal(run('state.mjs', 'check', 'win-back', 'S5').status, 1, '2 emails for a 3-row storyboard fails')
  put('05-copy.md', '# Copy\n\n' + [1, 2, 3].map(email).join('\n') + '\n## Open decisions\n\n- none\n')
  ok('state.mjs', 'check', 'win-back', 'S5')
  ok('state.mjs', 'wait', 'win-back', 'S6', '--reason', 'approve the storyboard (M1)')
  assert.equal(JSON.parse(ok('state.mjs', 'next', 'win-back')).kind, 'waiting')
  assert.deepEqual(JSON.parse(ok('state.mjs', 'resume', 'win-back')).steps, ['S6', 'S7', 'S8'])
  ok('state.mjs', 'reopen', 'win-back', 'S4', '--reason', 'drop email 3')
  let s = JSON.parse(ok('state.mjs', 'show', 'win-back'))
  assert.equal(s.steps[3].status, 'not started')
  assert.equal(s.steps[2].status, 'done')
  assert.equal(s.steps[8].status, 'when results arrive', 'S9 untouched by a reopen from S4')
  assert.ok(!s.decisions.some((d) => d.startsWith('S4')))
  ok('state.mjs', 'reopen', 'win-back', 'S9', '--reason', 'results arrived')
  s = JSON.parse(ok('state.mjs', 'show', 'win-back'))
  assert.equal(s.steps[8].status, 'not started')
  assert.equal(s.steps[3].status, 'not started', 'reopening S9 changes nothing else')
})

test('S6–S8 and S9: build, QA and pack files gate completion', () => {
  ok('state.mjs', 'check', 'win-back', 'S4-S5')
  const h = (rel) => crypto.createHash('sha1').update(fs.readFileSync(path.join(C, rel))).digest('hex')
  put('pack/build.json', JSON.stringify({ copySha: 'stale', emails: [1, 2, 3].map((n) => ({ n, html: `emails/0${n}-x.html`, text: `emails/0${n}-x.txt` })) }))
  assert.equal(run('state.mjs', 'check', 'win-back', 'S6').status, 1, 'files missing')
  for (const n of [1, 2, 3]) { put(`pack/emails/0${n}-x.html`, '<html></html>'); put(`pack/emails/0${n}-x.txt`, 'x') }
  put('pack/preview.html', '<html></html>')
  assert.equal(run('state.mjs', 'check', 'win-back', 'S6').status, 1, 'a build of older copy fails')
  put('pack/build.json', JSON.stringify({ copySha: h('05-copy.md'), emails: [1, 2, 3].map((n) => ({ n, html: `emails/0${n}-x.html`, text: `emails/0${n}-x.txt` })) }))
  ok('state.mjs', 'check', 'win-back', 'S6')
  put('pack/qa.json', JSON.stringify({ buildSha: h('pack/build.json'), failures: 2 }))
  put('07-qa.md', sections(['Script checks', 'Your tests before sending', 'Open decisions']))
  assert.equal(run('state.mjs', 'check', 'win-back', 'S7').status, 1, 'QA failures block S7')
  put('pack/qa.json', JSON.stringify({ buildSha: 'old', failures: 0 }))
  assert.equal(run('state.mjs', 'check', 'win-back', 'S7').status, 1, 'a check of an older build fails')
  put('pack/qa.json', JSON.stringify({ buildSha: h('pack/build.json'), failures: 0 }))
  ok('state.mjs', 'check', 'win-back', 'S7')
  put('pack/send-checklist.md', sections(['Before you send', 'Your tests', 'Deliverability', 'The law where you send', 'Sending'], 'You press send.\n'))
  put('pack/sequence-setup.md', '# setup\n')
  assert.equal(run('state.mjs', 'check', 'win-back', 'S8').status, 1, 'no contacts CSV, no M2')
  put('pack/contacts/contacts-template.csv', 'email,first_name,company,segment\n')
  put('deliverables/M2-campaign-pack.md', deliverable)
  ok('state.mjs', 'check', 'win-back', 'S8')
  assert.equal(JSON.parse(ok('state.mjs', 'next', 'win-back')).kind, 'run', 'S9 was reopened above')
  put('09-results-2031-01-15.md', sections(['Results against the goal', 'What to keep', 'What to change', 'Open decisions']))
  assert.equal(run('state.mjs', 'check', 'win-back', 'S9').status, 1, 'M3 missing')
  put('deliverables/M3-results-2031-01-15.md', deliverable)
  ok('state.mjs', 'check', 'win-back', 'S9')
  assert.equal(JSON.parse(ok('state.mjs', 'next', 'win-back')).kind, 'complete')
})

test('version and status: keep the pack; dashboard blockers come from the profile and blocking decisions, no repeats', () => {
  assert.equal(JSON.parse(ok('version.mjs', 'snapshot', 'win-back')).kept, 'versions/pack-v1')
  assert.ok(fs.existsSync(path.join(C, 'versions/pack-v1/pack/emails/01-x.html')))
  assert.equal(JSON.parse(ok('version.mjs', 'snapshot', 'win-back')).kept, 'versions/pack-v2', 'the next snapshot is a new version; v1 is never overwritten')
  assert.ok(fs.existsSync(path.join(C, 'versions/pack-v1/05-copy.md')))
  const before = fs.readFileSync(path.join(C, 'state.md'), 'utf8')
  ok('status.mjs', 'win-back', '--summary', 'test')
  assert.equal(fs.readFileSync(path.join(C, 'state.md'), 'utf8'), before, 'status never writes state')
  const st = fs.readFileSync(path.join(C, 'STATUS.md'), 'utf8')
  for (const h of ['Steps', 'Blockers', 'Decisions waiting on you', 'Next step', 'What changed since last time', 'Deliverables']) assert.match(st, new RegExp(`## ${h}`))
  const blockers = /## Blockers\n\n([\s\S]*?)\n\n## /.exec(st)[1]
  assert.match(blockers, /postal address is missing/i)
  assert.match(blockers, /sender/i)
  assert.equal((blockers.match(/postal address/gi) || []).length, 1, 'the address blocker appears once')
  assert.doesNotMatch(st, /State: complete[\s\S]*Blockers\n\n- none/, 'never complete with no blockers while the address is missing')
  assert.match(st, /You press send/)
  assert.match(st, /preview every email/i)
  ok('context.mjs', 'set', 'address', '9 Elm Rd, Springfield', 'sender', 'Ana Ruiz <ana@tallyhub.test>')
  fs.appendFileSync(path.join(C, '05-copy.md'), '\n')
  const copyAll = (src, dst) => fs.cpSync(src, dst, { recursive: true, preserveTimestamps: false })
  copyAll(C, C + '-copied')
  fs.rmSync(C, { recursive: true }); fs.renameSync(C + '-copied', C)
  ok('status.mjs', 'win-back')
  const st2 = fs.readFileSync(path.join(C, 'STATUS.md'), 'utf8')
  const changed2 = /## What changed since last time\n\n([\s\S]*?)\n\n## /.exec(st2)[1]
  assert.match(changed2, /05-copy\.md/)
  assert.doesNotMatch(changed2, /01-insights|07-qa/, 'a copied folder does not make every file look changed')
  assert.match(/## Blockers\n\n([\s\S]*?)\n\n## /.exec(st2)[1], /^- none$/)
})

test('input never overwrites; close needs a closing file', () => {
  const r = (...a) => spawnSync('node', [path.join(S, 'state.mjs'), ...a], { env, encoding: 'utf8', input: 'hello\n' })
  assert.equal(r('input', 'win-back', 'request').stdout.trim(), 'inputs/request-2031-01-15.md')
  assert.equal(r('input', 'win-back', 'request').stdout.trim(), 'inputs/request-2031-01-15-2.md')
  assert.notEqual(r('input', 'win-back', '../x').status, 0)
  assert.notEqual(run('state.mjs', 'close', 'win-back').status, 0)
  put('99-closing.md', '# closed\n')
  ok('state.mjs', 'close', 'win-back')
  assert.equal(JSON.parse(ok('state.mjs', 'next', 'win-back')).kind, 'closed')
  assert.notEqual(run('state.mjs', 'init', '../escape', '--goal', 'x').status, 0, 'no path escape')
  fs.rmSync(tmp, { recursive: true, force: true })
})

test('machine layout: .claude/skills/<id> links to .agents/skills/<id>; scripts find home artifacts/ from any folder', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ser-home-'))
  fs.mkdirSync(path.join(home, '.agents/skills'), { recursive: true })
  fs.mkdirSync(path.join(home, '.claude/skills'), { recursive: true })
  fs.cpSync(path.join(S, '..'), path.join(home, '.agents/skills/saas-email-router'), { recursive: true })
  fs.symlinkSync('../../.agents/skills/saas-email-router', path.join(home, '.claude/skills/saas-email-router'))
  const e = { ...process.env }; delete e.SL8_ARTIFACTS
  const cwd = path.join(home, '.claude/skills/saas-email-router')
  const r = spawnSync('node', ['scripts/state.mjs', 'init', 'seeded', '--goal', 'g'], { cwd, env: e, encoding: 'utf8' })
  assert.equal(r.status, 0, r.stderr)
  assert.ok(fs.existsSync(path.join(home, 'artifacts/seeded/state.md')), 'written to the home artifacts/, not the skill folder')
  assert.ok(!fs.existsSync(path.join(cwd, 'artifacts')), 'nothing written inside the skill folder')
  fs.rmSync(home, { recursive: true, force: true })
})
