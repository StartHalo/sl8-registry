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
| Heuristic: relevance | <page, section> | "<the words>": <the judgment> |
| Heuristic: clarity | <page, section> | "<the words>": <the judgment> |
| Heuristic: value | <page, section> | "<the words>": <the judgment> |
| Heuristic: friction | <the form: fields, required marks, captcha, submit (fetch facts)> | "<the field labels>": <the judgment> |
| Heuristic: distraction | <page, section> | "<the words>": <the judgment>, or "not judged: <why>" |
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
- <speed; how pages look on a phone; what is above the fold; anything page script builds or changes; screens after sign-up>

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
  wait), red (not needed), not seen. Every other step quotes what the visitor meets.
- **What was checked:** one row per lens, each quoting the words it rests on (or "not judged: <why>").
  The friction row names every form fact from the fetch: fields, required marks, a captcha, a submit
  that page script enables.
- **Quotes:** every quote in the path, what was checked, "Now" and Evidence is copied exactly from a file
  in `pages/`, the request or an attachment (the validator looks for each). Proposed new words in Change
  are not checked.
- **Ranked changes:** IDs `C1`, `C2` … in descending PXL order (ties in any order). The page cell is
  the full URL, a comma, then the section. "Now" is copied exactly from a file in `pages/`, in quotes; for
  something missing, quote the nearest words and say what is missing in Change. Bucket is
  exactly one of: Just Do It, Test, Instrument, Hypothesize, Investigate. No Test when traffic was
  not given.
- **PXL scores:** one row per change; each cell is 0 or the weight in its header (ease 0–3); the
  total is the sum and equals the PXL in Ranked changes.
- **What this review cannot show:** always speed, the phone, the fold, page script and the screens after
  sign-up, plus anything else this review could not see.
- **Research kit:** the three parts, each ending with what to send back.
- When every input was given, the Assumptions section says `- None: every input was given.`
