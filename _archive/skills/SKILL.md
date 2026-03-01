---
name: bot-001-signup-flow-cro
description: Optimizes signup, registration, and trial activation flows to reduce friction and increase completion rates. Use when analyzing signup drop-off or redesigning registration flows.
metadata:
  author: sl8
  version: 1.0.0
  bot: BOT-001
---

# Signup Flow CRO

## Purpose

Optimize signup, registration, and account creation flows to reduce friction, increase completion rates, and set users up for successful activation. Use this skill for free trial signups, freemium account creation, paid account creation, waitlist/early access signups, and any registration flow. For post-signup onboarding, see `skills/bot-001-onboarding-cro/SKILL.md`. For lead capture forms (not account creation), see `skills/bot-001-form-cro/SKILL.md`. For the landing page leading to signup, see `skills/bot-001-page-cro/SKILL.md`.

## Instructions

### Step 1: Initial Assessment

Before providing recommendations, understand three areas:

**1. Flow Type:**
- Free trial signup
- Freemium account creation
- Paid account creation
- Waitlist/early access signup
- B2B vs. B2C (fundamentally different optimization strategies)

**2. Current State:**
- How many steps/screens in the current flow?
- What fields are required?
- What is the current completion rate?
- Where do users drop off? (field-level analytics if available)

**3. Business Constraints:**
- What data is genuinely needed before users can use the product?
- Are there compliance requirements (GDPR, age verification, etc.)?
- What happens immediately after signup (onboarding flow, email verification, product access)?

### Step 2: Apply Core Principles

#### Principle 1: Minimize Required Fields
Every field reduces conversion. For each field in the current flow, ask:
- Do we absolutely need this before they can use the product?
- Can we collect this later through progressive profiling?
- Can we infer this from other data (e.g., company from email domain)?

**Field priority framework:**
| Priority | Fields | Rationale |
|----------|--------|-----------|
| Essential | Email (or phone), Password | Cannot create account without these |
| Often needed | Name | Used for personalization, greeting |
| Usually deferrable | Company, Role, Team size | Collect during onboarding or progressive profiling |
| Almost always deferrable | Phone, Address, Industry | Collect only when genuinely needed for product |

#### Principle 2: Show Value Before Asking for Commitment
- What can you show or give before requiring signup?
- Can users experience the product before creating an account?
- Reverse the order: value first, signup second (e.g., let them build something, then require account to save)

#### Principle 3: Reduce Perceived Effort
- Show progress indicators in multi-step flows
- Group related fields logically
- Use smart defaults (pre-select most common options)
- Pre-fill when possible (URL parameters from ads, social auth data)

#### Principle 4: Remove Uncertainty
- Set clear expectations: "Takes 30 seconds"
- Show what happens after signup (screenshot of first screen, immediate next step)
- No surprises (hidden requirements, unexpected email verification, surprise credit card ask)

### Step 3: Field-by-Field Optimization

Go through each field and optimize:

**Email Field:**
- Single field (never add email confirmation field)
- Inline validation for format
- Check for common typos (gmial.com -> gmail.com, yaho.com -> yahoo.com)
- Clear, specific error messages
- Proper email keyboard on mobile

**Password Field:**
- Show/hide password toggle (eye icon)
- Show requirements upfront, not after failure
- Update requirement indicators in real-time as they type
- Allow paste (never disable paste in password fields)
- Show strength meter instead of rigid rules when possible
- Consider passwordless options (magic link, social auth)

**Name Field:**
- Test single "Full name" field vs. First/Last split (single field often wins)
- Only require if immediately used for personalization
- Consider making optional

**Social Auth Options:**
- Place prominently -- often has higher conversion than email signup
- Show most relevant options for your audience:
  - B2C: Google, Apple, Facebook
  - B2B: Google, Microsoft, SSO
- Clear visual separation from email signup ("OR" divider)
- Consider making social auth the primary/default option

**Phone Number:**
- Defer unless essential (SMS verification, calling leads)
- If required, explain why ("We'll text you a verification code")
- Use proper input type with country code handling
- Auto-format as they type

**Company/Organization:**
- Defer to onboarding if possible
- Auto-suggest company names as they type
- Infer from email domain when possible (work emails)

