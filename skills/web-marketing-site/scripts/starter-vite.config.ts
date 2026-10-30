// starter-vite.config.ts: copy to app/vite.config.ts (web-marketing-site, SL8-authored; NOT yet built on a web-studio machine, learnings WEB-L357).
// Contract, whatever the option names are in the provisioned @tanstack/react-start (read its README under `npm root -g`):
// the production build must leave a plain index.html for "/" under dist/ (static prerender of "/"), so the
// built folder serves as files. The plugins the machine lacks are optional below: when @tailwindcss/vite or
// @vitejs/plugin-react is absent, the build still runs (esbuild's automatic JSX; token CSS written by hand).
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'

const optional = async (name: string) => { try { return (await import(name)).default } catch { return null } }
const react = await optional('@vitejs/plugin-react')
const tailwind = await optional('@tailwindcss/vite')

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  plugins: [
    tanstackStart({ prerender: { enabled: true, crawlLinks: false }, pages: [{ path: '/' }] }),
    ...(react ? [react()] : []),
    ...(tailwind ? [tailwind()] : [])
  ]
})
