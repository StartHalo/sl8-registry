---
name: bot-001-ab-test-setup
description: Plans, designs, and documents statistically valid A/B tests with proper hypothesis, sample size, and metrics. Use when designing experiments or validating conversion hypotheses.
metadata:
  author: sl8
  version: 1.0.0
  bot: BOT-001
---

# A/B Test Setup

## Purpose

Plan, design, and document A/B tests and experiments that produce statistically valid, actionable results. Use this skill when setting up split tests, multivariate tests, or any controlled experiment on marketing pages, paywalls, pricing, or product flows.

## Instructions

### Step 1: Gather Test Context

Before designing any test, understand:

1. **What are you trying to improve?** -- Identify the specific page, flow, or element.
2. **What change are you considering and why?** -- What data or observation suggests this change?
3. **Baseline conversion rate** -- What is the current rate for the primary metric?
4. **Traffic volume** -- How many daily visitors reach this page or flow?
5. **Technical constraints** -- What tools are available? Client-side or server-side implementation?
6. **Timeline** -- When do you need results?
7. **Previous tests** -- Have you tested this area before? What were the results?

### Step 2: Write a Strong Hypothesis

Use this structure:

```
Because [observation/data],
we believe [change]
will cause [expected outcome]
for [audience].
We'll know this is true when [metrics].
```

**Weak hypothesis:** "Changing the button color might increase clicks."

**Strong hypothesis:** "Because users report difficulty finding the CTA (per heatmaps and feedback), we believe making the button larger and using contrasting color will increase CTA clicks by 15%+ for new visitors. We'll measure click-through rate from page view to signup start."

Rules for good hypotheses:
- Based on a specific observation or data point, not just "let's see what happens"
- Predicts a specific outcome with a direction (increase/decrease)
- Names the audience affected
- Defines measurable success criteria

### Step 3: Choose the Test Type

| Type | Description | Traffic Needed | When to Use |
|------|-------------|----------------|-------------|
| A/B | Two versions, single change | Moderate | Default for most tests |
| A/B/n | Multiple variants | Higher | Testing 3+ variations of one element |
| MVT (Multivariate) | Multiple changes in combinations | Very high | Testing interactions between elements |
| Split URL | Different URLs for variants | Moderate | Major layout or page redesigns |

**Default recommendation:** Start with a standard A/B test. Only use A/B/n or MVT when you have sufficient traffic and a clear reason.

### Step 4: Calculate Sample Size

#### Quick Reference Tables

**Conversion Rate: 1%**

| Lift to Detect | Sample per Variant | Total Sample |
|----------------|-------------------|--------------|
| 10% (1% to 1.1%) | 380,000 | 760,000 |
| 20% (1% to 1.2%) | 97,000 | 194,000 |
| 50% (1% to 1.5%) | 16,000 | 32,000 |
| 100% (1% to 2%) | 4,200 | 8,400 |

**Conversion Rate: 3%**

| Lift to Detect | Sample per Variant | Total Sample |
|----------------|-------------------|--------------|
| 10% (3% to 3.3%) | 120,000 | 240,000 |
| 20% (3% to 3.6%) | 31,000 | 62,000 |
| 50% (3% to 4.5%) | 5,200 | 10,400 |
| 100% (3% to 6%) | 1,400 | 2,800 |

**Conversion Rate: 5%**

| Lift to Detect | Sample per Variant | Total Sample |
|----------------|-------------------|--------------|
| 10% (5% to 5.5%) | 72,000 | 144,000 |
| 20% (5% to 6%) | 18,000 | 36,000 |
| 50% (5% to 7.5%) | 3,100 | 6,200 |
| 100% (5% to 10%) | 810 | 1,620 |

**Conversion Rate: 10%**

| Lift to Detect | Sample per Variant | Total Sample |
|----------------|-------------------|--------------|
| 10% (10% to 11%) | 34,000 | 68,000 |
| 20% (10% to 12%) | 8,700 | 17,400 |
| 50% (10% to 15%) | 1,500 | 3,000 |
| 100% (10% to 20%) | 400 | 800 |

**Conversion Rate: 20%**

| Lift to Detect | Sample per Variant | Total Sample |
|----------------|-------------------|--------------|
| 10% (20% to 22%) | 16,000 | 32,000 |
| 20% (20% to 24%) | 4,000 | 8,000 |
| 50% (20% to 30%) | 700 | 1,400 |
| 100% (20% to 40%) | 200 | 400 |

