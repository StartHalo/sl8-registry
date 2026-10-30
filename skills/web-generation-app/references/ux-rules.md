# UX rules and delivery checklists

SL8's restatement of the interface rules and checklists in the assessed method
(research `higgsfield/wb-app-lane`, fine points #64-#95 and the checklists it records). The vendor
wrote them for its own design system, which is not on this machine; here they are principles over
our own components: Tailwind, one token layer in `src/styles/theme.css`, lucide-react as the one icon
family. The numbers are the method's; every one is a default a kit or brief may change.

## Contents
- [Shape and shell](#shape-and-shell)
- [Interaction and feedback](#interaction-and-feedback)
- [Keyboard, focus and overlays](#keyboard-focus-and-overlays)
- [Forms and settings](#forms-and-settings)
- [Layout and gallery](#layout-and-gallery)
- [Motion and states](#motion-and-states)
- [Hand checklist (step 16)](#hand-checklist-step-16)
- [A generation app is never just a form (step 16)](#a-generation-app-is-never-just-a-form-step-16)
- [Screenshot pass](#screenshot-pass)

## Shape and shell

| Shape | Pick it when | Surface |
|---|---|---|
| studio (default) | a prompt-led tool with many settings, projects or a browsable feed | prompt box centred with its settings inside it; after the first result, a results gallery |
| preset | the user picks a style, then generates; also upload, configure, iterate | creation rail, preset grid, History tab; a step wizard is this shape plus tabs |
| detail | one quick action on a landing page | the action above the fold; before/after enhance is this shape plus a compare slider |

The first screen is the product itself, inside a stable shell: never a splash or a hero. Sidebar plus
main uses `xl:grid-cols-[280px_minmax(0,1fr)]`; an inspector column is 360 px; form panels
`max-w-3xl`; the app container `mx-auto w-full max-w-7xl`. The app has no host around it, so it draws
its own small chrome: the app name, sign-out, and (admin only) the spend panel link.

## Interaction and feedback

- One density per region: consoles and tables `gap-3 p-4`; content-first `gap-4 md:gap-6`,
  `p-4 md:p-6 xl:p-8`.
- Touch targets at least 44×44 px with 8 px between them (padding, not a bigger glyph);
  `cursor-pointer`; hover and pressed feedback inside about 100 ms; hover is never the only cue.
- An async action disables its trigger and shows progress inside it; nothing goes 300 ms without
  feedback; longer waits show skeletons shaped like the result, not a lone spinner.
- Disabled means the real `disabled` attribute plus disabled styling, never a faded control that
  still takes clicks.
- Destructive actions: a danger style, set apart, confirmed in a dialog, or undoable with a toast
  (toasts 3-5 s, never stealing focus). Drag starts after about 6 px of movement.
- Every Generate button shows its price inside the label: `{label} {Sparkles icon 14 px} {credits}`.
  A Generate button without a price, or a price on a separate line, is a defect.

## Keyboard, focus and overlays

A `:focus-visible` ring everywhere; tab order follows visual order; Esc closes the topmost overlay
first, one layer at a time, and every overlay has a visible close control; dialogs trap focus and
return it on close; icon-only controls carry a label; decorative images `alt=""`; state is never
shown by colour alone. Popovers, menus and selects portal out of scrolling or sticky ancestors and use
one documented z-index scale (defined in the theme file), never ad-hoc `z-[9999]`. Test overlays near
every viewport edge.

## Forms and settings

Visible labels (never placeholder-only), helper text that stays, validation on blur or submit, the
error under its field naming the cause and the fix ("Prompt is empty: describe what to make"), focus
moved to the first invalid field, semantic input types. A timeout is an error with a retry. Settings
work at every width: main controls visible, the rest behind disclosure; a tall settings panel is a
real `min-h-0 overflow-y-auto overscroll-contain` region with a visible scroll cue; a pinned Generate
never covers the last field and respects safe areas; below desktop, settings stack above results.

## Layout and gallery

Mobile first; `min-h-dvh` (never `100vh`); no page-level horizontal scroll; `min-w-0` with `truncate`
and a `title`; `minmax(0,1fr)` columns; fixed bars reserve padding; one primary action per screen;
extra actions collapse into a menu; the active nav item shows without hover. Result grids are
`grid-template-columns: repeat(auto-fit, minmax(<min width>, 1fr))` with each card at its own ratio
(`object-contain` inside an `aspect-ratio` box, `1 / 1` when the ratio does not parse); never a ladder
of breakpoint column counts and never one crop for every result. Type comes from the theme's scale:
no arbitrary `text-[13px]`, `tabular-nums` for credits and timers, wrapping preferred to truncation.
No card soup, no emoji, no blurred colour blobs, one icon family.

## Motion and states

Micro-interactions 150-300 ms, complex moves at most 400 ms, exits about 60-70% of the entry time,
ease-out in and ease-in out, `transform` and `opacity` only, 1-2 animated elements per view, list
stagger 30-50 ms per item, motion only as cause and effect, `prefers-reduced-motion` respected, input
never blocked. Every list and region has designed loading, empty (title, line, action), error (with
retry, no stack trace), disabled (with the reason) and selected (independent of hover) states.

## Hand checklist (step 16)

- [ ] The first screen is the product surface, in a stable shell.
- [ ] Colours, spacing and type come from the token layer; `scripts/scan.sh` reports zero hits.
- [ ] Every Generate button reads `{label} {sparkles} {credits}`; other buttons use quiet styles.
- [ ] One icon family (lucide-react).
- [ ] Every interactive element: pointer cursor, hover and pressed feedback, focus ring.
- [ ] Touch targets 44 px or more; icon-only controls labelled.
- [ ] Esc closes overlays; dialogs trap and restore focus; menus portal above their dialog and are
  not clipped by a scroll region or hidden behind a sticky bar.
- [ ] Forms: labels, blur or submit validation, error under the field with the fix, focus on the
  first invalid field.
- [ ] Async: triggers disable while pending; skeletons after 300 ms; success and failure both have a
  designed outcome.
- [ ] Empty, loading, error and selected states exist for every list and region.
- [ ] Destructive actions: danger style, set apart, confirmed or undoable.
- [ ] No page-level horizontal scroll at 375 px, tablet and desktop.
- [ ] Mixed 1:1, 4:3, 16:9 and 9:16 results reflow uncropped in one grid.
- [ ] Motion 150-300 ms, transform and opacity only, reduced motion respected.
- [ ] State is never carried by colour alone.

## A generation app is never just a form (step 16)

Leaving any of these out is a defect, not a simplification:

- [ ] `GET /api/session`, a signed-out screen with every usable control hidden or disabled, login and
  logout.
- [ ] `requireAppUser()` before every estimate, submit, upload, feed, file, history and spend call,
  and before the optional reference, chain and cover operations.
- [ ] Admin spend panel: balance and the app's own spend, each figure labelled with its basis, admin
  sessions only.
- [ ] A model form with validated settings for each registered model.
- [ ] A price preview from `ai-gen estimate`, then a confirmation dialog (model, settings summary,
  credits) before submit; the server takes only `confirmed: true` and passes `--max-cost`; a declined
  dialog is a quiet cancel.
- [ ] A multipart upload route when a registered model takes media.
- [ ] A submit route through `gen.server.ts` and the registry only.
- [ ] A feed and history that show queued, running, completed and failed generations after submit.
- [ ] Real persistence in SQLite for the generations and the app's own product state (favourites,
  collections, projects, presets, shares); never in memory or `localStorage`.
- [ ] Polling until a terminal status; the submit response is never the result.
- [ ] Real result media on every completed card (prompt, model, status, created time, failure reason);
  a completed card without a file shows "preview unavailable" with refresh.
- [ ] One truthful export format per media type: bytes, MIME type and file name agree.
- [ ] Safe logs: method, operation, status, exit code and error code only.

## Screenshot pass

Playwright on the baked `chrome-headless-shell` at 375×812, 768×1024 and 1440×900, with the settings
panel open, once by keyboard (Tab through the page, Esc on each overlay) and once with touch emulation
(`hasTouch: true, isMobile: true` at 375 px). Save the shots under `work/<p>/shots/`, look at each one,
and report what was seen (HR14): the agent never writes PASS for taste.
