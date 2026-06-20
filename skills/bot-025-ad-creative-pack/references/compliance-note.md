# Compliance note — every final creative routes through compliance-guard

This bot GENERATES creative. It is NOT the compliance authority — the shared
`bot-022-compliance-guard` skill is (canonical owner BOT-023). Every final creative in
the pack passes THROUGH that guard before a human ships it. This note explains the two
things this skill must hand off correctly: the **Meta 2026 AI-label mandate** and the
**Amazon A+ hard spec**.

## 1 · Meta 2026 AI-Content-Label mandate (the load-bearing handoff)

Since the 2026 Meta ad-policy overhaul, AI-generated / AI-composited ad creative MUST
carry an AI label, or it is **auto-rejected as a "Deceptive Practice" with an
account-health strike** (Meta auto-detects C2PA + visual signals). This bot's outputs
are AI-generated, so EVERY Meta-bound creative (the 1:1 and 4:5 variants) is routed
through `bot-022-compliance-guard` to:

- emit the correct **Meta AI-Info disclosure string** (verbatim from the guard's
  `disclosure-templates.md`),
- attach a **C2PA Content Credentials** manifest (the guard's `disclosure-stamp.sh`),
- run the **multi-channel linter** for a per-channel PASS/FAIL.

Honest nuance the bot must not overstate (deep-dive §5): Meta's OFFICIAL position is the
"Made with AI" label itself carries **no algorithmic reach penalty** — the big reported
reach drops attach to content judged DECEPTIVE (AI voice/music), not to honestly-labeled
static graphics. So the bot's line is: **label honestly to avoid the hard auto-reject;
do NOT promise a fixed % reach loss from labeling itself.** Never present
predicted-performance "scores" as guarantees — they are directional only.

## 2 · Amazon A+ / EBC hard spec (what the A+ modules must satisfy)

The A+ module masters this skill generates must survive the guard's Amazon A+ check:

| Spec | Value | Where enforced |
|---|---|---|
| Standard image+text module | 970×600 px | `resize-variants.py aplus-std` |
| Text overlay module | 970×300 px | `resize-variants.py aplus-ovl` |
| Minimum on-image font | ~24px equivalent | prompt ("keep text well inside frame, min 24px") + human review |
| Color space | RGB only (no CMYK) | `resize-variants.py` saves sRGB JPEG |
| File size | < 2 MB | `resize-variants.py --max-bytes 2097152` (steps quality down; flags over-size) |
| Main listing image (if produced) | exact RGB(255,255,255) bg, ≥85% fill, ≥1600px, no text | route to BOT-022 packshot path, NOT this skill |

The A+ font-size + RGB + <2MB rules are partly mechanical (the resizer handles size +
color space + bytes) and partly judgment (the 24px-min legibility is human-verified in
the legibility check). Flag any A+ module whose smallest text looks under-24px at 970px
width.

## 3 · Per-channel handoff (what the guard receives)

After the pack's masters + variants are generated and (for product-bearing surfaces)
fidelity-checked, the bot hands the FINAL channel files to `bot-022-compliance-guard`
with the channels + jurisdictions the seller named:

```
channels=meta,tiktok,amazon          # which per-channel rows the linter + disclosure emit
jurisdictions=us,eu,ca,ny            # dated EU AI Act Art.50 / CA SB 942 / NY SB-8420A note
copy="<any ad copy / testimonial>"   # drives the FTC 16 CFR Part 465 fake-review gate
```

The guard writes `04-preflight/{preflight.json, <name>-cc.jpg, disclosure.md}`. The bot
NEVER auto-publishes — it emits the labeled, C2PA-stamped files + the disclosure strings;
a human pastes them and ships.

## 4 · The bot's honest framing (state plainly, never bury)

- The creatives are AI-generated; every one carries an AI disclosure + C2PA before ship.
- Text legibility and palette lock are strong but not guaranteed — flag any surface where
  a word reads as garbled or under-24px.
- Brand "lock" is PARTIAL (palette via Recraft `colors=`; font/composition by
  reference/prompt only — the saved kit lives in Recraft Studio, not the API).
- Predicted-performance is not promised. Reach impact of honest AI labels is contested —
  the bot labels to pass policy, it does not claim a reach number.
