# Composition axes — building a custom preset

Compose a new preset by choosing one value per axis (or deliberately clashing two for
effect). Write the result as a full aesthetic block + the six tokens + a "For:" line, then
bake it off against 2–3 shipped presets before committing.

| Axis | Example values |
|---|---|
| Medium | paper collage · screenprint · risograph · ink painting · flat vector · chalk/blackboard · woodcut |
| Era | 1930s WPA · 1950s atomic · 1970s groovy · Swiss modern · contemporary editorial · timeless |
| Composition | strict grid · centered poster · diagonal constructivist · asymmetric editorial · full-bleed |
| Palette | 2-color + accent · retro primaries · muted 3-color screenprint · mono + fluorescent spot |
| Type | condensed newsprint caps · grotesque sans · didone serif · stencil · brush display · ransom-note cut-out |
| Finish | halftone grain · misregistration · foil · photocopy grain · clean flat · paper texture |
| Lighting | flat print (default for 2D) · soft ambient · dramatic single-source (only for non-flat styles) |
| Mood | earnest · urgent · playful · elegant · heroic · contemplative |

Rules for composed presets:

1. Always end the block with the anti-realism guard for flat styles: "not photoreal, no
   CGI, no 3D render" (video models drift toward realism without it).
2. Name the palette with concrete color words, not vibes ("cream, ink black, warm red" —
   never "vintage colors").
3. The block must read as ONE style a stranger could reproduce — if it needs the scene to
   make sense, it's a scene description, not a style.
4. `motion_style` (calm/punchy/max) rides with the preset — video-prompting consumes it as
   amplitude.
