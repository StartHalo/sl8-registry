# The setup sheet (the "## Setup sheet" section of sequence.md)

It tells the founder exactly what to set in their own tool, and stands alone: someone who reads only
this section can set the sequence up.

1. **The trigger:** what starts the sequence (a trial starts, a sign-up, a launch date the founder sets).
2. **The emails:** for each, the HTML file, the text file and its delay from the storyboard.
3. **The exit:** the storyboard's exit, written as the tool setting ("remove from the sequence when …").
4. **The footer:** say plainly that the founder's tool adds the unsubscribe link and the postal
   address, and which tags replace `{{unsubscribe_url}}` and `{{postal_address}}` (from tool-tokens.md,
   the founder's tool first; all tools when none is named). `{{first_name}}` gets a fallback ("there").
5. **Bringing the emails in:** "code your own" or "custom HTML" (the name varies), paste or import the
   .html file, add the .txt as the plain-text version.
