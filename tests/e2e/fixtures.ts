import { test as base, expect, type Page } from '@playwright/test'

export const USERS = {
  alice: { email: 'alice@nft.test', password: 'Senha123', firstName: 'Alice' },
  bob: { email: 'bob@nft.test', password: 'Senha123', firstName: 'Bob' },
} as const
export type UserKey = keyof typeof USERS

/** Methods of `window.__mock` (src/mocks/control.ts), called through the page. */
type MockMethod =
  | 'reset'
  | 'setScenario'
  | 'setLatency'
  | 'failNext'
  | 'clearFailures'
  | 'updateNft'
  | 'replayEvent'
  | 'sendStaleNftEvent'
  | 'recentEvents'
  | 'settleOrder'
  | 'expireSession'
  | 'setRealtimeOffline'
  | 'dropRealtime'
  | 'status'

export class App {
  constructor(readonly page: Page) {}

  /** Opens a route on a freshly reset backend, optionally under a scenario. */
  async open(path = '/', options: { scenario?: string; reset?: boolean } = {}) {
    const [pathAndQuery = '/', hash] = path.split('#')
    const params = [
      options.reset === false ? null : 'mock-reset',
      options.scenario ? `scenario=${options.scenario}` : null,
    ].filter(Boolean)
    const separator = pathAndQuery.includes('?') ? '&' : '?'
    const query = params.length > 0 ? `${separator}${params.join('&')}` : ''
    await this.page.goto(`${pathAndQuery}${query}${hash ? `#${hash}` : ''}`)
    await this.ready()
  }

  async ready() {
    await this.page.waitForFunction(() => Boolean((window as unknown as { __mock?: unknown }).__mock))
  }

  /** Calls the simulated backend control surface (never the app state). */
  mock<T = unknown>(method: MockMethod, ...args: unknown[]): Promise<T> {
    return this.page.evaluate(
      ([name, params]) => {
        const control = (window as unknown as { __mock: Record<string, (...input: unknown[]) => unknown> }).__mock
        return control[name as string](...(params as unknown[])) as T
      },
      [method, args] as const,
    )
  }

  /** Fills the login form currently on screen (modal on desktop, page on mobile). */
  async submitLogin(user: UserKey, password: string = USERS[user].password) {
    await this.page.getByPlaceholder('contato@email.com').fill(USERS[user].email)
    await this.page.getByPlaceholder('Senha').fill(password)
    await this.page.getByRole('button', { name: 'Entrar', exact: true }).last().click()
  }

  /** Signs in through the login route (keeping the backend state) and waits for the redirect target. */
  async signIn(user: UserKey, redirect = '/') {
    await this.open(`/login?redirect=${encodeURIComponent(redirect)}`, { reset: false })
    await this.submitLogin(user)
    await this.page.waitForURL((url) => url.pathname === redirect.split(/[?#]/)[0])
  }

  /** Adds an NFT to the cart from its detail page ("Comprar" goes to the cart). */
  async buyFromDetail(nftId = 'nft_001') {
    await this.page.goto(`/nfts/${nftId}`)
    await this.page
      .getByRole('button', { name: /COMPRAR|Comprar NFT/ })
      .filter({ visible: true })
      .first()
      .click()
    await this.page.waitForURL('**/cart')
    // The URL changes before the lazy route renders: wait for the cart itself.
    await expect(this.page.getByRole('list', { name: 'Itens do carrinho' })).toBeVisible()
  }

  get isMobile() {
    return (this.page.viewportSize()?.width ?? 1440) < 768
  }
}

export const test = base.extend<{ app: App }>({
  app: async ({ page }, use) => {
    await use(new App(page))
  },
})

export { expect }
