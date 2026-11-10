---
name: agency-onboard
description: Start a new customer's engagement in job 1. Writes work/agency/CUSTOMER.md from bot/user.md and public sources, opens the three standing lanes (discovery, plan, comms) with their seed tasks, and logs the goal. Use in job 1, when there is no log yet.
metadata:
  status: core
  version: 1.1.0
---

# Onboard a customer

Job 1 (no log yet). The engagement is `bot/user.md` (A10); this skill turns it into a running account.

1. **Log the start:** `agency log onboarded '{"customer":"<customer id from bot/user.md>"}'`.
2. **CUSTOMER.md:** read `bot/user.md`, then write `work/agency/CUSTOMER.md` from the template beside
   this skill (`~/.claude/skills/agency-onboard/CUSTOMER.md`): who they are, the people and who
   decides, and their rules, from `bot/user.md` and public sources (each fact with its source), with the
   contact in People (A11). The parameters stay in `bot/user.md`; never copy them. Add any standing
   instructions with their date and words.
3. **Standing lanes:** `lane_opened` for `discovery`, `plan` and `comms` (each
   `{"standing": true, "state": "active"}`).
4. **Seed tasks:**
   - **discovery:**
     - the profile (work, from public sources);
     - 5–8 comparable companies (work);
     - their own plans for the next three months, and the access we have (customer, asked by email);
     - a discovery summary (deliverable).
   - **comms:** no email yet. The first one goes after the run, with the plan and the first checked
     deliverable (agency-comms); with no goal yet, after discovery, with the discovery summary. The
     questions only they can answer ride along in it; never ask what discovery can find out.
5. **The goal:** from `bot/user.md`, log it (`goal`, whole object), log the
   starting figure as a `read`, and add a `plan` task: "plan G1", done when `work/plan/G1.md` is
   written and its lanes are opened and ranked. Park it on the discovery summary
   (`task wait <plan id> --on <summary id>`): discovery comes before the plan (D51). The goal lanes the plan opens
   each need a `title`; the tool titles the standing ones.
6. **The dashboard:** `agency status`, then `agency check`.
