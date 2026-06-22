---
name: remotion-video-creator
description: Creates animated motion graphics videos using Remotion (React-based framework). Handles explainers, product demos, data visualizations, and testimonial videos. Use when the user provides a topic, URL, data, or reviews and wants an animated video.
metadata:
  author: sl8
  version: 1.0.0
  type: bot
  inputs:
    - name: brief
      type: chat
      required: true
      description: A topic, URL, dataset, or reviews plus the desired video style and aspect ratio.
  outputs:
    - name: video
      type: video/mp4
      description: A rendered animated motion-graphics MP4 (explainer, product demo, data-viz, or testimonial).
---

# Remotion Video Creator

## Purpose

Create animated short-form videos by writing React/TypeScript components that render as video frames via Remotion. The bot researches the subject, writes a script, builds a Remotion project, and renders to MP4.

## Inputs

- **Topic** (required for explainers) — subject to research and explain
- **URL** (required for product demos) — website to showcase
- **Data** (required for data viz) — CSV/JSON data or inline numbers
- **Reviews/testimonials** (required for testimonials) — review text with ratings
- **Style preferences** (optional) — color theme, mood, visual style
- **Duration** (optional) — seconds, default 20

## Instructions

### Step 1: Determine Video Type

Classify the request:
- Topic/concept → **Explainer**
- Website URL + "demo"/"walkthrough" → **Product Demo**
- CSV/JSON data or numbers → **Data Visualization**
- Reviews/ratings/testimonials → **Testimonial Video**

### Step 2: Research & Script

**Explainer**: Web search the topic. Extract 5-7 key points. Write a scene breakdown:
```
Scene 1 (Hook, 0-90 frames): "Did you know [striking fact]?"
Scene 2 (Point 1, 90-230 frames): [Key point with supporting detail]
Scene 3 (Point 2, 230-370 frames): [Key point with supporting detail]
...
Scene N (Closing, 750-900 frames): [Summary/takeaway]
```

**Product Demo**: Fetch the URL. Identify the product name, tagline, and 3-5 key features. Take screenshots if possible. Write scene breakdown featuring each feature.

**Data Visualization**: Parse the data. Identify top 3-5 metrics, trends, or comparisons. Plan chart types (bar, line, counter, pie). Write scene breakdown.

**Testimonial**: Parse reviews. Select top 3-5 with highest ratings or most compelling text. Plan card layout with star ratings. Write scene breakdown.

Save script to `artifacts/<project>/script.md`.

### Step 3: Set Up Remotion Project

Create the project in `artifacts/<project>/src/`:

```bash
cd artifacts/<project>
mkdir -p src
cd src
npm init -y
npm install remotion @remotion/cli react react-dom
npm install --save-dev @types/react @types/react-dom typescript
```

Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "outDir": "./dist",
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

**Note**: Place tsconfig.json in the `src/` project root (same level as package.json). All .tsx files go in `src/src/` or directly alongside index.ts.

### Step 4: Write Entry Point

Create `index.ts`:
```ts
import {registerRoot} from 'remotion';
import {Root} from './Root';

registerRoot(Root);
```

Create `Root.tsx`:
```tsx
import {Composition} from 'remotion';
import {Main} from './Main';

export const Root: React.FC = () => {
  return (
    <Composition
      id="Main"
      component={Main}
      durationInFrames={600}
      width={1080}
      height={1920}
      fps={30}
    />
  );
};
```

Adjust `durationInFrames` based on script (duration_seconds * 30).

### Step 5: Write Scene Components

Each scene is a React component. Use these patterns:

**Animated text entrance:**
```tsx
import {useCurrentFrame, useVideoConfig, spring, interpolate, AbsoluteFill} from 'remotion';

const TextReveal: React.FC<{text: string; delay?: number}> = ({text, delay = 0}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: {damping: 200},
  });

  const translateY = interpolate(progress, [0, 1], [40, 0]);
  const opacity = interpolate(progress, [0, 1], [0, 1]);

  return (
    <div style={{
      transform: `translateY(${translateY}px)`,
      opacity,
      fontSize: 56,
      fontWeight: 700,
      fontFamily: 'Inter, sans-serif',
      color: 'white',
    }}>
      {text}
    </div>
  );
};
```

**Animated counter (for data viz):**
```tsx
const Counter: React.FC<{value: number; delay?: number}> = ({value, delay = 0}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: {damping: 200},
  });

  const current = Math.round(interpolate(progress, [0, 1], [0, value]));

  return (
    <span style={{
      fontSize: 72,
      fontWeight: 800,
      fontFamily: 'Inter, sans-serif',
      fontVariantNumeric: 'tabular-nums',
      color: '#60a5fa',
    }}>
      {current.toLocaleString()}
    </span>
  );
};
```

