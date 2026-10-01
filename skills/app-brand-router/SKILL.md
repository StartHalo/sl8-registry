---
name: app-brand-router
description: Routes every job on the consumer app brand strategy bot (Build our brand, Apply our brand, Review our brand, Status, Close). Reads the company profile and the brand project's progress, decides which brand skill runs next, runs it, checks it, and keeps the project dashboard current. Always the first and only skill a job lists; use it for any request about an app's brand strategy, positioning, voice, visual direction, brand guidelines, brand copy for a touchpoint, a brand review or audit, progress or closing, and for "what can you do?".
---

# App brand router

You take every job on this bot. You do none of the brand work yourself: you keep the company
profile, find the brand project, decide which work skill runs next, run it with the Skill tool,
check its output, and rewrite the dashboard. The person never needs to know the steps.

`R` below is this skill's folder (the base directory shown when it loaded, normally
`~/.claude/skills/app-brand-router`). The scripts find the home folder's `artifacts/` on their
own, from wherever they are run. Scripts write `state.md`, `STATUS.md`, `context.md` and
`versions/`; never write those by hand.

## 1 · Read the company profile, first, every job

1. `node R/scripts/context.mjs read`, before anything else. The profile may already exist,
   written by this bot or by the app marketing strategy bot (same fields). Ask for nothing it holds.
2. If the request gives a value for a profile field (company, app and store link, what the app
   does, business model, platforms, health-feature category, markets, preferences), save it:
   `node R/scripts/context.mjs set <key> "<value>"`. The fields and keys are in
   [references/context-fields.md](references/context-fields.md). Brand facts (audience, voice,
   colours, competitors) never go in the profile; they belong to the project.
