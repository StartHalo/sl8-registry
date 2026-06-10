# Beat grammar — how a stickman episode is built

Depth reference for `bot-013-episode-design`. Load before writing beats.

## 1. The arc

Every episode is one escalating joke told in 3–8 silent beats:

| stage | job | typical beats |
|---|---|---|
| **Setup** | A recognizable everyday situation + the want. The viewer must "get it" from the first still alone. | 1 |
| **Complication** | The first thing that goes sideways — small, plausible, physical. | 1 |
| **Escalation** | The problem compounds. Raise stakes through OBJECTS and TIME (more parts on the floor, longer shadows), never through facial acting — the figure has no face to act with. | 1–3 |
| **Punchline / anticlimax** | The visual reveal. Deadpan beats loud: the second box in the doorway lands harder than a tantrum. Usually the only 10s beat. | 1 |

Why this works for the format: the figure is minimal by contract, so the comedy lives in
posture (slumped shoulders, frozen mid-reach) and spatial composition (the clock behind
him, the shrinking floor space). Write beats as *stage directions for a mime in a real
room*.

**Loopable endings.** If the final beat's situation visually rhymes with beat 1 (a second
identical box appears; he flops back onto the pillow), the Short replays seamlessly and
watch-through compounds. Prefer a loop whenever the premise allows one; note it in
`## Notes`.

**Pacing.** Default every beat to 5s; give 10s only to the beat that needs dwell time —
almost always the punchline. A 4–6 beat plan with one 10s beat lands naturally at 25–35s,
the Shorts sweet spot. Totals must stay within 15–60s (linter-enforced).

## 2. The composition contract (worked)

The plan's `scene` and `motion` fields are fragments. Downstream phases assemble them
with frozen blocks that must always appear EXACTLY as below — they are the bot's only
consistency mechanism (no reference-image model is available, so identity and style are
carried purely by repeated verbatim language plus a fixed seed).

Still prompt = five blocks in order:

1. **STYLE_STACK** — "Hand-drawn pencil sketch animation style, visible graphite grain, subtle smudging, light cross-hatching, varied line weight, on plain white paper background."
2. **CHARACTER_BLOCK** (default; phase 2 may lock a custom one in `character-spec.md`) — "An extremely minimal hand-drawn stick figure: a plain circle head, two small dot eyes, a simple curved smile, a small baseball cap worn slightly tilted, a small plain rounded torso drawn as one soft solid teardrop shape, and single-stroke arms and legs. No other facial features, no clothing besides the cap, no fingers — simple line hands. Proportions: head about one fifth of total height, limbs slightly longer than the torso. Every image of this character uses this exact same body construction."
3. **scene block** — the plan's `scene` field (the ONLY variable text).
4. **DISCIPLINE_BLOCK** — "Environments and objects rendered with realistic structure, weight, and light pencil shading. Communicate narrative through posture and spatial composition alone; no exaggerated facial expressions. Consistent lighting direction. The figure stays minimal while the world stays believable."
5. **NEGATIVES_BLOCK** — "No color, no photorealism, no text, no watermarks, no extra limbs, no duplicate figures."

Clip prompt = three lines:

1. **CLIP_STYLE_LOCK** — "A stick figure hand-drawn pencil sketch animation."
2. The plan's `motion` field.
3. **CLIP_NEGATIVES** — "Single continuous shot, no cuts. No morphing, no extra limbs, no text. The character keeps exactly the same proportions and cap."

### Fully composed example (Beat 3 of example plan A below)

Still prompt as phase 3 will send it:

```
Hand-drawn pencil sketch animation style, visible graphite grain, subtle smudging, light cross-hatching, varied line weight, on plain white paper background. An extremely minimal hand-drawn stick figure: a plain circle head, two small dot eyes, a simple curved smile, a small baseball cap worn slightly tilted, a small plain rounded torso drawn as one soft solid teardrop shape, and single-stroke arms and legs. No other facial features, no clothing besides the cap, no fingers — simple line hands. Proportions: head about one fifth of total height, limbs slightly longer than the torso. Every image of this character uses this exact same body construction. The stickman stands holding a large wooden panel against a half-built wardrobe frame, the panel overhanging the frame edge at a clearly wrong angle, his shoulders sagging; screws and an instruction sheet scattered on the rug at his feet. Medium shot, eye level. Environments and objects rendered with realistic structure, weight, and light pencil shading. Communicate narrative through posture and spatial composition alone; no exaggerated facial expressions. Consistent lighting direction. The figure stays minimal while the world stays believable. No color, no photorealism, no text, no watermarks, no extra limbs, no duplicate figures.
```

Clip prompt as phase 4 will send it:

