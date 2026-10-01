# The sequence setup sheet

`pack/sequence-setup.md` tells the founder exactly what to set in their own tool. It stands
alone: someone who opens only this file can set the campaign up.

```text
# Set up: <campaign>

<one line: N emails over D days to <segments>; the founder imports and sends>

## The emails
| # | Subject | Send | Segment | HTML file | Text file |
(from build.json; Send as "day 0", "+3 days after email 1" …)

## Who gets it
Each segment and its file in contacts/ (with the counts contacts.mjs printed), or the template
and the columns to fill. Who to leave out (the suppression list from 01-insights.md).

## When someone stops getting it
The exit rule, written as the tool setting ("remove from the sequence when …").

## Merge tokens in your tool
The table from tool-tokens.md. The founder's tool first, if the profile names one.

## Bringing the emails in
For each email: create an email or sequence step in your tool, choose "code your own" or "custom
HTML" (the name varies), paste or import the .html file, add the .txt as the plain-text version,
replace the two tokens, set the delay. Then the send checklist.
```
