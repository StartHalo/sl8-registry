# Lane: store pages

Library id: `aso/store-pages`. One app in one country, moved stage by stage through Khalid's ASO guide
(S01-S08, `references/stages.md`): intake, audit, keywords, metadata, creatives and test plan, release,
measurement, report and next cycle. Open one lane per app per country the parameters name. Work that
belongs to one store stays per store inside it (its own files and its own report). Each lane moves at
its own pace, one stage at a time; never all stages at once.

## 1. When it fits

- **Fits:** a goal counted in app installs, store conversion or organic installs, for an app already
  live in the country, whose listing may not say what the app does for the words people search there,
  or whose page may not convert (S02 finds which).
- **Stage:** a growth goal past "do users love it", or at that checkpoint when the listing has repairs
  (a wrong screenshot, a claim the app can't back): repairs are never held. Pure tuning before anyone
  knows users love the app is optimising too early; open it then only on the customer's word.
- **Does not fit:** the app is not live there; the customer will not change the listing; the goal
  counts something the store page does not move (revenue from existing users, sign-ups on a website);
  a price or model change is coming that the listing would contradict (wait for it); a product defect
  breaks the promise (tell the product team first, keep only unaffected work).

## 2. How it moves the goal

installs = store impressions × page conversion, by source. Keywords raise search impressions for
relevant intents; the page raises the share who install. Neither store publishes the effect of a
listing change, and a before/after is not proof (`references/measurement.md`); only the store's own
test gives a verdict. Size: unknown until read.

## 3. Gauge

- **Lead:** the stage each store of this app·country has reached (S01-S08), and what it waits on.
- **Second:** approved changes verified live, of N; top-30 places for the S03 core words, read weekly
  for $0 by `agency-store-reads` once a change is live.
- **KPIs (from the console export the customer gives, per store):** store impressions, page conversion,
  organic installs by source, rating and number of ratings. Bought installs are never a KPI; App Store
  search includes ads (A11).
- **Best verdict:** the store's native test result, kept with its status.

## 4. Done when / Pause when

- **Done when:** a cycle's report (S08) has passed its check and reached the customer, and the roadmap
  is decided: the next cycle (back to S02 with the roadmap's items) or the lane stopped, as a `lane_set`
  with its `why`.
- **Pause when:** the customer has made no approved change live 2 weeks after the date they gave (or 2
  weeks after the proposal, if none); a price or model change is coming; console data is withdrawn.

## 5. Score guidance

- **Impact 2-3:** search and the page are the main way a free app is found; 3 when the audit finds
  supported intents missing from the listing or a page that doesn't show what the app does.
- **Confidence 2:** standard practitioner methods and the stores' own tests, but no dependable published
  effect size (`references/research.md`).
- **Control 1-2:** we read, research, write, count and plan the test; the customer approves, publishes
  and starts tests. 1 if nobody on their side is named to publish.
- **Who controls:** us for the files and the report; the customer for approval, publishing, console data.
- **Speed 2:** changes can be live in days; a verdict needs a 28-day window or a full test.

## 6. Seed tasks

The seed is every stage's task, written when the lane opens, each following the stage before. Ids are per app·country: open the lane as `aso-<app>-<country>` and name its
tasks `<lane>-S01`, `<lane>-S02`..., so several lanes never clash. Each task comes
from the table below (with its customer ask, if any), titled by its stage name without its
code ("Audit: …"; the names are in `lanes/stages.json`, which `agency status` copies onto the lane); `references/stages.md` holds each stage's steps and gate. E is
`work/aso/<app>-<country>/<store>/cycle-<n>/`; the files are the `a01-aso` skill's.

```json
[
  {"id": "aso-<app>-<country>-S01", "lane": "aso-<app>-<country>", "kind": "work", "title": "Intake: scope, product truth, access",
   "do": "references/stages.md S01, for each store this app is on in this country: fill 01_Intake.md; ask the customer to show the claimed features in the current build and for console access or a 28-day export",
   "refs": ["work/agency/CUSTOMER.md", "work/discovery/", ".sl8/bot/.claude/skills/a01-aso/references/stages.md"], "skill": "a01-aso", "owner": "us",
   "done_when": "01_Intake.md per store, verify.py ok; every missing input is a customer task",
   "out": "work/aso/<app>-<country>/"}
]
```

| Next | Kind · skill | Out in E | Customer ask with it | Recurs |
|---|---|---|---|---|
| S02 Audit | work · a01-aso | `02_Baseline.csv`, `02_Audit.md`, `02_Reviews.csv` | the console export, if not given | once a cycle |
| S03 Keywords | work · a01-aso | `03_Keywords_Raw.csv`, `03_Keyword_Decisions.csv` | none | once a cycle |
| S04 Metadata | deliverable · a01-aso | `04_Metadata.md`, `metadata-checks.json` | choose among the options, approve the exact version | once a cycle |
| S05 Creatives and test plan | deliverable · a01-aso | `05_Creative_and_Experiment.md` | approve the test | once a cycle; skipped with too little traffic |
| S06 Release | read · agency-store-reads | `06_Release.md` | publish; later start the test | once a cycle |
| S07 Measurement | work · a01-aso | `07_Observations.csv`, `07_Results.md` | the same export for the 28 days after release | once a cycle, plus a weekly read (`every`) of changes live and core-word places from release on |
| S08 Report and roadmap | deliverable · a01-aso | `08_Client_Report.md` (per store), `08_Roadmap.md` | none | once a cycle; then back to S02 |

S04 and S05 go to the customer together in one comms task; S08's report in its own.

## 7. References

`references/stages.md` (the eight stages), `methods.md` (M1-M4 and when each is used), `measurement.md`
(metrics, comparable data, tests), `app-store.md` and `google-play.md` (fields, console steps, tests;
rule lines A01-A11, G01-G10), `research.md` (findings, corrections, 27 sources, limits). The files and `scripts/verify.py`: this skill folder.

## 8. Lessons from our work

- The customer's team, not us, decides when anything goes live: a week after the first report, none of
  its changes were live, and the team had only just been given them as a task (an app customer's
  records, Oct 2026). Ask who publishes and by when, and follow up on their date.
- Keep it short: the first report was "a little heavy on words" (khalid), so v2 became one card per
  change plus a separate paste sheet (an app customer's records, the 15 Oct meeting mapped).
- Claim only what works today: the listings named doctor booking, but booking was broken, so v2 dropped
  the claim (an app customer's records step 18). S01's feature check now catches this first.
- The keyword gap changed the copy: no Play line carried "pregnancy app", which 5 of 9 leaders use, so
  the short description was rewritten around it (an app customer's records 2026-10-21).
- An independent check pays: 32 findings on v2, 3 high (a booking claim left in a frame, an old bar, a
  duplicated keyword under the store's rule) (an app customer's records 2026-10-21).
- Our own install read cannot separate the listing from ads, releases or the season; the verdict is the
  store's test, our read second; the public count moves in batches (an app customer's records, "What
  our measure can and cannot see").
