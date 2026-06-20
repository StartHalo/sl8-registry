# Disclosure — why an AI product video ad must be labelled (route through the guard)

An AI-generated product video that runs as a paid ad **must be disclosed or the ad
dies.** This skill does **not** re-implement disclosure — it routes a QC-passed clip
through the shared **`bot-022-compliance-guard`** skill, which owns the verbatim
per-channel strings, the C2PA stamp, and the dated jurisdiction note. This file is the
rationale + the handoff contract so this skill knows *when* and *what* to hand off.

## The platform rules (the load-bearing ones for video)

- **Meta (Facebook / Instagram ads):** any ad creative where AI tools "generate,
  substantially modify, or composite visual or audio content" must carry an
  **"AI-generated"** label; Meta **scans every ad submission** for C2PA metadata.
  Undisclosed AI in a **UGC-style** ad simulating organic creator content (without the
  Partnership Ads designation) is a **"Deceptive Practice" violation → immediate ad
  rejection + a significant account-health penalty/strike.** This is the single
  biggest reason a product video ad gets killed. [AuditSocials 2026-05-09]
- **TikTok:** requires people to **label AI-generated content** that contains
  realistic images, audio, or video — turn ON the **AIGC label** + the commercial-
  content toggle. TikTok is moving to auto-apply a label it detects. [TikTok newsroom
  2023-09-19]
- **C2PA on the file:** the Content Credentials manifest the guard signs onto the
  clip is the machine-readable mark Meta scans for; it satisfies the EU AI Act Art.50
  "machine-readable" disclosure. C2PA is strippable (CDNs drop metadata), so the
  human-visible label is still required — both layers ship together.

## The handoff contract (this skill → bot-022-compliance-guard)

1. **Only a QC-passed clip is routed.** A `drift`-dropped clip from `video-qc.md`
   never reaches disclosure. A `low-confidence` clip is routed **with its flag**.
2. The guard runs in the project's **phase 4 (pre-flight)** on the clip's poster
   frame / the clip file, with `--channels meta,tiktok` (the video ad channels) and
   the project's `--jurisdictions`. It emits:
   - `disclosure.md` — the ready-to-paste Meta "AI-generated" label string + the
     TikTok AIGC toggle text + the dated EU/CA/NY note (each with its advisory caveat).
   - a C2PA-stamped asset + the per-channel PASS/FAIL pre-flight verdict.
   - the **FTC 16 CFR Part 465** gate on any ad copy / testimonial supplied — a hard
     BLOCK on an AI-generated review or a synthetic spokesperson presented as a real
     customer. (Relevant if the video uses an AI voice/persona as a "customer".)
3. **The bot never auto-publishes and never auto-applies a platform toggle.** It emits
   the clip + the disclosure text + the pre-flight report; a human pastes the label,
   flips the AIGC toggle, and uploads.

## A first-frame disclosure card (optional, local, no model)

If a project wants the disclosure burned visibly into the clip (belt-and-braces with
the platform toggle), a 1.5s "AI-generated video" card can be concatenated before the
clip with ffmpeg (local, no model). The guard's disclosure step owns the exact card
text; the burn itself is a simple ffmpeg concat:

```bash
ffmpeg -loop 1 -t 1.5 -i disclosure_card.png -i ad.mp4 \
  -filter_complex "[0:v]scale=1080:1920,setsar=1[c];[1:v]scale=1080:1920,setsar=1[v];[c][v]concat=n=2:v=1:a=0[outv]" \
  -map "[outv]" -map 1:a? -c:v libx264 -pix_fmt yuv420p ad_disclosed.mp4
```

This is optional — the platform-native label/toggle is the required disclosure; the
burned card is an extra honest signal, never a substitute for it.

## Honesty rules (graded)

- Never claim a platform "confirmed" a clip is compliant — the bot emits the correct
  label text and a PASS/FIX pre-flight; the platform's own review is the final word.
- Never present an AI clip as organic creator UGC without the disclosure + Partnership
  Ads designation — that is the exact "Deceptive Practice" trap.
- Dated laws (EU Art.50 / CA SB 942 operative 2026-08-02; NY SB-8420A live
  2026-06-09; FTC 16 CFR 465 live) are emitted scoped to their operative date, never
  asserted as binding before it.
