# Ideas: intake and topic bank

SL8-authored. The vendor's intake file was never served (research everygen/rankingvideos-1aa4ce#3); the
rules below restate its outline (#4, #5) and the options are ours.

## Defaults (used for anything the brief leaves out, and named in the reply)

| Choice | Default | A kit or brief may name |
|---|---|---|
| Items | 6 (#6 down to #1); 5 when the brief says "top 5" | 3 to 9 (a top 10 is not offered on this machine yet) |
| Length | about 23.5 s | another total; windows from `ranking.mjs windows` |
| Tone | comedic fails | any cluster in style-bible.md |
| Text look | classic | boxed, yellow, clean (look.md) |
| Order | count-down display: highest number first, #1 last | none (fixed) |
| Voiceover | off | not offered on this machine yet |
| Text route | overlay (HR10) | painted, only on an explicit brief (HR20 waiver) |

## The one intake message (interactive sessions only)

A bot job never asks: it fills every gap with the defaults above and names them in its reply (HR12).
With the customer present and the topic, length, style or text look missing, send ONE plain chat
message (no question tool), only for what is missing, at most four numbered questions, each with
concrete options, then stop. Generate nothing that turn. Whatever comes back, fill the rest with
defaults; never ask a second round.

```
Quick setup for your ranking short (answer any, skip the rest):
1. Topic: kitchen disasters / pet chaos / gym fails / something else?
2. Length: 6 items (~23 s) or a top 5?
3. Style: comedic fails / satisfying wins / cute moments / extreme skills?
4. Text look: classic white outline / boxed / yellow / clean?
```
End it with the `intake-ending` line from prompts.json.

## Topic bank (starting points, generic)

Kitchen disasters · pet chaos · office mishaps · parking attempts · DIY gone wrong · trick shots ·
satisfying fixes · first-try skills · weather surprises · toddler logic · garden fails · gym fails.

Never a real, named or recognisable person, a brand, or a customer's own staff as the subject: the
skill refuses real people until SL8's consent text is approved (SKILL.md step 1).
