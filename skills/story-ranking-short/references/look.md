# Look: how every still looks, and the text looks

SL8-authored and not yet run on fal-ai/nano-banana-pro (the vendor's look file was never served,
research everygen/rankingvideos-1aa4ce#3). The wording lives in `prompts.json`; `ranking.mjs params`
puts it into every still and edit prompt, so never retype it.

## Blocks on every still and edit
| Row | What it does |
|---|---|
| `look-line` | ordinary smartphone-video frame, handheld, natural light, real place |
| `realism` | real skin, fabric and clutter; nothing glossy or staged |
| `full-frame` | the picture runs to every edge (the blurred-band fix) |
| `plain-surfaces` (overlay route) | no lettering or time stamp in the scene |
| `composition-overlay` (overlay route) | upper half calm, subject and action in the middle band |
| `no-stray-text` (painted route) | only the given title and list are written |
| `size-rules`, `text-block` (painted route) | title big and centred at the top, list small, under it, left |

## Text looks (one per video, never mixed)
| Look | Title | List |
|---|---|---|
| classic (default) | white heavy letters, thick black outline (Anton) | white, thin black outline (Inter Bold) |
| boxed | black heavy letters on a white rounded box | as classic |
| yellow | yellow heavy letters, thick black outline | as classic |
| clean | white heavy letters, soft shadow, no outline | white, soft shadow |

On the overlay route `ranking_media.py overlay` draws the look with the baked fonts; on the painted
route `ranking.mjs params` describes it in words. Emoji draw only when a colour emoji font is
installed: otherwise they are left out and the delivery says so.

## Position (both routes)
On 9:16 the top 8%, the right 12% and the bottom 25% are covered by platform controls even when they
look empty (research fal/falmotiongraphics-dc3541#15; re-check per platform). The title starts at 9%
of the height, centred inside the safe width; the list starts directly under it at 5% from the left;
the whole block ends above the middle of the frame (`overlay` refuses a block past 50%).
