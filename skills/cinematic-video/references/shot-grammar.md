# Shot grammar — the time-coded multi-shot prompt

> Harvested from BOT-027 cinematic-director-seedance (`bot-027-shotlist`
> `references/shot-grammar.md` + `bot-027-seedance-cinematic`), 2026-08 — the Step-0 PoC
> shape (8.8/10, 2026-06-20). One delta from the donor: scene durations obey
> video-prompting's MEASURED r2v envelope (≤10s @720p / ≤12s @480p, as-of 2026-07-22 —
> 15s returns 422), not BOT-027's 15s default, which predates that measurement.

The engine renders each scene's whole shot list in ONE `reference-to-video` pass: it
reads the time-codes as cut instructions, carries the character across the cuts from the
`@Image1`/`@Image2` refs, and generates native audio in the same inference. There is no
separate edit within a scene — the shot list IS the film. A weak or malformed shot list
cannot be rescued downstream.

## The render-input shape (per scene pass — the proven concatenation)

```
<global style/look header — style.md's aesthetic block>
@Image1 is the character turnaround reference and @Image2 is the hero reference for <Name> (<2–3 verbatim tokens>) — maintain the EXACT same character identity in every shot.
<one-line world/scene establishment>
[0-Xs]: <shot 1 — one camera move + one action + lighting>
[X-Ys]: <shot 2 …>
… (4–6 shots, tiling [0..dur_s]; escalation arc)
Total: <N>s / <K> shots / <AR>. Audio: <score + SFX + ambience>. Maintain character identity, avoid identity drift, avoid jitter, smooth motion, stable picture, no flicker.
```

State shot count + duration + aspect at the top and bottom, write each shot
individually, and lock identity ONCE — the `@Image` line plus verbatim tokens is what
holds the character across cuts.

## The 5-layer stack (per shot, order matters: subject > action > camera > style > constraints)

- **One action + one camera move per shot.** Separate subject motion from camera motion
  ("the robot chases the butterfly, camera tracks alongside") — the single biggest debug
  lever. Stacking two actions or two moves is the #1 jitter cause.
