---
name: bot-001-page-cro
description: Analyzes marketing pages across 7 CRO dimensions and provides prioritized conversion recommendations. Use when auditing homepages, landing pages, pricing pages, or feature pages for conversion issues.
metadata:
  author: sl8
  version: 1.0.0
  bot: BOT-001
---

# Page Conversion Rate Optimization (CRO)

## Purpose

Analyze any marketing page and provide actionable recommendations to improve conversion rates. Use this skill for homepages, landing pages, pricing pages, feature pages, blog posts, and about pages. This is the foundational CRO skill -- for signup flows, use `skills/bot-001-signup-flow-cro/SKILL.md`; for post-signup activation, use `skills/bot-001-onboarding-cro/SKILL.md`; for standalone forms, use `skills/bot-001-form-cro/SKILL.md`; for popups/modals, use `skills/bot-001-popup-cro/SKILL.md`.

## Instructions

### Step 1: Initial Assessment

Before analyzing, identify these three things:

1. **Page Type** -- Homepage, landing page, pricing, feature, blog, about, or other
2. **Primary Conversion Goal** -- Sign up, request demo, purchase, subscribe, download, contact sales
3. **Traffic Context** -- Where visitors come from (organic, paid, email, social)

If you have access to product marketing context or brand guidelines, read those first to avoid redundant questions.

### Step 2: Run the 7-Dimension Analysis Framework

Analyze the page across these dimensions, in order of impact:

#### Dimension 1: Value Proposition Clarity (Highest Impact)

Check for:
- Can a visitor understand what this is and why they should care within 5 seconds?
- Is the primary benefit clear, specific, and differentiated?
- Is it written in the customer's language (not company jargon)?

Common issues to flag:
- Feature-focused instead of benefit-focused messaging
- Too vague or too clever (sacrificing clarity for creativity)
- Trying to say everything instead of the most important thing

#### Dimension 2: Headline Effectiveness

Evaluate:
- Does the headline communicate the core value proposition?
- Is it specific enough to be meaningful?
- Does it match the traffic source's messaging (ad-to-page consistency)?

Strong headline patterns to recommend:
- Outcome-focused: "Get [desired outcome] without [pain point]"
- Specificity: Include numbers, timeframes, or concrete details
- Social proof: "Join 10,000+ teams who..."

#### Dimension 3: CTA Placement, Copy, and Hierarchy

Primary CTA assessment:
- Is there one clear primary action?
- Is it visible without scrolling (above the fold)?
- Does the button copy communicate value, not just action?
  - Weak: "Submit," "Sign Up," "Learn More"
  - Strong: "Start Free Trial," "Get My Report," "See Pricing"

CTA hierarchy:
- Is there a logical primary vs. secondary CTA structure?
- Are CTAs repeated at key decision points throughout the page?

#### Dimension 4: Visual Hierarchy and Scannability

Check:
- Can someone scanning get the main message without reading every word?
- Are the most important elements visually prominent?
- Is there enough white space to avoid overwhelm?
- Do images support or distract from the message?

#### Dimension 5: Trust Signals and Social Proof

Types to look for (and recommend adding if missing):
- Customer logos (especially recognizable ones)
- Testimonials (specific, attributed, with photos)
- Case study snippets with real numbers ("Increased revenue 40% in 3 months")
- Review scores and counts (G2, Capterra, Trustpilot)
- Security badges (where relevant -- checkout, data-sensitive products)

Placement principle: Near CTAs and immediately after benefit claims.

#### Dimension 6: Objection Handling

Common objections every page should address:
- Price/value concerns ("Is this worth it?")
- Fit concerns ("Will this work for my situation?")
- Implementation difficulty ("Is this hard to set up?")
- Risk concerns ("What if it doesn't work?")

Address through: FAQ sections, guarantees, comparison content, process transparency, free trials.

#### Dimension 7: Friction Points

Look for:
- Too many form fields for the conversion goal
- Unclear next steps after clicking a CTA
- Confusing navigation that distracts from the primary goal
- Required information that shouldn't be required at this stage
- Poor mobile experience (tiny buttons, horizontal scroll, slow load)
- Slow page load times

