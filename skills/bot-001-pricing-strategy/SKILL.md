---
name: bot-001-pricing-strategy
description: Advises on pricing, packaging, tier structure, and monetization strategy. Use when making pricing decisions, designing tiers, or planning price changes.
metadata:
  author: sl8
  version: 1.0.0
  bot: BOT-001
---

# Pricing Strategy

## Purpose

Design and optimize SaaS pricing, packaging, and monetization strategy. Use this skill when working on pricing decisions, tier structure, freemium vs. free trial models, value metrics, price increases, or willingness-to-pay research. This skill covers the strategic side of pricing -- for optimizing how the pricing page converts visitors, see also: `skills/bot-001-paywall-upgrade-cro/SKILL.md` for in-app upgrade screens and `skills/bot-001-copywriting/SKILL.md` for pricing page copy.

## Instructions

### Step 1: Gather Business Context

Before making pricing recommendations, collect:

**Business Context:**
- Product type (SaaS, marketplace, e-commerce, service)
- Current pricing (if any)
- Target market (SMB, mid-market, enterprise)
- Go-to-market motion (self-serve, sales-led, hybrid)

**Value and Competition:**
- Primary value delivered to customers
- Alternatives customers consider (competitors AND status quo like spreadsheets)
- How competitors price

**Current Performance:**
- Current conversion rate (visitor to paid)
- ARPU (average revenue per user) and churn rate
- Feedback on pricing from customers or prospects

**Goals:**
- Optimizing for growth, revenue, or profitability?
- Moving upmarket or expanding downmarket?

### Step 2: Understand the Three Pricing Axes

Every pricing decision involves three axes:

**1. Packaging** -- What is included at each tier?
- Features, limits, support level
- How tiers differ from each other

**2. Pricing Metric** -- What do you charge for?
- Per user, per usage, flat fee
- How price scales with value

**3. Price Point** -- How much do you charge?
- The actual dollar amounts
- Perceived value vs. cost

### Step 3: Apply Value-Based Pricing

Price should be based on value delivered, not cost to serve:

- **Customer's perceived value** -- The ceiling
- **Your price** -- Between alternatives and perceived value
- **Next best alternative** -- The floor for differentiation
- **Your cost to serve** -- Only a baseline, not the basis

**Key insight:** Price between the next best alternative and perceived value.

### Step 4: Choose a Value Metric

The value metric is what you charge for. It should scale with the value customers receive.

**Good value metrics:**
- Align price with value delivered
- Are easy to understand
- Scale as the customer grows
- Are hard to game

**Common value metrics:**

| Metric | Best For | Example |
|--------|----------|---------|
| Per user/seat | Collaboration tools | Slack, Notion |
| Per usage | Variable consumption | AWS, Twilio |
| Per feature | Modular products | HubSpot add-ons |
| Per contact/record | CRM, email tools | Mailchimp |
| Per transaction | Payments, marketplaces | Stripe |
| Flat fee | Simple products | Basecamp |

**Test for a good value metric:** Ask "As a customer uses more of [metric], do they get more value?" If yes, it is a good value metric. If no, price does not align with value.

### Step 5: Design Tier Structure

#### How Many Tiers?

**2 tiers:** Simple, clear choice. Works for clear SMB vs. Enterprise split. Risk: may leave money on the table.

**3 tiers (recommended):** Industry standard. Good tier = entry point. Better tier = recommended (anchor to best). Best tier = high-value customers.

**4+ tiers:** More granularity. Works for wide range of customer sizes. Risk: decision paralysis, complexity.

#### Good-Better-Best Framework

**Good tier (Entry):**
- Purpose: Remove barriers to entry
- Includes: Core features, limited usage
- Price: Low, accessible
- Target: Small teams, try-before-you-buy

**Better tier (Recommended):**
- Purpose: Where most customers land
- Includes: Full features, reasonable limits
- Price: Your "anchor" price
- Target: Growing teams, serious users

**Best tier (Premium):**
- Purpose: Capture high-value customers
- Includes: Everything, advanced features, higher limits
- Price: Premium (often 2-3x "Better")
- Target: Larger teams, power users, enterprises

