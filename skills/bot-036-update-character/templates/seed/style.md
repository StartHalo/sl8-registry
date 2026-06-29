# Style — continuous-shot channel

This file defines the **visual look** for your continuous-shot channel (Layer 2 seed). It is
read at the start of every shot and is the source of the global **look header** + the **Audio
directive** frozen into `seed.manifest.json`. Edit it to change the look, then run **Update
Character** (reset) so the change takes effect (a FREE token re-freeze — no image-gen, this is
a token kit).

---

## Look header
(The first line of every continuous-plan — applies to the WHOLE take; base and every hop
inherit it. Pair the medium with a lighting phrase and a grade — never bare "cinematic".)
One continuous take, stylized 3D animation, soft volumetric dawn light, warm gentle color grading, shallow depth of field, polished render.

## Discipline
One unbroken evolving take, no cuts. Continuous camera moves only (gentle tracking, following
gimbal, slow push-in, craning rise) — never a cut or a hard reframe between segments. One new
motion or scenery beat per hop; the shot evolves, it never jumps. Lighting-first style words
carry the most quality-per-word; keep the same light/grade language through every hop.

## Positive constraints
Stylized, friendly characters and creatures only — never a realistic identifiable human face,
no brands, no copyrighted characters. Positive constraints only (Veo ignores negative lists);
the stability/identity/no-cut constraints live once in the plan footer suffix.

## Audio directive
(The native in-pass audio the whole take carries — Veo generates it; there is no separate TTS
or mix. Describe one coherent bed.)
Native audio: a warm low score, soft diegetic SFX, and gentle ambience, continuous across the take.
