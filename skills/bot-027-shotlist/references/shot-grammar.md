# Shot grammar — how a Seedance cinematic shot-list is built

Depth reference for `bot-027-shotlist`. Load before writing shots. Everything here is baked
inline from the KB cinematic-video recipes (C1/C2 multi-shot, E1/E2 fight) and the Seedance
5-layer prompt stack — the runtime sandbox has no KB access, so this file IS the recipe.

The whole shot-list is rendered in ONE `bytedance/seedance-2.0/fast/reference-to-video` pass.
The model reads the time-codes as cut instructions, carries the character across the cuts from
the `@Image1`/`@Image2` bible refs, and generates native audio in the same inference. There is
no separate edit — the shot-list IS the film.

## 1. The render-input shape (PROVEN — Step-0 PoC 2026-06-20, 8.8/10)

The render phase composes the whole file into this prompt:

```
<global style/look header>
@Image1 is the character turnaround reference and @Image2 is the hero reference for <Name> (<2-3 tokens>) — maintain the EXACT same character identity in every shot.
<one-line world/scene establishment>
[0-Xs]: <shot 1 — one camera move + one action + lighting>
[X-Ys]: <shot 2 ...>
... (4-6 shots, time-coded, tiling [0..duration]; escalation arc)
Total: <N>s / <K> shots / <AR>. Audio: <score + SFX + ambience>. Maintain character identity, avoid identity drift, avoid jitter, smooth motion, stable picture, no flicker.
```

State **shot count + total duration + aspect at the TOP** (header + footer), write **each shot
individually**, give an **escalation arc**. The bible images go via `--ref` (mapped to
`image_urls`); referencing them as `@Image1`/`@Image2` with "maintain the EXACT same identity"
is what holds the character across shots.

## 2. The Seedance 5-layer stack — the rules that carry the quality

Per-shot, order matters: **subject > action > camera > style > constraints.**

- **One action + one camera move per shot.** Separate subject motion from camera motion. ❌
  "spinning camera around a dancing person" — the model can't tell who spins. ✅ "the dancer
  spins slowly, camera holds fixed framing" — two clear directives. **This is the single
  biggest debug lever**; most of the shakiness people blame on the model comes from stacking
  two actions or two camera moves into one shot.
- **Action is present-tense, one primary movement.** Write directions, not states: ✅ "she
  slowly turns toward the camera, breeze lifting her hem" (a sequence to execute), not "she
  looks happy" (a photo to approximate).
- **Lighting has the single biggest impact on quality among all prompt elements.** If you add
  only one style element to a shot, make it a lighting description. Highest quality-per-word:
  `golden hour`, `rim light against dark background`, `volumetric fog`, `soft key from 45
  degrees`, `chiaroscuro`, `backlit silhouette`.
- **`fast` is the single most dangerous keyword.** Combining fast camera + fast subject + busy
  scene almost guarantees jitter. Make only ONE element fast, hold everything else steady.
- **Slow-mo ramps on the key beat** (E1): "ramps into slow motion ... snaps back to full
  speed". Use it once, on the climax / final strike — it reads as impact.
- **No negative prompts.** Seedance uses positive constraints. Never put a "no X" list inside a
  shot; the stability/identity constraints live once in the footer suffix
  (`avoid identity drift, avoid jitter, stable picture, no flicker`).
- **Reference the bible explicitly.** `@Image1`/`@Image2 = the character; maintain exact
  identity`. Refer to the character as "the <Name>" in shots; don't re-describe the full bible
  per shot (a second description competes with the frozen tokens and mutates the character).
  Quoting ONE anchor token for a beat is fine.

### Camera vocabulary (name one per shot)

`static` / `locked-off` / `fixed` · `push-in` / `dolly in` (tension, emphasis) · `pull-out` /
`dolly out` (reveal) · `pan left/right` (scanning) · `tracking shot` / `follow` (alongside the
subject) · `orbit` / `arc` / `360 orbit` (hero moments, clashes) · `low-angle` (power) ·
`crane up/down` (height reveal) · `gimbal` / `steadicam walk` (smooth) · `aerial` / `drone`
(geography) · `close-up` / `extreme close-up` · `wide establishing`. Speed: `slow` / `gentle`
is the **safe default**; `dynamic` / `swift` only with caution; `fast` only on ONE element.

### Anti-patterns (degrade output)

| Keyword | Why it fails | Use instead |
|---|---|---|
| `fast` (unqualified) | accelerates everything → jitter | name the ONE element that's fast |
| `cinematic` (alone) | too vague | pair with a lighting word / film reference |
| `epic` / `amazing` / `stunning` | feelings, not instructions | describe what the camera sees |
| `lots of movement` | jitter across the frame | name one specific movement |
| `glow` / `glimmer` / `glints` | specular flicker | `steady intensity` / `diffuse` |

## 3. The escalation arc (per profile)

