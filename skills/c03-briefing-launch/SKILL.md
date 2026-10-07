---
name: c03-briefing-launch
description: Briefs a small B2B SaaS's feature or integration launch on one page - objective, one proposition, reasons to believe, audience, a KPI with a number and a date, channels including the integration partner's, actions before, on and after launch day with owner, the founder's hours and cost, a budget and what is out of scope. Use when a founder asks to plan or brief the launch of a feature, an integration or a new plan.
---

# Briefing a feature or integration launch

One job, one deliverable: `artifacts/<product>/launch-brief.md`. `<product>` is the product's name in
lower case, with hyphens. Run the scripts from this skill's folder: `S=~/.claude/skills/c03-briefing-launch`.

**Required:** what launches; without it there is no job. **Assumed when missing, and listed under
Assumptions:** the product (from the profile or what launches), the launch date (6 weeks from today,
marked `(assumed)`), the audience (the ICP's primary segment, else from the site), the budget (0:
owned channels and the founder's time only), the founder's hours (5 a week), the partner (from what
launches). **Read when they exist:** `icp.md` and `channel-tests.md`.

## Workflow (copy into your task list and tick)
- [ ] 1. Save the request word for word with the Write tool to `artifacts/<product>/inputs/request-launch.md`.
- [ ] 2. Check inputs: `node $S/scripts/inputs.mjs artifacts/<product>/inputs/request-launch.md`.
        If what launches is missing, read `artifacts/profile.md` if it exists (do not create or change it), then skip to step 7 with `"state":"waiting"`,
        one open decision (`{"text":"Send what is launching","state":"open","needs":"what_launches"}`) and no deliverables,
        then reply with the script's `say` line and end `partial`. Never write the brief without it.
        Otherwise keep the `assume` list it prints. Each input on it gets an Assumptions line in step 5.
        Its `budget` and `hours` are the request's; when null, use 0 and 5 and say so under Assumptions.
- [ ] 3. Read `artifacts/profile.md`, `artifacts/<product>/STATUS.md`, `icp.md` and `channel-tests.md` if they exist.
        The audience is one group, the ICP's primary segment when it exists. Update the profile with only what the founder said.
- [ ] 4. Open the product's site for the reasons to believe, and, for an integration, the partner's marketplace or
        partner pages for its listing rules and lead times. Note each link.
- [ ] 5. Follow [reference/method.md](reference/method.md). Draft from [reference/template.md](reference/template.md);
        match [the example](reference/examples/good-1.md); the `ref-` examples show real launch templates, partner guidance
        and a bad brief. Follow [reference/rules.md](reference/rules.md). For every input on the `assume` list, write
        `- **<label>:** not given. Assumed <what>. Send <what> to replace it.` When every input was given and nothing else was assumed, write
        `- None: every input was given.`; any other assumption (a page that would not open, a baseline not given) gets its own line instead Never leave [TBD].
- [ ] 6. Validate: `node $S/scripts/validate.mjs artifacts/<product>/launch-brief.md --request artifacts/<product>/inputs/request-launch.md`.
        Fix every error and rerun until `ok` is true.
- [ ] 7. Update the project status. Write `artifacts/<product>/inputs/job-launch.json`:
        `{"job":"brief-launch","what":"<product>: marketing","state":"active","context":{"what launches":"…","launch date":"…","KPI":"…"},"decisions":[…one per Assumptions line that asks the founder for something, each {"text","state":"open","needs"}],"deliverables":[{"name":"Launch brief","file":"<product>/launch-brief.md"}]}`.
        Then run `node ~/.claude/skills/run-sl8-job/scripts/status.mjs --project <product> --record artifacts/<product>/inputs/job-launch.json`.
- [ ] 8. Reply in at most 8 lines: the proposition, the KPI, the launch-week actions, the budget, what you assumed,
        and the file.

## Rules
- `<product>` is also the project (`--project`): from the request, else the profile, else what launches; else `new-project` (the partial path only).
- With no target in the request, propose the KPI's number, mark it `(proposed)`, and put the baseline to send under Assumptions.
- When the partner's pages give no lead time, assume 4 weeks for a listing review, say so under Assumptions, and start the listing work at least that early.
- The launch date is the founder's. An assumed date is marked `(assumed)`; never present it as decided.
- A partner's asks (a listing, a partner email or post) are requests the founder makes; give their due dates, never promise them.
- If a page will not open, the reasons to believe come from the request, and that is said under Assumptions.
- Never post, send, spend or contact a partner or customer. Only `artifacts/<product>/` and `artifacts/profile.md`
  are written. Never delete files.
- `scripts/lib.mjs` holds the parsing that `inputs.mjs` and `validate.mjs` share; read it only to understand an error, never run it.
