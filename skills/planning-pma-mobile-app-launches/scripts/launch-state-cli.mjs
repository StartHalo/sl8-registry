#!/usr/bin/env node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { applyLaunchTransition, launchDigest } from './launch-policy.mjs'
import { safeStatePath } from './state-operation.mjs'

const hash = value => crypto.createHash('sha256').update(value).digest('hex')
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k)
const emit = (value, code = 0) => { process.stdout.write(`${JSON.stringify(value)}\n`); process.exitCode = code }
const fail = (reason, status = 'refused') => emit({ status, reason }, 1)

function args (values) {
  if (values[0] !== 'commit') throw new Error('expected commit verb')
  const parsed = {}
  for (let i = 1; i < values.length; i += 2) {
    const flag = values[i]
    if (!flag?.startsWith('--') || !values[i + 1] || own(parsed, flag)) throw new Error('invalid CLI arguments')
    parsed[flag] = values[i + 1]
  }
  const required = ['--project-root', '--proposal-dir', '--mode', '--expected-version', '--transaction-id', '--request-digest']
  if (Object.keys(parsed).length !== required.length || required.some(k => !own(parsed, k))) throw new Error('incomplete CLI arguments')
  return parsed
}

function rootDirectory (name) {
  const absolute = path.resolve(name)
  const stat = fs.lstatSync(absolute)
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`unsafe directory: ${absolute}`)
  return fs.realpathSync(absolute)
}

function safeTarget (root, relative) {
  if (!safeStatePath(relative) || !relative.startsWith('launch/')) throw new Error(`unsafe launch path: ${relative}`)
  let cursor = root
  for (const part of relative.split('/')) {
    cursor = path.join(cursor, part)
    if (fs.existsSync(cursor) || fs.lstatSync(cursor, { throwIfNoEntry: false })) {
      const stat = fs.lstatSync(cursor)
      if (stat.isSymbolicLink()) throw new Error(`symlink path refused: ${relative}`)
      if (cursor !== path.join(root, relative) && !stat.isDirectory()) throw new Error(`non-directory path component: ${relative}`)
      if (cursor === path.join(root, relative) && !stat.isFile()) throw new Error(`non-file launch path: ${relative}`)
    }
  }
  return path.join(root, relative)
}

function collect (root, requireLaunch = false) {
  const output = {}
  const launchDir = path.join(root, 'launch')
  if (!fs.existsSync(launchDir)) {
    if (requireLaunch) throw new Error('proposal lacks launch directory')
    return output
  }
  if (fs.lstatSync(launchDir).isSymbolicLink() || !fs.lstatSync(launchDir).isDirectory()) throw new Error('unsafe launch directory')
  const walk = (directory, prefix) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const relative = `${prefix}/${entry.name}`
      if (!safeStatePath(relative) || entry.isSymbolicLink()) throw new Error(`unsafe project entry: ${relative}`)
      const absolute = path.join(directory, entry.name)
      if (entry.isDirectory()) walk(absolute, relative)
      else if (entry.isFile()) {
        const bytes = fs.readFileSync(absolute)
        const decoded = bytes.toString('utf8')
        if (!Buffer.from(decoded, 'utf8').equals(bytes)) throw new Error(`non-UTF8 project file: ${relative}`)
        output[relative] = decoded
      }
      else throw new Error(`unsupported project entry: ${relative}`)
    }
  }
  walk(launchDir, 'launch')
  return output
}

function collectProposal (root) {
  const entries = fs.readdirSync(root)
  if (entries.length !== 1 || entries[0] !== 'launch') throw new Error('proposal directory must contain only launch/')
  return collect(root, true)
}

function atomicJson (target, body) {
  const temporary = `${target}.${process.pid}.tmp`
  fs.writeFileSync(temporary, `${JSON.stringify(body)}\n`, { flag: 'wx', mode: 0o600 })
  fs.renameSync(temporary, target)
}

function writeFile (root, relative, bytes) {
  const target = safeTarget(root, relative)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  const temporary = `${target}.${process.pid}.tmp`
  fs.writeFileSync(temporary, bytes, { flag: 'wx' })
  fs.renameSync(temporary, target)
}

function restore (root, journal) {
  for (const [relative, encoded] of Object.entries(journal.before)) {
    const target = safeTarget(root, relative)
    if (encoded === null) {
      if (fs.existsSync(target)) fs.unlinkSync(target)
    } else writeFile(root, relative, Buffer.from(encoded, 'base64').toString('utf8'))
  }
}

function journalBase (project) {
  return path.join(os.tmpdir(), 'sl8-launch-journals-v1', hash(project))
}

