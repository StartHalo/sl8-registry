import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { applyStateOperation } from '../scripts/state-operation.mjs'
import { applyLaunchTransition, launchDigest, launchVersionPath } from '../scripts/launch-policy.mjs'

const botDir = path.resolve(import.meta.dirname, '../../../..')
const cli = path.resolve(import.meta.dirname, '../scripts/launch-state-cli.mjs')
const tx = label => launchDigest(`transaction-${label}`)
const req = label => launchDigest(`request-${label}`)
const docs = {
  'launch/STRATEGY.md': '# Strategy\n',
  'launch/DECISIONS.md': '# Decisions\n',
  'launch/RESEARCH-BRIEF.md': '# Research brief\n'
}
const log = (version, mode = 'update') => `# Version ${version}\n\nMode: ${mode}\nSource: supplied update.\nChanged decisions: none.\nPreserved decisions: all.\nUnknown: target.\nOwner actions: review.\n`
const clone = value => structuredClone(value)

function fixture (mode) {
  const root = path.join(botDir, 'acceptance', 'fixtures', mode, 'launch')
  const out = {}
  const walk = (dir, rel) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const next = path.join(rel, ent.name)
      if (ent.isDirectory()) walk(path.join(dir, ent.name), next)
      else out[next.split(path.sep).join('/')] = fs.readFileSync(path.join(dir, ent.name), 'utf8')
    }
  }
  walk(root, 'launch')
  return out
}

function proposal (mode, files = {}, label = mode) {
  if (mode === 'status') return { 'launch/STATUS.md': '# Current status\n' }
  const old = files['launch/STATE.json'] ? JSON.parse(files['launch/STATE.json']) : null
  const version = (old?.currentVersion ?? 0) + 1
  const documentBytes = mode === 'close' ? Object.fromEntries(Object.entries(files).filter(([p]) => Object.hasOwn(docs, p))) :
    Object.fromEntries(Object.keys(docs).map(p => [p, `${docs[p]}${mode}\n`]))
  const updates = mode === 'close' ? { 'launch/CLOSURE.md': '# Closure\n' } : { ...documentBytes }
  if (version > 1) updates['launch/CHANGELOG.md'] = `${files['launch/CHANGELOG.md'] ?? ''}${log(version, mode)}`
  const digestDocs = { ...documentBytes, ...(version > 1 ? { 'launch/CHANGELOG.md': updates['launch/CHANGELOG.md'] } : {}), ...(mode === 'close' ? { 'launch/CLOSURE.md': updates['launch/CLOSURE.md'] } : {}) }
  const documentDigests = Object.fromEntries(Object.entries(digestDocs).map(([p, bytes]) => [p, launchDigest(bytes)]))
  const completedSteps = mode === 'resume' ? ['M1.S1', 'M1.S2', 'M1.S3', 'M1.S4', 'M1.S5', 'M1.S6', 'M1.S7', 'M1.S8'] : (old?.completedSteps ?? ['M1.S1', 'M1.S2', 'M1.S3', 'M1.S4', 'M1.S5', 'M1.S6', 'M1.S7', 'M1.S8'])
  const common = { completedSteps, evidenceRefs: [], decisionRefs: [], readiness: old?.readiness ?? 'unknown', blockers: old?.blockers ?? [], documentDigests }
  const record = { schemaRevision: 1, version, priorVersionDigest: version === 1 ? null : launchDigest(files[launchVersionPath(version - 1)]), transactionId: tx(label), requestDigest: req(label), mode, ...common }
  const versionBytes = `${JSON.stringify(record, null, 2)}\n`
  const state = { schemaRevision: 1, engagementId: old?.engagementId ?? old?.engagement ?? 'sample-project', owner: old?.owner ?? 'Accountable owner', status: mode === 'close' ? 'closed' : 'active', lastMode: mode, method: 'PMA-M1', supplements: [], currentVersion: version, previousTransactionId: tx(label), externalResearch: 'unavailable', ...common, currentVersionDigest: launchDigest(versionBytes) }
  updates['launch/STATE.json'] = `${JSON.stringify(state, null, 2)}\n`
  updates[launchVersionPath(version)] = versionBytes
  return updates
}

