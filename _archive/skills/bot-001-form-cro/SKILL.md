---
name: bot-001-form-cro
description: Optimizes lead capture, contact, demo request, and application forms for completion rate. Use when forms have low submission rates or need field-by-field optimization.
metadata:
  author: sl8
  version: 1.0.0
  bot: BOT-001
---

# Form CRO

## Purpose

Optimize any form that is NOT signup/registration -- including lead capture forms, contact forms, demo request forms, application forms, survey forms, quote request forms, and checkout forms. Use this skill to maximize form completion rates while capturing the data that matters. For signup/registration forms, see `skills/bot-001-signup-flow-cro/SKILL.md`. For forms inside popups, see `skills/bot-001-popup-cro/SKILL.md`. For the page containing the form, see `skills/bot-001-page-cro/SKILL.md`.

## Instructions

### Step 1: Initial Assessment

Before providing recommendations, identify three areas:

**1. Form Type:**
- Lead capture (gated content, newsletter signup)
- Contact form
- Demo/sales request
- Application form
- Survey/feedback
- Checkout form
- Quote/estimate request

**2. Current State:**
- How many fields does the form have?
- What is the current completion rate?
- Mobile vs. desktop traffic split?
- Where do users abandon (field-level data if available)?

**3. Business Context:**
- What happens with form submissions? (auto-response, sales follow-up, content delivery)
- Which fields are actually used in follow-up?
- Are there compliance/legal requirements?

### Step 2: Apply Core Principles

#### Principle 1: Every Field Has a Cost
Each field reduces completion rate. Use this rule of thumb for impact estimation:
| Field Count | Estimated Impact |
|-------------|-----------------|
| 3 fields | Baseline (highest completion) |
| 4-6 fields | 10-25% reduction from baseline |
| 7+ fields | 25-50%+ reduction from baseline |

For each field currently in the form, ask:
- Is this absolutely necessary before we can help them?
- Can we get this information another way (enrichment, progressive profiling)?
- Can we ask this later in the relationship?

#### Principle 2: Value Must Exceed Effort
- Clear value proposition must appear above or beside the form
- Make what they get obvious and specific ("Download the 2024 State of Remote Work Report" not "Get Our Content")
- Reduce perceived effort through field count, clean labels, and generous spacing

#### Principle 3: Reduce Cognitive Load
- One question per field (never combine)
- Clear, conversational labels
- Logical grouping and ordering
- Smart defaults where possible (pre-select most common option)

### Step 3: Field-by-Field Optimization

Go through each field and optimize:

**Email Field:**
- Single field, never add email confirmation
- Inline validation for format
- Typo detection ("Did you mean gmail.com?")
- Proper mobile keyboard (type="email")

**Name Fields:**
- Test single "Name" vs. First/Last split (single often wins)
- Single field reduces friction by one field and one decision
- Only split if personalization genuinely requires separate first/last

**Phone Number:**
- Make optional whenever possible
- If required, explain why ("We'll call within 24 hours to schedule your demo")
- Auto-format as they type
- Country code handling for international audiences

**Company/Organization:**
- Auto-suggest company names for faster entry
- Consider enrichment after submission (Clearbit, ZoomInfo, etc.)
- Infer from email domain for business emails

**Job Title/Role:**
- Use dropdown if you need specific categories for routing
- Use free text if wide variation expected
- Consider making optional -- often not needed at form stage

**Message/Comments (Free Text):**
- Make optional unless it's a contact form
- Provide reasonable character guidance
- Auto-expand textarea on focus (start small, grow)

**Dropdown Selects:**
- Always include "Select one..." placeholder
- Searchable dropdown if more than 7 options
- Use radio buttons instead if fewer than 5 options (faster to scan)
- Include "Other" option with text field for unexpected cases

**Checkboxes (Multi-select):**
- Clear, parallel labels (same grammatical structure)
- Reasonable number of options (5-8 maximum visible)
- Include "Select all that apply" instruction

### Step 4: Optimize Form Layout

**Field Order:**
1. Start with easiest fields (name, email) -- build commitment
2. Build psychological commitment before asking more
3. Place sensitive fields last (phone, company size, budget)
4. Group related fields logically if many fields

