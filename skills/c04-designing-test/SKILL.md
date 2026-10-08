---
name: c04-designing-test
description: Designs a test for one change on a micro-SaaS's site or trial - the hypothesis, the arithmetic for its traffic (tier, visitors per arm, weeks), the route (A/B test, preference test, or ship and measure before and after), primary, secondary and guardrail measures, and a decision rule set before shipping. Use when a founder asks how to test a change, whether they can A/B test it, or how they will know a change worked.
---

# Designing a test for one change

One job, one deliverable: `artifacts/<product>/tests/<change>.md`. `<product>` is the `project` that
`inputs.mjs` prints (the product's name in lower case, with hyphens); `<change>` is a short slug of the
change (`pricing-headline`). Run the scripts from this skill's folder: `S=~/.claude/skills/c04-designing-test`.

**Required:** the change, in words or as a change ID (C1, C2 …) from the trial-path review. Without it
there is no job. **Assumed when missing, and listed under Assumptions:** the product (from the change
or the project), the baseline conversion (2%, an example rate), visitors per week (500, an example)
and the lift worth detecting (20%). The founder's own figures always replace the examples.

A test design says how to find out whether the change worked; it never builds the change or runs the test.

## Workflow (copy into your task list and tick)
- [ ] 1. Check the inputs and save the request before you write anything else. Give the request word for
        word on standard input; the script saves it in the product's folder, never over an earlier one:
        `node $S/scripts/inputs.mjs - --save artifacts --artifacts artifacts <<'REQUEST'`, then the request,
        then a line `REQUEST`. Its `project` is `<product>` for every path below (the product the request
        names, else the project whose status was updated last, else `new-project`) and `saved` is the saved
        request. Keep the `assume` list and the `run` line. Report each assumed input once:
        `~/.sl8/bin/report assumption "<label>: <value>"`.
- [ ] 2. Read `artifacts/profile.md` and `artifacts/<product>/STATUS.md` if they exist. For a change ID, read
        that change's row (page, now, change, evidence) from `artifacts/<product>/trial-path-review.md`.
        Use the founder's figures from the request or the profile before any example rate.
        To quote what is there now, use the review's `pages/` when it has the page; otherwise open the page
        with the web fetch tool when a URL is known; if neither, describe the change and say the current
        words were not read.
- [ ] 3. If the change is missing (`missing` names it, or there is no review or no such ID in it): read
        `artifacts/profile.md` (create nothing), run `node $S/scripts/record.mjs --waiting change --project <product>`
        and the status command it prints as `next`, reply "To do this I need: the change to test (in words, or a
        change number such as C2 from the trial-path review)." and end `partial`. Never write a test design without a change.
- [ ] 4. Run the arithmetic: `node $S/scripts/stats.mjs plan --baseline <rate> --visitors-per-week <n> --lift <rate>`
        (the `run` line from step 1, with any figure from step 2). Copy the tier, conversions per 4 weeks,
        visitors per arm, weeks and `beforeAfter.line` exactly.
- [ ] 5. Choose the route from the weeks with [reference/method.md](reference/method.md) §3: never an A/B
        test over 8 weeks; at 8 or fewer and a medium or high tier, an A/B test. Report it:
        `~/.sl8/bin/report decision "Route: <route>, because <the weeks and the tier>"`.
- [ ] 6. Read [the example](reference/examples/good-1.md) first, then write the test design from
        [reference/template.md](reference/template.md); the `ref-` examples show published plans and a bad one.
        The hypothesis names its evidence (a quoted page, the founder's figure, or the review's finding).
        For ship and measure, the arithmetic carries the before-and-after line and the decision rule names the
        smallest change it can tell from noise (method §5). For every input on the `assume` list write
        `- **<label>:** not given. Assumed <what>. Send <what> to replace it.` When every input was given,
        write `- None: every input was given.` Never leave [TBD].
- [ ] 7. Validate: `node $S/scripts/validate.mjs artifacts/<product>/tests/<change>.md --request <saved>`.
        It reruns the arithmetic on your Inputs line. Fix every error and rerun until `ok` is true.
- [ ] 8. Record the status: `node $S/scripts/record.mjs artifacts/<product>/tests/<change>.md` (one open
        decision per Assumptions line, and the step that starts the measuring), then run the status command it
        prints as `next`. Add to `artifacts/profile.md` only figures the founder gave, never an example rate.
- [ ] 9. When the status command has printed `"ok": true`, write `outcome.json` (`delivered`). Then reply with
        exactly these six lines, filled in, and nothing before or after them:
        `<when the request asked a question, its answer in one line ("Can we A/B test it?": yes or no, with the weeks; "How do we know it works?": the route and the rule); otherwise "Your test design for <the change> is ready.">`
        `Route: <route>, because <the weeks and the tier, in a few words>.`
        `Read: <ship and measure: the before-and-after line's words after its colon; A/B test: "<n> visitors per version, about <weeks> weeks">.`
        `Decision rule: <the rule, in one line>.`
        `Assumed: <each assumed input with its value>; each is an open decision in the project status.`
        `File: artifacts/<product>/tests/<change>.md`

## Rules
- `<product>` is also the project: the `project` step 1 prints. With no product named and no project, it is
  `new-project`, and the Assumptions line for the product says so.
- Every figure about traffic, sample size, weeks or noise comes from `stats.mjs`; never round or estimate by hand.
- An example rate is always labelled as an example and listed under Assumptions; it never goes in the profile.
- One change per design. A request with several changes designs the first and names the rest as not done.
- Never build the variant, change the site or run the test; never sign in to analytics. Only
  `artifacts/<product>/` and `artifacts/profile.md` are written (nothing in `/tmp`). Never delete files.
