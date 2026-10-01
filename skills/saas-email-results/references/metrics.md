# Campaign metrics

| Metric | How it's counted | How to read it |
|---|---|---|
| Conversion | the campaign's conversion event (demo booked, trial started, reply) ÷ delivered | The measure of success. Litmus's workflow makes it the primary metric |
| Click rate | unique clickers ÷ delivered | Interest in the ask; compare emails within the campaign |
| Reply rate | replies ÷ delivered | Strong signal for founder-sent B2B email |
| Unsubscribe rate | unsubscribes ÷ delivered | Above about 1% on one email: wrong segment, wrong message or too frequent (Litmus) |
| Spam complaints | complaints ÷ delivered | Keep under 0.3% (Google, Yahoo requirement); 0.1% is the warning line |
| Bounce rate | bounces ÷ sent | Above about 2%: clean the list before the next send (Litmus) |
| Opens | opens ÷ delivered | Report only. Apple Mail Privacy Protection preloads images, so opens are counted that never happened (Mailchimp, Postmark, Litmus) |

## Small lists

A micro-SaaS list is often a few hundred people. With fewer than about 100 recipients per email
or variant, one or two conversions decide the rate, so differences between emails or subject
lines are usually chance. Say so, and prefer changes that the goal and the replies support over
"email 2 beat email 3".

## General ranges (for context only, never a target)

Mailchimp's benchmarks across all its users (updated 2023-12, older than 12 months; opens
affected by Apple MPP): click rate about 2.6%, unsubscribe about 0.2%. No independent benchmark
for B2B SaaS demo-booked or reply rates was found; track the founder's own baseline instead.

## One change, one hypothesis

From Kath Pay's holistic email marketing: state the hypothesis, change one thing, record the
result, and use what you learn in the next campaign.
