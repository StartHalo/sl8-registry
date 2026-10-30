# The narration (steps 1 to 3 and 5)

SL8 wording. The method is restated from the vendor's found-footage story pack (research
`everygen/foundfootagestories-179c12`, prompts "What this makes", "Narration word-count table",
"Story shape", "Story engines", "Hook shapes", "Voice rules", "Cut-on-sight phrase list", "Names and
real events rules", "Format for the voiceover"; fine points #15-#17, #31-#40) and its animal variant
(`everygen/animalclips-e048e4`, "What a good one is", #10, #13). Nothing here has run on this machine.

## Contents
- [What the story is](#what-the-story-is)
- [Length and the word table](#length-and-the-word-table)
- [Shape: hook, setup, turn, payoff](#shape-hook-setup-turn-payoff)
- [Engines and hook shapes](#engines-and-hook-shapes)
- [How it should sound](#how-it-should-sound)
- [Names, real events and real people](#names-real-events-and-real-people)
- [The text the voice reads](#the-text-the-voice-reads)
- [Home-base variant](#home-base-variant)

## What the story is

A vertical short of 30 to 45 seconds (35 by default) that plays as if a real camera recorded it
(doorbell, CCTV, bodycam, dashcam or trail-camera footage). A single calm voice recounts, in the third
person, what that camera caught. The hook is heard before 2 seconds have passed. There are 4-6 shots,
each 5-10 s long, and the measured narration sets the length of every shot.

## Length and the word table

The vendor timed its own narrators at roughly 3 words per second, counting the pauses. Count the words
before recording, against this table:

| Length | Words |
|---|---|
| 30 s | 85-95 |
| 35 s | 100-110 |
| 40 s | 115-125 |
| 45 s | 130-140 |

Above the range, take a sentence out. Never raise the reading speed to fit.

Known result (facts `rate-brian-ml2`, `rate-ml2-spread`, fal export 2026-10-05; research
`fal/falaudiogeneration-ba1a03#36`, `#40`): the one figure on record for this machine's voice route is
2.82 words a second (Brian, multilingual-v2, speed 1, English), and three takes of one script at the
same settings ran 2.93, 3.19 and 3.04 words a second. The route has no seed, so a re-record cannot hit
a length exactly: plan on about 3 words a second with a spread of about 4 percent, and let step 6
measure the real voice. The table is the vendor's; it has not been re-measured on these voices.

## Shape: hook, setup, turn, payoff

Each beat has to be visible on the camera.

1. **Hook.** The opening line, at most 7 words, so it is heard within 2 s. It raises a question that
   the video settles. The strongest hook gives the peak moment, or how things ended, over the cold-open
   shot, and the story then goes back to how it came about: giving away what happened is fine when how
   it happened is the reward. A line that only sets a mood does not count as a hook.
2. **Setup.** Who the camera sees and their routine or situation; by sentence two the viewer has a
   reason to care. Introduce one ordinary object here (the parcel, the gate, the food bowl) that
   returns in the payoff.
3. **Turn.** The routine breaks in a way the camera can see change. A turn that exists only in the
   words gets rewritten until the camera can show it.
4. **Payoff.** Two sentences or more, about a sixth of the running time, ending on a plain fact rather
   than a lesson. Nothing comes after it.

## Engines and hook shapes

Story engines that suit the format (pick one): someone who keeps coming by, and the one day it
counted; an animal that keeps waiting or returning, and why it does; an animal or a person that will
not stop acting oddly because it is trying to warn someone; a stray that turns up and gets taken in; a
rescue seen from the responder's own camera.

Hook shapes (use the shape, never borrowed lines): the outcome stated flat, with the how left as the
story; the camera noticing what a person missed; a repeating pattern the viewer wants explained.

## How it should sound

- Third person throughout, about what the camera recorded. No I, no we, no "you" as a character.
- Contractions all through. A script with none sounds machine-written straight away.
- Sentence lengths that vary: a long one, then a very short one. Fragments are allowed.
- Lines may open with And, So, But or Then, as a person would when chatting to a friend.
- One small, exact detail with no part in the plot (a porch bulb that flickers, a single glove on the
  step). A script without one reads as generated.
- Plain nouns. Play the emotional moment down and let the picture carry it.
- The tone sets the pace: heartwarming flows and keeps to concrete things; tense waits, then snaps;
  funny keeps a straight face and lets plain statement carry the humour.
- Cut every phrase in [cut-phrases.txt](cut-phrases.txt), any rhetorical question the video answers
  at once, and every line that brings atmosphere but no new fact. `footage.py narration` refuses the
  phrases.

## Names, real events and real people

- People and animals stay unnamed unless the customer supplied a name. Characters are roles: the
  courier, the old dog, the kid next door. No real person's name, and no brand.
- Stories are invented unless the customer says otherwise. For a story based on something that really
  happened, use only what the customer gave; a gap is never filled with a person, place, street or date
  that sounds real. An invented story is never passed off as true.
- A real, identifiable person (a named person, or a customer's photo of a person) is refused for now:
  people in the story stay generic roles, and the narrator is a stock voice. Consent wording for real
  faces and voices is waiting on the owner (learnings STO-L346).

## The text the voice reads

`narration.txt` is exactly what goes into the voice route's `text` field, on one line:

- The sentences in order, each closed by a full stop, with one space between them. Leave out the question
  mark, the exclamation mark, the dash, the semicolon and the colon: they make the voice rush on or rise. The
  voice pauses at each full stop; line breaks change nothing.
- A single held pause in the entire script: `<break time="1s" />` straight after the full stop just
  ahead of the reveal. No other tag is allowed.
- Numbers, times and symbols spelled out ("four days", "just after midnight"). A digit may stay only
  when an earlier line introduced that number (then pass `--allow-digits`).
- Stage directions, brackets and speaker names stay out.

Before recording, read it silently at the narrator's pace and rewrite each line that you could not
imagine saying aloud to a friend.

## Home-base variant

An animal rescue told at one spot, about 30 seconds: who rescued which animal, the habit that tied them
to one place, the night things went badly there, and a warm close back at that place. One camera
watches the one place, as a doorbell watches its porch day after day. One shot per sentence, each
ending where the sentence ends; a single narrator, recorded in one take, over the place's quiet sound;
light kept muted, never bright or sunny. Nobody gets an invented name. The vendor's own pacing and
audio guidance for this variant was never served, so it runs on the base rules above (learnings
STO-L359).
