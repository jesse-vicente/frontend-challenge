import { createFileRoute, Outlet } from '@tanstack/react-router'
import { signInRedirect } from '@/features/auth/auth-modal'
import { sessionStore } from '@/shared/session/session-store'

/** Guard for private flows: checkout, orders, profile and wallets. */
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ location }) => {
    if (!sessionStore.getToken()) throw signInRedirect(location.href)
  },
  component: Outlet,
})
