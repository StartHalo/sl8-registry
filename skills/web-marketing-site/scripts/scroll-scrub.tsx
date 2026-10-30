// scroll-scrub.tsx: the scroll-to-video engine of the web-marketing-site skill.
//
// Copy this file and scroll-scrub.css unchanged into app/src/components/scroll-scrub/ and never edit
// them inside a project: the gate compares their sha256 with the skill's copies. A project changes the
// look only through the CSS custom properties (theme prop) and its own scenes file.
//
// What it does: one sticky full-viewport stage holds one media layer per scene; the story layer that
// scrolls over it holds the chapter copy as server-rendered <article> elements. Each clip is fetched
// whole and played from a Blob URL, so seeks are local. Scrolling only marks the frame dirty; one
// requestAnimationFrame tick reads the scroll position, eases each visible clip's time toward its
// target and seeks when the gap is larger than a small epsilon. Under reduced motion nothing is
// fetched: each band shows its poster and the full story stays readable.
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import './scroll-scrub.css'

export type ScrubChapter = {
  id: string
  headline: string
  body?: string
  tags?: readonly string[] // at most 3 proof tags
  action?: ReactNode // a bespoke CTA component, never a shared button class
}

export type ScrubScene = {
  id: string
  kind?: 'scene' | 'connector' // a connector band carries no copy and is hidden from assistive tech
  clip: string // same-origin desktop MP4
  poster: string // frame 1 of the encoded desktop clip
  mobileClip?: string // <= 720 px tall encode
  mobilePoster?: string // required whenever mobileClip is set
  weight?: number // viewport heights of scroll per chapter (default 1.4; connector 0.8)
  linger?: number // 0..0.6: slows the middle of the clip, never moves its first or last frame
  chapters?: readonly ScrubChapter[]
}

export type ScrubTheme = { bg?: string; ink?: string; scrim?: string; copyMax?: string; copyInset?: string }

export type ScrollScrubProps = {
  scenes: readonly ScrubScene[] // keep it a module constant: a new array identity rebuilds the engine
  theme?: ScrubTheme
  label?: string
  onSceneChange?: (index: number, id: string) => void
}

const MOBILE_QUERY = '(max-width: 860px)'
const REDUCED_QUERY = '(prefers-reduced-motion: reduce)'
const COARSE_QUERY = '(pointer: coarse)'
const EASE = 0.2
const EPSILON_DESKTOP = 0.008
const EPSILON_MOBILE = 0.02
const PRELOAD_VIEWPORTS = 1.5
const FADE_VIEWPORTS = 0.1
const END_CLAMP = 0.999

const weightOf = (s: ScrubScene) => s.weight ?? (s.kind === 'connector' ? 0.8 : 1.4)
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
const smoothstep = (x: number) => { const t = clamp01(x); return t * t * (3 - 2 * t) }
// Monotone remap with f(0) = 0 and f(1) = 1; its slope in the middle is 1 - l.
const lingerMap = (p: number, l: number) => (l > 0 ? p + (l * Math.sin(2 * Math.PI * p)) / (2 * Math.PI) : p)

export function validateScenes (scenes: readonly ScrubScene[]): void {
  const seen = new Set<string>()
  scenes.forEach((s, i) => {
    const at = `scroll-scrub scene ${i} (${s.id || 'no id'})`
    if (!s.id) throw new Error(`${at}: id is required`)
    if (seen.has(s.id)) throw new Error(`${at}: duplicate id`)
    seen.add(s.id)
    if (!s.clip || !s.poster) throw new Error(`${at}: clip and poster are both required`)
    if (s.mobileClip && !s.mobilePoster) throw new Error(`${at}: mobileClip needs a mobilePoster`)
    if (s.linger !== undefined && (s.linger < 0 || s.linger > 0.6)) throw new Error(`${at}: linger must be 0..0.6`)
    if (s.kind === 'connector' && s.chapters?.length) throw new Error(`${at}: a connector carries no chapters`)
    for (const v of [s.clip, s.poster, s.mobileClip, s.mobilePoster]) {
      if (v && /<[^>]*>/.test(v)) throw new Error(`${at}: placeholder left in ${v}`)
    }
  })
}

type Slot = {
  video?: HTMLVideoElement
  url?: string
  abort?: AbortController
  loading: boolean
  painted: boolean
  seeking: boolean
  current: number
}

