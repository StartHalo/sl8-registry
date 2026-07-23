# QC codes — the defect taxonomy

Every verification failure gets a code (graders and run records cite them; a new defect
class earns a code + a gotchas-ledger row within 48h). The gate order matters: inputs are
checked BEFORE assembly (cheap), outputs after (authoritative).

## Input gates (before any assembly step)

| Code | Defect | Detection | Fix path |
|---|---|---|---|
| QC-01 | Stream mismatch across clips (fps / pix_fmt / audio rate / resolution) | `ffprobe -show_entries stream=r_frame_rate,pix_fmt,sample_rate,width,height` over every input; all must agree | normalize first (ledger rule 25) — never concat mismatched inputs |
| QC-02 | Unmeasured duration in the plan (`vo_measured_s` null while `dur_s` set, or dur_s ≠ derived) | plan lint: every dur_s traces to a measured VO | re-measure and re-anchor (voice-timing) |
| QC-03 | Unapproved frame cited by a clip (`shots[].clip` exists, frame approval absent) | plan lint against the artifact trail | regenerate from an approved frame |
| QC-04 | Missing request id on a paid artifact | plan lint: `request_id` null on a produced clip | journal from the response record; if lost, note in the run record (accounting gap) |

## Output gates (after assembly)

| Code | Defect | Detection | Fix path |
|---|---|---|---|
| QC-10 | Codec/container wrong | ffprobe: h264 + aac + yuv420p + 24fps (or platform target) | re-export with the standard chain |
| QC-11 | Duration drift | |final − anchored plan total| > 0.5s | re-check windows; a drifted window means an unmeasured number leaked in (QC-02 upstream) |
| QC-12 | Text warp/wobble/re-lettering in motion | frame extraction at 3+ points per text-bearing shot; letterforms compared to the approved frame | re-roll the CLIP with hardened text-lock (never patch in post) |
| QC-13 | Style drift (realism creep, palette shift, re-rendered look) | contact-sheet compare vs the style key / approved frames | re-roll with the anti-realism guard reinforced; check the block was verbatim |
| QC-14 | Loudness off-target | `loudnorm` print: I within ±1 LU of −16, TP ≤ −1.5 | re-mix |
| QC-15 | VO buried or clipped | audible check at extracted points + waveform sanity (VO band above bed) | duck deeper / re-gain |
| QC-16 | Caption mismatch | caption text diff vs the authored script | regenerate captions from the script (never ASR) |

## Grader rule

A run record claims delivery ONLY with: QC-01..04 green before spend-bearing steps,
QC-10/11 green on the final, a contact sheet attached, and any triggered code named with
its fix path taken.
