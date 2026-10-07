# trial-path-review.md: the layout (validate.mjs reads these headings and tables)

```markdown
# <Product>: trial-path review

- Product: <name, website>
- Path reviewed: <home → sign-up → first step described>
- Pages read: <n>, saved in pages/
- Traffic: <the founder's figures, or "not given: treated as low traffic">

## The path
| Step | URL | Section | Label | What the visitor meets (quoted) |
|---|---|---|---|---|
| 1 | https://<site>/ | hero | green | "<the words there, copied exactly>" |
| 3 | after sign-up | first screen | not seen | not public: the kit asks for screenshots |

## What was checked
| Step | Done how | Found |
|---|---|---|
| Technical | <from the fetch facts: links, forms, viewport, titles> | <finding, or "nothing wrong found"> |
| Heuristic | <the five lenses on each page> | … |
| Digital analytics | <the founder's figures, or "not given"> | … |
| Mouse tracking | not done: kit item "Recording setup" | — |
| Qualitative | <customer voice sent, or "not done: kit item Interview script"> | … |
| User testing | not done: kit item "Five-user test" | — |

## Ranked changes
| ID | Page (URL, section) | Now (quoted) | Change | Evidence | Bucket | PXL |
|---|---|---|---|---|---|---|
| C1 | https://<site>/signup, form | "<the words there, copied exactly>" | <the change, ready to make> | <why: the lens, the fetch fact, the founder's figure or quote> | Just Do It | 6 |

## PXL scores
| ID | Above the fold (1) | Noticeable in 5 s (2) | Adds or removes (2) | High-traffic page (1) | User testing (1) | Qualitative (1) | Analytics (1) | Mouse tracking (1) | Ease (0–3) | Total |
|---|---|---|---|---|---|---|---|---|---|---|
| C1 | 0 | 0 | 2 | 1 | 0 | 0 | 0 | 0 | 3 | 6 |

## What this review cannot show
- <speed; how pages look on a phone; what is above the fold; screens after sign-up; anything built by script>

## Research kit
### Interview script
<who, how, five questions, what to send back>
### Five-user test
<who, the tasks, what to send back>
### Recording setup
<the tool kind, pages to exclude, what to watch, what to send back>

## Method
ResearchXL (Peep Laja, CXL; Speero 2022) with its five buckets; PXL order (weights in the PXL table
header); Bowling Alley labels (Wes Bush, ProductLed). Pages read as HTML text, no browser.

## Assumptions
- **<Label>:** not given. Assumed <what>. Send <what> to replace it.
```

- **The path:** in order; one row per step; the URL is a full `https://` address, except a step that
  is not public, labelled `not seen`. Labels: green (needed for first value), yellow (useful, but can
  wait), red (not needed), not seen.
- **Ranked changes:** IDs `C1`, `C2` … in descending PXL order (ties in any order). The page cell is
  the full URL, a comma, then the section. "Now" is copied exactly from a file in `pages/`, in quotes; for
  something missing, quote the nearest words and say what is missing in Change. Bucket is
  exactly one of: Just Do It, Test, Instrument, Hypothesize, Investigate. No Test when traffic was
  not given.
- **PXL scores:** one row per change; each cell is 0 or the weight in its header (ease 0–3); the
  total is the sum and equals the PXL in Ranked changes.
- **Research kit:** the three parts, each ending with what to send back.
- When every input was given, the Assumptions section says `- None: every input was given.`
