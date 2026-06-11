// Seeded, deterministic noise. NO Math.random anywhere in the engine or styles —
// every "random" value is a pure function of (seed, frame, salt) so renders are
// byte-reproducible. research/model-evaluation.md §7.4.

export const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Per-frame deterministic value in [0,1).
export const noise = (seed: number, frame: number, salt = 0): number =>
  mulberry32((seed * 73856093) ^ (frame * 19349663) ^ (salt * 83492791))();

// Deterministic integer hash from a string (e.g. to seed per-phrase jitter).
export const hashStr = (s: string): number => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};
