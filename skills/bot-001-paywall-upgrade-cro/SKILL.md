---
name: bot-001-paywall-upgrade-cro
description: Optimizes in-app paywalls, upgrade screens, and upsell modals to convert free users to paid. Use when free-to-paid conversion is low or redesigning upgrade flows.
metadata:
  author: sl8
  version: 1.0.0
  bot: BOT-001
---

# Paywall & Upgrade Screen CRO

## Purpose

Optimize in-app paywalls, upgrade screens, upsell modals, and feature gates to convert free users to paid or upgrade users to higher tiers. Use this skill when working on any in-product upgrade moment where the user has already experienced value -- including feature locks, usage limits, trial expirations, and time-based upgrade prompts.

This skill focuses on **in-product** upgrade moments. For public-facing pricing pages, see also: `skills/bot-001-pricing-strategy/SKILL.md`.

## Instructions

### Step 1: Assess the Upgrade Context

Before making any recommendations, gather these details about the current situation:

1. **Upgrade type** -- Freemium to Paid? Trial to Paid? Tier upgrade? Feature upsell? Usage limit?
2. **Product model** -- What is free? What is behind the paywall? What triggers prompts? Current conversion rate?
3. **User journey** -- When does this paywall appear? What has the user experienced? What are they trying to do right now?
4. **Platform** -- Mobile app, web app, or both?
5. **Pricing model** -- Per seat, usage-based, or flat fee?
6. **Current "aha moment"** -- What action signals the user has received enough value?

### Step 2: Apply Core Principles

Follow these four principles for every paywall design:

**Value Before Ask.** The user must have experienced real value first. The upgrade should feel like a natural next step. Timing matters: present the paywall after the "aha moment," not before.

**Show, Don't Just Tell.** Demonstrate the value of paid features. Preview what they are missing. Make the upgrade feel tangible with screenshots, before/after comparisons, or live previews.

**Friction-Free Path.** Make it easy to upgrade when the user is ready. Do not force them to hunt for pricing. Minimize steps from paywall to payment. Pre-fill known information. Keep the flow in-context if possible.

**Respect the No.** Do not trap or pressure. Make it easy to continue with the free tier. Every paywall must have a clear escape hatch ("Not now," "Continue with Free"). Maintain trust for future conversion.

### Step 3: Identify the Right Trigger Point

Choose the appropriate paywall trigger type:

**Feature Gates** -- When a user clicks a paid-only feature:
- Provide a clear explanation of why it is paid
- Show what the feature does (preview, screenshot, or demo)
- Offer a quick path to unlock
- Include an option to continue without upgrading

**Usage Limits** -- When a user hits a limit:
- Clearly indicate the limit has been reached
- Show what upgrading provides (e.g., "Free: 3 projects | Pro: Unlimited")
- Do not block abruptly; give the user options

**Trial Expiration** -- When a trial is ending:
- Send early warnings at 7 days, 3 days, and 1 day
- Clearly explain what happens on expiration
- Summarize value received during the trial (e.g., "You created X projects")

**Time-Based Prompts** -- After X days of free use:
- Gentle upgrade reminder
- Highlight unused paid features relevant to their usage
- Easy to dismiss

### Step 4: Design the Paywall Screen

Include these components in order of importance:

1. **Headline** -- Focus on what they get: "Unlock [Feature] to [Benefit]"
2. **Value Demonstration** -- Preview, before/after, "With Pro you could..."
3. **Feature Comparison** -- Highlight key differences, mark current plan
4. **Pricing** -- Clear, simple, show annual vs. monthly options
5. **Social Proof** -- Customer quotes, "X teams use this"
6. **CTA** -- Specific and value-oriented: "Start Getting [Benefit]"
7. **Escape Hatch** -- Clear "Not now" or "Continue with Free"

### Step 5: Set Timing and Frequency Rules

**When to show:**
- After a value moment, before frustration builds
- After activation or aha moment
- When hitting genuine limits

**When NOT to show:**
- During onboarding (too early)
- When the user is in a flow state
- Repeatedly after the user has already dismissed

**Frequency rules:**
- Limit impressions per session
- Cool-down after dismiss should be measured in days, not hours
- Track annoyance signals (rapid dismissals, reduced engagement)

### Step 6: Optimize the Upgrade Flow

**From Paywall to Payment:**
- Minimize the number of steps
- Keep in-context if possible (modal rather than redirect)
- Pre-fill known information (email, name)

**Post-Upgrade:**
- Provide immediate access to the newly unlocked features
- Send a confirmation and receipt
- Guide the user to their new features with a quick tour or prompt

### Step 7: Plan A/B Tests

Prioritize testing these elements:
- Trigger timing (after aha moment vs. at feature attempt)
- Headline and copy variations
- Price presentation (monthly vs. annual vs. both)
- Trial length
- Feature emphasis
- Design and layout (modal vs. full-screen, minimal vs. feature-rich)

Track these metrics:
- Paywall impression rate
- Click-through to upgrade
- Completion rate (started upgrade to payment confirmed)
- Revenue per user
- Churn rate post-upgrade

See also: `skills/bot-001-ab-test-setup/SKILL.md` for designing rigorous experiments.

## Paywall Type Templates

### Feature Lock Paywall

```
[Lock Icon]
This feature is available on Pro

[Feature preview/screenshot]

[Feature name] helps you [benefit]:
- [Capability 1]
- [Capability 2]

[Upgrade to Pro - $X/mo]
[Maybe Later]
```

### Usage Limit Paywall

```
You've reached your free limit

[Progress bar at 100%]

Free: 3 projects | Pro: Unlimited

[Upgrade to Pro]  [Delete a project]
```

### Trial Expiration Paywall