const apply = (mode, files, updates, label = mode, expectedVersion = files['launch/STATE.json'] ? JSON.parse(files['launch/STATE.json']).currentVersion : 'none') =>
  applyLaunchTransition({ mode, files, updates, expectedVersion, transactionId: tx(label), requestDigest: req(label) })

function replaceChangelog (updates, bytes) {
  const changed = { ...updates, 'launch/CHANGELOG.md': bytes }
  const versionPath = Object.keys(changed).find(p => /^launch\/VERSIONS\/\d{4}\.json$/.test(p))
  const record = JSON.parse(changed[versionPath])
  record.documentDigests['launch/CHANGELOG.md'] = launchDigest(bytes)
  changed[versionPath] = `${JSON.stringify(record, null, 2)}\n`
  const state = JSON.parse(changed['launch/STATE.json'])
  state.documentDigests['launch/CHANGELOG.md'] = launchDigest(bytes)
  state.currentVersionDigest = launchDigest(changed[versionPath])
  changed['launch/STATE.json'] = `${JSON.stringify(state, null, 2)}\n`
  return changed
}

test('stock pure operation handles nested versions, interruption, and retry without input mutation', () => {
  const files = { 'other/current': 'old', 'nested/versions/0001.json': 'old version' }
  const input = { files, path: 'other/current', versionPath: 'nested/versions/0002.json', requiredPaths: ['other/current', 'nested/versions/0002.json'], updates: { 'other/current': 'new', 'nested/versions/0002.json': 'new version' } }
  const before = clone(input)
  const first = applyStateOperation(input)
  assert.equal(first.status, 'committed')
  assert.deepEqual(input, before)
  assert.equal(applyStateOperation({ ...input, files: first.files }).status, 'unchanged')
  assert.deepEqual(applyStateOperation({ ...input, updates: { ...input.updates, 'nested/versions/0001.json': 'changed' } }).files, files)
  assert.equal(applyStateOperation({ ...input, interruptAt: 'before-commit' }).status, 'interrupted')
})

test('exact five-mode policy and sparse legacy fixtures', () => {
  for (const mode of ['create', 'resume', 'update', 'status', 'close']) {
    const files = mode === 'create' ? {} : fixture(mode)
    const updates = proposal(mode, files)
    const original = clone(files)
    const result = apply(mode, files, updates)
    assert.equal(result.status, 'committed', `${mode}: ${result.reason}`)
    assert.deepEqual(files, original)
    assert.deepEqual(Object.keys(result.files).sort(), [...new Set([...Object.keys(files), ...Object.keys(updates)])].sort())
    if (mode === 'status') for (const p of Object.keys(files)) assert.equal(result.files[p], files[p])
    if (mode === 'close') for (const p of [...Object.keys(docs), 'launch/VERSIONS/0001.json']) assert.equal(result.files[p], files[p])
    if (mode !== 'create' && mode !== 'status') assert.equal(result.files['launch/VERSIONS/0001.json'], files['launch/VERSIONS/0001.json'])
    assert.equal(apply(mode, files, { ...updates, 'launch/EXTRA.md': 'extra' }).status, 'refused')
    assert.equal(apply(mode, files, { ...updates, '../escape': 'bad' }).status, 'refused')
  }
})