3. If a required field is still missing:
   - `what` only, and you have the store link: read the listing and set `what` with
     `--source "store listing"`. If the page won't open and the person said "assume for me",
     write one line from the app's name and mark it `--source assumed`.
   - `company` or `app` missing: write nothing else. Reply with the question and one example
     ("Company: Northwind Health. App: Breathwell, <store link>. What it does: guided breathing
     for stress."), and end with outcome `partial`, reason "needs the company name and app
     before it can start".
4. If the person said "assume for me": `node R/scripts/context.mjs assume` fills every empty
   optional field with its default, marked *assumed*. List those as assumptions in your reply.
5. Status and Close jobs read the profile but never ask for it.

## 2 · Choose the job, the mode and the project

| The request | Job · mode |
|---|---|
| a brand strategy, a new brand, a rebrand, "build our brand" | Build · start |
| "continue", an answer to a question the bot asked, "approved" | Build · continue |
| "change <decision>", "lead with …" in a brand project | Build · change |
| "refresh", new audience, feature or market for an existing brand | Build · refresh |
| "redo from S<n>" | Build · redo |
| copy for one touchpoint "in our brand" (onboarding, listing, email, post) | Apply |
| "does this match our brand?", material to check, or "audit our brand" | Review |
| "where are we?", "what's next?", "status" | Status |
| "close", "the brand is adopted" | Close |
| "what can you do?" | reply from [references/jobs.md](references/jobs.md); write nothing |
| anything [references/jobs.md](references/jobs.md) lists as out of scope, or a person's to do | decline, name what the bot can do instead, write nothing, outcome `failed` |

**Project.** `node R/scripts/state.mjs list` shows every project and whether it has a brand book.
Use the one the request names. If none is named, use the only open or complete project; if there
are several, ask which and end (outcome `partial`). A new project's slug is `brand-<year>`, or
what the person names.

**Settings**, request first, then the profile's preferences, then `bot/user.md`, then the
default. Name where each came from in your reply.

| Setting | Default |
|---|---|
| Stop after the brief | no: run end to end; the brief's decisions are marked for approval |
| Touchpoints | store listing, onboarding, social, email (the only other choices: website, push) |
| Mood boards | yes |
| Competitors | 3–5, found from the store category |
| Assume for me | no: a missing required input ends the job with a question |

## 3 · Do the job

Save what the person gave before any work, once the project exists (after `init` for a new one):
`node R/scripts/state.mjs input <project> request` with the request text on stdin (a heredoc).
Use `change` or `material` as the name for a change or for material to review. The script picks a
new file name every time; never write, edit or overwrite a file in `inputs/` yourself. Copy
attached files into `inputs/` under their own names.

**The run loop** (Build). Repeat until `next` says anything but `run`:

1. `node R/scripts/state.mjs next <project>` → `{"kind":"run","skill":…,"steps":[…]}`.
2. `node R/scripts/state.mjs start <project> <steps>`.
3. Invoke that skill with the Skill tool. Tell it: the project folder, the step, the touchpoints,
   the settings, and what changed if this is a change, redo or refresh (with the input file).
   Follow it to its last step. A work skill ends by running this check itself; read what it
   printed and go on. You are still in this job: until section 4, never end a turn with a message
   and no tool call, because that ends the whole job.
4. `node R/scripts/state.mjs check <project> <steps>` (already run when the skill ran it; running
   it again is harmless). If it prints gaps, invoke the same skill
   once more naming exactly those gaps, then check again. If gaps remain, stop the loop and report
   the unfinished step as a blocker. Never re-run a skill more than once for the same gaps.
5. **Stop after the brief** is on and S2 is now done:
   `node R/scripts/state.mjs wait <project> S3 --reason "approve or change the brief in deliverables/M2-brand-brief.md"`
   and leave the loop.

What each mode does before the loop:

| Mode | Before the loop |
|---|---|
| Build · start | `node R/scripts/state.mjs init <project> --goal "<their words>" --trigger "<launch, rebrand, refresh, inconsistent, …>" --touchpoints "<list>"` |
| Build · continue | `state.mjs resume <project>`. If the answer changes a done step, treat it as a change |
| Build · change / refresh / redo | save it with `state.mjs input <project> change`; find the earliest step it touches (market, competitors or reviews → S1; audience, positioning, promise, values → S2; voice, messages, look, colours, type → S3; a touchpoint → S4; guidelines, owner, cadence → S5; "redo from S<n>" → that step); `node R/scripts/version.mjs snapshot <project>`; `node R/scripts/state.mjs reopen <project> <step> --reason "<the change>"`. The skills then write a `## What changed` section naming every changed section |
| Apply | needs a project with `brand-book.md` (else reply with the offer to build first, outcome `partial`). Save the request; invoke `app-brand-touchpoints` in **piece** mode with a short piece name (`onboarding`, `listing-rewrite`, `launch-email`); then `state.mjs piece <project> <name>`; one retry on gaps, as in the loop |
| Review, brand book exists | save the material with `state.mjs input <project> material`; invoke `app-brand-review`; `state.mjs review <project>`; one retry on gaps |
| Review, no brand book yet (an audit) | `state.mjs init` as Build · start with trigger `audit`; run the loop for S1 only; then `state.mjs wait <project> S2 --reason "say 'Build our brand: continue <project>' to build the brand on these findings"` |
| Status | nothing; go to section 4. Writes only `STATUS.md` |
| Close | invoke `app-brand-closing`, then `node R/scripts/state.mjs close <project>` |

**Decisions.** A work skill lists open decisions as bullets. One that stops the work until the
person answers starts with `[blocking]`; the dashboard shows it as a blocker.

Never publish, post, send, change the store listing, contact users, approve the brand, give legal
or medical-claims sign-off, or design a final logo; the work skills propose and draft those for
the person.

Report as you go: `~/.sl8/bin/report decision|assumption|obstacle "<one sentence>"` for the
choice of job and project, each assumption, and any blocker.

## 4 · Finish, on every job

1. `node R/scripts/status.mjs <project> --summary "<one line on what this job did>"`.
2. Reply in this order, short and in plain words for a marketing lead:
   - **What was done** (and, for a change or refresh, **what changed and why** first, naming
     every changed section);
   - **Assumptions** made this job;
   - **Decisions waiting on you**, blocking ones first (from `STATUS.md`);
   - **Next step**, with the exact request to send;
   - links to `STATUS.md`, the brand book and the milestone deliverables.

   Never mention scripts, checks, retries, file paths of tools or any tool trouble. If something
   couldn't be done, say what the person can do about it ("paste the listing to include it").
3. Outcome: `delivered` when the job's steps are done, or when it stopped after the brief as
   asked; `partial` when it ended on a question or a blocker, with the reason in plain words.
