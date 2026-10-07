---
name: c05-writing-sequence
description: Writes a micro-SaaS's email sequence toward one goal (onboarding, trial to paid, a launch) - a storyboard, every email in HTML and plain text, a setup sheet for any email tool, a send checklist and how to tell it worked. Use when a founder asks for their onboarding emails, a trial-to-paid or launch sequence, or the emails to send new users, even if they don't say "sequence".
---

# Writing an email sequence

One job, one deliverable: `artifacts/<product>/sequence.md` and the built `artifacts/<product>/emails/`.
`<product>` is the product's name in lower case, with hyphens. Run the scripts from this skill's
folder: `S=~/.claude/skills/c05-writing-sequence`.

**Required:** the product (its name and website); without it there is no job. **Assumed when
missing, and listed under Assumptions:** the goal (from the kind of sequence the request names:
onboarding or trial → trial users reach a paid plan; a launch → people try what launched; with no
kind named, trial to paid), who receives it (from the goal), offers and resources (from the site), the
sender (the founder, by role), the postal address (a placeholder, never invented), the email tool
(none: neutral merge tags), the number of emails (from the delays table in
[reference/method.md](reference/method.md): 5 for onboarding or trial, 2–3 for a launch). A goal the
request states in its own words ("a trial-to-paid sequence") counts as given.

The founder sends every email themselves, from their own tool. This job writes and builds; it never
sends, imports contacts or touches anyone's email address.

## Workflow (copy into your task list and tick)
- [ ] 1. Save the request word for word with the Write tool to `artifacts/<product>/inputs/request-sequence.md`.
- [ ] 2. Check inputs: `node $S/scripts/inputs.mjs artifacts/<product>/inputs/request-sequence.md`.
        If the product is missing, do step 3 (profile only), then skip to step 9 with `"state":"waiting"` and one open decision for
        the missing required input only (`{"text":"Send <input>","state":"open","needs":"<input>"}`) and no deliverables,
        then reply with the script's `say` line and end `partial`. A partial job writes only the request,
        the profile, its job record and (through the script) `STATUS.md`; never the deliverable.
        Otherwise do the job: keep the `assume` list it prints. Each input on it gets an Assumptions line in step 6.
- [ ] 3. Read `artifacts/profile.md` and `artifacts/<product>/STATUS.md` if they exist: use their stored context, and
        any decision the founder has since answered (an answer in the request closes it). Update the profile with only
        what the founder said (product, website, sender, postal address, email tool), as `- Key: value` lines; create
        the file if it does not exist. Never contact details.
- [ ] 4. Open the product's site: what it does, the first action that makes it useful, its plans and trial, and the
        resources and offers it has (docs, guides, a setup call). Note each page's link. If the site will not open, say so
        under Assumptions, work from the request, and link every call to action to the site's home page.
- [ ] 5. Storyboard by [reference/method.md](reference/method.md): ideas, each with one purpose, ordered by the
        customer's first days, with delays and the exit. Then write every email into `sequence.md` from
        [reference/template.md](reference/template.md). Match [the example](reference/examples/good-1.md); the
        `ref-` examples show what good sequences do. Follow [reference/rules.md](reference/rules.md).
- [ ] 6. Write the setup sheet ([reference/setup-sheet.md](reference/setup-sheet.md), [reference/tool-tokens.md](reference/tool-tokens.md)),
        the send checklist ([reference/send-checklist.md](reference/send-checklist.md)), how to tell it worked, the
        Method line and the Assumptions. For every input on the `assume` list, write an Assumptions line that starts with its label:
        `- **<label>:** not given. Assumed <what>. Send <what> to replace it.` When every input was given, write
        `- None: every input was given.` Never leave [TBD].
- [ ] 7. Build: `node $S/scripts/build.mjs artifacts/<product>/sequence.md`. It writes `emails/` with an HTML and a text
        file per email, the UTM tags and the footer's merge tags. Never write the HTML by hand.
- [ ] 8. Validate: `node $S/scripts/validate.mjs artifacts/<product>/sequence.md --request artifacts/<product>/inputs/request-sequence.md`.
        Fix `sequence.md`, rebuild (step 7) and rerun until `ok` is true.
- [ ] 9. Update the project status. Write `artifacts/<product>/inputs/job-sequence.json`:
        `{"job":"sequence","what":"<product>: email","state":"active","context":{"goal":"…","audience":"…","emails":"<n>","email tool":"…"},"decisions":[…what the founder should send or decide, one per Assumptions line that asks for something, each {"text","state":"open","needs"}],"deliverables":[{"name":"Email sequence","file":"<product>/sequence.md"},{"name":"Email files","file":"<product>/emails/"}]}`.
        Then run `node ~/.claude/skills/run-sl8-job/scripts/status.mjs --project <product> --record artifacts/<product>/inputs/job-sequence.json`.
- [ ] 10. Reply in at most 8 lines: the emails in order (subject and purpose), when a person leaves, what you
        assumed, what to send next (the postal address first if it is a placeholder), and the files.

## Rules
- `<product>` is also the project: the status script's `--project` is `<product>`. When the request names no product, `<product>` is `new-project` (the partial path only).
- Every fact comes from the request or a page opened in this job. A claim you cannot source is cut or stated under Assumptions.
- Each email's link points to a page on the product's site that exists (opened in step 4), or to the site's home page.
- The footer is added by `build.mjs`: the unsubscribe link as a merge tag, and the postal address from the header line
  when the founder gave it (else the `{{postal_address}}` tag). Never write either into a body.
- For a launch, never invent what launched or a deadline: name them from the request or the site, else state them under
  Assumptions.
- Never send, schedule, import, or collect anyone's contact details. Never say the sequence is legally compliant: the send checklist lists what to verify.
- Only `artifacts/<product>/` and `artifacts/profile.md` are written. Never delete files.
- `scripts/lib.mjs` is shared by the three scripts; it is never run on its own.
