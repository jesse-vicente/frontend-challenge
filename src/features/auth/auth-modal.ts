import { redirect as routerRedirect, useNavigate, useRouterState } from '@tanstack/react-router'
import { z } from 'zod'
import { useIsDesktop } from '@/shared/lib/use-media-query'
import { redirectSearchSchema } from './redirect'

export type AuthMode = 'login' | 'register'

/**
 * Desktop signs in through a modal over the current page, driven by the URL
 * (`?auth=login&redirect=/checkout`), so refresh and back keep working. Phones use the
 * full-screen /login and /register routes, which also serve direct links.
 */
export const authSearchSchema = redirectSearchSchema.extend({
  auth: z.enum(['login', 'register']).optional().catch(undefined),
})

const DESKTOP_QUERY = '(min-width: 768px)'
const AUTH_ROUTES = /^\/(login|register)(\/|$)/

let currentPage: string | null = null

/** Last page the router resolved: route guards run after the URL already changed. */
export function trackCurrentPage(href: string): void {
  currentPage = href
}

// Only paths come out of these helpers: any base resolves app hrefs (also at build-time prerender).
const parseHref = (href: string) => new URL(href, 'http://localhost')

const pathOf = (href: string) => parseHref(href).pathname

/** `page` with the sign-in modal open on top of it. */
export function withAuthModal(page: string, mode: AuthMode, redirect?: string): string {
  const url = parseHref(page)
  url.searchParams.set('auth', mode)
  if (redirect) url.searchParams.set('redirect', redirect)
  else url.searchParams.delete('redirect')
  return url.pathname + url.search + url.hash
}

/** `page` with the sign-in modal closed. */
export function withoutAuthModal(page: string): string {
  const url = parseHref(page)
  url.searchParams.delete('auth')
  url.searchParams.delete('redirect')
  return url.pathname + url.search + url.hash
}

/**
 * Where a guest goes when a private route needs a session: on desktop, the modal over the
 * page they were on; otherwise (phones, direct links, an expired session on the private
 * page itself) the login route.
 */
export function signInRedirect(target: string) {
  const page = currentPage
  if (
    window.matchMedia(DESKTOP_QUERY).matches &&
    page &&
    pathOf(page) !== pathOf(target) &&
    !AUTH_ROUTES.test(pathOf(page))
  ) {
    return routerRedirect({ href: withAuthModal(withoutAuthModal(page), 'login', target) })
  }
  return routerRedirect({ to: '/login', search: { redirect: target } })
}

/** Opens sign-in from the current page; after it, the visitor lands on `redirect` or stays. */
export function useOpenAuth() {
  const navigate = useNavigate()
  const href = useRouterState({ select: (state) => state.location.href })
  const isDesktop = useIsDesktop()

  return (mode: AuthMode = 'login', redirect?: string) => {
    if (!isDesktop) {
      void navigate({ to: mode === 'login' ? '/login' : '/register', search: { redirect: redirect ?? href } })
      return
    }
    void navigate({ href: withAuthModal(href, mode, redirect), resetScroll: false, hashScrollIntoView: false })
  }
}
