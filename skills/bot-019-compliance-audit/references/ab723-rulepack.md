# AB-723 / MLS rule-pack — the audit's verdict logic + cites

> The dated rules each audit verdict cites. Default jurisdiction `CA-AB723` (strictest published).
> Full ruleset + sources: BOT-019 `research/domain-analysis.md`. **Inferred from published bulletins,
> not one machine-readable spec — re-validate per board.**

## The four obligations (what an altered listing image must satisfy)

| Obligation | Audit check | Cite |
|---|---|---|
| Conspicuous "digitally altered" statement (tech-agnostic) | check 2 (disclosure-present) | AB-723; MLSListings AB-723 overview |
| Unaltered original reachable (public URL/QR, no login) | check 3 (original-pairing) | AB-723; SDMLS "Made Simple" |
| Original adjacent (immediately before/after on MLS) | check 3 (original-pairing) | CRMLS Rule 11.5.2 |
| "Better, not different" (no hidden defects / changed dimensions / added-removed permanent features) | check 4 (better-not-different judge) | AB-723; R2U guide |

## Verdict logic (per altered media item)

An altered item is **PASS** only if ALL hold; otherwise **FIX** (list every failing fix):

1. **Altered?** (check 1, `detect-altered.py`) — if `altered` is true (c2pa or declared) the item is in
   scope. If `altered` is null AND not declared, surface it as **REVIEW** (ask the user; do not silently
   pass — C2PA absence ≠ unaltered).
2. **Disclosure present?** (check 2, vision) — a legible conspicuous "digitally altered / virtually
   staged / conceptual rendering" caption must be on the media. Missing → **FIX** (cite obligation 1).
3. **Original paired?** (check 3, `check-pairing.py`) — `ok` must be true (original present + public,
   login-free + adjacent). Any failure → **FIX** with the script's `fix` string (cite obligations 2,3).
4. **Better, not different?** (check 4, judge) — verdict must be BETTER. DIFFERENT → **FIX (material
   misrepresentation)** — the most serious finding (cite obligation 4; up to $10k).

Unaltered items (check 1 false with confidence) need none of the above → **PASS (not altered)**.

## Penalties to surface in the report summary
Willful violation = **misdemeanor** (B&P Code) + **DRE** discipline; civil liability; MLS removal +
fines **$500–$5,000** (up to **$10,000** for material misrepresentation). Frame as an assessment, not
legal advice. **Never auto-publish.**

## Jurisdiction notes
- `CA-AB723` (default) / `CA-CRMLS` (adds Rule 11.5.2): all four obligations apply.
- Non-CA (`FL`, `CO`, …): **not uniform** — a CA PASS is a strong default but the local board's rule
  must be confirmed; say so in the report.

## compliance-report.md template (what the audit writes)

```
# Compliance report — <listing/project>   (jurisdiction: <CA-AB723>)

OVERALL: <PASS | FIX (n items)>   — assessment only, not legal advice; nothing has been published.

| # | file | altered? (method, conf) | disclosure | original paired | better-not-different | VERDICT | rule cite | fix |
|---|------|-------------------------|-----------|-----------------|----------------------|---------|-----------|-----|
| 1 | photo-03.jpg | yes (c2pa, 0.95) | missing | original present, not adjacent | BETTER | FIX | AB-723 obl.1,3 | add 'Virtually Staged' caption; place original adjacent |
| 2 | photo-05.jpg | no (c2pa, 0.6) | n/a | n/a | n/a | PASS (not altered) | — | — |

## Fixes (ordered)
1. <file> — <concrete fix> [cite]
...

## Notes
- Detection method + confidence per item (c2patool present: <yes/no>).
- Penalties: misdemeanor + DRE + MLS fines $500–$5,000 (up to $10k material misrepresentation).
- Run `disclosure-stamp` on the FIX items to produce the captions + remark + pairing.
```
