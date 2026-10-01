// Offline self-test of the build scripts: node --test test/scripts.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const S = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'scripts')
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'seb-'))
const A = path.join(tmp, 'artifacts')
const env = { ...process.env, SL8_ARTIFACTS: A }
const run = (script, ...a) => spawnSync('node', [path.join(S, script), ...a], { env, encoding: 'utf8' })
const C = path.join(A, 'spring-push')
const put = (rel, text) => { fs.mkdirSync(path.dirname(path.join(A, rel)), { recursive: true }); fs.writeFileSync(path.join(A, rel), text) }
const profile = (rows) => `# Company profile\n\n| Field | Value | Source | Updated |\n|---|---|---|---|\n${Object.entries(rows).map(([k, v]) => `| ${k} | ${v} | you | 2031-01-15 |`).join('\n')}\n`
const email = (n, over = {}) => {
  const f = { Send: `day ${n * 2}`, Segment: 'trial users', Subject: `Your week ${n} on the board`, Preheader: 'Two minutes to see what changed for teams like yours this week.', 'Primary CTA': '[Open your board](https://tallyhub.test/app)', 'Secondary CTA': 'none', 'Sign-off': 'Ana / Founder, Tallyhub', 'P.S.': 'none', ...over }
  return `## Email ${n} · Week ${n}\n${['Send', 'Segment', 'Subject', 'Preheader'].map((k) => `- ${k}: ${f[k]}`).join('\n')}\n\n### Body\n${over.body || `Hi {{first_name}},\n\nMost teams set a budget once and **never look again**. Here's [the 3-step guide](https://tallyhub.test/guide).\n\n- Set a limit\n- Get a nudge`}\n\n${['Primary CTA', 'Secondary CTA', 'Sign-off', 'P.S.'].map((k) => `- ${k}: ${f[k]}`).join('\n')}\n`
}

test('build: HTML and text per email, UTMs on own-site links only, footer, preview, build.json', () => {
  put('context.md', profile({ 'Company and product name': 'Tallyhub', Website: 'https://tallyhub.test', 'Brand: logo URL and colour': 'logo: https://cdn.tallyhub.test/logo.png · colour: #7a3cff' }))
  put('spring-push/05-copy.md', `# S5 Copy\n\n${email(1)}\n${email(2, { 'Secondary CTA': '[Read the docs](https://docs.other.test/x)', 'P.S.': 'Reply and tell me what you track.' })}\n## Open decisions\n\n- none\n`)
  const r = run('build.mjs', 'spring-push')
  assert.equal(r.status, 0, r.stderr)
  const out = JSON.parse(r.stdout)
  assert.equal(out.built, 2)
  assert.deepEqual(out.blocksSending, ['sender', 'postal address'])
  const html = fs.readFileSync(path.join(C, 'pack/emails/02-week-2.html'), 'utf8')
  assert.match(html, /<html lang="en"/)
  assert.match(html, /tallyhub\.test\/app\?utm_source=email&amp;utm_medium=email&amp;utm_campaign=spring-push&amp;utm_content=email-02/)
  assert.match(html, /href="https:\/\/docs\.other\.test\/x"/, 'third-party links untouched')
  assert.match(html, /<img src="https:\/\/cdn\.tallyhub\.test\/logo\.png" alt="Tallyhub"/)
  assert.match(html, /bgcolor="#7a3cff"/, 'brand colour on the button')
  assert.match(html, /\[TBD\] postal address/)
  assert.match(html, /\{\{unsubscribe_url\}\}/)
  assert.match(html, /<strong>never look again<\/strong>/)
  assert.ok(html.indexOf('Open your board') < html.indexOf('Ana<br>Founder, Tallyhub'), 'sign-off after the button')
  assert.ok(html.indexOf('Ana<br>Founder') < html.indexOf('P.S. Reply'), 'P.S. last')
  const txt = fs.readFileSync(path.join(C, 'pack/emails/02-week-2.txt'), 'utf8')
  assert.match(txt, /Open your board: https:\/\/tallyhub\.test\/app\?utm_source=email/)
  assert.match(txt, /Unsubscribe: \{\{unsubscribe_url\}\}/)
  assert.doesNotMatch(txt, /\*\*/)
  const b = JSON.parse(fs.readFileSync(path.join(C, 'pack/build.json'), 'utf8'))
  assert.equal(b.emails.length, 2)
  assert.match(fs.readFileSync(path.join(C, 'pack/preview.html'), 'utf8'), /<iframe title="Email 2"/)
})

test('check: a clean pack passes, with blocking warnings for [TBD] sender and address', () => {
  const r = run('check.mjs', 'spring-push')
  assert.equal(r.status, 0, r.stdout + r.stderr)
  const qa = JSON.parse(fs.readFileSync(path.join(C, 'pack/qa.json'), 'utf8'))
  assert.equal(qa.failures, 0)
  assert.ok(qa.emails[0].warnings.some((w) => /postal address is \[TBD\]/.test(w)))
  assert.match(r.stdout, /\| Email \| Size \| Result \| Notes \|/)
})