**Labels and Placeholders:**
- Labels: Always visible -- never use placeholder text as the only label
- Placeholders: Use for examples only ("e.g., jane@company.com")
- Help text: Only when genuinely helpful, placed directly below the field

Good example:
```
Email Address              <-- visible label
[jane@company.com]         <-- placeholder as example
```

Bad example:
```
[Enter your email address] <-- disappears on focus, user forgets what field this is
```

**Visual Design:**
- Sufficient spacing between fields (at least 16px)
- Clear visual hierarchy (labels stand out, fields are clearly bounded)
- CTA button visually stands out (contrast, size)
- Mobile-friendly tap targets (44px+ height for all interactive elements)

**Single Column vs. Multi-Column:**
- Single column: Higher completion rate, mobile-friendly, easier to scan
- Multi-column: Only for short, related field pairs (First/Last name, City/State)
- When in doubt, always use single column

### Step 5: Evaluate Multi-Step Forms

**When to use multi-step:**
- More than 5-6 fields are genuinely needed
- Form has logically distinct sections (personal info, project details, preferences)
- Conditional paths based on answers (different questions for different selections)
- Complex forms (applications, detailed quote requests)

**Multi-step best practices:**
- Progress indicator ("Step 2 of 4")
- Start with easy questions, end with sensitive/complex ones
- One topic per step
- Allow back navigation
- Save progress (don't lose data on refresh or browser back)
- Clear indication of required vs. optional on each step

**Progressive commitment pattern:**
1. Low-friction start (just email or email + name)
2. More detail (company, role, project description)
3. Qualifying questions (timeline, budget range)
4. Contact preferences (how and when to reach them)

### Step 6: Optimize Error Handling

**Inline Validation:**
- Validate as the user moves to the next field (on blur), not while typing
- Don't validate too aggressively while typing (wait for blur event)
- Clear visual indicators: green checkmark for valid, red border for errors

**Error Messages:**
- Specific to the exact problem ("Please enter a valid email address, e.g., name@company.com")
- Suggest how to fix (not just "Invalid input")
- Positioned directly below the field, not in a summary at top of form
- Never clear user input on error

**On Submit:**
- Auto-focus on the first error field
- If multiple errors, show summary AND inline indicators
- Preserve all entered data
- Never clear the entire form on submit error

### Step 7: Optimize Submit Button

**Button Copy:**
- Weak: "Submit" | "Send" (generic, no value communicated)
- Strong: "[Action] + [What they get]"
- Examples by form type:
  - Lead capture: "Download the Guide" | "Get My Free Report"
  - Contact: "Send Message" | "Get in Touch"
  - Demo request: "Request My Demo" | "Book a Demo"
  - Quote: "Get My Free Quote" | "See My Estimate"
  - Application: "Submit Application" | "Apply Now"

**Button Placement:**
- Immediately after the last field (no gap or separation)
- Left-aligned with fields (not centered, unless the form is centered)
- Sufficient size and contrast to be the most prominent element
- Mobile: Consider sticky button at bottom of viewport for long forms

**Post-Submit States:**
- Loading state: Disable button, show spinner, change text to "Sending..."
- Success confirmation: Clear message with specific next steps ("Check your email for the download link")
- Error handling: Clear message, focus on the issue, don't lose data

### Step 8: Add Trust and Friction Reduction

**Near the form, include:**
- Privacy statement: "We'll never share your information"
- Security badges if collecting sensitive data
- Testimonial or social proof ("Join 10,000+ marketers")
- Expected response time for contact/demo forms ("We respond within 24 hours")

**Reducing perceived effort:**
- "Takes 30 seconds" near the form
- Show field count if it's genuinely low ("Just 3 fields")
- Remove visual clutter around the form
- Generous white space

**Addressing specific objections:**
- "No spam, unsubscribe anytime" (newsletter)
- "We won't call without your permission" (if phone is collected)
- "No credit card required" (trial/freemium)
- "Free, no commitment" (lead magnets)

### Step 9: Apply Form-Type-Specific Guidance

**Lead Capture (Gated Content):**
- Minimum viable fields (often just email is enough)
- Clear, specific value proposition for what they get
- Consider asking enrichment questions on the thank-you page (after they've committed)
- Test email-only vs. email + name

**Contact Form:**
- Essential: Email or Name + Message
- Phone: Always optional
- Set response time expectations explicitly
- Offer alternative contact methods (chat, phone number, calendar link)

**Demo Request:**
- Name, Email, Company: typically required
- Phone: Optional with "preferred contact method" choice
- Add a use case/goal question to help personalize the demo
- Calendar embed can increase show rate (let them pick a time immediately)

**Quote/Estimate Request:**
- Multi-step often works well (break complex info gathering into sections)
- Start with easy project description questions
- Save technical/budget details for later steps
- Save progress for complex forms (allow coming back)

**Survey Forms:**
- Progress bar is essential
- One question per screen for better engagement
- Skip logic for relevance (don't ask irrelevant follow-ups)
- Consider incentive for completion (results, report, discount)

### Step 10: Mobile Optimization

- Larger touch targets (44px minimum height for all inputs and buttons)
- Appropriate keyboard types (type="email", type="tel", inputmode="numeric")
- Autofill support (proper autocomplete attributes on every field)
- Single column layout only on mobile
- Sticky submit button for long forms
- Minimize typing wherever possible (use dropdowns, radio buttons, toggle switches)

### Step 11: Structure Output

Organize recommendations as:

**Form Audit:**
For each issue: Issue -> Estimated Impact -> Specific Fix -> Priority (High/Medium/Low)

**Recommended Form Design:**
- Required fields with justification for each
- Optional fields with rationale for inclusion
- Recommended field order
- Copy for all labels, placeholders, help text, button, and error messages
- Visual layout guidance

**Test Hypotheses:**
Ideas to A/B test with expected outcomes

## Inputs

- Current form (URL, screenshot, or description of all fields and layout)
- Form type (lead capture, contact, demo request, etc.)
- Current completion rate and field-level analytics (if available)
- Business requirements: what data is needed and what happens with submissions
- Compliance or legal requirements
- Mobile vs. desktop traffic split
- Which submitted fields are actually used in follow-up processes

## Outputs

A structured form optimization plan containing:

1. **Form Assessment** -- Type, current state, business context
2. **Field-by-Field Analysis** -- Each field evaluated with keep/remove/defer/optimize recommendation
3. **Audit Findings** -- Prioritized list of issues with specific fixes
4. **Recommended Form Design** -- Complete field set, order, copy, layout, and error messages
5. **Trust Elements** -- What to add near the form
6. **Test Hypotheses** -- A/B test ideas with expected impact
7. **Measurement Plan** -- What to track

Save output to: `work/form-audit-[form-name].md`

## Examples

### Example: Field Removal Recommendation
```
**Issue**: Phone number is required on lead capture form for ebook download
**Impact**: High -- phone fields typically reduce form completion by 15-25%.
  Current form has 6 fields; removing phone brings it to 5 (estimated +15% completions).
**Fix**: Remove phone field entirely. If sales needs phone later, collect via progressive
  profiling on subsequent form submissions or during first email exchange.
**Priority**: High
```

### Example: Recommended Form Design
```
**Demo Request Form (Recommended)**

Field 1: Full Name (required)
  Label: "Your name"
  Placeholder: "Jane Smith"
  Autocomplete: "name"

Field 2: Work Email (required)
  Label: "Work email"
  Placeholder: "jane@company.com"
  Validation: Email format + suggest typo corrections
  Autocomplete: "email"

Field 3: Company (required)
  Label: "Company"
  Placeholder: "Acme Inc."
  Feature: Auto-suggest as they type
  Autocomplete: "organization"

Field 4: What's your biggest challenge? (optional)
  Label: "What would you like to see in the demo?"
  Type: Textarea, 2 lines, expandable
  Help text: "Optional -- helps us personalize your demo"

[Book My Demo] (primary button -- high contrast, full width on mobile)

Trust elements below button:
- "30-minute personalized walkthrough"
- "No commitment required"
- Customer logos: [Logo1] [Logo2] [Logo3]
```

### Example: Error Message Copy
```
**Email field errors:**
- Empty: "Please enter your email address"
- Invalid format: "Please enter a valid email (e.g., name@company.com)"
- Typo detected: "Did you mean jane@gmail.com?" [Yes] [No, keep as typed]
- Already submitted: "You've already requested a demo. Check your email for confirmation, or contact support@company.com"
```

## Experiment Ideas

### Form Structure Experiments

**Layout and Flow:**
- Single-step form vs. multi-step with progress bar
- 1-column vs. 2-column field layout
- Form embedded on page vs. separate dedicated page
- Form above fold vs. after persuasive content
- Vertical vs. horizontal field alignment

**Field Optimization:**
- Reduce to minimum viable fields (measure impact)
- Add or remove phone number field
- Add or remove company/organization field
- Test required vs. optional field balance
- Use field enrichment to auto-fill known data (Clearbit, etc.)
- Hide fields for returning/known visitors (progressive profiling)

**Smart Forms:**
- Add real-time validation for emails and phone numbers
- Progressive profiling (ask different questions on repeat visits)
- Conditional fields based on earlier answers
- Auto-suggest for company names

### Copy and Design Experiments

**Labels and Microcopy:**
- Test field label clarity and length ("Email" vs. "Work Email" vs. "Your Email Address")
- Placeholder text optimization (example vs. instruction vs. empty)
- Help text: show always vs. show on hover vs. hide
- Error message tone (friendly vs. direct vs. helpful)

**CTAs and Buttons:**
- Button text variations ("Submit" vs. "Get My Quote" vs. action-specific)
- Button color and size testing
- Button placement relative to fields

**Trust Elements:**
- Add privacy assurance near form
- Show trust badges next to submit button
- Add testimonial or social proof near form
- Display expected response time

### Form-Type-Specific Experiments

**Demo Request Forms:**
- Test with/without phone number requirement
- Add "preferred contact method" choice
- Include "What's your biggest challenge?" open question
- Test calendar embed vs. standard form submission

**Lead Capture Forms:**
- Email-only vs. email + name
- Test value proposition messaging above form (different benefit angles)
- Gated vs. ungated content strategies
- Post-submission enrichment questions on thank-you page

**Contact Forms:**
- Add department/topic routing dropdown
- Test with/without message field requirement
- Show alternative contact methods (chat widget, phone number)
- "Expected response time" messaging

### Mobile and UX Experiments

- Larger touch targets for mobile (48px vs. 44px)
- Test appropriate keyboard types by field
- Sticky submit button on mobile
- Auto-focus first field on page load
- Test form container styling (card with shadow vs. minimal flat)

## Measurement

### Key Metrics
| Metric | What It Measures |
|--------|-----------------|
| Form start rate | Page views -> First field focus (measures form visibility and appeal) |
| Completion rate | First field focus -> Successful submission (measures form friction) |
| Field drop-off | Which specific fields lose people (pinpoints friction) |
| Error rate by field | Which fields cause errors (identifies confusing UX) |
| Time to complete | Total and per-field (identifies fields that cause hesitation) |
| Mobile vs. desktop | Completion rate by device (identifies device-specific problems) |

### What to Instrument
- Form views (page load with form visible)
- First field focus event
- Each field completion (blur with value)
- Each field error (validation failure)
- Submit button clicks (attempts)
- Successful submissions
- Time from first field focus to submission

## Quality Criteria

- Every field is evaluated with a clear keep/remove/defer/optimize recommendation and business rationale
- Specific copy is provided for all labels, placeholders, buttons, and error messages (not just "improve the label")
- Layout recommendations account for both desktop and mobile
- Trust and friction reduction elements are specific to the form type
- Multi-step form recommendations include progress indication and back navigation
- Error handling is fully specified (inline validation, error messages, submit behavior)
- Measurement plan is included with specific metrics and tracking events
- Estimated impact is provided for each recommendation (quantified where possible)

See also: `skills/bot-001-signup-flow-cro/SKILL.md`, `skills/bot-001-popup-cro/SKILL.md`, `skills/bot-001-page-cro/SKILL.md`, `skills/bot-001-onboarding-cro/SKILL.md`
