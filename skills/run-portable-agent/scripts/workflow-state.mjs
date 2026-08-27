#!/usr/bin/env node

import { createHash } from 'node:crypto';
import {
  closeSync,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { basename, join, resolve } from 'node:path';

const FLOW = Object.freeze({
  briefed: ['selected', 'failed', 'abandoned'],
  selected: ['bundled', 'failed', 'abandoned'],
  bundled: ['running', 'failed', 'abandoned'],
  running: ['reconnecting', 'finalizing', 'failed', 'abandoned'],
  reconnecting: ['running', 'failed', 'abandoned'],
  finalizing: ['validating', 'failed', 'abandoned'],
  validating: ['delivered', 'failed', 'abandoned'],
  delivered: [],
  failed: [],
  abandoned: [],
});

function parseArgs(argv) {
  const [command, ...tail] = argv;
  const options = {};
  for (let index = 0; index < tail.length; index += 1) {
    const token = tail[index];
    if (!token?.startsWith('--')) throw new Error(`Unexpected argument: ${token}`);
    const value = tail[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${token}`);
    options[token.slice(2)] = value;
    index += 1;
  }
  return { command, options };
}

function requireOptions(options, names) {
  for (const name of names) if (!options[name]) throw new Error(`Missing --${name}`);
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function assertRegularFile(path, label) {
  if (!existsSync(path) || !lstatSync(path).isFile() || lstatSync(path).isSymbolicLink()) {
    throw new Error(`${label} must be a regular non-symlink file: ${path}`);
  }
}

function readPlan(project) {
  const path = join(project, 'plan.json');
  const plan = JSON.parse(readFileSync(path, 'utf8'));
  validatePlan(plan);
  return { path, plan };
}

function validatePlan(plan) {
  if (plan?.schemaVersion !== 1 || plan?.workflow !== 'run-portable-agent') {
    throw new Error('plan.json is not a run-portable-agent schemaVersion 1 plan');
  }
  if (!Object.hasOwn(FLOW, plan.status)) throw new Error(`Unknown workflow status: ${plan.status}`);
  if (!Number.isInteger(plan.revision) || plan.revision < 1) throw new Error('Invalid plan revision');
  if (!Array.isArray(plan.history) || plan.history.length !== plan.revision) {
    throw new Error('Plan revision/history mismatch');
  }
  if (plan.history.at(-1)?.to !== plan.status) throw new Error('Plan status/history mismatch');
  for (const key of ['briefSha256', 'runSpecSha256']) {
    if (!/^[a-f0-9]{64}$/.test(plan.inputs?.[key] ?? '')) throw new Error(`Invalid ${key}`);
  }
  for (const entry of plan.history) {
    if (entry.evidence && !/^[a-f0-9]{64}$/.test(entry.evidence.sha256 ?? '')) {
      throw new Error('Invalid transition evidence hash');
    }
  }
  return plan;
}

function writePlan(path, plan) {
  validatePlan(plan);
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(plan, null, 2)}\n`, { mode: 0o600 });
  renameSync(temporary, path);
}

function verifyIndexedFiles(project, plan) {
  const paths = [
    [plan.inputs.briefPath, plan.inputs.briefSha256],
    [plan.inputs.runSpecPath, plan.inputs.runSpecSha256],
    ...plan.history.filter((entry) => entry.evidence).map((entry) => [entry.evidence.path, entry.evidence.sha256]),
  ];
  for (const [relativePath, expectedHash] of paths) {
    const path = join(project, relativePath);
    assertRegularFile(path, 'Indexed file');
    if (sha256(path) !== expectedHash) throw new Error(`Indexed hash mismatch: ${relativePath}`);
  }
  return plan;
}

function withLock(project, operation) {
  const lockPath = join(project, 'plan.json.lock');
  let descriptor;
  try {
    descriptor = openSync(lockPath, 'wx', 0o600);
    writeFileSync(descriptor, `${JSON.stringify({ pid: process.pid, acquiredAt: new Date().toISOString() })}\n`);
  } catch (error) {
    throw new Error(`Workflow state is locked; reconcile ${lockPath}: ${error.message}`);
  }
  try {
    return operation();
  } finally {
    closeSync(descriptor);
    unlinkSync(lockPath);
  }
}

function init(options) {
  requireOptions(options, ['project', 'brief', 'run-spec']);
  const project = resolve(options.project);
  const brief = resolve(options.brief);
  const runSpec = resolve(options['run-spec']);
  assertRegularFile(brief, 'Brief');
  assertRegularFile(runSpec, 'RunSpec');
  mkdirSync(join(project, 'inputs'), { recursive: true });
  mkdirSync(join(project, 'bundle'), { recursive: true });
  mkdirSync(join(project, 'run'), { recursive: true });
  mkdirSync(join(project, 'evidence'), { recursive: true });

  return withLock(project, () => {
    const briefHash = sha256(brief);
    const runSpecHash = sha256(runSpec);
    const planPath = join(project, 'plan.json');
    if (existsSync(planPath)) {
      const { plan } = readPlan(project);
      verifyIndexedFiles(project, plan);
      if (plan.inputs.briefSha256 !== briefHash || plan.inputs.runSpecSha256 !== runSpecHash) {
        throw new Error('Existing project input hashes differ; choose a new project root');
      }
      return plan;
    }

    copyFileSync(brief, join(project, 'BRIEF.md'));
    copyFileSync(runSpec, join(project, 'inputs', 'run-spec.json'));
    const now = new Date().toISOString();
    const plan = {
      schemaVersion: 1,
      workflow: 'run-portable-agent',
      status: 'briefed',
      revision: 1,
      inputs: {
        briefPath: 'BRIEF.md',
        briefSha256: briefHash,
        runSpecPath: 'inputs/run-spec.json',
        runSpecSha256: runSpecHash,
      },
      history: [{ revision: 1, from: null, to: 'briefed', at: now, evidence: null }],
    };
    writePlan(planPath, plan);
    return plan;
  });
}

function advance(options) {
  requireOptions(options, ['project', 'to', 'evidence']);
  const project = resolve(options.project);
  const evidence = resolve(options.evidence);
  assertRegularFile(evidence, 'Evidence');
  return withLock(project, () => {
    const { path, plan } = readPlan(project);
    verifyIndexedFiles(project, plan);
    const next = options.to;
    if (!Object.hasOwn(FLOW, next)) throw new Error(`Unknown workflow status: ${next}`);
    if (!FLOW[plan.status].includes(next)) throw new Error(`Invalid workflow transition: ${plan.status} -> ${next}`);
    const relativeEvidencePath = join('evidence', `${String(plan.revision + 1).padStart(3, '0')}-${basename(evidence)}`);
    const retainedEvidence = join(project, relativeEvidencePath);
    copyFileSync(evidence, retainedEvidence);
    const revision = plan.revision + 1;
    const updated = {
      ...plan,
      status: next,
      revision,
      history: [
        ...plan.history,
        {
          revision,
          from: plan.status,
          to: next,
          at: new Date().toISOString(),
          evidence: { path: relativeEvidencePath, sha256: sha256(retainedEvidence) },
        },
      ],
    };
    writePlan(path, updated);
    return updated;
  });
}

function check(options) {
  requireOptions(options, ['project']);
  const project = resolve(options.project);
  const { plan } = readPlan(project);
  return verifyIndexedFiles(project, plan);
}

const { command, options } = parseArgs(process.argv.slice(2));
let result;
if (command === 'init') result = init(options);
else if (command === 'advance') result = advance(options);
else if (command === 'check') result = check(options);
else throw new Error('Usage: workflow-state.mjs <init|advance|check> --project DIR [--brief PATH --run-spec PATH | --to STATUS --evidence PATH]');
process.stdout.write(`${JSON.stringify({ status: result.status, revision: result.revision }, null, 2)}\n`);
