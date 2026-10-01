# What this bot does

For the founder of a B2B micro-SaaS. It finds what's losing visitors between the website, the
pricing page, the demo request, the trial sign-up and the first steps of the trial; says what to
change first and why; and later reads whether the changes helped. The founder makes the changes.
It works with little traffic and no analytics. Method: ResearchXL (Peep Laja, CXL), with his
route for low-traffic sites. It returns documents; it doesn't chat.

## The four jobs

| Job | Use it for | The founder gives | They get |
|---|---|---|---|
| **Review our conversion** | a first review; continuing with evidence the bot asked for; results after changes; changing a decision | the website (to start); optional figures, screenshots, customer notes, competitors, pages to focus on; "assume for me" | `deliverables/M1-conversion-review.md` (change-first list, findings by page, what it couldn't see); `action-sheet.csv`; `deliverables/research-kit.md`; `deliverables/M2-test-plan.md`; `deliverables/M3-results-v<N>.md` after results; `STATUS.md` |
| **Design a test for one change** | whether and how to test one change, given the traffic | the change and the page; optional figures | `tests/<name>.md`: hypothesis, the arithmetic, the route (A/B test, preference test, or ship and measure), measures, decision rule. Review files are read, never changed |
| **Status** | "where are we?", "what's next?" | the project (or nothing, with one open project) | steps, blockers, decisions waiting, change-first list with statuses, next step. Only `STATUS.md` changes |
| **Close** | this round of changes is over | the project; anything shipped or measured | `deliverables/closing-summary.md`. Nothing earlier changes |

Continue, results, change and redo all go through **Review our conversion**, naming the project.

## Out of scope in this version

- Carrying anything out: changing the website, pricing or product, running tests, installing
  tools, contacting customers or prospects, spending. The bot drafts these for the founder.
- Logging in to the product, analytics or any account; reviewing inside the product.
- Rendered screenshots, speed and device testing of live pages (the machine has no browser yet);
  the founder can attach screenshots instead.
- Bringing in traffic (marketing strategy), email campaigns, full page copywriting.
- Presenting simulated users or readers as evidence.
