---
name: c03-briefing-launch
description: Briefs a small B2B SaaS's feature or integration launch on one page - objective, one proposition, reasons to believe, audience, a KPI with a number and a date, channels including the integration partner's, actions before, on and after launch day with owner, the founder's hours and cost, a budget and what is out of scope. Use when a founder asks to plan or brief the launch of a feature, an integration or a new plan.
---

# Briefing a feature or integration launch

One job, one deliverable: `artifacts/<product>/launch-brief.md`. `<product>` is the product's name in
lower case, with hyphens; it is also the project. Run the scripts from this skill's folder:
`S=~/.claude/skills/c03-briefing-launch`.

**Required:** what launches; without it there is no job. **Assumed when missing, and listed under
Assumptions:** the product (from the profile or what launches), the launch date (6 weeks from today,
marked `(assumed)`), the audience (the ICP's primary segment, else from the site), the budget (0:
owned channels and the founder's time only), the founder's hours (the profile's, else the project
status's, else 5 a week), the partner (from what launches). **Read when they exist:** `icp.md` and
`channel-tests.md`.

## Workflow (copy into your task list and tick)
- [ ] 1. Save the request word for word with the Write tool (not a shell command) to `artifacts/<product>/inputs/request-launch.md`.
- [ ] 2. Check inputs: `node $S/scripts/inputs.mjs artifacts/<product>/inputs/request-launch.md`.
        If what launches is missing, read `artifacts/profile.md` if it exists (do not create or change it), then skip to step 8's status record (leave the profile as it is) with `"state":"waiting"`,
        one open decision (`{"text":"Send what is launching","state":"open","needs":"what_launches"}`) and no deliverables,
        then reply with the script's `say` line and end `partial`. Never write the brief without it.
        Otherwise keep the `assume` list it prints: each input on it gets an Assumptions line in step 6 and one progress
        report, all in one command: `~/.sl8/bin/report assumption "<label>: <what you assume>"`.
        Its `budget` and `hours` are the request's; when null, the budget is 0, and the founder hours come from the profile,
        else from the project status's stored context, else 5.
- [ ] 3. Read `artifacts/profile.md`, `artifacts/<product>/STATUS.md`, `icp.md` and `channel-tests.md` if they exist.
        The audience is one group: the ICP's primary segment when what launches serves it. A value taken from an earlier job
        keeps the source STATUS.md records for it (its "From" job, and whether that job was given it or assumed it); say
        that, never a guess. The channel tests' weeks share the founder's hours with the launch weeks.
- [ ] 4. Read word for word the product's pages for the reasons to believe and, for an integration, the partner's
        marketplace or partner pages for its listing rules and lead times:
        `node $S/scripts/page.mjs "<link>" --out artifacts/<product>/sources` (it prints each site's links). WebSearch may
        find a page; read it with page.mjs before you cite it or state what it says: a search result's title is not a read.
        Never use the page tool (WebFetch) for a fact or a quote. A page that will not open:
        `~/.sl8/bin/report obstacle "<page> did not open" "<what you do instead>"`, and an Assumptions line.
- [ ] 5. Follow [reference/method.md](reference/method.md). Plan the actions so that each week's founder hours, plus the channel
        tests' hours in that week when `channel-tests.md` exists, stay within the founder's hours. Where the tests leave too
        little, move the work to a week with room or to someone else first. If a week still does not fit, say so: write the
        hours the launch needs as the header's founder hours, marked `(assumed)`, with an Assumptions line and an open decision
        naming the weeks and the choice (find the hours, or pause a named test in those weeks). Never hide an overbooked week.
- [ ] 6. Write `launch-brief.md` with the Write tool from [reference/template.md](reference/template.md); match
        [the example](reference/examples/good-1.md), written from the pages page.mjs saved
        ([page-1](reference/examples/page-1.md), [page-2](reference/examples/page-2.md)); the `ref-` examples show real
        launch templates, partner guidance and a bad brief. Follow [reference/rules.md](reference/rules.md). For every input on
        the `assume` list, write `- **<label>:** not given. Assumed <what>. Send <what> to replace it.` When every input was given
        and nothing else was assumed, write `- None: every input was given.`; any other assumption (a page that would not open, a
        lead time no page states) gets its own line instead. Never leave [TBD].
- [ ] 7. Validate: `node $S/scripts/validate.mjs artifacts/<product>/launch-brief.md --request artifacts/<product>/inputs/request-launch.md`.
        It adds the channel tests' hours to the same weeks, and looks for every quotation in the saved pages and the request.
        Fix every error and rerun until `ok` is true.
- [ ] 8. Update the profile and the project status. Create or update `artifacts/profile.md` with only what the founder said
        in the request (product, website, founder hours, the budget's currency). Write `artifacts/<product>/inputs/job-launch.json`:
        `{"job":"brief-launch","what":"<product>: marketing","state":"active","context":{"what launches":"…","launch date":"… (given | assumed)","KPI":"… (given | proposed)"},"decisions":[…one per Assumptions line that asks the founder for something, each {"text","state":"open","needs"}],"deliverables":[{"name":"Launch brief","file":"<product>/launch-brief.md"}]}`.
        Then run `node ~/.claude/skills/run-sl8-job/scripts/status.mjs --project <product> --record artifacts/<product>/inputs/job-launch.json`.
- [ ] 9. Reply with exactly these lines, filled in: at most 8, no code block, nothing else (the brief is in the file):
        ```
        Launch brief for <what launches>, <launch date>: artifacts/<product>/launch-brief.md
        Proposition: <one sentence>
        KPI: <metric>: <number> by <date>
        Launch day: <the L0 actions, in a few words>
        Budget: <total> of <budget>; at most <peak> founder hours in a week, channel tests included
        Assumed: <the labels of the Assumptions lines>, or nothing
        ```
        End `delivered` when the brief is saved and valid; `partial` only when what launches is missing (step 2).

## Rules
- `<product>` is also the project (`--project`): from the request, else the profile, else what launches; else `new-project` (the partial path only).
- With no target in the request, propose the KPI's number, mark it `(proposed)`, and put the baseline to send under Assumptions.
- When the partner's saved pages give no lead time, assume 4 weeks for a listing review, say so under Assumptions, and start the listing work at least that early.
- The launch date is the founder's. An assumed date is marked `(assumed)`; never present it as decided.
- A partner's asks (a listing, a partner email or post) are requests the founder makes; give their due dates, never promise them.
- Every fact comes from a page page.mjs saved in this job, the request, or an earlier deliverable of this project. A search
  result's title or snippet, the page tool's summary and memory are not sources: leave the fact out, or state it under Assumptions.
- Quotation marks hold only words copied exactly from a saved page or the request. Titles, phrases and names you propose go
  in italics. A link you cite is a page page.mjs saved, or one the request gives.
- The channels and actions serve the objective's one group: no email to existing customers in a brief for new trials, unless
  the brief says why.
- If a page will not open, the reasons to believe come from the request, and that is said under Assumptions.
- Never post, send, spend or contact a partner or customer. Only `artifacts/<product>/` and `artifacts/profile.md`
  are written. Never delete files.
- `scripts/lib.mjs` holds the parsing that `inputs.mjs` and `validate.mjs` share; read it only to understand an error, never run it.
  `scripts/page.mjs` is run (step 4); the validator also uses its checks.