- **Action is present-tense, one primary movement** — a sequence to execute ("she slowly
  turns toward the camera"), not a state to approximate ("she looks happy").
- **Lighting first among style words** — the highest quality-per-word element (`golden
  hour`, `rim light against dark background`, `volumetric fog`, `chiaroscuro`). State a
  lighting phrase in most shots.
- **`fast` is the most dangerous keyword.** Fast camera + fast subject + busy scene
  guarantees jitter — make only ONE element fast, hold the rest.
- **One slow-mo ramp on the key beat** ("ramps into slow motion … snaps back") — once,
  on the climax / final strike. It reads as impact.
- **No negative prompts.** Positive constraints live once in the footer suffix — never a
  "no X" list inside a shot.
- **Reference, don't re-describe.** Call the character "the <Name>" in shots; the
  identity line + refs carry the bible. A second full description competes with the
  frozen tokens and mutates the character. Quoting ONE anchor token on a beat is fine.

## Camera vocabulary — the cinematic school (closed set; name exactly one per shot)

`static` / `locked-off` · `push-in` / `dolly in` (tension) · `pull-out` / `dolly out`
(reveal) · `pan left/right` · `tracking shot` / `follow` · `orbit` / `arc` (hero moments,
clashes) · `low-angle` (power) · `crane up/down` · `gimbal` / `steadicam walk` ·
`aerial` / `drone` · `close-up` / `extreme close-up` · `wide establishing`.
Speed words: `slow` / `gentle` is the safe default; `dynamic` / `swift` with caution;
`fast` only ever on ONE element.

**School toggle** (per video-prompting's camera law): this physical-camera set is for
cinematic/photoreal/3D-animated styles — the school the BOT-027 PoC proved on r2v. When
the locked style is flat/graphic, video-prompting's flat-art set
(`static/push_in/pull_out/pan/tilt/parallax`) applies verbatim instead — physical moves
warp flat art. One school per project; never mix. Either way: closed set, one move per
shot, no adjacent repeats.

## The escalation arc (per profile)

- **`story` — wide → tighter → climax → resolve**: wide establishing (world + character)
  → medium (the want) → tracking/action (the pursuit) → climax (the peak, the slow-mo
  ramp) → close resolve (the payoff).
- **`fight` — standoff → first clash → escalation → counter → final strike**: wide
  standoff → medium first clash → orbit on the exchange → a counter/turn → low-angle
  final strike (slow-mo ramp, snap back).

Each beat raises stakes through ACTION, COMPOSITION (wider → tighter), and LIGHT — never
through a feeling word. For `fight`, lead the header with a lighting-first,
color-graded blockbuster block (the donor's E2 shape: "IMAX movie quality … realistic
rendering, advanced color grading, dark battlefield atmosphere") adapted to style.md's
idiom — never bare `cinematic`/`epic`.

## Time-code arithmetic (the hard gate)

- Shot 1 starts at `0`; each shot's start equals the previous shot's end (no gaps, no
  overlaps); the last shot ends at exactly the scene's `dur_s`.
- The `Total:` footer's N = the scene duration, K = the shot count, AR = the aspect —
  all agreeing with the time-codes and the plan.
- Give the key beat the longest dwell. 4 shots over 10s (~2–3s each) is natural; a 6th
  shot starves every beat.

## The footer

`Total:` restates duration / shots / aspect (the generate step reads it). `Audio:`
steers the native in-pass audio — a score mood + 2–3 concrete SFX + an ambience bed
("whimsical orchestral score, gentle nature ambience, soft chirps" / "epic orchestral
score, sword impacts, thunder and wind"). Then the positive-constraint suffix, appended
once, verbatim: `Maintain character identity, avoid identity drift, avoid jitter, smooth
motion, stable picture, no flicker.`

## Anti-patterns

| anti-pattern | consequence | instead |
|---|---|---|
| Two actions or two camera moves in one shot | jitter, "who's moving?" mush | one + one; split the beat |
| `cinematic` / `epic` bare in the header | model does anything | pair with lighting + a medium/film reference |
| Re-describing the full bible every shot | identity drift | "the <Name>"; the identity line carries it |
| A "no X" list inside a shot | ignored / degrades | positive constraints once, in the suffix |
| Shots that don't tile `[0..dur_s]` | mis-timed render, dropped beats | tile exactly; footer agrees |
| `fast` unqualified | guaranteed jitter | one fast element; one slow-mo ramp |
| Dialogue or on-screen text in a shot | mangled lettering, invented speech | action only; titles in post (assembly-qc) |
| A realistic identifiable human face | engine face policy | stylized characters/creatures only |

## Validation checklist (run on `shot-plan.json` before Step 4)

1. Every scene's shots tile `[0..dur_s]` — start 0, contiguous, last end = `dur_s`.
2. Each shot: exactly one closed-vocab camera move + one concrete action; no camera move
   repeated on adjacent shots; a lighting phrase in most shots.
3. Exactly one slow-mo ramp per scene, on the `key_beat` shot.
4. The identity line names `@Image1` + `@Image2`, the character's name, and 2–3 tokens
   byte-identical to `character/spec.md` — zero paraphrase.
5. Footer N / K / AR agree with the time-codes, the shot count, and the plan; the
   `Audio:` clause and the constraint suffix are present.
6. No negative lists, no dialogue, no on-screen text, no unqualified `fast`, ≤6 shots
   per scene; the composed prompt stays lean (≤ ~1,200 words).

## Worked example — one scene, 10s @720p (envelope-compliant PoC adaptation)

```
Multi-shot cinematic 3D-animated short, Pixar-style animation, bright cheerful color grading, soft warm lighting, shallow depth of field, polished render.
@Image1 is the character turnaround reference and @Image2 is the hero reference for the meadow robot (glossy white-and-warm-orange body, one big glowing cyan eye) — maintain the EXACT same character identity in every shot.
A sunlit green meadow with wildflowers under a bright blue sky.

[0-3s]: wide establishing shot, gentle push-in, the robot wakes and stretches in the meadow, blinking its big cyan eye, morning light and floating pollen.
[3-5s]: medium shot, static camera, the robot spots a glowing butterfly and tilts its head in curiosity, soft warm key light.
[5-8s]: tracking shot, the robot chases the butterfly through the wildflowers, stubby legs pumping, joyful. [VFX: petals scattering]
[8-10s]: low-angle shot, the robot leaps after the butterfly and the motion ramps into brief slow motion at the peak, then settles into the grass, rim light catching the body.

Total: 10s / 4 shots / 16:9. Audio: whimsical playful orchestral score, gentle nature ambience, soft robotic chirps. Maintain character identity, avoid identity drift, avoid jitter, smooth motion, stable picture, no flicker.
```

Why it works: shots tile 0→10; one camera + one action each, no adjacent repeats; the
arc escalates wide → static medium → tracking → low-angle climax with the single ramp;
identity locked once; the duration sits inside the measured envelope.