function recover (project, base, selectedId, selectedFingerprint) {
  if (!fs.existsSync(base)) return null
  let selectedReceipt = null
  const sorted = value => JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))))
  for (const entry of fs.readdirSync(base, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory() || entry.name === '.lock') continue
    const directory = path.join(base, entry.name)
    const file = path.join(directory, 'journal.json')
    if (!fs.existsSync(file)) {
      // The process stopped before its journal became durable, hence before canonical writes.
      fs.rmSync(directory, { recursive: true, force: true })
      throw new Error(`incomplete transaction ${entry.name} had no committed journal`)
    }
    const bytes = fs.readFileSync(file, 'utf8')
    const journal = JSON.parse(bytes)
    if (journal.project !== project || journal.transactionId !== entry.name) throw new Error('journal identity mismatch')
    const marker = path.join(directory, 'committed.json')
    if (fs.existsSync(marker)) {
      const commit = JSON.parse(fs.readFileSync(marker, 'utf8'))
      if (commit.journalDigest !== launchDigest(bytes) || JSON.stringify(commit.receipt) !== JSON.stringify(journal.receipt)) throw new Error('commit marker invalid')
      if (entry.name === selectedId) {
        if (journal.fingerprint !== selectedFingerprint) throw new Error('transaction ID reused with different bytes')
        const observed = collect(project)
        if (launchDigest(sorted(observed)) !== journal.afterDigest) throw new Error('committed transaction no longer matches project bytes')
        selectedReceipt = { ...journal.receipt, status: 'unchanged' }
      }
    } else if (!fs.existsSync(path.join(directory, 'rolled-back.json'))) {
      restore(project, journal)
      atomicJson(path.join(directory, 'rolled-back.json'), { recoveredAt: new Date().toISOString() })
      throw new Error(`incomplete transaction ${entry.name} rolled back`)
    } else if (entry.name === selectedId) {
      if (journal.fingerprint !== selectedFingerprint) throw new Error('transaction ID reused with different bytes')
      if (launchDigest(sorted(collect(project))) !== journal.prestateDigest) throw new Error('rolled-back pre-state has changed')
      selectedReceipt = { retryRolledBack: true, directory }
    }
  }
  return selectedReceipt
}

export function commitFromCli (argv = process.argv.slice(2)) {
  const parsed = args(argv)
  const project = rootDirectory(parsed['--project-root'])
  const proposal = rootDirectory(parsed['--proposal-dir'])
  if (proposal === project || proposal.startsWith(`${project}${path.sep}`)) throw new Error('proposal must be outside project')
  const mode = parsed['--mode'], transactionId = parsed['--transaction-id'], requestDigest = parsed['--request-digest']
  if (!/^sha256:[0-9a-f]{64}$/.test(transactionId) || !/^sha256:[0-9a-f]{64}$/.test(requestDigest)) throw new Error('invalid transaction/request digest')
  const updates = collectProposal(proposal)
  const fingerprint = launchDigest(JSON.stringify({ mode, expectedVersion: parsed['--expected-version'], transactionId, requestDigest, updates }))
  const base = journalBase(project)
  fs.mkdirSync(base, { recursive: true, mode: 0o700 })
  const lock = path.join(base, '.lock')
  try { fs.mkdirSync(lock) } catch {
    const ownerFile = path.join(lock, 'pid')
    let owner = null
    try { owner = Number(fs.readFileSync(ownerFile, 'utf8')) } catch {}
    if (!Number.isInteger(owner) || owner <= 0) throw new Error('another launch transaction is active')
    if (Number.isInteger(owner) && owner > 0) {
      try { process.kill(owner, 0); throw new Error('another launch transaction is active') }
      catch (error) { if (error.code !== 'ESRCH') throw error }
    }
    fs.rmSync(lock, { recursive: true, force: true })
    try { fs.mkdirSync(lock) } catch { throw new Error('another launch transaction is active') }
  }
  fs.writeFileSync(path.join(lock, 'pid'), String(process.pid))
  try {
    const prior = recover(project, base, transactionId, fingerprint)
    if (prior && !prior.retryRolledBack) return prior
    const files = collect(project)
    const result = applyLaunchTransition({ files, updates, mode, expectedVersion: parsed['--expected-version'], transactionId, requestDigest })
    if (result.status === 'refused') throw new Error(result.reason)
    const sorted = value => JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))))
    const beforeDigest = launchDigest(sorted(files)), afterDigest = launchDigest(sorted(result.files))
    const receipt = { status: result.status, mode, version: result.version, transactionId, requestDigest,
      writtenPaths: result.writtenPaths, digest: afterDigest }
    if (result.status === 'unchanged') return receipt
    const directory = path.join(base, transactionId)
    if (prior?.retryRolledBack) {
      const attempt = crypto.randomUUID()
      fs.renameSync(path.join(directory, 'journal.json'), path.join(directory, `rolled-back-${attempt}.json`))
      fs.renameSync(path.join(directory, 'rolled-back.json'), path.join(directory, `rolled-back-${attempt}.marker.json`))
    } else {
      if (fs.existsSync(directory)) throw new Error('transaction ID already used')
      fs.mkdirSync(directory, { mode: 0o700 })
    }
    const before = Object.fromEntries(Object.keys(updates).map(p => [p, own(files, p) ? Buffer.from(files[p], 'utf8').toString('base64') : null]))
    const journal = { schemaRevision: 1, project, transactionId, fingerprint, prestateDigest: beforeDigest, afterDigest, before, receipt }
    const journalFile = path.join(directory, 'journal.json')
    atomicJson(journalFile, journal)
    let count = 0
    for (const relative of Object.keys(updates).sort()) {
      writeFile(project, relative, updates[relative]); count++
      if (Number(process.env.SL8_TEST_INTERRUPT_AFTER_WRITES) === count) process.exit(91)
    }
    const observed = collect(project)
    if (sorted(observed) !== sorted(result.files)) throw new Error('post-commit byte verification failed')
    atomicJson(path.join(directory, 'committed.json'), { journalDigest: launchDigest(fs.readFileSync(journalFile, 'utf8')), receipt })
    return receipt
  } finally { fs.rmSync(lock, { recursive: true, force: true }) }
}

if (import.meta.filename === process.argv[1]) {
  try { emit(commitFromCli()) } catch (error) { fail(error.message, /incomplete transaction/.test(error.message) ? 'incomplete' : 'refused') }
}
