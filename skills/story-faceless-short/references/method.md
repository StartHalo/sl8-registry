# Method notes: shots, look, renders, sound, failures

SL8 wording of the WF35-a2 fine points (everygen/3danimatedexplainers-151f46, cited as `#n`; no
licence stated, so nothing here is copied). Prompts and line wording are rows of `prompts.json`,
named by slug. These rules were measured by the vendor on Seedance 2.5 and its own voice; none has
been run on fal Seedance 2.0 or Nano Banana Pro yet (learnings STO-L321).

## Contents
- [Shot plan](#shot-plan)
- [shot_plan.json](#shot_planjson)
- [Look](#look)
- [Reference order by case](#reference-order-by-case)
- [Clip prompts](#clip-prompts)
- [Sound](#sound)
- [Failure table](#failure-table)
- [What the customer checks](#what-the-customer-checks)

## Shot plan

- **Cut on meaning** (#5): a beat sits on each word that names something new (an object, a creature,
  a place, a scale, a step somewhere else, a result). Reach it by a cut, or by a camera move when it
  is in reach of the current view. Never cut to another angle of the same moment or to a reaction
  the words do not mention. Between cuts the picture keeps changing.
- **One clip, one continuous shot** that changes every 1 to 2 s; 1 to 10 s long, most 2 to 5; the
  hook takes 1 to 3 clips in the first 5 s; an explanation may hold up to 10 s. Clip counts per
  length (6-8 for 20 s, 8-12 for 30, 11-15 for 40, 13-18 for 50) are a check, not a quota.
- **The cut sits on the start of the word** that names the new thing; the clip lengths add up to the
  target length (`timing.json` `targetSeconds`) within 0.25 s, and the last clip absorbs the rest.
- **Real speed** (#6, #22): a fall, a snap or a punch is over in under a second; spare seconds go to
  the lead-in, the aftermath or the camera move, never to slow motion.
- **Big and literal** (#7): when the words say the plane is burning, the whole plane burns.
- **Change the framing at every cut** (#26): wide to close, outside to inside, a new place; never
  open where the clip before ended. The see-through reveal is the one deliberate same-framing cut.
- **Falls, flights and crashes** (#24): an off-balance first pose, something fixed to measure the
  speed against, no camera riding beside a body in open sky; a close view of a falling body lasts a
  second at most.
- **By subject**: sizes and numbers become a camera move, start close and pull back or crane up
  until the familiar comparison fills the frame (#27); machines follow the energy through the parts
  in the order the words name them (#28); a micro journey dives in from a close shot of the exact
  spot, follows one thing, one clip per named step in one micro world, and ends pulling back to the
  character (#29); a crowd the words imply is shown through the set (a mug rattles, papers lift),
  never as extra people (#30); every shot has real motion plus one camera move (#72).
- **Reveals stay in the world** (#9): the body turns see-through in place, a cut surface magnifies;
  never a jump to a floating diagram. Organ scale: see-through in place, framed so the see-through
  part fills half the frame (#63). Cell scale: a micro journey with `micro-world-line` pasted in every
  micro shot (#64). Inside an object: a small area turns glassy and magnified.
- **One background sound per place** (#34), the same words on every clip there, chosen now.
- **Body hooks stay clean and bloodless** (#79): they are the most common reason a clip is blocked.
- **Sound-off test**: the pictures alone tell what the voice says.
- The plan the customer reads is `shot_plan.md` (row `shotplan-format`); run row `shotplan-checks` on
  every clip and fix what fails, then `short.py plan-check`.

## shot_plan.json

```json
{"project": "<p>", "length_s": 30, "character_line": "<one line, or empty>",
 "key": {"kind": "clip-1 | character | none"},
 "places": {"kitchen": {"set_line": "<a set-lines row, filled>", "sound_bg": "<one background>", "time_of_day": "day"}},
 "clips": [{"n": 1, "start_s": 0.0, "planned_len_s": 2.0, "first_word": 0, "words": "<the words it covers>",
            "new": "<what is new>", "place": "kitchen", "people": true,
            "case": "key-close | new-camera | charkey | no-person | second-character | body-reveal | micro | object-reveal",
            "framing_start": "medium 35 mm on him", "framing_end": "close 50 mm on the knuckles",
            "action": "<cause, effect, aftermath>", "camera": "<one move>",
            "sounds": [{"t": 0.4, "what": "a jumper rustle"}], "file": null}]}
```

`first_word` indexes `timing.json` `words`; `file` is filled at step 17 with the downloaded clip.

## Look

- **Plain, bright and matte** (#8): flat even light, at night too; never glow, haze, sparkle, big
  eyes or plastic. Two realism levels (#70): simple characters and sets, with the hero object,
  animal or cutaway one level more detailed; gloss only where physics puts it.
- **Warmth is earned** (#71): cool beats, warming to golden light only on the payoff.
- **Real relative sizes** (#60): move the camera close to a small star, never enlarge it.
- **Same SET line, word for word, for every frame in one place, and one LIGHT line for the whole
  video** (#61); one time of day per scene (#62).
- **No readable writing** (#82): paper, signs and screens are blank or carry wavy non-letter lines
  (row `blank-writing`), stated in SHOT.
- **Clothes** are one bold solid colour with a small simple chest graphic with no letters (#65).
- **Poses** (#20, #25): every frame is posed mid-action and a fast action starts off balance; a
  clip under 2.5 s is posed at the peak of its action.
- **Never** the words of row `banned-look-words`, and no cartoon acting (#32, #59).
- **Style key edits** change only what the customer named and never restart the look (#66); more
  texture means more plaster variation, tile, wood wear, the chest graphic and fabric weave.

## Reference order by case

At most three references, each with its own line from the `ref-*` rows (a reference without a line
gets copied whole, #57); pass only references whose content belongs in the shot (#55). `anchor` is a
setting anchor a kit or brief supplied (row `anchor-slots`); with none, drop its slot and its line.

| Case | References, in `--ref` order | Lines |
|---|---|---|
| Style key = clip 1 (star close: knees up, three-quarter face) | person anchor, setting anchor, palette reference | `ref-key-clip1` |
| Character key (star small, from behind, covered or absent in clip 1) | person anchor, palette reference | `ref-charkey-palette`; fills `charkey-fills` |
| No person or animal: key | setting anchor, palette reference | renumbered `ref-key-clip1` lines 2-3; PEOPLE becomes `no-people` |
| Frames after a character key | character key, setting anchor, palette reference | `ref-frames-charkey` |
| Key = clip 1, camera close to it | style key, setting anchor | `ref-frames-key-close` |
| New camera position | the shot's setting anchor, style key last | `ref-key-last`; describe the camera by what is in frame (`camera-in-frame-example`) |
| No person in frame | setting anchor, palette reference (no key) | `no-people` |
| Second character | style key first | their own character line plus `second-character`; own clip, face visible |
| Organ reveal | body-reveal anchor, style key last | `ref-body-reveal` |
| Micro journey | micro anchor (or the micro frame before it, when redoing one) | `ref-micro`, `micro-world-line` |
| Inside an object | object-reveal anchor, style key last | `ref-key-last` |

The person anchor goes on the style key only (#56). The vendor passed low-resolution creator frames
last, for plainness and palette, because they pull faces toward photoreal when they lead (#58); this
skill ships no creator frames (STO-D323), so the palette slot is filled only by a reference the kit
or brief supplies. With no references at all, the style key is made on the text-only route and every
later frame uses the style key as its only reference (P14).

## Clip prompts

- Fill "video-template" per clip (rules in "video-usage"): every slot, under 2,500 characters.
- **Duration** is the planned length rounded up to a whole second, at least 4 (#18): the stitch keeps
  the start and trims the rest, so the important moment comes early and the last half second is
  aftermath or the camera settling; a clip under 4 s is written to finish its action inside its
  planned length.
- **Actions at real speed** (#22), written as cause, effect, aftermath with the contact point and
  what else moves (#33, row `cause-effect`); follow `timing-good`, never `timing-bad`. A resting body
  starts with a 0.2 s first step (`first-step`); a body balanced in open air needs a new frame (#21).
- **Never** "slowly", "gently" or "gradually" for the subject (#23): only the camera may move slowly.
- **Faces act like real faces** (`face-acting`), never cartoon takes (#32).
- **Never ask for a cut inside a clip** (#19): the vendor measured the first shot held 0.7 to 1.8 s
  too long; cuts belong to the stitch, where they land on their word.
- **One start image, no reference images** (#17): everything the clip shows, including what the
  camera arrives at, is in the start frame or described exactly in the prompt.
- **The character line** is pasted word for word into every image and clip prompt with the star.

## Sound

- One background per place in the same words on every clip there, even from first frame to last,
  plus foley tied to moments, one or two sounds a second at most (#34, #35).
- The first one-off sound at 0.3 s or later; the last ends half a second before the planned length
  (#36: a loud first-frame sound jumped 11 dB at a cut). A 2.0 s clip: sounds at 0.3 s and 1.0 s,
  nothing after 1.5 s.
- Never "loud", "huge", "booming", "explosion", "dramatic" or "epic"; a blast is a dull thump (#35).
- Every sound line ends with row `sound-closing` (#37): asking only for silence, or only for no
  music, left the vendor's model to invent sound, and those clips were blocked as copyright.
- Words barely change a clip's level (#38: about 2 dB); the picture decides. Balance levels in the
  stitch, never in prompts.
- Every clip keeps its own sound under the one narration take (#10); clip sound is on every clip or
  on none (#41).

## Failure table

| What happened | What to do (HR6, HR7: one retry per item, and it moves one named lever) |
|---|---|
| Blocked for sound (a copyright message) | Rewrite the sound line as small, concrete foley and room tone, keeping `sound-closing` (rows `sound-rewrite`); retry once (`lever: prompt sound line`) |
| Queue timeout (exit 10) | Already charged: fetch with `ai-gen result <request-id>`; never resubmit (HR6) |
| Rate limit or too many running (exit 9, `RATE_LIMIT`) | Wait for the running clips to land, then submit once more (`lever: timing`) |
| Credits or ceiling (exit 5, exit 13, or an account cap) | Never retry: open a spend gate, end `partial`; clips already started keep rendering and are fetched |
| Refused as a possible real person | Redo that frame with the face one step simpler (`fix-too-real`), render again on the same model (`lever: frame`) |
| Failed with no reason (exit 9 on a queued job) | Retry once from the same frame with softer wording (`softer-wording`, `lever: prompt`); a second failure opens a gate, and the gate's option is a gentler pose on a new frame |
| Primary route unavailable (exit 6 or 8) before the first clip | The whole run moves to the named fallback (P9, P10); never mid-run and never for a refusal |

Never switch models to get past a refusal (#43), and keep one model for every clip of a run.

## What the customer checks

The agent cannot watch video (#75). It looks at the frames it sampled and gives the customer a short
concrete list to watch for: every cut lands on its word; nothing moves in slow motion or floats;
each clip's sound is present and no cut jumps in loudness; faces stay the same person; no letters
appear anywhere; the captions match the words.
