---
name: bot-test-echo
description: Test skill — echo the user's prompt to an artifact file and update memory. Use only for W18 verification; produces no real output. Cheapest possible execution path.
---

# Test Echo (BOT-TEST)

Lightweight test skill for the W18 live-test checklist. Does no LLM-heavy work — just deterministic file I/O and memory updates so we can verify the manifest, hooks, and orchestrator wiring without the per-message cost of real skills.

## What it does

1. Reads the incoming prompt.
2. Writes a copy to `/home/user/artifacts/<project-name>/echo.md` with a small frontmatter block (timestamp + skill name).
3. Updates `/home/user/memory/summary.md` and appends a one-liner to `/home/user/memory/index.md`.
4. Replies with one line: `Echoed N chars to artifacts/<project-name>/echo.md`.

## Output paths

All outputs MUST land under `/home/user/artifacts/<project-name>/` (Phase 7 `output-validator.py` blocks anything else):

- `artifacts/<project>/echo.md` — the echoed prompt with a timestamp header

## Memory contract (mandatory)

- Update `memory/summary.md` via the `Write` tool (not `Edit` — `memory-stop.py` only counts `Write`).
- Append one line to `memory/index.md`: `- **YYYY-MM-DD**: \`<project>\` (skill: \`bot-test-echo\`) — Echoed prompt`.

## Execution notes for the inner CLI

- Use `Write` not `Edit` for `summary.md` (tracked by the Stop hook).
- Do not call any web tools, do not invoke the model for paraphrasing — just echo.
- Total turns expected: ≤ 6.
