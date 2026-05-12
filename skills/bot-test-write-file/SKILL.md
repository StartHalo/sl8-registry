---
name: bot-test-write-file
description: Test skill — write a named file with supplied content under the project's artifacts directory. Exercises Phase 3 manifest (inputs/outputs/parameters) and Phase 13 tool-examples rendering. Use for W18 verification only.
metadata:
  author: sl8
  version: 1.1.0
  type: bot-test
  inputs:
    - name: filename
      type: string
      required: true
      description: Base name of the file to create (without path or extension)
    - name: content
      type: markdown
      required: true
      description: The body to write into the file
  outputs:
    - name: file
      type: markdown
      path: artifacts/<project>/{filename}.md
  parameters:
    - name: format
      type: string
      default: markdown
      enum: [markdown, plaintext]
  example-invocation: |
    ExecuteJob({
      skillId: "bot-test-write-file",
      prompt: "Write a file named 'greeting' with the content 'Hello, W18.'"
    })
---

# Test Write File (BOT-TEST)

Lightweight test skill for the W18 live-test checklist. Wraps a single `Write` call to a Phase-7-compliant artifact path so we can verify manifest rendering, `<tool_examples>` injection, and selectedSkill round-trip without the cost of a real skill.

## What it does

1. Resolves `filename` and `content` from the prompt (or the `inputs` block if explicitly threaded by the orchestrator).
2. Writes `/home/user/artifacts/<project-name>/<filename>.md` with `content` as the body. Adds a small frontmatter header (`generated_by: bot-test-write-file`, ISO timestamp).
3. If `format=plaintext`, drops the markdown header and writes the body verbatim.
4. Replies with one line: `Wrote artifacts/<project-name>/<filename>.md (N bytes)`.

## Output paths

- `artifacts/<project>/<filename>.md` (or `.txt` if `format=plaintext`) — the requested file

## Execution notes

- Total turns expected: ≤ 5.
- Do not call web/LLM tools; just `Write`.
- Skip if `filename` contains `/` or `..` — return a clean error to the orchestrator instead of writing.
