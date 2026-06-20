# Changelog — bot-019-compliance-audit

All notable changes. Versions are git tags (`bot-019-compliance-audit/vX.Y.Z`); no `version:` in frontmatter.

## [Unreleased]
### Changed
- (next version's changes)

## [v1.0.0] — 2026-06-19
### Added
- Initial authoring (BOT-019 re-compliance-guard). The AB-723 / MLS pre-publish audit: per-item PASS/FIX
  report from four checks — alteration detection (c2patool C2PA + declared/heuristic), disclosure-present
  (keyless vision), original-pairing (deterministic), and "better-not-different" (LLM-judge). Cites the
  exact rule per verdict; never auto-publishes.
- `scripts/detect-altered.py` (C2PA provenance + declared fallback), `scripts/check-pairing.py`
  (present/public/adjacent), `scripts/ensure-c2patool.sh` (download-or-degrade).
- `references/ab723-rulepack.md` (verdict logic + cites + report template),
  `references/better-not-different-judge.md` (verbatim judge prompt + worked examples).
- `references-skills: [disclosure-stamp]` — the audit hands FIX items to the shared disclosure-stamp skill.
- `evals/evals.json` — 3 cases (no-disclosure FIX, compliant PASS, misrepresentation judge).
