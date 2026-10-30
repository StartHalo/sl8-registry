# Song craft and the timeline

SL8's restatement of the song method in the Everygen nursery-rhymes pack, as the capability
assessment recorded it (WF46-a1-s1; fine points `everygen/nurseryrhymes-fcc8ba#1-#47`). The vendor's
numbers were measured on its own route (lyria-3-clip, lyria-3.5); none has been measured on
`fal-ai/lyria3/pro` or `fal-ai/minimax-music/v2.6`. Read this file at step 3 and again at step 7.

## Contents
- [Song rules](#song-rules)
- [Length: count lines](#length-count-lines)
- [The rhyme formula](#the-rhyme-formula)
- [Final check before the song](#final-check-before-the-song)
- [Templates and classics](#templates-and-classics)
- [What the music filter blocks](#what-the-music-filter-blocks)
- [The timeline](#the-timeline)
- [Lessons from failed lyrics](#lessons-from-failed-lyrics)

## Song rules

From the vendor's scene-by-scene analysis of 96 top 3D nursery videos (fine points #25-#28):
- Singing begins within the first second; the instrumental intro is one bar at most.
- One hook line comes back: at the start, the middle (songs over 30 s) and the end.
- Short lines: four beats, at most eight syllables, one action verb each, because every line
  becomes one shot that acts it out.
- Words a two-year-old hears every day. A word a parent would have to explain (glide, reeds, skim,
  shore, flock) is swapped for the plain one.
- One sound word (splash, quack, choo, honk), the real sound of the hero or the action, in the same
  slot of every verse and once per verse. It becomes the close-up and a sound inside the song.
- Every verse follows one pattern so one tune carries them all; catchy beats clever.
- Tempo: 115-125 BPM for action songs and vehicles (default 120), 85-95 for lullabies (92),
  125-130 for dance songs (128). One bar = 240 / BPM seconds: 2.0 s at 120, 2.6 s at 92, 1.875 s at 128.

## Length: count lines

Music models miss "30 seconds" but can sing an exact number of lines. Pick a length row, then write
exactly that many four-beat lines. `sing.py plan` refuses a count that is in no row (unless
`--free-length`, when the customer named the count) and a plan over 60 s. It also refuses a blocked
phrase and a last line that is not line 1; when the customer's own words need either, pass
`--waive blocked` or `--waive open-ending` (and `--waive length` for a count in no row): the waiver is
written into the timeline and its text goes into the manifest `waivers` (HR20). Those checks stay
defaults for words the agent writes.

| About | 120 BPM | 92 BPM | 128 BPM |
|---|---|---|---|
| 15 s | 6 | 5 | 7 |
| 20 s | 8 | 6 | 9 |
| 25 s | 10 | 8 | 11 |
| 30 s (default) | 12 | 10 | 14 |
| 40 s | 16 | 13 | 18 |
| 60 s | 24 | 20 | 27 |

Add one intro bar and one closing bar: 12 lines at 120 BPM plan 28 s. The timed rows are compact (a
start time, then the words), so 24 lines at 120 BPM make a prompt near 1,450 characters; real lyrics of
30-40 characters per line run longer, and the prompt then warns at 1,500 (the vendor saw more blocks
above it) and fails only at 4,500, under the route's limit. Long prompts are a risk to watch, not a
stop (STO-L401 holds the measurement). Thirty seconds at 120 BPM is
about 70-80 words. Songs planned over 60 s were blocked far more often (30% against 11%, #18).

## The rhyme formula

Twelve rules distilled by the vendor from 175 classic rhymes (#29-#36). The words are always new.
1. **Line 1 is the title and the hook**, with a sound device: a doubled word, a rhyming-pair name,
   alliteration or a nonsense ride. It plays in the first two seconds, so it is the most fun line,
   never a calm label.
2. **One engine**: micro-story (who, does, oops, happy fix); swap (a fixed frame, one word changes per
   verse); countdown (five to none, one leaves per verse, a twist at none); list or count-up (two items
   per rhyming couplet, each with its own action); action (moves the child copies); call and response;
   lullaby (slow, hushed, a promise; 85-95 BPM); cumulative (each verse adds one and repeats the chain).
3. **The verse frame**: write the verse with blanks before writing any verse. Every verse fills only
   the blanks; each line keeps the syllable count of the same line in every other verse (plus or
   minus one), so one melody fits them all. A verse that needs another shape is another song.
4. **The chant line**: an engine with verses gives each verse one line that stays the same except the
   number or item and holds the sound word. Every other line is new, with its own verb.
5. **Meter**: four beats, eight syllables or fewer, mostly one-syllable words; start on the beat and
   end on a stressed one-syllable word.
6. **Rhyme**: AABB, or lines 2 and 4. Exact rhymes on two different words (same vowel, same last
   sound); near rhymes fail (shore and two, alone and home). In a countdown the action line rhymes
   with the next number. Never twist word order or use nonsense to force a rhyme.
7. **Actions a toddler can copy or laugh at** (splash, jump, spin, stomp, sneeze, wiggle); never a still
   verb (wait, sit, stay, stand) or a sad one (alone, cry, lost, gone) as a line's action.
8. **One place, one cast** unless the song is a trip; never add a character or object late for a rhyme.
9. **Repeat**: the chant line plus at least one echo, triple or refrain; the last line is line 1.
10. **The sound word** in the chant line's slot, once per verse; a count-up puts it in the hook.
11. **The twist**: the last verse flips one small, mild, happy thing and ends with everyone together.
12. **Kid-safe**: no brands, real people, weapons, injury or scary threat.

A countdown's numbers add up: each verse opens on how many are left and one leaves in plain words;
never "three more" or a skipped number.

## Final check before the song

Run `sing.py plan` (line count, length, last line = line 1, blocked phrases, bare number lists, a
rough syllable estimate), then read the lyrics once against the formula: one engine; the frame
written and every verse fitting it; one chant line per verse with the sound word; toddler words;
copyable verbs; every line makes sense said aloud; one place and cast; countdown numbers add up;
exact rhymes on different words; no two action lines that differ by one word; kid-safe. Then sing
verse 1 and the last verse to one tune in your head: a line that does not fit, or a song that sounds
like a list, is rewritten.

## Templates and classics

The vendor's eight song templates (#129-#130): T1 verse song; T2 countdown; T3 list or count-up; T4
call and response; T5 action or dance; T6 micro-story with the gag in the last 20%; T7 lullaby (3-6 s
shots, the light dims); T8 cumulative. Its 30 worked examples map a short request to a template, a
hook, a hero, a set, a gag and a line count; they show the range and are never copied.

A classic the customer names gives the **theme and the engine only** (#9, #39, #40): its lines, title
and catchphrases never go in the lyrics or the prompt, and the brief carries the `line-named-classic`
line. Engines of common classics: countdown (Five Little Ducks, Five Little Monkeys, Speckled Frogs,
Ten in a Bed; show bottles as bouncing soft toys), swap (Wheels on the Bus, Mulberry Bush, If You're
Happy, Old MacDonald as cumulative), action (Head Shoulders, Teapot, Row Your Boat, Pat-a-Cake, brushing
teeth), lullaby (Twinkle Twinkle, Brother John), story (Itsy Bitsy Spider, Humpty Dumpty with a kind
fix), list (One Two Buckle My Shoe, the alphabet, days of the week). A theme with no classic gets a
custom engine.

## What the music filter blocks

The vendor's production data, 505 kids-song calls on its Lyria routes, Sep 21 to Oct 20 2026, 13%
blocked overall (#15-#20). `sing.py` checks the phrases in this list; the agent checks the rest.
- **A song or tune named anywhere**: "sung to", "tune of", "melody of" were blocked 14 of 14;
  "traditional" or "public domain" about 80%. Name no song, tune, artist or show.
- **Lines or catchphrases of a famous song**, even inside new lyrics: 35 of 41 famous lines blocked;
  "beep, beep, beep" 9 of 21, "round and round" 14 of 50, also E-I-E-I-O, "twinkle, twinkle", "row,
  row, row", "head, shoulders, knees and toes", "if you're happy and you know it", "jumping on the
  bed", "doo doo doo". A bare count from one to ten reads as a counting rhyme: give each number its own
  line with a noun and a verb.
- **Long prompts**: over 1,500 characters, 21% against 11%. Keep to the template; `song-prompt` warns
  there. If a long song is blocked, trim the style note first, then flagged lines.
- **Disclaimer prose** ("do not imitate any song") did not help (15% against 13%). The vendor's single
  original-melody sentence did (7% against 17%); our template restates it, and the restated wording
  has not been measured.
- `negative_prompt` on `fal-ai/lyria3/pro` is deprecated and does nothing: leave it unset and put no
  exclusions there (fal enrichment, `fal/falaudiogeneration-ba1a03#27`).

## The timeline

One table, built once before the song, read by every later step (#46): the song prompt's rows, the
shots, the clip grouping, each clip prompt's times, the stitch lengths and the captions. Nothing is
re-timed by eye.
1. **Before the song** (`sing.py plan`): one row per sung line of one bar, plus the intro bar and the
   closing bar; the last end is the planned length.
2. **Into the song prompt** (`sing.py song-prompt`): the BPM, the time signature, one line per bar
   after a one-bar intro, the planned length and every line with its start time, word for word. For the
   fallback route, `--route minimax` writes the lyrics field with section tags instead.
3. **After the song** (`sing.py readback`, then `retime`): the real length is the video's length.
   Lines take their times from the word transcript where it heard them; lines it missed are placed
   between their neighbours by bars; with no transcript, every time is scaled by real / planned. An
   instrumental gap over 1.5 s becomes its own row. More than 5 s over plan is a failed song.
4. **Shots and clips** (`shotplan.json`, `sing.py shots`): see `pictures.md`.
5. **Captions** (`sing.py lyricmap`): the line rows, without the intro, gap and closing rows.

The INTERPRETATION the approach records (#229): the intro bar is kept although the song rules say
"sung from the first second", and the hook is acted out from the first frame.

## Lessons from failed lyrics

The vendor kept three failed attempts as shapes (#37): a count-up with no rhyme and one sound word on
every line; a countdown with grown-up words, a count that did not add up and a line that only
rhymed; and a rewrite with a new place every verse, a still verb, near rhymes, a sad beat, a second
line whose shape changed every verse and a hook that was a label. Its fixed versions wrote a frame,
put one new action on every line and the sound word once per verse. Never reuse any of their lines,
heroes or hooks.
