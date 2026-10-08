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
- [ ] 1. Check the inputs and save the request before you write anything else. Give the request word for
        word on standard input; the script saves it in the product's folder, never over an earlier one:
        `node $S/scripts/inputs.mjs - --save artifacts --attachments artifacts/attachments --profile artifacts/profile.md <<'REQUEST'`,
        then the request, then a line `REQUEST`. Its `project` is `<product>` for every path below and `saved`
        is the saved request. Keep `assume`, `url` and `trafficGiven`. A website in `artifacts/profile.md` counts
        as given. An input the request names but does not include (emails "pasted below" that are not there, a
        screenshot not attached) is missing too: add it to the assume list. Report each assumed input once:
        `~/.sl8/bin/report assumption "<label>: <value>"`.
- [ ] 2. If `missing` names the product: read `artifacts/profile.md` (create nothing), run
        `node $S/scripts/record.mjs --waiting product --project <product>` and the status command it prints as
        `next`, reply with the script's `say` line and end `partial`. Never review without the site.
- [ ] 3. Read `artifacts/profile.md`, `artifacts/<product>/STATUS.md` and any earlier `trial-path-review.md`
        if they exist; read every attachment (customer voice, screenshots).
- [ ] 4. Fetch the path: `node $S/scripts/fetch-pages.mjs <url> --out artifacts/<product>/pages`, then the
        sign-up, trial or demo page and the pricing page from its "Links on the path" (one more call with
        those URLs; at most 8 pages). Read each saved file whole: its Facts (each form's fields, required
        marks, captcha and submit; links and text page script sets) and its Text. A page that fails or is thin:
        `~/.sl8/bin/report obstacle "<page> could not be read" "<what you review instead>"`, and review what was
        read. If no page can be read at all, end `partial` as in step 2 with `--waiting pages`.
- [ ] 5. Map the path and check each ResearchXL step with [reference/method.md](reference/method.md), one row
        per lens. Follow [reference/evidence-rules.md](reference/evidence-rules.md) for every finding: quote the
        words it rests on, and name every form fact under friction.
- [ ] 6. Write the changes: one change per problem, each quoted from `pages/`, with one bucket
        (method §4: Test only when the founder's figures reach the medium tier, 784+ conversions in
        4 weeks; never when `trafficGiven` is false). State the tier on the Traffic line. Score each with [reference/pxl.md](reference/pxl.md)
        and order by total. Write the kit from [reference/research-kit.md](reference/research-kit.md).
- [ ] 7. Read [the example](reference/examples/good-1.md) first (it reviews [these pages](reference/examples/pages-1.md)),
        then write `trial-path-review.md` from [reference/template.md](reference/template.md); the `ref-` examples
        show published teardowns and a bad audit. For every input on the `assume` list write
        `- **<label>:** not given. Assumed <what>. Send <what> to replace it.` When every input was given,
        write `- None: every input was given.` Never leave [TBD].
- [ ] 8. Validate: `node $S/scripts/validate.mjs artifacts/<product>/trial-path-review.md --pages artifacts/<product>/pages --request <saved>`
        (add `--pages artifacts/attachments` when the founder attached customer words). It looks for every quote
        in the path, the checks and the changes in the pages read. Fix every error and rerun until `ok` is true.
- [ ] 9. Check the draft against the evidence rules: no look words without a screenshot (rule 3); every
        "first", "last", "only", "every" or "no" claim checked with `grep -n` in `pages/` (rule 5).
- [ ] 10. Record the status: `node $S/scripts/record.mjs artifacts/<product>/trial-path-review.md --context "top three changes=C1 <a few words>, C2 <…>, C3 <…>"`
         (one open decision per Assumptions line), then run the status command it prints as `next`. Add to
         `artifacts/profile.md` only what the founder said (product, website, buyer, traffic figures).
- [ ] 11. When the status command has printed `"ok": true`, write `outcome.json` (`delivered`). Then reply with
         exactly these six lines, filled in, and nothing before or after them:
         `<when the request asked a question, its answer in one line as likely causes from the pages, not proof; otherwise "Your trial-path review of <Product> is ready.">`
         `Change first: C1 <the change in a few words> (<page, section>).`
         `Then: C2 <a few words>; C3 <a few words>.`
         `Could not see: <what the review cannot show, in a few words>.`
         `Assumed: <each assumed input, in a few words>; each is an open decision in the project status.`
         `File: artifacts/<product>/trial-path-review.md (<n> pages read, in pages/).`

## Rules
- `<product>` is also the project: the `project` step 1 prints (`new-project` when no product is named).
- Every number is the founder's or a fetch fact; never invent a rate, a customer or a result.
- Quote, don't paraphrase: a change whose "now" is not in `pages/` cannot be found by the founder. Quote only
  from what `fetch-pages.mjs` saved, the request or an attachment; the page tool may find a link, never a quote.
- From text you can say what a page says and in what order, never how it looks.
- Never sign in, submit a form, change the site or simulate users or answers. Only `artifacts/<product>/`
  and `artifacts/profile.md` are written (nothing in `/tmp`). Never delete files.
