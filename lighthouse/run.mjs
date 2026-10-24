/**
 * Lighthouse audit of the production build with the default mock scenario.
 *
 * - Pages: home and NFT detail; profiles: mobile (Lighthouse default emulation and
 *   simulated throttling) and desktop (the `desktop` preset).
 * - Three runs per page and profile; the median of each category and of LCP, CLS
 *   and TBT goes to lighthouse/reports/summary.{md,json}, next to every HTML/JSON report.
 *
 * Usage: pnpm lighthouse  (builds, serves `vite preview` on :4173 and audits)
 */
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import * as chromeLauncher from 'chrome-launcher'
import lighthouse from 'lighthouse'
import desktopConfig from 'lighthouse/core/config/desktop-config.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const REPORTS = path.join(ROOT, 'lighthouse', 'reports')
const BASE_URL = process.env.LH_BASE_URL ?? 'http://localhost:4173'
const RUNS = Number(process.env.LH_RUNS ?? 3)
const PAGES = [
  { name: 'inicio', path: '/' },
  { name: 'detalhe', path: '/nfts/nft_001' },
]
const PROFILES = [
  { name: 'mobile', config: undefined },
  { name: 'desktop', config: desktopConfig },
]
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo']
const TARGETS = { performance: 90, accessibility: 95, 'best-practices': 95, seo: 90 }

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

async function reachable(url) {
  try {
    return (await fetch(url)).ok
  } catch {
    return false
  }
}

/** Serves dist/ with `vite preview` unless something already answers on the base URL. */
async function ensureServer() {
  if (await reachable(BASE_URL)) return null
  const port = new URL(BASE_URL).port
  const server = spawn('pnpm', ['preview', '--port', port, '--strictPort'], { cwd: ROOT, shell: true, stdio: 'ignore' })
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (await reachable(BASE_URL)) return server
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  server.kill()
  throw new Error(`Preview server did not start on ${BASE_URL}`)
}

async function audit(chrome, url, config) {
  const result = await lighthouse(
    url,
    { port: chrome.port, output: ['html', 'json'], logLevel: 'error', onlyCategories: CATEGORIES },
    config,
  )
  if (!result) throw new Error(`Lighthouse returned no result for ${url}`)
  return result
}

async function main() {
  await mkdir(REPORTS, { recursive: true })
  const server = await ensureServer()
  const chromePath = process.env.CHROME_PATH ?? chromium.executablePath()
  const chrome = await chromeLauncher.launch({ chromePath, chromeFlags: ['--headless=new', '--no-sandbox'] })
  const rows = []
  let chromeVersion = ''

  try {
    for (const page of PAGES) {
      for (const profile of PROFILES) {
        const runs = []
        for (let run = 1; run <= RUNS; run += 1) {
          const { lhr, report } = await audit(chrome, `${BASE_URL}${page.path}`, profile.config)
          chromeVersion = lhr.environment.hostUserAgent
          const base = path.join(REPORTS, `${page.name}-${profile.name}-${run}`)
          await writeFile(`${base}.report.html`, report[0])
          await writeFile(`${base}.report.json`, report[1])
          runs.push({
            ...Object.fromEntries(CATEGORIES.map((id) => [id, Math.round((lhr.categories[id]?.score ?? 0) * 100)])),
            lcp: lhr.audits['largest-contentful-paint'].numericValue,
            cls: lhr.audits['cumulative-layout-shift'].numericValue,
            tbt: lhr.audits['total-blocking-time'].numericValue,
          })
          console.info(`${page.name} ${profile.name} #${run}:`, runs.at(-1))
        }
        rows.push({
          page: page.name,
          path: page.path,
          profile: profile.name,
          runs,
          median: Object.fromEntries(Object.keys(runs[0]).map((key) => [key, median(runs.map((item) => item[key]))])),
        })
      }
    }
  } finally {
    await chrome.kill()
    server?.kill()
  }

  const lighthouseVersion = JSON.parse(
    await readFile(path.join(ROOT, 'node_modules', 'lighthouse', 'package.json'), 'utf8'),
  ).version
  const environment = {
    date: new Date().toISOString(),
    lighthouse: lighthouseVersion,
    browser: chromeVersion,
    node: process.version,
    os: `${os.type()} ${os.release()} (${os.arch()})`,
    cpu: os.cpus()[0]?.model ?? 'unknown',
    baseUrl: BASE_URL,
    runsPerPage: RUNS,
    conditions:
      'Build de produção (vite build + vite preview), cenário padrão dos mocks (MSW + Socket.IO simulado), perfil limpo a cada execução. Mobile: emulação padrão do Lighthouse com throttling simulado; desktop: preset desktop.',
  }
  await writeFile(
    path.join(REPORTS, 'summary.json'),
    `${JSON.stringify({ environment, targets: TARGETS, rows }, null, 2)}\n`,
  )

  const mark = (id, value) => (value >= TARGETS[id] ? `${value}` : `**${value}** ⚠`)
  const lines = [
    '# Lighthouse — mediana de 3 execuções',
    '',
    '| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...rows.map(
      ({ page, profile, median: m }) =>
        `| ${page} | ${profile} | ${CATEGORIES.map((id) => mark(id, m[id])).join(' | ')} | ${(m.lcp / 1000).toFixed(2)} s | ${m.cls.toFixed(3)} | ${Math.round(m.tbt)} ms |`,
    ),
    '',
    `Metas: Performance ≥ ${TARGETS.performance}, Accessibility ≥ ${TARGETS.accessibility}, Best Practices ≥ ${TARGETS['best-practices']}, SEO ≥ ${TARGETS.seo}.`,
    '',
    '## Ambiente',
    '',
    ...Object.entries(environment).map(([key, value]) => `- **${key}**: ${value}`),
    '',
  ]
  await writeFile(path.join(REPORTS, 'summary.md'), lines.join('\n'))
  console.info(lines.slice(0, rows.length + 4).join('\n'))
}

await main()
