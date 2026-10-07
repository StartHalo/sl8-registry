# Method: what a brand copy review checks, and where each rule comes from

Cite the rule and its source in each finding, in brackets.

## Line by line, against the brand's own rules
| Check | Against (source to cite) |
|---|---|
| Promise and message | the promise and pillars (`messaging-house.md`); one message per piece |
| Voice | each "X, not Y" trait and the tone for this moment (`voice-rules.md`), or the team's own guide |
| Words | the words to use and avoid (`voice-rules.md`) |
| Store fields (a listing) | the store's metadata rules (Apple App Review Guidelines 2.3; Google Play Metadata policy) |
| Claims | [claims-check.md](claims-check.md) |

With no brand rules in the project or the request, the rule is the promise on the app's store page,
marked "(assumed)" in the header, and the stores' rules. Voice and Words findings then cite the
swap, hand and field tests only, and the Assumptions line says the voice check is limited until
voice rules are sent.

For a store page, the material is every text field `page.mjs` saved: name, subtitle, description and
what's new. For "the listing you wrote", it is the proposed fields of `store-listing.md`. Material that
could only partly be read word for word is still reviewed: review what was read, deliver, and name
the part not reviewed under Assumptions.

## The tests on the whole (Marty Neumeier, *The Brand Gap*)
- **Swap:** put a competitor's name on it (a rival named in `messaging-house.md`, else one from the
  saved store page's "Similar apps"). If it works as well, it is not distinctive yet.
- **Hand:** cover the name and logo. If you cannot tell who is talking, the voice is not distinctive.
- **Field:** after reading, could the audience say what the app is and why it matters? If not, the
  concept was not communicated.

Write each as pass, fails or partly, with one sentence of why.

## Severity
- **high:** the wrong promise, a claim the stores or advertising rules would reject, or so off-brand
  it reads as another company.
- **medium:** voice or message drift a regular user would notice; an absolute promise the app cannot keep.
- **low:** polish: a word on the avoid list, punctuation, a near miss.

## Writing a finding (how the public teardowns do it: Landing Doctor, Market Curve)
Quote the line exactly as it is in the material saved for this job (the page `page.mjs` saved, the
request, the attached file or `store-listing.md`); say what it does to the reader; name the rule;
write the fix out in full, ready to paste (a fix to a store field fits that field's limit). For
something missing, quote the nearest line and say in Problem what is missing. Rank by what most changes how people see the brand; "Fix first" names the top
three. A fix never adds a fact, number or feature the material or the lead did not give.