**Use Case / Role Questions:**
- Defer to onboarding if possible
- If needed at signup, keep to one question maximum
- Use progressive disclosure (radio buttons, not long dropdowns)

### Step 4: Evaluate Single-Step vs. Multi-Step

**Single-Step works when:**
- 3 or fewer fields total
- Simple B2C products
- High-intent visitors (from targeted ads, waitlist)

**Multi-Step works when:**
- More than 3-4 fields are genuinely needed
- Complex B2B products needing segmentation data
- You need to collect different types of information

**Multi-Step Best Practices:**
- Show progress indicator (step 1 of 3)
- Lead with easy questions (name, email) -- build commitment
- Put harder questions later (company size, budget -- after psychological commitment)
- Each step should feel completable in seconds
- Allow back navigation
- Save progress (don't lose data on page refresh or browser back button)

**Progressive commitment pattern (recommended):**
1. Email only (lowest barrier entry)
2. Password + name (account creation)
3. Customization questions (optional, skippable)

### Step 5: Optimize Trust and Friction Elements

**At the form level, add:**
- "No credit card required" (if true -- high impact)
- "Free forever" or "14-day free trial" (set expectations)
- Privacy note: "We'll never share your email"
- Security badges if collecting sensitive data
- Testimonial or user count near signup form

**Error handling:**
- Inline validation (validate as they leave each field, not just on submit)
- Specific error messages: "Email already registered" with account recovery link
- Never clear the form on error
- Auto-focus on the problem field

**Microcopy:**
- Placeholder text: Use for examples only, not as labels
- Labels: Always visible (floating labels or above-field labels)
- Help text: Only when needed, placed close to the field

### Step 6: Mobile Signup Optimization

- Larger touch targets (44px+ height for all interactive elements)
- Appropriate keyboard types (email keyboard for email, tel for phone, etc.)
- Autofill support (proper autocomplete attributes)
- Reduce typing (social auth, pre-fill from URL params)
- Single column layout only
- Sticky CTA button at bottom of viewport
- Test on actual devices, not just browser emulation

### Step 7: Optimize Post-Submit Experience

**Success state:**
- Clear confirmation that signup worked
- Immediate, obvious next step
- If email verification required: explain what to do, offer easy resend, remind about spam folder, provide option to change email if entered incorrectly

**Verification flows:**
- Consider delaying email verification until a specific product action requires it
- Magic link as alternative to password-based verification
- Let users explore the product while awaiting verification
- Clear re-engagement path if verification stalls (reminder emails at 24h, 72h)

### Step 8: Structure Output

Organize recommendations as:
1. **Audit Findings** -- Issue, Impact, Fix, Priority (High/Medium/Low) for each problem
2. **Quick Wins** -- Same-day fixes
3. **High-Impact Changes** -- Week-level effort changes
4. **Test Hypotheses** -- Things to A/B test with expected outcomes
5. **Form Redesign** (if requested) -- Recommended field set, field order, copy for all labels/placeholders/buttons/errors, visual layout

## Inputs

- Current signup flow (URL, screenshots, or description of each step)
- Flow type (free trial, freemium, paid, waitlist, B2B/B2C)
- Current completion rate and field-level drop-off data (if available)
- Business requirements for data collection at signup
- Compliance or verification requirements
- What happens immediately after signup (onboarding flow description)

## Outputs

A structured signup flow audit and optimization plan containing:

1. **Flow Assessment** -- Type, current state, constraints
2. **Field-by-Field Analysis** -- Each field evaluated with keep/remove/defer/optimize recommendation
3. **Audit Findings** -- Prioritized list of issues with fixes
4. **Quick Wins** -- Immediately actionable improvements
5. **High-Impact Changes** -- Larger changes to prioritize
6. **Test Hypotheses** -- A/B test ideas with expected impact
7. **Recommended Flow Design** -- Optimized field set, order, copy, and layout

Save output to: `work/signup-flow-audit-[product-name].md`

## Examples

### Example: B2B SaaS Trial Signup Audit Finding
```
**Issue**: Phone number is required but not used until sales follow-up (3 days later)
**Impact**: High -- phone fields are the #1 form abandonment driver. Estimated 15-25%
  completion rate improvement if removed or deferred.
**Fix**: Remove phone from signup. Collect during onboarding or first sales touchpoint.
  If phone is needed for verification, use "optional" with explanation.
**Priority**: High
```

### Example: Recommended Flow Design
```
**Recommended: 2-Step Progressive Signup**

Step 1 (above the fold):
- [Google Sign Up] button (primary, prominent)
- "OR" divider
- Email field: "work@company.com"
- [Continue] button
- "No credit card required. Free for 14 days."

Step 2 (after email):
- Full name: "Jane Smith"
- Password: [show/hide toggle, strength meter]
- [Create My Account] button
- "By creating an account, you agree to our Terms and Privacy Policy"

Post-submit:
- Skip email verification (verify later when sharing/collaborating)
- Go directly to onboarding checklist
```

### Common Signup Flow Patterns

**B2B SaaS Trial:**
1. Email + Password (or Google auth)
2. Name + Company (optional: role)
3. Direct to onboarding flow

**B2C App:**
1. Google/Apple auth OR Email
2. Straight to product experience
3. Profile completion later (progressive profiling)

**Waitlist/Early Access:**
1. Email only (absolute minimum friction)
2. Optional: One role/use case question
3. Waitlist confirmation page

**E-commerce Account:**
1. Guest checkout as default (don't force account creation)
2. Account creation optional post-purchase
3. OR Social auth with single click

## Experiment Ideas

### Form Design Experiments

**Layout and Structure:**
- Single-step vs. multi-step signup flow
- Multi-step with progress bar vs. without progress bar
- 1-column vs. 2-column field layout
- Form embedded on page vs. separate dedicated signup page

**Field Optimization:**
- Reduce to absolute minimum fields (email + password only)
- Add or remove phone number field
- Single "Name" field vs. "First Name / Last Name" split
- Add or remove company/organization field
- Test required vs. optional field balance

**Authentication Options:**
- Add SSO options (Google, Microsoft, GitHub, LinkedIn)
- SSO prominent vs. email form prominent
- Test which SSO options resonate with your specific audience
- SSO-only vs. SSO + email option

### Copy and Messaging Experiments

**Headlines and CTAs:**
- Test headline variations above signup form
- CTA button text: "Create Account" vs. "Start Free Trial" vs. "Get Started"
- Add clarity around trial length in CTA ("Start Your 14-Day Free Trial")
- Test value proposition emphasis in form header

**Trust Elements:**
- Add social proof next to signup form (user count, testimonials)
- Test trust badges near form (security, compliance certifications)
- Add "No credit card required" messaging
- Include privacy assurance copy ("We respect your privacy")

### Trial and Commitment Experiments

- Credit card required vs. not required for trial start
- Test trial length impact on signup rate (7 vs. 14 vs. 30 days)
- Freemium vs. free trial model
- Trial with limited features vs. full access

### Post-Submit Experiments

- Clear next steps messaging after signup
- Instant product access vs. email confirmation first
- Auto-login after signup vs. require separate login
- Personalized welcome message based on signup data

## Measurement

### Key Metrics to Track
| Metric | What It Tells You |
|--------|-------------------|
| Form start rate | Landed on page -> Started filling (measures page effectiveness) |
| Form completion rate | Started filling -> Submitted (measures form friction) |
| Field-level drop-off | Which specific fields lose people (pinpoints friction) |
| Time to complete | Total time and per-field time (identifies confusion) |
| Error rate by field | Which fields cause errors (identifies UX issues) |
| Mobile vs. desktop completion | Device-specific problems |
| Social auth vs. email ratio | Preference and friction comparison |

### What to Instrument
- Each field interaction (focus, blur, error events)
- Step progression in multi-step flows
- Time between steps
- Social auth click-through and completion
- Error messages shown and recovery actions taken

## Quality Criteria

- Every field in the current flow is evaluated with a keep/remove/defer recommendation and rationale
- Recommendations distinguish between proven best practices (implement) and hypotheses (test)
- Mobile experience is specifically addressed, not just desktop
- Post-submit experience is covered, not just the form itself
- Copy recommendations are specific (actual text, not just "improve the label")
- Measurement plan is included so improvements can be tracked
- Recommendations account for B2B vs. B2C differences where relevant

See also: `skills/bot-001-onboarding-cro/SKILL.md`, `skills/bot-001-form-cro/SKILL.md`, `skills/bot-001-page-cro/SKILL.md`, `skills/bot-001-popup-cro/SKILL.md`
