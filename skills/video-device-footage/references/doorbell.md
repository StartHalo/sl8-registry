# Video doorbell writer

SL8 wording of the Everygen doorbell prompt writer (`everygen/ringdoorbell-4f3b07`, no licence stated,
restated and cited). It writes one paragraph and its `Duration: Ns` line; SKILL.md generates. The
device is a generic video doorbell: no maker is named in the paragraph and no logo is ever added
(VID-D403). Approach step numbers are in brackets. `$F` is the skill's `scripts/footage.mjs`.

## Contents
- [The device](#the-device)
- [Situation [3]](#situation-3)
- [Safe lane and casting [4]](#safe-lane-and-casting-4)
- [Duration [5]](#duration-5)
- [Camera [6]](#camera-6)
- [Beats [7]](#beats-7)
- [Realism and light [8]](#realism-and-light-8)
- [Speech and audio [9]](#speech-and-audio-9)
- [Assembly [10]](#assembly-10)
- [Final checks [11]](#final-checks-11)
- [Variation [16]](#variation-16)

## The device

A doorbell camera is screwed to the house and nobody operates it. It never moves; every bit of motion
in the clip belongs to whoever crosses its view. A locked shot is also the most stable thing a model
renders, while camera motion is the number-one giveaway and the main cause of warping. The model
follows specifics and wanders on vagueness, so fix the vantage, the one thing that happens and the
light.

## Situation [3]

One porch, one arrival, one action, one payoff, legible as a thumbnail, ending on warmth, a laugh, an "aww" or a surprise that harms nobody.

| The request gives | Do this |
|---|---|
| A complete scenario | Keep it; find the instant worth replaying (jaws closing on a box, a hand on the button, a wave) and shape the clip so that instant crosses the fixed view |
| An animal | Give it that animal's most shareable porch moment (a bear taking a parcel, a raccoon caught at the bins at night, a deer eating the plants, a dog pressing the bell to get inside), ending on whatever turn is funny or sweet |
| A kind of clip (delivery, wholesome, a little creepy) | Take that lane's most shareable beat |
| A place, time or weather | Keep it; change light, porch dressing and tells to match |
| A line | Work backwards so that line becomes the payoff |
| Nothing, or a mood | Invent fresh; never re-stage a known example; rotate scenario, subject, light and line |

Each scenario names its one instant (for a bear: its jaws close on the cardboard and lift it clear of
the boards), and the clip is built around that frame. A request for something scary, a break-in or a
porch thief is steered quietly to a harmless mystery or the nearest safe beat.

## Safe lane and casting [4]

- Fake doorbell clips have caused neighbourhood panic, false police reports and wrong identifications;
  reposts drop any disclaimer, and the device makers and platforms fight generated fakes. Build only
  wholesome, funny, awe or gently spooky moments: that is also what performs.
- Never, even if asked: a break-in, an abduction, violence, weapons, blood, death, a real crime by a
  recognisable person (including a plain parcel thief), a real intruder, real named people or
  companies, a re-created real incident, sexual content, a real emergency, "real" ghosts, aliens or
  cryptids offered as evidence, a child in danger. Steer to the nearest safe beat and keep the format.
- Invented throughout: no real or named people, look-alikes of famous people, neighbourhoods,
  addresses, house numbers, plates, or readable delivery brands; uniforms and vans are plain and
  unbranded.
- The homeowner is hardly ever seen: a voice through the doorbell speaker, or someone spilling in at the lower edge closest to the camera (the door opening is never shown).
- A subject may notice the camera (a glance, a wave, holding up a parcel, talking to it), candidly,
  never as a polished skit with influencer energy.
- Faces fail worst when sharp and still: keep people walking in, turned away, under a cap, backlit,
  in shadow, stretched near the lens, in infrared or lost in a hug. The animal alone may come near and balloon in the lens, and only while it moves; a short clean beat at the
  payoff is fine.

## Duration [5]

The writer picks the length: the fewest whole seconds that land the payoff, rounded up when unsure.
Never pad (a squirrel pressing the bell is a 5 s clip, not 11): padding gives the still camera time to wander and warp, and a payoff cut short ruins it.

| Size | Length | Beats | Paragraph |
|---|---|---|---|
| One clean beat (a bell gag, a wave with a line, an animal that takes a box and leaves, a dog at the button, a snout against the lens) | 4-6 s | 2 (motion enters, then the moment) | about 900-1,400 characters |
| The standard porch moment (an approach, the act, then a reaction or a departure) | 6-9 s | 3 | about 1,600-2,400 |
| A short bit in phases (an animal investigates, reacts to the chime or a voice, leaves; a driver arrives, does something, talks over the speaker, goes; an arrival and a family pouring into frame) | 9-12 s | 4 | about 2,400-3,000 |

The approach costs seconds, not words (a bear crossing a yard). A press, the chime and the reaction
make a natural little arc worth a beat or two; a two-way exchange buys a bit more. Measured: all six of
the source's worked prompts ran 3,054-3,651 characters, over the ~3,000 guide and, for the 5 s dog,
over twice its band: the fixed opener and closer take much of it, so treat bands as a floor-biased
guide and never cut the fixed text.

## Camera [6]

- Mounted on the door or its frame about 4 ft up (chest to eye height), tipped slightly down.
- The lens looks OUT, away from the house: the front door and its wall sit behind the camera, never in view. A visitor "at the door" stands right under the camera looking up. Using the door
  as a backdrop is the commonest geometry error and an instant tell. The backdrop is the porch, the
  path, the yard or the street.
- Tall, showing a person from head to feet: porch floor and mat at the bottom, the overhang or sky at the top, a
  sliver of post, planter or wall bending up one side; it fills a vertical phone screen.
- A moderate fisheye, not a circular peephole: straight lines bow outward, most at the edges.
- Deep focus, sharp throughout, never bokeh or shallow depth.
- No shake, bob or handheld wobble: this is not a bodycam.
- No camera words in the prose (none of: reveal, zoom in, close-up, we push in, the camera pans, cut to, angle on). The frame stays put and the subject does the moving. Describe the frame as locked and still, hand the subject one unhurried verb (lumbers, stretches out a paw, picks up, cocks its head, lets go, races off) and add the fisheye distortion (pulled long as it passes, swelling as it nears the lens). That is how a still camera gets energy.

## Beats [7]

Number them ("Beat one: ... Beat two: ..."); order is choreography even in a fixed frame.
- Motion-triggered cold open: the still porch for the first half second, then the subject already on
  its way in. No other set-up.
- Subjects ARRIVE from far off or from a side (up the path, across from a side, climbing in from the
  near bottom edge). They never fade in, pop in or appear standing on boards that were bare a moment earlier; models default to that spawn, and it is an instant tell.
- ONE slow, legible action (a bear lifting a box, a hand going to the button); a fast scramble melts.
- End on the up-beat, or on the subject leaving and the porch empty again (a natural doorbell ending);
  never on aftermath or dead air.

## Realism and light [8]

- One vivid element; the rest of the porch plain, generic and real.
- Physics settles: objects are heavy and end up at rest; every movement shows its cause one clause before; paws and hands touch what they touch.
- Porch dressing generic and unreadable: a plain or patterned mat with no lettering, a plant, a basket,
  a railing, string lights, a wind chime, an unlabelled box, a car with no readable plate.
- Weather tells matched to the scene: rain running down the lens and pouring off the overhang, snow
  drifting through the infrared hotspot as specks, wind swinging the chimes, fog greying the distance,
  heat shimmer over a sun-bleached drive.
- Sensor looks (the opener's slot; pick one):
  - Day: over-sharpened and over-processed, punchy contrast, a wide range that whites out the sky and sunny lawn while the porch in shade stays darker; stepping from sun to shade, the exposure hunts and
    settles a beat late.
  - Night infrared (the signature look): grainy black and white, a bright hotspot falling away to black,
    animal eyes as white discs, moths and insects near the lens as blazing white blurred orbs and
    streaks (the strongest doorbell-at-night tell, almost never faked), sometimes a web on the glass.
  - Night colour: a porch light triggered by motion, a warm pool with hard shadows, a noisier smeared
    colour picture.
  Infrared or porch light, never both. The worked examples also bend the day slot for dusk and late
  backlight.
- The processing is cheap and over-sharpened but never milky, hazy or graded: the soft, foggy,
  washed-out picture is the stock generated look.

## Speech and audio [9]

At least half the realism is in the sound: a thin, cheap doorbell mic, gain pumping, wind booming,
slight clipping when something is loud and close. "Bad" sound reads real; a full clean mix is a tell.
Write the Audio block as events in order, starting "Audio:":
1. Ambience on the thin mic: birdsong by day, with a soft wind thudding on the mic; crickets and cicadas at
   night; distant traffic, a mower, children down the street, a far dog, rain, chimes.
2. Close foley with the surface named: footsteps creaking on decking, scuffing concrete, on brick or
   gravel; a parcel thud, cardboard scraping, a bag rustling, a bin rattling, claws ticking, loud sniffing.
3. The chime, only if the button is actually pressed (it punctuates; it is not background).
4. The line at the payoff: a short unscripted-sounding remark from the visitor, or the homeowner's voice through the
   speaker (thin, tinny, band-limited, a little clipped, arriving a beat late through the digital link). The two-way
   voice is a cheap payoff trigger: a raccoon bolts, a deer freezes, a dog hunts for the voice.
5. The reaction or reward (a startled chitter, a giggle, a whine, a tail beating against the door, the family crying out, a laugh of relief); end inside it.

- Spoken words go in braces `{like this}` with a gender and register tag (for example `{you can't
  have that!}`, a thin woman's voice through the doorbell speaker); keep the speaker distant, turned or
  lens-warped so no mouth must sync. About two words a second: about 15 words, 20 at most.
- Finish on a natural mono mix, thin and lightly compressed, and "no music" ("no background music" does
  not hold): there is never a score in a doorbell clip.

## Assembly [10]

One flowing paragraph, present tense, no names, about 3,000 characters at most, five sections:
1. Opener (`node $F frame doorbell`, row `doorbell/opener`) with its sensor slot set to the scene's
   light. Its first words aim the render at a real outward-facing device, and "locked off ... still
   on its bracket, never panning, zooming, tilting or cutting" is the line that keeps it still.
2. "Scene geography:" before anything moves: the porch, the light, the generic dressing, where the
   subject will come from.
3. The numbered beats.
4. "Audio:" and the layers, the braced tagged line in place, the reward last, then "no music".
5. Closer (row `doorbell/closer`).

`Duration: Ns` on the next line. Deliver a clean plate: no logo, timestamp, date, watermark or interface, and nothing in the top-left corner. Models reach for a timestamp, a date, a battery icon, a
recording dot, a signal bar and a wobbly maker's wordmark; none of it goes in, because all of it
garbles, and many systems show the time only in their app. Nor any house number, plate, brand, label or slogan on a mat.

## Final checks [11]

- Paragraph and tag only; the length fits (short-biased) and the payoff lands.
- One porch, one arrival, one action, one payoff; it looks recorded by a dim-witted fixed device, not made to sell.
- Fixed, locked, one take; a moderate fisheye, focus deep, tall framing from head to feet; all motion belongs
  to the subject; no camera words, no shake, no filmic angle; the lens faces OUT and the door is never
  seen.
- One slow, legible action; people walking in, turned, capped, backlit, warped or in a hug; the animal near the lens only while in motion. - Every subject arrives from far off or from a side; nothing spawns.
- Opener and closer close to frames.json; the sensor slot suits the light; "Scene geography:" and "Audio:"
  present; porch dressing generic and unreadable.
- A clean plate, top-left clear; no numbers, plates, brands or slogans.
- Sparse audio on a thin mic, the chime only if pressed, at most one braced tagged line and/or the
  speaker voice (about 15-20 words), the reward last; "no music".
- All invented and safe; nothing banned; scary or thief requests steered; present tense, no names, no
  length or setting words.

## Variation [16]

Batches with identical fingerprints are a known tell. Rotate lane, subject, light (day, night
infrared, porch light, weather), porch build, payoff type, chime or not, speaker voice or not, and the
line. Only opener, closer and section labels repeat. N variants are N blocks, each with its own
`Duration:` line, separated by one blank line; a follow-up returns only the revised block.
