---
name: bot-001-onboarding-cro
description: Optimizes post-signup onboarding to accelerate time-to-value and user activation. Use when users sign up but don't activate, or when redesigning onboarding flows.
metadata:
  author: sl8
  version: 1.0.0
  bot: BOT-001
---

# Onboarding CRO

## Purpose

Optimize post-signup onboarding, user activation, and first-run experiences to help users reach their "aha moment" as quickly as possible and establish habits that lead to long-term retention. Use this skill for onboarding flows, activation rate optimization, empty state design, onboarding checklists, and new user experiences. For signup/registration optimization, see `skills/bot-001-signup-flow-cro/SKILL.md`. For the landing page leading to signup, see `skills/bot-001-page-cro/SKILL.md`.

## Instructions

### Step 1: Initial Assessment

Before providing recommendations, understand three areas:

**1. Product Context:**
- What type of product? (SaaS, marketplace, mobile app, content platform)
- B2B or B2C?
- What is the core value proposition?

**2. Activation Definition:**
- What is the "aha moment"? What action indicates a user "gets it"?
- What do retained users do that churned users don't?
- What is the earliest indicator of future engagement?

**3. Current State:**
- What happens immediately after signup?
- Where do users drop off in the current flow?
- What is the current activation rate?
- Do you have cohort analysis on successful vs. churned users?

### Step 2: Apply Core Principles

#### Principle 1: Time-to-Value Is Everything
Remove every single step between signup and experiencing core value. Every screen, every question, every tutorial that sits between "account created" and "I see why this is useful" is a potential drop-off point.

#### Principle 2: One Goal Per Session
Focus the first session on one successful outcome. Save advanced features, settings, and customization for later. The first session should end with the user having accomplished something meaningful.

#### Principle 3: Do, Don't Show
Interactive experiences beat tutorials. Doing the thing is always better than learning about the thing. Guide users through real actions with real data, not through slides or videos about what they could do.

#### Principle 4: Progress Creates Motivation
Show advancement. Celebrate completions. Make the path visible. Users who can see how far they've come and how close they are to a goal are more likely to continue.

### Step 3: Define Activation

**Find the aha moment** by analyzing:
- What do retained users do that churned users don't?
- What is the earliest indicator of future engagement?

**Activation examples by product type:**
| Product Type | Typical Aha Moment |
|--------------|-------------------|
| Project management | Create first project + add a team member |
| Analytics tool | Install tracking code + see first report with their data |
| Design tool | Create first design + export or share it |
| Marketplace | Complete first transaction |
| Communication tool | Send first message + get a reply |
| CRM | Import contacts + log first activity |
| Content platform | Follow topics + consume first piece of content |

**Activation metrics to establish:**
- % of signups who reach activation event
- Time to activation (hours/days)
- Number of steps to activation
- Activation rate by cohort and traffic source

### Step 4: Design the Onboarding Flow

#### Immediate Post-Signup (First 30 Seconds)

Choose the right approach:

| Approach | Best For | Risk | Mitigation |
|----------|----------|------|------------|
| Product-first | Simple products, B2C, mobile apps | Blank slate overwhelm | Good empty states |
| Guided setup | Products needing personalization, B2B | Adds friction before value | Keep to 2-3 steps |
| Value-first | Products with demo/sample data | May not feel "real" | Clear path to use own data |

Whatever approach you choose, ensure:
- There is a clear single next action at every point
- There are no dead ends (every screen has a forward path)
- There is progress indication if multi-step

#### Onboarding Checklist Pattern

Use when:
- Multiple setup steps are required to reach full value
- Product has several features to discover
- Self-serve B2B products where users need to configure things

Best practices:
- 3-7 items (fewer than 3 feels trivial, more than 7 feels overwhelming)
- Order by value delivery (most impactful action first)
- Start with quick wins (first item should be completable in under 60 seconds)
- Include progress bar / completion percentage
- Add celebration moments on completion (confetti, congratulation message)
- Always include a dismiss/skip option (don't trap users who know what they're doing)
- Pre-check any items already completed during signup

