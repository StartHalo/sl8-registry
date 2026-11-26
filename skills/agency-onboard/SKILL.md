---
name: agency-onboard
description: Start a new customer's engagement in job 1. Writes work/agency/CUSTOMER.md from bot/user.md and public sources, opens the two standing lanes (plan, comms), logs the goal and adds its plan task. Use in job 1, when there is no log yet.
metadata:
  status: core
  version: 1.2.0
---

# Onboard a customer

Job 1 (no log yet). The engagement is `bot/user.md` (A10); this skill turns it into a running account.

1. **Log the start:** `agency log onboarded '{"customer":"<customer id from bot/user.md>"}'`.
2. **CUSTOMER.md:** read `bot/user.md`, then write `work/agency/CUSTOMER.md` from the template beside
   this skill (`~/.claude/skills/agency-onboard/CUSTOMER.md`): who they are, the people and who
   decides, and their rules, from `bot/user.md` and public sources (each fact with its source), with the
   contact in People (A11). The parameters stay in `bot/user.md`; never copy them. Add any standing
   instructions with their date and words. When the request names an onboarding call, read its
   `meetings/<folder>/` notes and transcript as a source. What the engagement lacks that the work needs
   (the goal's figure or date, an account): a customer task asking the owner to add it to the
   engagement; never a guess.
3. **Standing lanes:** `lane_opened` for `plan` and `comms` (each `{"standing": true, "state": "active"}`).
4. **The goal:** from `bot/user.md`, log it (`goal`, whole object), log the
   starting figure as a `read`, and add a `plan` task: "plan G1", done when `work/plan/G1.md` is
   written and its discovery lane is open (how-to-plan §0). The lanes the plan opens
   each need a `title`; the tool titles the standing ones.
5. **The dashboard:** `agency status`, then `agency check`.
