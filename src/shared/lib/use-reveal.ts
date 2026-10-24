import { type CSSProperties, useCallback } from 'react'

let observer: IntersectionObserver | null = null

/** One observer for the whole page: elements are revealed once, then forgotten. */
function revealObserver(): IntersectionObserver {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.setAttribute('data-revealed', '')
        observer?.unobserve(entry.target)
      }
    },
    // Reveal a little after the element crosses the bottom edge, so the motion is seen.
    { rootMargin: '0px 0px -8% 0px' },
  )
  return observer
}

/**
 * Scroll reveal: pair the returned ref with the `reveal` class. The element rises and fades
 * in the first time it enters the viewport (styles in globals.css, off under reduced motion).
 * The ref is stable and can be attached to several elements of a component.
 */
export function useReveal(): (node: HTMLElement | null) => (() => void) | undefined {
  return useCallback((node: HTMLElement | null) => {
    if (!node || typeof IntersectionObserver === 'undefined') return
    revealObserver().observe(node)
    return () => revealObserver().unobserve(node)
  }, [])
}

/** Staggers items of a row: the delay restarts every `perRow` items. */
export function revealDelay(index: number, perRow = 3, step = 80): CSSProperties {
  return { '--reveal-delay': `${(index % perRow) * step}ms` } as CSSProperties
}
