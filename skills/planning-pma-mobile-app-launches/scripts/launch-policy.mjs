import crypto from 'node:crypto'
import { applyStateOperation, safeStatePath } from './state-operation.mjs'

const sha = value => `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key)
const refuse = (files, reason) => ({ status: 'refused', files: structuredClone(files), reason })
const isDigest = value => typeof value === 'string' && /^sha256:[0-9a-f]{64}$/.test(value)
const arrayOfStrings = value => Array.isArray(value) && value.every(v => typeof v === 'string')
const json = (bytes, label) => {
  try { const value = JSON.parse(bytes); if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(); return value }
  catch { throw new Error(`${label} is not a JSON object`) }
}
const versionPath = version => `launch/VERSIONS/${String(version).padStart(4, '0')}.json`
const baseDocuments = ['launch/STRATEGY.md', 'launch/DECISIONS.md', 'launch/RESEARCH-BRIEF.md']
const modeDocuments = {
  create: [...baseDocuments],
  resume: [...baseDocuments, 'launch/CHANGELOG.md'],
  update: [...baseDocuments, 'launch/CHANGELOG.md'],
  status: ['launch/STATUS.md'],
  close: ['launch/CLOSURE.md', 'launch/CHANGELOG.md']
}
const keys = object => Object.keys(object).sort()
const equalKeys = (actual, expected) => JSON.stringify(actual.sort()) === JSON.stringify(expected.sort())
const checkRefs = (record, documents) => {
  const text = Object.values(documents).join('\n')
  for (const field of ['evidenceRefs', 'decisionRefs']) {
    if (record[field] == null) continue
    if (!arrayOfStrings(record[field]) || record[field].some(ref => !ref || !text.includes(ref))) throw new Error(`${field} unresolved in customer documents`)
  }
}

function validatePaths (files) {
  for (const [p, bytes] of Object.entries(files)) {
    if (!safeStatePath(p) || !p.startsWith('launch/') || p === 'launch/' || typeof bytes !== 'string') throw new Error(`unsafe project path: ${p}`)
  }
}

function validateCurrent (files, mode, expectedVersion) {
  const hasState = own(files, 'launch/STATE.json')
  if (mode === 'create') {
    if (hasState || Object.keys(files).some(p => p.startsWith('launch/'))) throw new Error('create requires an empty launch project')
    if (expectedVersion !== 'none' && expectedVersion !== null) throw new Error('create expected version must be none')
    return { currentVersion: 0 }
  }
  if (!hasState) throw new Error('current state missing')
  const state = json(files['launch/STATE.json'], 'current state')
  if (!Number.isInteger(state.currentVersion) || state.currentVersion < 1 || state.currentVersion > 9998) throw new Error('current version invalid')
  if (Number(expectedVersion) !== state.currentVersion) throw new Error('expected version conflict')
  if (!['PMA-M1', 'PMA-M1-plus-SD1-SD5'].includes(state.method) && state.method !== 'PMA-M1') throw new Error('unsupported method')
  if (!arrayOfStrings(state.completedSteps) || typeof state.engagement !== 'string' && typeof state.engagementId !== 'string') throw new Error('current state shape invalid')
  if (!['active', 'closed'].includes(state.status)) throw new Error('current status invalid')
  if (mode !== 'status' && state.status !== 'active') throw new Error('engagement is closed')
  const previous = versionPath(state.currentVersion)
  if (!own(files, previous)) throw new Error('current version record missing')
  for (let number = 1; number <= state.currentVersion; number++) {
    const p = versionPath(number)
    if (!own(files, p)) throw new Error(`version history gap: ${p}`)
    const item = json(files[p], `version ${number}`)
    if (item.version !== number) throw new Error(`version history mismatch: ${p}`)
    if (number > 1 && item.priorVersionDigest !== sha(files[versionPath(number - 1)])) throw new Error(`version chain mismatch: ${p}`)
  }
  if (Object.keys(files).some(p => /^launch\/VERSIONS\/\d{4}\.json$/.test(p) && Number(p.slice(-9, -5)) > state.currentVersion)) throw new Error('unreferenced future version exists')
  const record = json(files[previous], 'current version')
  if (record.version !== state.currentVersion) throw new Error('current version link mismatch')
  if (state.currentVersionDigest && state.currentVersionDigest !== sha(files[previous])) throw new Error('current version digest mismatch')
  if (state.documentDigests) {
    for (const [p, digest] of Object.entries(state.documentDigests)) {
      if (!safeStatePath(p) || !p.startsWith('launch/') || !own(files, p) || sha(files[p]) !== digest) throw new Error(`current document digest mismatch: ${p}`)
    }
  }
  checkRefs(state, Object.fromEntries(Object.entries(files).filter(([p]) => baseDocuments.includes(p) || ['launch/CHANGELOG.md', 'launch/CLOSURE.md'].includes(p))))
  return state
}

function validateNew (files, updates, mode, oldState, next, transactionId, requestDigest) {
  const state = json(updates['launch/STATE.json'], 'proposed state')
  const record = json(updates[versionPath(next)], 'proposed version')
  if (state.schemaRevision !== 1 || state.currentVersion !== next || state.status !== (mode === 'close' ? 'closed' : 'active') ||
      state.lastMode !== mode || state.method !== 'PMA-M1' || typeof state.engagementId !== 'string' || !state.engagementId ||
      typeof state.owner !== 'string' || !state.owner || !arrayOfStrings(state.supplements) ||
      !arrayOfStrings(state.completedSteps) || !arrayOfStrings(state.blockers) ||
      !arrayOfStrings(state.evidenceRefs) || !arrayOfStrings(state.decisionRefs) ||
      typeof state.readiness !== 'string' || typeof state.externalResearch !== 'string' ||
      state.previousTransactionId !== transactionId || !isDigest(state.currentVersionDigest) ||
      !state.documentDigests || typeof state.documentDigests !== 'object') throw new Error('proposed state schema invalid')
  const priorEngagement = oldState.engagementId ?? oldState.engagement
  if (next > 1 && state.engagementId !== priorEngagement) throw new Error('engagement identity changed')
  if (record.schemaRevision !== 1 || record.version !== next || record.mode !== mode ||
      record.transactionId !== transactionId || record.requestDigest !== requestDigest ||
      !arrayOfStrings(record.completedSteps) || !arrayOfStrings(record.evidenceRefs) ||
      !arrayOfStrings(record.decisionRefs) || !arrayOfStrings(record.blockers) ||
      typeof record.readiness !== 'string' || !record.documentDigests || typeof record.documentDigests !== 'object') throw new Error('proposed version schema invalid')
  const priorDigest = next === 1 ? null : sha(files[versionPath(next - 1)])
  if (record.priorVersionDigest !== priorDigest) throw new Error('prior version digest mismatch')
  if (state.currentVersionDigest !== sha(updates[versionPath(next)])) throw new Error('new version digest mismatch')
  if (!equalKeys(keys(state.documentDigests), keys(record.documentDigests))) throw new Error('document digest set mismatch')
  for (const [p, digest] of Object.entries(record.documentDigests)) {
    if (!baseDocuments.includes(p) && !['launch/CHANGELOG.md', 'launch/CLOSURE.md'].includes(p)) throw new Error(`invalid document reference: ${p}`)
    const bytes = own(updates, p) ? updates[p] : files[p]
    if (typeof bytes !== 'string' || !isDigest(digest) || sha(bytes) !== digest || state.documentDigests[p] !== digest) throw new Error(`document digest mismatch: ${p}`)
  }
  const requiredDocs = mode === 'close' ? [...baseDocuments, 'launch/CHANGELOG.md', 'launch/CLOSURE.md'] : modeDocuments[mode]
  if (!equalKeys(keys(record.documentDigests), requiredDocs)) throw new Error('document references incomplete')
  for (const field of ['completedSteps', 'evidenceRefs', 'decisionRefs', 'blockers']) {
    if (JSON.stringify(state[field]) !== JSON.stringify(record[field])) throw new Error(`${field} link mismatch`)
  }
  if (state.readiness !== record.readiness) throw new Error('readiness link mismatch')
  checkRefs(record, Object.fromEntries(Object.entries(record.documentDigests).map(([p]) => [p, own(updates, p) ? updates[p] : files[p]])))
  if (next > 1) {
    const log = updates['launch/CHANGELOG.md']
    if (own(files, 'launch/CHANGELOG.md') && !log.startsWith(files['launch/CHANGELOG.md'])) throw new Error('changelog must append')
    const appended = own(files, 'launch/CHANGELOG.md') ? log.slice(files['launch/CHANGELOG.md'].length) : log
    if (!new RegExp(`^# Version ${next}(?:\\r?\\n|$)`).test(appended) ||
        !new RegExp(`^Mode:\\s*${mode}\\s*$`, 'mi').test(appended) ||
        !/^(?:Source|Reason):\s*\S/im.test(appended) || !/^Changed decisions:/mi.test(appended) ||
        !/^Preserved decisions:/mi.test(appended) || !/^Unknown:/mi.test(appended) ||
        !/^Owner actions:/mi.test(appended)) throw new Error('changelog structure incomplete')
  }
}

