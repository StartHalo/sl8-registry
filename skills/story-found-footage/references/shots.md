# Pictures, clips, checks, redos and the stitch (steps 8 to 16)

SL8 wording. Restated from the vendor's found-footage story pack (research
`everygen/foundfootagestories-179c12`, prompts "Reference picture batch limit and check", "Clip rules",
"Misses and redos checklist", "Redo by miss type", "Error-message redo ladder", "compose_video call
structure", "Why the clips own sound, no music, too-loud ladder", "Stitch length check", "User-facing
vocabulary rules"; fine points #7, #8, #13, #14, #19-#30, #64-#90), its animal variant
(`everygen/animalclips-e048e4` "Failure ladder", "Change matrix", "Resume protocol"; #6, #8, #17, #18,
#24-#26) and fal and HyperFrames points cited where they apply. Nothing here has run on this machine.

## Contents
- [Reference pictures (step 8)](#reference-pictures-step-8)
- [Shot pictures (step 9)](#shot-pictures-step-9)
- [The misses list (steps 10 and 12)](#the-misses-list-steps-10-and-12)
- [Clip rules (step 11)](#clip-rules-step-11)
- [Redos (step 13)](#redos-step-13)
- [Which sound plays under each shot (step 14)](#which-sound-plays-under-each-shot-step-14)
- [Length, hold and loudness (step 14)](#length-hold-and-loudness-step-14)
- [Captions and the hand-off (step 15)](#captions-and-the-hand-off-step-15)
- [Changes after delivery (step 16)](#changes-after-delivery-step-16)
- [Picking up a run part-way](#picking-up-a-run-part-way)

## Reference pictures (step 8)

- **Place pictures:** one per fixed camera (two at most), unoccupied, always the daytime view even for
  a night story, slightly underexposed, a little cluttered with two everyday things, under 1,300
  characters. The camera block is never cut down to fit.
- **Subject pictures:** one per main subject, a plain phone photo on a concrete floor, a pale wall behind in even daylight; animals turned three-quarters with heads raised, people square to the
  lens with arms hanging.
- **1K resolution is deliberate:** real security footage is soft, and that size stays soft.
- **Check on arrival:** each place picture has its three items, nobody in it, no device and no
  lettering; each subject picture has exactly one subject and it fits its line. Remake a failure once,
  by itself, before any shot picture exists. Place pictures are never abandoned: a failed one is made
  again with less in it.
- **Names say what is in them:** `place-porch-day.png`, `subject-old-dog.png`.

## Shot pictures (step 9)

- One per shot, frozen at the moment the shot begins: whoever is visible right then and nobody else, and the story object as it is then.
- Reference order never changes, on a redo or after a restart too: first the place picture belonging
  to this shot's camera, then the pictures of the subjects who appear in this shot, and only theirs.
- A shot picture is never fed back in as a reference: it would pass its poses to the next one.
- A night shot on a fixed camera still starts from the daytime place picture; the `night-fixed` insert
  greys the subject while its Subject line stays as written.
- A bodycam or dashcam that is away from its place has no place picture: follow the `moving-away` row (its subject references then start at 1).

## The misses list (steps 10 and 12)

You get stills and a handful of frames per clip; movement and sound are invisible to you. Head misses
off in the prompt, then check each picture ahead of filming it and every clip before stitching:

1. **Action and subject:** the asked-for action, the right subject, nobody and no animal extra or duplicated, faces and limbs intact.
2. **Place and lens:** match the place picture, with the keep items in their spots.
3. **Night:** night shots from a fixed camera stay greyscale.
4. **Doubles and loose items:** neither a keep item nor the story object appears a second time out in the open (an
   extra gate across the path, an extra box), and no fixed item floats free. Trace each hedge, fence or wall: a gate in front of the line it belongs in, or attached to nothing, counts as loose (an open
   gate is still hung in its gap), however small it is.
5. **Lettering and devices:** no scrambled writing, and nothing that records in frame.

- A camera overlay the model drew into a picture (clock, camera label, record dot, battery symbol) is
  part of the style and is not a miss, even though the stitch draws its own clock.
- A tiny shift, flicker, softness or a hunch that the camera moved is not a reason to redo: a few
  frames cannot show it. A clip that comes back with no frames is finished but not passed.
- For each clip, answer the `count-question` row for the keep item or story object the subject is beside; one too many, or one standing loose, fails the clip.
- Judge only what is visible, and never hand the checking to the customer. Record each verdict once,
  one line in `work/<p>/checks.md` (for example `shot 3 picture: miss, an extra gate across the path`),
  and rely on those lines later; a verdict is never withdrawn because its frames have gone.

## Clip rules (step 11)

- **Timed steps:** `[b]` equals the render length (the shot length plus a 1 s margin on Seedance, which has returned 4.06 s for a 5 s ask); set `[a]` early, between 1.0 and 1.5 s, since the
  model tends to start each timed step late. Only a clip over 5 s gets a third step.
- **One action each step**, and the subject ends on a spot the frame names. Never "toward the camera", since the model then pushes the face into the lens.
- **Animals move like animals, at true speed:** describe the body's movement, not the animal's
  feelings. An animal that is stuck or afraid pulls and stays put, jaw closed; write "mouth closed, not panting, not grinning".
- **Motion starts at once:** something moves in the opening frame. Nobody else enters, and no one
  addresses the camera.
- **Night clips** contain no colour words whatsoever.
- **The Sound part (Seedance only)** is what the viewer hears beneath the narrator, and the vendor's
  stitch could not lower it: the place's background sound in each of that place's clips; small action
  sounds (paws on gravel, a gate creaking, fabric rustling); no animal calls, sirens or shouts; and never
  silence or "no sound", which makes the route refuse the clip over its audio. Kling and MiniMax clips
  have no Sound part.
- **Put the action first:** a pile of warnings weakens it and invites drift.

## Redos (step 13)

Across the whole run, each shot, each picture and the narration take get one redo apiece. When several
shots fail, redo them together in a single pass.

| Problem | Redo, and the lever it moves |
|---|---|
| Look, subject or extra animal wrong; a fixed item doubled or loose | Make the picture again from unchanged references and film it as soon as it lands (picture) |
| Movement wrong | Keep the picture; shorten and simplify the clip prompt (prompt) |
| Nothing rendered, or the clip is short of its shot by more than 0.5 s | Keep picture and prompt; add one sentence saying what must stay steady (prompt) |
| Refused because a real person or face may be in the picture | New picture with that person farther off, from overhead or from the back, then film it on Seedance at once (picture) |
| Refused a second time | Fallback route: that new picture on Kling, same length, `generate_audio` false, no Sound part (route) |
| Refused because of the audio | Same call, Sound part reduced to the location's background sound only (prompt) |
| Refused or failed for any other reason | Try again with a softer moment (prompt) |
| The route itself is down (exit 6 or 8, or queued jobs failing on that route) | Move every shot on it to Seedance, or to Kling without Sound parts when Seedance is the one down; the move counts as the redo, and the customer hears it without a model name (route) |

- A clip is never trimmed as a fix. A clip that runs short of its shot by up to 0.5 s holds its own last frame inside that shot,
  so no cut moves; a bigger shortfall is a miss. The next shot is never filmed from a faulty picture.
- If a remade picture still shows the wrong subject or place, or a picture has failed twice, all
  filming stops, good shots included: open a spend gate that names the moment in one sentence and end
  the job `partial`. Any other leftover miss is filmed from whichever of the two pictures is better.
- A redone shot gets no second check beyond its length and audio (`clipcheck` figures only): it is stitched as it is, and the hand-off mentions it when it still looks wrong. A redo that fails too ends the run the same way (gate, `partial`).
- Budget gone (exit 5 or 13, or a quote above what remains): stop, state what is done and what is not,
  and retry nothing.
- **Home-base variant:** a shot that still fails after its redo is removed with
  `footage.py fit --per-sentence --drop <n> --write`: the neighbours take its sentence and their windows and
  render lengths are recomputed, any neighbour whose clip no longer covers its new window is filmed again, and the hand-off reports it. This variant may film on MiniMax if the customer
  chooses it; note that in the shot list.

## Which sound plays under each shot (step 14)

With no clip sound the story becomes a voice against silence, which feels like a slideshow.
`footage.py sound` applies the rule below, reading each clip prompt (or a `calm` value you set):

- **A calm shot keeps its own sound.** Calm means, going by the prompt: any animal is resting, sitting,
  walking, trotting or being carried, or there is none; people only stand, walk or look; a dashcam car
  moves steadily; nothing loud happens nearby.
- **Not calm:** animal noises (barking, howling, whining, meowing, crying); animal effort (scratching,
  digging, tearing, straining, struggling, squeezing through, being pulled, being dried with a towel,
  shaking water off); shouting; sirens, horns, crashes, hard braking; hands near the lens that grab,
  dig, pull or rub (a bodycam's visible hands are not busy unless they do one of these).
- **Every other shot borrows a calm sound:** first the closest calm clip from the same place and light
  that lasts no less than the shot; then the same place in any light; then the closest calm
  clip of sufficient length anywhere; failing all three, its own sound turned down 10 dB (SL8 can lower
  one segment; the vendor measured loud clips at 7-12 dB above the narrator). The borrow must be long
  enough because a short one leaves silence under the rest of the shot (the vendor measured 2 s of
  silence where an 8 s sound sat under a 10 s shot).
- **Kling clips** carry next to no sound: they borrow by the same rule and are never borrowed from.
- **No Seedance clip anywhere** (an all-Kling story, or the MiniMax variant) means no clip sound: the
  narration plays alone (learnings STO-L350).
- **No music beneath the narration:** music laid on clips would start again at each cut. If music is
  requested, explain this in one sentence, then offer a separate matching track for the customer's own editor
  (step 14), never mixed into the stitch.
- **"The background is too loud":** re-stitch one rung down, with no new model calls: `--loud 1`
  puts every non-calm shot on calm sound (the longest calm clip, looped where needed; when each non-calm
  shot already found a long enough calm clip it gives the same plan as `--loud 0`, so go straight to the next rung); `--loud 2` puts
  all shots on the final shot's sound; `--loud 3` drops clip sound entirely.

## Length, hold and loudness (step 14)

- The shots together run exactly as long as the measured narration; the narration is mixed in this
  single stitch, never laid onto a clip, nor added as a later pass over the finished file.
- A shot never plays past the end of its clip. A missing shot is redone before anything is stitched,
  even if the hold could hide the gap.
- Every cut stays on its sentence end. A clip shorter than its window holds its own last frame inside
  that shot (a held frame looks frozen, so only for a small gap); the holds across all shots may total
  5 s, and more fails the stitch: tell the customer in one sentence and stop instead of filming more.
  The stitch prints each cut against the sentence ends.
- After a steer re-records the narration, the narration is fitted to the footage already filmed, not
  the reverse (step 16).
- **Loudness** (research `fal/falvideoproduction-09f33d#39`, `#40`): `footage.py stitch` saves the
  bed as a separate stem, compares the narration's integrated loudness with the bed's (9 LU apart at
  least, or the background is too loud), lists any silence in the bed, and normalises the finished mix
  to -16 LUFS after mixing, never before. Comparing the two files this way is our approximation of
  that check (learnings STO-L352).

## Captions and the hand-off (step 15)

- Captions follow straight after the stitch unless the customer declined them. Grouping follows
  research `hyperframes/hyperframes-2afd9d#106`, `#149` and `fal/falmotiongraphics-dc3541#35`: four
  words at most, a new group at a sentence end or after a pause of 150 ms or more, one group visible at
  a time, the first appearing at 0.1 s or later and never at 0, and non-word tokens removed before
  grouping. A group of long words may wrap to two lines; that is allowed.
- **The hand-off** is one or two sentences: the story is ready and is AI-generated, and one thing the customer might
  change, named in plain terms (the voice-over, the opening pictures, the clips, the stitching, the captions). What the customer reads never contains model or field names, prices, file ids, paths or em
  dashes, nor words such as "start frame", "anchor", "window" or "compose". Never say it is captioned
  when captioning failed or did not run, and never tell the customer which word to reply with.
- **The stitched story is final:** do not check it, refilm it or restitch it on your own initiative;
  only the customer reopens a shot.

## Changes after delivery (step 16)

A steer gets a single round: each new call once, one stitch, one caption pass, one hand-off; neither the
steer clip nor the steer stitch is checked.

| Request | What is regenerated |
|---|---|
| New narration (for example, funnier) | Rewrite it to the filmed length at about 3 words a second; if the take overruns the filmed total by more than 5 s, drop a sentence and record again; re-fit each cut inside its clip's length. Pictures and clips are kept |
| A different ending | The final shot only |
| Background too loud | A re-stitch one rung down the ladder above |
| A whole new story | Everything |
| One line changed (home-base variant) | That take, the shot list, and the pictures and clips for that sentence |
| Another home base or camera | Its place pictures first, then each shot set there |
| Another look or another character | The pictures and the clips |
| Another video route or resolution | Clips not filmed yet; clips already filmed only if the customer confirms |

A finished shot is never re-planned, re-pictured or re-filmed unless the customer starts afresh.

## Picking up a run part-way

When `work/<p>/` already has this video's plan, or files named like `place-porch-day.png` or
`shot-3.png`, the run is partly done. What persists: `work/<p>/plan.json`, the files made so far (with
manifest rows) and `work/<p>/shotlist.json`. Run `gate.mjs status`, then `manifest.mjs verify`; fetch
every pending request id with `ai-gen result` before submitting anything new; re-read this skill's
section for the first unfinished step and the shot list, then make that step's calls. Do not begin
afresh, do not regenerate anything the folder holds, and write no prompt from memory.