#### Tier Differentiation Strategies

**Feature gating** -- Basic features in all tiers, advanced features in higher tiers. Works when features have clear value differences.

**Usage limits** -- Same features, different limits (more users, storage, API calls at higher tiers). Works when value scales with usage.

**Support level** -- Email support to Priority support to Dedicated success manager. Works for products with implementation complexity.

**Access and customization** -- API access, SSO, custom branding. Works for enterprise differentiation.

#### Example Tier Structure

```
                  Starter         Pro             Business
                  $29/mo          $79/mo          $199/mo
-----------------------------------------------------------------
Users             Up to 5         Up to 20        Unlimited
Projects          10              Unlimited       Unlimited
Storage           5 GB            50 GB           500 GB
Integrations      3               10              Unlimited
Analytics         Basic           Advanced        Custom
Support           Email           Priority        Dedicated
API Access        No              Yes             Yes
SSO               No              No              Yes
Audit logs        No              No              Yes
```

### Step 6: Package for Personas

**Step 1: Define pricing personas**

| Persona | Size | Needs | WTP | Example Price |
|---------|------|-------|-----|---------------|
| Freelancer | 1 person | Basic features | Low | $19/mo |
| Small Team | 2-10 | Collaboration | Medium | $49/mo |
| Growing Company | 10-50 | Scale, integrations | Higher | $149/mo |
| Enterprise | 50+ | Security, support | High | Custom |

**Step 2: Map features to personas**

| Feature | Freelancer | Small Team | Growing | Enterprise |
|---------|------------|------------|---------|------------|
| Core features | Yes | Yes | Yes | Yes |
| Collaboration | -- | Yes | Yes | Yes |
| Integrations | -- | Limited | Full | Full |
| API access | -- | -- | Yes | Yes |
| SSO/SAML | -- | -- | -- | Yes |
| Custom contract | -- | -- | -- | Yes |

**Step 3: Price to value for each persona.** Research willingness to pay per segment. Set prices that capture value without blocking adoption.

### Step 7: Decide Freemium vs. Free Trial

#### When to Use Freemium

Freemium works when:
- Product has viral or network effects
- Free users provide value (content, data, referrals)
- Large market where percentage conversion drives volume
- Low marginal cost to serve free users
- Clear feature/usage limits create natural upgrade triggers

Freemium risks:
- Free users may never convert
- Devalues product perception
- Support costs for non-paying users
- Harder to raise prices later

#### When to Use Free Trial

Free trial works when:
- Product needs time to demonstrate value
- Onboarding/setup investment required
- B2B with buying committees
- Higher price points
- Product is "sticky" once configured

Trial best practices:
- 7-14 days for simple products
- 14-30 days for complex products
- Full access (not feature-limited)
- Clear countdown and reminders
- Credit card upfront: higher trial-to-paid conversion (40-50% vs. 15-25%) but lower trial volume

#### Hybrid Approaches

**Freemium + Trial:** Free tier with limited features plus a trial of premium features. Example: Zoom (free 40-min meetings, trial of Pro).

**Reverse trial:** Start with full access, then downgrade to free tier after trial. User sees premium value, lives with limitations until ready to upgrade.

### Step 8: Set Enterprise Pricing (When Needed)

Add "Contact Sales" when:
- Deal sizes exceed $10k+ ARR
- Customers need custom contracts
- Implementation or onboarding required
- Security/compliance requirements
- Procurement processes involved

**Enterprise tier elements:**

Table stakes: SSO/SAML, Audit logs, Admin controls, Uptime SLA, Security certifications.

Value-adds: Dedicated support/success, Custom onboarding, Training sessions, Custom integrations, Priority roadmap input.

**Enterprise pricing strategies:**
- Per-seat at scale: Volume discounts for large teams (e.g., $15/user standard, $10/user for 100+)
- Platform fee + usage: Base fee for access plus usage-based above thresholds (e.g., $500/mo base + $0.01 per API call)
- Value-based contracts: Price tied to customer outcomes (e.g., percentage of transactions, revenue share)

### Step 9: Conduct Pricing Research