test('expected version, history, schema and digest guards refuse without mutation', () => {
  const files = fixture('update'), updates = proposal('update', files)
  for (const altered of [
    { ...updates, 'launch/VERSIONS/0001.json': 'bad' },
    { ...updates, 'launch/VERSIONS/0001.json': null },
    { ...updates, 'launch/STATE.json': updates['launch/STATE.json'].replace('sha256:', 'sha257:') },
    { ...updates, 'launch/CHANGELOG.md': '# changed without structure\n' },
    { ...updates, '/absolute': 'bad' }
  ]) {
    const result = apply('update', files, altered)
    assert.equal(result.status, 'refused')
    assert.deepEqual(result.files, files)
  }
  assert.match(apply('update', files, updates, 'update', 0).reason, /expected version/)
  const brokenState = JSON.parse(updates['launch/STATE.json'])
  const brokenVersion = JSON.parse(updates['launch/VERSIONS/0002.json'])
  brokenState.evidenceRefs = ['missing-source-id']
  brokenVersion.evidenceRefs = ['missing-source-id']
  const brokenBytes = `${JSON.stringify(brokenVersion)}\n`
  brokenState.currentVersionDigest = launchDigest(brokenBytes)
  assert.match(apply('update', files, { ...updates, 'launch/STATE.json': JSON.stringify(brokenState), 'launch/VERSIONS/0002.json': brokenBytes }).reason, /evidenceRefs unresolved/)
})

test('status reports its delivery path even when the rendered bytes are unchanged', () => {
  const files = fixture('status')
  const updates = proposal('status', files)
  const repeated = apply('status', { ...files, ...updates }, updates, 'status-repeat')
  assert.equal(repeated.status, 'unchanged')
  assert.deepEqual(repeated.writtenPaths, ['launch/STATUS.md'])
})

test('changelog validates the exact appended version and selected mode', () => {
  const files = fixture('update')
  const updates = proposal('update', files)
  const prefix = files['launch/CHANGELOG.md'] ?? ''
  const wrongVersion = replaceChangelog(updates, `${prefix}${log(99, 'update')}\nVersion 2 was mentioned elsewhere.\n`)
  assert.match(apply('update', files, wrongVersion).reason, /changelog structure incomplete/)
  const missingMode = replaceChangelog(updates, `${prefix}${log(2, 'update').replace('Mode: update\n', '')}`)
  assert.match(apply('update', files, missingMode).reason, /changelog structure incomplete/)
  const wrongMode = replaceChangelog(updates, `${prefix}${log(2, 'resume')}`)
  assert.match(apply('update', files, wrongMode).reason, /changelog structure incomplete/)
})

function diskFixture (files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sl8-state-test-'))
  const project = path.join(root, 'project'), proposalDir = path.join(root, 'proposal')
  fs.mkdirSync(project); fs.mkdirSync(proposalDir)
  writeMap(project, files)
  return { root, project, proposalDir }
}
function writeMap (root, files) {
  for (const [p, bytes] of Object.entries(files)) {
    const target = path.join(root, p)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, bytes)
  }
}
function runCli ({ project, proposalDir }, mode, label = mode, version = mode === 'create' ? 'none' : '1', extraEnv = {}) {
  const result = spawnSync(process.execPath, [cli, 'commit', '--project-root', project, '--proposal-dir', proposalDir, '--mode', mode, '--expected-version', version, '--transaction-id', tx(label), '--request-digest', req(label)], { encoding: 'utf8', env: { ...process.env, ...extraEnv } })
  return { ...result, receipt: result.stdout ? JSON.parse(result.stdout.trim()) : null }
}
const journalDir = project => path.join(os.tmpdir(), 'sl8-launch-journals-v1', crypto.createHash('sha256').update(fs.realpathSync(project)).digest('hex'))
const cleanup = ({ root, project }) => { fs.rmSync(journalDir(project), { recursive: true, force: true }); fs.rmSync(root, { recursive: true, force: true }) }

test('CLI commits exact proposal bytes and reconstructs idempotent receipt', () => {
  const disk = diskFixture({})
  try {
    const updates = proposal('create')
    writeMap(disk.proposalDir, updates)
    const first = runCli(disk, 'create')
    assert.equal(first.status, 0, first.stdout)
    assert.equal(first.receipt.status, 'committed')
    for (const [p, bytes] of Object.entries(updates)) assert.equal(fs.readFileSync(path.join(disk.project, p), 'utf8'), bytes)
    const retry = runCli(disk, 'create')
    assert.equal(retry.status, 0)
    assert.equal(retry.receipt.status, 'unchanged')
    fs.writeFileSync(path.join(disk.proposalDir, 'launch/STRATEGY.md'), 'different')
    assert.match(runCli(disk, 'create').receipt.reason, /reused with different bytes/)
  } finally { cleanup(disk) }
})

