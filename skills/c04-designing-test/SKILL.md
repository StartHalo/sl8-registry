---
name: c04-designing-test
description: Designs a test for one change on a micro-SaaS's site or trial - the hypothesis, the arithmetic for its traffic (tier, visitors per arm, weeks), the route (A/B test, preference test, or ship and measure before and after), primary, secondary and guardrail measures, and a decision rule set before shipping. Use when a founder asks how to test a change, whether they can A/B test it, or how they will know a change worked.
---

# Designing a test for one change

One job, one deliverable: `artifacts/<product>/tests/<change>.md`. `<product>` is the product's name in
lower case, with hyphens (the `project` that `inputs.mjs` prints); `<change>` is a short slug of the
change (`pricing-headline`). Run the scripts from this skill's folder: `S=~/.claude/skills/c04-designing-test`.

**Required:** the change, in words or as a change ID (C1, C2 …) from the trial-path review. Without it
there is no job. **Assumed when missing, and listed under Assumptions:** the product (from the change
or the project), the baseline conversion (2%, an example rate), visitors per week (500, an example)
and the lift worth detecting (20%). The founder's own figures always replace the examples.

A test design says how to find out whether the change worked; it never builds the change or runs the test.

## Workflow (copy into your task list and tick)
- [ ] 1. Save the request word for word with the Write tool to `artifacts/<product>/inputs/request-test.md`
        (use `artifacts/new-project/` until you know the product).
- [ ] 2. Check inputs: `node $S/scripts/inputs.mjs artifacts/<product>/inputs/request-test.md`.
        If the change is missing, read `artifacts/profile.md` (create nothing), then skip to step 8 with
        `"state":"waiting"`, one open decision (`{"text":"Send the change to test","state":"open","needs":"change"}`)
        and no deliverables, then reply with the script's `say` line and end `partial`. Never write a test design without a change.
        Otherwise keep the `assume` list and the `run` line it prints.
- [ ] 3. Read `artifacts/profile.md` and `artifacts/<product>/STATUS.md` if they exist. When no product is
        named, use the project under `artifacts/` whose `STATUS.md` is newest, if any. For a change ID, read
        that change's row (page, now, change, evidence) from `artifacts/<product>/trial-path-review.md`; if
        there is no review or no such ID, the change is missing: take the partial path of step 2.
        Use the founder's figures from the request or the profile before any example rate.
        To quote what is there now, use the review's `pages/` when it has the page; otherwise open the page
        with the web fetch tool when a URL is known; if neither, describe the change and say the current
        words were not read.
- [ ] 4. Run the arithmetic: `node $S/scripts/stats.mjs plan --baseline <rate> --visitors-per-week <n> --lift <rate>`
        (the `run` line from step 2, with any figure from step 3). Copy the tier, conversions per 4 weeks,
        visitors per arm and weeks exactly.
- [ ] 5. Choose the route from the weeks with [reference/method.md](reference/method.md) §3: never an A/B
        test over 8 weeks; at 8 or fewer and a medium or high tier, an A/B test.
- [ ] 6. Write the test design from [reference/template.md](reference/template.md), matching
        [the example](reference/examples/good-1.md); the `ref-` examples show published plans and a bad one.
        The hypothesis names its evidence (a quoted page, the founder's figure, or the review's finding).
        For every input on the `assume` list write `- **<label>:** not given. Assumed <what>. Send <what> to replace it.`
        When every input was given, write `- None: every input was given.` Never leave [TBD].
- [ ] 7. Validate: `node $S/scripts/validate.mjs artifacts/<product>/tests/<change>.md --request artifacts/<product>/inputs/request-test.md`.
        Fix every error and rerun until `ok` is true.
- [ ] 8. Update the project status. Write `artifacts/<product>/inputs/job-test.json`:
        `{"job":"test-design","what":"<product>: conversion","state":"active","context":{"change tested":"…","route":"…","weeks":"…","decision date":"<the date the rule is read, or 'after 4 full weeks from shipping'>"},"decisions":[…one per Assumptions line that asks for something, and "Ship the change and note the date" each {"text","state":"open","needs"}],"deliverables":[{"name":"Test design: <change>","file":"<product>/tests/<change>.md"}]}`.
        Then run `node ~/.claude/skills/run-sl8-job/scripts/status.mjs --project <product> --record artifacts/<product>/inputs/job-test.json`.
        Add to `artifacts/profile.md` only figures the founder gave (traffic, conversion), never an example rate.
- [ ] 9. Reply in at most 8 lines: first answer the question the request asked, if any, in one line ("Can we A/B
        test it?": yes or no, with the weeks; "How do we know it works?": the route and the decision rule); then
        the route and why, the weeks, the decision rule, what you assumed, and the file.

## Rules
- `<product>` is also the project. When neither the request, the profile nor a project names a product, it is
  `new-project` for every path in this skill, and the Assumptions line for the product says so.
- Every figure about traffic, sample size or weeks comes from `stats.mjs`; never round or estimate by hand.
- An example rate is always labelled as an example and listed under Assumptions; it never goes in the profile.
- One change per design. A request with several changes designs the first and names the rest as not done.
- Never build the variant, change the site or run the test; never sign in to analytics. Only
  `artifacts/<product>/` and `artifacts/profile.md` are written. Never delete files.