```
Your trial ends in 3 days

What you'll lose:
- [Feature they actively used]
- [Data they created]

What you've accomplished:
- Created X projects
- Saved Y hours

[Continue with Pro]
[Remind me later]  [Downgrade]
```

## Experiment Ideas

Use these categories to generate A/B test hypotheses for paywall optimization:

### Trigger and Timing Experiments
- Test trigger timing: after aha moment vs. at feature attempt
- Early trial reminder (7 days) vs. late reminder (1 day before)
- Show after X actions completed vs. after X days
- Test soft prompts at different engagement thresholds
- Hard gate (cannot proceed) vs. soft gate (preview + prompt)
- Feature lock vs. usage limit as primary trigger
- In-context modal vs. dedicated upgrade page
- Banner reminder vs. modal prompt

### Paywall Design Experiments
- Full-screen paywall vs. modal overlay
- Minimal paywall (CTA-focused) vs. feature-rich paywall
- Single plan display vs. plan comparison
- Feature list vs. benefit statements
- Show what they will lose (loss aversion) vs. what they will gain
- Personalized value summary based on usage
- Before/after demonstration
- ROI calculator or value quantification
- Include short demo video or GIF vs. static content
- Progress visualization showing what user has accomplished

### Pricing Presentation Experiments
- Show monthly vs. annual vs. both with toggle
- Highlight savings for annual (dollar amount vs. percentage off)
- Price per day framing ("Less than a coffee")
- Show price after trial vs. emphasize "Start Free"
- Single recommended plan vs. multiple tiers
- Add "Most Popular" badge to target plan
- First month/year discount for conversion
- Limited-time upgrade offer with countdown
- Loyalty discount based on free usage duration

### Copy and Messaging Experiments
- Benefit-focused headline ("Unlock unlimited projects") vs. feature-focused ("Get Pro features")
- Question format ("Ready to do more?") vs. statement format
- Personalized headline with user's name or usage data
- Social proof headline ("Join 10,000+ Pro users")
- First person CTA ("Start My Trial") vs. second person ("Start Your Trial")
- Value-specific CTA ("Unlock Unlimited") vs. generic ("Upgrade")
- Add money-back guarantee messaging
- Show "Cancel anytime" prominently
- Include FAQ on paywall

### Trial and Conversion Experiments
- 7-day vs. 14-day vs. 30-day trial length
- Credit card required vs. not required for trial
- Full-access trial vs. limited feature trial
- Trial extension offer for engaged users
- One-click upgrade from paywall vs. separate checkout
- Grace period after expiration vs. immediate downgrade

### Personalization Experiments
- Personalize paywall copy based on features used
- Highlight most-used premium features
- Show usage stats ("You've created 50 projects")
- Recommend plan based on behavior patterns
- Different paywall for power users vs. casual users
- B2B vs. B2C messaging variations

### Frequency and UX Experiments
- Test number of prompts per session
- Cool-down period after dismiss (hours vs. days)
- Escalating urgency over time vs. consistent messaging
- "Maybe later" vs. "No thanks" vs. "Remind me tomorrow" dismiss options
- Offer alternative on dismiss (lower tier, annual discount)

## Anti-Patterns to Avoid

### Dark Patterns
- Hiding the close button
- Confusing plan selection that steers users to expensive options
- Guilt-trip copy ("You'll miss out on everything...")

### Conversion Killers
- Asking for the upgrade before value has been delivered
- Showing prompts too frequently after dismissal
- Blocking critical user flows (e.g., preventing them from saving work)
- Complicated upgrade process with too many steps or redirects

## Inputs

- Current paywall design or wireframes (if they exist)
- Product model details (what is free vs. paid)
- Current conversion rate (free to paid)
- User journey map showing when paywalls trigger
- Pricing information (tiers, prices, billing options)
- Analytics data on paywall impressions and click-through rates

## Outputs

- Paywall screen copy and layout recommendations
- Trigger timing strategy document
- Feature comparison table for paywall use
- A/B test hypotheses with prioritization
- Frequency and dismissal rules
- Post-upgrade experience flow

Save outputs to `work/paywall-cro/` with descriptive filenames.

## Examples

**Example 1: Feature Lock for a Project Management Tool**

Input: User clicks "Gantt Chart" in a free project management tool.

Output paywall:
```
Visualize your project timeline

[Screenshot of Gantt chart with sample data]

Gantt Charts help you:
- See task dependencies at a glance
- Identify bottlenecks before they happen
- Keep stakeholders aligned on timelines

Teams using Gantt Charts ship 23% faster.

[Upgrade to Pro - $12/mo]  [Maybe Later]
```

**Example 2: Usage Limit for an Email Tool**

Input: User has sent 1,000 emails this month (free limit).

Output paywall:
```
You've sent 1,000 emails this month

[Progress bar: 1,000/1,000 - 100%]

Your emails this month reached 847 unique contacts
with a 34% open rate. Nice work.

Free: 1,000/mo | Growth: 10,000/mo | Pro: Unlimited

[Upgrade to Growth - $29/mo]
[See all plans]  [Wait until next month]
```

## Quality Criteria

- Every paywall has a clear escape hatch (dismiss option)
- Headline focuses on benefit, not feature name
- Value demonstration is present (preview, stats, or comparison)
- Timing recommendation is tied to a specific user action or milestone, not arbitrary
- No dark patterns (hidden close buttons, guilt-trip copy, confusing selections)
- Frequency rules are specified to prevent annoyance
- At least 3 testable hypotheses are proposed with specific metrics
- Copy follows principles in `skills/bot-001-copywriting/SKILL.md` (clarity, specificity, benefits over features)
- Pricing presentation follows guidance from `skills/bot-001-pricing-strategy/SKILL.md`
