---
name: c02-writing-messaging-house
description: Writes a consumer app's messaging house from its store page and what the marketing lead gives - a one-line brand promise, three pillars each with its message and sourced proof points, what to lead with for each audience, and a boilerplate paragraph. Reads the project's ideal-customer file (icp.md) when one exists. Use when the lead asks for a messaging house, key messages, a message map, or what to say about the app.
---

# Writing the messaging house

One job, one deliverable: `artifacts/<app>/messaging-house.md`. `<app>` is the app's name in lower case,
with hyphens; it is also the project. Run the scripts from this skill's folder:
`S=~/.claude/skills/c02-writing-messaging-house`.

**Required:** the app (a store link, or its name and what it does). Without it there is no job.
**Assumed when missing, and listed under Assumptions:** positioning (from `icp.md` when the project has
one, else from the store page), audiences (up to 3 from the store page and its reviews), proof (only what a
saved page or the request shows), competitors (three rivals from the store page's similar apps, else its
category; for the swap test only, never named in a message).

## Workflow (copy into your task list and tick)
- [ ] 1. Save the request word for word with the Write tool (not a shell command) to `artifacts/<app>/inputs/request-messaging.md`
        (with no app named, `<app>` is `new-project`).
- [ ] 2. Check inputs: `node $S/scripts/inputs.mjs artifacts/<app>/inputs/request-messaging.md --project artifacts/<app>`.
        If the app is missing, skip to step 8 with `"state":"waiting"`, one open decision
        (`{"text":"Send the app's store link","state":"open","needs":"app"}`) and no deliverables, then reply with
        the script's `say` line and end `partial`. Otherwise keep the `assume` list it prints: each input on it
        gets an Assumptions line in step 5, and one progress report:
        `~/.sl8/bin/report assumption "<input>: <what you assumed>"`.
- [ ] 3. Read `artifacts/profile.md`, `artifacts/<app>/STATUS.md` and `artifacts/<app>/icp.md` if they exist.
- [ ] 4. Read each store page the request links, word for word, with
        `node $S/scripts/page.mjs "<link>" --out artifacts/<app>/sources --lang <language>-<COUNTRY>` (the market's
        language: the request's market, else the App Store link's country, `/us/` is `en-US`; leave `--lang` out when
        neither says). Read the file it names; quote only from it, never from the page tool, which summarises. A
        page that will not open:
        `~/.sl8/bin/report obstacle "<page> did not open" "<what you do instead>"`, work from the request and list it
        under Assumptions. With no competitors given, take three apps that do the same job from the saved page's
        "Similar apps" (else its category).
- [ ] 5. Write `messaging-house.md` from [reference/template.md](reference/template.md) by
        [reference/method.md](reference/method.md). Match [the example](reference/examples/good-1.md), built on
        [this saved page](reference/examples/page-1.md); the `ref-` examples show published houses
        ([ref-good-1](reference/examples/ref-good-1.md), [ref-good-2](reference/examples/ref-good-2.md),
        [ref-good-3](reference/examples/ref-good-3.md)) and the mistakes to avoid
        ([ref-bad-1](reference/examples/ref-bad-1.md)). Every proof point ends `(source: <where>, "<the words>")`,
        the words copied exactly from a saved page, the request or `icp.md`. For every input on the `assume` list
        write `- **<label>:** not given. Assumed <what>. Send <what> to replace it.` When every input was given,
        write `- None: every input was given.` Never leave [TBD].
- [ ] 6. Validate: `node $S/scripts/validate.mjs artifacts/<app>/messaging-house.md --request artifacts/<app>/inputs/request-messaging.md --project artifacts/<app>`.
        It finds every proof's words in the saved pages, the request or `icp.md`. Fix every error and rerun until
        `ok` is true.
- [ ] 7. Check [reference/claims-check.md](reference/claims-check.md): every fact in the promise, a message or the
        boilerplate is backed by a proof point; cut the rest or list it as an unsourced claim. No proof is a
        ranking, figure or result the sources do not show. Swap test: put each rival's name in front of the
        promise; if it still works, sharpen it.
- [ ] 8. Update the profile and the project status. Add to `artifacts/profile.md` only what the lead said or the
        store page shows (company, app name, store links, category). Write `artifacts/<app>/inputs/job-messaging.json`:
        `{"job":"messaging-house","what":"<App>: brand messages","state":"active","context":{"promise":"…","pillars":"…","audiences":"…","positioning source":"icp.md | request | assumed"},"decisions":[…one per Assumptions line that asks for something, each {"text","state":"open","needs"}],"deliverables":[{"name":"Messaging house","file":"<app>/messaging-house.md"}]}`.
        Then run `node ~/.claude/skills/run-sl8-job/scripts/status.mjs --project <app> --record artifacts/<app>/inputs/job-messaging.json`.
- [ ] 9. Reply in at most 8 lines: the promise, the three pillars, what you assumed, and the file. Do not publish
        anything. End `delivered` when the house is saved and valid; `partial` only when the app is missing (step 2).

## Rules
- A store page that will not open, with no words in the request on what the app does, means the job cannot
  start: end `partial` as in step 2 and ask for "a store link that opens, or a few lines on what the app does".
- A request that points to an earlier document ("the messaging house you wrote") counts only when that file is in
  `artifacts/<app>/`; otherwise the input is missing and gets its Assumptions line (the input script already says so).
- A page that will not open gets its own Assumptions line (`- **Store page:** could not be opened. …`), so
  "None: every input was given" is written only when every input was given and every page opened.
- Quote a page only from what `page.mjs` saved in `sources/`. The page tool may help find a link, never a quote.
- Never invent a number, an award, a review, a user count or a result. Proof comes from the request, a saved page
  or `icp.md`, and says which, in its own words.
- Never put a competitor's name in a message; competitors are only for the swap test.
- The positioning is an input, not this job's output: take it from `icp.md`, the request, or state the assumption.
- Only `artifacts/<app>/` and `artifacts/profile.md` are written. Never delete files.
