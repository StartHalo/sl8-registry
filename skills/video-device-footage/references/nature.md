# Nature and process b-roll writer

SL8 wording of the Everygen nature-clips prompt writer (`everygen/natureclips-341612`, no licence
stated, restated and cited). It writes one paragraph and, unlike its source, a `Duration: Ns` line
(5-10 s, default 6: the source gives no length, so the length is SL8's reading). SKILL.md generates.
Approach step numbers are in brackets. `$F` is the skill's `scripts/footage.mjs`.

## Contents
- [What the clip is](#what-the-clip-is)
- [Register and subject [3]](#register-and-subject-3)
- [Keeping the action renderable [3]](#keeping-the-action-renderable-3)
- [Safe lane [4]](#safe-lane-4)
- [Length [5]](#length-5)
- [The nine slots [6] to [10]](#the-nine-slots-6-to-10)
- [Final check [11]](#final-check-11)
- [Variation [16]](#variation-16)

## What the clip is

A single piece of b-roll for a fact-driven montage that is cut together from genuine found footage:
phone video, semi-pro "how it's made" shots, amateur dives and wildlife, scrappy clips from markets
and workshops. Every clip has to pass as something a real person shot and posted. The montage's
opening hook, its fast fact voiceover, its bold captions word by word and its satisfying music arrive
in a later edit that this skill does not make (SKILL.md step 17). So this clip has no lettering, no
voice and no score; at most quiet sound from the place itself, closing on "no music, no voice".

How the genre usually goes wrong: request a "nature documentary" and you get a glossy advert. A quick
test: could this shot sell a fragrance? Then it is wrong. If the image drifts toward commercial, make
the light flatter, the focus deeper and the setting dowdier. Don't overshoot into fake videotape,
heavy filters or glitch effects either; the aim is plain, modern consumer or semi-pro digital video.
Reference images the source aimed at: a farmer with a beard squinting in flat sunlight, phone in
hand; crabs crawling through a muddy paddy, filmed from the bank; a plastic tub weighed on a market
scale beneath a red banner; pink snail eggs scraped off wet concrete by hand; chickens pushing round a
feed pan in a concrete yard.

## Register and subject [3]

Registers (the header in slot 1 follows the choice):
- Creator or process, the default: harvesting, foraging, farming, how something is made, old methods,
  skilled work. Shot handheld on a phone or semi-pro camera, deep focus, someone's hands busy with the
  task in an actual workplace, flat daylight, lively digital colour, plain and informative.
- First-person amateur or action camera: pests, things found by hand, discoveries outdoors and in water. A close handheld or head-height view, focus deep, a touch wide, flat light, raw and genuine.
- Wildlife stock: odd or rare animals, sea life, insects, birds. Long-lens or action-camera wildlife
  footage, the animal crisp and only the distant background soft, natural light that is never dreamy,
  real wear on the animal; underwater turns greenish with drifting particles.
- Market or industry: markets, trade, boats, processing, goods sold by the million. A handheld phone on
  a busy real market or factory floor, deep focus, crates, scales and people, plain working light.
- Craft macro, rarely: a truly delicate artisan step or the reveal of a precious material. The one
  exception, with tighter framing, some shallow focus and kinder light, only when the subject really is
  tiny and intricate, never by default.

Pick by subject: people working take the creator register, animals take wildlife, trade takes market,
and craft macro is a deliberate rare choice. The format's signature image is hands working a material,
shown plainly; use it wherever the topic offers it.

Families and their staging:
- Strange animals (an axolotl, a mudskipper, a sunfish, a tardigrade, a coconut crab): seen where it
  lives, doing one slow thing, through a long lens.
- Invasive pests (cane toads, apple snail eggs, lanternflies): a hand discovering, scraping off or
  removing them, a first-person phone view, the pest as the bright accent.
- Where ordinary things come from (cork, cassava, latex, palm sugar, cinnamon bark, wasabi, sago): hands
  at one step of the raw process, deep focus.
- Precious natural materials (salt, pearls, saffron, agarwood, matsutake): the scraping, shaving or
  sorting that shows what it is worth, in busy hands or on a stall.
- Ingenious old methods (steppe ice stores, beetle traps for hen feed, ducks weeding a rice field):
  hands carrying out one contained step on site.
- Natural-material crafts (felt, lacquer, shell or bone inlay): an artisan's hands at one contained
  step; this family may take craft macro.
- Farm tricks (ducks in the fields, crabs in the paddies): hands or the animals doing the work.
For any kind of labour, a contained step in someone's hands is the default answer.

| The request gives | Do this |
|---|---|
| A fact | Keep it; pick the most watchable beat that can be sustained and render it as a single plain shot in deep focus |
| A topic or an object | Find the most striking contained beat in its family, preferring hands at work whenever there is one |
| "How X is made" | One tactile, contained step in someone's hands; never the moment a heavy thing is cut loose, drops or is lifted |
| Nothing, or a mood | Invent from a family, leaning to creator or process; never re-stage a known example |

When the obvious hero moment is a risky physics event (felling a tree, cutting a bunch loose, hauling a
load), slide to the contained moment just before or after. A request for something "cinematic" gets the
content it asked for and keeps the real look, which is why this format was chosen.

## Keeping the action renderable [3]

- Mid-flow, not the climax: show the middle of a repeating action so the first and last second look
  much alike, just further along. Bark peeling up under a blade works; a dropping branch does not.
  Sawing, not the fall; a strip being drawn off, never the moment it parts; stirring, not tipping out.
- Nothing heavy: whatever forces the model to fake weight, or to let go of something big, stiff
  or massive, floats and snaps (felling, chopping clean through, a bunch, log or branch breaking away,
  loads hoisted, carried or put down, things thrown, flipped, dropped, collapsing or shattering, a big
  splash). The classic failure: a bunch of bananas cut loose, which the model flips upside down while
  spinning the worker round. Where weight matters, it is already being held. Light things are safer (a
  fish, a knife, a strip of bark, some eggs, a stream of water).
- Contact spelt out: when a tool meets a material, say exactly where and how they meet, otherwise the geometry gets invented; choose actions whose contact is self-explanatory over ones that rely on expert knowledge.
- A visible person: frame the hands and forearms clearly, or the upper body next to the work. Someone
  hidden behind what they are holding has nothing to anchor them, and whatever sticks out morphs.
- Few moving parts: if the subject moves, the camera barely does. Two hands with a tool and one
  material is safe; hands, a tool, a heavy load breaking free and a hidden body is chaos.

Safe verbs: scraping, sifting, peeling, stirring, rinsing, carving, kneading, shaving, brushing,
dipping, threading, weaving, slicing something small, hand-sorting, turning a small object over; an
animal slowly feeding, grazing, swimming, perching or walking. Risky (skip it, or show it finished):
throwing, dropping, felling or chopping through, a coconut, branch or bunch cut loose, a tree coming
down, lifting or carrying something heavy, shattering, a fast strike, a big splash, an animal lunging
or leaping.

## Safe lane [4]

The family list is the lane: real, ordinary, harmless work and wildlife. A risky physics moment moves
to its contained neighbour, and a "cinematic" request keeps the real look. The SKILL.md safe-lane test
applies too (nobody real or named, no brands, nothing readable).

## Length [5]

SL8 adds the tag the source lacks: 5-10 s, as long as one mid-flow action needs, 6 s by default. Aim
for 900-1,500 characters; 1,900 is a hard ceiling (the vendor's pipeline refused anything longer, and a
short clip over-described pushes the model into extra actions and cuts). `$F check` fails a block over
1,900.

## The nine slots [6] to [10]

A single plain-text paragraph built from nine slots in a fixed order. Slots 1 and 9 come almost as-is
from frames.json; the middle is fresh each time. No section labels. `Duration: Ns` goes on the next
line.
1. Header, chosen by register (rows `nature/header-process`, `-pov`, `-wildlife`, `-market` with its
   place slot, `-macro`): it names a real device and deep focus at the very start. "Authentic" with a
   named phone, action camera or semi-pro camera steers the render to real uploads and brings deep
   focus, a fast shutter and a touch of over-sharpening along with it. Never a cinema camera, never
   "cinematic", "film look", "broadcast documentary camera" or "macro lens" (craft macro aside).
2. Subject and its one action: the precise species, material, tool or worker, and one present-tense
   action obeying the rules above (ongoing, contained, light, mid-flow, contact spelt out). Only one.
3. Shot and framing: the scale (a wide, a medium, a close handheld, a first-person view over the hands)
   and a plain, practical angle, the way a person shows you something on their phone. Repeat deep focus
   here unless it is wildlife (adapt row `nature/focus`). Keep the person visible. Slightly careless
   framing (subject off-centre, a hand entering from a side, a tilted horizon) looks real; a perfectly
   balanced picture looks like an advert.
4. Place: one real, everyday, slightly cluttered workplace with its materials named and three to five
   boring details behind. Regional detail (a flooded paddy, a wasabi terrace in Japan, a wet market in
   China, a plantation in South-East Asia) makes it read as real. Plain, a little untidy, mostly dull;
   never a beauty-spot view, a neat studio or a dim moody set.
5. Light, plain and honest, suited to the place: flat overcast, harsh midday sun slightly blown with hard
   shadows, cool even shade, ordinary daylight through an open shed door. No sunset glow, no moody window
   light across the scene (craft macro aside), nothing theatrical or graded. After deep focus, flat
   everyday light is the strongest realism lever.
6. Camera: one simple move a real person holding the camera would make, and almost no movement if the
   subject moves: a little natural shake while staying on the hands, a wobbly slow creep toward the
   work, a loose follow of the tool that catches up late, or for wildlife the long lens staying on the
   animal and drifting a little to keep it in frame. Never a stabiliser glide, a drone shot or a whip pan.
7. Texture and colour: pile up real surface detail and repeat the digital look. The mess belongs to the
   subject and the place (worn tools, dirt, clutter, wear; give animals real damage, such as a torn
   fin, muddy legs, algae on a shell or a scratched claw, because generated animals come out perfect and
   shiny). The recording itself is real digital video (focus deep, a fast shutter, light compression and
   over-sharpening), never film grain, a grade or bokeh. Colour: true to life with a little punch, the slightly contrasty, saturated quality of recent phone video, neither a muted film grade nor glowing candy.
8. Sound: quiet and from the scene, then voice and music explicitly turned off (for example only the
   sound of the place: the blade scraping, insects, birds far off; then no music, no voice). The montage adds
   its own narration and music later.
9. Closer (row `nature/closer`; for wildlife `nature/closer-wildlife`, which drops the shallow-focus ban
   because a long lens should separate the animal). Its bans on shallow focus, the cinematic look and
   colour grading carry the weight: they are what stop the slide into advertising.

Advert words never appear: cinematic, cinema camera, film look, 4K, 8K, HDR, epic, breathtaking,
masterful (`$F check` fails them unless negated).

Deep focus matters more than anything else: leaving it out is why the source's earlier batch looked
like adverts, and shallow focus by default is the strongest sign of a generated advert. Two
exceptions: wildlife (the animal crisp, only the distant background soft, never dreamy) and the rare
craft macro.

## Final check [11]

Before replying, one pass: a header naming a real device and deep focus, no cinema words; a single specific subject doing a single sustainable action caught mid-flow, nothing heavy breaking off or finishing, the
person visible; a plain, practical angle in deep focus (or, wildlife only, a long lens softening just the
distant background); a real, ordinary, slightly cluttered place, not a view or a neat set; flat, honest
light, no sunset glow or moodiness; one simple handheld move that genuinely shakes, no stabiliser or drone;
real texture and lively natural digital colour, no grade or bokeh; sound from the place, ending "no music, no voice"; then the closer, with its bans on shallow focus, the cinematic look and grading, plus the
full ban on text; a single real-time take without cuts; 900 to 1,500 characters (1,900 at most); and
the reply holding only the paragraph and its tag.

## Variation [16]

A montage of look-alike clips reads as generated. Vary the register, the family, the shot size, the
region and culture, the kind of flat light (hard sun, overcast, shade), and hands against animals
against markets, and change the colour accent (pink snail eggs, white latex, orange sea-urchin roe, a
red tub). Only the slot 1 headers and the slot 9 closer repeat; never re-stage a known example. Several
prompts are separate paragraphs, each with its own tag, divided by one blank line.
