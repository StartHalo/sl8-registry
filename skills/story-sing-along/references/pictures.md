# Pictures: look, cast, shots and clips

SL8's restatement of the pacing and style method in the Everygen nursery-rhymes pack, as the
capability assessment recorded it (WF46-a1-s1 steps 9-14; fine points `everygen/nurseryrhymes-fcc8ba#45-#97`).
The vendor tuned its wording on GPT Image 2 and Seedance 2.5; nothing here has been run on
`openai/gpt-image-2`, `bytedance/seedance-2.0/image-to-video` or the way-B routes. Prompt templates
are in `prompts.json`.

## Contents
- [Shots: one per sung line](#shots-one-per-sung-line)
- [Clips](#clips)
- [The look](#the-look)
- [Setting and light](#setting-and-light)
- [Hero, side characters, set](#hero-side-characters-set)
- [Character sheet and start frames](#character-sheet-and-start-frames)
- [Clip prompts](#clip-prompts)
- [QC before the stitch](#qc-before-the-stitch)
- [Run log: symptom and fix](#run-log-symptom-and-fix)

## Shots: one per sung line

Pacing evidence (vendor analysis of 96 top videos, #48-#55): median shot 3.1 s (chants 1-2 s,
lullabies and dance loops 4-10 s); 81% of shots locked off; the cut lands on the sung line; the first
frame already moves; the payoff comes in the last 20%.
1. One shot per sung line. Split a line that holds two actions; merge two lines only in a lullaby or
   when both describe one continuing action.
2. The verse template: a wide establishing shot (4-5 s) on the verse's first line, two to four literal
   close-ups (1-3 s) of the verb, a gag or payoff on the last line, a wide travel shot over an
   instrumental break. The next verse repeats it with a new verb.
3. Shots of 1-5 s, most 2-3 s (lullaby 3-6 s), summing to the song within 0.25 s; the last shot
   absorbs the difference (`sing.py shots --fix-last`).
4. Sound-off test: the picture alone tells the lyric ("the wipers go swish" is wipers filling the frame).
5. The hook: the first frame is mid-action and acts out line 1; never an empty establishing shot or a
   title card.
6. One small gag or surprise on each verse's last line.
7. The last shot rhymes with the first (same framing) so the video loops.
8. A cut is never another angle of the same moment, a reaction nobody sings, or a thing the lyric
   does not name. Each cut changes the framing: `framing` is a size and a subject, "wide", "medium",
   "close" or "extreme close", then " · " and what is in it ("close · wipers"). Two close-ups
   in a row are fine when the subject differs; the same string twice in a row fails, across clips too.
   The last shot's size equals shot 1's (the loop).
9. Camera locked off or one simple move (push in on a reveal, track for travel, pull back on the last
   line); the character's action carries the motion.
10. Usual counts: 7-9 shots for 20 s, 10-12 for 30 s, 18-22 for 60 s, lullabies about half. A check,
    not a quota.

`shotplan.json`: `{"clips":[{"id":"clip01","file":"<clip path, step 14>","shots":[{"seconds":4.3,
"framing":"wide · pond","see":"<a few plain words>","row":"<the shot row>","camera":"locked",
"kind":"intro|gap|end","after":"<way B only: what the hero does after the action>","replace":"<way B
file, step 13>"}]}]}`. Required per shot: `seconds`, `framing`, `see`, `row`. `kind` marks a shot that
spans an intro, gap or end row (its length may leave the 1-5 s range with a warning); `camera`
defaults to locked; the rest are optional. **Shot 1 spans the intro bar plus line 1, the last shot
the last line plus the end row** (a long end row gets its own `"kind":"end"` shot), so a plan that
gives each line one bar of picture is short by those two bars and `shots` fails. `sing.py shots
--write` adds `start_s`, `clip_t`, `length_s` and `render_s` to the file.

## Clips

Way A (default): the shots are grouped into clips of one verse, or 8-15 s (8-10 s when timing matters
most); each clip is one image-to-video call with timed rows and hard cuts inside it, and starts on a
sung line. Seedance 2.0 caps a clip at 15 s, so a song of 30 s is at least two clips. The render
length is the clip's length rounded up to a whole second, at least 4 (`render_s`).

Way B (a customer-named model, a shot that drifted, or cuts that missed): one call per shot with the
one-shot template; the render is the shot length rounded up to the route's allowed duration (Kling
v3 pro `"3"`-`"15"`, MiniMax H3 integer 5-15), so 3-5 s shots waste least.

Trimming (#60): trim from the end only; the important moment is early and the last half-second is
aftermath. A shot shorter than a route's minimum is written so its action finishes inside its
planned length and then holds.

## The look

Bright, glossy 3D cartoon for toddlers (premium children's TV 3D, soft rounded shapes, toy-like
glossy materials, big friendly eyes, squash and stretch). Soft even light; faces never in shadow.
Saturated primaries with one hero colour the eye tracks. One storybook set, fully dressed. One hero
plus exactly two side characters, each one bold flat colour, exactly the cast named. No text, letters,
numbers or logos in any frame: captions are added at the end (#80-#83, #88).

Real speed (#61): never write "slowly", "gently" or "gradually" for the hero's action (the model makes
slow motion); the camera may move slowly. Squash and stretch (enrichment, `everygen/animated-421cf1#13`):
full squash and stretch for baby animals and toddlers; limbs never stretch past a joint and faces keep
their shape; adult humans get none.

## Setting and light

Pick one row; its setting and light fill the `look-lock` template for the whole run. The night row is
for bedtime and lullabies only. A new row copies a listed row's grammar and changes only the place and
light words. The vendor's exact light phrases were its proven wording; ours restate them, untested.

| Setting | Light |
|---|---|
| lily pond | warm sun under a bright candy-blue sky |
| bakery kitchen (interior) | honey-gold light through a round window, plus the indoor-light clause |
| beach and tide pool | sparkling golden seaside sun, candy-blue sky |
| woodland clearing | bright sunny daylight, wide candy-blue sky |
| village street after rain | bright silvery daylight, a rainbow over the roofs |
| flower meadow | warm sun under a candy-blue sky |
| night sky (lullaby only) | glowing moonlight in deep indigo and warm gold |
| ocean surface | sparkling sun on turquoise water, candy-blue sky |
| playroom (interior) | sunny daylight through a big round window, plus the indoor-light clause |
| bamboo grove | bright dappled sunlight, candy-blue sky |
| farmyard | warm sun under a candy-blue sky |
| snowy village lane | crisp bright daylight on fresh snow, candy-blue sky |

## Hero, side characters, set

- **Hero** (#84-#87): a round baby animal with one texture word, one colour word and two body features
  that make the species unmistakable (`hero-clause`). Choose a species whose baby form is what the
  model draws for its name: safe are duckling, chick, piglet, hedgehog, panda cub, koala, hamster,
  fawn, turtle, crab, bumblebee, whale calf, owlet, squirrel, fox cub, polar bear cub, red panda,
  camel calf; expect to swap lion, tiger, wolf, bear, horse, eagle, shark, gorilla, tusked elephant.
  Never fix a wrong species with a negative: swap it. A blob is fixed by naming body parts. The hero
  never leaves the frame or turns its back; its face turns to camera on the beat.
- **Side characters**: exactly two, each with its own reaction tied to a beat (`side-characters`), in
  the same words in every prompt; no sheet.
- **Set**: filled edge to edge, never minimal and never just sky; three or four props named, at least
  one smiling, then named again inside the action (`prop-pin`). Interiors get the `indoor-light` clause.
- **Camera** (`camera`): one move at hero height with a light bob, or locked; never two named moves.

## Character sheet and start frames

- **Sheet** (step 10): one image from `character-sheet` before any video, 16:9; then the hero line,
  4-6 words that lock the design ("caramel puppy, red rain boots, curly tail"), pasted into every
  prompt. Check: four panels, one design, no letters; one redo changing only what failed.
- **Start frames** (step 11): one per clip from `start-frame`: the look lock, the hero clause and line,
  the set in the same words as every other frame, the prop pin, then the clip's first shot caught
  mid-move. References, in this order: the sheet (Image 1), and from clip 2 on, clip 1's frame
  (Image 2); the template says which is which, so the model draws one scene and not the four panels.
  Name each "Clip N - what it shows". Check: same hero design, exact cast, no letters, mid-action; one redo.
  The video call then takes only the frame, never the sheet again.

## Clip prompts

`state.json` keys it needs: `look_lock` (the look-lock sentence), `set_sentence` (the set, in the same
words as the frames), `prop_pin`, `cast` (hero clause and the two side characters), `performance` (one
line on how the hero moves for the whole clip); optional `sky_pin`, `bpm`. A way-B shot needs only
`look_lock`. A missing key exits 1 and names it.

`sing.py clip-prompt` assembles header, timed rows, sound line and closer, and refuses: over 2,500
characters, a quoted lyric (four lyric words in a row), quotation marks in a row, and "slowly",
"gently" or "gradually" in a row. Before running it, check by reading (#62-#65, #93-#96):
- one row per shot, the same count as the plan; framing alternates;
- each row names who is on screen and how many (in a countdown, the number left);
- each row is two or three short sentences a camera could film; "five ducklings glide in a row" is
  a caption, not a shot;
- the lyric's nouns and verbs are acted out, never quoted (a quoted line gets sung or written on screen);
- say what is in frame; the closer is the only "no" line;
- a repeated accent spells its pattern twice ("tap, tap, bonk; tap, tap, bonk") and ties each accent
  to a named object; the accent never eats the shot;
- "[hero] is already in frame on the first frame of this shot" where a shot must open on the hero.

## QC before the stitch

For every clip (step 13), extract frames at 2 fps and look at them; record what each frame shows,
never "pass":
- the same hero design in every shot, and the exact number of characters;
- no text or letters baked in;
- the action acts out that moment's lyric at real speed; no empty frames;
- automatic rejects: a twin hero, a void background, three characters lined up facing camera.
Then `sing.py cutcheck` (step 13): scene detection finds where the model really cut and compares it
with each shot's planned time within 0.3 s; a missed cut goes to way B, and the offsets are kept in
`qc/cuts01.json`. You cannot hear the clip and never claim to have watched it play; frames are the
evidence (#126).

## Run log: symptom and fix

| Seen | Cause | Fix that worked for the vendor |
|---|---|---|
| set drifted out of frame, beats unreadable, faint glyph in the sky | empty backdrop, unnamed struck objects | props named again and pinned; each tap tied to a named object; the sky pin |
| room lit dusky brown | vague light words for an interior | stated daylight through a window, the no-deep-shadow clause, named wall colours |
| the accent action took two thirds of the clip | accent written as the main action | one repeated action, the accent kept to the accent |
| a spotted blob instead of a fawn | anatomy not named | slim legs, four separate hooves, a slender neck, a spotted back |
| empty ice and flat sky, faceless hero | set too far from camera | set pulled into the near foreground; face to camera on every beat |
| an adult lion twice | the model's prior for the name | negatives failed; the species was swapped to a panda cub |

Two failures with the same named defect is a block, not bad luck: change the species or the action,
not the wording.
