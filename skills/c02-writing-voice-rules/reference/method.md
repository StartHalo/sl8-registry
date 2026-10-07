# Method: one voice, tone by moment

"The same voice all the time, but your tone changes" with the reader's state (Mailchimp Content Style
Guide). Atlassian raises or lowers each trait with the user's state; Monzo sets a dial per channel.

## Traits: "X, not Y"
- Choose 3 to 5. Fewer cannot guide a writer; more cannot be remembered.
- Pair each with its overdone version, so a writer knows where the line is: "Warm, not gushing",
  "Direct, not curt", "Calm, not flat", "Plain, not clever".
- Avoid traits every app claims ("friendly, modern, simple"). If a competitor would pick the same
  word, make the "not" do the work.
- Each trait gets **Means** (one sentence), a **Do** line and a **Don't** line, written as real copy
  for this app (a reminder, a button, a subtitle). Rules without examples are ignored (Transform
  Magazine's critique of three-word voice statements).
- Example lines show the voice, not new facts: a number, time, place or feature in one comes from a
  saved page, the copy or the request; otherwise write it as a placeholder (`{n} minutes`, `{place}`).

## Tone by moment (the six moments are ours, adapted from Mailchimp and Atlassian)
| Moment | Usual tone shift |
|---|---|
| First open | welcoming, brief |
| Reminder | light, never guilt |
| Error | plain, owns it, says what is safe |
| Milestone | warm, specific, no hype |
| Store listing | the promise in fewest words |
| Social | lighter, same voice |

## Rewrites
Take 3 to 6 lines from the app's own copy (the copy the lead sent, else the store description that
`page.mjs` saved in `sources/`). Copy each **before** exactly from the request, the attached file or
the saved page; write the **after** in the voice; name the trait it shows. Prefer the lines that break
a trait most. When the copy sent has fewer than three lines, add lines from the saved store page and
say so in the header's "Copy rewritten" line.

A store field (name, subtitle, promotional text, keywords, a Play title or short description) keeps
its store's limit when it is rewritten: Apple's name and subtitle 30 characters, promotional text 170,
Play's title 30 and short description 80. `scripts/limits.mjs` counts it the way the store-listing job
does; `validate.mjs` checks every rewrite whose Where names a store field. An after a store would not
take is no example of the voice.

## Words
- **Use:** the words the app's people use for its things (from the store page and reviews).
- **Avoid:** hype and filler (ultimate, revolutionary, seamless, "Oops!"), and the lead's banned words,
  each with what to say instead where it helps.

## Where the promise comes from
`artifacts/<app>/messaging-house.md` when present; else the store page's subtitle, stated under
Assumptions.