The arc is what makes the cut sequence read as a film, not a montage.

- **`story` — wide -> tighter -> climax -> resolve** (the universal filmmaking escalation
  mapped to a 15s window): wide establishing (world + character) -> medium (the want / the
  inciting curiosity) -> tracking/action (the pursuit) -> climax (the peak, the slow-mo ramp)
  -> close resolve (the payoff / a warm or wry final image).
- **`fight` — standoff -> first clash -> escalation -> counter -> final strike**: wide standoff
  (two forces face off, atmosphere set) -> medium first clash -> escalation (orbit on the
  exchange) -> counter (a turn) -> final strike (low-angle impact, slow-mo ramp, snap back).

Each beat raises the stakes through ACTION, COMPOSITION (wider → tighter), and LIGHT — never
through a feeling word.

## 4. The C/E recipes (baked inline)

### C1 — Seedance numbered multi-shot shot-list (the primary pattern)
State shot count + total duration + aspect at the TOP; write each shot with camera + action +
lighting; end with `Total: <N>s / <K> shots / <AR>`. Up to 9 image refs via `@Image1` etc.;
native audio in-pass; **no negative prompts** — positive constraints only. Realistic human
faces are restricted → **stylized characters / creatures only** (this bot's hard rule).
VFX inline as `[VFX: ...]`. Time-code formats that both work: range brackets `[0-4s]:` (this
bot's house format) and parenthetical `(0-3s)`.

### C2 — Seedance CRAFT / 7-element formula
`@asset reference + role assignment + scene description + camera/motion + style/lighting +
sound design (optional) + timeline (optional)`. Example shape: "@Image1 as the character,
walking through a neon-lit alley at night, slow dolly forward, cinematic color grading, warm
highlights, ambient rain sounds, 0-3s establish then 3-8s turns to camera." Reference priority:
first frame/style → 1-3 character refs → 1 motion video → 1 audio → supporting details.

### E1 — Seedance single-continuous / fight slow-mo ramp
Speed-ramp into deep slow motion on the key strike, snap back to full speed; 360° orbit on the
clash; per-beat SFX list. The ramp ("RAMPS TO SLOW MOTION ... SNAPS BACK") is the impact lever.

### E2 — Seedance epic fantasy battle (directly on-brief for `fight`)
- **Dark-fantasy style header (verbatim, use as the `fight` header):**
  > "[Style] Oriental Fantasy Live-Action Blockbuster, IMAX movie quality, 8K ultra-clear,
  > Photorealistic, Unreal Engine 5 realistic rendering, DaVinci advanced color grading, dark
  > battlefield atmosphere, no anime feel, no plastic feel."
- **Atmosphere/audio cues:** "Volumetric god rays, cinematic lighting, epic scale, dynamic
  magic effects, medieval dark fantasy, gritty textures, heroic composition. Audio: Thunder,
  wind, stone grinding, magic crackling, sword impacts. Battle cry." Adapt the medium words to
  the brief's world if it is not dark-fantasy, but keep the lighting-first + color-grading
  shape.

## 5. Time-code arithmetic (the linter's hard gate)

The shots must **tile `[0..duration]`** exactly:

- Shot 1 starts at `0`.
- Each shot's start equals the previous shot's end (no gaps, no overlaps).
- The last shot ends at exactly the target `duration` (±1s tolerance the linter allows).
- The `Total:` footer's `N` = duration, `K` = shot count, `AR` = aspect — all must agree with
  the time-codes and the header.

With 5 shots over 15s, ~3s each is natural; with 4 shots, ~3-4s; give the climax beat the
longer dwell if any beat gets it. A 6th shot in a 15s film starves each beat to ~2.5s — fine
for a fast fight, tight for a story.

## 6. Worked example A — `meadow-robot` (story, 5 shots, 15s, 16:9)

Brief: "a cheerful little robot's adventure in a sunlit meadow." Bible: a small round friendly
cartoon robot, glossy white-and-warm-orange body, one big glowing cyan eye. This is the shape
of the proven Step-0 PoC (8.8/10).

```markdown
# Shotlist: meadow-robot

Multi-shot cinematic 3D-animated short, Pixar-style animation, bright cheerful color grading, soft warm lighting, shallow depth of field, polished render.
@Image1 is the character turnaround reference and @Image2 is the hero reference for the meadow robot (glossy white-and-warm-orange body, one big glowing cyan eye) — maintain the EXACT same character identity in every shot.
A sunlit green meadow with wildflowers under a bright blue sky, a playful adventure.

[0-3s]: wide establishing shot, gentle push-in, the robot wakes and stretches in the meadow, blinking its big cyan eye, morning light and floating pollen.
[3-6s]: medium shot, static camera, the robot spots a glowing butterfly and tilts its head in curiosity, a cheerful little bounce, soft warm key light.
[6-9s]: tracking shot, the robot chases the butterfly through the wildflowers, stubby legs pumping, joyful. [VFX: petals scattering]
[9-12s]: low-angle shot, the robot leaps after the butterfly and the motion ramps into brief slow motion at the peak of the jump, then tumbles softly into the grass, rim light catching the body.
[12-15s]: close-up, slow push-in, the robot lies in the grass looking up in wonder as the butterfly lands on its eye-screen, a warm happy resolve.

Total: 15s / 5 shots / 16:9. Audio: whimsical playful orchestral score, gentle nature ambience, soft robotic chirps and a happy beep. Maintain character identity, avoid identity drift, avoid jitter, smooth motion, stable picture, no flicker.

## Notes

- profile: story (wide -> tighter -> climax -> resolve)
- slow-mo ramp on the leap (shot 4), the climax beat
- defaults applied: shot-count 5, duration 15s, aspect 16:9
- one VFX cue (petals) on the chase; one camera move + one action per shot
```

Why it works: shots tile 0→15 with no gaps; each line is one camera move + one action +
lighting; the arc escalates wide → tracking action → low-angle climax → close resolve; the
single slow-mo ramp sits on the leap; identity is locked once to the bible and the character is
never re-described.

## 7. Worked example B — `obsidian-duel` (fight, 5 shots, 15s, 21:9)

Brief: "a dark-elf warrior duels a stone golem in a ruined courtyard at dusk." Bible: a
dark-elf warrior, matte-charcoal skin, silver-white braided hair, twin curved daggers.

```markdown
# Shotlist: obsidian-duel

[Style] Oriental Fantasy Live-Action Blockbuster, IMAX movie quality, 8K ultra-clear, Photorealistic, Unreal Engine 5 realistic rendering, DaVinci advanced color grading, dark battlefield atmosphere, no anime feel, no plastic feel. Volumetric god rays, gritty textures, heroic composition.
@Image1 is the character turnaround reference and @Image2 is the hero reference for the dark-elf warrior (matte-charcoal skin, silver-white braided hair, twin curved daggers) — maintain the EXACT same character identity in every shot.
A rain-slicked obsidian courtyard in ruins at dusk, a towering stone golem opposite.

[0-3s]: wide establishing shot, slow push-in, the warrior stands facing the looming golem across the courtyard, twin daggers drawn, volumetric god rays through broken arches.
[3-6s]: medium tracking shot, the warrior lunges and strikes the golem's arm, dust bursting from the stone, dramatic rim light. [VFX: stone shards, sparks]
[6-9s]: orbit shot, the golem swings a massive fist and the warrior rolls under it, the camera arcs around the exchange, chiaroscuro shadows.
[9-12s]: low-angle shot, the warrior springs onto the golem and drives both daggers down as the motion ramps into deep slow motion at the impact, then snaps back. [VFX: magic crackling]
[12-15s]: close-up, slow pull-out, the golem crumbles to rubble and the warrior lands in a low crouch, breathing hard, backlit by the last god rays.

Total: 15s / 5 shots / 21:9. Audio: epic orchestral score, sword impacts and stone grinding, thunder and wind, a battle cry. Maintain character identity, avoid identity drift, avoid jitter, smooth motion, stable picture, no flicker.

## Notes

- profile: fight (standoff -> first clash -> escalation -> counter -> final strike)
- E2 dark-fantasy header used verbatim; slow-mo ramp on the final strike (shot 4)
- two VFX cues (stone shards, magic crackling); one camera move + one action per shot
- defaults: shot-count 5, duration 15s; aspect 21:9 from the brief
```

Why it works: the E2 header sets a lighting-first, color-graded dark-fantasy look; the arc is
standoff → clash → orbit escalation → counter strike → crumble resolve; the slow-mo ramp lands
on the final strike; "fast" never appears bare; identity is locked once and stylized (no real
person) per Seedance's face policy.

## 8. Shot-list anti-patterns (avoid)

| anti-pattern | consequence | instead |
|---|---|---|
| Two actions or two camera moves in one shot | jitter, "who's moving?" mush | one action + one camera move; split into two shots |
| `cinematic` / `epic` bare in the header | model does anything | pair with a lighting word + a film/medium reference |
| Re-describing the full bible every shot | identity drift (second description competes) | "the <Name>"; identity line + @Image refs carry it |
| A "no X" negative list inside a shot | Seedance ignores / degrades | positive constraints once in the footer suffix |
| Shots that don't tile [0..duration] | render duration mismatch, dropped beats | shot 1 at 0, each start = previous end, last end = duration |
| `Total:` N/K/AR disagreeing with the shots | render greps the wrong duration/aspect | keep N=duration, K=shot count, AR=aspect in sync |
| `fast` everywhere | guaranteed jitter | one element fast; `slow`/`gentle` default; one slow-mo ramp |
| A realistic identifiable human face | Seedance face policy + bot rule | stylized characters/creatures only |