### Step 3: Apply Page-Specific Frameworks

Use the appropriate sub-framework based on page type:

**Homepage CRO:**
- Clear positioning for cold visitors who know nothing about you
- Quick path to the most common conversion action
- Handle both "ready to buy" and "still researching" visitors with primary and secondary CTAs

**Landing Page CRO:**
- Message match with traffic source (ad copy should match headline)
- Single CTA focus (remove navigation if possible)
- Complete argument on one page -- don't send people elsewhere

**Pricing Page CRO:**
- Clear plan comparison with feature matrix
- Recommended plan indication ("Most Popular" badge)
- Address "which plan is right for me?" anxiety with a quiz or guidance
- Annual vs. monthly toggle with savings highlighted

**Feature Page CRO:**
- Connect every feature to a tangible benefit
- Include use cases and real examples
- Clear path to try or buy from each feature section

**Blog Post CRO:**
- Contextual CTAs matching the content topic (not generic site CTAs)
- Inline CTAs at natural stopping points (after key insights, at section breaks)
- Floating or sticky CTA for longer posts

### Step 4: Structure Recommendations

Organize all findings into these four categories:

1. **Quick Wins (Implement Now)** -- Easy changes with likely immediate impact (copy changes, CTA rewording, adding trust badges)
2. **High-Impact Changes (Prioritize)** -- Bigger changes requiring more effort but significant conversion improvement (page restructure, new sections, redesigned hero)
3. **Test Ideas** -- Hypotheses worth A/B testing rather than assuming (headline variations, CTA placement, social proof formats)
4. **Copy Alternatives** -- For key elements (headlines, subheads, CTAs), provide 2-3 specific alternatives with rationale for each

## Inputs

- The page URL or page content/screenshot to analyze
- Page type (homepage, landing page, pricing, feature, blog)
- Primary conversion goal (what action you want visitors to take)
- Traffic sources (where visitors come from)
- Current conversion rate and goal (if available)
- Any existing user research, heatmaps, or session recordings
- What has already been tried

## Outputs

A structured CRO analysis document containing:

1. **Page Assessment Summary** -- Page type, conversion goal, traffic context
2. **7-Dimension Analysis** -- Findings for each dimension with specific issues identified
3. **Quick Wins** -- Immediately actionable changes
4. **High-Impact Changes** -- Prioritized bigger improvements
5. **Test Ideas** -- A/B test hypotheses with expected outcomes
6. **Copy Alternatives** -- 2-3 options for headlines, CTAs, and key copy elements

Save output to: `work/page-cro-audit-[page-name].md`

## Examples

### Example Input
"Analyze our homepage at example.com. We're a project management tool for remote teams. Primary goal is free trial signups. Most traffic comes from Google Ads and organic search. Current conversion rate is 2.1%, goal is 4%."

### Example Quick Win Output
```
**Quick Win: Rewrite CTA button copy**
- Current: "Get Started"
- Recommended: "Start Your Free Trial"
- Rationale: Communicates the value (free trial) rather than a generic action.
  Research shows value-communicating CTAs outperform generic ones by 10-30%.
```

### Example Test Idea Output
```
**Test: Hero section social proof**
- Variant A (Control): Current hero with no social proof
- Variant B: Add "Trusted by 5,000+ remote teams" with 3 customer logos below headline
- Hypothesis: Adding social proof above the fold will increase trial signups by 15-25%
  because remote team leads rely heavily on peer validation.
- Metric: Free trial signup rate
- Duration: 2 weeks minimum, 1,000 visitors per variant
```

## Experiment Ideas by Page Type

### Homepage Experiments

**Hero Section:**
| Test | Hypothesis |
|------|------------|
| Headline variations | Specific vs. abstract messaging drives different conversion rates |
| Subheadline clarity | Adding/refining subheadline to support headline improves comprehension |
| CTA above fold | Including prominent CTA above fold vs. below increases conversions |
| Hero visual format | Screenshot vs. GIF vs. illustration vs. video -- each has different engagement |
| CTA button color | Higher contrast color improves visibility and clicks |
| CTA button text | "Start Free Trial" vs. "Get Started" vs. "See Demo" -- value-oriented wins |
| Interactive demo | Engaging visitors immediately with product experience reduces bounce |

