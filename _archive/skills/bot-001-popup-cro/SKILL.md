---
name: bot-001-popup-cro
description: Designs and optimizes popups, modals, slide-ins, and banners for conversion without annoying users. Use when creating new popups or improving existing popup performance.
metadata:
  author: sl8
  version: 1.0.0
  bot: BOT-001
---

# Popup CRO

## Purpose

Create and optimize popups, modals, overlays, slide-ins, and banners for conversion purposes without annoying users or damaging brand perception. Use this skill for email capture popups, lead magnet delivery, discount/promotion popups, exit intent modals, announcement banners, and slide-in widgets. For forms outside of popups, see `skills/bot-001-form-cro/SKILL.md`. For general page conversion optimization, see `skills/bot-001-page-cro/SKILL.md`.

## Instructions

### Step 1: Initial Assessment

Before providing recommendations, understand three areas:

**1. Popup Purpose:**
- Email/newsletter capture
- Lead magnet delivery (ebook, template, checklist)
- Discount/promotion offer
- Announcement or product update
- Exit intent save (last-chance conversion)
- Feature promotion
- Feedback/survey collection

**2. Current State:**
- Existing popup performance metrics (impression rate, conversion rate, close rate)?
- What triggers are currently used?
- Any user complaints or negative feedback about popups?
- Current mobile experience?

**3. Traffic Context:**
- Traffic sources (paid, organic, direct, social)
- New vs. returning visitor ratio
- Page types where popups are/will be shown
- Mobile vs. desktop traffic split

### Step 2: Apply Core Principles

