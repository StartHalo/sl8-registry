# Continuous grammar — how ONE unbroken Veo take is planned

Depth reference for `bot-030-continuous-plan`. Load before writing. Everything here is baked
inline (the D1 Veo image-to-video + extend-video recipe and the Step-0 PoC findings) — the
runtime sandbox has NO KB access, so this file IS the recipe.

The whole plan is rendered as ONE continuous take in **N+1 inference passes that share a frame
boundary**: a Veo `image-to-video` BASE pass (8s, native audio) seeded from the opening-frame
image, then `hop-count` Veo `extend-video` HOP passes (~7s each) that continue the *previous
clip* with no cut. The render concatenates them into a single MP4. There is no separate edit —
the plan IS the film, and it is **one shot**, not a cut sequence.

## 1. The render-input shape (PROVEN — Step-0 PoC 2026-06-20, veo3.1)

The render phase feeds the plan to Veo in two model calls per the PoC `run.log`:

- **BASE** — `fal-ai/veo3.1/image-to-video` with `image_url=<opening-frame>`,
  `prompt=<base motion>`, `duration=8s`, `generate_audio=true`, `aspect_ratio=<AR>`. (The
  opening frame is a still made first by `nano-banana-pro`; see the bot's image-gen step.)
- **HOP** — `fal-ai/veo3.1/extend-video` with `video_url=<previous clip>`,
  `prompt=<hop continuation>`, `duration=7s`, `generate_audio=true`. The extend model **only
  sees the trailing frame of the previous clip plus your hop prompt** — it does NOT see the
  original opening image. That is the whole reason the hop prompt must re-state the subject.

PoC numbers worth knowing: veo3.1 i2v and extend each estimate ~500 credits (~$2.00) for 8s;
Veo supports only `16:9` and `9:16`; `duration` is one of `4s/6s/8s` for i2v and a free string
(default `7s`) for extend; both default `generate_audio=true` (native audio in the pass).

```
<global style/look header — one line, applies to the WHOLE take>
CHARACTER: <5-7 frozen verbatim tokens>

Base: <opening-frame image description (subject + world + light + framing, tokens verbatim)> <the base continuous motion over ~8s> <native audio phrase>.
Hop 1: The same <subject, >=80% verbatim>, without any cut the shot continues as <one new motion/scenery beat>, <continuous camera>.
Hop 2: The same <subject, >=80% verbatim>, without any cut <one new beat>, <continuous camera>.
... (2-3 hops; NO time-codes — each hop is ~7s by construction)
Total: ~<8 + 7*hops>s (one continuous take, no cuts) / <AR>. Audio: <score + SFX + ambience>. Maintain character identity, avoid identity drift, one continuous shot, no cuts, smooth motion, stable picture, no flicker.
```

## 2. The D1 continuous-extend rules — what carries the quality

- **>=80% subject repeat is the #1 continuity rule.** The extend pass re-imagines anything you
  don't pin. Re-state the frozen CHARACTER tokens and the subject phrasing in EVERY hop, almost
  word-for-word — change only the new beat. Paraphrasing the subject ("the bird" after you
  established "the friendly fluffy round owl") is the #1 cause of identity drift on extend.
- **One evolving shot, no cuts.** This is the opposite of a shotlist. There are NO time-codes,
  NO numbered shots, NO "cut to". The camera and subject move CONTINUOUSLY from where the last
  segment ended. Open each hop with continuity language ("The same <subject>...", "without any
  cut the shot continues..."). Never write "cut to", "next shot", "meanwhile", or a new framing
  that implies an edit.
- **One new beat per hop.** Each hop adds exactly ONE new motion or scenery development — the
  shot evolves, it does not jump. (Owl: base = glide over treetops; hop1 = lower along a
  stream; hop2 = rise toward the sun.) Stacking two new beats into one hop is the continuous
  analog of the shotlist's two-action jitter.
- **Continuous camera, named once per segment.** Use continuous moves: gentle tracking,
  following gimbal, slow push-in, slow craning rise, drifting dolly. Never a cut or a hard
  reframe between segments. `fast` is the single most dangerous keyword — keep the take gentle;
  if anything is fast, make it ONE element.
- **Lighting first among style words** (golden hour / volumetric morning light / rim light) —
  highest quality-per-word. Carry the header's look through every hop; don't restate the whole
  header per hop, but keep the same light/grade language.
- **Native audio, once.** Veo generates audio in each pass. Describe a single coherent bed
  (ambience + soft score + diegetic SFX) in the Base and the footer; it carries across the
  take. There is no separate TTS or mix.
- **No negative prompts.** Veo uses positive constraints. The stability/identity/no-cut
  constraints live ONCE in the footer suffix (`maintain character identity, avoid identity
  drift, one continuous shot, no cuts, stable picture, no flicker`) — never as a "no X" list
  inside a hop. (The phrase "without any cut" inside a hop is continuity language, not a
  negative list — it is required and allowed.)

### Continuous-camera vocabulary (one per segment, all continuous)

`gentle tracking` / `following gimbal` (move alongside the subject) · `slow push-in` /
`drifting dolly in` (close the gap) · `slow pull-out` / `craning rise` (reveal / lift) ·
`gentle pan` (scan with the subject) · `low gliding follow` (fly-with) · `slow orbit`
(continuous arc — never a snap). Speed: `slow` / `gentle` / `drifting` is the safe default;
never `fast` across the frame.

### Anti-patterns (degrade a continuous take)

| keyword / habit | why it fails | use instead |
|---|---|---|
| `cut to` / `next shot` / `meanwhile` | breaks the one-take illusion | "the same <subject>, the shot continues..." |
| paraphrasing the subject in a hop | extend re-imagines it → drift | repeat the frozen tokens >=80% verbatim |
| two new beats in one hop | discontinuity / jitter | one new motion or scenery beat per hop |
| `cinematic` / `epic` bare in the header | model does anything | pair with a lighting word + a medium/film reference |
| time-codes / a shot list | implies cuts | one Base + N Hops, no seconds inside |
| `fast` across the frame | jitter | gentle/slow; one element fast at most |
| a realistic identifiable human face | policy + bot rule | friendly stylized characters/creatures only |

## 3. Length arithmetic

One continuous take of `8 + 7*hop-count` seconds:

- 2 hops → 8 + 14 = **~22s** (the default; comfortably >15s)
- 3 hops → 8 + 21 = **~29s**

The `Total:` footer must restate this length (±1s), mark it `(one continuous take, no cuts)`,
and state the aspect — the render phase greps this line for the length and AR.

## 4. The D1 recipe (baked inline)

### D1 — Veo image-to-video then extend-video (one continuous take)
Generate ONE opening-frame still (nano-banana-pro). Animate it with `veo3.1/image-to-video`
(8s, native audio) → the BASE clip. Then chain `veo3.1/extend-video` calls, each fed the
PREVIOUS clip's URL, to add ~7s per hop with no cut. The extend model sees only the trailing
frame + your prompt, so **every hop re-states the subject >=80% verbatim** and adds one beat.
Positive constraints only; native audio per pass; 16:9 or 9:16 only. The render concatenates
base + hops into a single MP4 (one evolving shot).

## 5. Worked example — `dawn-owl` (story, 2 hops, ~22s, 16:9)

Brief: "a friendly fluffy round owl glides low over a misty dawn forest." Friendly, stylized
character. This is the canonical shape — it passes `validate-continuous-plan.sh`.

```markdown
# Continuous-plan: dawn-owl

One continuous take, stylized 3D animation, soft volumetric dawn light, warm gentle color grading, shallow depth of field, polished render.
CHARACTER: friendly fluffy round owl; soft cream-and-tan feathers; big gentle amber eyes; tiny hooked beak; stubby rounded wings; plump button body

Base: The opening frame holds a friendly fluffy round owl with soft cream-and-tan feathers, big gentle amber eyes, a tiny hooked beak, stubby rounded wings and a plump button body, perched on a tall pine at the edge of a misty dawn forest under a pale gold sky. The owl lifts from the pine and glides low and slow over the treetops as drifting mist parts around its stubby rounded wings, a following gimbal moving smoothly alongside it. Audio: soft dawn-forest ambience, gentle birdsong, a warm low woodwind score.
Hop 1: The same friendly fluffy round owl with soft cream-and-tan feathers, big gentle amber eyes, tiny hooked beak, stubby rounded wings and plump button body, without any cut the shot continues as the owl banks downward and glides lower along a winding silver stream, dawn light warming its feathers, a low gliding follow staying just behind it.
Hop 2: The same friendly fluffy round owl with soft cream-and-tan feathers, big gentle amber eyes, tiny hooked beak, stubby rounded wings and plump button body, without any cut the shot keeps moving as the owl rises gently toward the rising sun, its stubby rounded wings catching warm gold light, a slow craning rise lifting with it into the bright sky.

Total: ~22s (one continuous take, no cuts) / 16:9. Audio: warm low woodwind score, gentle birdsong, soft wind and flowing water, dawn-forest ambience. Maintain character identity, avoid identity drift, one continuous shot, no cuts, smooth motion, stable picture, no flicker.

## Notes

- hop-count 2 (base 8s + 2x7s ~= 22s); aspect 16:9 default
- one evolving shot, no cuts — base glides over treetops, hop 1 lowers along a stream, hop 2 rises toward the sun
- subject tokens repeated verbatim in every hop so identity survives the Veo extend (the >=80% rule)
- friendly stylized owl, no realistic human face; gentle continuous camera throughout, never fast
```

Why it works: one global header sets a lighting-first stylized look the whole take inherits; the
CHARACTER block freezes 6 tokens; the Base establishes the opening frame + one continuous glide
+ native audio over ~8s; each hop re-states the full subject phrase verbatim (so the extend pass
cannot drift) and adds exactly ONE new beat (lower along a stream, then rise toward the sun) with
a continuous camera and "without any cut" language; the footer marks it one continuous take of
~22s, states 16:9, and carries the native Audio clause + the no-cut positive-constraint suffix.

## 6. Continuous-plan anti-patterns (avoid)

| anti-pattern | consequence | instead |
|---|---|---|
| Paraphrasing the subject in a hop | extend re-imagines the character → drift | repeat the frozen tokens >=80% verbatim every hop |
| `cut to` / time-codes / a shot list | breaks the one-take illusion | one Base + N Hops, no seconds, continuity language |
| Two new beats in one hop | discontinuity / jitter | one new motion or scenery beat per hop |
| `cinematic` / `epic` bare in the header | model does anything | pair with lighting + a medium/film reference |
| `fast` across the frame | guaranteed jitter | gentle/slow continuous moves; one element fast at most |
| A "no X" negative list inside a hop | Veo ignores / degrades | positive constraints once in the footer suffix |
| Total length not 8 + 7*hops | render length mismatch | restate 8 + 7*hop-count in the footer (±1s) |
| A realistic identifiable human face | policy + bot rule | friendly stylized characters/creatures only |
