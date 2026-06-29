# Keyframe grammar — how a first-last-frame keyframe plan is built

Depth reference for stage 3 (plan). Load before writing a plan. Everything here is baked inline —
the runtime sandbox has NO knowledge-base access, so this file IS the recipe.

This bot pins **BOTH the first and last frame of every scene**. That is the whole trick: stage 4
generates one still image per *state* (via the shared `gen-image.sh`), then morphs each *scene*
from one pinned state to the next with Hailuo first-last (first frame = `state[i]`, last frame =
`state[i+1]`). Because every state is the END of one scene AND the START of the next, the short is
a **continuity-chained journey through K+1 pinned states with no jump cuts**. Precise reveals,
transformations, and morphs (an egg cracks → a dragon hatches → it flies) become trivial: you
*draw the before and the after* and let the model interpolate the motion between two frames it
cannot drift away from.

The character is **self-contained in the keyframes** — there is no separate character-bible
artifact. The identity comes from the **token seed kit** (`artifacts/seed/`, `consumption:
text-weave`): the 5–7 FROZEN CHARACTER tokens are woven byte-identical into the state descriptions,
and that verbatim reuse (plus consecutive scenes literally sharing an end/start frame) is what
holds identity across the whole short.

> **Where the tokens come from.** In this new-architecture build you do **not** invent the
> character at plan time — the frozen tokens live in the persistent seed kit and are copied
> verbatim into the plan's `## Character` and the states. To change the character, run
> `bot-035-update-character` (a FREE token re-freeze), not a per-plan edit.

This is a **pure-LLM stage** — no `ai-gen` calls, no network, no images. The plan is a text
contract stage 4 reads.

## 1. The render mechanic (read before writing anything)

Per scene `i` (1..K), stage 4: (1) gets the keyframe for `state[i-1]` — the **first frame**;
(2) gets the keyframe for `state[i]` — the **last frame**; (3) runs Hailuo in first-last mode
("start at this image, end at that image, ~6s") — the model invents only the *motion* between two
frames it is pinned to; (4) concatenates the K clips in order.

Two facts make this hold together, and both are your job here:

- **CONTINUITY CHAIN.** `state[i]` is the **last** frame of scene `i` and the **first** frame of
  scene `i+1` — the SAME image. So scene `i+1` literally begins on the exact frame scene `i` ended
  on. No jump cuts. Your `## Scenes` section must declare this chain on every scene: scene `i` is
  `state (i-1) -> state i`.
- **K+1 STATES FOR K SCENES.** A journey through K scenes touches K+1 pinned moments (state 0 = the
  very first frame; state K = the very last). Off-by-one breaks the render — the linter hard-gates it.

## 2. The recipe — first-last-frame keyframing

### State = a FULL standalone image description

Each `State N:` is a **complete image prompt on its own** — everything the image model needs to
draw that single frame, with **no reference to other states**. Describe the character *in that
exact pose / moment*, the setting, the lighting, the composition. Reuse the frozen CHARACTER tokens
**verbatim** (copy-paste, never paraphrase) so every state renders the same creature. A state that
says "the dragon, now bigger" is wrong — restate the full character.

- State 0 is the opening frame (often the character *before* it appears — a closed egg, a dark
  doorway, a folded form).
- State K is the closing frame — the payoff pose.
- Each interior state is a distinct, drawable *moment* chosen so the motion between it and its
  neighbours is one clean beat the i2v model can interpolate.

### Scene = ONE motion/transition between two pinned frames

Each `Scene i:` opens by declaring the chain `state (i-1) -> state i`, then gives **one**
motion/transition line: *how* `state[i-1]` becomes `state[i]`. Keep it to one primary
transformation + an optional gentle camera move:

- ✅ "The crystal egg begins to crack: a seam splits and warm light spills out; camera holds a
  gentle static framing." (one transformation, one camera idea)
- ❌ "The egg cracks AND the dragon flies away AND the sun sets." (three beats — split into three
  scenes, each with its own pinned end frame)

Because both endpoints are pinned, do **not** re-describe the character in the scene line — the two
frames carry it. Refer to it as "the dragon" / "the egg".

## 3. Choosing the states (the arc lives in the state sequence)

The states ARE the storyboard. Pick K+1 moments that read as a clean transformation when walked in
order. The universal shape for a reveal/transformation/morph:

**dormant/hidden → first sign → emergence → full form → payoff action.**

- Give each state a *visually distinct silhouette* from its neighbours — that is what makes the
  interpolation legible (closed egg vs cracked egg vs peeking head vs standing+wings vs hovering).
  If two adjacent states look nearly identical, the scene between them has no motion.
- The biggest *change* lands where you want the emotional peak (the hatch, the unfurl, the
  lift-off).
- More states = smoother/slower transformation but more clips; fewer states = bolder jumps. Default
  4 scenes (5 states) is a good reveal length at ~6s each (~24s total).

## 4. The frozen CHARACTER tokens (from the seed kit)

The `## Character` section lists the **5–7** tokens **copied verbatim from the token seed kit**
(`artifacts/seed/identity.md` → mirrored in `seed.manifest.json` → `identity.tokens`), as
`- <key>: <token>` bullets — face, body, color, eyes, signature at minimum. Rules:

- **Concrete and visual.** "enormous round amber eyes with bright catchlights", not "expressive
  eyes". (These properties are already true of the seed tokens — keep them byte-identical.)
