import { useEffect } from 'react'

const isPlainClick = (event: MouseEvent) =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey

function scrollToLinkTarget(link: HTMLAnchorElement) {
  const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
  const target = link.hash ? document.getElementById(decodeURIComponent(link.hash.slice(1))) : null
  if (target) target.scrollIntoView({ behavior, block: 'start' })
  else window.scrollTo({ top: 0, behavior })
}

/**
 * The router skips a navigation to the URL already open, and scrolling does not change the URL:
 * after scrolling down, "Início", the logo or "Mercado" (on /#market) did nothing. Browsers scroll
 * to the top or to the anchor in that case, so these links do the same.
 */
export function useSamePageLinks() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!isPlainClick(event)) return
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null
      if (!(link instanceof HTMLAnchorElement) || (link.target && link.target !== '_self')) return
      // Compared before the router handles the click, while the location is still the current one.
      if (link.href !== window.location.href) return
      // Only router links: plain anchors (the skip link) keep the browser's behavior.
      setTimeout(() => {
        if (event.defaultPrevented) scrollToLinkTarget(link)
      })
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])
}
