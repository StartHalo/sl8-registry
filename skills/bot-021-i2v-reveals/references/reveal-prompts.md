# Verbatim motion-only reveal prompts (BOT-021 · reveals)

These are the **only** prompts to use for generative i2v reveals. The single load-bearing rule:

> **Prompt MOTION ONLY. Never re-describe the room.**
> The real photo is the start frame and already contains the geometry. The moment a prompt re-describes
> the scene ("a bright living room with a sofa…") the model treats it as a generation target and
> **invents new geometry** — that is what melts walls and floats furniture. Describe the *camera move*
> and the *stillness of the scene*, nothing else. Only a **slow push-in**, a **gentle pull-out**, or a
> **bounded (≤30°) move** read clean on the reachable models.

Pass the chosen prompt to `scripts/gen-clip.sh` exactly as written below (the script appends the
anti-warp guard automatically — see the last section).

---

## push-in — slow push-in (5s)  · `motion: push-in` (DEFAULT)

```
Image-to-video. The room is completely still; subtle sunlight reflects off the floor. Static camera position with a slow, gentle, continuous push-in toward the focal point. Maintain straight vertical lines on window frames. Timing: 5 seconds, smooth pace.
```

Use for interiors and most hero shots. Pair with `--duration 5`.

## orbit — bounded orbit, under 30° (10s)  · `motion: orbit`

```
Image-to-video. No moving objects in the scene. A smooth, stabilized tracking shot rotating slightly (under 30 degrees) at waist height. Maintain realistic parallax between foreground and background. Do not alter or bend existing architecture. Timing: 10 seconds.
```

Use sparingly, only on rooms with clear foreground/background depth. Pair with `--duration 10`. Anything
beyond ~30° of rotation forces the model to hallucinate unseen surfaces — it will warp. Keep it bounded.

## aerial — aerial / exterior B-roll dolly (8s)  · `motion: aerial`

```
Slow cinematic dolly forward, golden hour light, front exterior of the home, warm and inviting mood, 8 seconds.
```

**Exterior photos only** (front elevation, drone-style approach). Do not use on interiors. i2v snaps
duration to 5 or 10, so request `--duration 10` for this 8s-intent recipe (the script clamps to a valid
token); trim in assembly if needed.

---

## The anti-warp negative (documented — gen-clip.sh appends this for you)

`gen-clip.sh` inlines a hard anti-warp guard onto every motion prompt before sending it (the `--negative`
flag is unverified on the proxy, so the guard rides in the prompt). You do **not** add it yourself; it is
documented here so you know exactly what the model is told:

```
warping walls, floating furniture, geometric distortion, bending lines, no face morphing, no jittery motion, no background warping, no blurry transitions.
```

The script's longer in-prompt form keeps the building geometry rigid: "Keep ALL architecture perfectly
rigid and straight — do not warp, bend, ripple, or distort walls, windows, doorframes, floors, or
ceilings; no morphing, no floating furniture, no melting lines; the building geometry is fixed, only the
camera moves."

**The guard is necessary but NOT sufficient.** It biases the model; it does not lock geometry (no
reachable i2v model does). You must still vision-grade every clip and degrade to the deterministic
still-segment on any warp/melt — see `i2v-discipline.md`.
