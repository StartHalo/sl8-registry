# Try-on discipline — the rules that keep the bot from misrepresenting the garment

This is the *how* of fidelity for on-model try-on. The bot's #1 risk is the failure
that becomes *fraud* at the limit: a try-on model invents a fabric, straightens a
print, slims a fit, or lengthens a hem the real garment lacks — and the buyer receives
something that "didn't correspond ... fabric quality, garment details, cut, and fit all
differed substantially" (the Vinted/BBC dropship-scam backlash). Four disciplines
prevent it: fabric-before-style, the IMAGE_SAFETY reframe, the blocking tryon-qc gate,
and the don't-mislead-returns guardrail.

## 1 · Fabric before style (the measurable lever)

A virtual try-on cuts returns **only when accurate**. The single biggest accuracy lever
on the general-model path is **naming the fabric**. A field test (APIYI 2026-06-09)
measured it: explicitly stating the fabric type — "ribbed cotton", "washed denim",
"silk satin" — yields reliable textures in **~8 of 10** generations; a generic "shirt"
or "clothing" yields reliable textures only **~3 of 10**.

So `fabric-inject.py` **requires** the seller to declare the fabric and prepends it
**before** the style description, then appends the APIYI "preserving the original ..."
clause (the soul of the prompt):

```
... wearing the EXACT garment from the reference image, preserving the original fabric
texture, print pattern, buttons, seams and stitching exactly as shown. Do not alter the
cut, length, fit, color, or fabric weight; do not add, remove, or invent any detail not
present in the reference garment; do not flatter or smooth the fabric beyond the real item.
```

- **No fabric declared -> the bot ASKS the seller; it never invents the fabric.**
  Inventing fabric is the exact misrepresentation we refuse. `fabric-inject.py` rejects
  generic terms (`fabric`, `clothing`, `shirt`, ...) with exit 2.
- This applies ONLY to the **general-model path** (nano-banana-pro). The dedicated VTON
  models (FASHN, Leffa) take **no prompt** — they transfer the garment pixels directly,
  which is why they are the *primary* path; fabric-naming is the fallback's accuracy aid.

## 2 · The IMAGE_SAFETY mannequin-reframe fallback (apparel/swimwear)

Nano Banana Pro's server-side filter (non-configurable, tightened Jan 2026) rejects
some legitimate "person wearing" / swimwear / underwear / fitness shots. When a
general-model try-on is refused on IMAGE_SAFETY, **reframe the garment onto a form**
instead of a person (LaoZhang 2026-03-15):

```
Professional ecommerce product photography of [garment type] in [color/fabric].
Displayed on a [mannequin form / dress form / flat-lay arrangement].
Clean white studio background.
```

- The reframe "resolves approximately 60% of IMAGE_SAFETY blocks for fashion
  categories"; with a commercial-context signal, ~75%; "three retries with variations
  typically achieve a 90%+ cumulative success rate." It is a **mitigation, not a
  guarantee** — a category that keeps refusing is FLAGGED for the seller, never forced.
- The dedicated VTON endpoints (FASHN/Leffa) have their own `moderation_level`
  (default `permissive`); prefer them for swimwear/underwear before the general path.

## 3 · tryon-qc — the BLOCKING gate (every try-on output)

`tryon-qc.py` is the honest answer to the no-fidelity-lock ceiling. It is a **Claude
vision compare** run on EVERY generated try-on, against the seller's **real flat-lay /
ghost-mannequin garment** (the source of truth a buyer actually receives). It grades
TWO axes — fidelity AND misrepresentation — kept separate on purpose:

| Axis | Question |
|---|---|
| **fabric** | Same fabric type/texture/weight/sheen? A cheap knit must NOT read luxe. |
| **print** | Same print/pattern, not warped, straightened, or re-drawn? |
| **color** | Same color(s), no shifted hue? |
| **trim** | Same buttons, zippers, seams, stitching, collar, pockets? |
| **cut_fit** | Same cut, length, and fit/drape? A loose fit NOT slimmed; a short hem NOT lengthened; real wrinkles NOT pressed smooth. |
| **realism** | No mangled hands, broken drape, or warped render artifacts? |

Verdict per image (record in `qc-report.md` with the reason):

- **pass** — same garment, NOT flattered, no disqualifying defect -> ships.
- **drift — DROP** — the garment changed (fabric/print/color/trim/cut/length) or is a
  different garment -> **blocking drop**; regenerate (different seed/mode) then drop+flag.
- **flatter — ESCALATE (the misrepresentation gate)** — recognizably the same garment
  BUT rendered more flattering than the real item (fabric upgraded, fit slimmed, hem
  lengthened, wrinkles removed). **This is misrepresentation even when "pretty"** — do
  NOT ship it as a catalog truth-claim; escalate to the seller. Treated as blocking.
- **review — human review** — mangled hands / warped print / fine-print text you cannot
  verify / face uncertain / confidence below threshold -> ships ONLY with a prominent
  flag; the bot does not certify it.

Never silently ship a try-on that failed QC. Shipping 2 honest on-model shots beats
shipping 4 with one that flatters — best-effort, never best-volume. The QC runs BEFORE
upscaling: never upscale a drifted/flattered image (that just makes a high-res
misrepresentation).

## 4 · The don't-mislead-returns guardrail (why the gate exists)

The economics premise — VTO can cut returns and lift AOV — holds **only when the
on-model image is accurate**. The Vinted/BBC dropship-scam tools ("turn product photos
into worn photos with one click") produced exactly the opposite: buyers received items
whose "fabric quality, garment details, cut, and fit all differed substantially" from
the photo. That is the anti-pattern this bot is built to refuse:

- **Preserve, never flatter.** Never alter cut, length, fit, fabric weight, or color.
- **The `flatter` verdict is blocking**, not advisory — a flattered image is the
  *dangerous* output because it is pretty and wrong.
- **Disclose the AI model.** An on-model image of a "person" who never existed needs an
  AI-content label before it hits Meta/TikTok/EU storefronts (EU AI Act Art.50 applies
  2026-08-02; Meta auto-rejects undisclosed AI/UGC creative). That disclosure + the
  "don't mislead" pre-flight is the shared `bot-022-compliance-guard` skill's job.
- The bot is a **checker/generator, never an auto-uploader**: it emits files + a QC
  report; a human ships them. The seller always knows what passed, what was dropped for
  drift, and what was escalated for flattery — that trust is the product.

## 5 · The parked feature gap (state it, don't hide it)

Native catalog face-consistency (FASHN **Consistent Models / Product-to-Model / Model
Swap**) is first-party `api.fashn.ai`-only and NOT confirmed on fal (see `models.md`
§5). The bot approximates it by re-attaching one house-model image as a nano-banana-pro
`--ref` — imperfect; face drift across a large catalog is a known ceiling and is
FLAGGED, never silently certified.
