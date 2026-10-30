# Reference frames: the master, the other stills and the line check

SL8-authored from the method's outline (research everygen/rankingvideos-1aa4ce#9, #12, #25-#30); the
vendor's own Step A/B/C text was never served. Untested on fal.

## Overlay route (default)
- **A. Master.** The first still in display order (the highest rank): `ranking.mjs params still`.
  It fixes the look for the video. No text is drawn into it.
- **B. Other stills.** One text-to-image call per item with the same blocks; each is made from the
  script, not from another render (HR11), so they can run one after another without waiting on each
  other. The list builds up in the overlay PNGs instead (`ranking_media.py overlay`): each item's
  overlay adds exactly one line and never removes one, so a future line cannot appear early.
- **C. Check** (view each still): one subject and one moment, the upper half calm, no lettering or
  time stamp, the picture to every edge, passes as a real phone frame. Then view each overlay PNG
  over its still (`convert <still> -resize 720x1280! <overlay> -composite work/<p>/preview_K.jpg`).

## Painted route (only on an explicit brief, HR20 waiver of HR10)
- **A. Master.** `params still`: the title and the full numbered list (1 at the top, the highest
  number at the bottom), with only the master's own line written and every other slot a bare number.
- **B. Ladder.** One edit at a time, in display order: `params edit` with `--ref <previous approved
  still>`; it swaps the scene and writes exactly one more line. Lines are never erased.
- **C. Line check** before the next edit (view the still): exactly one new line, in its slot, spelled
  as the script; no future line; title and earlier lines unchanged in words, size, font and place.
- **Drift guard.** When the title style changes (a box appears or goes, the font shrinks), redo that
  still with `--drift`, `--ref <previous approved still> --ref <master>`.
- **Failure routing.** The list jumps: redo from the previous approved still. A future line shows:
  redo from the previous approved still. Text size, position or an emoji is wrong on the master:
  a new master, never a patch on one still; a garbled emoji: change it to a simpler one in the
  script first.
