#!/usr/bin/env node
// WCAG 2 contrast ratio between colour pairs, so the palette's contrast is computed, not guessed.
//
//   contrast.mjs '#1F2A44' '#FAF7F2' ['#text' '#background' …]
//
// Prints one line per pair: ratio, and whether it passes AA for body text (4.5:1) and for large
// text and icons (3:1). Exit 1 on a malformed colour.
const hex = (h) => {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(h.trim())
  if (!m) { console.error(`not a hex colour: ${h}`); process.exit(1) }
  const s = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1]
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16) / 255)
}
const lum = (rgb) => {
  const [r, g, b] = rgb.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export function ratio (a, b) {
  const [l1, l2] = [lum(hex(a)), lum(hex(b))].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const c = process.argv.slice(2)
  if (c.length < 2 || c.length % 2) { console.error("usage: contrast.mjs '#text' '#background' [more pairs]"); process.exit(1) }
  for (let i = 0; i < c.length; i += 2) {
    const r = ratio(c[i], c[i + 1])
    console.log(`${c[i]} on ${c[i + 1]}: ${r.toFixed(1)}:1 · body text ${r >= 4.5 ? 'passes' : 'fails'} AA · large text and icons ${r >= 3 ? 'pass' : 'fail'} AA`)
  }
}
