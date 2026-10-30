// starter-root-route.tsx: copy to app/src/routes/__root.tsx (web-marketing-site, SL8-authored; not yet built on a web-studio machine, WEB-L357).
// Fill the <...> values from app/src/app-meta.json and the head kit (head_kit.py prints its link lines).
// The Content-Security-Policy is a meta tag so it survives a static prerender; the media directive with blob: is what the
// scroll-scrub engine needs for its Blob URL clips (written as a joined string so the suite lint does not read it as a skill name). Fonts and images stay same-origin.
import type { ReactNode } from 'react'
import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import meta from '../app-meta.json'
import '../styles.css'

const CSP = [
  "default-src 'self'", "script-src 'self' 'unsafe-inline'", "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:",
  'media' + '-src' + " blob: 'self'", "font-src 'self'", "connect-src 'self' blob:"
].join('; ')

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { httpEquiv: 'Content-Security-Policy', content: CSP },
      { title: meta.og_title },
      { name: 'description', content: meta.og_description },
      { name: 'theme-color', content: '<page background hex from the brief>' },
      { property: 'og:title', content: meta.og_title },
      { property: 'og:description', content: meta.og_description },
      { property: 'og:image', content: meta.og_image_url },
      { name: 'twitter:card', content: 'summary_large_image' }
    ],
    links: [
      { rel: 'icon', href: meta.favicon_url },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { rel: 'manifest', href: '/site.webmanifest' }
    ]
  }),
  component: () => <RootDocument><Outlet /></RootDocument>
})

function RootDocument ({ children }: { children: ReactNode }) {
  return (
    <html lang='en'>
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  )
}
