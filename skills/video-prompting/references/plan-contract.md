# The plan contract — `artifacts/<project>/plan.json`

The single project spine every skill reads and writes (single home: this file; siblings
cite it as `../video-prompting/references/plan-contract.md`). Created by the invoking
workflow at project start (draft → human-approved BEFORE any spend); reconciled against
the filesystem on resume ("the plan is intent, the filesystem is truth").

## Schema

```json
{
  "project": "slug",
  "topic": "one line",
  "aspect": "16:9",
  "duration_target_s": 30,
  "style": "style.md",                 // the identity file (style-system owns its format)
  "arc": "hook_payoff",                // the narrative arc token
  "music": "described instrumental bed, or null",
  "beats": [
    {
      "id": 1,
      "headline": "BAKED HEADLINE",    // beat 1 carries the hook (≤3s law)
      "bg": "warm gold amber",         // per-beat background color (frame-craft)
      "feel": "intriguing, grand",
      "narration": "One teaching line for this beat.",
      "vo_file": "audio/vo-01.wav",    // written by voice-timing
      "vo_measured_s": null,           // MEASURED duration — set by voice-timing; nothing downstream runs on an estimate
      "shots": [
        {
          "id": "a",
          "frame": "frames/01a.png",   // written by frame-craft (approved frames only)
          "frame_url": null,           // hosted URL while fresh (expires — local_path is truth)
          "scene": "what is in frame, one clear idea",
          "camera_move": "push_in",    // closed vocab (video-prompting)
          "element_motion": "what lifts, settles, pulses — the energy axis",
          "dur_s": null,               // set AFTER vo_measured_s exists (audio-anchored)
          "clip": "clips/01a.mp4",     // written by video-prompting
          "request_id": null           // journaled at submit (recovery + accounting)
        }
      ]
    }
  ]
}
```

## Who reads / writes what

| Skill | Reads | Writes |
|---|---|---|
| style-system | — | `style` pointer (creates style.md) |
| frame-craft | beats[].bg, headline, shots[].scene, aspect | shots[].frame, frame_url |
| voice-timing | beats[].narration | vo_file, **vo_measured_s** (then shot dur_s are derived, never guessed) |
| video-prompting | shots[].frame/frame_url, camera_move, element_motion, dur_s | shots[].clip, request_id |
| assembly-qc | everything (the anchored plan is its input) | nothing (its outputs are renders/ + snapshots/) |

## Laws carried by the contract

- Human approval of the plan comes BEFORE any paid call.
- `vo_measured_s` is the only duration authority; `dur_s` is derived from it.
- No two adjacent beats share a `camera_move`; `static` is reserved for the payoff.
- Every paid call's `request_id` lands in the plan at submit time.
