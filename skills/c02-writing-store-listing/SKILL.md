---
name: c02-writing-store-listing
description: Writes App Store and Google Play listing copy for a consumer app from its store pages, within each store's character limits - Apple name, subtitle, promotional text, keywords and description; Google Play title, short and full description - with the current text against the proposed, the reason for each field, and the claims to verify. Reads the project's messaging house and voice rules when they exist. Use when the marketing lead asks to rewrite a store listing, a subtitle or keywords, a Google Play description, or store copy for a launch.
---

# Writing the store-listing copy

One job, one deliverable: `artifacts/<app>/store-listing.md`. `<app>` is the app's name in lower case, with
hyphens; it is also the project. Run the scripts from this skill's folder:
`S=~/.claude/skills/c02-writing-store-listing`.

**Required:** the app (a store link; for an app not yet listed, its name and what it does). Without it there
is no job. **Assumed when missing, and listed under Assumptions:** what is new (a refresh, no launch), search
terms (from the category; volumes not measured), the messaging house and voice rules (from the store page),
the market and language (from the store page).

## Workflow (copy into your task list and tick)
- [ ] 1. Save the request word for word with the Write tool to `artifacts/<app>/inputs/request-listing.md`
        (with no app named, `<app>` is `new-project`).
- [ ] 2. Check inputs: `node $S/scripts/inputs.mjs artifacts/<app>/inputs/request-listing.md --project artifacts/<app>`.
        If the app is missing, skip to step 8 with `"state":"waiting"`, one open decision
        (`{"text":"Send the app's store link","state":"open","needs":"app"}`) and no deliverables, then reply with
        the script's `say` line and end `partial`. Otherwise keep the `assume` list it prints.
- [ ] 3. Read `artifacts/profile.md`, `artifacts/<app>/STATUS.md`, `messaging-house.md` and `voice-rules.md` in
        `artifacts/<app>/` if they exist.
- [ ] 4. Open the app's App Store and Google Play pages (find the other store's page by the app's name when only
        one is linked). Save the current fields word for word to `artifacts/<app>/inputs/current-listing.md`, with
        each URL and the date. A page that will not open: write "(not read)" as current and list it under
        Assumptions. For an unlisted app every current field is "(none)".
- [ ] 5. Write `store-listing.md` from [reference/template.md](reference/template.md) by
        [reference/method.md](reference/method.md) and [reference/rules.md](reference/rules.md). Match
        [the example](reference/examples/good-1.md); the `ref-` examples are real listings
        ([ref-good-1](reference/examples/ref-good-1.md), [ref-good-2](reference/examples/ref-good-2.md),
        [ref-good-3](reference/examples/ref-good-3.md)) and one to avoid ([ref-bad-1](reference/examples/ref-bad-1.md)).
        List claims by [reference/claims-check.md](reference/claims-check.md). For every input on the `assume`
        list write `- **<label>:** not given. Assumed <what>. Send <what> to replace it.` Never leave [TBD].
- [ ] 6. Validate: `node $S/scripts/validate.mjs artifacts/<app>/store-listing.md --request artifacts/<app>/inputs/request-listing.md --project artifacts/<app>`.
        It counts each field against its store limit (keywords in bytes). Fix every error and rerun until `ok` is true.
- [ ] 7. Read the two description openings: does each first sentence carry the promise? Do the name, subtitle and
        keywords share no words?
- [ ] 8. Update the profile and the project status. Add the store links, category, market and language to
        `artifacts/profile.md`. Write `artifacts/<app>/inputs/job-listing.json`:
        `{"job":"store-listing","what":"<App>: store listing","state":"active","context":{"market":"…","what is new":"…","search terms":"…"},"decisions":[{"text":"Submit the new listing in App Store Connect and the Play Console","state":"open","needs":"the lead"},…one per Assumptions line that asks for something, each {"text","state":"open","needs"}],"deliverables":[{"name":"Store-listing copy","file":"<app>/store-listing.md"}]}`.
        Then run `node ~/.claude/skills/run-sl8-job/scripts/status.mjs --project <app> --record artifacts/<app>/inputs/job-listing.json`.
- [ ] 9. Reply in at most 8 lines: the new subtitle and short description, the claims to verify, what you
        assumed, and the file. Do NOT submit anything: the lead changes the store listing.

## Rules
- The deliverable always has every field of both stores, so the listing stays one message. When the request asks
  for one field or one store, write that one with most care and lead the reply with it.
- A launch named but not described ("our relaunch") is used as the news in promotional text without details or
  dates; its Assumptions line asks for what is new.
- Find the other store's page by the app's exact name and developer; if no single match, write "(not read)".
- A request that points to an earlier document ("the messaging house you wrote") counts only when that file is in
  `artifacts/<app>/`; otherwise the input is missing and gets its Assumptions line (the input script already says so).
- A page that will not open gets its own Assumptions line (`- **Store page:** could not be opened. …`), so
  "None: every input was given" is written only when every input was given and every page opened.
- Never put a price, a ranking ("#1", "best"), an award without its source, or a competitor's name in any field.
- Never invent a number, a rating, a review or a launch date.
- Search volumes are never guessed: say they were not measured.
- Only `artifacts/<app>/` and `artifacts/profile.md` are written. Never delete files.