#### Principle 1: Timing Is Everything
- Too early = annoying interruption (user hasn't seen value yet)
- Too late = missed opportunity (user already leaving)
- Right time = helpful offer at the moment of need or engagement

#### Principle 2: Value Must Be Obvious
- Clear, immediate, specific benefit
- Relevant to the page context (not generic site-wide offer)
- Worth the interruption (would the user thank you for showing this?)

#### Principle 3: Respect the User
- Easy to dismiss (visible close button, click-outside-to-close, Escape key)
- Don't trap or trick users (no hidden close buttons, no guilt-trip decline copy)
- Remember preferences (don't show again after dismissal for 7-30 days)
- Don't ruin the content experience (don't cover what they came to read)

### Step 3: Select Trigger Strategy

Choose the right trigger based on context:

**Time-Based:**
- Not recommended: "Show after 5 seconds" (too aggressive, user hasn't engaged)
- Better: "Show after 30-60 seconds" (proven engagement signal)
- Best for: General site visitors with unknown intent

**Scroll-Based:**
- Typical threshold: 25-50% scroll depth
- Indicates: Content engagement (they're actually reading)
- Best for: Blog posts, long-form content, educational pages
- Example messaging: "You're halfway through -- get more like this in your inbox"

**Exit Intent:**
- Detects cursor moving toward close/navigation (desktop only)
- Last chance to capture value before they leave
- Best for: E-commerce (cart save), lead generation (final offer)
- Mobile alternative: Detect back button tap or rapid scroll-up

**Click-Triggered:**
- User initiates by clicking a button or link
- Zero annoyance factor (user chose to see this)
- Best for: Lead magnets, gated content, demo requests, detailed pricing
- Example: "Download our CRO Checklist" link -> popup with email form

**Page Count / Session-Based:**
- Show after visiting X pages in a session
- Indicates research/comparison behavior
- Best for: Multi-page research journeys, B2B comparison shopping
- Example: "Been exploring? Here's a comparison guide to help you decide"

**Behavior-Based:**
- Triggered by specific actions: add-to-cart abandonment, pricing page visit, repeat page visits
- Best for: High-intent segments where you can match offer to behavior
- Example: Pricing page visitor gets "Questions about pricing? Chat with us"

### Step 4: Design the Popup by Type

#### Email Capture Popup
**Goal:** Newsletter/list subscription

Best practices:
- Clear value prop (never just "Subscribe to our newsletter")
- Specific benefit of subscribing ("Weekly CRO tips that take 3 minutes to read")
- Single field: email only
- Consider incentive (discount, exclusive content, early access)

Copy structure:
- Headline: Benefit or curiosity hook
- Subhead: What they get and how often
- CTA: Specific action ("Get Weekly CRO Tips")
- Decline: Polite, not guilt-trippy ("No thanks, I'm good")

#### Lead Magnet Popup
**Goal:** Exchange content for email

Best practices:
- Show what they get (cover image, preview, table of contents)
- Specific, tangible promise ("47-page guide with 12 proven frameworks")
- Minimal fields (email, maybe first name)
- Set instant delivery expectation ("Check your inbox in 60 seconds")

#### Discount/Promotion Popup
**Goal:** First purchase or immediate conversion

Best practices:
- Clear discount amount (10% off, $20 off, free shipping)
- Deadline creates genuine urgency (countdown timer if real deadline)
- Single use per visitor (don't show to returning visitors who dismissed)
- Make code easy to apply (auto-apply if possible, or "code copied to clipboard")

#### Exit Intent Popup
**Goal:** Last-chance conversion before leaving

Best practices:
- Acknowledge they're leaving ("Before you go...")
- Offer something different than entry popup (don't repeat the same offer)
- Address the most common objection for that page type
- Give a compelling final reason to stay or convert

Effective formats:
- "Wait! Forgot your 10% discount?"
- "Questions? Chat with us before you go"
- "Get a personalized recommendation in 60 seconds"
- "Save your cart -- we'll email you a link"

#### Announcement Banner
**Goal:** Site-wide communication

Best practices:
- Top of page (sticky or static)
- Single, clear message with link to details
- Always dismissable
- Time-limited (remove after announcement period ends)
- Don't stack with other popups

#### Slide-In
**Goal:** Less intrusive secondary engagement

Best practices:
- Enters from bottom-right corner (desktop convention)
- Doesn't block primary content
- Easy to dismiss or minimize
- Best for: Chat/support widget, secondary CTA, blog subscription

### Step 5: Write the Copy

**Headlines (choose pattern based on goal):**
- Benefit-driven: "Get [result] in [timeframe]"
- Question: "Want [desired outcome]?"
- Command: "Don't miss [specific thing]"
- Social proof: "Join [X] people who [benefit]"
- Curiosity: "The one thing [audience] always get wrong about [topic]"

**Subheadlines:**
- Expand on the promise with specifics
- Address the top objection ("No spam, ever")
- Set clear expectations ("Weekly tips, 5-minute read")

**CTA Buttons:**
- First person often works: "Get My Discount" vs. "Get Your Discount"
- Specific over generic: "Send Me the Guide" vs. "Submit"
- Value-focused: "Claim My 10% Off" vs. "Subscribe"

**Decline Options:**
- Polite and respectful: "No thanks" / "Maybe later" / "I'm not interested"
- Avoid manipulative guilt-trip: "No, I don't want to save money" (this damages brand trust)

### Step 6: Set Design Specifications

**Visual Hierarchy (in order of prominence):**
1. Headline (largest text, first thing seen)
2. Value prop/offer (clear benefit description)
3. Form/CTA (obvious action to take)
4. Close option (easy to find, not hidden)

**Sizing:**
- Desktop: 400-600px wide (typical)
- Don't cover the entire screen (leave visible background)
- Mobile: Full-width bottom sheet or centered card -- never full-screen overlay
- Always leave clear space to close (visible X button, click-outside area)

**Close Button:**
- Always visible, top-right corner (user expectation)
- Large enough to tap on mobile (44px+ touch target)
- "No thanks" text link as alternative close method
- Click outside popup to close (essential)
- Escape key to close (accessibility)

**Mobile-Specific:**
- Cannot detect exit intent (use scroll-up or time-based alternatives)
- Full-screen overlays feel aggressive -- use bottom slide-up instead
- Larger touch targets for all interactive elements
- Easy dismiss gestures (swipe down to close)

**Imagery:**
- Product image or content preview (if lead magnet, show the cover)
- Face increases trust (testimonial photo, founder photo)
- Keep minimal for fast loading
- Optional -- good copy can work without images

### Step 7: Configure Frequency and Targeting Rules

**Frequency Capping:**
- Show maximum once per session
- Remember dismissals via cookie/localStorage
- Wait 7-30 days before showing again after dismissal
- Respect user choice -- if they said no, don't show the same offer next page

**Audience Targeting:**
- New vs. returning visitors (different messaging and offers)
- By traffic source (match ad messaging in popup offer)
- By page type (contextually relevant offers)
- Exclude already-converted users (don't show email popup to subscribers)
- Exclude users who recently dismissed

**Page Rules:**
- Exclude checkout/conversion flows (never interrupt someone who's converting)
- Different popup strategies for blog vs. product vs. pricing pages
- Match offer to page context (CRO article -> CRO checklist, not generic newsletter)

### Step 8: Ensure Compliance and Accessibility

**GDPR/Privacy:**
- Clear consent language for data collection
- Link to privacy policy
- Don't pre-check opt-in checkboxes
- Honor unsubscribe and preference requests

**Accessibility:**
- Keyboard navigable (Tab to move between elements, Enter to submit, Escape to close)
- Focus trap while popup is open (Tab doesn't go to background page)
- Screen reader compatible (proper ARIA labels, role="dialog")
- Sufficient color contrast (4.5:1 for text)
- Don't rely on color alone to communicate information

**Google SEO Guidelines:**
- Intrusive interstitials hurt SEO rankings, especially on mobile
- Allowed: Cookie notices, age verification, small banners
- Penalized: Full-screen popups before content on mobile
- Safe: Popups triggered by user action (click-triggered), popups after engagement

### Step 9: Structure Output

**Popup Design Specification:**
- Type: Email capture, lead magnet, discount, exit intent, etc.
- Trigger: When and how it appears
- Targeting: Who sees it (audience rules)
- Frequency: How often shown (capping rules)
- Copy: Headline, subhead, CTA button, decline text
- Design notes: Layout, imagery, sizing, mobile behavior

**Multiple Popup Strategy (if recommending more than one):**
- Popup 1: Purpose, trigger, audience
- Popup 2: Purpose, trigger, audience
- Conflict rules: How they don't overlap (priority order, exclusions)

**Test Hypotheses:** Ideas to A/B test with expected outcomes

## Inputs

- Popup goal (email capture, lead magnet, promotion, etc.)
- Current popup performance metrics (if existing popup)
- Traffic sources and visitor segments
- What incentive or value can be offered
- Compliance requirements (GDPR, etc.)
- Mobile vs. desktop traffic split
- Page types where popup will appear
- Brand voice and tone guidelines

## Outputs

A structured popup optimization plan containing:

1. **Popup Strategy Overview** -- Purpose, audience, approach
2. **Trigger Configuration** -- When and how the popup appears
3. **Complete Copy** -- Headline, subhead, CTA, decline text
4. **Design Specifications** -- Layout, sizing, imagery, mobile behavior
5. **Targeting Rules** -- Who sees it, who doesn't
6. **Frequency Rules** -- How often, dismissal handling
7. **Compliance Checklist** -- GDPR, accessibility, SEO
8. **Test Hypotheses** -- A/B tests to run
9. **Metrics Plan** -- What to track and benchmark targets

Save output to: `work/popup-design-[popup-name].md`

## Examples

### Example: Email Capture Popup Specification
```
**Type**: Email capture
**Trigger**: 50% scroll depth on blog posts
**Audience**: New visitors only, exclude existing subscribers
**Frequency**: Once per session, don't show again for 14 days after dismissal

**Copy**:
  Headline: "Get smarter about conversion optimization"
  Subhead: "Weekly CRO tips and case studies. 5-minute read. No fluff."
  Email field placeholder: "your@email.com"
  CTA button: "Send Me Weekly Tips"
  Decline: "No thanks"

**Design**:
  Format: Center modal, 500px wide (desktop), full-width bottom sheet (mobile)
  Imagery: None (copy-only for fast load)
  Close: X button top-right + click outside + Escape key
```

### Example: Exit Intent Popup
```
**Type**: Exit intent save
**Trigger**: Exit intent on pricing page (desktop), 10-second idle + scroll-up (mobile)
**Audience**: Visitors who viewed pricing but haven't started signup
**Frequency**: Once per session

**Copy**:
  Headline: "Not sure which plan is right for you?"
  Subhead: "Get a personalized recommendation in 60 seconds. No commitment."
  CTA button: "Help Me Choose"
  Secondary CTA: "Or chat with our team" (opens live chat)
  Decline: "I'll figure it out"

**Design**:
  Format: Center modal, 520px wide, illustration of plan comparison
  Close: X button + click outside + Escape
```

### Example: Multiple Popup Strategy
```
**Popup 1 - Blog Email Capture**:
  Trigger: 50% scroll on blog posts
  Audience: New visitors, non-subscribers
  Offer: Weekly newsletter

**Popup 2 - Exit Intent Lead Magnet**:
  Trigger: Exit intent on blog posts
  Audience: New visitors who dismissed Popup 1 OR didn't see it
  Offer: Relevant content upgrade (matches blog topic)

**Popup 3 - Pricing Page Help**:
  Trigger: Exit intent on pricing page
  Audience: Non-customers
  Offer: Live chat or plan recommendation

**Conflict Rules**:
  - Never show more than one popup per page view
  - Popup 2 only fires if Popup 1 was dismissed (not if already converted)
  - Popup 3 takes priority over Popup 2 on pricing page
  - 14-day cool-down after any popup dismissal
```

### Common Popup Strategies by Business Type

**E-commerce:**
1. Entry/scroll: First-purchase discount (10% off for email)
2. Exit intent: Bigger discount or cart save ("Your items are waiting")
3. Cart page: Address abandonment objections ("Free shipping on orders over $50")

**B2B SaaS:**
1. Click-triggered: Demo requests, lead magnets (zero annoyance)
2. Scroll-based on blog: Newsletter subscription after engagement
3. Exit intent on product/pricing pages: Trial reminder or helpful content offer

**Content/Media:**
1. Scroll-based: Newsletter after reading engagement (50% scroll)
2. Page count: Subscribe prompt after 3+ article views
3. Exit intent: "Don't miss our next article" with email capture

**Lead Generation:**
1. Time-delayed: General list building on high-traffic pages
2. Click-triggered: Specific lead magnets matching page content
3. Exit intent: Final capture attempt with different/better offer

## Experiment Ideas

### Placement and Format Experiments

**Popup Formats:**
| Test | Hypothesis |
|------|------------|
| Center modal vs. slide-in from corner | Slide-ins are less intrusive but may get lower attention |
| Full-screen overlay vs. smaller modal | Smaller modals feel less aggressive on mobile |
| Bottom bar vs. corner popup | Bottom bars are less intrusive for blog content |
| Banner with countdown vs. without | Countdown creates urgency but may feel pushy |

**Position Testing:**
| Test | Hypothesis |
|------|------------|
| Left corner vs. right corner for slide-ins | Right corner is convention but left may stand out |
| Top banner vs. bottom banner | Top is more visible but may interfere with navigation |
| Test popup sizes | Smaller feels less intrusive, larger gets more attention |

### Trigger Experiments

**Timing Triggers:**
| Test | Hypothesis |
|------|------------|
| Exit intent vs. 30-second delay vs. 50% scroll | Each trigger captures different intent levels |
| Optimal time delay (10s vs. 30s vs. 60s) | Longer delay = more engaged viewer but fewer impressions |
| Scroll depth percentage (25% vs. 50% vs. 75%) | Deeper scroll = higher intent but smaller audience |
| Page count trigger (after 2 vs. 3 vs. 5 pages) | More pages = stronger engagement signal |

**Behavior Triggers:**
| Test | Hypothesis |
|------|------------|
| Trigger based on specific page visits | Pricing page visitors get different popup than blog readers |
| Return visitor vs. new visitor targeting | Return visitors need different messaging (familiarity) |
| Referral source targeting | Paid traffic vs. organic may respond to different offers |

### Messaging and Content Experiments

**Headlines and Copy:**
| Test | Hypothesis |
|------|------------|
| Attention-grabbing vs. informational headlines | Depends on audience sophistication |
| Urgency-focused vs. value-focused copy | Urgency works for promotions, value for content |
| Headline length and specificity | Specific numbers and outcomes beat vague promises |

**CTAs:**
| Test | Hypothesis |
|------|------------|
| CTA button text variations | Value-specific ("Get My Guide") vs. generic ("Download") |
| Primary + secondary CTA vs. single CTA | Two options may increase total conversion |
| Decline text (friendly vs. neutral) | Friendly decline reduces negative brand perception |

**Visual Content:**
| Test | Hypothesis |
|------|------------|
| With countdown timer vs. without | Timer increases urgency but only if deadline is real |
| With product image vs. without | Image adds credibility for physical/visual products |
| Social proof in popup vs. no social proof | "10,000 subscribers" creates belonging |

### Personalization Experiments

| Test | Hypothesis |
|------|------------|
| Personalize based on pages visited | Contextual offers outperform generic ones |
| New vs. returning visitor messaging | Returning visitors respond to different language |
| Segment by traffic source | Ad visitors expect different offers than organic |
| Progressive offers over multiple visits | Escalating value increases eventual conversion |

### Frequency and Rules Experiments

| Test | Hypothesis |
|------|------------|
| Frequency capping (once per session vs. once per week) | Less frequent = less annoying but fewer impressions |
| Cool-down period after dismissal (7 vs. 14 vs. 30 days) | Longer cool-down reduces annoyance |
| Different dismiss behaviors (remember vs. reset) | Remembering choice builds trust |
| Escalating offers over visits | Better offer on return visit recovers lost conversions |

## Measurement

### Key Metrics
| Metric | Description | Benchmark |
|--------|-------------|-----------|
| Impression rate | % of visitors who see the popup | Depends on trigger |
| Conversion rate | Impressions -> Submissions | Email: 2-5%, Exit: 3-10%, Click-triggered: 10%+ |
| Close rate | % who dismiss immediately (within 2 seconds) | Lower is better -- indicates relevance |
| Engagement rate | % who interact before closing (hover, focus) | Higher = offer is interesting but not compelling enough |
| Time to close | Average seconds before dismissing | Very fast close = bad timing or irrelevant offer |

### What to Instrument
- Popup impression events (when popup appears)
- Form field focus events (started engaging)
- Submission attempts and successes
- Close button clicks
- Outside-click dismissals
- Escape key dismissals
- Time from impression to close or conversion

## Quality Criteria

- Popup purpose is clearly defined with a specific conversion goal
- Trigger strategy matches user intent and behavior patterns
- Copy is specific and value-driven (not generic "subscribe" messaging)
- Close/dismiss options are easy to find and use (no dark patterns)
- Frequency capping prevents user annoyance
- Targeting rules prevent showing popups to already-converted users
- Mobile experience is specifically designed (not just desktop shrunk down)
- Compliance requirements are addressed (GDPR, accessibility, Google SEO)
- Multiple popup strategy includes conflict resolution rules
- Measurement plan includes specific benchmarks for success

See also: `skills/bot-001-form-cro/SKILL.md`, `skills/bot-001-page-cro/SKILL.md`, `skills/bot-001-signup-flow-cro/SKILL.md`, `skills/bot-001-onboarding-cro/SKILL.md`
