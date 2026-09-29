// Pure, path-root-agnostic transaction over a virtual map of file bytes.
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key)

export function safeStatePath (value) {
  return typeof value === 'string' && value.length > 0 && !value.startsWith('/') &&
    !value.includes('\\') && !value.includes('\0') &&
    value.split('/').every(part => part && part !== '.' && part !== '..' && !part.includes(':'))
}

const historyPath = value => /(^|\/)versions\/[^/]+$/i.test(value)
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const refusal = (files, reason, status = 'refused') => ({ status, files: structuredClone(files), reason })

export function applyStateOperation (input) {
  const files = input?.files
  if (!files || typeof files !== 'object' || Array.isArray(files)) return refusal({}, 'invalid file map')
  const before = structuredClone(files)
  const { path, versionPath, requiredPaths, updates } = input
  if (!safeStatePath(path) || (versionPath != null && !safeStatePath(versionPath))) return refusal(before, 'invalid declared path')
  if (!Array.isArray(requiredPaths) || !requiredPaths.length ||
      requiredPaths.some(p => !safeStatePath(p)) || new Set(requiredPaths).size !== requiredPaths.length ||
      !updates || typeof updates !== 'object' || Array.isArray(updates)) return refusal(before, 'invalid snapshot declaration')
  const updatePaths = Object.keys(updates)
  if (updatePaths.some(p => !safeStatePath(p)) || !requiredPaths.includes(path) ||
      (versionPath && !requiredPaths.includes(versionPath)) ||
      updatePaths.length !== requiredPaths.length || updatePaths.some(p => !requiredPaths.includes(p))) return refusal(before, 'incomplete or undeclared snapshot')
  if (requiredPaths.some(p => !own(updates, p) || typeof updates[p] !== 'string')) return refusal(before, 'snapshot needs complete file bytes')
  if (Object.keys(before).some(p => !safeStatePath(p) || typeof before[p] !== 'string')) return refusal(before, 'invalid existing file map')
  for (const p of updatePaths) {
    if (historyPath(p) && own(before, p)) {
      // An exact retry may name the version again, but its bytes cannot change.
      if (p !== versionPath || before[p] !== updates[p]) return refusal(before, 'immutable history')
    }
  }
  if (versionPath && own(before, versionPath)) {
    if (updatePaths.every(p => own(before, p) && before[p] === updates[p])) return { status: 'unchanged', files: before }
    return refusal(before, 'version already exists')
  }
  if (input.interruptAt === 'before-commit') return refusal(before, 'interrupted before commit', 'interrupted')
  const after = { ...before, ...structuredClone(updates) }
  if (same(before, after)) return { status: 'unchanged', files: before }
  return { status: 'committed', files: after }
}
