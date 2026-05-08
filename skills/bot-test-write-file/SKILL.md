---
name: bot-test-write-file
description: Test skill — write a named file with supplied content under the project's artifacts directory. Cheaper than real skills; for W18 verification only. Reads filename and content from the prompt; does not invoke LLM tools.
---

# Test Write File (BOT-TEST)

Lightweight test skill for the W18 live-test checklist. Wraps a single `Write` call to a Phase-7-compliant artifact path so we can verify the registry-skill install path, manifest rendering, and selectedSkill round-trip without the cost of a real skill.

## What it does

The user's prompt specifies (in any natural form):

- **filename** — base name of the file to create (no path, no extension). Required.
- **content** — body to write into the file. Required.
- **format** (optional, default `markdown`) — either `markdown` or `plaintext`.

Then this skill:

1. Validates `filename`. Skip if it contains `/` or `..` — return a clean error like `Invalid filename: <reason>` instead of writing.
2. Writes `/home/user/artifacts/<project-name>/<filename>.md` (or `.txt` for `plaintext`) with `content` as the body.
3. For markdown, prepends a small frontmatter header:
   ```
   ---
   generated_by: bot-test-write-file
   timestamp: <ISO-8601>
   ---
   ```
   For plaintext, writes `content` verbatim.
4. Updates `memory/summary.md` and `memory/index.md` per the standard memory contract.
5. Replies with one line: `Wrote artifacts/<project-name>/<filename>.{md|txt} (N bytes)`.

## Output paths

All outputs MUST land under `/home/user/artifacts/<project-name>/` (Phase 7 `output-validator.py` blocks anything else):

- `artifacts/<project>/<filename>.md` (or `.txt` if `format=plaintext`) — the requested file
- `memory/summary.md` (mandatory, written via `Write` not `Edit`)
- `memory/index.md` (one-line append): `- **YYYY-MM-DD**: \`<project>\` (skill: \`bot-test-write-file\`) — Wrote <filename>`

## Example invocation

```
ExecuteJob({
  skillId: "bot-test-write-file",
  prompt: "Write a file named 'greeting' with the content 'Hello, W18.'"
})
```

→ creates `/home/user/artifacts/<project>/greeting.md` with `Hello, W18.` as the body.

## Execution notes for the inner CLI

- Use `Write` not `Edit` for `summary.md` (tracked by the Stop hook — `memory-stop.py` only counts `Write`).
- Do not call web/LLM tools; just `Write`.
- Total turns expected: ≤ 5.
