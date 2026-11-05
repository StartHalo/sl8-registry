# Lane: retention feature

Library id: `retention-feature`. A short spec for one feature that gives users a regular reason to
come back and to share (for example a weekly update with a push on the day it turns, and a share
card with a tracked install link), built by the customer's developers.

## 1. When it fits

- **Fits:** an app goal (installs, active users) where users have a natural rhythm (a week of
  pregnancy, a school term, a habit) and the customer has developers who can build it in a planned
  sprint. It belongs at the "do users love it" checkpoint, because it moves and reads return.
- **Stage:** any growth stage; best when the store or the channel already brings visitors
  and the question is whether they stay.
- **Does not fit:** the customer has no developer time in the next month or two; the feature would
  contradict a change of model they have announced (a free reveal in an app going paid); there is no
  way to read return (no analytics and no figure the customer will give).

## 2. How it moves the goal

Users who come back each week rate and recommend the app; each share is a tracked link:
new installs from shares = weekly active users × share rate × installs per share. Return itself is
the "do users love it" read. Sizes are unknown until the first weeks are read.

## 3. Gauge

- **Before it is live:** the spec delivered; then built and live in both stores (a count of 2
  steps: the customer's word, or the version date from `agency-store-reads ios-lookup` and the listing).
- **After it is live:** the share of users who open the app again within a week, before and after
  (the customer's analytics; a `customer` task asks for it, then a `read` logs the number); installs
  from the share link (the link's own count).
- **Weekly target:** none until live; then one read a week for 4 weeks.

## 4. Done when / Pause when

- **Done when:** 4 weekly sends of the feature are live and the return before and after, and the
  share-link installs, are logged; then keep (return up, installs arriving) or stop changing it.
- **Pause when:** the spec is not in a build sprint 4 weeks after it was sent, or the customer's
  model change makes the spec wrong (rewrite it first, as a new version).

## 5. Score guidance

- **Impact 2:** it adds no installs by itself at first; it moves return and shares, which move
  ratings and invitations.
- **Confidence 2:** most leading apps in the category keep such a feature free and users praise it
  in reviews; its effect on installs is unproven.
- **Control 1:** we write the spec; the customer's team builds it and owns the data.
- **Who controls:** the customer for the build and the figures; us for the spec and the reads.
- **Speed 1:** weeks to a sprint, then 4 weeks to read.

## 6. Seed tasks

```json
[
  {"id": "S1", "lane": "retention-feature", "kind": "read", "title": "Read what the app already has",
   "do": "screens, store screenshots and reviews: is there already a version of the feature, and what is broken in it",
   "refs": ["work/discovery/"], "skill": "agency-store-reads", "owner": "us",
   "done_when": "a note with each screen read and its date",
   "out": "work/retention/today.md"},
  {"id": "S2", "lane": "retention-feature", "kind": "work", "title": "What the leaders do, and what users say",
   "do": "how 5 to 8 leading apps run the feature (free or paid, push timing, share card); review quotes for and against",
   "refs": ["work/discovery/", "work/retention/today.md"], "skill": "agency-web-reads", "owner": "us",
   "done_when": "one row per app, each with its source; counts not rounded up",
   "out": "work/retention/leaders.md"},
  {"id": "S3", "lane": "retention-feature", "kind": "deliverable", "title": "Feature spec, one or two pages",
   "do": "each change as: today, what leaders do, the change; what we need from them (a named expert for content, the build, the return figure); unknowns written as unknown",
   "refs": ["work/retention/today.md", "work/retention/leaders.md", "work/agency/CUSTOMER.md"], "skill": "agency-report-pdf", "owner": "us",
   "done_when": "every claim sourced; nothing promised on their behalf; evaluator passes",
   "out": "work/retention/spec-v1.pdf"},
  {"id": "S4", "lane": "comms", "kind": "comms", "title": "Send the spec",
   "do": "short email: the spec, the asks (expert name, sprint, the weekly return figure before the build)",
   "refs": ["work/retention/spec-v1.pdf"], "follows": "S3", "skill": "agency-comms", "owner": "us",
   "to": "<customer email, from bot/user.md>", "out": "work/comms/<task id>.md"},
  {"id": "S5", "lane": "retention-feature", "kind": "customer", "title": "Put the spec in a sprint and build it",
   "do": "schedule it, build it, release it on both stores; say the sprint dates", "skill": "none", "owner": "customer"},
  {"id": "S6", "lane": "retention-feature", "kind": "customer", "title": "The weekly return figure, before the build",
   "do": "share of users who open the app again within a week, from their analytics", "skill": "none", "owner": "customer"},
  {"id": "S7", "lane": "retention-feature", "kind": "read", "title": "Weekly: is it live; return and share-link installs",
   "do": "check the release; log the return figure the customer gave and the share link's installs",
   "skill": "agency-task", "owner": "us", "every": "mon",
   "notes": "the release with agency-store-reads; the return figure from the customer's weekly answer (ask it in the Monday email)",
   "done_when": "read events logged for each number available that week"}
]
```

## 7. References

The app today (screens, store screenshots, reviews), the leaders' notes, the customer's planned
sprints and any announced change of price or model, the customer's analytics figure if given.

## 8. Lessons from our work

- Read the app before writing: the check found the app already had the weekly guide, so the spec
  became "keep it free and fix it, then add the push and the share card"
  (an app customer's records 2026-10-19).
- Count exactly: the draft said "7 of 8 keep it free"; only 5 do, as two leaders' reviews complain
  of paywalls (an app customer's records 2026-10-19).
- Copy the technique, not its cost: one leader's pushes carried on after a logged pregnancy loss
  (the draft had said the opposite), so the spec stops pushes after a loss
  (an app customer's records 2026-10-19; its `README.md`, scope).
- Ask for a figure, not for access: the ask became "the share of users who open the app again within
  a week, from your analytics" after khalid's "No access asked"
  (an app customer's records, fix M1).
- A model change can undo a spec: the customer then planned a paid app in one market, which meets a
  spec that says "keep it free for every user" (an app customer's records 2026-10-23, sync).
- Time it to the customer's sprints: the spec was written for a planned two-sprint cleanup by 4
  developers (an app customer's records, the 15 Oct meeting mapped). Whether it lifts return is unproven.
