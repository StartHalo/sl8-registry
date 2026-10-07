---
name: c03-defining-icp
description: Defines the ideal customer and positioning for a small B2B SaaS as a one-page ICP in April Dunford's order - competitive alternatives, unique attributes, value with proof, best-fit segments (company type and size, buyer, user, trigger, where to reach, evidence), market category and a positioning statement. Use when a founder asks who their ideal customer is, to define their ICP or target customer, or to position the product against the alternatives.
---

# Defining the ICP and positioning

One job, one deliverable: `artifacts/<product>/icp.md`. `<product>` is the product's name in lower
case, with hyphens. Run the scripts from this skill's folder: `S=~/.claude/skills/c03-defining-icp`.

**Required:** the product (name and website); without it there is no job. **Assumed when missing, and
listed under Assumptions:** the sales motion and price (from the pricing page), the best customers
today (from the site's logos and case studies), competitors (up to 3 found and opened, plus doing
nothing), review text (none: review sites are not read).

## Workflow (copy into your task list and tick)
- [ ] 1. Save the request word for word with the Write tool to `artifacts/<product>/inputs/request-icp.md`.
- [ ] 2. Check inputs: `node $S/scripts/inputs.mjs artifacts/<product>/inputs/request-icp.md`.
        If the product is missing, read `artifacts/profile.md` if it exists (do not create or change it), then skip to step 7 with `"state":"waiting"`,
        one open decision (`{"text":"Send your product's name and website","state":"open","needs":"product"}`) and no
        deliverables, then reply with the script's `say` line and end `partial`. Never write the one-pager without the product.
        Otherwise keep the `assume` list it prints. Each input on it gets an Assumptions line in step 5.
- [ ] 3. Read `artifacts/profile.md` and `artifacts/<product>/STATUS.md` if they exist: use their stored context, and any
        decision the founder has since answered. Create or update the profile with only what the founder said: company,
        product, website, sales motion and price.
- [ ] 4. Open the product's site and its pricing page. Find the alternatives: those the request names, else search
        "<product> alternatives" and "<category> for <customer type>" and open up to 3; doing nothing (a spreadsheet,
        by hand) is always one. Open each page you state a fact about and note its link.
- [ ] 5. Draft from [reference/template.md](reference/template.md), working through
        [reference/method.md](reference/method.md) in order. Match the specificity of
        [the example](reference/examples/good-1.md); the `ref-` examples show real positioning work.
        Follow [reference/rules.md](reference/rules.md). For every input on the `assume` list, write
        `- **<label>:** not given. Assumed <what>. Send <what> to replace it.` When every input was given and nothing else was assumed, write
        `- None: every input was given.`; any other assumption (a page that would not open, a baseline not given) gets its own line instead Never leave [TBD].
- [ ] 6. Validate: `node $S/scripts/validate.mjs artifacts/<product>/icp.md --request artifacts/<product>/inputs/request-icp.md`.
        Fix every error and rerun until `ok` is true.
- [ ] 7. Update the project status. Write `artifacts/<product>/inputs/job-icp.json`:
        `{"job":"define-icp","what":"<product>: marketing","state":"active","context":{"primary segment":"…","market category":"…","positioning":"…","sales motion":"…"},"decisions":[…one per Assumptions line that asks the founder for something, each {"text","state":"open","needs"}],"deliverables":[{"name":"ICP and positioning one-pager","file":"<product>/icp.md"}]}`.
        Then run `node ~/.claude/skills/run-sl8-job/scripts/status.mjs --project <product> --record artifacts/<product>/inputs/job-icp.json`.
- [ ] 8. Reply in at most 8 lines: the primary segment, the positioning statement, what you assumed, and the file.
        Do not paste the whole document.

## Rules
- The product must be named in the request; a product in the profile does not stand in for it (the founder may have several).
- "Position our product" or "who is our ICP" still returns the full one-pager; lead the reply with what was asked.
- A request that mentions review text but holds none ("reviews: see below" with nothing below) counts as not given: add its Assumptions line.
- A named competitor whose page you cannot find stays in the alternatives as the founder named it, marked `(not opened)`, with an Assumptions line.
- `<product>` is also the project (`--project`). When the request names no product, `<product>` is `new-project` (the partial path only).
- If the site or a page will not open, say so under Assumptions and work from the request; never fill the gap from memory.
- Never read G2, Capterra or other review sites that block automated reading; use review text the founder sends.
- Never spend, post, change the site or pricing, or contact anyone. Only `artifacts/<product>/` and
  `artifacts/profile.md` are written. Never delete files.
- `scripts/lib.mjs` holds the parsing that `inputs.mjs` and `validate.mjs` share; read it only to understand an error, never run it.
