---
name: c05-reviewing-sequence
description: Reviews a micro-SaaS's email sequence before it is sent - each problem with the line quoted, the rule and its source, a severity and the fix written out, what to keep, what to verify outside the text, and the three fixes to make first. Use when a founder asks to review, check or critique their onboarding, trial or launch emails, or asks what's wrong with them.
---

# Reviewing an email sequence

One job, one deliverable: `artifacts/<product>/sequence-review.md`. `<product>` is the product's name
in lower case, with hyphens. Run the scripts from this skill's folder: `S=~/.claude/skills/c05-reviewing-sequence`.

**Required:** the emails, from any of: files in `artifacts/attachments/`, emails pasted in the request,
or "the sequence you wrote" (the project's `sequence.md` and `emails/`). Without them there is no job.
**Assumed when missing, and listed under Assumptions:** the goal (from the emails' calls to action),
the product (from their links), who receives them (from the emails). A goal the request states in its
own words ("our trial emails") counts as given.

A review finds what to fix and writes each fix out; it does not rewrite the sequence and never sends.

## Workflow (copy into your task list and tick)
- [ ] 1. Save the request word for word with the Write tool to `artifacts/<product>/inputs/request-review.md`.
- [ ] 2. Check inputs: `node $S/scripts/inputs.mjs artifacts/<product>/inputs/request-review.md --attachments artifacts/attachments`.
        If the emails are missing, read `artifacts/profile.md` (create nothing), then skip to step 7 with `"state":"waiting"` and one open decision
        (`{"text":"Send the emails to review","state":"open","needs":"emails"}`) and no deliverables, then reply with
        the script's `say` line and end `partial`. Never write the review without the emails.
        Otherwise keep the `assume` list it prints. Each input on it gets an Assumptions line in step 4.
- [ ] 3. Read `artifacts/profile.md` and `artifacts/<product>/STATUS.md` if they exist. Collect the emails to review:
        the attachments, the pasted text (save it as `artifacts/<product>/inputs/emails-reviewed.md`), or, for "the
        sequence you wrote", the project's `sequence.md` and `emails/*.txt`. With no product named, use the project
        under `artifacts/` whose `sequence.md` is newest, and use its folder name as `<product>` from here on.
        If the source the request names does not exist, the emails are missing: take the partial path of step 2.
        Read every email in full.
- [ ] 4. Check each email against [reference/method.md](reference/method.md) and write `sequence-review.md` from
        [reference/template.md](reference/template.md). Match [the example](reference/examples/good-1.md) (it reviews
        [these emails](reference/examples/emails-1.md)); the `ref-` examples show how public reviews quote and fix.
        Copy each quoted line exactly. Write each fix out in full. For every input on the `assume` list,
        write `- **<label>:** not given. Assumed <what>. Send <what> to replace it.` When every input was given, write
        `- None: every input was given.` Never leave [TBD].
- [ ] 5. Validate: `node $S/scripts/validate.mjs artifacts/<product>/sequence-review.md --emails <each file or folder reviewed> --request artifacts/<product>/inputs/request-review.md`.
        Fix every error and rerun until `ok` is true.
- [ ] 6. Check the ranking: "Fix first" holds the findings that most stop the goal (blockers first).
- [ ] 7. Update the project status. Write `artifacts/<product>/inputs/job-review.json`:
        `{"job":"sequence-review","what":"<product>: email","state":"active","context":{"emails reviewed":"<n>","blockers":"<n>","fix first":"…"},"decisions":[…one per Assumptions line that asks for something, and one "Fix the blockers before sending" when there are any, each {"text","state":"open","needs"}],"deliverables":[{"name":"Sequence review","file":"<product>/sequence-review.md"}]}`.
        Then run `node ~/.claude/skills/run-sl8-job/scripts/status.mjs --project <product> --record artifacts/<product>/inputs/job-review.json`.
- [ ] 8. Reply in at most 8 lines: the counts, the three fixes to make first, what you assumed, and the file.

## Rules
- `<product>` is also the project. When neither the request nor the emails name a product, `<product>` is `new-project`.
- Quote, don't paraphrase: a finding whose line is not in the emails cannot be acted on.
- Every rule names its source (Atomic Emails, Litmus). Never claim the emails are legally compliant: list what to verify.
- A fix never adds a fact, number, offer or deadline the founder did not give: use a placeholder like `<the date>`.
- Never send, import or collect contact details. Only `artifacts/<product>/` and `artifacts/profile.md` are written. Never delete files.
