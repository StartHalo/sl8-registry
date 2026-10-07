---
name: c02-reviewing-brand-copy
description: Reviews a consumer app's written copy (store listing, website, email, onboarding text) against its brand before it ships - each problem with the line quoted, the rule and its source, a severity and the fix written out, the swap, hand and field tests on the whole, the three fixes to make first, and the claims to verify. Reads the project's voice rules and messaging house when they exist. Use when the marketing lead asks to review or check copy, or whether it sounds like the brand.
---

# Reviewing brand copy

One job, one deliverable: `artifacts/<app>/brand-review.md`. `<app>` is the app's name in lower case, with
hyphens; it is also the project. Run the scripts from this skill's folder:
`S=~/.claude/skills/c02-reviewing-brand-copy`.

**Required:** the material to review, from any of: text pasted in the request, files in `artifacts/attachments/`,
a public link, or "the listing you wrote" (the project's `store-listing.md`). Without it there is no job.
**Assumed when missing, and listed under Assumptions:** the brand rules (the project's `voice-rules.md` and
`messaging-house.md`, else the store page's promise), the app (from the material).

A review finds what to fix and writes each fix out; it does not rewrite the whole piece and never publishes.

## Workflow (copy into your task list and tick)
- [ ] 1. Decide `<app>`: the request's App line; else, for a link, open it first and use the app it shows; else the
        app the pasted text names; else the project under `artifacts/` whose files are newest; else `new-project`.
        Save the request word for word with the Write tool to `artifacts/<app>/inputs/request-review.md`.
- [ ] 2. Check inputs: `node $S/scripts/inputs.mjs artifacts/<app>/inputs/request-review.md --attachments artifacts/attachments --project artifacts/<app>`.
        If the material is missing, skip to step 8 with `"state":"waiting"`, one open decision
        (`{"text":"Send the copy to review","state":"open","needs":"material"}`) and no deliverables, then reply with
        the script's `say` line and end `partial`. Otherwise keep the `assume` list it prints.
- [ ] 3. Read `artifacts/profile.md`, `artifacts/<app>/STATUS.md`, `voice-rules.md` and `messaging-house.md` if
        they exist.
- [ ] 4. Save the material word for word to `artifacts/<app>/inputs/material.md`: the pasted text, the attached
        files' text, the page's text as fetched (with the URL and date), or the proposed fields of `store-listing.md`.
        If a link will not open and nothing else was sent, the material is missing: take the partial path of step 2.
- [ ] 5. Check every line against [reference/method.md](reference/method.md) and write `brand-review.md` from
        [reference/template.md](reference/template.md). Match [the example](reference/examples/good-1.md) (it reviews
        [this material](reference/examples/material-1.md)); the `ref-` examples show how public teardowns quote and
        fix ([ref-good-1](reference/examples/ref-good-1.md), [ref-good-2](reference/examples/ref-good-2.md),
        [ref-good-3](reference/examples/ref-good-3.md)) and what fails ([ref-bad-1](reference/examples/ref-bad-1.md)).
        List claims by [reference/claims-check.md](reference/claims-check.md). Copy each quoted line exactly from
        `inputs/material.md`. For every input on the `assume` list write
        `- **<label>:** not given. Assumed <what>. Send <what> to replace it.` Never leave [TBD].
- [ ] 6. Validate: `node $S/scripts/validate.mjs artifacts/<app>/brand-review.md --material artifacts/<app>/inputs/material.md --request artifacts/<app>/inputs/request-review.md --project artifacts/<app>`.
        Fix every error and rerun until `ok` is true.
- [ ] 7. Check the ranking: "Fix first" holds the findings that most change how people see the brand (high first).
        Drop any finding that is taste rather than a broken rule.
- [ ] 8. Update the project status. Write `artifacts/<app>/inputs/job-review.json`:
        `{"job":"brand-review","what":"<App>: brand copy","state":"active","context":{"material reviewed":"…","high findings":"<n>","fix first":"…"},"decisions":[…one per Assumptions line that asks for something, and one "Fix the high findings before publishing" when there are any, each {"text","state":"open","needs"}],"deliverables":[{"name":"Brand copy review","file":"<app>/brand-review.md"}]}`.
        Then run `node ~/.claude/skills/run-sl8-job/scripts/status.mjs --project <app> --record artifacts/<app>/inputs/job-review.json`.
- [ ] 9. Reply in at most 8 lines: the counts, the three fixes to make first, what you assumed, and the file.

## Rules
- A request that points to an earlier document ("the messaging house you wrote") counts only when that file is in
  `artifacts/<app>/`; otherwise the input is missing and gets its Assumptions line (the input script already says so).
- A page that will not open gets its own Assumptions line (`- **Store page:** could not be opened. …`), so
  "None: every input was given" is written only when every input was given and every page opened.
- Quote, don't paraphrase: a finding whose line is not in the material cannot be acted on.
- Every rule names its source. Never say the copy is compliant: list the claims to verify.
- Only `artifacts/<app>/` and `artifacts/profile.md` are written. Never delete files. Never publish.
