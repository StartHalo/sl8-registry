#!/usr/bin/env python3
"""
fabric-inject.py — build the NAMED-FABRIC LOCK prompt for the general-model try-on path.

FASHN v1.6 and Leffa are image-in/image-out VTON models — they take NO prompt, so this
script is NOT used for them. It is used ONLY on the general-model fallback path
(fal-ai/nano-banana-pro), where the seller's DECLARED fabric type is prepended before
the style, then the APIYI "preserving the original ..." clause is appended.

The measured lever (APIYI 2026-06-09): explicitly stating the fabric type — "ribbed
cotton", "washed denim", "silk satin" — lifts reliable textures from ~3/10 to ~8/10.
"Material/fabric before style." A generic "shirt"/"clothing" is the failure case. So:

  - REQUIRE a declared fabric (no fabric -> exit 2; the caller asks the seller, never
    invents the fabric, because inventing fabric is the misrepresentation we refuse).
  - Order the prompt as: [fabric-first lock] -> [model/pose/scene] -> [preserve clause].

Output is a single prompt STRING to stdout (or --out), ready for:
  ai-gen image "<prompt>" -m fal-ai/nano-banana-pro --image <garment> --ref <model> ...

This is pure string work — it never touches an image, so no Pillow.

Usage:
  fabric-inject.py --fabric "ribbed cotton" --garment "crew-neck tee"
      [--model-desc "a young East Asian female model"]
      [--pose "standing naturally, one hand in pocket"]
      [--scene "bright studio, soft daylight, light gray backdrop"]
      [--composition "full-body shot, 3:4 ratio, e-commerce fashion photography"]
      [--out <prompt.txt>]

Exit codes:
  0  prompt written to stdout (and --out if given)
  2  usage / missing the REQUIRED declared fabric (the caller must ask, not invent)
"""
import argparse
import sys

# The APIYI "soul of the prompt" preserve clause — appended verbatim. It is the lever
# that holds the real garment's texture/print/detail through a general-model edit.
PRESERVE_CLAUSE = (
    "Wearing the EXACT garment from the reference image, preserving the original "
    "fabric texture, print pattern, buttons, seams and stitching exactly as shown. "
    "Do not alter the cut, length, fit, color, or fabric weight; do not add, remove, "
    "or invent any detail not present in the reference garment; do not flatter or "
    "smooth the fabric beyond the real item."
)


def main():
    ap = argparse.ArgumentParser(
        description="Build the named-fabric-lock try-on prompt (general-model path only).")
    ap.add_argument("--fabric", required=True,
                    help="REQUIRED declared fabric type, e.g. 'ribbed cotton', 'washed denim', "
                         "'silk satin'. A generic 'fabric'/'clothing'/'shirt' is rejected.")
    ap.add_argument("--garment", required=True,
                    help="Short garment name, e.g. 'crew-neck tee', 'floral linen shirt'.")
    ap.add_argument("--model-desc", default="a model",
                    help="Model description, e.g. 'a young East Asian female model'.")
    ap.add_argument("--pose", default="standing naturally in a relaxed catalog pose")
    ap.add_argument("--scene",
                    default="a bright studio with soft daylight and a light gray seamless backdrop")
    ap.add_argument("--composition",
                    default="full-body shot, 3:4 ratio, clean e-commerce fashion photography style")
    ap.add_argument("--out", default="", help="optional path to also write the prompt")
    args = ap.parse_args()

    fabric = args.fabric.strip().lower()
    # Reject the generic terms that the APIYI test showed yield ~3/10 textures — the
    # whole point of this script is that the fabric is NAMED, not generic.
    generic = {"fabric", "clothing", "cloth", "material", "garment", "shirt", "top",
               "apparel", "textile", "unknown", "n/a", "na", ""}
    if fabric in generic or len(fabric) < 3:
        sys.stderr.write(
            "fabric-inject: a SPECIFIC fabric must be declared (e.g. 'ribbed cotton', "
            "'washed denim', 'silk satin'); generic terms like "
            f"{sorted(generic - {''})} are rejected. Ask the seller — never invent fabric.\n")
        sys.exit(2)

    # Fabric BEFORE style: lead with the named fabric lock, then model/pose/scene, then
    # the preserve clause. Capitalize the declared fabric naturally in the lead clause.
    fabric_lead = (
        f"Generate a photorealistic on-model catalog image: {args.model_desc} wearing a "
        f"{args.fabric.strip()} {args.garment.strip()}."
    )
    body = f"{args.pose.strip()}. {args.scene.strip()}. {args.composition.strip()}."
    prompt = f"{fabric_lead} {PRESERVE_CLAUSE} {body}"
    # Normalize whitespace.
    prompt = " ".join(prompt.split())

    print(prompt)
    if args.out:
        with open(args.out, "w") as f:
            f.write(prompt + "\n")
        sys.stderr.write(f"fabric-inject: prompt written to {args.out}\n")
    sys.exit(0)


if __name__ == "__main__":
    main()
