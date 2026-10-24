import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

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
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react(), tailwindcss(), preloadBootChunks()],
  resolve: {
    alias: [
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
      // Drops the public suffix list from the mocks chunk (see src/mocks/lib/tldts-lite.ts).
      { find: /^tldts$/, replacement: fileURLToPath(new URL('./src/mocks/lib/tldts-lite.ts', import.meta.url)) },
    ],
  },
})
