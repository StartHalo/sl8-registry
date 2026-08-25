---
name: video-router
description: >
  The front door of the video studio. Reads a brief, detects whether an existing project is
  being resumed, picks exactly ONE creation workflow, installs it if needed, and hands over —
  it makes nothing itself. Use when: any video request arrives without a workflow already
  chosen, "make me a video", "can you do X", an ambiguous brief, or a returning user whose
  project is already on disk. Chain: routes to explainer-video, cinematic-video,
  character-episode or keyframe-scene, then stops. NOT for: doing the work (every workflow owns
  its own runbook), craft decisions of any kind, or overriding a workflow the user named
  explicitly — if they said which one, use it.
---

# video-router — pick one door, then get out of the way

This studio has four creation workflows and one way in. The router's entire job is **choose,
install, hand over**. It owns no craft: no prompt rules, no model routing, no cost discipline,
no QC. A router that knows how to make things is a workflow wearing a hat, and it will start
making decisions that belong two tiers down.

**Route, then stop.** The handed-to workflow runs its own numbered steps from its own Step 0.
Do not pre-plan for it, do not pre-generate anything, and do not spend a credit — a router that
renders has already mis-routed.

## Step 1 — Where are we? (the state table)

**Look at disk before reading the brief.** A returning user's project outranks any keyword, and
resuming the wrong workflow is worse than asking.

| on disk under `artifacts/<project>/` | where we are | route |
|---|---|---|
| `kit/kit.json` | an established **channel** | `character-episode` (its Step 0 decides create/reuse/reset) |
| `plan.json` with `beats[]` carrying `vo_*` | a narrated explainer, part-done | `explainer-video`, RESUME |
| `plan.json` with `scenes[].from` / `.to` | endpoint-pair piece, part-done | `keyframe-scene`, RESUME |
| `plan.json` with `scenes[].shots[]` | a cinematic, part-done | `cinematic-video`, RESUME |
| a project dir with no `plan.json` | an abandoned start | say so, then treat the brief as new |
| nothing | a new piece | Step 2 |

When a project exists, name it and its state back to the user in one line before continuing.
Silent resumption of the wrong thing is the failure this table exists to prevent.

## Step 2 — Which door? (the routing table)

One row per deliverable. Read top to bottom and take the **first** row that matches — the order
is the tie-breaker.

| # | If the brief… | route | why it wins |
|---|---|---|---|
| 1 | names a workflow outright ("use cinematic-video") | that one | an explicit choice is never overridden |
| 2 | names an **episode number, a channel, or "the same character as last time"** | `character-episode` | continuity across pieces is a different problem from making one piece |
| 3 | asks for **narration, a voiceover, a script, or "explain"** | `explainer-video` | it is the only workflow with a VO spine; the others are engine-audio or silent |
| 4 | pins **how a shot ENDS** — a reveal, a morph, "start here and end there", "A becomes B", a transformation, or the user says they can **describe the final image** | `keyframe-scene` | the end state is a supplied input, not an outcome |
| 5 | is a **story, scene, or action piece with a character**, no narration, **and the ending is NOT specified** | `cinematic-video` | one locked identity across shots, engine-native audio |
| 6 | names a subject but **no deliverable shape** | **ask one question** (below) | guessing spends money |

**A character in the brief does not demote row 4.** "My robot character starts rusted and ends
polished" fires rows 4 and 5 both, and row 4 wins — it is listed first for exactly this case.
The presence of a character is not what separates these two workflows; **whether the final image
is supplied** is. `keyframe-scene` holds a character across a pair of frames perfectly well.
This is the router's most-missed row: on its first eval it read "my robot character" as row 5
and lost the endpoint signal entirely.

### The three overlaps that actually happen

**A narrated character series.** Rows 2 and 3 both fire. **Row 2 wins by order**, and that is
deliberate: `character-episode` holds a face across episodes, which `explainer-video` cannot do
at all, while narration can be added to an episode in post. Losing the character is
unrecoverable; losing the VO is an edit. Say which you chose and why.

**A morph starring a character.** Rows 4 and 5 both fire. Ask: *is the end state supplied, or
discovered?* If the user can describe the last frame, it is `keyframe-scene`. If they want to
see what happens, it is `cinematic-video`.

**"Show how X works" with no VO requested.** Row 3's trigger is the word, not the intent —
"explain" without narration is usually still `explainer-video`, because its boards-first spine
is built for exposition. Confirm rather than assume; this one is genuinely close.

### When nothing matches — and this branch is easier to skip than it looks

A brief can be perfectly clear about its **subject** and say nothing about its **shape**. Those
are not the same thing, and only shape routes.

> *"Can you make me a video about my coffee shop?"*

That has a subject. It has no narration, no character, no end state, no episode — nothing any
row keys on. It is **row 6**, and on the router's first eval it was answered `explainer-video`
instead, because a coffee-shop video *sounds* like something explainer-video could do. Every
workflow sounds like something. Plausibility is not a routing signal.

**The test:** strike out the subject matter and re-read the brief. If what remains names no
narration, no recurring character, no supplied end frame and no episode, there is nothing to
route on — ask. A one-line question costs a message; a wrong route costs a generation budget.

Ask **one** question, offering the four doors in plain language — not their skill names:

> Is this **(a)** something explained with a voiceover, **(b)** a short film with a character,
> **(c)** the next episode of a series you have already started, or **(d)** a shot that has to
> end on a specific image?

One question. Not a questionnaire, and not a guess.

## Step 3 — Install and hand over

The domain tier is **baked into the runtime** — `style-system`, `frame-craft`,
`video-prompting`, `voice-timing`, `assembly-qc`, `character-bible` are already present and
must never be installed. Workflows may be baked or lazy depending on the release; check before
installing:

```bash
ls /home/user/.claude/skills | grep -qx "<workflow>" || skills add <workflow>
```

Then hand over in one line — the chosen workflow, the reason in a clause, and whether this is a
new piece or a resume:

> "Routing to `keyframe-scene` — the brief pins the final image, so the end state is an input.
> New project."

Then **stop.** The workflow reads the brief itself from its own Step 0. Restating the brief in
your own words is how a router smuggles craft decisions downstream.

## What this skill must never do

- **Spend.** No `ai-gen` call of any kind. If a credit moved, the route was wrong.
- **Plan.** No beats, no scenes, no shot lists, no style. The workflow's Step 1 owns that.
- **Decide craft.** No model choice, no resolution, no duration, no aspect.
- **Route to two.** Exactly one workflow per brief. A piece that genuinely needs two is two
  pieces, and that is a conversation, not a route.
- **Override an explicit request.** Row 1 exists for that and it is first for a reason.

## Quality bar

- [ ] Disk was checked before the brief was read; any existing project was named back.
- [ ] Exactly one workflow chosen, and the reason stated in a clause.
- [ ] The choice traces to a numbered row of the routing table, not to a vibe.
- [ ] If a character appeared in the brief, row 4 was considered BEFORE row 5 — a character
      does not demote an endpoint brief.
- [ ] If the brief named only a subject and no shape, row 6 was taken. Plausibility is not
      a routing signal; every workflow sounds like it could do anything.
- [ ] Zero paid calls. Zero artifacts written under `artifacts/`.
- [ ] Handed over without restating, re-planning, or pre-empting the workflow's own Step 0.
