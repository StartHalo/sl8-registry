# The seed kit — schema, routing, archive, snapshot

The kit is the channel's identity as **files**, not as a memory of what was decided. Everything
here exists to make one guarantee testable: *episode 30 was made from a known kit version, and
that version still exists.*

## `kit/kit.json`

```json
{
  "channel": "mushroom-forager",
  "version": 2,
  "created": "2026-08-23",
  "supersedes": { "version": 1, "archived_at": "kit/archive/v1-2026-08-12/", "reason": "user asked for a winter wardrobe" },

  "character": { "spec": "character/spec.md", "sheet": "character/sheet.png", "hero": "character/hero.png",
                 "seed": 48213, "consistency_score": 9 },
  "style": "style.md",

  "format": {
    "aspect": "16:9",
    "runtime_target_s": 10,
    "shots_per_episode": 5,
    "camera_school": "cinematic",
    "cold_open": "one wide establishing shot before the character enters",
    "sign_off": "slow pull-out on the character, hold 1s",
    "audio": "native engine score + SFX + ambience; no VO"
  },

  "consumed_by": [
    { "episode": 1, "title": "The first flush", "date": "2026-08-12", "kit_version": 1 },
    { "episode": 2, "title": "Winter chanterelles", "date": "2026-08-23", "kit_version": 2 }
  ]
}
```

`version` starts at 1 and increments only on a **reset**. `supersedes` is absent on v1.
`consistency_score` is the character-bible grade the kit shipped at — a channel whose face
scored 7 is a different risk from one that scored 10, and that fact should not have to be
rediscovered by opening an old transcript.

`format` is the part that is easiest to skip and most expensive to lose. A series is not only a
character; it is a runtime, an aspect, a shot rhythm, an opening convention and a sign-off. If
those live only in the first episode's shot list, episode 7 will quietly invent new ones.

## Routing — the four intents

| intent | trigger | kit writes | spend |
|---|---|---|---|
| **create** | no `kit/` for this channel | full kit at v1 | stills + grading |
| **reuse** | `kit/` exists and the brief is a new episode | **none** — read + snapshot | none |
| **reset** | the user asks for a changed character or look | archive, then full kit at v(N+1) | stills + grading |
| **kit-only** | the user asks to set up the channel, no episode yet | full kit, then stop | stills + grading |

Infer, don't interrogate. "Episode 4" with a kit on disk is `reuse`. "Can we give her a winter
coat?" is `reset`, not a prompt tweak — a wardrobe change to a locked token changes the
channel's face and belongs behind the archive.

**The failure mode this table exists to prevent** is treating `reuse` as "rebuild the kit,
it's cheap". It is not cheap and it is not the same kit: image models do not return the same
pixels for the same prompt, so a regenerated sheet is a **new face wearing the old
description**. The tokens will match and the character will not.

## Archive-before-overwrite

On `reset`, before writing anything:

```
cp -R kit/ kit/archive/v<N>-<YYYY-MM-DD>/    # the WHOLE kit, including its own archive/ ancestors
```

Then write v(N+1) in place and set `supersedes`.

Two properties make this worth the disk:

1. **The back catalogue stays explicable.** Episodes 1–6 were made from v1. If v1 is gone, no
   one can say what they were supposed to look like, or match a new episode to them.
2. **A reset is reversible.** Users change their minds about a redesign more often than they
   change their minds about an episode. Reverting means promoting an archive back to `kit/`,
   which is only possible if it was kept whole.

An archive is never edited or pruned. It is the only copy of a version of the channel.

## Snapshot-on-consume

At the start of every episode, **copy** `style.md` and `character/` into the episode's
`kit-snapshot/`, and record `kit_version` in the episode's `plan.json`. From that point the
episode reads only from its snapshot.

```
episodes/04-winter-chanterelles/
├── plan.json          # "kit_version": 2
└── kit-snapshot/
    ├── style.md
    └── character/{spec.md,sheet.png,hero.png}
```

Copy, not symlink, and not "just read from `kit/`". The kit is mutable over a channel's life
and the episode is finished the day it ships. If the episode reads live from `kit/`, then a
reset six months later retroactively changes what episode 4 *claims* it was made from, and its
identity gate — which compares prompts against the spec — starts grading old prompts against a
new character. The snapshot makes the episode a closed, checkable unit.

The disk cost is two PNGs and two markdown files per episode. The alternative is a channel
whose history cannot be verified.

## `kit/continuity.md`

Append-only, one line per established fact, newest last:

```markdown
# Continuity — mushroom-forager

- ep1 (2026-08-12): the forest is temperate deciduous, always overcast. She carries a wicker basket.
- ep2 (2026-08-23): the basket is replaced by a canvas satchel after it breaks. Winter: snow on the ground.
- ep3 (2026-08-24): the cabin is introduced — stone chimney, blue door.
```

Facts a future episode must not contradict — not a recap, not a plot summary. The test for a
line: *would an episode that ignored this look like a continuity error to a viewer?* If not, it
does not belong here.

Continuity is what makes a set of clips a series. It is also the thing most easily lost between
sessions, because it lives nowhere in the character spec and nowhere in the style block.

## What is NOT in the kit

- **The brief for any single episode.** That is episode-scoped and belongs in its `plan.json`.
- **Generated clips or renders.** The kit holds identity and format, never output.
- **Model ids or prices.** `ai-gen models` / `estimate` at runtime are the truth (M1); a price
  baked into a kit is wrong within weeks.

## The known limit — say it out loud

This kit lives in one `artifacts/` tree. It does **not** survive across sandboxes, and this
workflow's v1 makes no attempt to: cross-session persistence is the studio's S6 memory rung,
tracked separately. So a channel is currently continuous within a workspace, not across
machines. When a user asks about resuming their channel elsewhere, say that plainly — the
snapshot and archive discipline here is what will make that rung *implementable* later, and
claiming it now would be a promise the files cannot keep.