- **No-paraphrase lock.** The token text in `## Character` must appear *verbatim* somewhere in the
  states (the linter's python pass enforces this). If the token is "amber eyes", write "amber eyes"
  in the state — not "golden eyes".
- **Friendly / cute / stylized only.** Never a realistic identifiable human face or a real named
  person — stylized characters/creatures only.

## 5. The footer

Close with the footer. Hailuo (the keyframe render model) clips are **silent**, so the audio is
always an **added ambient bed**, never native — say so.

```
Total: <K> scenes, ~6s each, <AR>. Audio: <ambient music bed + gentle SFX> (an added ambient bed — Hailuo clips are silent).
```

`Total:` must restate the scene count `K` (= number of `Scene` blocks) and the aspect ratio.

## 6. Anti-patterns (avoid)

| anti-pattern | consequence | instead |
|---|---|---|
| K states for K scenes (off-by-one) | render mis-pairs frames / a scene has no end frame | K+1 states for K scenes — state 0..K |
| A scene that skips a state (state 1 -> state 3) | a jump cut; the chain is broken | each scene is `state (i-1) -> state i`, contiguous |
| Paraphrasing a token per state ("amber" → "golden") | identity drift across frames | paste the frozen seed token verbatim every time |
| Inventing a new character at plan time | drifts from the persistent seed kit | copy the seed's frozen tokens; change the character via update-character reset |
| A state that references another ("the same dragon, bigger") | the image model has no other frame to look at | every state is a FULL standalone image description |
| Two transformations in one scene | the i2v model can't interpolate two beats cleanly | one transformation per scene; add a state to split it |
| Two adjacent states that look identical | the scene between them has no visible motion | give each state a distinct silhouette |
| A realistic human face / real person | face-policy + bot rule | friendly stylized characters / creatures only |
| Saying the audio is native | Hailuo clips are silent | disclose it as an added ambient bed |

## 7. Fully worked example — `dragon-hatch` (4 scenes, 5 states, 16:9)

This example uses the **default seed character** (the baby dragon). Brief: "a friendly baby dragon
hatches from a glowing egg and takes its first flight." The whole short is the journey through five
pinned states; each scene animates one state into the next.

```markdown
# Keyframe Plan: dragon-hatch

## Style

Cute storybook fantasy short, soft Pixar-style 3D animation, warm magical lighting, gentle bloom, shallow depth of field, cozy children's-book color palette.

## Character

- face: a round button-nosed baby dragon face with big soft cheeks
- body: a small chubby dragon body with stubby legs and a stubby tail
- color: smooth teal-and-mint scales with a pale cream belly
- eyes: enormous round amber eyes with bright catchlights
- signature: tiny translucent gold wings and three little dorsal nubs
- horns: two soft rounded baby horns the color of honey

## Keyframe States

State 0: a glowing crystal egg nestled in a mossy nest, the smooth teal-and-mint scales patterned shell lit from within by a warm magical glow, soft Pixar-style render, no dragon visible yet.
State 1: the same crystal egg now cracking, a jagged seam of warm light spilling out across the mossy nest, fine fractures racing over the shell, glowing motes drifting up.
State 2: a cute baby dragon peeking out of the broken shell — a round button-nosed baby dragon face with big soft cheeks, enormous round amber eyes with bright catchlights blinking, smooth teal-and-mint scales with a pale cream belly just visible, two soft rounded baby horns the color of honey.
State 3: the baby dragon standing in the nest and unfurling its wings — a small chubby dragon body with stubby legs and a stubby tail, tiny translucent gold wings and three little dorsal nubs spread wide, big soft cheeks puffed, looking delighted.
State 4: the baby dragon lifting into a joyful first hover just above the nest, tiny translucent gold wings and three little dorsal nubs fluttering fast, enormous round amber eyes with bright catchlights shining, a happy open-mouthed grin, warm light all around.

## Scenes

Scene 1: state 0 -> state 1. The crystal egg begins to crack: a hairline seam splits across the shell and warm light spills out, fractures spreading as glowing motes drift upward; camera holds a gentle static framing on the nest.
Scene 2: state 1 -> state 2. The shell breaks open and the baby dragon peeks out, blinking its enormous amber eyes for the first time; a slow gentle push-in.
Scene 3: state 2 -> state 3. The baby dragon climbs fully out and stands, unfurling its tiny gold wings with a happy wobble; the camera eases back to a soft medium.
Scene 4: state 3 -> state 4. The dragon flaps its little wings and lifts into a joyful first hover above the nest, then steadies with a delighted grin; a slow rising tilt follows it up.

## Footer

Total: 4 scenes, ~6s each, 16:9. Audio: a warm whimsical music-box and soft orchestral bed with gentle chimes and a tiny happy chirp on the hover (an added ambient bed — Hailuo clips are silent).
```

Why it works: **5 states for 4 scenes** (K+1 for K); the states walk a clean
dormant→first-sign→emergence→full-form→payoff arc with five distinct silhouettes; every scene
declares its `state (i-1) -> state i` chain so there are no jump cuts; the frozen seed tokens
("enormous round amber eyes with bright catchlights", "tiny translucent gold wings and three little
dorsal nubs", …) are pasted verbatim into the states; each scene line is one transformation + one
gentle camera idea; and the footer discloses the audio as an added ambient bed because Hailuo clips
are silent. The character is fully self-contained in the keyframes — no separate bible.