#### Empty States

Empty states are onboarding opportunities, not dead ends. Every empty state should:
- Explain what this area is for and why it matters
- Show what it will look like with data (screenshot, illustration, or sample)
- Provide a clear primary action to add the first item
- Optionally: Pre-populate with example/demo data the user can explore

**Example empty state copy:**
```
[Illustration of a populated dashboard]

Your Dashboard
This is where you'll see all your project metrics at a glance.

[Create Your First Project] (primary button)
or [Explore with sample data] (secondary link)
```

#### Tooltips and Guided Tours

Use when: Complex UI, features that aren't self-evident, power features users might miss.

Best practices:
- Maximum 3-5 steps per tour (users abandon long tours)
- Dismissable at any time
- Don't repeat for returning users (remember dismissal)
- Highlight the actual UI element, don't just describe it
- Each tooltip should explain the "why" not just the "what"

### Step 5: Design Multi-Channel Onboarding

#### Email + In-App Coordination

**Trigger-based email sequence:**
| Timing | Trigger | Email Content |
|--------|---------|---------------|
| Immediate | Signup complete | Welcome + single most important first step |
| 24 hours | Incomplete onboarding | Reminder of next step + address common blockers |
| 72 hours | Still incomplete | Alternative approach + offer help |
| Day 3 | Activation achieved | Celebration + next feature to explore |
| Day 7 | Active but not fully onboarded | Feature discovery for underused capabilities |
| Day 14 | Active user | Advanced tips, invite team, expand usage |

