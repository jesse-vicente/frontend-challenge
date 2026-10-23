import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { sessionStore } from '@/shared/session/session-store'

/** Guard for private flows: checkout, orders, profile and wallets. */
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ location }) => {
    if (!sessionStore.getToken()) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
  },
  component: Outlet,
})
