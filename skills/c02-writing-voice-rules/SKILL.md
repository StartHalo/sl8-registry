---
name: c02-writing-voice-rules
description: Writes a consumer app's voice rules - 3 to 5 traits written "X, not Y" each with a do and a don't line, the tone for six moments (first open, reminder, error, milestone, store listing, social), lines of the app's own copy rewritten before and after, and words to use and avoid. Reads the project's messaging house when one exists. Use when the marketing lead asks for a tone of voice, voice guidelines, or how the app should sound.
---

# Writing the voice rules

One job, one deliverable: `artifacts/<app>/voice-rules.md`. `<app>` is the app's name in lower case, with
hyphens; it is also the project. Run the scripts from this skill's folder:
`S=~/.claude/skills/c02-writing-voice-rules`.

**Required:** the app (a store link, or its name and what it does). Without it there is no job.
**Assumed when missing, and listed under Assumptions:** the copy to rewrite (lines of the store description
page.mjs saved), the messaging house (the promise from the store page), words to avoid (none beyond hype words).

## Workflow (copy into your task list and tick)
- [ ] 1. Save the request word for word with the Write tool (not a shell command) to `artifacts/<app>/inputs/request-voice.md`
        (with no app named, `<app>` is `new-project`).
- [ ] 2. Check inputs: `node $S/scripts/inputs.mjs artifacts/<app>/inputs/request-voice.md --attachments artifacts/attachments --project artifacts/<app>`.
        If the app is missing, skip to step 8 with `"state":"waiting"`, one open decision
        (`{"text":"Send the app's store link","state":"open","needs":"app"}`) and no deliverables, then reply with
        the script's `say` line and end `partial`. Otherwise keep the `assume` list it prints, and report each input
        on it once: `~/.sl8/bin/report assumption "<input>: <what you assumed>"`.
- [ ] 3. Read `artifacts/profile.md`, `artifacts/<app>/STATUS.md` and `artifacts/<app>/messaging-house.md` if they exist.
- [ ] 4. Read the app's store page word for word with
        `node $S/scripts/page.mjs "<link>" --out artifacts/<app>/sources --lang <language>-<COUNTRY>` (the market's
        language: the request's market, else the App Store link's country, `/us/` is `en-US`; leave `--lang` out when
        neither says) and read the file it names. The copy to rewrite is the copy pasted in the request (in the saved
        request), the attached files (`artifacts/attachments/`), or, when none was sent, the saved page's
        description. Quote only from these, never from the page tool, which summarises. A page that will not open:
        `~/.sl8/bin/report obstacle "<page> did not open" "<what you do instead>"`, use the request's words and list
        it under Assumptions.
- [ ] 5. Write `voice-rules.md` from [reference/template.md](reference/template.md) by
        [reference/method.md](reference/method.md). Match [the example](reference/examples/good-1.md) (it rewrites
        [this attached copy](reference/examples/copy-1.md) and [this saved page](reference/examples/page-1.md)); the
        `ref-` examples show published guides ([ref-good-1](reference/examples/ref-good-1.md),
        [ref-good-2](reference/examples/ref-good-2.md), [ref-good-3](reference/examples/ref-good-3.md)) and what
        fails ([ref-bad-1](reference/examples/ref-bad-1.md)). Copy every "before" exactly from the request, an
        attached file or a saved page. A rewrite of a store field (name, subtitle, promotional text, keywords, Play
        title or short description) must fit that field: `node $S/scripts/limits.mjs "<where>" "<after>"`. For every
        input on the `assume` list write `- **<label>:** not given. Assumed <what>. Send <what> to replace it.`
        Never leave [TBD].
- [ ] 6. Validate: `node $S/scripts/validate.mjs artifacts/<app>/voice-rules.md --request artifacts/<app>/inputs/request-voice.md --project artifacts/<app>`.
        It finds every "before" in the request, the attached files or the saved pages, and counts store-field
        rewrites against their limits. Fix every error and rerun until `ok` is true.
- [ ] 7. Cover the app's name: could each Do line belong to a competitor? Sharpen any that could.
- [ ] 8. Update the profile and the project status. Add to `artifacts/profile.md` only what the lead said or the
        store page shows (company, app name, store links, category). Write `artifacts/<app>/inputs/job-voice.json`:
        `{"job":"voice-rules","what":"<App>: brand voice","state":"active","context":{"traits":"…","copy rewritten":"…","words to avoid":"…"},"decisions":[…one per Assumptions line that asks for something, each {"text","state":"open","needs"}],"deliverables":[{"name":"Voice rules","file":"<app>/voice-rules.md"}]}`.
        Then run `node ~/.claude/skills/run-sl8-job/scripts/status.mjs --project <app> --record artifacts/<app>/inputs/job-voice.json`.
- [ ] 9. Reply in at most 8 lines: the traits, one rewrite, what you assumed, and the file. Do not publish anything.
        End `delivered` when the rules are saved and valid; `partial` only when the app is missing (step 2).

## Rules
- A store page that will not open, with no words in the request on what the app does, means the job cannot
  start: end `partial` as in step 2 and ask for "a store link that opens, or a few lines on what the app does".
- A request that points to an earlier document ("the messaging house you wrote") counts only when that file is in
  `artifacts/<app>/`; otherwise the input is missing and gets its Assumptions line (the input script already says so).
- A page that will not open gets its own Assumptions line (`- **Store page:** could not be opened. …`), so
  "None: every input was given" is written only when every input was given and every page opened.
- Quote a page only from what `page.mjs` saved in `sources/`. The page tool may help find a link, never a quote.
- Do and don't lines are real copy for this app, never generic examples. A number, time or feature in an example
  line comes from the saved copy or the request; otherwise it is a placeholder (`{n} minutes`).
- An "after" never adds a fact, number or feature the app's copy or the lead did not give.
- Only `artifacts/<app>/` and `artifacts/profile.md` are written. Never delete files.
