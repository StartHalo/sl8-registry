---
name: onboarding
description: Collect user identity, role, objective, and preferences; write a structured profile to /home/user/bot/user.md so future sessions are personalized.
metadata:
  author: sl8
  version: 1.0.0
  inputs:
    - name: conversation
      type: chat
      required: true
      description: Free-form Q&A with the user covering 3–5 short onboarding questions
  outputs:
    - name: user-profile
      type: bot-file
      path: bot/user.md
      description: GLOBAL mode — structured profile (identity, objective, preferences), captured once
    - name: project-context
      type: markdown
      path: artifacts/<project-name>/context.md
      description: PROJECT mode — per-project brief, written once at project start (plus state.md init)
---

# Onboarding

## Modes

This skill runs in one of two modes. Pick based on the trigger:

### GLOBAL mode — the operator (unchanged)
Trigger: first session, or the user asks to set up "who I am" / preferences.
Behavior: exactly as the **When to Use** / **Instructions** below — read `bot/user.md`, ask
3–5 questions, synthesize the three sections (`## Who I am`, `## My objective`,
`## Preferences`) in `<USER>…</USER>`, merge idempotently, write `bot/user.md`. (≤2,000
chars. Captured ONCE, globally.)

### PROJECT mode — a new project (net-new)
Trigger: the bot is starting a multi-phase PROJECT and no `artifacts/<project>/context.md`
exists yet (project phase 0).
Behavior:
1. Determine the project name (kebab-case, 3–50 chars) and create `artifacts/<project>/`.
2. Ask 3–5 short project questions, one at a time (what is this product/account/ticket,
   who is it for, the strategic question/objective, what data they'll provide, any
   project-specific constraints). If a handoff seed was imported from an upstream bot,
   pre-fill from it and confirm rather than re-ask.
3. Write `artifacts/<project>/context.md` using the `<PROJECT_CONTEXT>` template (project
   identity, audience, subject specifics, strategic question, provided-data inventory,
   standing constraints, optional imported handoff). ≤2,500 chars. Idempotent.
4. Initialize `artifacts/<project>/state.md` with THIS bot's phase table: phase 0 (onboard)
   = `done`, phase 1 = `next`, fill the `skill` / `reads` / `writes` cells from the bot's
   **default phase chain** (embedded at build time — see the phase rows in
   `references/project-files.md` and the routing in `.claude/skills/INDEX.md`), set
   `next_action` to phase 1's imperative. A project may add/skip/reorder phases for its needs.

Project mode NEVER writes `bot/user.md`, and global mode NEVER writes `context.md`/`state.md`.
The exact `context.md` (`<PROJECT_CONTEXT>`) and `state.md` (phase ledger) shapes to copy are
in `references/project-files.md`.

After the session ends, the `dashboard.py` Stop hook renders this project onto
`artifacts/dashboard.html` automatically — no action needed here.

---

## When to Use

- The user runs the bot for the first time and `/home/user/bot/user.md` is still a placeholder (sections empty).
- The user asks to update their profile, preferences, role, or objective ("change my goal", "I'm working on a different audience now", "update what you know about me").
- The user says they're a new person taking over the bot.

If `bot/user.md` already has substantive content and the user hasn't asked for an update, do not invoke this skill — it would interrupt the actual task.

## Instructions

1. **Read `/home/user/bot/user.md`** to see what's already known. Two cases:
   - **Empty placeholder** — frame the conversation as first-time onboarding.
   - **Has content** — frame it as an update; preserve fields the user doesn't change.

2. **Ask 3–5 short questions, one at a time.** Tailor wording to the bot's domain (the bot's `<PERSONALITY>` and `<KNOWLEDGE>` are in your system prompt). Cover:
   - **Identity** — name, role, organization (if relevant).
   - **Objective** — what they want this bot to accomplish for them.
   - **Preferences** — tone, style, locale, audience, anything that should persist across sessions.
   - Optional follow-up if any answer is too vague to be useful.

3. **Synthesize answers** into a structured markdown file. Three required sections:

   ```markdown
   <USER>

   ## Who I am
   <one paragraph or short bullets in the user's own words>

   ## My objective
   <what they want this bot to do, in their own framing>

   ## Preferences
   <bullets: tone, style, locale, audience, constraints>

   </USER>
   ```

4. **Merge with existing content** if `bot/user.md` already had real content. Do not overwrite blindly:
   - Keep fields the user didn't change.
   - Update fields they explicitly revised.
   - Add a `<!-- Updated YYYY-MM-DD -->` HTML comment at the top of the file (or update the existing one).

5. **Write `/home/user/bot/user.md`** with the merged result.

6. **Confirm briefly with the user**: summarize in 2–3 sentences what was recorded. Offer to refine if anything is wrong. Do not list every field back — that's noise.

## Outputs

- `/home/user/bot/user.md` — markdown with `<USER>` wrapper and three required sections.

## Quality Criteria

- All three sections present and non-empty (or kept from existing content).
- Wording is in the user's own words where possible — don't paraphrase aggressively.
- No invented details. If the user didn't mention something, leave it out (don't fill `## Preferences` with "professional, clear, helpful" generic boilerplate).
- Idempotent: running with the same answers produces the same file content.
- Fits within ~2,000 characters total. If the user is verbose, condense to bullets.
