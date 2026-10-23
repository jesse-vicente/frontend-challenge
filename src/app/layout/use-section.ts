import { useRouterState } from '@tanstack/react-router'

export type Section = 'home' | 'market'

const MARKET_PATHS = [/^\/nfts\//, /^\/cart/, /^\/checkout/, /^\/orders\//]

/** Market-flow screens highlight "Mercado" and drop the header divider (per the Figma components). */
export function useSection(): Section {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  return MARKET_PATHS.some((pattern) => pattern.test(pathname)) ? 'market' : 'home'
}
