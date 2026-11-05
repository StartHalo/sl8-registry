---
name: a01-aso
description: The ASO agency's own skill - its lane (lanes/store-pages.md), its method (references/, stages S01-S08), and the files of one ASO cycle for one app on one store - intake, baseline, audit, reviews, keywords raw and decisions, metadata and its counts, creative and test plan, release record, observations, results, the per-store report and the roadmap - their order, a simulated example of good, and scripts/verify.py, which checks a live engagement folder. Use for every stage task of an aso/store-pages lane (one app in one country, per store).
metadata:
  status: draft
  version: 0.1.0
---

# a01-aso

Source: Khalid's ASO guide, sl8-studio/sl8-resesarch `research/aso/v1.0/` @ 9616aff4, read 1 Nov 2026:
`04_Templates/` (adapted as noted below), `05_Worked_Example/` and `validation/verify_package.py`.
The lane is `.sl8/bot/.claude/skills/a01-aso/lanes/store-pages.md`; the work instructions are `.sl8/bot/.claude/skills/a01-aso/references/stages.md`; the rest
of this folder is the files.

## Files here

- `templates/`: copy into **E** = `work/aso/<app>-<country>/<store>/cycle-<n>/` as each stage needs them. Brackets
  are prompts to replace; CSVs hold headers only. Blank metrics mean unknown, never zero. Raw exports go
  untouched into `E/evidence/`.
- `example/`: RitualLoop, a completed engagement. **Every fact, figure, approval and result in it is
  SIMULATED** (an invented app): the example of good for depth and honesty, never evidence and never a
  source for a customer's file. It keeps both stores in one folder; a live E is one store.
- `scripts/verify.py`: checks E (below).

## The files, in order

| Stage | Files in E | Example |
|---|---|---|
| S01 Intake | `01_Intake.md` | `example/01_Intake.md` |
| S02 Audit | `02_Baseline.csv`, `02_Audit.md`, `02_Reviews.csv` | the same names |
| S03 Keywords | `03_Keywords_Raw.csv`, `03_Keyword_Decisions.csv` | 28 candidates per store, demand unknown (no-tool branch) |
| S04 Metadata | `04_Metadata.md`, `metadata-checks.json` (exact final strings, count, unit, limit) | an 83-character draft failing 80, then the fix |
| S05 Creatives | `05_Creative_and_Experiment.md` | one treatment, one changed screenshot |
| S06 Release | `06_Release.md` (release and test events, paid activity and releases, incidents) | two windows: metadata, then the test |
| S07 Measurement | `07_Observations.csv` (same columns as the baseline), `07_Results.md` | before/after with limits; a teaching test |
| S08 Handover | `08_Client_Report.md` (the customer's report, one store), `08_Roadmap.md` | handover and next cycle |

CSV rules: ids unique; counts nonnegative and paired with a unit, definition and source; a keyword
decision joins one candidate; one candidate belongs to one store/market/language; baseline and
observations use the same metrics; dates and provider survive a spreadsheet export.

## How to verify

```
python3 .sl8/bot/.claude/skills/a01-aso/scripts/verify.py work/aso/<app>-<country>/<store>/cycle-<n>/
```

It prints `verify: ok` or one line per fault: a stage file missing before a later one, CSV columns not
the template's, duplicate ids, a count without unit or source, a mode missing or mixed (LIVE, DRAFT,
SIMULATED), unfilled template prompts, keywords not joined or a Reject/Later term given a field, a demand
value without its provider and scale, a baseline metric not observed again, a field over its limit
(Apple's keyword field in UTF-8 bytes). Run it before closing each stage's task and before the
separate check of a deliverable; `python3 .sl8/bot/.claude/skills/a01-aso/scripts/verify.py .sl8/bot/.claude/skills/a01-aso/example/` shows it passing.
It checks files and arithmetic, not marketing efficacy, and touches no store.

## What changed from the guide's templates

- `06_Release_and_Status.md` → `06_Release.md`: stage status is the lane's tasks in the log, decisions
  are `decision` events, messages are the comms lane (core); the release and test events, previous
  values and incidents stay here.
- `01_Intake.md`: names only the customer's people; communication cadence is core.
- `08_Client_Report.md`: one store per report, KPIs → areas (three at most) → actions (four options
  each) → tests, from the agency's Taste; the guide's fields (verified state, n/d with dates,
  observational or experimental, what we can and cannot conclude) kept.
- `communications.md` is not carried: client messages are core (`agency-comms`, `agency-email`).