test('skill proposal transport invokes CLI for every contracted mode', () => {
  const skill = fs.readFileSync(path.resolve(import.meta.dirname, '../SKILL.md'), 'utf8')
  assert.match(skill, /launch-state-cli\.mjs commit --project-root .*--proposal-dir .*--mode .*--expected-version .*--transaction-id .*--request-digest/)
  assert.match(skill, /sole production write entrypoint/i)
  for (const mode of ['resume', 'update', 'status', 'close']) {
    const files = fixture(mode), disk = diskFixture(files)
    try {
      const updates = proposal(mode, files)
      writeMap(disk.proposalDir, updates)
      const { status, receipt } = runCli(disk, mode)
      assert.equal(status, 0, `${mode}: ${receipt?.reason}`)
      assert.equal(receipt.status, 'committed')
      assert.deepEqual(receipt.writtenPaths.sort(), Object.keys(updates).sort())
      for (const [p, bytes] of Object.entries(updates)) assert.equal(fs.readFileSync(path.join(disk.project, p), 'utf8'), bytes)
      for (const p of Object.keys(files).filter(p => !Object.hasOwn(updates, p))) assert.equal(fs.readFileSync(path.join(disk.project, p), 'utf8'), files[p])
      if (mode === 'status') {
        const repeated = runCli(disk, mode, 'status-repeat')
        assert.equal(repeated.status, 0)
        assert.equal(repeated.receipt.status, 'unchanged')
        assert.deepEqual(repeated.receipt.writtenPaths, ['launch/STATUS.md'])
      }
    } finally { cleanup(disk) }
  }
})

test('CLI expected-version conflict and symlink escape preserve all bytes', () => {
  const files = fixture('status'), disk = diskFixture(files)
  try {
    writeMap(disk.proposalDir, proposal('status', files))
    assert.match(runCli(disk, 'status', 'status', '0').receipt.reason, /expected version/)
    assert.equal(fs.existsSync(path.join(disk.project, 'launch/STATUS.md')), false)
    const outside = path.join(disk.root, 'outside.md')
    fs.writeFileSync(outside, 'untouched')
    fs.symlinkSync(outside, path.join(disk.project, 'launch/STATUS.md'))
    const result = runCli(disk, 'status')
    assert.equal(result.status, 1)
    assert.match(result.receipt.reason, /symlink|unsafe project entry/)
    assert.equal(fs.readFileSync(outside, 'utf8'), 'untouched')
  } finally { cleanup(disk) }
})

test('out-of-project incomplete journal rolls back and reports incomplete', () => {
  const files = fixture('update'), disk = diskFixture(files)
  try {
    writeMap(disk.proposalDir, proposal('update', files))
    const interrupted = runCli(disk, 'update', 'update', '1', { SL8_TEST_INTERRUPT_AFTER_WRITES: '1' })
    assert.equal(interrupted.status, 91)
    assert.equal(fs.existsSync(path.join(journalDir(disk.project), tx('update'), 'journal.json')), true)
    const recovery = runCli(disk, 'update')
    assert.equal(recovery.status, 1)
    assert.equal(recovery.receipt.status, 'incomplete', recovery.receipt.reason)
    for (const [p, bytes] of Object.entries(files)) assert.equal(fs.readFileSync(path.join(disk.project, p), 'utf8'), bytes)
    assert.equal(fs.existsSync(path.join(disk.project, 'launch/VERSIONS/0002.json')), false)
    const retry = runCli(disk, 'update')
    assert.equal(retry.status, 0, retry.receipt?.reason)
    assert.equal(retry.receipt.status, 'committed')
    assert.equal(JSON.parse(fs.readFileSync(path.join(disk.project, 'launch/STATE.json'), 'utf8')).currentVersion, 2)
  } finally { cleanup(disk) }
})