#### Van Westendorp Price Sensitivity Meter

Ask respondents four questions:
1. "At what price would you consider [product] so expensive you would not buy it?" (Too expensive)
2. "At what price would you consider [product] so cheap you would question its quality?" (Too cheap)
3. "At what price would [product] start to get expensive, but you might still consider it?" (Expensive/high side)
4. "At what price would [product] be a bargain -- a great buy for the money?" (Cheap/good value)

**How to analyze:** Plot cumulative distributions for each question. Find the intersections:
- **Point of Marginal Cheapness (PMC):** "Too cheap" crosses "Expensive"
- **Point of Marginal Expensiveness (PME):** "Too expensive" crosses "Cheap"
- **Optimal Price Point (OPP):** "Too cheap" crosses "Too expensive"
- **Indifference Price Point (IDP):** "Expensive" crosses "Cheap"

The acceptable price range is PMC to PME. The optimal pricing zone is between OPP and IDP.

**Survey tips:** Need 100-300 respondents for reliable data. Segment by persona (different willingness to pay). Use realistic product descriptions.

**Sample output:**
```
Price Sensitivity Analysis Results:
Point of Marginal Cheapness:     $29/mo
Optimal Price Point:             $49/mo
Indifference Price Point:        $59/mo
Point of Marginal Expensiveness: $79/mo

Recommended range: $49-59/mo
Current price: $39/mo (below optimal)
Opportunity: 25-50% price increase without significant demand impact
```

#### MaxDiff Analysis (Best-Worst Scaling)

Identifies which features customers value most for packaging decisions.

1. List 8-15 features you could include
2. Show respondents sets of 4-5 features at a time
3. Ask: "Which is MOST important? Which is LEAST important?"
4. Repeat across multiple sets until all features compared
5. Statistical analysis produces importance scores

**Using MaxDiff for packaging:**

| Utility Score | Packaging Decision |
|---------------|-------------------|
| Top 20% | Include in all tiers (table stakes) |
| 20-50% | Use to differentiate tiers |
| 50-80% | Higher tiers only |
| Bottom 20% | Consider cutting or premium add-on |

#### Willingness to Pay Surveys

**Direct method (simple but biased):** "How much would you pay for [product]?"

**Gabor-Granger method (better):** "Would you buy [product] at [$X]?" (Yes/No). Vary price across respondents to build demand curve.

**Conjoint analysis (best):** Show product bundles at different prices. Respondents choose preferred option. Statistical analysis reveals price sensitivity per feature.

#### Usage-Value Correlation Analysis

1. Track how customers use your product (feature usage, volume metrics, outcome metrics)
2. Correlate with customer success (which patterns predict retention? expansion? high LTV?)
3. Identify value thresholds (at what usage level do they "get it"? expand? justify a price increase?)

**Example:**
```
Segment: High-LTV customers (>$10k ARR)
Average monthly active users: 15
Average projects: 8
Average integrations: 4

Segment: Churned customers
Average monthly active users: 3
Average projects: 2
Average integrations: 0

Insight: Value correlates with team adoption (users) and depth of use (integrations)
Recommendation: Price per user, gate integrations to higher tiers
```

### Step 10: Know When to Raise Prices

**Market signals it is time:**
- Competitors have raised prices
- Prospects do not flinch at price
- "It's so cheap!" feedback

**Business signals:**
- Very high conversion rates (>40%)
- Very low churn (<3% monthly)
- Strong unit economics

**Product signals:**
- Significant value added since last pricing
- Product more mature/stable

**Price increase strategies:**
1. **Grandfather existing** -- New price for new customers only
2. **Delayed increase** -- Announce 3-6 months out
3. **Tied to value** -- Raise price but add features
4. **Plan restructure** -- Change plans entirely

### Pricing Page Best Practices

**Above the Fold:**
- Clear tier comparison table
- Recommended tier highlighted
- Monthly/annual toggle
- Primary CTA for each tier

**Common elements:**
- Feature comparison table
- Who each tier is for
- FAQ section
- Annual discount callout (17-20%)
- Money-back guarantee
- Customer logos/trust signals