All tables assume 95% confidence (alpha = 0.05) and 80% power (beta = 0.20).

#### Required Inputs for Calculation
1. **Baseline conversion rate** -- your current rate
2. **Minimum detectable effect (MDE)** -- smallest change worth detecting
3. **Statistical significance level** -- usually 95%
4. **Statistical power** -- usually 80%

Set MDE based on: business impact (is a 5% lift meaningful?), implementation cost (worth the effort?), and realistic expectations (what have past tests shown?).

#### Duration Calculation

```
Duration (days) = (Sample per variant x Number of variants) / (Daily traffic x % exposed)
```

**Example:** Need 10,000 per variant, 2 variants, 5,000 daily visitors, 100% exposed = 20,000 / 5,000 = **4 days**.

**Minimum duration rules** -- even with sufficient sample size:
- At least 1 full week to capture day-of-week variation
- At least 2 business cycles if B2B (weekday vs. weekend patterns)
- Through paydays if e-commerce (beginning/end of month)

**Maximum duration:** Avoid running tests longer than 4-8 weeks (novelty effects wear off, external factors intervene).

#### Adjusting for Multiple Variants

| Variants | Sample Size Multiplier |
|----------|----------------------|
| 2 (A/B) | 1x |
| 3 (A/B/C) | ~1.5x |
| 4 (A/B/C/D) | ~2x |
| 5+ | Consider reducing variants |

Apply Bonferroni correction or use tools that handle this automatically.

#### When Sample Size Requirements Are Too High

Options when you cannot get enough traffic:
1. Increase MDE -- accept only detecting larger effects (20%+ lift)
2. Lower confidence -- use 90% instead of 95% (document this decision)
3. Reduce variants -- test only the most promising variant
4. Combine traffic -- test across multiple similar pages
5. Test upstream -- test earlier in funnel where traffic is higher
6. Do not test -- make decision based on qualitative data instead
7. Run a longer test -- accept longer duration

#### Online Calculators
- Evan Miller: https://www.evanmiller.org/ab-testing/sample-size.html
- Optimizely: https://www.optimizely.com/sample-size-calculator/
- AB Test Guide: https://www.abtestguide.com/calc/
- VWO Duration: https://vwo.com/tools/ab-test-duration-calculator/

### Step 5: Define Metrics

**Primary Metric** -- Single metric that matters most. Directly tied to hypothesis. This is what you use to call the test.

**Secondary Metrics** -- Support primary metric interpretation. Explain why or how the change worked.

**Guardrail Metrics** -- Things that should not get worse. Stop the test if significantly negative.

**Example for a Pricing Page Test:**
- Primary: Plan selection rate
- Secondary: Time on page, plan distribution, average revenue per visitor
- Guardrail: Support tickets, refund rate

### Step 6: Design Variants

What to vary:

| Category | Examples |
|----------|----------|
| Headlines/Copy | Message angle, value prop, specificity, tone |
| Visual Design | Layout, color, images, hierarchy |
| CTA | Button copy, size, placement, number of CTAs |
| Content | Information included, order, amount, social proof |

Best practices:
- Single, meaningful change per test
- Bold enough to make a detectable difference
- True to the hypothesis

See also: `skills/bot-001-copywriting/SKILL.md` for creating variant copy.

### Step 7: Set Traffic Allocation

| Approach | Split | When to Use |
|----------|-------|-------------|
| Standard | 50/50 | Default for A/B tests |
| Conservative | 90/10 or 80/20 | Limit risk of a bad variant |
| Ramping | Start small, increase | Technical risk mitigation |

Ensure: users see the same variant on return visits (consistency), and exposure is balanced across time of day and day of week.

### Step 8: Run the Pre-Launch Checklist

- [ ] Hypothesis documented
- [ ] Primary metric defined and trackable
- [ ] Sample size calculated
- [ ] Test duration estimated
- [ ] Variants implemented correctly
- [ ] Tracking verified in all variants
- [ ] QA completed on all variants (desktop and mobile)
- [ ] Stakeholders informed
- [ ] Calendar hold for analysis date

### Step 9: Monitor During the Test

**DO:**
- Monitor for technical issues (broken tracking, page errors)
- Check segment quality (even distribution)
- Document external factors (marketing campaigns, outages, holidays)

