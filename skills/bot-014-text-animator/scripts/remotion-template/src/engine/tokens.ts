// Shared timing + type-scale tokens. Styles MUST use these — never hardcode fps or px.

export const FPS = 30;

export const durationFrames = (seconds: number) => Math.round(seconds * FPS);

// Type scale as a fraction of the SHORT edge (1080 for all three aspect ratios),
// so sizes stay legible across 16:9 / 9:16 / 1:1. Floors enforced in `sizeFor`.
export const TYPE = {
  hero: 0.072, // ~78px @1080 — the one line that must read instantly
  headline: 0.056, // ~60px
  dek: 0.03, // ~32px
  beat: 0.034, // ~37px (floor 36-class)
  meta: 0.026, // ~28px floor — credits/dateline
  kicker: 0.0215, // ~23px — eyebrow/kicker labels (uppercase, tracked)
  stat: 0.17, // ~184px — hero counter
} as const;

export type TypeKey = keyof typeof TYPE;

// Legibility floors from research/domain-analysis.md §6 (headline >=56, body >=36, never <28).
const FLOOR: Partial<Record<TypeKey, number>> = { hero: 56, headline: 56, beat: 36, meta: 28, dek: 28 };

export const sizeFor = (shortEdge: number, k: TypeKey): number =>
  Math.max(FLOOR[k] ?? 16, Math.round(shortEdge * TYPE[k]));

// Stagger between list items (frames) — BOT-006 convention.
export const STAGGER = 9;
