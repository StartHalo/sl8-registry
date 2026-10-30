# Security camera writer (CCTV)

SL8 wording of the Everygen CCTV prompt writer (`everygen/cctv-e02220`, no licence stated, restated
and cited). It writes one paragraph and its `Duration: Ns` line; SKILL.md generates. Approach step
numbers are in brackets. `$F` is the skill's `scripts/footage.mjs`.

## Contents
- [The one test and the model](#the-one-test-and-the-model)
- [Situation and lanes [3]](#situation-and-lanes-3)
- [Safe lane and casting [4]](#safe-lane-and-casting-4)
- [Duration [5]](#duration-5)
- [Mount, tier and camera [6]](#mount-tier-and-camera-6)
- [Beats [7]](#beats-7)
- [Realism and light [8]](#realism-and-light-8)
- [Audio [9]](#audio-9)
- [Assembly [10]](#assembly-10)
- [Final checks and traps [11]](#final-checks-and-traps-11)
- [Variation [16]](#variation-16)

## The one test and the model

One question settles every choice: does this look like a machine nobody operates happened to record
it, or like someone filmed it? Choose the machine. A spectacular clip that looks generated has failed
completely. Degradation (grain, stutter, blocky compression, blown highlights, infrared murk) reads
as real and covers the model's failures: ask for the right kind of bad, never a clean image.

How the target model behaves (text to video, with sound generated alongside the picture), and what follows from it:
- It honours specifics and wanders on vague words: fix the vantage, a plain background, the one event, the light and whatever must not change.
- A camera that never moves, aimed at a simple scene, gives it the steadiest anchor there is. This genre's advantage is
  exactly that: a still camera over a bare scene, only one thing moving. Camera motion, clutter or
  several moving things make the picture crawl.
- Fast events melt unless they are far away, brief (one beat) and smeared by a low frame rate (a real
  cheap camera turns a crash into a few stuttering, blurred frames; ask for that). The smear hides a
  blur under a second, not a sustained interaction of a second or two, and never a wrong choice of
  action: that is fixed by simplifying the action.
- Faces fail when they stay on screen; the high wide view keeps them tiny. Never hold a sharp human
  face in the centre. An animal may come closer at the payoff if it keeps moving.
- It drifts to the ordinary action (a man at a glass door opens it). For a surprising beat, make the
  abnormal condition physical, take away the easy way out (no handle, no gap) and pin the result,
  including the outcome that must not occur ("the door stays shut").
- Legs in motion melt like faces: make the payoff a mostly still pose; any walking is slow, brief,
  side-on and mid-distance; never hang the payoff on footprints, tracks or feet in mud or snow.
- Text renders as melting pseudo-letters, the loudest tell: overlays and legible signs are banned.
- Spoken words need braces `{like this}`, but this genre barely speaks: the speakers stand well away from a cheap microphone. Most clips are better with wordless sound or none.
- Speech runs at about two words a second; at most a handful of muffled words.
- There is no negative field, so the constraints sit together at the end (the closer). "No music"
  works; "no background music" does not.

## Situation and lanes [3]

One camera, one place, one moment. Never chain scenes or write a compilation into one paragraph; the
user edits clips together later.

| The request gives | Do this |
|---|---|
| A full scenario | Keep it; find the single instant people will replay and build back from it |
| An animal | Give it its most shareable safe moment (a bear at a porch or bin at night, a moose crossing a snowy yard, an owl dropping through frame, a raccoon stealing something small) and end on the charming or startling turn |
| A kind of clip (weather, funny, near-miss) | Take that category's best moment from the lanes below |
| A place or time | Keep it; change mount, light and tells to fit |
| Nothing, or a mood | Invent new from the lanes, never a re-staged example; rotate category, place, mount, time and event |

Lanes, each with the instant people replay:
- Nature and weather (awe): a transformer bursting in a blue-white flash, or lightning striking a pole or tree beyond an empty lot (the flash, sparks raining); a fireball streaking over a quiet street at night (the whole frame flaring, then dark); a sudden downburst flipping patio furniture or a
  wall of dust swallowing the scene (the furniture tumbling, the dust eating the frame); a big wave
  over a seawall onto an empty promenade (the water bursting up over the wall); a tree or limb falling
  across an empty drive or onto power lines (the moment it lets go, sparks at night); a brown flash
  flood up a street floating a bin (the first surge round the corner); large hail on a parking lot
  (the barrage starting).
- Wild animals, the most dependable lane and home of the night-vision look: a bear tipping a bin,
  opening an unlocked car door or swatting down a feeder (the bin going over, the door swinging, the
  eyes turning to the lens); a moose in a snowy yard or dropping an antler (its size filling the
  frame); deer leaping a drive or grazing a garden at dawn (the leap); a big cat padding across a
  porch at night (the unhurried walk-through); a raccoon dragging off a bag of pet food (the little
  thief and its haul); an owl swooping through frame (the wingspan for one instant); a fox with a shoe
  or a coyote crossing a lot (the animal where it does not belong); a stray farm animal or an
  alligator on a drive (the absurd double-take).
- Near-miss and lucky escape, everyone fine: a car sliding on ice and stopping inches from someone who
  stepped back a beat earlier; a parked car rolling empty across a lot into a fence; a sign, branch or
  box landing exactly where someone just stood (the empty spot); a shelf toppling after a shopper
  walks clear; a car through a shop window just after the clerk steps away, nobody hit.
- Wholesome: a worker or stranger catching a child tipping off a counter or cart one-armed (the catch
  and the relief); a passer-by steadying an older person who stumbles; small good acts nobody did for
  an audience (a wallet returned, a mailbox righted, a runaway cart stopped, a parcel shielded from
  rain); a lost dog sprinting to its owner, a worker scooping up a duckling.
- Funny and harmless: a cat swatting things off a counter, one after another, as a dog looks on (the final
  unbothered swipe); someone striding into a clean glass door and bouncing back, then looking round;
  a cartoon slip on a freshly mopped floor and a pop back up; a dog lifting a sandwich the moment its
  owner leaves; an animal pratfall.
- Reflex: a single object and a single hand (a bottle, jar, mug, phone or plant snatched just above the
  floor; a single falling sign or box caught or batted away). A whole tray or stack fuses into a
  morphing blob.
- Gentle uncanny: a ball rolling across an empty room, a cupboard door drifting open, a balloon
  wandering down a corridor, left unexplained. A curiosity in soft daylight or ordinary lamplight,
  never a threatening figure or a scare.

## Safe lane and casting [4]

- Fake security footage taken as real has caused false crime reports, public panic, real people and businesses defamed, and trouble for creators; reposts strip any caption. The safe lane and the viral lane
  are the same lane: wildlife, awe, kindness, lucky escapes, gentle comedy and harmless oddities, with
  every person and animal fine at the end.
- Everything invented: nobody real or named, no real or named business, street or town, no real brand, logo, plate or shop sign, never a re-created news event.
- Perils are incidental and resolved: the ice, the wind, the curious bear were already there; nothing
  is staged to look cruel; it ends safe, awed or laughing.
- Never write, even when asked: a crime with a victim shown as real (robbery, assault, break-in, abduction, arson, shooting, vandalism presented as real); anyone hit, injured, bleeding or dead; a body or gore; a fight or violence; a weapon in use; sexual content; a child shown in real distress to unsettle; self-harm; a fall ending in real injury with nobody saving it; a fake disaster or emergency that could
  pass as breaking news; a ghost or paranormal event presented as genuine, especially at a real location; a confrontation charged with race. Steer the content quietly to the nearest safe moment and keep the
  format. A close call is fine; a person being struck never is.
- The bright-line test (security footage is taken as evidence): would someone who believed it phone the police, panic, or wrongly accuse or defame someone real, go after a real location, or relive an actual tragedy? Then it is the wrong lane.
- People are anonymous, small and far away, one plain wardrobe tag each (a hoodie, an apron, a winter
  coat), never pushed in on. The animal may be the star and come nearer, but always moving.

## Duration [5]

Pick the shortest length that gives the ordinary scene a beat, lets the event land and leaves room for the aftermath; if unsure, go longer. Never stretch one instant into a long clip: dead air after the
aftermath reads as unedited nothing.

| Size | Length | Beats | Paragraph |
|---|---|---|---|
| One quick hit (a flash, a slip, one swipe, a dart through, a catch) | 4-6 s | 2 (ordinary, then event and aftermath) | about 1,500-2,000 characters |
| The standard moment | 6-9 s | 3-4 | about 2,000-2,600 |
| A longer watch (an animal that explores and then acts, a close call with build-up, weather in stages) | 9-12 s | 4-5, longer approach | about 2,500-3,000 |

An animal wandering in and exploring takes time for few words: count the approach. A catch, swipe or flash really is brief. Bands guide; any whole second that fits. Short clips also hold steadier:
longer takes let details drift more. The source's examples ran 5-9 s.

## Mount, tier and camera [6]

The failure is always the camera turning cinematic. One cheap wide camera, bolted, still for the whole take. That stillness is what makes it real.

Mount, from the place:
- Inside (shops, corridors, offices, homes, lifts, restaurants): high in a corner, about 9-12 ft,
  looking steeply down and across; hard fluorescent or flat lamp light, fittings blown out, floor and
  mid-room filling the frame, people small and foreshortened below.
- Under the eaves (drives, porches, back gardens): about 8-10 ft under the roofline, angled down over
  a drive, path or yard, wide and deep, turning infrared after dark. The classic "what crossed my yard
  last night" view.
- Pole or high wall (car parks, streets, forecourts, loading bays): looking down over a wide spread of
  asphalt, subjects small and distant, orange sodium or cold LED pools at night with black between.

Tier, pick one and stay in it (never grainy tape mixed with crisp high resolution):
- Modern IP camera (default): sharp enough in resolution and depth, but write it flat, cool,
  compressed and smeared on movement, never crisp, graded or well lit. This is the look of most
  modern home-camera clips. (The final-check wording wins over the source's "clean 1080p-ish": the
  sharpness is resolution and focus depth only.)
- Old analog (a deliberate retro look only): soft, noisy, low resolution, faded color, faint scan lines, combing on movement, thick grain, cruder compression. Lean into the murk.

Always: locked and motionless, one take; a wide lens with gentle barrel distortion (door frames,
shelves and kerbs bow, most at the edges); deep focus, no blur or bokeh; a low frame rate so motion
is stepped and stroboscopic and fast things smear and ghost; fixed exposure that burns windows, sky
and fittings to white, crushes the shadows and lags a beat behind any change of light (a floodlight, sweeping
headlights, a passing cloud); blocky compression blooming where things move, banding in flat areas;
indifference (action can sit at the edge or half outside the frame and nothing adjusts).

Never: any zoom, pan, crane, tilt, orbit, dolly, push or handheld drift; following, tracking or
reframing; a cut; rack focus or shallow depth; slow motion; a composed, centred, filmic shot. No camera
moves in the prose at all (none of: the camera follows, pan, zoom, we see, angle on, close-up, cut to).
The one rare option is a slow motorised pan on a pole camera; default firmly to locked off.

An event caught small at the far side of a wide frame convinces more than one placed in the middle.

## Beats [7]

Write the beats in strict numbered order ("Beat one: ...").
1. Ordinary hold, short: an empty driveway, a lamp-lit room where nothing stirs, a quiet aisle, a car park nearly empty at night; nothing happening (half a second for a quick hit). Real surveillance is almost all
   boredom, and the boredom is the proof.
2. Intrusion: the single event begins or arrives (an animal from an edge, a car coming into view across the lot, a sweep of headlights, the first hailstones, a person heading for the spot, the sky flaring). The camera stays where it is.
3. Money shot, given room: the strike with its sparks, the catch, a close call's timing, eyes turning to
   the lens, glass hitting tile, the wave over the wall. One clean physical event; a fast or violent
   one written as a handful of stuttering, smeared frames and not a sharp slow reveal.
4. Aftermath, then out: dust settling, the animal wandering off, a delayed flinch and look round, people hurrying in from both sides, then the empty frame held a beat. Never end on a tidy final pose or a close view of someone reacting.

Craft: keep stating that the frame stays locked and still, as background texture, and let the event own the motion; spend words on the settle (debris, dust, people converging); put the event off-centre or far
back; reactions are small and come half a second late, a distant shout at most (nobody is aware of the camera); one thing moves and the rest is frozen; force the surprising beat and deny the
ordinary escape, describing the impact and the reaction as two separate physical events.

## Realism and light [8]

- The frame does not drift, float, breathe or reframe; say it is bolted and still.
- Name the low-frame-rate motion: runners and fast cars stutter and skip, quick things ghost.
- Fixed exposure lags and blows out; white balance sits cool or oddly tinted.
- Compression is heaviest on motion, which is exactly where the model needs hiding.
- Things settle: a can knocked over rolls, wobbles and lies flat; bits bounce, then still; water spreads and pools; a child who is caught has weight in the arms. A visible cause a clause earlier; nothing hovers, jumps position or goes through solids.
- Count the rigid things moving on their own and aim for a single one: in a vendor test a toppling stack, a man and
  a pallet jack touching at once fused into one morphing slab. One object is safe, two a risk, a person touching more than one object at once is where shapes melt. Reduce any stack to one box or
  bottle and keep contact to one hand on one thing, briefly; a big multi-object fall (a shelf) stays
  away from people and far off, a brief smear into an empty aisle.
- A pose, not a gait: in a vendor test a moose looked fine while it stood and ate, and broke apart the moment it walked off. Prefer a still payoff (halted, head turning, eyes on the lens, feeding, sniffing, up on its hind legs); bring subjects in from a side edge along the ground (dropping in from the top or climbing
  over something reads as a teleport) or start with them already standing in frame.
- Keep the background bare and frozen: clutter, crowds and busy patterns drift over a take.
- Light, fitted to the scene: - Daylight, flat (safest): hard sun or overcast, faded and a bit cool, low in contrast but
    not milky, sky and windows burned white.
  - Interior: hard greenish fluorescent or flat warm lamplight, shadowless, fittings blown, a faint
    flicker.
  - Car park or street at night: orange sodium or cold LED pools, black between them, long hard shadows, lamp heads burned out, heavy grain.
  - Motion floodlight: near-black, then a light snaps on and blasts the frame white while exposure
    hunts back.
  - Infrared: grainy neutral grey monochrome (real security IR is silvery grey, not goggle green), a
    hotspot near the camera falling to black at the edges, bloom on close shiny surfaces, any moth, snowflake, raindrop or speck drifting by the lens flaring into a white orb, animal eyes glowing white when
    they turn to the lens (people's eyes barely glow), crawling luminance noise, a flat black sky. The
    most iconic night look, and good cover.

## Audio [9]

Cheap fixed mics record thin, distant mono sound, and many record none; sparse is authentic. Write the sounds as concrete events, in the order they happen, starting "Audio:":
1. Ambience: thin, band-limited, slightly hollow (room tone with a fridge or tube hum, distant traffic
   and wind, insects at night, rain hiss, a television somewhere else in the house).
2. Foley of the event itself (lightning's crack and long rolling boom after its delay, an impact's thud and
   tinkle, a bin clattering, glass smashing on tile, tyres skidding on ice, a heavy thud, an animal's
   snuffle or screech, the soft whump of big wings).
3. People, indistinct only: a distant startled shout, a surprised scream, a short laugh, an
   unintelligible exclamation. If a few words are truly needed, braces, distant and brief.
4. The settle: debris coming to rest, a last object rolling still, an alarm starting somewhere, the
   rain going on, room tone again.

Two moves: the silent clip (many cameras have no mic; near-silence is deeply authentic and avoids
garbled speech, best with infrared, weather and purely visual moments); and thin, distant, mono,
band-limited, a little distorted, never studio-clean. Every Audio block ends with "no music".

## Assembly [10]

One flowing paragraph, present tense, no names, about 3,000 characters at most, five sections:
1. Opener (`node $F frame cctv`, row `cctv/opener`) with its mount, place and look slots (the look slot
   is daylight or infrared night); its bans stay.
2. "Scene geography:" first: light, place, a plain still background, the ordinary state, and the spot in the frame where the event happens (off-centre, far back), people small.
3. The numbered beats, with physics and stepped low-frame-rate motion carried by the verbs.
4. "Audio:" with the timeline (or near-silence), closing on the settle, then "no music".
5. Closer (row `cctv/closer`).

`Duration: Ns` on the next line, nothing after. No burned-in timestamp even though real footage has
one: it looks cheap, it is the hardest thing for a model to hold steady, and many real clips circulate
with it cropped off. No camera name, channel bug, menus, icons, grids, crosshairs, and no legible
signs, banners, plates, logos or captions in the scene; signs stay outside the frame or blurred. Any
label the finished video wants belongs to a later edit.

## Final checks and traps [11]

Checks:
- Paragraph and tag only; the length fits; the money shot and its aftermath land.
- One camera, place and moment, readable as a thumbnail, caught not filmed, opening on a beat of the
  ordinary and ending on wonder, relief, charm or a laugh.
- A fixed, high, wide, bolted, still camera, one take; no camera move anywhere; uncomposed, the event
  off-centre or far back.
- One event carries the motion; the background is plain and frozen; fast events smeared and stuttered,
  then the aftermath; faces small; the animal nearer only while moving.
- Simplified for the model: a lone moving subject, or a single object and a single hand; a pose, not a gait; a
  surprising beat over-specified with its ordinary default denied; nothing hinging on tracks.
- Opener and closer intact, the text and interface bans in both; the look washed-out and flat or grainy infrared, never milky, pretty or graded; "Scene geography:" and "Audio:" present.
- Audio sparse (thin ambience, the event's foley, indistinct people, the settle) or silence; "no music"; no clearly scripted speech.
- All fictional and safe; nothing banned; a near-miss never turns into a hit; nothing readable.
- Present tense, no names, no length or setting words; scenario, place, light and money shot rotated.

Traps: any camera movement (the number-one tell); a composed centred shot; filmic optics or grade;
a crisp slow-motion render of a fast event; any text or interface; a sharp face held in frame; people
performing for the lens; too clean, crisp or well lit; a cluttered set or many moving subjects; letting the model swap in the everyday action; several rigid objects touching a person at once; a walking
animal as the payoff; a payoff that depends on ground contact; dragging past the aftermath or no
ordinary hold; floating or teleporting physics; music, a narrator or clean dialogue; anything banned;
a repeated scenario or framing; length or setting words in the paragraph.

## Variation [16]

Batches of near-identical clips break the illusion of different cameras and uploaders. Rotate the
category, place and mount, subject, time and light (flat day, interior tubes, sodium night,
floodlight, infrared) and which kind of payoff it is (a strike, a catch, a close call, a turn to the lens, a theft, a fall). Opener, closer and section labels are all that repeat.
