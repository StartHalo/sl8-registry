// starter-router.tsx: copy to app/src/router.tsx (web-marketing-site, SL8-authored; not yet built on a web-studio machine, WEB-L357).
// routeTree.gen.ts is written by the TanStack Start plugin at build: never edit or commit it by hand.
import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter () {
  return createRouter({ routeTree, scrollRestoration: true, defaultPreload: 'intent' })
}
