---
name: bot-019-compliance-audit
description: >-
  Audit a real-estate listing's photos and videos against California AB-723 and MLS disclosure rules
  BEFORE they are published, and produce a PASS/FIX compliance report. Use this whenever a real estate
  agent is about to put AI-altered or digitally-edited listing media on the MLS, Zillow, a portal, or
  social and wants to know if it is compliant — virtual staging, twilight/dusk, sky replacement,
  decluttering, restyle, or renovation-concept renders. It runs four checks per item (is it altered
  [c2patool C2PA provenance], does it carry a conspicuous disclosure, is the unaltered original present
  + adjacent + public, and does the edit only make the property look "better, not different"), cites the
  exact rule for every verdict, and lists the concrete fixes. It NEVER publishes anything — it is a
  pre-publish gate, not legal advice. Pair it with the `disclosure-stamp` skill to fix the flagged items.
metadata:
  author: slate-bot (BOT-019 re-compliance-guard)
  references-skills: [disclosure-stamp]
  inputs:
    - name: media
      type: paths
      required: true
      description: the listing media set (images/videos), ideally in publish order
    - name: originals
      type: map
      required: false
      description: altered-file -> unaltered original (local path or public URL) mappings
    - name: declared_altered
      type: list
      required: false
      description: which files the agent knows are altered (used when C2PA provenance is absent)
    - name: jurisdiction
      type: enum
      required: false
      description: "CA-AB723 (default) | CA-CRMLS | other"
  outputs:
    - name: compliance_report
      type: file
      path: artifacts/<project-name>/compliance-report.md
      description: per-item PASS/FIX verdicts with rule cites + concrete fixes + overall verdict
---

# bot-019-compliance-audit

Tell a real estate agent, before they publish, whether their AI-altered listing media complies with
**California AB-723** + MLS rules — and exactly what to fix. Undisclosed altered listing media is a CA
**misdemeanor** + DRE-discipline risk, so this gate exists to catch problems while they're still cheap to
fix. It produces a report; **a human ships** — it never auto-publishes, and it is an assessment, not legal advice.

Read `references/ab723-rulepack.md` (the verdict logic + cites + report template) before writing the
report.

## Workflow (run per project)
1. **Gather** the media set (in publish order if known), any originals, the declared-altered list, and
   the jurisdiction (default `CA-AB723`).
2. **Check 1 — altered?** `bash scripts/ensure-c2patool.sh` (captures `C2PATOOL_PATH::` or exits 4 →
   degrade), then `python3 scripts/detect-altered.py --media <files...> --declared <names> [--c2patool <path>]`.
   A positive C2PA `trainedAlgorithmicMedia` is high-confidence; absence is **not** "unaltered" (C2PA is
   strippable) — fall back to the declared list, and mark unknowns as REVIEW.
3. **Check 2 — disclosure present?** For each altered item, **Read the image** and judge whether a
   legible, conspicuous "digitally altered / virtually staged / conceptual rendering" caption is present.
   (Keyless vision — you are the detector.)
4. **Check 3 — original paired?** `python3 scripts/check-pairing.py --sequence <ordered names...>
   --altered <names> --originals name=orig,...`. It returns present / public-no-login / adjacent + the fix.
5. **Check 4 — better, not different?** For each altered item that has an original, apply the judge in
   `references/better-not-different-judge.md` (Read both images; default DIFFERENT if uncertain).
6. **Write the report.** Combine the four checks per item into a PASS/FIX verdict using the rule-pack's
   verdict logic, cite the exact rule, and list every concrete fix. Use the `compliance-report.md`
   template in `references/ab723-rulepack.md`. End with the ordered fix list + the penalties note +
   "run `disclosure-stamp` on the FIX items."

## Outputs
Write `artifacts/<project-name>/compliance-report.md` (the `<project-name>` runtime token is the current
project's folder). Per-item PASS/FIX with rule cite + fix, an overall verdict, and the fix list. Never a submission.

## Constraints
- **Never publish / auto-submit.** Produce the report; a human ships.
- **Deterministic-first, advisory-on-the-fuzzy.** Checks 1 (c2pa) + 3 (pairing) are scripts; checks 2
  (disclosure vision) + 4 (judge) are advisory — default toward FIX when unsure.
- **Cite every verdict** to a dated rule; flag non-CA boards as needing local confirmation.
- This is a compliance **assistant**, not legal advice — say so in the report.
