---
name: portable-agent-bundle
description: >
  Assemble and verify one canonical SL8 bot context for execution through any supported harness.
  Use whenever a task needs AGENTS.md/CLAUDE.md portability, setup/user/memory prompt layering,
  complete skill projection, an immutable bundle archive, or bundle/effective-skill receipts—even
  if the user only says “run this bot with Codex instead of Claude” or “why is this skill missing
  in Cursor/OpenCode?” Do not use to choose a provider/model tuple; use harness-selection for that.
---

# Portable agent bundle

Build one immutable run input from canonical files. Harness-specific directories are projections,
not independent copies an author may edit. This matters because a bot that changes when the
harness changes is multiple bots disguised as portability.

## Inputs

- canonical bot root containing `AGENTS.md`;
- optional byte-identical generated `CLAUDE.md`;
- optional `setup.md`, `user.md`, and controller-supplied memory context;
- complete `skills/<name>/...` closure selected by the bot definition;
- already-selected exact harness, provider, model, budget, and conservative agent name;
- empty staging directory and archive path outside it.

If `CLAUDE.md` differs from `AGENTS.md`, stop with `INSTRUCTION_DRIFT`; regenerate the projection
instead of choosing one. Reject symlinks, hard links, path escapes, a non-empty staging directory,
unsafe identifiers, or a budget without an exact model.

## Assemble

```bash
sl8-harness prepare \
  --source "$BOT_ROOT" \
  --staging "$STAGING_ROOT" \
  --archive "$ARCHIVE_PATH" \
  --harness "$HARNESS_ID" \
  --provider "$PROVIDER_ID" \
  --model "$MODEL_ID" \
  --agent-name "$AGENT_NAME" \
  --runtime-context-file "$RUNTIME_CONTEXT_FILE" \
  --max-cost "$MAX_COST_USD"
```

Omit only optional arguments that are genuinely absent. Never interpolate values from untrusted
files into a shell string; pass resolved arguments from the controller.

The effective system layer order is fixed:

1. process — canonical `AGENTS.md`;
2. setup — domain/persona configuration;
3. user — user context;
4. memory — controller-loaded runtime context;
5. task — sent as the turn, never buried inside the system prompt.

The package always writes canonical `skills/`. It additionally projects the full closure into the
certified native directory for Claude, Codex, Cursor, or OpenCode where applicable. A harness with
no certified native directory consumes the canonical Omnigent view. Never project only
`SKILL.md`; scripts, assets, schemas, and other skill files are part of the closure.

## Verify before launch

Read `output/skills.json` and the prepare result. Require:

- `canonicalInstructions` is `AGENTS.md` and `assembledInstructions` is `SL8_SYSTEM.md`;
- requested, discovered, and projected skill names match the declared closure exactly;
- every skill file has byte count and SHA-256; `closureSha256` is 64 lowercase hex characters;
- projection targets agree with the selected harness;
- config pins the selected harness/provider/model and exact budget;
- archive SHA-256 and bundle receipt are persisted with the RunSpec.

`invoked: []` is correct before execution. Presence is not effectiveness. Only the runtime
`skills-effective.json` plus normalized `skill.invoked` events may claim a skill was used.

## Output

Return or persist:

- immutable bundle archive and SHA-256;
- bundle receipt and skill-closure digest;
- effective prompt layer hashes;
- projected targets and any explicit limitation;
- no credential values.

Fail closed. Do not launch from a partial receipt, repair a drifted projection in staging, or infer
that a skill worked merely because its directory exists.
