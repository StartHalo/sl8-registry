// client-only.tsx: mounted boundary for client-only and WebGL leaves (web-marketing-site).
// Copy to app/src/components/client-only.tsx. Server render and first client render show the fallback;
// the children render only after mount, so nothing in them can touch window or document during SSR.
// Pair WebGL leaves with React.lazy so their code never enters the server bundle:
//   const Scene = lazy(() => import('./scene-3d'))
//   <ClientOnly fallback={<img src='/assets/hero-still.png' alt='' />}><Suspense fallback={null}><Scene /></Suspense></ClientOnly>
import { useEffect, useState, type ReactNode } from 'react'

export function ClientOnly ({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  return <>{mounted ? children : fallback}</>
}

export default ClientOnly
