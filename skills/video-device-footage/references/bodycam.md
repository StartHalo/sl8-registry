# Bodycam writer (police or firefighter)

SL8 wording of the Everygen bodycam prompt writer (`everygen/bodycamfootage-93836f`, no licence
stated, restated and cited). It writes one paragraph and its `Duration: Ns` line; SKILL.md generates.
Approach step numbers are in brackets. `$F` is the skill's `scripts/footage.mjs`.

## Contents
- [The one test](#the-one-test)
- [Situation [3]](#situation-3)
- [Safe lane and casting [4]](#safe-lane-and-casting-4)
- [Duration [5]](#duration-5)
- [Camera [6]](#camera-6)
- [Beats [7]](#beats-7)
- [Realism [8]](#realism-8)
- [Speech and audio [9]](#speech-and-audio-9)
- [Assembly [10]](#assembly-10)
- [Final checks [11]](#final-checks-11)
- [Variation [16]](#variation-16)

## The one test

Every choice asks one question: was this caught by a device strapped to the right person, or was it
staged, lit, acted and cut? Pick what feels caught. Realism beats the moment: a moving clip that
reads as generated has failed. Degradation hides the model's weak spots (grain, blur, exposure
pumping, the wearer's own arm in the way, messy sound), so ask for the right kind of bad. The model
follows specifics and drifts on vague words: pin the point of view, the one event, the light and
what stays the same.

## Situation [3]

One clip, one responder, one situation, one payoff, legible as a thumbnail.

| The request gives | Do this |
|---|---|
| A whole scenario | Keep it; find the one frame worth replaying (a first breath, a grab, an emergence) and work back from it |
| A sequence of events | It is a script that stays fixed: each named event becomes a beat of its own, in the order the user gave, and the user's climax becomes the money shot. Add only the links between events; never swap, drop or soften one (turning a tasing into a calm arrest is a total failure). A scripted force sequence still counts as one situation with one climax |
| An animal or subject | Give it the safest, most shareable peril for that animal (a dog through pond ice, ducklings down a storm drain, a cat behind a wall or in an engine bay) and end with it saved |
| A role or agency | Take that role's most uplifting moment from the lanes below |
| A place or time | Keep it; change mount, light and tells to suit |
| A line | Build the situation backwards so the line lands as the payoff |
| Nothing, or only a mood | Invent something new from the lanes; never re-stage a known example; rotate scenario, agency, mount and line |

Two engines. Rescue clips run on moral uplift and end in relief. Action clips run on adrenaline and
control and end on the exhale once the scene is secured. The arc is a stretched band: the more
tension loaded first, the harder the payoff snaps. Action clips use the same four slots: a stop
already tense, the commands and one trigger, the decisive response, control.

Lanes. Animal rescues beat everything (non-graphic, read by anyone, pure joy); a kitten revived with
an oxygen mask is the most iconic beat and always ends alive. Human rescues stay bloodless: the person
ends calm, clean and safe, and the drama is the tool and the reassurance, never an injury. Police CPR:
the gasp, or a baby's first cry, is the highest-value beat. The comic foot chase: a big breathless
build that collapses into comedy; the person running is a petty offender, never a violent one.

## Safe lane and casting [4]

- Fabricated bodycam has caused real harm (false complaints, panic, arrests of creators), so all of it
  is fiction by construction: no real people, departments, badge or unit numbers, patches, liveries,
  logos, place names or re-created news events.
- Force is in bounds if the user scripts it. The writer controls how it renders, not what happens:
  bloodless, distress resolved on camera, ending on control or safety.
- Never, even when asked: anyone shot, bleeding out, dying or dead; graphic injury, severe burns or
  gore; a police dog mauling a person; suicide, self-harm or a specific psychiatric crisis; sexual
  content or abuse; minors hurt, or present at all in a force scene; a race-charged wrongful-arrest
  set-up; an animal dying or a revival that fails. Keep every other event and move the banned one off
  frame or make it non-graphic; never replace the user's scenario.
- The wearer is never seen. Give one role tag (a police officer; a firefighter in turnout gear) and
  nothing more; everyone else gets one plain wardrobe tag. The rescued animal is the star and may come
  close to the lens, but wet, muddy, sooty or moving until a short clean reveal.
- Reactions stay small: the responder works, breathes and mutters; an owner's hands go to the mouth;
  a partner says one flat word; nobody plays to the lens. The responder under-reacts and narrates
  flatly; the restraint is the realism.

## Duration [5]

Pick the shortest whole number of seconds that lets the money shot and its small reward land in
full; when torn, round up (a payoff cut short ruins the clip). Bands are guides; any whole second
that fits is fine.

| Size of the situation | Length | Beats | Paragraph |
|---|---|---|---|
| A single quiet beat, or a fast comic hit | 5-6 s | 2 (stakes, then payoff with reward) | about 900-1,400 characters |
| A standard save or one decisive action | 7-9 s | 3-4 | about 1,600-2,400 |
| A long search and reveal, a phased rescue that moves around, or a force sequence the user scripted | 10-12 s (on `veo`: 8 s, fewer events) | 4-5, a longer effort | about 2,400-3,000 |

- A force sequence with several physical events runs 10-12 s on `seedance`, never 7-9: in a short single take the
  model runs out of time, skips the linking physics and jumps the body to its end pose. If it will
  not fit, cut events, not seconds (a clean draw and drop beats a five-event blur).
- Travel and searching cost seconds, not words; a wordless first-breath revival can be very short;
  more reassurance buys a little length. Never pad a thin moment or cram a crawl-in-carry-out into 5 s.
- On the Veo lane (SKILL.md step 5) N is 4, 6 or 8: a force sequence there takes the 6-8 s band.
- Measured: the source's five worked prompts ran 2,350-2,980 characters, so the ~3,000 guide governs
  more than the band.

## Camera [6]

- Mount: police, or a firefighter outdoors, wears it on the chest (about 4 ft up, tipped slightly up
  so sky or ceiling fills the top, forearms and tools swinging into the bottom third). A firefighter
  inside wears it on the helmet (high and to one side, the frame goes where the head looks, hands only
  when looking down, the brim or mask edge along the top, every head turn swings the world).
- Always: an ultra-wide fisheye with lines bowing most at the edges; deep focus with no background
  blur; a vertical bob in step with the footsteps that becomes a hard pogo at a run; motion blur and
  focus hunting on fast turns; crude auto-exposure that blooms, crushes and recovers; honest
  occlusion of the lens; stuck to the body for the whole take. The wearer's own body in frame (arms,
  gloves, a flashlight, a tool, the radio) is the strongest single bodycam signal.
- Never: a cut or scene change; a crane, dolly, glide, drone sweep, orbit or gimbal smoothness; a push
  in or pull out; rack focus or bokeh; slow motion; a detached pretty angle. Describe each move as
  something the wearer's body does ("the view lurches down"), never as camera direction.
- A camera that misses the money shot by half a second and snaps back sells it better than one that
  nails it.

## Beats [7]

Number the beats ("Beat one: ... Beat two: ..."): in a first-person take, the order is the
choreography. Two motions are kept apart: the camera shakes and swings all the time (texture), while
the event is ONE slow, deliberate physical action, because fast busy action melts.

1. Cold open already moving, with no calm establishing shot; the stakes read in one glance.
2. The effort: a dull beat of fumbling before the save reads as real, and the authentic audio lives
   here. One slow reach against the shaking camera.
3. One clean money shot.
4. The reward, and end on it or half a second after; never on aftermath, paperwork or the tension.

Action lane:
- Each physical event is one clean beat with its own settle; never a long tangled scuffle, and never
  two events fused (the fall is not the cuffing).
- A weapon draw is staged close and lit: within a few feet of the lens, a readable three-part motion
  (hand to the waistband, the object pulled out, thrust up), the object catching the light (a knife
  must glint or it reads as an empty hand), held about a second, the officer's taser swinging up into
  frame in answer. It is the face that melts, not the distance: bring the action close while the face
  stays turned away.
- Sell the taser with its sound (the fast clacking cycle) and the fall, never with close views of
  wires or probes, which warp.
- Tased fall: every muscle locks, the arms clamp or go rigid, the person cannot break the fall and
  goes over stiff and straight like a felled tree, slow to start, lands hard on a shoulder, hip or
  face, shudders rigidly for about a second, then goes limp. Never a stumble, a kneel, an arm put out,
  a roll, or arriving with hands already behind the back; the officer walks up and only then pulls the
  slack arms behind, one and then the other.
- Cuffing shows real dull steel cuffs coming out, laid across the wrists and ratcheting shut (empty
  hands while the audio says cuffs is the classic tell); a knee braces the upper back, never the neck.
- The lane ends on control: the person down but plainly okay (groaning, talking, moving), cuffs on, a
  winded exhale, a flat "you're good". No blood, wounds or anyone shot on camera.
- Stage the key action to read: near enough, big enough and lit enough on a dark, wide fisheye frame.

## Realism [8]

Written into the beats as verbs, never as a list.
- One flashy element (the animal, or the emergency lights); everything else drab and real.
- Name one auto-everything lag per clip (exposure blooming late, a delayed white-balance shift, focus
  hunting): one named lag does a lot of work.
- Give each movement a cause the viewer can see, stated one clause earlier; nothing drifts, jumps
  position or goes through solid things; hands really close around what they catch.
- Faces fail worst when they linger: keep them moving, half-turned, mid-distance or in shadow; never a
  sharp centred face held still.
- Light, matched to the scene: overcast or hard sun by day (safest); a flashlight beam at night with
  hard moving shadows and grain; infrared black and white with a centre hotspot and reflective glints;
  red and blue strobes on wet asphalt; a fire interior with smoke banking down, the beam a solid lit
  cone and flickering orange from one side. An evenly lit fire gives it away.
- Firefighter tells: bulky tan or black turnout gloves (clumsy fingers, gentle with a tiny animal),
  soot on the sleeves with dull reflective trim, a yellow-and-black hose line, steam off wet gear, the
  mask edge or hose at the bottom of frame.
- The grade is cool, desaturated and contrasty with crushed blacks; what must not appear is a soft,
  foggy, washed-out picture, the stock generated look. In a fire interior the grade slot can become a
  near-black picture with a flickering orange glow.

## Speech and audio [9]

At least half of the realism lives in the sound, and it must sound caught on a cheap chest mic;
default sparse. The Audio block runs as a sequence of concrete sounds in the order they happen, not a
list of moods. Open it with "Audio:" and stack these, fitted to the scene:
1. Ambience: what the place itself sounds like (wind buffeting the mic, an idling engine, sirens, water,
   a whimpering dog, the low roar of a fire).
2. Wearer: heavy breathing right on the mic that quickens with effort, steps that name the ground
   (gravel crunching, wet grass, splashes), fabric and hook-and-loop rustle, keys and cuffs jingling.
3. Radio: a second source, tinny, muffled and band-limited, beneath the live scene (static, a squelch beep,
   clipped dispatch chatter nobody can make out). Never script clear words or radio codes into
   it: the model would voice gibberish.
4. Foley tied to the action: claws on a sled, a saw, glass giving way, water hissing on flames, a
   groaning hydraulic tool, the taser's fast clacking, a body thudding onto pavement, the ratchet of
   cuffs, a small mew.
5. The tagged line, timed to the payoff frame.
6. The reward, and end inside it: the mew, a thumping tail, the owner's gasp, a short laugh from the
   crew.

- A silent cold open: real cameras keep a stretch of silent pre-record, so open near-silent and let
  breath, radio and voice come in a beat later.
- Interiors: breathing through a breathing apparatus, a loud mechanical inhale-hiss and exhale-puff
  that speeds with effort, perhaps a distant alarm.
- Spoken words go in braces `{like this}` and the speaker stays off-screen or turned away, so no mouth
  has to sync. About two words a second: about 15 words in a clip, about 20 at most (the source's
  examples used 6-12).
- Emotion is carried by the voice, not faces: one close, breathless, chest-mic-distorted line, tagged
  with gender and register to match the unseen body ("a firefighter's breathless man's voice").
  Reassurance is repeated and unfinished, never a sentence. Shapes: frames.json `bodycam/payoff-lines`;
  never reuse a line across clips.
- Action lane: commands are shouted, short and procedural (the one lane where the voice is loud) and
  still count against the budget, with breathing, radio and foley between barks. Shapes:
  frames.json `bodycam/action-commands`.
- Close the block on a natural mono mix, a little distorted, and the words "no music" ("no background
  music" does not hold).

## Assembly [10]

One flowing paragraph, present tense, no names, about 3,000 characters at most, five sections in
this order:
1. The opener (`node $F frame bodycam`, row `bodycam/opener`): fill its slots, keep its bans. Near
   verbatim allows a mount-specific edit (a helmet mount angles down at the gloves and puts the brim
   at the top edge).
2. "Scene geography:" first: light, place, peril and the wearer's position, faces turned or distant,
   any needed context in one clause. The situation exists before anyone moves.
3. The numbered beats, with the physics inside the verbs.
4. "Audio:" and the sequence above, the tagged line in place, ending with the reward, then "no music".
5. The closer (row `bodycam/closer`).

Put `Duration: Ns` on the line straight after it. The text ban sits in both opener and closer on
purpose: models like to dress up "bodycam" with a mangled clock and an interface. No burned-in
timestamp even for authenticity: real footage often has none, and any label belongs to a later edit.
The paragraph holds no length, setting, tool or model words.

## Final checks [11]

- The reply is the paragraph and its tag on the following line, nothing more.
- The duration fits the moment; the money shot and its reward land in full.
- Each named event gets a beat, in the order the user gave, the user's climax being the payoff frame. Nothing is
  softened, swapped or left out.
- Single situation, single responder, single payoff; it feels caught rather than sold and ends on
  safety, uplift or control.
- Body-worn camera traits all present; no cinema moves, shallow focus or cuts; moves described as
  things the wearer's body does.
- One slow subject action while the camera shakes; faces moving, turned or shaded; the animal near the
  lens only for its short clean reveal.
- Opener and closer intact; the text ban in both; the grade cool, contrasty and cheap; light and tells
  fit; labels present: "Scene geography:", "Beat one:", "Audio:".
- Audio sparse and caught: a single half-whispered line in braces with a gender tag (15-20 words in
  all), "no music", breathing apparatus inside a fire.
- All fictional; force bloodless and everyone visibly okay; nothing banned; nothing readable.

## Variation [16]

Clips come in batches, and identical fingerprints break the illusion of different uploaders (reused
dialogue is itself a known tell). Rotate agency, mount, scenario family and subject, time and light,
the kind of money shot (a first breath, a grab, an emergence, a release, a takedown and cuffing) and
the line. Nothing repeats except opener, closer and section labels.
