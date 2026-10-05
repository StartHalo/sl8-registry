---
name: c01-briefing-launch-campaign
description: Briefs a launch campaign for a consumer health or wellness app or a new feature as a one-page campaign brief - objective, one single-minded proposition, three reasons to believe, audience, a KPI with a number and a date, at most three channels, a budget split, deliverables and what is out of scope. Use when the person asks to plan or brief the launch of an app, a relaunch or a feature, or for a campaign brief.
---

# Briefing a launch campaign

One job, one deliverable: `artifacts/<app>/campaign-brief.md`. `<app>` is the app's name in lower case,
with hyphens. Run the scripts from this skill's folder: `S=~/.claude/skills/c01-briefing-launch-campaign`.

**Required:** what launches; without it there is no job. **Assumed when missing, and listed under Assumptions:** the launch date (6 weeks from today, marked `(assumed)`), the audience (the ICP's primary segment, else from the store page, else your assumption), the budget (0: owned channels and team time only). **Read when they exist:** the ICP and the growth tests.

## Workflow (copy into your task list and tick)
- [ ] 1. Save the request word for word with the Write tool to `artifacts/<app>/inputs/request-campaign.md`.
- [ ] 2. Check inputs: `node $S/scripts/inputs.mjs artifacts/<app>/inputs/request-campaign.md`.
        If what launches is missing, do step 3 (profile only), then skip to step 7 with `"state":"waiting"` and one open decision per
        missing input (`{"text":"Send <input>","state":"open","needs":"<input>"}`) and no deliverables,
        then reply with the script's `say` line and end `partial`. A partial job writes only the request,
        the profile, its job record and (through the script) `STATUS.md`; never the deliverable.
        Otherwise do the job: keep the `assume` list it prints. Each input on it gets an Assumptions line in step 5.
        Its `budget` is the request's budget, or 0 when none was given: then every budget line is 0.
- [ ] 3. Read `artifacts/profile.md`, `artifacts/<app>/icp.md` and `artifacts/<app>/growth-tests.md`
        if they exist. Read `artifacts/<app>/STATUS.md` if it exists: use its stored context, and
        any decision the person has since answered (an answer in the request closes it). The audience is one segment, the ICP's primary one when it exists. Update the
        profile with only what the person said.
- [ ] 4. Open the app's store page(s) from the request, for the reasons to believe.
- [ ] 5. Draft from [reference/template.md](reference/template.md). Match
        [the examples](reference/examples/). Follow [reference/rules.md](reference/rules.md).
        For every input on the `assume` list, write an Assumptions line that starts with its label:
        `- **<label>:** not given. Assumed <what>. Send <what> to replace it.` Never leave [TBD].
- [ ] 6. Validate: `node $S/scripts/validate.mjs artifacts/<app>/campaign-brief.md --request artifacts/<app>/inputs/request-campaign.md`.
        Fix every error and rerun until `ok` is true.
- [ ] 7. Update the project status. Write `artifacts/<app>/inputs/job-campaign.json`:
        `{"job":"brief-launch-campaign","what":"<app>: marketing","state":"active","context":{"launch":"…","launch date":"…","KPI":"…"},"decisions":[…what the person should send or decide, one per Assumptions line that asks for something, each {"text","state":"open","needs"}],"deliverables":[{"name":"Launch campaign brief","file":"<app>/campaign-brief.md"}]}`.
        Then run `node ~/.claude/skills/run-sl8-job/scripts/status.mjs --project <app> --record artifacts/<app>/inputs/job-campaign.json`.
- [ ] 8. Reply in at most 8 lines: the proposition, the KPI, the channels and budget, what you assumed,
        and the file.

## Rules
- `<app>` is the app's name from the request or profile, else the launch's product name, else `new-project` (the partial path only). It is also the status script's `--project`.
- With no goal in the request, propose the KPI for this launch and mark it `(proposed)`; its baseline goes under Assumptions.
- The brief is not the growth backlog: when both exist, the brief picks one proposition, it does not repeat the tests.
- If no store page is given or it will not open, the reasons to believe come from the request only, and that is said under Assumptions.
- Never invent a result, price, date or partner. Use what the person gave or a page you opened, and put
  the rest under Assumptions with what to send.
- Never post, spend, book media or contact anyone. The brief is for the person's team or agency.
- Only `artifacts/<app>/` and `artifacts/profile.md` are written. Never delete files.
