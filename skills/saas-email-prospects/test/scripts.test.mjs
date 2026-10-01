// Offline self-test of the prospect list script: node --test test/scripts.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const S = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'prospects.mjs')
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sep-'))
const env = { ...process.env, SL8_ARTIFACTS: path.join(tmp, 'artifacts') }
const run = (...a) => spawnSync('node', [S, ...a], { env, encoding: 'utf8' })
const HEAD = 'email,first_name,company,segment,role,source_url,fit_reason'
const MD = ['What was done', 'How the list was built', 'What to verify before sending', 'Skipped', 'Decisions', 'Assumptions'].map((h) => `## ${h}\n\n- none\n`).join('\n')

test('new never overwrites; check passes a clean list', () => {
  const d1 = run('new', 'clinics-north').stdout.trim()
  const d2 = run('new', 'clinics-north').stdout.trim()
  assert.ok(d1.endsWith('prospects/clinics-north'))
  assert.ok(d2.endsWith('prospects/clinics-north-2'))
  assert.notEqual(run('new', '../x').status, 0)
  fs.writeFileSync(path.join(d1, 'prospects.csv'), `${HEAD}\noffice@bayside.example,,Bayside Clinic,clinics-north,practice manager,https://bayside.example/contact,"Two sites, books shifts by phone"\nana@pine.example,Ana,Pine Health,clinics-north,owner,https://pine.example/team,12 staff on rotating shifts\n`)
  fs.writeFileSync(path.join(d1, 'prospects.md'), '# list\n\n' + MD)
  const r = run('check', d1, '--max', '25')
  assert.equal(r.status, 0, r.stdout)
  assert.match(r.stdout, /2 prospects/)
})

test('check catches bad rows, duplicates, too many, free-mail, missing headings', () => {
  const d = run('new', 'bad').stdout.trim()
  fs.writeFileSync(path.join(d, 'prospects.csv'), `${HEAD}\nnot-an-email,,A,x,r,https://a.example,fit\nb@b.example,,B,x,r,http://b.example,fit\nc@gmail.com,,C,x,r,https://c.example,fit\nb@b.example,,B,x,r,https://b.example,\n`)
  fs.writeFileSync(path.join(d, 'prospects.md'), '# list\n\n## What was done\n')
  const r = run('check', d, '--max', '3')
  assert.equal(r.status, 1)
  for (const m of [/not an email/, /source_url must be/, /appears twice/, /no fit reason/, /at most 3/, /free-mail/, /no "## Skipped"/]) assert.match(r.stdout, m)
  fs.writeFileSync(path.join(d, 'prospects.csv'), 'email,company\nx@y.example,Y\n')
  assert.match(run('check', d).stdout, /header must be exactly/)
  fs.rmSync(tmp, { recursive: true, force: true })
})
