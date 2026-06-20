# The "better, not different" judge (check 4)

AB-723 lets an edit make a property look **better** but not **different** in a way that misrepresents
it. This is the one check no script can make — it needs judgment over the original/edited pair. The
runtime model performs it by **Reading both images** (keyless vision) and applying this prompt.

## The judge prompt (verbatim)

```
You are a real estate listing-compliance reviewer. Given the ORIGINAL photo and the EDITED photo,
decide if the edit only makes the property look BETTER (lighting, decluttering personal items,
adding furniture to an empty room, sky/dusk swap) or makes it look DIFFERENT in a way that
misrepresents the property (hides a structural defect, removes or adds a permanent feature,
changes room dimensions, removes water damage / cracks / stains).
Output JSON: {"verdict":"BETTER|DIFFERENT","reason":"...","the_specific_change":"..."}
Default to DIFFERENT if uncertain.
```

## How to apply it
1. Read the ORIGINAL and the EDITED image.
2. Compare: what changed? Classify each change as cosmetic/staging (BETTER) vs structural/feature/
   dimension/defect-hiding (DIFFERENT).
3. Emit the JSON verdict. **Default to DIFFERENT when uncertain** — a false FIX costs the agent a
   re-edit; a false PASS costs them a misdemeanor.
4. Feed the verdict into the rule-pack: DIFFERENT → FIX (material misrepresentation).

## Worked examples

**BETTER (allowed):**
- Empty room → furnished with AI furniture (virtual staging). The room is the same; furniture is clearly
  not a permanent feature. → `{"verdict":"BETTER","reason":"virtual staging of an empty room; architecture unchanged","the_specific_change":"added removable furniture"}`
- Gray overcast sky → blue sky; or day → dusk. Cosmetic. → BETTER.
- Removed the homeowner's personal clutter (mail, toys) from a counter. Cosmetic declutter. → BETTER.

**DIFFERENT (misrepresentation → FIX):**
- A ceiling water stain present in the original is gone in the edit. Hides a defect. →
  `{"verdict":"DIFFERENT","reason":"removed a visible ceiling water stain — hides a material defect","the_specific_change":"water stain erased"}`
- A cracked driveway is now smooth; or a load-bearing wall / window was added or removed; or the room
  was widened. Structural / dimensional / permanent-feature change. → DIFFERENT.
- A "renovation concept" render shown as if it were the current kitchen (new cabinets/counters that do
  not exist). → DIFFERENT unless labelled `Conceptual Rendering - Not Actual Condition`.

## Caveat (surface in the report)
The judge reduces but does not eliminate risk — false positives (flagging a legit declutter) and false
negatives (missing a subtly patched crack) are possible. It is **advisory**, surfaced to the human; it
never auto-passes a listing.
