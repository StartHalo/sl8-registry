# Method: reviewing the trial path

ResearchXL (Peep Laja, CXL; restated by Speero, Emma Travis, 2022-02-03), done from outside the
product: the steps that need data or people become kit items. Bowling Alley (Wes Bush, ProductLed,
2022-04-20) for the steps after sign-up. Ported from the v12 build's references and cut to one job.

## 1. Map the path (Bowling Alley)
Start at the home page's main sign-up, trial or demo button (or the path the founder gave) and
follow it as far as public pages go. Label each step:

| Label | Means | Usual change |
|---|---|---|
| green | needed to reach the first useful result | keep; make it faster |
| yellow | useful, but can wait until after first value (phone, company size, a tour) | move it later |
| red | not needed at all | remove it |
| not seen | inside the product, or not public | a kit item: screenshots of the first three screens |

Test each step: "does the buyer need this to see the product work for them?" Measures Bush ties to
this path: activation (reaching first value), time to value, free-to-paid.

## 2. The ResearchXL steps, from outside
| Step | How this job does it |
|---|---|
| Technical | from `fetch-pages.mjs` facts: calls to action that resolve (a link whose address page script sets has none in the HTML: say so); forms with their fields, required marks, captcha and a submit; several labels or URLs for one action; a viewport tag; leftover template text; each page its own title. Rate the return on fixing: main path and cheap is high |
| Heuristic | the five lenses below, page by page: one row per lens ("Heuristic: relevance" …), each quoting the words it rests on, or "not judged: <why>" |
| Digital analytics | only the founder's figures: place them on the path (which step loses most); never invent a rate |
| Mouse tracking | not done: kit item "Recording setup" |
| Qualitative | the customer voice the founder sent (quote it); otherwise kit item "Interview script" |
| User testing | not done: kit item "Five-user test"; never simulate users |

## 3. The five lenses (heuristic analysis)
Opinions to confirm later ("areas of interest"), judged from a busy buyer's side:
- **Relevance:** does the headline name the buyer's problem in their words?
- **Clarity:** is it clear what this is, who it is for and what to do next? One main action per page; the next step named ("Start a 14-day trial" beats "Get started").
- **Value:** why this, why now: outcomes, the price or how pricing works, proof next to the claim.
- **Friction:** fields beyond email and one qualifying question (from the form's fields and required marks); a captcha, or a submit that stays disabled until page script enables it; card required; no answer to setup effort, switching, data security, contract length.
- **Distraction:** competing calls to action, navigation on the sign-up page, several offers of equal weight.

Page by page: home (relevance, clarity), pricing (value, friction), sign-up or demo form (friction:
count the fields), the first steps after sign-up (Bowling Alley).

## 4. Buckets (one per change)
| Bucket | When |
|---|---|
| Just Do It | the fix is obvious, cheap and cannot plausibly hurt (a broken link, a field nobody needs, a missing price) |
| Test | a real chance to change behaviour **and** the founder's figures reach the medium tier (784+ conversions in 4 weeks, Speero 2026). Never when traffic was not given |
| Instrument | something is not measured, or the figures cannot be trusted |
| Hypothesize | a real problem with no single obvious fix: try options one at a time, ship and measure |
| Investigate | cannot judge yet: needs a screenshot, a figure or the customer's words (name the kit item) |

At low or unknown traffic, what would be tested becomes Just Do It (safe and obvious) or Hypothesize
(a bigger bet), measured before and after; the test design job plans that.

## 5. Order: PXL
Score every change with [pxl.md](pxl.md) and order by total, highest first. A sheet where every
change scores the same has not been prioritised: check the ease and evidence columns again.

## 6. What this review cannot show
Always list: speed and Core Web Vitals; how pages look on a phone; what is above the fold; anything
built by script after the page loads (a thin page in the fetch facts); every screen after sign-up
not supplied. Name what would settle each (a screenshot, the founder's speed test).