**Email principles:**
- Reinforce in-app actions, don't duplicate them
- Drive back to product with a specific, single CTA per email
- Personalize based on actions taken (don't email about features they already use)
- Never send generic batch emails during onboarding period

### Step 6: Handle Stalled Users

**Detection criteria:**
Define "stalled" for your product -- typically X days inactive with incomplete setup. Examples:
- Haven't logged in for 3 days after signup
- Logged in but didn't complete first key action
- Started onboarding checklist but stopped

**Re-engagement tactics (escalating):**

1. **Automated email sequence** -- Reminder of value they're missing, address common blockers ("Most people get stuck on X -- here's how to fix it"), offer help resources
2. **In-app recovery** -- "Welcome back" message, pick up exactly where they left off, show what's changed or what they can do next
3. **Human touch** -- For high-value accounts (B2B enterprise), personal outreach from success team, offer live walkthrough or pair-setup session

### Step 7: Structure Output

Organize recommendations as:

**For an onboarding audit:**
- Finding -> Impact -> Recommendation -> Priority for each issue identified

**For an onboarding flow design:**
- Activation goal definition
- Step-by-step flow with copy for each screen
- Checklist items (if applicable) with completion criteria
- Empty state copy for key screens
- Email sequence triggers and content summaries
- Metrics plan with targets

## Inputs

- Product description and core value proposition
- Current post-signup experience (screenshots, flow description, or URL)
- Activation definition (or data to help define it)
- Current activation rate and retention metrics
- User drop-off data (where in onboarding users leave)
- Cohort analysis: behaviors of retained vs. churned users (if available)
- B2B or B2C context
- Existing onboarding emails (if any)

## Outputs

A structured onboarding optimization plan containing:

1. **Activation Definition** -- The aha moment and how to measure it
2. **Current State Assessment** -- Where users drop off and why
3. **Recommended Onboarding Flow** -- Step-by-step with copy, UI guidance, and rationale
4. **Checklist Design** (if applicable) -- Items, order, completion criteria
5. **Empty State Copy** -- For key product areas
6. **Email Sequence Plan** -- Triggers, timing, content summaries
7. **Stalled User Recovery Plan** -- Detection criteria and re-engagement tactics
8. **Metrics Plan** -- What to track and target benchmarks
9. **Experiment Ideas** -- A/B tests to run with hypotheses

Save output to: `work/onboarding-audit-[product-name].md`

## Examples

### Example: Activation Definition
```
**Product**: Project management tool for remote teams
**Aha Moment**: User creates a project AND adds at least one team member
**Rationale**: Users who add a team member within 48 hours of signup have 3.2x higher
  Day-30 retention than users who work solo.
**Activation Metric**: % of signups who create project + add team member within 7 days
**Current Rate**: 23%
**Target**: 40%
```

### Example: Onboarding Checklist
```
Onboarding Checklist (4 items):

[x] Create your account (auto-checked -- completed during signup)
[ ] Create your first project (CTA: "Create Project" -- estimated 30 seconds)
[ ] Invite a team member (CTA: "Invite by Email" -- estimated 15 seconds)
[ ] Assign your first task (CTA: "Add a Task" -- estimated 20 seconds)

Progress: 25% complete
"Complete all steps to unlock your team dashboard"
```

### Example: Empty State
```
**Screen**: Tasks list (empty)
**Headline**: "Your tasks will appear here"
**Description**: "Tasks help your team track who's doing what and when it's due."
**Primary CTA**: [Create Your First Task]
**Secondary**: "Or import from Trello, Asana, or CSV"
**Visual**: Illustration showing a populated task list with assignments and due dates
```

### Common Onboarding Patterns by Product Type

| Product Type | Recommended Flow |
|--------------|-----------------|
| B2B SaaS | Setup wizard (2-3 steps) -> First value action -> Team invite -> Deeper configuration |
| Marketplace | Complete profile -> Browse listings -> First transaction -> Repeat loop |
| Mobile App | Permission requests -> Quick win action -> Push notification setup -> Habit loop |
| Content Platform | Follow topics/customize feed -> Consume first content -> Create/engage -> Social loop |

## Experiment Ideas

### Flow Simplification Experiments

**Reduce Friction:**
| Test | Hypothesis |
|------|------------|
| Email verification timing | Verify during vs. after onboarding -- delaying verification reduces early drop-off |
| Empty states vs. demo data | Pre-populated examples help users understand value faster |
| Pre-filled templates | Accelerating setup with templates reduces time-to-value |
| Required step count | Fewer required steps increases completion rate |
| Skip options | Allowing bypass of non-critical steps reduces abandonment |

**Step Sequencing:**
| Test | Hypothesis |
|------|------------|
| Step ordering | Different sequences have different completion rates |
| Value-first ordering | Putting highest-value features first increases activation |
| Friction placement | Moving hard steps later (after commitment) improves completion |
| Quick start vs. full setup | Minimal path to value then expand later outperforms complete setup first |

**Progress and Motivation:**
| Test | Hypothesis |
|------|------------|
| Progress bars | Showing completion percentage increases motivation to finish |
| Checklist length | 3-5 items vs. 5-7 items -- shorter lists have higher completion |
| Gamification | Badges and achievements increase engagement during onboarding |
| Starting point | Beginning at 20% (pre-credit for signup) vs. 0% affects motivation |
| Celebration moments | Acknowledging completions with animations/confetti increases continuation |

### Guided Experience Experiments

**Product Tours:**
| Test | Hypothesis |
|------|------------|
| Interactive tours | Hands-on product tours convert better than passive walkthroughs |
| Tooltip vs. modal guidance | Subtle tooltips vs. attention-grabbing modals -- context matters |
| Video tutorials | Video works better for complex workflows |
| Tour length | Shorter tours (3 steps) have higher completion than comprehensive ones (7+ steps) |
| Tour triggering | Automatic vs. user-initiated -- voluntary tours have higher engagement |

**UI Guidance:**
| Test | Hypothesis |
|------|------------|
| Hotspot highlights | Drawing attention to key features increases discovery |
| Coachmarks | Contextual tips at point-of-need outperform upfront training |
| Contextual help | Help where users need it reduces support requests |

### Personalization Experiments

**User Segmentation:**
| Test | Hypothesis |
|------|------------|
| Role-based onboarding | Different paths by role increase relevance and activation |
| Goal-based paths | Customizing by stated goal improves time-to-value |
| Industry-specific paths | Vertical customization with relevant examples increases engagement |
| Experience-based paths | Beginner vs. expert paths prevent both overwhelm and boredom |

**Dynamic Content:**
| Test | Hypothesis |
|------|------------|
| Personalized welcome | Using name, company, role in welcome increases engagement |
| Industry examples | Showing relevant use cases increases "this is for me" feeling |
| Template suggestions | Pre-filled templates for their segment accelerates setup |

### Email and Multi-Channel Experiments

**Onboarding Emails:**
| Test | Hypothesis |
|------|------------|
| Founder welcome email | Personal founder email vs. generic welcome increases open/click rates |
| Behavior-based triggers | Action/inaction-based emails outperform time-based sequences |
| Email timing | Immediate vs. 2-hour delay for first email |
| Quick tips format | Short, actionable single-tip emails outperform long feature overviews |
| Plain text vs. designed | Plain text feels more personal and gets higher reply rates |

**Feedback Loops:**
| Test | Hypothesis |
|------|------------|
| NPS during onboarding | Early NPS identifies at-risk users before they churn |
| "What's stopping you?" prompt | Direct question to stalled users uncovers fixable blockers |
| In-app feedback | Thumbs up/down on onboarding steps identifies friction points |

### Re-engagement Experiments

**Stalled User Recovery:**
| Test | Hypothesis |
|------|------------|
| Re-engagement email timing | 24h vs. 48h vs. 72h for first re-engagement email |
| Personal outreach | Human email vs. automated for high-value accounts |
| Simplified return path | Reduced steps for returning users improves re-activation |
| Incentive offers | Extended trial or discount for stalled users recovers some percentage |
| Demo offer | Live walkthrough offer converts stalled users who are confused, not disinterested |

**Return Experience:**
| Test | Hypothesis |
|------|------------|
| Welcome back message | Acknowledging return and showing where they left off reduces re-orientation time |
| Progress resume | "Pick up where you left off" vs. fresh start |
| Urgency messaging | Trial time remaining creates motivation to engage |

## Measurement

### Key Metrics
| Metric | Description | Why It Matters |
|--------|-------------|----------------|
| Activation rate | % reaching activation event | Primary measure of onboarding success |
| Time to activation | Hours/days to first value | Faster = better retention |
| Onboarding completion | % completing setup steps | Identifies flow friction |
| Day 1/7/30 retention | Return rate by timeframe | Measures habit formation |
| Step completion rate | % completing each individual step | Pinpoints specific drop-offs |
| Feature adoption | Which features get used first | Shows what users value most |
| Support requests | Volume during onboarding period | High volume = confusing onboarding |

### Funnel Analysis Template
Track drop-off at each step to identify the biggest opportunity:
```
Signup      -> Step 1     -> Step 2     -> Activation -> Day 7 Retention
100%           80%           60%           40%           25%
         (-20%)        (-20%)        (-20%)         (-15%)
```
Focus optimization on the step with the largest absolute drop.

## Quality Criteria

- Activation is clearly defined with a specific, measurable event (not vague "engagement")
- Recommendations reduce steps-to-value, not just improve individual steps
- Empty states are treated as onboarding opportunities with specific copy provided
- Email sequence is trigger-based (behavioral), not just time-based
- Stalled user recovery plan is included
- All recommendations include specific copy/content, not just strategic advice
- Metrics plan has clear targets and tracking methodology
- Personalization opportunities are identified based on user segments
- Mobile experience is specifically addressed

See also: `skills/bot-001-signup-flow-cro/SKILL.md`, `skills/bot-001-page-cro/SKILL.md`, `skills/bot-001-form-cro/SKILL.md`, `skills/bot-001-popup-cro/SKILL.md`
