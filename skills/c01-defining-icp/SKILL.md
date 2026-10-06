---
name: c01-defining-icp
description: Defines the ideal customer and positioning for a consumer app in any category as a one-page ICP - two or three segments with the job they hire the app for, pains, trigger, where to reach them and evidence, one positioning statement and three proof points. Use when the person asks who the app is for, to define the ICP or target customer, or to position the app, including after a pivot.
---

# Defining the ICP and positioning

One job, one deliverable: `artifacts/<app>/icp.md`. `<app>` is the app's name in lower case, with
hyphens. Run the scripts from this skill's folder: `S=~/.claude/skills/c01-defining-icp`.

**Required:** the app (name and store link); without it there is no job. **Assumed when missing, and listed under Assumptions:** what it does or is becoming, market, current users, competitors.

## Workflow (copy into your task list and tick)
- [ ] 1. Save the request word for word with the Write tool to `artifacts/<app>/inputs/request-icp.md`.
- [ ] 2. Check inputs: `node $S/scripts/inputs.mjs artifacts/<app>/inputs/request-icp.md`.
        If the app is missing, do step 3 (profile only), then skip to step 7 with `"state":"waiting"` and one open decision for
        the missing required input only (`{"text":"Send <input>","state":"open","needs":"<input>"}`) and no deliverables,
        then reply with the script's `say` line and end `partial`. A partial job writes only the request,
        the profile, its job record and (through the script) `STATUS.md`; never the deliverable.
        Otherwise do the job: keep the `assume` list it prints. Each input on it gets an Assumptions line in step 5.
- [ ] 3. Read `artifacts/profile.md` if it exists. Read `artifacts/<app>/STATUS.md` if it exists: use its stored context, and
        any decision the person has since answered (an answer in the request closes it). Create or update the profile
        with only what the person said: company, app, links, market.
- [ ] 4. Open the app's store page(s) from the request. Open the store page of each competitor you
        state a fact about; if none are named, find up to 3 in the stores. Note what you will cite.
- [ ] 5. Draft from [reference/template.md](reference/template.md). Match the specificity of
        [the examples](reference/examples/). Follow [reference/rules.md](reference/rules.md).
        For every input on the `assume` list, write an Assumptions line that starts with its label:
        `- **<label>:** not given. Assumed <what>. Send <what> to replace it.` Never leave [TBD].
- [ ] 6. Validate: `node $S/scripts/validate.mjs artifacts/<app>/icp.md --request artifacts/<app>/inputs/request-icp.md`.
        Fix every error and rerun until `ok` is true.
- [ ] 7. Update the project status. Write `artifacts/<app>/inputs/job-icp.json`:
        `{"job":"define-icp","what":"<app>: marketing","state":"active","context":{"app":"…","market":"…","primary segment":"…","positioning":"…"},"decisions":[…what the person should send or decide, one per Assumptions line that asks for something for the person, each {"text","state":"open","needs"}],"deliverables":[{"name":"ICP one-pager","file":"<app>/icp.md"}]}`.
        Then run `node ~/.claude/skills/run-sl8-job/scripts/status.mjs --project <app> --record artifacts/<app>/inputs/job-icp.json`.
- [ ] 8. Reply in at most 8 lines: the primary segment, the positioning statement, what you assumed,
        and the file. Do not paste the whole document.

## Rules
- `<app>` is also the project: the status script's `--project` is `<app>`. When the request names no app, `<app>` is `new-project` (the partial path only). With no company name, leave it out of the profile.
- If no store page is given or it will not open, say so under Assumptions and work from the request; never fill the gap from memory.
- "Where to reach" is a recommendation and needs no source; a claim about the segment's size or behaviour does.
- "Position our app" or "who is our ICP" still returns the full one-pager; lead the reply with what was asked.
- Never invent a number, review, quote or competitor fact. Cite the request, a store page or a page you
  opened in this job. Anything else goes under Assumptions.
- An audience detail (an age range, a city, a size) is cited or marked `(assumed)` with its
  Assumptions line. A proof point is something live today; a feature that is only planned is
  labelled `(planned)`. With fewer sourced proof points, list fewer and say what to send.
- The app's category comes from the request or its store page; with neither, it is marked `(assumed)`
  and gets an Assumptions line. When the category has its own rules (health, finance, children,
  dating, gambling), list what to verify before launch under Assumptions. Never give sign-off.
- Never publish, post, spend or contact anyone. You may recommend; the person does.
- Only `artifacts/<app>/` and `artifacts/profile.md` are written. Never delete files.
