# Scripts: the script shape and the escalation checks

SL8-authored (the vendor's scripts file was never served, research everygen/rankingvideos-1aa4ce#3).
The script is `work/<project>/script.json`, copied to `artifacts/<project>/script/` when shown; the
customer sees it as `script.md` (a table rendered from the JSON).

## Shape (`ranking.mjs check-script` enforces the structure)

```json
{"schema":"sl8.story.ranking/1","project":"kitchen-disasters","route":"overlay","look":"classic",
 "tone":"comedic fails","title":"Ranking Clumsy Kitchen Moments 🍳","total_s":23.5,
 "items":[{"rank":6,"line":"Toast launch","emoji":"🍞","scene":"a small home kitchen, morning",
   "action":"a man presses the toaster lever","payoff":"the toast shoots up and lands in the sink",
   "impact":"the toast hits the sink","impact_s":2.0,"follow_up":"he stares at the sink, then at the camera",
   "filmer":{"who":"his teenage daughter","voice":"bright teen voice","emotion":"delighted","words":"No way!"},
   "window":3.5,"render":"5"}],
 "approvals":[]}
```
Items run in display order: the highest rank first, #1 last. `window` and `render` come from
`ranking.mjs windows`. The title follows the `hook-title` row of prompts.json; the title stays
within 40 characters (the overlay refuses a title that is still too wide at its smallest size) and
each list line within 28. 3 to 9 items; a top 10 is not offered on this machine yet.

## Writing each item
- **Payoff:** a concrete visible physical result, written as what the camera sees (row
  `payoff-example`). The action starts in the first second and the result is visible by second 3.
- **Impact:** the exact moment the boom marks (a hit, a landing, a splash), and `impact_s`: that
  moment in seconds from the clip start, 0.5 or more and at most the window minus 0.5, so the
  boom, the follow-up and the filmer's words all fall inside the kept window. `check-script`
  enforces it; the clip prompt states it; `ranking_media.py cues --impact <impact_s>` measures it.
- **Follow-up:** one clear action after the payoff (a look, a step back, a laugh); never head
  shaking or twitching.
- **Filmer:** a different person, voice, emotion and words for every item (audio.md).
- **No claims:** a ranking is an opinion; no statistics, prices or "scientifically proven" (HR18).

## Escalation checks (run on the whole script before showing it)
1. Each item's payoff is bigger, louder or more surprising than the one before it in display order.
2. #1 has the largest, most visible result and the strongest reaction.
3. No two items share the same kind of payoff (two drops, two splashes) or the same place.
4. Every payoff lands by second 3 of its window; a payoff that needs setup is a different item.
5. Every item is harmless to people and animals and needs no real person.

A script that fails a check is rewritten here, before anything is generated: a weak #1 is a script
problem, never a still or clip problem. Write in `script.md` one line per check saying what you did
(the agent describes; the customer judges, HR14).

## Quote (shown with the script)
One line per paid call from `ai-gen estimate` on its params file (1 master, N-1 stills, N clips),
one planned retry per still and per clip, and the total in credits (about 250 credits = $1).
