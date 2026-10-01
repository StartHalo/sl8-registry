# Technical checks from page text and HTML (S2)

Without a browser, S2 covers what the fetched page shows. State plainly what it doesn't.

## Checks you can run

| Check | How | Typical issue |
|---|---|---|
| Calls to action resolve | every button or link on the main path points to a real URL; fetch the demo and sign-up targets | a "Book a demo" link pointing to a missing page, or two different demo URLs |
| Forms are complete | the demo and sign-up forms have fields and a submit; external form hosts load | a form that appears only by script (comes back empty) |
| Duplicated or conflicting paths | the same action reached by several URLs or labels | "Request demo", "Schedule demo" and "Contact us" going to different places |
| Mobile basics | a viewport tag in the HTML, if the raw HTML is available | none present |
| Leftover or broken content | template text, placeholder copy, mismatched headings, broken characters | sample text from a theme still on the home page |
| Titles and descriptions | each key page has its own title | every page titled the same |
| Page weight | very long pages or many scripts, when visible in what was fetched | — |

## Return on fix (Laja)

Rate each issue by how many visitors it affects, how badly, and how close the page is to revenue,
against the effort to fix: **high** (main path, cheap to fix), **medium**, **low** (rare, or
costly for small gain). A broken demo link is high; a missing page description is low.

## Not checked without a browser

Speed and Core Web Vitals; how the page looks on phones and tablets; browser-specific bugs;
anything built by script after the page loads. List each with what would settle it: the founder's
own speed test or analytics device report, or a screenshot.
