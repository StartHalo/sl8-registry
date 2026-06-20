# Disclosure formats — AB-723 / MLS (the wording this skill emits)

> Source: California **AB-723** (in force 2026-01-01) + MLSListings / SDMLS / CRMLS Rule 11.5.2
> bulletins (see BOT-019 `research/domain-analysis.md`). **Inferred from published bulletins, not one
> machine-readable spec** — re-validate per board. Default jurisdiction `CA-AB723` (strictest published).

## On-media caption (stamped by `stamp.py`), by alteration type

| Alteration type | Caption text | Notes |
|---|---|---|
| `virtual-staging` | **Virtually Staged** | empty room furnished with AI furniture |
| `twilight` | **Digitally Altered** | day → dusk conversion |
| `sky` | **Digitally Altered** | sky replacement |
| `declutter` | **Digitally Altered** | object/furniture removal |
| `restyle` | **Digitally Altered** | re-decorated / re-finished existing room |
| `renovation-concept` | **Conceptual Rendering - Not Actual Condition** | the highest misrepresentation risk — a *concept*, not the current state |

The caption is the conspicuous statement AB-723 requires. It is **necessary but not sufficient** —
the unaltered original must also be reachable + adjacent (next section).

## The full AB-723 disclosure line (for the listing / caption / remark)

```
Digitally Altered - unaltered original available at <ORIGINAL_URL_OR_QR>
```

For virtual staging specifically, "Virtually Staged" is the accepted on-image caption; the
remark/line still must point to the original.

## MLS public remark (ready to paste)

```
Property photos/video digitally altered (virtual staging); unaltered originals included in the photo set.
```

Variants by type (swap the parenthetical): `(virtual staging)`, `(twilight conversion)`,
`(sky replacement)`, `(decluttered)`, `(restyled)`, `(conceptual renovation rendering)`.

## Video first-frame card

```
Video created from listing photos using AI motion technology
```

Burned into frame one for the first ~3 seconds (see `stamp.py` ffmpeg suggestion), plus the MLS remark.

## Original pairing (composed by `pair.py`)

AB-723 (and CRMLS 11.5.2) require the unaltered original **immediately before or after** the altered
image in the MLS photo sequence. When the agent can attach both, sequence them adjacently. When only
one composite can be attached, `pair.py` produces a single **ORIGINAL (left) + ALTERED (right)** image
so the original sits immediately beside the altered version.

## Jurisdiction notes

- `CA-AB723` (default): all of the above; willful violation is a **misdemeanor** + DRE discipline; MLS
  fines $500–$5,000 (up to $10k for material misrepresentation).
- `CA-CRMLS`: AB-723 + **Rule 11.5.2** (same disclosure + adjacent-original mechanics; CRMLS-specific
  enforcement).
- Other states (e.g. `FL`, `CO`): **not uniform** — a CA-compliant disclosure is a strong default but
  the caller must confirm the local board's rule. This skill stamps the CA-grade disclosure and flags
  that non-CA boards need confirmation.

## `disclosure-assets.md` (what the skill writes)

The skill assembles the produced strings into `artifacts/<project-name>/disclosed/disclosure-assets.md`:

```
# Disclosure assets — <media name>

- Alteration type: <type>     Jurisdiction: <jurisdiction>
- Caption (stamped on media): "<caption>"
- AB-723 line: "Digitally Altered - unaltered original available at <ORIGINAL_URL_OR_QR>"
- MLS remark (paste): "<remark>"
- Pairing: <ORIGINAL-then-ALTERED, adjacent>  | original supplied: yes/no
- If no original supplied: ACTION REQUIRED — host the unaltered original at a public, login-free URL
  (or QR) and fill the <ORIGINAL_URL_OR_QR> slot; AB-723 requires it.
```
