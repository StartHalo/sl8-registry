---
name: c04-reviewing-trial-path
description: Reviews a micro-SaaS's public trial path, from the home page to sign-up and first value, and ranks what to change first - the path step by step, what was checked per ResearchXL step, each change with its URL and section, the words there now, the change, a bucket and a PXL score, what the review cannot show, and a research kit. Use when a founder asks why visitors don't sign up, or asks to review their trial, sign-up flow or conversion path.
---

# Reviewing the trial path

One job, one deliverable: `artifacts/<product>/trial-path-review.md`, with the pages read in
`artifacts/<product>/pages/`. `<product>` is the `project` that `inputs.mjs` prints (the product's
name in lower case, with hyphens). Run the scripts from this skill's folder: `S=~/.claude/skills/c04-reviewing-trial-path`.

**Required:** the product's website. Without it there is no job. **Assumed when missing, and listed
under Assumptions:** the path (from the home page's main sign-up or trial button to the first step
the site describes), traffic (not known: low traffic, so no Test bucket), customer voice (none: the
kit collects it) and screenshots (none: the fold, looks and screens after sign-up are not checked).

A review says what to change and why it comes first; it never changes the site, signs in, or simulates users.

## Workflow (copy into your task list and tick)
- [ ] 1. Save the request word for word with the Write tool to `artifacts/<product>/inputs/request-review.md`
        (use `artifacts/new-project/` until you know the product).
- [ ] 2. Check inputs: `node $S/scripts/inputs.mjs artifacts/<product>/inputs/request-review.md --attachments artifacts/attachments --profile artifacts/profile.md`
        (a website the founder gave earlier, in the profile, counts as given). If the product is still missing, read `artifacts/profile.md` (create nothing), then skip to step 10 with
        `"state":"waiting"`, one open decision (`{"text":"Send the product's website","state":"open","needs":"product"}`)
        and no deliverables, then reply with the script's `say` line and end `partial`. Never review without the site.
        Otherwise keep the `assume` list, the `url` and `trafficGiven` it prints. An input the request names
        but does not include (emails "pasted below" that are not there, a screenshot that is not attached)
        is missing: add it to your assume list with its Assumptions line.
- [ ] 3. Read `artifacts/profile.md`, `artifacts/<product>/STATUS.md` and any earlier `trial-path-review.md`
        if they exist; read every attachment (customer voice, screenshots).
- [ ] 4. Fetch the path: `node $S/scripts/fetch-pages.mjs <url> --out artifacts/<product>/pages`, then the
        sign-up, trial or demo page and the pricing page from its "Links on the path" (one more call with
        those URLs; at most 8 pages). If a page fails or is thin, say so and review what was read. If no page
        can be read at all, end `partial` the same way as step 2, with the decision
        `{"text":"Send the text or screenshots of your home, pricing and sign-up pages: the site could not be read","state":"open","needs":"pages"}`.
- [ ] 5. Map the path and check each ResearchXL step with [reference/method.md](reference/method.md);
        follow [reference/evidence-rules.md](reference/evidence-rules.md) for every finding.
- [ ] 6. Write the changes: one change per problem, each quoted from `pages/`, with one bucket
        (method §4: Test only when the founder's figures reach the medium tier, 784+ conversions in
        4 weeks; never when `trafficGiven` is false). State the tier on the Traffic line. Score each with [reference/pxl.md](reference/pxl.md)
        and order by total. Write the kit from [reference/research-kit.md](reference/research-kit.md).
- [ ] 7. Write `trial-path-review.md` from [reference/template.md](reference/template.md), matching
        [the example](reference/examples/good-1.md) (it reviews [these pages](reference/examples/pages-1.md));
        the `ref-` examples show published teardowns and a bad audit. For every input on the `assume` list
        write `- **<label>:** not given. Assumed <what>. Send <what> to replace it.` When every input was
        given, write `- None: every input was given.` Never leave [TBD].
- [ ] 8. Validate: `node $S/scripts/validate.mjs artifacts/<product>/trial-path-review.md --pages artifacts/<product>/pages --request artifacts/<product>/inputs/request-review.md`.
        Fix every error and rerun until `ok` is true.
- [ ] 9. Check the draft for look words without a screenshot (evidence rule 3) and fix each.
- [ ] 10. Update the project status. Write `artifacts/<product>/inputs/job-review.json`:
        `{"job":"trial-path-review","what":"<product>: conversion","state":"active","context":{"product site":"<url>","path reviewed":"…","traffic known":"yes|no","top three changes":"C1 …, C2 …, C3 …"},"decisions":[…one per Assumptions line that asks for something, each {"text","state":"open","needs"}],"deliverables":[{"name":"Trial-path review","file":"<product>/trial-path-review.md"}]}`.
        Then run `node ~/.claude/skills/run-sl8-job/scripts/status.mjs --project <product> --record artifacts/<product>/inputs/job-review.json`.
        Add to `artifacts/profile.md` only what the founder said (product, website, buyer, traffic figures).
- [ ] 11. Reply in at most 8 lines: when the request asked a question ("why don't visitors sign up?"), answer it
        first in one line as likely causes from the pages, not proof; then the top three changes, what you
        could not see, what you assumed, and the file.

## Rules
- `<product>` is also the project. When the request names no product, it is `new-project` for every path in this skill.
- Every number is the founder's or a fetch fact; never invent a rate, a customer or a result.
- Quote, don't paraphrase: a change whose "now" is not in `pages/` cannot be found by the founder.
- From text you can say what a page says and in what order, never how it looks.
- Never sign in, submit a form, change the site or simulate users or answers. Only `artifacts/<product>/`
  and `artifacts/profile.md` are written. Never delete files.