/** Validate the launch contract, then delegate the exact file-map transition to the pure operation. */
export function applyLaunchTransition (input) {
  const files = structuredClone(input?.files ?? {})
  try {
    const { mode, expectedVersion, transactionId, requestDigest, updates } = input
    if (!own(modeDocuments, mode)) throw new Error('unsupported mode')
    if (!isDigest(transactionId) || !isDigest(requestDigest)) throw new Error('transaction/request digest invalid')
    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) throw new Error('proposal missing')
    validatePaths(files); validatePaths(updates)
    const oldState = validateCurrent(files, mode, expectedVersion)
    const next = mode === 'status' ? oldState.currentVersion : oldState.currentVersion + 1
    const nextPath = mode === 'status' ? null : versionPath(next)
    const required = mode === 'status' ? modeDocuments.status : [...modeDocuments[mode], 'launch/STATE.json', nextPath]
    if (!equalKeys(keys(updates), required)) throw new Error('mode write set mismatch')
    if (nextPath && own(files, nextPath)) {
      // Only a byte-identical committed retry may reach the pure operation.
      if (required.some(p => files[p] !== updates[p])) throw new Error('next version already exists')
    }
    if (mode !== 'status') validateNew(files, updates, mode, oldState, next, transactionId, requestDigest)
    const result = applyStateOperation({ files, path: mode === 'status' ? 'launch/STATUS.md' : 'launch/STATE.json', versionPath: nextPath, requiredPaths: required, updates, transactionId, interruptAt: input.interruptAt })
    return { ...result, mode, version: next, writtenPaths: ['committed', 'unchanged'].includes(result.status) ? required : [] }
  } catch (error) { return refuse(files, error.message) }
}

export { sha as launchDigest, versionPath as launchVersionPath }