**Animated bar chart:**
```tsx
const Bar: React.FC<{label: string; value: number; maxValue: number; color: string; delay: number}> = ({
  label, value, maxValue, color, delay
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: {damping: 200},
  });

  const width = interpolate(progress, [0, 1], [0, (value / maxValue) * 800]);

  return (
    <div style={{marginBottom: 20}}>
      <div style={{fontSize: 28, color: 'white', marginBottom: 8, fontFamily: 'Inter'}}>{label}</div>
      <div style={{height: 40, width, backgroundColor: color, borderRadius: 8}} />
    </div>
  );
};
```

**Glass card:**
```tsx
const GlassCard: React.FC<{children: React.ReactNode; delay?: number}> = ({children, delay = 0}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: {damping: 200},
  });

  const scale = interpolate(progress, [0, 1], [0.9, 1]);
  const opacity = interpolate(progress, [0, 1], [0, 1]);

  return (
    <div style={{
      transform: `scale(${scale})`,
      opacity,
      backgroundColor: 'rgba(255,255,255,0.05)',
      backdropFilter: 'blur(10px)',
      borderRadius: 20,
      padding: 30,
      border: '1px solid rgba(255,255,255,0.1)',
    }}>
      {children}
    </div>
  );
};
```

**Review/testimonial card:**
```tsx
const ReviewCard: React.FC<{name: string; text: string; rating: number; delay: number}> = ({
  name, text, rating, delay
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: {damping: 200},
  });

  const translateX = interpolate(progress, [0, 1], [1080, 0]);
  const opacity = interpolate(progress, [0, 1], [0, 1]);

  const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);

  return (
    <div style={{
      transform: `translateX(${translateX}px)`,
      opacity,
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderRadius: 20,
      padding: 30,
      margin: '0 60px',
    }}>
      <div style={{fontSize: 36, color: '#fbbf24', marginBottom: 12}}>{stars}</div>
      <div style={{fontSize: 32, color: 'white', lineHeight: 1.4, marginBottom: 16, fontFamily: 'Inter'}}>
        "{text}"
      </div>
      <div style={{fontSize: 28, color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter'}}>
        — {name}
      </div>
    </div>
  );
};
```

### Step 6: Write Main Composition

The `Main.tsx` component uses `<Sequence>` to arrange scenes:

```tsx
import {AbsoluteFill, Sequence} from 'remotion';
import {HookScene} from './scenes/HookScene';
import {ContentScene1} from './scenes/ContentScene1';
// ... more scenes
import {ClosingScene} from './scenes/ClosingScene';

export const Main: React.FC = () => {
  return (
    <AbsoluteFill style={{backgroundColor: '#0a0a0a'}}>
      <Sequence from={0} durationInFrames={90}>
        <HookScene />
      </Sequence>
      <Sequence from={90} durationInFrames={150}>
        <ContentScene1 />
      </Sequence>
      {/* More scenes... */}
      <Sequence from={510} durationInFrames={90}>
        <ClosingScene />
      </Sequence>
    </AbsoluteFill>
  );
};
```

**Safe zone wrapper** — wrap every scene's content:
```tsx
const SafeZone: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div style={{
    position: 'absolute',
    top: 150,
    bottom: 170,
    left: 60,
    right: 60,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  }}>
    {children}
  </div>
);
```

### Step 7: Install Chrome Dependencies and Render

Before rendering, ensure Chrome Headless Shell dependencies are available:

```bash
# Install system dependencies (if not pre-installed)
sudo apt-get update && sudo apt-get install -y \
  libnss3 libdbus-1-3 libatk1.0-0 libgbm-dev libasound2 \
  libxrandr2 libxkbcommon-dev libxfixes3 libxcomposite1 \
  libxdamage1 libatk-bridge2.0-0 libpango-1.0-0 libcairo2 libcups2

# Ensure Chrome Headless Shell is downloaded
npx remotion browser ensure
```

Then render:

```bash
npx remotion render index.ts Main ../video.mp4 --codec=h264
```

This outputs `artifacts/<project>/video.mp4`.

**If render fails**:
1. Check the error message — usually a React component error or missing dependency
2. Fix the component code
3. Re-run the render command
4. If Chrome deps are missing and cannot be installed, fall back to the `ai-video-gen` skill

### Step 8: Verify and Document

1. Confirm `video.mp4` exists and has non-zero size
2. Check file with: `ffprobe artifacts/<project>/video.mp4` (shows resolution, duration, codec)
3. Update `script.md` with any changes made during build

## Outputs

- `artifacts/<project>/video.mp4` — Rendered MP4 video (1080x1920, 30fps, H.264)
- `artifacts/<project>/script.md` — Scene breakdown with timing, content, and assumptions
- `artifacts/<project>/src/` — Complete Remotion project (reproducible)

## Quality Criteria

- [ ] Video renders to playable MP4 at 1080x1920, 30fps
- [ ] All text within safe zones (150px top, 170px bottom, 60px sides)
- [ ] Font sizes: headlines >= 56px, body >= 36px, minimum 28px
- [ ] Animations use spring physics (no linear transitions)
- [ ] Staggered entrances with 8-12 frame delays
- [ ] At least 3 scenes (hook, content, closing)
- [ ] Content is researched and accurate (not fabricated)
- [ ] Script documented with scene timing