export function ScrollScrub ({ scenes, theme, label, onSceneChange }: ScrollScrubProps) {
  validateScenes(scenes)
  const rootRef = useRef<HTMLDivElement>(null)
  const changeRef = useRef(onSceneChange)
  // The callback ref is updated in an effect, never during render.
  useEffect(() => { changeRef.current = onSceneChange }, [onSceneChange])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    if (window.matchMedia(REDUCED_QUERY).matches) { root.dataset.ssMode = 'reduced'; return }
    const mobile = window.matchMedia(MOBILE_QUERY).matches
    const coarse = window.matchMedia(COARSE_QUERY).matches
    const epsilon = mobile ? EPSILON_MOBILE : EPSILON_DESKTOP
    root.dataset.ssMode = mobile ? 'mobile' : 'desktop'
    const layers = Array.from(root.querySelectorAll<HTMLElement>('[data-ss-layer]'))
    const bands = Array.from(root.querySelectorAll<HTMLElement>('[data-ss-band]'))
    const slots: Slot[] = scenes.map(() => ({ loading: false, painted: false, seeking: false, current: -1 }))
    let tops: number[] = []
    let heights: number[] = []
    let vh = window.innerHeight
    let vw = window.innerWidth
    let dirty = true
    let settling = true
    let alive = true
    let primed = false
    let raf = 0
    let reported = -1

    const measure = () => {
      const y = window.scrollY
      tops = bands.map((b) => b.getBoundingClientRect().top + y)
      heights = bands.map((b) => b.offsetHeight)
    }

    const prime = (v: HTMLVideoElement) => { v.play().then(() => v.pause()).catch(() => {}) }

    const load = (i: number) => {
      const slot = slots[i]
      if (slot.loading) return
      slot.loading = true
      const s = scenes[i]
      const src = mobile && s.mobileClip ? s.mobileClip : s.clip
      const abort = new AbortController()
      slot.abort = abort
      fetch(src, { signal: abort.signal, credentials: 'same-origin' })
        .then((r) => { if (!r.ok) throw new Error(`clip ${src}: HTTP ${r.status}`); return r.blob() })
        .then((blob) => {
          if (!alive) return
          const url = URL.createObjectURL(blob)
          slot.url = url
          const v = document.createElement('video')
          v.muted = true
          v.playsInline = true
          v.preload = 'auto'
          v.setAttribute('muted', '')
          v.setAttribute('playsinline', '')
          v.setAttribute('preload', 'auto')
          v.className = 'ss-video'
          v.addEventListener('seeking', () => { slot.seeking = true })
          v.addEventListener('seeked', () => {
            slot.seeking = false
            dirty = true
            if (!slot.painted) { slot.painted = true; layers[i].dataset.videoPainted = 'true' }
          })
          v.addEventListener('loadedmetadata', () => { dirty = true })
          v.src = url
          layers[i].appendChild(v)
          slot.video = v
          if (primed) prime(v)
          dirty = true
        })
        .catch((err: unknown) => {
          if ((err as { name?: string })?.name !== 'AbortError') console.warn('[scroll-scrub]', err)
        })
    }

    const tick = () => {
      raf = requestAnimationFrame(tick)
      if (!dirty && !settling) return
      dirty = false
      const y = window.scrollY
      const fade = FADE_VIEWPORTS * vh
      const last = bands.length - 1
      let moving = false
      for (let i = 0; i <= last; i++) {
        const top = tops[i] ?? 0
        const height = heights[i] ?? vh
        const end = top + height
        if (end > y - PRELOAD_VIEWPORTS * vh && top < y + vh + PRELOAD_VIEWPORTS * vh) load(i)
        const fadeIn = i === 0 ? 1 : smoothstep((y - top + fade / 2) / fade)
        const fadeOut = i === last ? 1 : 1 - smoothstep((y - end + fade / 2) / fade)
        const opacity = fadeIn * fadeOut
        layers[i].style.opacity = String(opacity)
        const v = slots[i].video
        if (!v || !(v.duration > 0) || opacity <= 0) continue
        const span = i === last ? Math.max(height - vh, vh * 0.25) : height
        const p = lingerMap(clamp01((y - top) / span), scenes[i].linger ?? 0)
        const target = Math.min(p * v.duration, v.duration * END_CLAMP)
        const slot = slots[i]
        slot.current = slot.current < 0 ? target : slot.current + (target - slot.current) * EASE
        if (Math.abs(target - slot.current) > epsilon) moving = true
        if (!slot.seeking && Math.abs(v.currentTime - slot.current) > epsilon) v.currentTime = slot.current
      }
      // The reported scene: the band under the viewport top; inside a connector, the next scene from its midpoint.
      let band = 0
      for (let i = 0; i <= last; i++) if (y >= (tops[i] ?? 0)) band = i
      let scene = band
      if (scenes[band]?.kind === 'connector') {
        const mid = (tops[band] ?? 0) + (heights[band] ?? 0) / 2
        scene = y < mid ? Math.max(0, band - 1) : Math.min(last, band + 1)
      }
      if (scene !== reported) {
        reported = scene
        root.dataset.ssActive = scenes[scene]?.id ?? ''
        changeRef.current?.(scene, scenes[scene]?.id ?? '')
      }
      settling = moving
    }

    const onScroll = () => { dirty = true }
    const onResize = () => {
      // On touch devices the URL bar changes the height only: ignore that, keep the measured layout.
      if (coarse && window.innerWidth === vw) return
      vw = window.innerWidth
      vh = window.innerHeight
      measure()
      dirty = true
    }
    const onFirstGesture = () => {
      if (primed) return
      primed = true
      for (const s of slots) if (s.video) prime(s.video)
    }

    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    if (mobile) {
      window.addEventListener('pointerdown', onFirstGesture, { passive: true, once: true })
      window.addEventListener('touchstart', onFirstGesture, { passive: true, once: true })
    }
    raf = requestAnimationFrame(tick)

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointerdown', onFirstGesture)
      window.removeEventListener('touchstart', onFirstGesture)
      for (const s of slots) {
        s.abort?.abort()
        if (s.video) { s.video.removeAttribute('src'); s.video.load(); s.video.remove() }
        if (s.url) URL.revokeObjectURL(s.url)
      }
      for (const l of layers) { l.style.removeProperty('opacity'); delete l.dataset.videoPainted }
      delete root.dataset.ssMode
      delete root.dataset.ssActive
    }
  }, [scenes])

  const vars: Record<string, string> = {}
  if (theme?.bg) vars['--ss-bg'] = theme.bg
  if (theme?.ink) vars['--ss-ink'] = theme.ink
  if (theme?.scrim) vars['--ss-scrim'] = theme.scrim
  if (theme?.copyMax) vars['--ss-copy-max'] = theme.copyMax
  if (theme?.copyInset) vars['--ss-copy-inset'] = theme.copyInset

  let chapterIndex = 0
  return (
    <div ref={rootRef} className='ss-root' style={vars as CSSProperties}>
      <div className='ss-stage' aria-hidden='true'>
        {scenes.map((s, i) => (
          <div key={s.id} className='ss-layer' data-ss-layer={i} style={{ opacity: i === 0 ? 1 : 0 }}>
            <picture className='ss-poster'>
              {s.mobilePoster ? <source media={MOBILE_QUERY} srcSet={s.mobilePoster} /> : null}
              <img src={s.poster} alt='' decoding='async' fetchPriority={i === 0 ? 'high' : 'auto'} />
            </picture>
          </div>
        ))}
      </div>
      <div className='ss-story' aria-label={label}>
        {scenes.map((s, i) => {
          const n = Math.max(1, s.chapters?.length ?? 0)
          const style = {
            '--ss-weight': String(weightOf(s)),
            '--ss-count': String(n),
            '--ss-poster': `url("${s.poster}")`,
            '--ss-poster-mobile': `url("${s.mobilePoster ?? s.poster}")`
          } as CSSProperties
          if (s.kind === 'connector') {
            return <div key={s.id} className='ss-band ss-connector' data-ss-band={i} style={style} aria-hidden='true' />
          }
          return (
            <section key={s.id} className='ss-band' data-ss-band={i} style={style}>
              {(s.chapters ?? []).map((c) => {
                const Heading = chapterIndex++ === 0 ? 'h1' : 'h2'
                return (
                  <article key={c.id} className='ss-chapter'>
                    <div className='ss-pin'>
                      <div className='ss-copy'>
                        <Heading className='ss-headline'>{c.headline}</Heading>
                        {c.body ? <p className='ss-body'>{c.body}</p> : null}
                        {c.tags?.length ? <ul className='ss-tags'>{c.tags.slice(0, 3).map((t) => <li key={t}>{t}</li>)}</ul> : null}
                        {c.action ?? null}
                      </div>
                    </div>
                  </article>
                )
              })}
            </section>
          )
        })}
      </div>
    </div>
  )
}

export default ScrollScrub
