# The motion check, and why the obvious version does not work

Moved here from `SKILL.md` ("Submit, poll, deliver", step 5) to keep the body short; the text
is fal's, as exported 2026-10-05. On this machine the measurement is a script:
`node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs motion <clip> --control <frozen.mp4>`
(media-qc 1.1.0; flags in its `references/checks.md`). You supply the controls and read the
three figures it prints; this file says why it is built this way.

Decode every frame. Take the mean absolute luminance difference of each adjacent
pair, at the delivered resolution, and **sum** those within each one-second window
at the delivered fps. Judge the **minimum** window, never the average — a clip
that freezes only in its middle seconds must fail here, and averaging hides
exactly that.

**Do not ship a fixed floor.** A hard-coded threshold is how this check fails
while looking like it works: the same measure reads ~0.25 on a single adjacent
pair of a visibly alive texture and ~8 as a summed one-second window, so a
threshold without its window and its resolution attached is meaningless. Worse, a
floor set below the route's own re-render noise passes anything: a sibling skill's
liveness floor sat at 6 while its route's noise floor was ~70, and a confirmation
run measured 69.64 and passed on a clip that had not changed at all.

So calibrate, per route, before trusting the number:

1. **Known-bad control.** Build a deliberately frozen clip — one frame repeated
   for the full duration, encoded through the same settings (`ffmpeg -loop 1 -i
   <first-frame.png> -t <dur> -r <fps> -pix_fmt yuv420p frozen.mp4`) — and measure it. That
   is your zero. If it does not read near zero, the measurement is broken, not the
   clip.
2. **Known-good control.** Measure a clip you can see is moving. That is your
   ceiling.
3. **Set the floor between them, nearer the bad end**, and record all three
   numbers alongside the verdict. A verdict without its controls is an opinion.

Report the figure, not a pass/fail: "min 1-second window 7.9, frozen control
0.001, floor 2.0" is auditable. "Motion check: PASS" is not, and is what let a
frozen shot reach a human reviewer.

**Known gap (queued, VID-L06):** a frozen control built locally reads about 0, while the
route's own re-render noise in the story above was about 70, so a floor "nearer the bad end"
of a local control can pass a shimmering but static generated clip. Until a route-rendered
static control is recorded per route, say in the delivery note that the floor rests on a
local control, so a clip that reads only just above it is unproven motion, not live motion.