**DO NOT:**
- Peek at results and stop early (the peeking problem leads to false positives)
- Make changes to variants mid-test
- Add traffic from new sources

**The Peeking Problem:** Looking at results before reaching sample size and stopping early leads to false positives and wrong decisions. Pre-commit to sample size and trust the process. If you must check early, use sequential testing tools (Optimizely Stats Accelerator, VWO SmartStats, PostHog Bayesian approach).

### Step 10: Analyze Results

**Statistical Significance:** 95% confidence = p-value < 0.05. Means less than 5% chance the result is random. Not a guarantee -- just a threshold.

**Analysis Checklist:**
1. Did you reach sample size? If not, result is preliminary.
2. Is it statistically significant? Check confidence intervals.
3. Is the effect size meaningful? Compare to MDE and project business impact.
4. Are secondary metrics consistent? Do they support the primary?
5. Any guardrail concerns? Did anything get worse?
6. Segment differences? Mobile vs. desktop? New vs. returning?

**Interpreting Results:**

| Result | Action |
|--------|--------|
| Significant winner | Implement the variant |
| Significant loser | Keep control, document why |
| No significant difference | Need more traffic or bolder test |
| Mixed signals | Dig deeper, analyze by segment |

## Documentation Templates

### Test Plan Template

```markdown
# A/B Test: [Name]

## Overview
- **Owner**: [Name]
- **Test ID**: [ID in testing tool]
- **Page/Feature**: [What is being tested]
- **Planned dates**: [Start] - [End]

## Hypothesis
Because [observation/data],
we believe [change]
will cause [expected outcome]
for [audience].
We'll know this is true when [metrics].

## Test Design
| Element | Details |
|---------|---------|
| Test type | A/B / A/B/n / MVT |
| Duration | X weeks |
| Sample size | X per variant |
| Traffic allocation | 50/50 |
| Tool | [Tool name] |
| Implementation | Client-side / Server-side |

## Variants

### Control (A)
[Screenshot]
- Current experience
- [Key details about current state]

### Variant (B)
[Screenshot or mockup]
- [Specific change #1]
- [Specific change #2]
- Rationale: [Why we think this will win]

## Metrics
### Primary
- **Metric**: [metric name]
- **Current baseline**: [X%]
- **MDE**: [X%]

### Secondary
- [Metric 1]: [what it tells us]
- [Metric 2]: [what it tells us]

### Guardrails
- [Metric that should not get worse]

## Success Criteria
- Winner: Primary metric improves by X% with 95% confidence
- Loser: Primary metric decreases significantly
- Inconclusive: [What we will do if no significant result]

## Pre-Launch Checklist
- [ ] Hypothesis documented and reviewed
- [ ] Primary metric defined and trackable
- [ ] Sample size calculated
- [ ] Variants implemented correctly
- [ ] Tracking verified in all variants
- [ ] QA completed
- [ ] Stakeholders informed
```

### Results Documentation Template

```markdown
# A/B Test Results: [Name]

## Summary
| Element | Value |
|---------|-------|
| Test ID | [ID] |
| Dates | [Start] - [End] |
| Duration | X days |
| Result | Winner / Loser / Inconclusive |
| Decision | [What we are doing] |

## Results

### Primary Metric: [Name]
| Variant | Value | 95% CI | vs. Control |
|---------|-------|--------|-------------|
| Control | X% | [X%, Y%] | -- |
| Variant | X% | [X%, Y%] | +X% |

**Statistical significance**: p = X.XX
**Practical significance**: [Is this lift meaningful?]

### Secondary Metrics
| Metric | Control | Variant | Change | Significant? |
|--------|---------|---------|--------|--------------|
| [Metric 1] | X | Y | +Z% | Yes/No |

### Guardrail Metrics
| Metric | Control | Variant | Change | Concern? |
|--------|---------|---------|--------|----------|
| [Metric 1] | X | Y | +Z% | Yes/No |

## Interpretation
### What happened?
[Explanation in plain language]

### Why do we think this happened?
[Analysis and reasoning]

## Decision
**Action**: [Implement variant / Keep control / Re-test]
**Timeline**: [When changes will be implemented]

## Learnings
- [Key insight 1]
- [Key insight 2]
- [Follow-up test idea]
```

### Quick Test Brief (for simple tests)

