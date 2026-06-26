# Changelog — rm-studio

## 1.0.0 (Author, 2026-06-25)
- Ported from BOT-015 `hf-studio` (the orchestrator) and re-targeted to Remotion:
  - HyperFrames → Remotion (React); `composition/` → `remotion-project/`; the render-core phase names
    swapped to `rm-build` / `rm-validate` / `rm-render`.
  - Added a Remotion-unique **preview** phase (7b, `rm-preview` → `preview.html`).
  - Added **capability routing** — `rm-dataviz` (JTBD-2), `rm-captions` (JTBD-3), `rm-audioviz` (audio) are
    woven into phase 5 (build), not separate phases — and a **generative front-end** (JTBD-5).
- `scripts/run.sh` — thin deterministic driver: scaffold (`rm-build/init.sh`) → validate
  (`rm-validate/validate.sh`) → render (`rm-render/render.sh`) → best-effort preview
  (`rm-preview/preview.sh`). Keyless + local; bash 3.2 compatible (no `timeout`, no GNU flags).
- `references/phase-chain.md` (the spine + scripts + re-entry) and `references/routing.md` (the JTBD router).
- `evals/evals.json` — minimal structural placeholder (Charter refines into media-judge evals).
