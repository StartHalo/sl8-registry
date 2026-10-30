# Courtroom camera writer (comedy)

SL8 wording of the Everygen courtroom-video prompt writer (`everygen/aicourtvideos-8f0346`, no
licence stated, restated and cited). It writes one paragraph and its `Duration: Ns` line; SKILL.md
generates. Approach step numbers are in brackets. `$F` is the skill's `scripts/footage.mjs`.

## Contents
- [The form](#the-form)
- [Situation [3]](#situation-3)
- [Casting and safe lane [4]](#casting-and-safe-lane-4)
- [Duration [5]](#duration-5)
- [Camera and depth [6]](#camera-and-depth-6)
- [Beats [7]](#beats-7)
- [Physics [8]](#physics-8)
- [Dialogue and audio [9]](#dialogue-and-audio-9)
- [Assembly [10]](#assembly-10)
- [Final checks and traps [11]](#final-checks-and-traps-11)

## The form

The genre: a dull court session, interrupted for a moment by somebody's harmless silliness, then
resuming as if nothing happened. Four things carry it:
1. The camera: high in a corner, bolted, wide, motionless for the entire take. Its total lack of
   interest is the straight man; the whole room is its stage.
2. Believable physics: weight, gravity, things coming to rest. A wide static view exposes any motion
   that feels off.
3. Sound like a recording: mics that sound cheap and thin, foley in order, a written-in moment of
   silence, and the gallery's laughter as the loudest and final sound (what makes people replay it).
4. Underplaying: no shouting judge, no mugging, an institution that shrugs and continues.

Words earn their place by serving the joke, the realism or the physics; drop the rest.

## Situation [3]

| The request gives | Do this |
|---|---|
| A complete premise | Keep it, make the irony sharper, and say which mechanism below it is |
| A subject or object | Choose the mechanism that makes that object betray whoever owns it |
| A character type | One flaw, and a single moment where that flaw blows up |
| A line the judge should say | Work backwards from it to the scene |
| Nothing, or a mood | Invent something fresh from the mechanisms. Known set pieces are off limits (a stolen jacket worn to the hearing, a chair going over mid-lecture, a shouted objection, the man who drove himself to his driving case), and so are their punchlines |

Mechanisms and the shape of each payoff:
- Caught by his own prop: the evidence of a small offence is on the fool or in his hands, and everyone
  else clocks it before he does. Payoff: realisation creeping over him, then a cover-up gesture that
  covers nothing.
- Caught by his own answer: a routine question, an answer that convicts him, delivered with pride.
  Payoff: that one sentence, then a room that stops moving.
- Furniture rebels: a chair, a cart, an easel, a cup or a lectern follows physics just when it
  hurts most. Payoff: the slide, tip or crash, then a dignified reset.
- The creeping object: something keeps going wrong slowly (a chair turning, an easel tilting, a cart
  rolling), the owner never notices, and a bailiff keeps handling it as if that were his job.
  Payoff: in the end the bailiff just stands there holding it.
- Learned from TV: courtroom theatrics from television that real courts never see. Payoff: total
  stillness, then the judge correcting it literally.
- Tedium: sleep, fidgeting or wandering attention wins out in front of everyone. Payoff: the
  involuntary act, magnified by the formality.
- Doing exactly what was said: an instruction obeyed to the letter and wrongly. Payoff: the judge
  repeats it with the word that was missing.

Keep the payoff to a single visible action or a single short line. Anything that depends on the model
inventing an exact sound (a particular song or ringtone, speaker feedback, a snore, an animal noise)
breaks easily at this length; a jacket, a chair, one shouted word hold up. A long walk across the
room can build anticipation, but the payoff itself is one clean physical event.

## Casting and safe lane [4]

- Who plays the fool: a defendant or witness, sometimes the lawyer; never the judge and never anyone
  facing something serious. The offence is minor and faintly absurd, mentioned in one clause or not at
  all. A crime that has a real victim ends the comedy.
- One reactor at least (the fool's counsel, the bailiff, the clerk) sees it coming or takes the hit;
  that understated reaction is the second laugh and often the larger one.
- The judge stands for the institution: one adjective (tired, patient, stern, unimpressed), never
  shouts or laughs, says the punchline flatly into the mic, and moves on.
- Outcomes stay harmless: nothing worse than a pratfall; whoever goes down gets up, dusts off, and the
  session continues. No injuries, weapons, comedy cuffing or children.
- Nobody real and no celebrity look-alikes, no actual places, no brands, no legible writing anywhere.
  The joke is about what someone does, never who they are: nothing aimed at a group or an accent.
- Wardrobe: one plain item per person (a hoodie, a polo, a sweater vest, a creased suit, a new shirt
  still stiff from the packet); the lawyer always wears gray and plays it straight. A prop that carries
  the joke should be bold enough for a thumbnail, and its description should already wink at the
  irony ("worn with pride", "plainly the only one in existence"). That prop is the one loud thing;
  everything else is muted.
- Decide each speaker's gender before the audio and keep it in the voice tags: unprompted, the audio
  model assigns gender at random, and a mismatched voice ruins the illusion fastest.
- The source's examples always cast an older woman as judge; vary it.

## Duration [5]

Length follows the joke. Choose the fewest seconds that give the build-up room and let the final
laugh play out completely; if unsure, take the longer (a truncated laugh sinks the clip).

| How big the premise is | Length | Beats | Paragraph |
|---|---|---|---|
| A single silent or near-silent gag | 4-5 s | 2 (setup, then payoff with the laugh) | about 600-1,000 characters |
| Standard: a plea or a self-own, one dry line from the bench, one reactor | 6-8 s | 3-4 | about 1,200-2,000 |
| An escalation in two steps (the prop fails twice, an exchange, two reactors) | 9-12 s | 4-5, a longer build | about 2,000-2,800 |

Speech adds seconds; a gag without words can be tiny. Walking and travel take time even when they
take few words, so count the motion. Don't stretch a thin idea or squeeze a two-step escalation into
4 s. Bands guide; any whole second that fits is allowed. Measured: the source's 4 s and 6 s examples
ran 1,540 and 2,093 characters, over their bands, because the fixed opener and closer take room;
never shorten the fixed text to fit a band.

## Camera and depth [6]

- A single courtroom security camera up in a corner, slightly wide, never moving, one continuous take,
  no drift. Keep editing and camera words out entirely (zoom, pan, cut to, we see, close-up, angle on).
- The fixed view suits jokes that need the whole room (paths across the floor, furniture on the move,
  the distance between people, a slow drift), and it suits a spoken joke too: the line comes over the
  mic and everyone in view goes still together. Put the action mid-room in plain sight, never in a
  corner or turned from the lens.
- Build depth or the corner view flattens and people seem stacked. Three layers: at the back, the
  bench, raised and pushed back, the judge sitting high and looking out; in the middle, bare floor;
  in front, the fool and the tables, lower and closer, turned toward the bench. Keep people apart both
  vertically and in depth; nobody sits right behind someone at the same height.
- This writer only makes the fixed-camera version: a request for handheld or phone footage still gets
  the corner camera.

## Beats [7]

Number them ("Beat one: ... Beat two: ..."); in a fixed frame only people and objects move, so order is
choreography. Two beats for 4-5 s (normal and build merged), 3-4 for 6-8 s, 4-5 for 9-12 s with a
second escalation. The full arc:
1. Normal: business as usual (a charge read aloud, a lecture, routine questions) with the joke's seed
   sitting in view.
2. Build: a reactor senses it before it happens (the bailiff leaving the wall at a slow, knowing pace,
   the lawyer's head starting to swivel, something starting to lean). The build gets more words than
   the payoff; half the fun is the audience seeing it coming.
3. Payoff: the event in hard physical verbs, or the one damning sentence; side objects get verbs too
   (a cup jumping off the table, papers fanning out, a board smacking the carpet).
4. Reset: reactions arrive, the fool makes one small attempt at dignity (sets the chair upright, fixes
   the tie, lowers himself into the seat with exaggerated care) and proceedings resume.

Craft:
- Time the comedy with near-collisions ("one step ahead of the bailiff", "just a second late",
  "talking over his own lawyer"), never with clock times.
- Reactions are slow, quiet and physical, never spoken: a palm pulled slowly down a face, a head laid
  on the desk, glasses lifted off with two fingers, a bailiff sorting the problem out with the air of
  someone who saw this coming. Words like "slowly" belong to reactors; quick reactions look staged.
- No more than one dry aside in the paragraph; two break the documentary tone.

## Physics [8]

The static wide shot reveals every false motion, so put the physics into the beats' verbs (skids,
tips, wobbles, goes over, smacks, rattles, rolls, slows, settles):
- Mass: say how heavy each thing is. Heavy items (an easel, a full pitcher, a pile of binders) start
  slowly and gather speed; light ones (sheets of paper, a tie, a paper cup) flutter. A chair going over
  pivots on its rear legs and accelerates; no snapping flat, no hopping.
- Falling: straight down, land, stay put. A board that drops hits once and lies still; nothing floats
  up or hangs in the air, and only rubber bounces.
- Trigger first: put the cause one clause ahead of the motion (a nudge, a lean past the balance point,
  a shove, a wheel snagging on a seam).
- Real contact: hands close on what they grab, a caught board stops in the palm, no one goes through a
  table, rail or person, feet and chair legs keep their weight on the floor. Say when contact happens.
- Coming to rest: one clause for it (the board rocks and lies flat, paper stills, the cart rolls to a
  stop, a gate swings back once).
- Balance: someone falling flails, reaches for something, then either catches themselves or goes over
  in one unbroken movement; bodies keep their size and shape.
- One event for the payoff: long chain reactions don't render.

## Dialogue and audio [9]

- The bench gets one flat line, ten words or fewer, through the mic, as the last or nearly last
  sound. Four shapes work: the obvious, asked as a question; court procedure calmly applied to the
  nonsense; handing the problem to the bailiff; fixing one wrong word. Write a fresh one every time;
  the format's known lines are used up.
- The fool may answer once, five words or fewer: an excuse that explains nothing.
- Spoken lines sit in single quotes and only these two people speak them. Each carries a gender and
  register in its attribution (for example 'the judge, flat over the mic, an older man:'), matching
  the casting.

Audio is written as events in the order they happen. Slots:
1. Bed: the hum of a quiet room with low murmuring under it.
2. Official voices, always through equipment and tagged with gender ("the clerk over a tinny mic, a
   young woman"). "Tinny" does most of the work: it makes speech sound recorded.
3. Payoff foley as named sounds with physics, in the order things move (a chair scraping, a hand
   slapping wood, a skid and a heavy wooden crash, a cup rattling, a squeaky wheel, paper sliding,
   the sound of things settling).
4. The silence: a moment of complete silence written in just before the punchline; it is the room
   catching on.
5. The judge's line with its gendered attribution, then the fool's little answer in his own voice.
6. Release: the gallery gasps, then laughter spreads.
7. Close: the gavel knocks for order while the laugh is still going. A small early leak (one stifled
   snort) is fine; real rooms crack unevenly.

As in the source, this Audio block does not say "no music" and the closer has no music ban; if the
first runs show a score, SKILL.md step 15 records it.

## Assembly [10]

One flowing paragraph, present tense, no names, about 3,000 characters at most, five sections:
1. Opener (`node $F frame courtroom`, row `courtroom/opener`), near verbatim. "Grainy" stays the first
   word: it steers the render away from film. Keep its bans on timestamps and interface even when
   trimming. Flaws get gentle adjectives (slightly wide, a little noise, dull color); exaggerated
   flaws look like a filter; the only absolute is the frame that never moves.
2. Geography (row `courtroom/geography`) with its slots filled: the small wood-paneled room every time
   (small keeps everyone in frame, wood panelling reads as any courtroom, and the sameness makes the
   clips one channel), the depth words kept, any case detail in one clause. Name plates are there but
   unreadable; boards are empty.
3. The numbered beats, keeping depth (people appeal across the gap up to the raised bench).
4. "Audio:" and the slots, every quoted line with its gender tag.
5. Closer (row `courtroom/closer`).

`Duration: Ns` follows alone on the next line. Never call the joke funny, epic, viral or comedy;
stage it.

## Final checks and traps [11]

Checks:
- Only the paragraph and the tag; the length suits the joke and the last laugh plays out; the size
  suits the band.
- A premise you can state in a sentence, readable from the fixed view; a payoff of one action or
  line; order restored at the end.
- The corner camera never moves, one take, no camera or editing words; the bans in opener and closer
  still there.
- Depth: the bench high and at the back with the judge looking out over open floor, the fool closer
  and turned toward it.
- Every quoted line has a gender tag; the bench line is flat, ten words or fewer, one of the four
  shapes; a reactor sees the joke coming or takes it.
- Mass, falling, contact and coming to rest; every motion caused; one clean payoff event.
- Audio in event order with the silence beat, the gavel ending it inside the laugh.
- Present tense, single quotes, no length or setting words, and nothing named, branded, placed,
  underage or legible.

Traps: two jokes, two rooms or a side plot; a length forced up or down; a laugh cut short; flat,
stacked staging; an untagged voice; any camera motion or film word (slow motion, cut, cinematic,
close-up, shallow focus, dramatic light, flare); broken physics; a payoff that relies on an exact
invented sound; a judge who shouts, laughs, bangs the gavel hard or lectures; names, brands, places,
dates or writing; a child, a victim, a serious charge, a real injury, humour at a group's expense;
two asides or stacked adjectives; a recycled punchline; length or settings in the paragraph; running
on after the laughter fades.

Variation: N variants each get their own fitting length; rotate mechanism, cast, prop and the shape
of the judge's line.