**Trust and Social Proof:**
| Test | Hypothesis |
|------|------------|
| Logo placement | Hero section vs. below fold -- closer to CTA may improve conversion |
| Case study in hero | Showing results immediately builds confidence faster |
| Trust badges | Adding security, compliance, awards badges reduces anxiety |
| Social proof in headline | "Join 10,000+ teams" messaging creates belonging |
| Testimonial placement | Above fold vs. dedicated section -- proximity to decision point matters |
| Video testimonials | More engaging and credible than text quotes |

**Features and Content:**
| Test | Hypothesis |
|------|------------|
| Feature presentation | Icons + brief descriptions vs. detailed sections |
| Section ordering | Moving high-value features up increases engagement before drop-off |
| Secondary CTAs | Adding/removing CTAs throughout page affects scroll-to-convert |
| Benefit vs. feature focus | Leading with outcomes outperforms leading with capabilities |
| Comparison section | Showing vs. competitors or status quo helps decision-making |

**Navigation and UX:**
| Test | Hypothesis |
|------|------------|
| Sticky navigation | Persistent nav with CTA keeps conversion path visible |
| Nav CTA button | Adding prominent button in nav increases overall conversion |
| Exit intent popup | Capturing abandoning visitors recovers lost conversions |

### Pricing Page Experiments

**Price Presentation:**
| Test | Hypothesis |
|------|------------|
| Annual vs. monthly display | Highlighting savings or simplifying choice |
| Price points | $99 vs. $97 psychological pricing |
| "Most Popular" badge | Highlighting target plan increases selection rate |
| Number of tiers | 3 vs. 4 vs. 2 visible options -- choice overload vs. coverage |
| Price anchoring | Ordering plans to anchor expectations (high-to-low vs. low-to-high) |

**Objection Handling:**
| Test | Hypothesis |
|------|------------|
| FAQ section | Directly addressing pricing objections reduces abandonment |
| ROI calculator | Demonstrating value vs. cost converts price-sensitive visitors |
| Money-back guarantee | Prominent placement reduces purchase anxiety |
| Competitor comparison | Side-by-side value comparison wins on differentiation |

### Landing Page Experiments

**Message Match:**
| Test | Hypothesis |
|------|------------|
| Headline matching | Matching ad copy exactly improves continuity and conversion |
| Visual matching | Matching ad creative maintains visitor confidence |
| Audience-specific pages | Different pages per segment outperform one-size-fits-all |

**Conversion Focus:**
| Test | Hypothesis |
|------|------------|
| Navigation removal | Single-focus page without nav increases conversion |
| CTA repetition | Multiple CTAs throughout long pages captures different scroll depths |
| Form vs. button | Direct capture vs. click-through -- depends on commitment level |
| Social proof density | More proof near CTAs reduces decision anxiety |
| Video inclusion | Explaining offer with video increases understanding and conversion |

### Cross-Page Experiments

| Test | Hypothesis |
|------|------------|
| Chat widget | Live support availability increases visitor confidence |
| Page load speed | Every second of load time reduces conversions by ~7% |
| Mobile experience | Responsive optimization captures growing mobile traffic |
| Personalization | Dynamic content by segment increases relevance and conversion |

## Quality Criteria

- Every recommendation is specific and actionable (not "improve the headline" but "change headline from X to Y because Z")
- Recommendations are prioritized by expected impact, not listed randomly
- Copy alternatives include rationale explaining why each option should work
- Test ideas include clear hypotheses, variants, metrics, and minimum sample sizes
- Analysis covers all 7 dimensions of the framework
- Page-specific framework is correctly applied based on page type
- Recommendations account for traffic source and visitor intent

See also: `skills/bot-001-signup-flow-cro/SKILL.md`, `skills/bot-001-form-cro/SKILL.md`, `skills/bot-001-popup-cro/SKILL.md`, `skills/bot-001-onboarding-cro/SKILL.md`
