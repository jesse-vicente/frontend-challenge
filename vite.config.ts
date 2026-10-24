import { readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { build, defineConfig, type Plugin, type ResolvedConfig } from 'vite'

const ROOT_ELEMENT = '<div id="root"></div>'
const HOISTABLES = /^(?:<link [^>]*>|<meta [^>]*>|<title>[^<]*<\/title>)+/
const ENTRY_SCRIPT = /\s*<script type="module" crossorigin src="([^"]+)"><\/script>/
const MODULE_PRELOAD = /\s*<link rel="modulepreload" crossorigin href="([^"]+)">/g

/**
 * Runs in the page (serialized into index.html): loads the app scripts. Over the prerendered
 * home page, or its layout on other pages (`prerender-shell`), they start once it has painted,
 * so the first paint competes with nothing for the network or the main thread; a hidden root
 * (`skip-prerender`) paints nothing, so it needs them at once.
 */
function loadAppScripts(entry: string, preloads: string[]) {
  let started = false
  const load = () => {
    if (started) return
    started = true
    for (const href of preloads) {
      const link = document.createElement('link')
      link.rel = 'modulepreload'
      link.crossOrigin = ''
      link.href = href
      document.head.append(link)
    }
    const script = document.createElement('script')
    script.type = 'module'
    script.crossOrigin = ''
    script.src = entry
    document.head.append(script)
  }
  const html = document.documentElement
  // Hidden tabs do not paint: nothing to wait for.
  if (
    html.classList.contains('skip-prerender') ||
    document.visibilityState === 'hidden' ||
    !window.PerformanceObserver
  ) {
    load()
    return
  }
  new PerformanceObserver((list, observer) => {
    if (!list.getEntriesByName('first-contentful-paint').length) return
    observer.disconnect()
    setTimeout(load)
  }).observe({ type: 'paint', buffered: true })
  // Safety net for browsers without paint timing.
  setTimeout(load, 3000)
}

/**
 * Prerenders the home page into index.html after the client build (see src/app/prerender.tsx):
 * an SSR build of the prerender entry runs in Node and its markup fills the root element, so
 * the first paint needs only the HTML and the CSS. The SSR build uses this same config, so asset
 * URLs and inlined images match the client bundle.
 */
function prerenderHome(): Plugin {
  let config: ResolvedConfig
  return {
    name: 'prerender-home',
    apply: (userConfig, { command }) => command === 'build' && !userConfig.build?.ssr,
    configResolved(resolved) {
      config = resolved
    },
    closeBundle: {
      sequential: true,
      async handler() {
        const ssrOutDir = path.join(config.root, 'node_modules/.tmp/prerender')
        await build({
          configFile: config.configFile,
          mode: config.mode,
          logLevel: 'warn',
          build: { ssr: 'src/app/prerender.tsx', outDir: ssrOutDir, emptyOutDir: true, copyPublicDir: false },
        })
        const { prerender } = await import(pathToFileURL(path.join(ssrOutDir, 'prerender.js')).href)
        const rendered: string = await prerender()
        // React emits hoistable tags first: image preloads go to <head>; the title and the
        // description are already there (the router sets them in the browser).
        const hoisted = rendered.match(HOISTABLES)?.[0] ?? ''
        const preloads = hoisted.match(/<link [^>]*>/g) ?? []
        const markup = rendered.slice(hoisted.length)
        const indexPath = path.resolve(config.root, config.build.outDir, 'index.html')
        const html = await readFile(indexPath, 'utf8')
        const entry = html.match(ENTRY_SCRIPT)?.[1]
        if (!html.includes(ROOT_ELEMENT) || !entry) throw new Error('prerender-home: unexpected index.html')
        const modules = [...new Set([...html.matchAll(MODULE_PRELOAD)].map((match) => match[1]))].filter(
          (href) => href !== entry,
        )
        const loader = `<script>(${loadAppScripts})(${JSON.stringify(entry)}, ${JSON.stringify(modules)})</script>`
        await writeFile(
          indexPath,
          html
            .replace(ENTRY_SCRIPT, '')
            .replace(MODULE_PRELOAD, '')
            .replace('</head>', `${preloads.join('')}</head>`)
            .replace(ROOT_ELEMENT, `<div id="root">${markup}</div>`)
            .replace('</body>', `${loader}</body>`),
        )
        await rm(ssrOutDir, { recursive: true, force: true })
      },
    },
  }
}

/** Entry points imported dynamically by src/main.tsx during boot. */
const BOOT_MODULES = ['src/mocks/browser.ts', 'src/app/app.tsx']

/**
 * main.tsx imports the mocks and the app dynamically, after reading the entry. Preloading
 * both chunks (fetch without evaluating) starts the downloads with the entry instead of
 * after it, removing a round trip from the critical path.
 */
function preloadBootChunks(): Plugin {
  return {
    name: 'preload-boot-chunks',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, context) {
        const files = new Set<string>()
        for (const chunk of Object.values(context.bundle ?? {})) {
          const id = chunk.type === 'chunk' ? chunk.facadeModuleId?.replaceAll('\\', '/') : undefined
          if (chunk.type !== 'chunk' || !id || !BOOT_MODULES.some((module) => id.endsWith(module))) continue
          files.add(chunk.fileName)
          for (const dependency of chunk.imports) files.add(dependency)
        }
        return [...files].map((file) => ({
          tag: 'link',
          attrs: { rel: 'modulepreload', crossorigin: true, href: `/${file}` },
          injectTo: 'head' as const,
        }))
      },
    },
  }
}

export default defineConfig({
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    preloadBootChunks(),
    prerenderHome(),
  ],
  resolve: {
    alias: [
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
      // Drops the public suffix list from the mocks chunk (see src/mocks/lib/tldts-lite.ts).
      { find: /^tldts$/, replacement: fileURLToPath(new URL('./src/mocks/lib/tldts-lite.ts', import.meta.url)) },
    ],
  },
})
