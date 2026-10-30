# brief.json and variants.json

Every key `thumb.mjs` reads. Anything not listed is ignored. Defaults apply when a key is absent.

## brief.json

| key | values | default |
|---|---|---|
| `ratio` | 16:9, 9:16, 4:3, 3:4, 4:5, 1:1 | 16:9 |
| `resolution` | 1K, 2K, 4K | 4K |
| `scene` | text | none |
| `characters` | list of `{ref, kind: "character", look}`; 0-3; `look` is `photo` or `illustrated` (`illustrated` needs `medium`) | none |
| `people` | list of `{description}`; generated people described in prose | none |
| `key_elements` | text, or `"none"`; required | none (assemble stops) |
| `logo` | `{mode: composite\|2d\|3d, file, render}`; `render` is required for 3d | none |
| `location` | text | none |
| `composition`, `background` | text; null takes the library default | library default |
| `rim` | a palette key or a colour phrase | plain lighting |
| `grade` | a sentence; replaces the vivid grade | vivid |
| `text` | `{mode: none\|headline\|baked-ui, text, ui_kind, ui_text}`; the last two modes are HR10 waivers | none |
| `split` | `{mode: plain\|before-after\|versus\|custom, count, panels[], custom}`; an object, never `true`; `panels` needs `count` lines (`custom` needs text) | no split |
| `medium` | the character's or the whole frame's non-photographic medium | photoreal |
| `style_reference` | file; analysed by eye, never sent to a model | none |
| `emotion_detail` | one sentence from the reference analysis | none |

## variants.json

A list of `{n, emotion | custom, take, model, seed, reuse_seed, keep_reference_emotion}`.

- `n`: the variant number (file names `vNN`). `emotion`: a ladder word. `custom`: a phrase that replaces it word for word.
- `take`: 1-4 (default 1). Each (expression, take) pair must differ; at most 16.
- `model`: overrides the route (retry 2 sets `openai/gpt-image-2/edit`).
- `seed` with `reuse_seed: true`: written to the params file (retry 1). `record` stores the returned seed as `rendered_seed`, which is never reused by itself.
- `keep_reference_emotion: true`: appends the brief's `emotion_detail`; the reference's person count never adds a person.
