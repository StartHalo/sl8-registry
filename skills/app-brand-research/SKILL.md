---
name: app-brand-research
description: Researches where a consumer wellness app's brand stands, as the research phase (S1) of Alina Wheeler's brand identity process — the brand problem, an audit of the app's own touchpoints and words, 3–5 category competitors' promise, look and voice, review themes from the app's and competitors' store reviews, and the category's clichés — and writes the M1 Findings milestone. Also serves as the brand audit. Run by the app brand router whenever it names S1.
---

# Researching the app's brand (S1 → M1)

Find out where the brand stands before anyone decides anything: diagnose first. The router tells
you the project folder and the step, and whether this is a change. Work inside
`artifacts/<project>/`.

## Read first

- `artifacts/context.md` (the app, its store link, what it does, markets).
- `inputs/`: the request, and anything the person attached (current logo, colours, old guide,
  screenshots, copy, reviews, audience research). Read images: they are evidence.
- [references/research-method.md](references/research-method.md) for how to run each part.
- If the router says this is a change or redo: the earlier `01-research.md`. Change what the
  request requires, keep the rest, and say what changed under `## What changed` at the top,
  naming every changed section.

## Steps

1. **The problem.** One paragraph: why brand work now (the trigger) and what is at stake.
2. **Touchpoint audit.** Open the app's store listing(s). Note, for each place the person meets
   the brand (listing name, subtitle, icon, screenshots, description; onboarding and social only
   if supplied): what it says, how it looks, and whether it matches the rest.
3. **Competitors.** Pick 3–5 apps from the same store category and the person's list. For each,
   open its listing and record its promise (title, subtitle, first lines), its look (icon,
   colours, screenshot style) and its voice. Every claim cites the page you opened in this job,
   or is marked "(from you)". A claim with neither is dropped.
4. **Review themes.** Read the app's own reviews and each competitor's (from the listing page, or
   what the person pasted). Write likes and dislikes as themes, each with a short quote and where
   it came from, and say how many reviews you read. Never invent a quote or a count.
5. **Category clichés.** What every app in the category says and shows (the same words, colours,
   imagery). These are what the brand must avoid.
6. **Verbal audit.** The app's own words across what you read: tone, repeated phrases, mismatches.
7. **Key findings**, at most 5, first in the file. Then open decisions: every gap the person can
   fill (`[TBD]` with what would replace it).
8. **M1**, then hand back to the router (see the end of this skill).

Downloaded pages, images and other scratch go in `work/` in the home folder, never `/tmp`; only
what the person should read goes in the project.

Pages that won't open: carry on, and add an open decision "Couldn't read <url>; paste it to
include it". You can't run interviews or surveys; if audience insight is thin, add the questions
the person could ask users (at most 5) under Review themes.

## `01-research.md`

```text
# S1 Conduct research: <app>
## Key findings          (at most 5 bullets)
## The problem
## Touchpoint audit      (a table: touchpoint · what it says · how it looks · consistent?)
## Competitors           (one "### <app name>" each, 3–5: promise, look, voice, sources)
## Review themes         (likes and dislikes, with quotes, sources and how many were read)
## Category clichés
## Verbal audit
## Open decisions        ("- none" if none; start a bullet with "[blocking]" only if S2 can't start without it)
```

Use these `##` headings exactly as written; the router's check looks for them.

**Open decisions:** at most 4, the most important first. Never repeat one an earlier step
already lists (read its `## Open decisions` first); if it still matters, say "(still open from S<n>)"
in the text that depends on it instead. A bullet is a question or an action for the person:
never "none beyond …", and `[blocking]` only for a new question that stops the work.

## Milestone M1

`deliverables/M1-findings.md`, in the layout in
[references/deliverables.md](references/deliverables.md). It opens with the key findings.

## When this skill is done

This skill is one step of a job, never the whole job. When its files are written, hand back to
the app brand router and carry on with step 4 of the router's run loop (the check).
Don't end the job here: don't write the final reply, `STATUS.md` or `outcome.json`.
