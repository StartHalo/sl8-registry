---
name: c03-planning-channel-tests
description: Plans a small B2B SaaS's channel tests for the next 13 weeks with Bullseye - all 19 traction channels ranked A, B or C with a reason, cheap tests from the A list with a threshold set now, each with its cost and the founder's hours a week, standing actions for review sites and integration marketplaces, and what to do when a test clears. Use when a founder asks which channels to test next quarter, where to find customers, or how to reach a trial or demo goal on a small budget.
---

# Planning channel tests

One job, one deliverable: `artifacts/<product>/channel-tests.md`. `<product>` is the product's name in
lower case, with hyphens. Run the scripts from this skill's folder: `S=~/.claude/skills/c03-planning-channel-tests`.

**Required:** the product (name and website); without it there is no job. **Assumed when missing, and
listed under Assumptions:** the goal (propose one, marked `(proposed)`), the budget (0: the founder's
time only), the founder's hours (5 a week), the ICP (the first job's `icp.md`, else the segment read
from the site, marked `(assumed)`).

## Workflow (copy into your task list and tick)
- [ ] 1. Save the request word for word with the Write tool to `artifacts/<product>/inputs/request-channel-tests.md`.
- [ ] 2. Check inputs: `node $S/scripts/inputs.mjs artifacts/<product>/inputs/request-channel-tests.md --icp artifacts/<product>/icp.md`.
        If the product is missing, read `artifacts/profile.md` if it exists (do not create or change it), then skip to step 7 with `"state":"waiting"`,
        one open decision (`{"text":"Send your product's name and website","state":"open","needs":"product"}`) and no
        deliverables, then reply with the script's `say` line and end `partial`. Never write the plan without the product.
        Otherwise keep the `assume` list it prints. Each input on it gets an Assumptions line in step 5.
        Its `budget` and `hours` are the request's; when null, use 0 and 5 and say so under Assumptions.
- [ ] 3. Read `artifacts/profile.md`, `artifacts/<product>/STATUS.md` and `artifacts/<product>/icp.md` if they exist.
        Use the ICP's primary segment and where to reach it. Update the profile with only what the founder said.
- [ ] 4. Open the product's site and pricing page: the price and the sales motion (trial or demo) limit which
        channels can pay ([reference/channels.md](reference/channels.md)).
- [ ] 5. Follow [reference/method.md](reference/method.md): rank all 19 channels, pick tests from the A list,
        set each threshold now. Draft from [reference/template.md](reference/template.md); match
        [the example](reference/examples/good-1.md); the `ref-` examples show the method and a plan told too late.
        Follow [reference/rules.md](reference/rules.md). For every input on the `assume` list, write
        `- **<label>:** not given. Assumed <what>. Send <what> to replace it.` When every input was given and nothing else was assumed, write
        `- None: every input was given.`; any other assumption (a page that would not open, a baseline not given) gets its own line instead Never leave [TBD].
- [ ] 6. Validate: `node $S/scripts/validate.mjs artifacts/<product>/channel-tests.md --request artifacts/<product>/inputs/request-channel-tests.md --icp artifacts/<product>/icp.md`.
        Fix every error and rerun until `ok` is true.
- [ ] 7. Update the project status. Write `artifacts/<product>/inputs/job-channel-tests.json`:
        `{"job":"plan-channel-tests","what":"<product>: marketing","state":"active","context":{"goal":"…","budget":"…","founder hours":"…","first test":"…"},"decisions":[…one per Assumptions line that asks the founder for something, each {"text","state":"open","needs"}],"deliverables":[{"name":"Channel test plan","file":"<product>/channel-tests.md"}]}`.
        Then run `node ~/.claude/skills/run-sl8-job/scripts/status.mjs --project <product> --record artifacts/<product>/inputs/job-channel-tests.json`.
- [ ] 8. Reply in at most 8 lines: the A channels, the first test and its threshold, the cost against the budget,
        what you assumed, and the file.

## Rules
- `<product>` is also the project (`--project`). When the request names no product, `<product>` is `new-project` (the partial path only).
- W1 is the first Monday of the quarter the request or the goal's date points to ("next quarter" is the next calendar quarter); with no quarter at all, next Monday. W13 is 12 weeks after W1. State the dates.
- The product must be named in the request; a product in the profile does not stand in for it. The `--icp` file may not exist yet: that is fine, the script then lists the ICP as assumed.
- With a budget of 0, a paid channel can still rank A, but its test must cost 0 (or wait for a budget, said under Assumptions).
- Never invent a baseline, traffic figure or keyword volume. A figure you do not have is left out, or labelled
  an estimate with its source, and the baseline to send goes under Assumptions.
- If the site will not open, say so under Assumptions and work from the request and the ICP.
- Never spend, post, send or contact anyone; the plan says what the founder does. Only `artifacts/<product>/`
  and `artifacts/profile.md` are written. Never delete files.
- `scripts/lib.mjs` holds the parsing that `inputs.mjs` and `validate.mjs` share; read it only to understand an error, never run it.
