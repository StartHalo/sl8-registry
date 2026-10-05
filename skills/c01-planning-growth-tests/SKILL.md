---
name: c01-planning-growth-tests
description: Plans the next quarter's growth tests for a consumer health or wellness app as a 10-row experiment backlog - hypothesis, segment, channel, metric with a target, ICE score, cost, owner and start week - within the person's budget and toward their dated goal. Use when the person asks what to test next, for growth experiments or a test backlog, or how to reach a growth goal this quarter.
---

# Planning growth tests

One job, one deliverable: `artifacts/<app>/growth-tests.md`. `<app>` is the app's name in lower case,
with hyphens. Run the scripts from this skill's folder: `S=~/.claude/skills/c01-planning-growth-tests`.

**Required:** the app; without it there is no job. **Assumed when missing, and listed under Assumptions:** the goal (propose one, marked `(proposed)`), the budget (0: team time only), channels allowed. **Read when it exists:** the ICP (`artifacts/<app>/icp.md`).

## Workflow (copy into your task list and tick)
- [ ] 1. Save the request word for word with the Write tool to `artifacts/<app>/inputs/request-growth-tests.md`.
- [ ] 2. Check inputs: `node $S/scripts/inputs.mjs artifacts/<app>/inputs/request-growth-tests.md`.
        If the app is missing, do step 3 (profile only), then skip to step 7 with `"state":"waiting"` and one open decision per
        missing input (`{"text":"Send <input>","state":"open","needs":"<input>"}`) and no deliverables,
        then reply with the script's `say` line and end `partial`. A partial job writes only the request,
        the profile, its job record and (through the script) `STATUS.md`; never the deliverable.
        Otherwise do the job: keep the `assume` list it prints. Each input on it gets an Assumptions line in step 5.
        Its `budget` is the request's budget, or 0 when none was given: then every test costs 0.
- [ ] 3. Read `artifacts/profile.md` and `artifacts/<app>/icp.md` if they exist. Read `artifacts/<app>/STATUS.md` if it exists: use its stored context, and
        any decision the person has since answered (an answer in the request closes it).
        Use the ICP's segments; otherwise use the segments the request names. Update the profile with
        only what the person said.
- [ ] 4. Open the app's store page(s) from the request, to ground the tests in what the app has today.
- [ ] 5. Draft from [reference/template.md](reference/template.md). Match
        [the examples](reference/examples/). Follow [reference/rules.md](reference/rules.md).
        For every input on the `assume` list, write an Assumptions line that starts with its label:
        `- **<label>:** not given. Assumed <what>. Send <what> to replace it.` Never leave [TBD].
- [ ] 6. Validate: `node $S/scripts/validate.mjs artifacts/<app>/growth-tests.md --request artifacts/<app>/inputs/request-growth-tests.md`.
        Fix every error and rerun until `ok` is true.
- [ ] 7. Update the project status. Write `artifacts/<app>/inputs/job-growth-tests.json`:
        `{"job":"plan-growth-tests","what":"<app>: marketing","state":"active","context":{"goal":"…","budget":"…","tests":"10","top test":"…"},"decisions":[…what the person should send or decide, one per Assumptions line that asks for something, each {"text","state":"open","needs"}],"deliverables":[{"name":"Growth test backlog","file":"<app>/growth-tests.md"}]}`.
        Then run `node ~/.claude/skills/run-sl8-job/scripts/status.mjs --project <app> --record artifacts/<app>/inputs/job-growth-tests.json`.
- [ ] 8. Reply in at most 8 lines: the top 3 tests, the total cost against the budget, what you assumed,
        and the file.

## Rules
- `<app>` is also the project: the status script's `--project` is `<app>`. When the request names no app, `<app>` is `new-project` (the partial path only).
- Segments come from the ICP if it exists, else the request, else the store page (cited), else your assumption under Assumptions with what to send. Say which.
- The plan runs from next Monday to the goal's date, in weeks W1–W13 (at most 13 weeks; if the goal is further off, the 13 weeks are the first stretch toward it, and the reply says so). The budget covers the plan. State the dates.
- Team time costs 0. Only money comes out of the budget.
- If no store page is given or it will not open, say so under Assumptions and work from the request.
- Never invent a baseline or result. A target is a goal for the test, marked as such. A baseline you
  don't have goes under Assumptions, with what to send.
- Never spend, post or contact anyone. The owner column names a role, never a person.
- Only `artifacts/<app>/` and `artifacts/profile.md` are written. Never delete files.
