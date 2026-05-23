# Deck Styling Reference

The CSS component vocabulary of a single-file HTML deck. Vendored and generalized from
the upstream `presentation-styling` skill (`shanraisshan/claude-code-best-practice`).
All classes below are defined in `templates/index.html`'s `<style>` block.

## Theme

The theme is a set of CSS custom properties on `:root` in the starter template. To
restyle the whole deck, edit these — do not sprinkle inline colors:

| Variable | Role |
|---|---|
| `--bg`, `--surface` | Page background, card/box background |
| `--fg`, `--muted` | Body text, secondary text |
| `--accent` | Progress bar, links, eyebrows, highlights |
| `--good`, `--bad`, `--warn` | Comparison borders, callout boxes |
| `--border` | All hairline borders |
| `--font`, `--mono` | Body font stack, monospace font stack |

The starter ships a dark theme. For a light theme, swap `--bg`/`--surface`/`--fg`/
`--muted` and keep contrast high. Use a **system font stack** — never link an external
font.

## Layout components

- `.two-col` — 2-column grid, 24px gap. For side-by-side content.
- `.info-grid` — 2-column grid, 16px gap. For a set of small info cards.
- `.col-card` — a card inside `.two-col`. Add `.good` for a green border (the
  positive/after example) or `.bad` for a red border (the negative/before example).
- `.info-card` — a card inside `.info-grid`.

## Content blocks

- `.trigger-box` — surface box with a dark left border. For a key concept, definition,
  or prerequisite.
- `.how-to-trigger` — green-bordered box. For a "do this" / action callout.
- `.warning-box` — orange-bordered box. For a caveat or warning.
- `.code-block` — dark monospace block. For code, config, or commands. Use the syntax
  spans below; whitespace is preserved (`white-space: pre-wrap`).

### Code syntax spans (inside `.code-block`)

| Span class | Color | Use for |
|---|---|---|
| `.comment` | green | comments |
| `.key` | blue | keys / property names / identifiers |
| `.string` | orange | string values |
| `.cmd` | yellow | shell commands / prompts |

```html
<div class="code-block"><span class="comment"># a comment</span>
<span class="key">name</span>: <span class="string">"value"</span>
<span class="cmd">$ a command</span></div>
```

Keep code-block content flush-left in the HTML source — leading indentation in the
source shows up in the rendered block.

## Lists

- `.use-cases` → `.use-case-item` (with `.use-case-icon` + `.use-case-text` containing
  a `<strong>` and a `<span>`) — an icon + title + description list.
- `.feature-list` — a simple bordered `<ul>` (set `list-style: none`).

## Tags

- `.matcher-tag` — a small gray inline pill. For labels, categories, keywords.

## Slide-type patterns

### Title slide (slide 1)
```html
<section class="slide title-slide active" data-slide="1">
  <div class="eyebrow">Category</div>
  <h1>Deck Title</h1>
  <h2>Subtitle</h2>
  <div class="meta">Presenter &middot; Date</div>
</section>
```

### Section divider
```html
<section class="slide section-slide" data-slide="N" data-level="">
  <div class="eyebrow">Section 2</div>
  <h1>Section name</h1>
</section>
```
Set `data-level` only when the deck uses `journey-levels`.

### Two-column comparison
```html
<section class="slide" data-slide="N">
  <h1>Title</h1>
  <div class="two-col">
    <div class="col-card bad"><h4>Before</h4><p>...</p></div>
    <div class="col-card good"><h4>After</h4><p>...</p></div>
  </div>
</section>
```

### Content slide with a code example
```html
<section class="slide" data-slide="N">
  <h1>Title</h1>
  <div class="trigger-box"><h4>Key concept</h4><p>...</p></div>
  <div class="code-block"><span class="comment"># example</span>
<span class="key">field</span>: <span class="string">"value"</span></div>
</section>
```

## Styling rules

- **One core idea per slide.** If content overflows the viewport, the slide is doing
  too much — split it. (`.slide` allows scroll as a safety net, not as a design.)
- **Reuse the component classes.** Do not invent ad-hoc inline styles for things a
  class already covers; consistency across slides is what makes a deck look finished.
- **Headings carry the structure** — `h1` per content slide, `h4` inside cards/boxes.
- **Honor `style-notes`.** A requested theme/color goes into the `:root` variables. If
  a request needs an external resource (a Google Font, a hosted image), fall back to
  the closest self-contained option and note the substitution in `summary.md`.
