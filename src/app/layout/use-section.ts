import { useRouterState } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export type Section = 'home' | 'market'

const MARKET_PATHS = [/^\/nfts\//, /^\/cart/, /^\/checkout/, /^\/orders\//]

/** Height of the sticky header plus some slack: a section counts as current once it reaches it. */
const SECTION_OFFSET = 120

/** On the home page, follows the scroll: "Mercado" while the catalog (#market) is under the header. */
function useCatalogInView(enabled: boolean): boolean {
  const [inView, setInView] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setInView(false)
      return
    }
    let frame = 0
    const measure = () => {
      frame = 0
      const catalog = document.getElementById('market')
      if (!catalog) return setInView(false)
      const { top, bottom } = catalog.getBoundingClientRect()
      setInView(top <= SECTION_OFFSET && bottom > SECTION_OFFSET)
    }
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    // The catalog renders after data loads: measure again when the page grows.
    const observer = new ResizeObserver(schedule)
    observer.observe(document.body)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      observer.disconnect()
    }
  }, [enabled])

  return inView
}

/**
 * Current section of the main navigation. Market-flow screens highlight "Mercado" and drop the
 * header divider (per the Figma components); on the home page it follows the scroll position.
 */
export function useSection(): { route: Section; current: Section } {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const catalogInView = useCatalogInView(pathname === '/')
  const route: Section = MARKET_PATHS.some((pattern) => pattern.test(pathname)) ? 'market' : 'home'
  return { route, current: route === 'market' || catalogInView ? 'market' : 'home' }
}

/** True once the page scrolled past the top (the sticky header switches to its glass background). */
export function useScrolled(threshold = 8): boolean {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > threshold)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [threshold])
  return scrolled
}