test('check: catches stray placeholders, http links, long subjects, unknown tokens', () => {
  put('spring-push/05-copy.md', `# S5 Copy\n\n${email(1, { Subject: 'This subject line is far too long for most inboxes to show in full' })}\n${email(2, { body: 'Hi [First name],\n\nSee *|FNAME|* and {{company}} and [this](http://tallyhub.test/plain).\n\n[TBD] testimonial' })}\n`)
  assert.equal(run('build.mjs', 'spring-push').status, 0)
  const r = run('check.mjs', 'spring-push')
  assert.equal(r.status, 1)
  const qa = JSON.parse(fs.readFileSync(path.join(C, 'pack/qa.json'), 'utf8'))
  const f1 = qa.emails[0].failures.join(' | ')
  const f2 = qa.emails[1].failures.join(' | ')
  assert.match(f1, /subject is \d+ characters/)
  assert.match(f2, /not https/)
  assert.match(f2, /unknown merge token \{\{company\}\}/)
  assert.match(f2, /Mailchimp tag/)
  assert.match(f2, /bracket placeholder/)
  assert.match(f2, /\[TBD\] other than/)
})

test('check: a real address and sender clear the warnings; plain style has no button table', () => {
  put('context.md', profile({ 'Company and product name': 'Tallyhub', Website: 'https://tallyhub.test', 'Sender name, email and reply-to': 'Ana Ruiz <ana@tallyhub.test>', 'Postal address': '9 Elm Rd, Springfield' }))
  put('spring-push/05-copy.md', `# S5 Copy\n\n${email(1)}\n`)
  assert.equal(run('build.mjs', 'spring-push', '--style', 'plain').status, 0)
  const html = fs.readFileSync(path.join(C, 'pack/emails/01-week-1.html'), 'utf8')
  assert.doesNotMatch(html, /v:roundrect/)
  assert.match(html, /9 Elm Rd, Springfield/)
  assert.equal(fs.readdirSync(path.join(C, 'pack/emails')).length, 2, 'old emails from the earlier build are removed')
  const r = run('check.mjs', 'spring-push')
  assert.equal(r.status, 0, r.stdout)
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(C, 'pack/qa.json'), 'utf8')).emails[0].warnings, [])
})

test('contacts: split by a column, suppress, dedupe, skip bad emails; template; refuse xlsx', () => {
  const csv = path.join(tmp, 'list.csv')
  fs.writeFileSync(csv, '﻿Email Address,First Name,Org,Stage,Status\nA@x.test,Ann,"Oak, Inc",Demo,Lead\nb@x.test,Bo,Pine,Trial,Lead\na@x.test,Ann,Oak,Demo,Lead\nnot-an-email,C,D,Demo,Lead\nd@x.test,Di,Elm,Demo,Customer\ne@x.test,Ed,Fir,Webinar,Lead\n')
  const r = run('contacts.mjs', 'split', 'spring-push', csv, '--map', 'email=Email Address,first_name=First Name,company=Org', '--segment-col', 'Stage', '--segments', 'Demo=Cold demo leads,Trial=Trial users', '--exclude-col', 'Status', '--exclude', 'Customer')
  assert.equal(r.status, 0, r.stderr)
  const o = JSON.parse(r.stdout)
  assert.deepEqual(o.segments, { 'cold-demo-leads': 1, 'trial-users': 1 })
  assert.equal(o.duplicate, 1); assert.equal(o.invalid, 1); assert.equal(o.excluded, 1); assert.equal(o.unmatched, 1)
  assert.equal(fs.readFileSync(path.join(C, 'pack/contacts/cold-demo-leads.csv'), 'utf8'), 'email,first_name,company,segment\na@x.test,Ann,"Oak, Inc",cold-demo-leads\n')
  assert.equal(run('contacts.mjs', 'template', 'spring-push', '--segments', 'Cold demo leads').status, 0)
  assert.ok(fs.existsSync(path.join(C, 'pack/contacts/contacts-template.csv')))
  assert.notEqual(run('contacts.mjs', 'split', 'spring-push', path.join(tmp, 'list.xlsx'), '--map', 'email=E', '--segment', 'x').status, 0)
})

test('machine layout: scripts installed under .agents/skills, run through the .claude/skills link, find home artifacts/', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'seb-home-'))
  fs.mkdirSync(path.join(home, '.agents/skills'), { recursive: true })
  fs.mkdirSync(path.join(home, '.claude/skills'), { recursive: true })
  fs.cpSync(path.join(S, '..'), path.join(home, '.agents/skills/saas-email-build'), { recursive: true })
  fs.symlinkSync('../../.agents/skills/saas-email-build', path.join(home, '.claude/skills/saas-email-build'))
  fs.mkdirSync(path.join(home, 'artifacts/c1'), { recursive: true })
  fs.writeFileSync(path.join(home, 'artifacts/c1/05-copy.md'), `# Copy\n\n${email(1)}\n`)
  const e = { ...process.env }; delete e.SL8_ARTIFACTS
  const r = spawnSync('node', ['scripts/build.mjs', 'c1'], { cwd: path.join(home, '.claude/skills/saas-email-build'), env: e, encoding: 'utf8' })
  assert.equal(r.status, 0, r.stderr)
  assert.ok(fs.existsSync(path.join(home, 'artifacts/c1/pack/emails/01-week-1.html')))
  fs.rmSync(home, { recursive: true, force: true })
  fs.rmSync(tmp, { recursive: true, force: true })
})