**Pricing psychology:**
- **Anchoring:** Show higher-priced option first (or prominently)
- **Decoy effect:** Middle tier should be the best value
- **Charm pricing:** $49 vs. $50 (for value-focused buyers)
- **Round pricing:** $50 vs. $49 (for premium positioning)

## Pricing Checklist

### Before Setting Prices
- [ ] Defined target customer personas
- [ ] Researched competitor pricing
- [ ] Identified your value metric
- [ ] Conducted willingness-to-pay research (Van Westendorp, MaxDiff, or surveys)
- [ ] Mapped features to tiers

### Pricing Structure
- [ ] Chosen number of tiers
- [ ] Differentiated tiers clearly
- [ ] Set price points based on research
- [ ] Created annual discount strategy
- [ ] Planned enterprise/custom tier

### Pricing Page
- [ ] Recommended tier highlighted
- [ ] Monthly/annual toggle present
- [ ] FAQ addresses pricing objections
- [ ] Trust signals near CTAs
- [ ] Clear path to purchase for each tier

## Inputs

- Product type and current pricing (if any)
- Target market and customer personas
- Competitor pricing information
- Current conversion rate, ARPU, and churn rate
- Customer feedback on pricing
- Feature list with value assessment
- Business goals (growth vs. revenue vs. profitability)
- Any existing pricing research data

## Outputs

- Value metric recommendation with rationale
- Tier structure with features mapped to each tier
- Price point recommendations with supporting logic
- Freemium vs. free trial recommendation
- Pricing research plan (if data is insufficient)
- Pricing page layout recommendations
- Enterprise pricing strategy (if applicable)
- Price increase plan (if applicable)

Save outputs to `work/pricing/` with descriptive filenames.

## Examples

**Example 1: Value Metric Selection for a Project Management Tool**

Context: Project management tool used by teams of 5-200. Current pricing is $10/user/month flat.

Analysis: As teams add more users, they get more value (better collaboration, visibility). Per-user pricing aligns price with value. However, some power users in small teams create disproportionate value.

Recommendation: Keep per-user pricing as the primary metric. Add usage-based elements (projects, storage) as tier differentiators. This captures both team size value and intensity-of-use value.

**Example 2: Tier Structure for an Email Marketing Tool**

| | Starter ($29/mo) | Growth ($79/mo) | Pro ($199/mo) |
|---|---|---|---|
| Contacts | 1,000 | 10,000 | 50,000 |
| Emails/mo | 5,000 | 50,000 | Unlimited |
| Automations | 3 | 20 | Unlimited |
| Templates | Basic | Full library | Custom + library |
| Support | Email | Priority | Dedicated |
| A/B testing | No | Yes | Yes |
| API access | No | No | Yes |

Rationale: Contacts as value metric (scales with value). Feature gating on automations and A/B testing creates clear upgrade triggers. Pro tier includes API for power users and integrations.

**Example 3: Van Westendorp Analysis Result**

Survey of 200 target customers for a new analytics tool:
- Optimal Price Point: $49/mo
- Indifference Price: $59/mo
- Acceptable range: $29-$79/mo

Recommendation: Launch at $49/mo for the core tier. Position a premium tier at $99/mo to capture the high end. The $29 floor suggests a starter tier at $29/mo is viable for acquisition.

## Quality Criteria

- Value metric recommendation is backed by the "does value scale with usage?" test
- Tier structure has clear differentiation (not just "more of the same")
- Price points are supported by research or competitive analysis, not arbitrary
- Persona mapping connects features to specific customer needs
- Freemium vs. free trial decision is justified with specific criteria
- Enterprise pricing addresses security, compliance, and procurement concerns
- Pricing page recommendations follow established psychology principles (anchoring, decoy effect)
- At least one pricing research method is recommended or applied
- Annual discount strategy is included (17-20% is standard)

See also: `skills/bot-001-paywall-upgrade-cro/SKILL.md` for in-app upgrade optimization, `skills/bot-001-copywriting/SKILL.md` for pricing page copy, `skills/bot-001-ab-test-setup/SKILL.md` for testing pricing changes.