```markdown
## [Test Name]
**What**: [One sentence description]
**Why**: [One sentence hypothesis]
**Metric**: [Primary metric]
**Duration**: [X weeks]
**Result**: [TBD / Winner / Loser / Inconclusive]
**Learnings**: [Key takeaway]
```

### Experiment Prioritization Scorecard

| Factor | Weight | Test A | Test B | Test C |
|--------|--------|--------|--------|--------|
| Potential impact | 30% | | | |
| Confidence in hypothesis | 25% | | | |
| Ease of implementation | 20% | | | |
| Risk if wrong | 15% | | | |
| Strategic alignment | 10% | | | |
| **Total** | | | | |

Scoring: 1-5 (5 = best).

### Hypothesis Bank Template

| ID | Page/Area | Observation | Hypothesis | Potential Impact | Status |
|----|-----------|-------------|------------|------------------|--------|
| H1 | Homepage | Low scroll depth | Shorter hero will increase scroll | High | Backlog |
| H2 | Pricing | Users compare plans | Comparison table will help | Medium | Testing |

### Quick Decision Framework

```
Daily traffic to page: _____
Baseline conversion rate: _____
MDE I care about: _____

Sample needed per variant: _____ (from tables above)
Days to run: Sample / Daily traffic = _____

If days > 60: Consider alternatives (do not test, increase MDE, etc.)
If days 30-60: Acceptable for high-impact tests only
If days 14-30: Feasible
If days < 14: Easy to run, but still run at least 1 full week
```

## Common Mistakes

### Test Design Mistakes
- Testing too small a change (undetectable difference)
- Testing too many things at once (cannot isolate what worked)
- No clear hypothesis (just "let's see what happens")

### Execution Mistakes
- Stopping early because results "look significant"
- Changing variant content mid-test
- Not checking implementation quality before launch

### Analysis Mistakes
- Ignoring confidence intervals and focusing only on point estimates
- Cherry-picking segments that show a winner
- Over-interpreting inconclusive results as "trending toward" a winner

## Inputs

- Page or flow to test
- Current conversion rate (baseline)
- Daily traffic volume
- The proposed change and reasoning behind it
- Available testing tools (PostHog, Optimizely, VWO, LaunchDarkly, etc.)
- Previous test results for this area (if any)

## Outputs

- Completed test plan document (using template above)
- Sample size calculation with duration estimate
- Hypothesis statement
- Metrics definition (primary, secondary, guardrail)
- Pre-launch checklist
- After test completion: results document with decision and learnings

Save outputs to `work/ab-tests/` with descriptive filenames.

## Examples

**Example 1: Pricing Page Headline Test**

Hypothesis: "Because heatmap data shows only 40% of visitors scroll past the hero section, we believe a more specific headline stating the dollar savings will increase plan selection rate by 15% for organic traffic visitors. We will measure plan selection rate as the primary metric and time-on-page as secondary."

- Test type: A/B
- Control: "Simple pricing for every team"
- Variant: "Save 10+ hours per week -- plans from $29/mo"
- Primary metric: Plan selection rate (baseline: 8%)
- MDE: 15% relative lift (8% to 9.2%)
- Sample needed: ~18,000 per variant
- Daily traffic: 1,200
- Duration: 30 days
- Guardrail: Support ticket volume, bounce rate

**Example 2: Paywall CTA Test**

Hypothesis: "Because our current CTA 'Upgrade Now' is generic, we believe a value-specific CTA 'Unlock Unlimited Projects' will increase paywall click-through by 20% for free users hitting the project limit."

- Test type: A/B
- Control: "Upgrade Now"
- Variant: "Unlock Unlimited Projects"
- Primary metric: Paywall CTR (baseline: 12%)
- Sample needed: ~4,000 per variant
- Duration: 2 weeks

## Quality Criteria

- Hypothesis follows the "Because... we believe... will cause... We'll know when..." structure
- Sample size is calculated before the test starts (not after)
- Primary metric is clearly defined with a baseline and MDE
- At least one guardrail metric is defined
- Test duration respects minimum rules (at least 1 full week)
- Pre-launch checklist is completed before going live
- Results document includes plain-language interpretation, not just numbers
- Decision and follow-up actions are documented

See also: `skills/bot-001-paywall-upgrade-cro/SKILL.md` for paywall-specific test ideas, `skills/bot-001-copywriting/SKILL.md` for writing variant copy.
