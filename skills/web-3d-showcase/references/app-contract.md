# Showcase app contract (SKILL.md steps 7 to 9)

## Contents
- [Folder](#folder)
- [Three.js from the machine](#threejs-from-the-machine)
- [What the page must do](#what-the-page-must-do)
- [The check hook](#the-check-hook)
- [Embedding in a React project](#embedding-in-a-react-project)

The source gives the app's parts (scene, selector, palette swaps, responsive UI) but no code or
template; this contract is SL8's. The agent writes the files at run time.

## Folder

```
artifacts/<p>/final/app/
  index.html  app.js  styles.css  showcase.json   # showcase.json: one entry per character
  vendor/three/build/  vendor/three/examples/jsm/  # copied from the machine, never a CDN by default
  assets/models/<id>.glb   assets/textures/<biome>.jpg   assets/backgrounds/<id>.webm + <id>.mp4 | .jpg
  assets/stills/<id>.png   assets/companions/<id>.png|.glb
```

`showcase.json` entry: `{ "id", "name", "model": "assets/models/<id>.glb" | null, "still",
"background" (the .mp4; the .webm sits beside it), "background_kind": "video"|"still", "texture", "companion", "palettes": [{ "name",
"swaps": { "<material name>": "#rrggbb" } }] }`. A `model` of null (no 3D endpoint, path P10)
shows the still on a camera-facing plane in the same slot.

## Three.js from the machine

The machine bakes `three` (Motion parent). Find it, record its version, and copy only what the
page imports, keeping the relative paths the addons expect:

```bash
T=$(node -p "require('path').dirname(require.resolve('three/package.json',{paths:[process.cwd(),require('child_process').execSync('npm root -g').toString().trim()]}))")
node -p "require('$T/package.json').version"          # goes in the handover note
V=artifacts/<p>/final/app/vendor/three; mkdir -p $V/build $V/examples/jsm/loaders $V/examples/jsm/utils $V/examples/jsm/libs $V/examples/jsm/controls
cp $T/build/three.module.js $V/build/; [ -f $T/build/three.core.js ] && cp $T/build/three.core.js $V/build/
cp $T/examples/jsm/loaders/GLTFLoader.js $V/examples/jsm/loaders/
cp $T/examples/jsm/utils/BufferGeometryUtils.js $V/examples/jsm/utils/
cp $T/examples/jsm/libs/meshopt_decoder.module.js $V/examples/jsm/libs/
cp $T/examples/jsm/controls/OrbitControls.js $V/examples/jsm/controls/
mkdir -p $V/examples/jsm/environments; cp $T/examples/jsm/environments/RoomEnvironment.js $V/examples/jsm/environments/
```

- One version for the core and every addon: copy them from the same folder, never mix in a
  file from elsewhere (research: creative-claw/creativeclawrenderhtml-1ac902#56).
- The import map in `index.html` resolves the bare `three` that the addons import themselves:
  `{"imports": {"three": "./vendor/three/build/three.module.js", "three/addons/": "./vendor/three/examples/jsm/"}}`.
- Any addon file missing from the machine's copy: stop and report it (HR21); never fetch it.
- A CDN import map (jsDelivr, the exact version) only when the brief sets `network: "cdn"`; the
  handover then says the page needs that host, and the render check runs with `--allow-network`
  (research: hyperframes/slideshow-b1b6c0#46).

## What the page must do

- **One scene, one selector.** Choosing a character swaps its model and its background together
  (research: fal/falregenerate3d-8bbb22#7). Buttons or a carousel, keyboard reachable, names as
  real HTML text (never baked into an image, HR10).
- **Scale and ground** (from the brief's `target_height`, written into `showcase.json`): on load
  scale each model to `target_height`, put its bounding-box minimum y on the ground plane (y = 0),
  centre x and z, and frame the camera from that height, so every character stands at the same size
  and nothing floats or sinks. `select` returns the final `bbox` ([x, y, z]); the render check fails
  a model whose height differs from the target by more than 5%.
- **Lighting**: a neutral environment map (`RoomEnvironment` from `examples/jsm/environments/`) plus
  one directional light, so metallic materials are visible rather than black.
- **Companion**: at the character's side, 40% of its height, on the ground plane.
- **Palette swaps in code** (#8): recolour named materials (`material.color.set`) from the entry's
  `palettes`; a swap never calls a model. Keep the original material values to switch back.
- **Ground**: the biome texture on a plane, `RepeatWrapping`, `colorSpace = SRGBColorSpace`;
  roughness and metalness are material constants (no maps, step 5).
- **Background**: a muted, looping, `playsinline` `<video>` with a WebM source first and the MP4
  second, behind a transparent canvas (`alpha: true`), or a CSS background image for a still. Both
  `object-fit: cover` and `background-size: cover`, centred, so the 390 px frame crops, not letterboxes.
- **Lazy loading** (#9): load the first character's GLB at start and the others on selection or
  when idle; show the still while a model loads.
- **Compressed GLBs**: after step 8's meshopt pass, `loader.setMeshoptDecoder(MeshoptDecoder)`
  (await `MeshoptDecoder.ready` first).
- **Rigged GLBs** (path P5): an `AnimationMixer` plays the clip the entry names on selection.
- **Responsive**: the canvas fills its box, `devicePixelRatio` capped at 2, the selector stacks
  under the canvas below 700 px, no sideways scroll at 390 px wide.
- Served over HTTP: `file://` cannot fetch the GLBs.

## The check hook

`render_check.mjs render` needs one of these on `window`:

- **App:** `window.__showcase = { ids: [...], ready: Promise, select: async (id) => ({ id, model:
  "loaded"|"still", meshes, triangles, bbox }) }`; `select` resolves after the model (or still) is on
  screen.
- **Viewer** (`glb_viewer.html`): `window.__viewer = { ready, setYaw(deg), stats }`, already in the
  template.

## Embedding in a React project

The React app route is not offered on this machine yet (SKILL.md step 7). A customer with a React
project gets the static app plus `app.js` exporting `mountShowcase(element, configUrl)`; their
component calls it in an effect and removes the canvas on unmount.
