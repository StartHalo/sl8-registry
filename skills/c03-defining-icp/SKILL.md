---
name: c03-defining-icp
description: Defines the ideal customer and positioning for a small B2B SaaS as a one-page ICP in April Dunford's order - competitive alternatives, unique attributes, value with proof, best-fit segments (company type and size, buyer, user, trigger, where to reach, evidence), market category and a positioning statement. Use when a founder asks who their ideal customer is, to define their ICP or target customer, or to position the product against the alternatives.
---

# Defining the ICP and positioning

One job, one deliverable: `artifacts/<product>/icp.md`. `<product>` is the product's name in lower
case, with hyphens; it is also the project. Run the scripts from this skill's folder:
`S=~/.claude/skills/c03-defining-icp`.

**Required:** the product (name and website); without it there is no job. **Assumed when missing, and
listed under Assumptions:** the sales motion and price (from the pricing page), the best customers
today (from the site's logos and case studies), competitors (up to 3 found by a web search, each page
read, plus doing nothing), review text (none: review sites are not read).

## Workflow (copy into your task list and tick)
- [ ] 1. Save the request word for word with the Write tool (not a shell command) to `artifacts/<product>/inputs/request-icp.md`.
- [ ] 2. Check inputs: `node $S/scripts/inputs.mjs artifacts/<product>/inputs/request-icp.md`.
        If the product is missing, read `artifacts/profile.md` if it exists (do not create or change it), then skip to step 8's status record (leave the profile as it is) with `"state":"waiting"`,
        one open decision (`{"text":"Send your product's name and website","state":"open","needs":"product"}`) and no
        deliverables, then reply with the script's `say` line and end `partial`. Never write the one-pager without the product.
        Otherwise keep the `assume` list it prints: each input on it gets an Assumptions line in step 6 and one progress
        report, all in one command: `~/.sl8/bin/report assumption "<label>: <what you assume>"`.
- [ ] 3. Read `artifacts/profile.md` and `artifacts/<product>/STATUS.md` if they exist: use their stored context, and any
        decision the founder has since answered.
- [ ] 4. Read the product's site word for word: `node $S/scripts/page.mjs "<website>" --out artifacts/<product>/sources`.
        It saves the page's own words in `sources/` and prints the site's links: read the pricing page, and a customers or
        case-study page if there is one, the same way. Open each saved file and take facts and quotes only from it. Never use
        the page tool (WebFetch) for a fact or a quote: it answers with its own summary. A page that will not open:
        `~/.sl8/bin/report obstacle "<page> did not open" "<what you do instead>"`, and an Assumptions line.
- [ ] 5. Find the alternatives: those the request names; else search the web (WebSearch) for *<product> alternatives* and
        *<category> for <customer type>*. The search is not optional when the request names none. Choose up to 3 that buyers
        compare, and read each one's own home or pricing page with page.mjs: what it offers and costs comes only from that
        saved page (a page of the product comparing itself with a rival is the product's claim, not the rival's). Write the searches as the first line under
        Sources: `- Searched: *<query>*, *<query>*` (if the search fails: `- Searched: none: <why>`, and say under Assumptions
        how you chose them). Doing nothing (a spreadsheet, by hand) is always one. Then
        `~/.sl8/bin/report decision "Alternatives: <names>, from <the searches>"`.
- [ ] 6. Write `icp.md` with the Write tool from [reference/template.md](reference/template.md), working through
        [reference/method.md](reference/method.md) in order. Match [the example](reference/examples/good-1.md), written from the
        pages page.mjs saved ([page-1](reference/examples/page-1.md), [page-2](reference/examples/page-2.md)); the `ref-`
        examples show real positioning work. Follow [reference/rules.md](reference/rules.md). For every input on the `assume`
        list, write `- **<label>:** not given. Assumed <what>. Send <what> to replace it.` When every input was given and nothing
        else was assumed, write `- None: every input was given.`; any other assumption (a page that would not open, a size band
        no page states) gets its own line instead. Never leave [TBD].
- [ ] 7. Validate: `node $S/scripts/validate.mjs artifacts/<product>/icp.md --request artifacts/<product>/inputs/request-icp.md`.
        It looks for every quotation in the saved pages and the request, and for every page under Sources in `sources/`.
        Fix every error and rerun until `ok` is true.
- [ ] 8. Update the profile and the project status. Create or update `artifacts/profile.md` with only what the founder said
        in the request (company, product, website; the sales motion and price when given). Write `artifacts/<product>/inputs/job-icp.json`:
        `{"job":"define-icp","what":"<product>: marketing","state":"active","context":{"primary segment":"…","market category":"…","positioning":"…","sales motion":"… (given | assumed from <page>)"},"decisions":[…one per Assumptions line that asks the founder for something, each {"text","state":"open","needs"}],"deliverables":[{"name":"ICP and positioning one-pager","file":"<product>/icp.md"}]}`.
        Then run `node ~/.claude/skills/run-sl8-job/scripts/status.mjs --project <product> --record artifacts/<product>/inputs/job-icp.json`.
- [ ] 9. Reply with exactly these lines, filled in: at most 8, no code block, nothing else (the document is in the file):
        ```
        ICP and positioning for <Product>: artifacts/<product>/icp.md
        Primary segment: <its name>, because <the reason, in a few words>
        Positioning: <the statement>
        Alternatives: <their names, doing nothing included>
        Assumed: <the labels of the Assumptions lines>, or nothing
        Send next: <the one input that would most improve it>
        ```
        End `delivered` when the one-pager is saved and valid; `partial` only when the product is missing (step 2).

## Rules
- The product must be named in the request; a product in the profile does not stand in for it (the founder may have several).
- "Position our product" or "who is our ICP" still returns the full one-pager; lead the reply with what was asked.
- Every fact comes from a page page.mjs saved in this job, the request, or review text the founder sent. A search result's
  title or snippet, the page tool's summary and memory are not sources: leave the fact out, or state it under Assumptions.
- Quotation marks hold only words copied exactly from a saved page, the request or review text; the validator finds each
  one there. Search phrases, category frames, and names or titles you propose go in italics, never in quotation marks.
- A rival's price, feature or licence comes only from that rival's own page, read with page.mjs; without it, name the rival
  and say nothing more about it.
- A size band (staff, traffic, clients) that no saved page or the request states is marked `(assumed)`, with an Assumptions
  line saying what to send.
- A request that mentions review text but holds none ("reviews: see below" with nothing below) counts as not given: add its Assumptions line.
- A named competitor whose page you cannot find stays in the alternatives as the founder named it, marked `(not opened)`, with an Assumptions line.
- `<product>` is also the project (`--project`). When the request names no product, `<product>` is `new-project` (the partial path only).
- If the site or a page will not open, say so under Assumptions and work from the request; never fill the gap from memory.
- Never read G2, Capterra or other review sites that block automated reading; use review text the founder sends.
- Never spend, post, change the site or pricing, or contact anyone. Only `artifacts/<product>/` and
  `artifacts/profile.md` are written. Never delete files.
- `scripts/lib.mjs` holds the parsing that `inputs.mjs` and `validate.mjs` share; read it only to understand an error, never run it.
  `scripts/page.mjs` is run (step 4); the validator also uses its checks.
