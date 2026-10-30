# Audio: the filmer cast and the sound line

SL8-authored, untested (the vendor's audio file and cast were never served, research
everygen/rankingvideos-1aa4ce#3, #17-#19). All sound is generated inside each clip
(`generate_audio` true); there is no separate effects, voice or music track.

## Sound line (built by `ranking.mjs params clip`)
- A short pop at the very start of every clip.
- The filmer's reaction: their own voice, emotion and words (a few words, never a sentence).
- A deep bass hit on the exact frame of the impact (row `boom`).
- The first clip in display order also gets a bass drop on frame 0 (row `frame0-drop`).
- Boom missing or off the impact: the clip's one retry restates it (`--fix boom`). If the retry
  misses too, keep the better take and note the boom as missing: dropping it would need a third call
  (HR7). A kit may choose to drop it on the retry instead (`--no-boom`), keeping the pop.

## Filmer cast (one per item; never the same person or voice twice)
Pick a different row for every item and fit it to the scene; a kit may bring its own cast.

| Who | Voice | Emotion | Example words |
|---|---|---|---|
| a teenage sibling | bright, fast | delighted | "No way!" |
| a grandmother | warm, older | horrified, then laughing | "Oh dear, oh dear" |
| a dad behind the camera | low, dry | deadpan | "Every time." |
| a flatmate | breathy, mid | wheezing laughter | "I can't, I can't" |
| a coworker | hushed | nervous giggle | "Did that just happen?" |
| a small child | high | gleeful shriek | "Again!" |
| a neighbour over the fence | gravelly | cheering | "Yes! Yes!" |
| a best friend | loud, clear | screaming | "Noooo!" |

Generic people only: never a real, named or recognisable person's voice (HR17; SKILL.md step 1).

## What this machine cannot judge
`ranking_media.py cues` gives figures (the level of the first 0.3 s, the strongest low-band hit and
its distance from the impact). Whether the voices really differ and whether the reaction sounds
natural is a listening judgment: list it as a review item, never as passed (HR14).
