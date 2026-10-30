# Hydraulic press writer

SL8 wording of the Everygen hydraulic-press prompt writer (`everygen/hydraulicpress-9aa6f6`, no
licence stated, restated and cited). It writes one paragraph and its `Duration: Ns` line; SKILL.md
generates. Approach step numbers are in brackets. `$F` is the skill's `scripts/footage.mjs`.

## Contents
- [The one test and the model](#the-one-test-and-the-model)
- [Situation and the object [3]](#situation-and-the-object-3)
- [Material classes [3]](#material-classes-3)
- [Safe lane [4]](#safe-lane-4)
- [Duration [5]](#duration-5)
- [Camera, staging and speed [6]](#camera-staging-and-speed-6)
- [Beats [7]](#beats-7)
- [Physics [8]](#physics-8)
- [Audio [9]](#audio-9)
- [Assembly [10]](#assembly-10)
- [Final checks [11]](#final-checks-11)

## The one test and the model

When unsure, pick whatever feels like a battered machine in an oily workshop rather than a
simulation. The model is exact about what you name and vague about the rest: name the object, its
exact material, the one angle, which way the ram travels and the single way it fails, or the object
drifts into something else. Fast chaotic motion morphs and slow one-way motion holds, so the slow ram
is both authentic and stabilising; the one fast moment (a shatter, a burst) is best in slow motion.
Physics must be spelt out: material, failure, where the debris goes. An unnamed crush defaults to a
weightless average of every material.

## Situation and the object [3]

ONE clip is one object's single crush: no chains, several presses or compilations; the user stitches
clips later.

| The request gives | Do this |
|---|---|
| A particular object | Keep it, place it in its material class, render that class's real failure |
| A material or a feeling (soft and satisfying, something that blows up) | Take an object from that class that is easy to read and fails spectacularly |
| "Will it crush?" or curiosity | Pick an object whose outcome surprises: it holds out, beats the press, or does something odd. Surprising failures travel furthest |
| A kind of thing (food, tools, gadgets) | The single most photogenic, recognisable item and its best squelch, shatter or spark |
| Nothing, or a mood | Choose fresh, rotating through the four reliably satisfying failures (a glassy shatter, metal pressed flat, a juicy burst, a truly soft smear) and a crumble, without leaning on oozing crayons. The object list is a palette, not reruns |

Object rules: one object, one material, one failure; a composite object (a phone: glass, metal and
plastic) leads with its single dominant visible failure (the screen crazing and the body bending); it
sits whole and centred at the start; render one class, never an average of classes.

## Material classes [3]

Each row: what the failure looks like; what flies and how it settles; what it sounds like; the speed
and view; the fake to avoid.
- Brittle-hard (a ceramic mug, a bulb, a bottle of glass, marble, cast iron, porcelain, boiled sweets,
  frozen fruit). Look: it stays rigid and quiet under the ram with no bulge, then cracks race over it
  and it breaks into heavy jagged pieces in one instant; tell the model it "keeps its rigid shape
  without deforming until it cracks and bursts" so it does not soften it first. Debris: solid pieces
  flung outward and downward, skidding across the bed, just a wisp of dust, a few shards spinning
  still. Sound: a held groan, then a sharp crack, a crash and fragments pattering. Speed and view: real
  time is safest; slow motion on the shatter is optional if the frame is bright and close; side or
  three-quarter. Fake: denting like metal, or a puff of weightless dust in place of heavy pieces.
- Ductile metal (cutlery, a padlock, coins, a drinks can, a copper or aluminium tube, lead or solder).
  Look: it buckles and folds and widens into a concertina or a pancake, edges flaring, surface
  creasing. Debris: none; the metal spreads and rests, perhaps with one torn seam. Sound: a metal
  groan, a crunch, a dull crumpling, a scraping as it widens. Speed and view: real time, slightly from
  above at three-quarter to see it go flat. Fake: shattering or crumbling; this metal changes shape and
  never breaks into bits.
- Soft-ooze, only for genuinely soft stuff (butter, plasticine, soft cheese, gum, lipstick, warm wax,
  soap, modelling clay or dough). Look: it squashes, then spreads in lumpy matte lobes and short torn
  ribbons of mixed thickness that fold back and merge into one mass, the separate pieces lost. Debris:
  the lobes creep, rip and sag by their own weight; the total volume stays true and never grows.
  Sound: a soft wet squelch, a small squish and creak, never a crack. Speed and view: real time,
  overhead or a tight three-quarter macro. Fake: the gummy-worm look of neat, glossy, rounded, identical
  tubes that keep one piece each, look inflated and swell.
- Fibrous or layered (a block of wood, plywood, a deck of cards, a stack of paper, a book, card).
  Look: it holds out harder than expected, packs down dense, then fans out or splinters; pages buckle and burst out, wood splits, layers peel apart. Debris: splinters and scraps flung out; a tight wad left
  crushed. Sound: creaks and a crackle that grows, ending in a sharp tearing of splinters. Speed and view: real
  time, or slow motion for the spray; from the side. Fake: paper folding like tissue; a thick stack is
  tough, and that toughness is a genuine surprise.
- Granular (sugar cubes, chalk, a biscuit, dry sponge, foam packing, floral foam, kinetic sand). Look:
  it cracks and slumps into a spreading heap of powder or crumbs. Debris: a dust cloud rises and sinks,
  crumbs spread and end up in a heap. Sound: a dry crunching crackle, a crumble, a faint hiss of dust.
  Speed and view: real time, overhead or tight three-quarter. Fake: grains that hover or disappear;
  powder falls and heaps.
- Elastic (an eraser, silicone, a tennis or bouncy ball, a tyre, a foam mattress). Look: it squashes
  and bulges wide, storing energy, then rips raggedly or snaps back and flies. Debris: a torn split; or
  it shoots off sideways or bumps the ram upward. Sound: a stretching rubbery creak, then a hard thwack or a snap. Speed and view: real time from the side, so the bulge and the launch both show. Fake: a clean
  shatter; rubber deforms and rebounds.
- Hollow or pressurised (an egg, an aerosol, a sealed bottle or pouch of liquid, a hollow ball, a steel
  ball bearing). Look: a tiny contact point takes all the load until it bursts or escapes; a sealed thing caves
  in or blows out, a bearing shoots sideways very fast, a can crumples then splits and sprays. Debris:
  the contents jet out, a bearing crosses the frame, shell bits scatter. Sound: a building hiss or
  groan, then a loud bang or pop and a spray. Speed and view: slow motion optional; a blast shield, when one appears, is clean and nearly invisible, and the picture stays bright and close, never scratched or murky. Fake: a
  gentle squash; pressurised things give way suddenly and violently.
- Wet-organic (grapes, a tomato, an orange, jelly, a water balloon, a watermelon). Look: the skin holds
  and dimples, then splits and juice and pulp burst out. Debris: juice and pulp spray to the sides and
  drop back; the skin lies flat in a puddle. Sound: a wet strained groan, a squelching split, a
  splashing gush. Speed and view: real time or slow motion on the splash, a little from the side. Fake:
  drying flat; wet things burst and splash.
- Surprising-resist (a thick magnet, tungsten, an anvil, a hardened steel block, a ceramic bearing, a
  glass teardrop). Look: the machine is the one struggling; the object holds while the press groans and shakes and the bed bends, then either the object squirts free or the press fails first. Debris: little or nothing comes off the object; perhaps a spark, a jolt, a jump of the ram; the object rolls off intact. Sound: a
  climbing strained whine, deep groaning metal, then a violent clang or crack from the press. Speed and
  view: the build in real time, the escape in slow motion, from the side. Fake: the object quietly going flat, when the whole idea is that it survives.

- Crayons are the genre's mascot and the material faked most often. At room temperature they are
  semi-hard wax, not paste: they bend, snap and break into waxy lumps and flakes, then pack into a
  cracked, flattened slab of many colours, the sticks destroyed and mixed, the colours unchanged.
  Smooth worms only come from genuinely soft material, heat or a perforated plate, and even then they
  are lumpy and matte. Crayons, boiled sweets, cold chocolate and dry soap all crack and then flatten, with no more than a little smear at the rim, never balloon noodles.
- The perforated "worm plate" variant (sparingly; soft clay, modelling dough, warm wax or soap only):
  the flat top platen is replaced by a thick steel plate drilled with round holes and the material is
  pushed up through them in strands. It is popular and also the quickest route to the fake gummy-worm look; write the strands lumpy, dull, of varying thickness, some ripping and sagging, the same volume as
  went in, never a neat crown of identical glossy sausages. The flat platen stays the default.

## Safe lane [4]

- Generic and legal: "a smartphone", "a can of soda", never a named brand (logos garble and infringe).
- No living creatures, real people, body parts or children. A fake-blood ballistic gel or a clay
  figure is the ceiling for any gore joke, kept cartoonish.
- Explosive and pressurised crushes stay a controlled workshop event behind a clear blast shield, never
  a how-to; never describe how to assemble anything dangerous.

## Duration [5]

The fewest whole seconds that reach fully crushed plus a beat of settle; bands guide, any whole number
that fits.

| Crush | Length | Beats | Paragraph |
|---|---|---|---|
| One quick satisfying failure (an ooze, a crumble, a flat disc; loops well) | 4-5 s | 2 (contact, then crush and settle) | about 1,700-2,100 characters |
| Standard (intact hold, slow descent, clear resistance, failure, settle) | 5-7 s | 3-4 | about 2,000-2,500 |
| An explosive payoff savoured in slow motion (shatter, burst, a bearing shooting out) | 6-8 s | 3-4, the failure stretched | about 2,300-2,700 |
| Two-stage surprise (it holds, the machine labours, and then one of them gives) | 7-9 s | 4-5, long anticipation | about 2,500-2,900 |

Slow motion costs seconds (a shatter that lasts a blink fills 3-4 s); count the ram's travel, not just
the words. Never pad a clean ooze or cram a two-stage resist into 4 s. The fixed opener and closer take
about 1,400 characters, so even the shortest prompt is well over 1,500 and the band differences live in
the beats and audio. Measured: four of the source's five worked prompts ran 3,056-3,240 characters (the
5 s crayon example included), over the ~3,000 guide; the cap is soft, and the fixed text is never cut
to meet it.

## Camera, staging and speed [6]

- Locked off, one unbroken take; the only allowed move is an almost imperceptible slow push, optional
  and rarely needed. No editing or film words (none of: zoom, dramatic angle, close-up, cinematic,
  angle on, pan, cut to).
- Close the gap, the lesson above all others: with a big gap the model skips the descent and lets the
  object destroy itself untouched (a vendor test: a bowling ball in a wide slow-motion shot sat for
  four seconds, then turned to dust with nothing touching it). Frame the two plates almost filling the
  picture, the ram touching the object or a hair above it. That framing phrase belongs inside the
  opener's angle slot, where it governs the whole render.
- One hero angle, by failure: low side three-quarter into the throat of the press for shatters, bursts,
  flattening and surprising-resist; top-down or high three-quarter for ooze, smear, crumble and the
  worm plate; a tight macro for satisfying detail as long as the object still reads as itself.
- One staging. Default: a worn safety-yellow frame with black guards (the look that tends to get the
  most views), but the platens and bed that do the crushing stay bare scuffed steel over an oil-stained
  bed: paint the frame, never the platens. Clean studio: large polished, scuffed, often round steel
  plates, a dark seamless background, bright even light, the object the only colour, centred and
  symmetrical; for soft, food, cosmetic and glossy satisfying objects; real scuffed metal, not a chrome
  render.
- Speed is a choice: real time is the base and the most reliable; slow motion only for the failure
  beat of an explosive result, applied to the crush, not the clip; even in slow motion debris falls.
  Never put slow motion on a dim, murky frame or a shot through a scuffed shield: it turns a shatter
  into a weightless hazy poof.

## Beats [7]

In strict order, filling the length (the press writer uses no "Beat one:" labels; the beats run as
sentences after the Setup):
1. The hold, well under a second: the viewer registers the object, nothing more. Dead air on a still
   object is where the model stops moving the ram and lets the object burst on its own.
2. Press and contact, early, over a short travel; name the contact ("the flat steel face meets the top
   of the ___").
3. Resistance (it may merge into contact for a quick ooze). The build-up deserves more words than the
   failure itself.
4. The ONE failure true to the material, in concrete physics verbs.
5. The completed stroke and a settle clause. A press that stops halfway is the one fake every viewer
   spots; a surprising-resist object survives, but the ram still bottoms out on bare steel.

Word craft: adverbs of inevitability (slowly, steadily, without hurry, unstoppably, under enormous
weight, grinding down); collision clauses (it holds a second too long, then bursts; it resists until
the instant it doesn't; cracks race across a heartbeat before it goes); one or two weighty verbs for
secondary debris; say the object keeps its shape, colour and identity until it fails. These words do
physics work: tonnes of steel, not a prop.

## Physics [8]

Written into the beats as verbs, never listed separately:
- The ram is seen pressing first; nothing happens before contact.
- The heavy ram travels one way only; plates stay rigid. Only an elastic object may kick the ram back
  up, and only a surprising-resist object may make the press groan, shudder and its bed flex.
- The failure matches the material class; one class.
- Debris is heavy and obeys gravity: write "breaks into heavy jagged chunks that drop and skitter",
  not "explodes into a cloud of dust"; a bearing leaves along a flat fast line, not a lazy arc; nothing
  floats, hangs or blinks out.
- Cause before effect: contact before crack, crack before shatter, pressure before burst.
- The settle is the strongest single realism cue and the loop point; always give it a clause.
- Identity and size stay constant until failure.
- Failure keeps volume and destroys tidy identity: debris never inflates or grows; hard things fracture
  and mix; soft things smear and merge; matte stays matte.

## Audio [9]

Write the sound as concrete events in the order they cause one another, starting "Audio:":
1. The machine: the pump's hum and rising whine.
2. The load: a groan, a creak.
3. The failure, the object's own sound by class: glass and ceramics crack sharply and crash into
   pattering fragments; metal crunches and crumples; soft matter squelches wetly; paper and wood crackle
   up to a splintering tear; granules crunch dryly and crumble; rubber creaks, then snaps or smacks;
   sealed things hiss up to a loud bang and spray; wet fruit splits with a squelch and splatters; a
   survivor makes the machine whine under strain and then clang violently.
4. The settle: fragments pattering, the pump easing off.

Voice: none by default (most crush clips are strongest without). Optionally one off-screen voice from
the workshop, dry and unhurried, with a generic Northern European accent in English, saying ONE short
line before or after the crush, never over it: a quiet set-up ({right, here we go}) or a flat aside
after ({hm... that was not the plan}). Twelve words at most, in braces, no other voices. Never name or
imitate a real channel, presenter or brand (HR17). No music in any mode; natural workshop levels; the
sound is recorded off the machine, not scored.

## Assembly [10]

One flowing paragraph, present tense, no names, about 3,000 characters at most, five sections:
1. Opener (`node $F frame press`, row `press/opener`), its two slots filled: the angle and speed
   clause (with the plates almost filling the frame) and the staging tells.
2. Setup (row `press/setup`): the still stage before anything moves, the object named exactly, its
   material in one clause (for example "a hollow steel bearing", "a soft wax crayon", "a brittle glass
   bottle"), the ram already in contact or a finger's width above.
3. The beats as sentences.
4. "Audio:" and the timeline.
5. Closer (row `press/closer`), used every time. It anchors the end on the ram reaching the bottom of
   its stroke rather than on the object being flat, so it stays true for a survivor, and it lists every
   honest outcome, holding out included, as the anti-morph clause.

`Duration: Ns` on the next line. Machines are covered in gauges, dials, warning labels and maker's
plates: all readable elements stay out of frame, and the ban sits in both opener and closer.

## Final checks [11]

- Paragraph and tag only.
- A single object, whole and centred at first, and at the end a full stroke of the ram (crushed flat,
  or the resistant object still whole); one class of material and one clean failure true to it.
- The gap closed: the plates fill most of the picture, the object squeezed in a narrow gap, the ram
  in contact or hovering a hair above; contact comes early, and the object breaks only where steel is
  pressing.
- A brightly lit, clear crush zone; a shatter sends heavy pieces dropping and skidding, never a
  weightless cloud; a blast shield only for objects that genuinely fly out, clean and transparent.
- The length gets the object completely crushed and leaves a beat to settle; the size suits the band.
- The medium declared as real filmed footage, never a render, simulation or cartoon; the staging dirty and scratched, never computer-clean, even for the studio look.
- The camera locked; speed chosen on purpose (real time normally; slow motion reserved for the moment
  an explosive object fails, with debris still falling).
- The ram heavy and one-way, never bouncing or springing; plates rigid; no morphing object.
- Debris falls under gravity and comes to rest; each motion has a cause you can see; a settle clause
  closes it.
- No inflation and no gummy worms: volume kept, soft matter smeared in irregular matte lobes, crayons
  fractured and flattened.
- Audio a causal timeline (pump, groan, the class's foley, settle), no music; no voice, or a single
  dry line from off-screen kept clear of the crush.
- Opener and closer close to frames.json; "Setup:" and "Audio:" present; the text, gauge and logo ban in both. - Written in the present tense and nameless; a generic object with no brand; no creatures, real people, children or
  real gore; no real channel or presenter imitated; nothing readable.

Variation: N variants are N blocks, each with its own length; follow-ups ("make it shatter", "another
object", "slow the crush", "studio look") return only the revised block.