```
A stick figure hand-drawn pencil sketch animation.
The stickman lowers the oversized panel from the frame, shoulders dropping as it clearly does not fit. Static camera.
Single continuous shot, no cuts. No morphing, no extra limbs, no text. The character keeps exactly the same proportions and cap.
```

### What this means for plan fields

- The scene block carries WHAT happens and WHERE, plus the framing phrase at its end —
  the frozen blocks carry everything else. Restating style or character text inside
  scene/motion makes the model weigh it twice and drift (linter rejects the common
  duplications).
- Refer to the figure as "the stickman" / "the figure" / "his". One figure per episode —
  NEGATIVES_BLOCK explicitly bans duplicates.
- No color words, no facial expressions, no text in frame (except the one-label
  convention below) — those contradict blocks 4–5.
- Keep scene blocks 1–3 sentences (≤600 chars): the frozen blocks already cost ~860
  chars and some fallback models cap prompt length.

## 3. Craft rules per field

**scene** — one concrete action frozen at its most legible instant ("stands holding the
panel against the frame", not "assembles the wardrobe"). Ground the room with 2–3
realistic props that earn their place in the story (clock = time pressure; second box =
punchline). End with the framing phrase: "Medium shot, eye level." / "Close shot,
slightly high angle." Close/medium ONLY — wide shots shrink the figure below the
resolution where its anatomy survives.

**motion** — describe the 5–10 seconds of movement that start from the still: one action
with a beginning and an end ("flips the sheet over and tilts his head"), plus at most
one camera move from the small dependable set: "Static camera." / "Slow push-in." /
"Slow pull-back." / "Handheld sway, slight." Two actions = broken motion; two camera
moves = warped geometry.

**duration** — 5 or 10. The i2v models generate exactly these lengths; any other number
is unfulfillable.

**camera** — compressed cinematography note: `framing, angle; camera behaviour`
(e.g. `medium, eye level; static`). Phases 3–4 cross-check scene/motion text against it.

**In-frame text** — at most ONE beat per episode, a single 2–8 letter UPPERCASE word in
straight double quotes inside the scene block (e.g. `a cardboard box stenciled
"FRAGILE"`). The quoted word routes that still to the text-capable model chain
downstream; flag it in `## Notes`. Anything more gets garbled by every model in the
default chain.

**One location** — each still is generated independently; every new room multiplies
drift risk. Keep the episode in one room and vary framing/action instead. If the story
truly needs two locations, make the move itself a beat.

**9:16 plans** — compose for a vertical frame: figure centered, props stacked above/below
him (wall clock above, parts on the floor below), framing slightly tighter; add "vertical
framing" to the framing phrase so the still prompt carries it.

## 4. Worked example A — `ikea-deadline` (16:9, ~30s, 5 beats)

Topic: "assembling flat-pack furniture before guests arrive". A complete, linter-passing
plan:

```markdown
# Episode Plan: ikea-deadline

logline: A stickman races to assemble a flat-pack wardrobe before his guests arrive, and wins just in time to find the second box.
aspect: 16:9
target-length: 30
punchline: Some assembly required.
room-tone: on

## Beats

### Beat 1: box-arrives
scene: The stickman stands in a tidy living room beside a tall flat-pack cardboard box stenciled "FRAGILE" leaning against the wall, one hand flat on top of the box, head tilted down toward a folded instruction sheet in his other hand; a round wall clock above the doorway, a sofa and rug grounding the room. Medium shot, eye level.
motion: The stickman flips the instruction sheet over and tilts his head, the tall box wobbling slightly against the wall. Static camera.
duration: 5
camera: medium, eye level; static

### Beat 2: parts-everywhere
scene: The stickman kneels in the middle of the living-room floor surrounded by laid-out wooden panels, neat rows of screws, and an open toolbox, holding one small bracket up close to his head; the flattened empty box propped against the sofa behind him. Medium shot, slightly high angle.
motion: The stickman turns the small bracket over in his hands and looks slowly across the rows of parts laid out around him. Slow push-in.
duration: 5
camera: medium, slightly high angle; slow push-in

### Beat 3: wrong-panel
scene: The stickman stands holding a large wooden panel against a half-built wardrobe frame, the panel overhanging the frame edge at a clearly wrong angle, his shoulders sagging; screws and an instruction sheet scattered on the rug at his feet. Medium shot, eye level.
motion: The stickman lowers the oversized panel from the frame, shoulders dropping as it clearly does not fit. Static camera.
duration: 5
camera: medium, eye level; static

### Beat 4: clock-check
scene: The stickman stands frozen mid-reach over the half-built wardrobe, head turned back over his shoulder toward the round wall clock above the doorway, both hands still gripping a panel; long evening shadows stretching across the rug. Close shot, eye level.
motion: The stickman snaps his head from the clock back to the wardrobe and fits the panel with quick, jerky movements. Static camera.
duration: 5
camera: close, eye level; static

### Beat 5: second-box
scene: The stickman sits on the rug leaning back against a fully assembled wardrobe, arms loose at his sides in relief, while a second identical flat-pack box leans against the doorway behind him; one leftover screw lying on the rug beside his leg. Medium shot, eye level.
motion: The stickman exhales and slumps in relief, then his head turns slowly toward the second box in the doorway and freezes. Slow push-in.
duration: 10
camera: medium, eye level; slow push-in

## Notes

- in-frame label "FRAGILE" in beat 1 — route that still to the text-capable chain
- loopable ending: the second box in beat 5 returns the situation to beat 1
- defaults applied: length 30s, aspect 16:9, room-tone on; punchline written by the bot
```

Why it works: one room throughout; props (clock, box, screws) do the storytelling;
escalation is physical (parts → wrong fit → shadows lengthen); the punchline is a
deadpan object reveal, not a reaction; the 10s dwell sits on the reveal; the loop is
built into the prop.

## 5. Worked example B — `snooze-loop` (9:16, ~25s, 4 beats)

Topic: "discipline" (vague — concretized to "snoozing the alarm until the day is gone").
A complete, linter-passing vertical plan:

```markdown
# Episode Plan: snooze-loop

logline: A stickman keeps snoozing his morning alarm until the day quietly disappears around him.
aspect: 9:16
target-length: 25
punchline: Just five more minutes.
room-tone: on

## Beats

### Beat 1: alarm-rings
scene: The stickman lies in a bed under a rumpled blanket, one arm stretched toward a small phone vibrating on the nightstand, his head still buried in the pillow; a narrow band of morning light across the bedroom floor. Close shot, slightly high angle, vertical framing.
motion: The stickman's arm stretches out and pats blindly across the nightstand toward the vibrating phone. Static camera.
duration: 5
camera: close, slightly high angle; static

### Beat 2: snooze-tap
scene: The stickman's hand rests on the phone on the nightstand with one finger pressing the screen, while his head sinks back into the pillow and the blanket pulls up over his shoulders; a half-full glass of water beside the phone. Close shot, eye level, vertical framing.
motion: The stickman taps the phone once and drags the blanket up over his head in one slow motion. Static camera.
duration: 5
camera: close, eye level; static

### Beat 3: sunlight-creeps
scene: The stickman lies fully cocooned in the blanket with only the top of his head showing, while the band of sunlight on the bedroom floor has stretched wide across the room and climbed the side of the bed; the phone lies face-down on the nightstand. Medium shot, eye level, vertical framing.
motion: The band of sunlight slowly creeps up the side of the bed while the cocooned stickman shifts under the blanket. Slow push-in.
duration: 5
camera: medium, eye level; slow push-in

### Beat 4: bolt-upright
scene: The stickman sits bolt upright in bed with the blanket flung off his legs, holding the phone close in front of his head with both hands, his whole posture rigid; through the window behind him the light is low and golden and the room sits in long shadows. Medium shot, eye level, vertical framing.
motion: The stickman snaps upright in bed and yanks the phone up with both hands, holds still, then sags slowly back toward the pillow. Static camera.
duration: 10
camera: medium, eye level; static

## Notes

- vague topic "discipline" concretized to a snooze-loop morning scenario (assumption recorded per ideation method)
- loopable ending: sagging back toward the pillow mirrors beat 1
- no in-frame text anywhere — time of day is told by light, not clocks or screens
- defaults applied: room-tone on; punchline written by the bot; 9:16 per brief
```

Why it works vertically: every composition stacks figure + nightstand + light band in a
tall frame; time pressure is told entirely by light (no readable clocks or screens —
in-frame text would garble); the 10s punchline beat contains the whole snap-and-sag arc;
the sag is the loop.

## 6. Plan-level anti-patterns

| anti-pattern | consequence | instead |
|---|---|---|
| Paraphrasing the style stack inside scene blocks | style drift between stills ("different videos spliced together") | never mention style; frozen blocks carry it |
| Re-describing the character per beat | cap/proportion mutation across stills | "the stickman", nothing more |
| Two actions in one motion prompt | broken, smeared motion | one action; split into two beats |
| Wide establishing shots | tiny figure, anatomy glitches | close/medium; let props imply the room |
| New location every beat | environment drift, broken continuity | one room, varied framing |
| Readable screens, clocks, signs | garbled letters | tell time/state with light and posture; one quoted label max |
| Punchline as a facial reaction | the figure has no face to act with | deadpan object/space reveal |
| Durations other than 5/10 | unfulfillable clip request downstream | design to the 5/10 grid |
