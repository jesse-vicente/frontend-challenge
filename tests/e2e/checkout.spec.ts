import { expect, type Page } from '@playwright/test'
import { type App, test, type UserKey } from './fixtures'

const EDITION = 'nft_001_1-50'
const reviewDialog = (page: Page) => page.getByRole('dialog', { name: 'Revise seu pedido' })
const confirmPurchase = (page: Page) => page.getByRole('button', { name: 'Confirmar compra' })
const receiptTitle = (page: Page) => page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })
const orderCount = (app: App) => app.mock<{ orders: number }>('status').then((status) => status.orders)

/** Cart with nft_001 → login → payment page ready to confirm. */
async function openCheckout(app: App, options: { scenario?: string; user?: UserKey } = {}) {
  await app.open('/', { scenario: options.scenario })
  await app.buyFromDetail('nft_001')
  await app.page.getByRole('button', { name: 'Conectar e finalizar' }).filter({ visible: true }).click()
  await app.submitLogin(options.user ?? 'alice')
  await expect(app.page).toHaveURL(/\/checkout$/)
  await expect(confirmPurchase(app.page)).toBeEnabled()
}

async function openReview(page: Page) {
  await confirmPurchase(page).click()
  await expect(reviewDialog(page)).toBeVisible()
}

test.describe('compra', () => {
  test('do catálogo ao recibo confirmado @mobile', async ({ app, page }) => {
    await app.open('/')
    const card = page.locator('#mercado article h3 a').first()
    const name = (await card.textContent())?.trim() ?? ''
    await card.click()
    await expect(page.getByRole('heading', { level: 1 })).toContainText(name)
    await page
      .getByRole('button', { name: /COMPRAR|Comprar NFT/ })
      .filter({ visible: true })
      .first()
      .click()
    await expect(page.getByRole('list', { name: 'Itens do carrinho' })).toContainText(name)

    await page.getByRole('button', { name: 'Conectar e finalizar' }).filter({ visible: true }).click()
    await app.submitLogin('alice')
    await expect(confirmPurchase(page)).toBeEnabled()
    await openReview(page)
    await expect(reviewDialog(page)).toContainText(name)
    await reviewDialog(page).getByRole('button', { name: 'Confirmar e pagar' }).click()

    await expect(page).toHaveURL(/\/orders\/[\w-]+$/)
    await expect(receiptTitle(page)).toBeVisible({ timeout: 15_000 })
    expect(await orderCount(app)).toBe(1)
  })

  test('pagamento recusado preserva o carrinho', async ({ app, page }) => {
    await openCheckout(app, { scenario: 'payment-declined' })
    await openReview(page)
    await reviewDialog(page).getByRole('button', { name: 'Confirmar e pagar' }).click()
    await expect(page.getByRole('heading', { name: 'Pagamento recusado' })).toBeVisible({ timeout: 15_000 })
    await page.getByRole('link', { name: 'Voltar ao carrinho' }).click()
    await expect(page.getByRole('list', { name: 'Itens do carrinho' })).toContainText('Emerald Ape #042')
  })

  test('clique repetido em confirmar cria um único pedido', async ({ app, page }) => {
    await openCheckout(app)
    await openReview(page)
    await reviewDialog(page).getByRole('button', { name: 'Confirmar e pagar' }).dblclick()
    await expect(page).toHaveURL(/\/orders\//)
    await expect(receiptTitle(page)).toBeVisible({ timeout: 15_000 })
    expect(await orderCount(app)).toBe(1)
  })

  test('timeout no envio: a nova tentativa recupera o mesmo pedido', async ({ app, page }) => {
    test.setTimeout(75_000)
    await openCheckout(app, { scenario: 'order-timeout' })
    await openReview(page)
    await reviewDialog(page).getByRole('button', { name: 'Confirmar e pagar' }).click()
    // The first response takes 20 s; the client gives up at 8 s and offers a retry with the same key.
    await expect(reviewDialog(page).getByRole('alert').last()).toBeVisible({ timeout: 15_000 })
    expect(await orderCount(app)).toBe(1)
    await reviewDialog(page).getByRole('button', { name: 'Confirmar e pagar' }).click()
    await expect(page).toHaveURL(/\/orders\//, { timeout: 15_000 })
    await expect(receiptTitle(page)).toBeVisible({ timeout: 15_000 })
    expect(await orderCount(app)).toBe(1)
  })

  test('pedido pendente é retomado após recarregar a página', async ({ app, page }) => {
    await openCheckout(app)
    await app.mock('setLatency', 200)
    await openReview(page)
    await reviewDialog(page).getByRole('button', { name: 'Confirmar e pagar' }).click()
    await expect(page.getByRole('heading', { name: 'Processando pagamento' })).toBeVisible()
    const orderUrl = page.url()

    await page.goto('/checkout')
    await expect(page).toHaveURL(orderUrl)
    await page.reload()
    await expect(receiptTitle(page)).toBeVisible({ timeout: 15_000 })
    expect(await orderCount(app)).toBe(1)
  })
})

test.describe('tempo real (Socket.IO)', () => {
  test('preço alterado no envio exige nova confirmação com os novos valores', async ({ app, page }) => {
    await openCheckout(app, { scenario: 'price-change-during-checkout' })
    await openReview(page)
    await reviewDialog(page).getByRole('button', { name: 'Confirmar e pagar' }).click()
    await expect(reviewDialog(page).getByText('Os valores mudaram desde a sua última revisão')).toBeVisible()
    expect(await orderCount(app)).toBe(0)
    await reviewDialog(page).getByRole('button', { name: 'Confirmar com os novos valores' }).click()
    await expect(receiptTitle(page)).toBeVisible({ timeout: 15_000 })
  })

  test('evento de preço e disponibilidade atualiza o checkout aberto @mobile', async ({ app, page }) => {
    await openCheckout(app)
    await app.mock('updateNft', 'nft_001', [{ editionId: EDITION, price: '1.5' }])
    const notices = page.getByRole('region', { name: 'Alterações nos itens do carrinho' })
    await expect(notices).toContainText('preço de 1.19 ETH para 1.50 ETH')

    await app.mock('updateNft', 'nft_001', [{ editionId: EDITION, available: 0 }])
    await expect(notices).toContainText('Emerald Ape #042 esgotou.')
    await expect(confirmPurchase(page)).toBeDisabled()
  })

  test('eventos antigos ou duplicados são ignorados', async ({ app, page }) => {
    await openCheckout(app)
    await app.mock('updateNft', 'nft_001', [{ editionId: EDITION, price: '1.5' }])
    const notices = page.getByRole('region', { name: 'Alterações nos itens do carrinho' })
    await expect(notices).toBeVisible()
    await notices.getByRole('button', { name: 'Dispensar avisos' }).click()
    await expect(notices).toBeHidden()

    // A stale event (lower version) claims the NFT sold out at 999 ETH.
    await app.mock('sendStaleNftEvent', 'nft_001')
    // A duplicate of the last delivered event.
    const events = await app.mock<{ eventId: string }[]>('recentEvents')
    const last = events.at(-1)
    expect(last).toBeDefined()
    await app.mock('replayEvent', last?.eventId)

    await page.waitForTimeout(1000)
    await expect(notices).toBeHidden()
    await expect(page.getByText('999')).toHaveCount(0)
    await expect(confirmPurchase(page)).toBeEnabled()
  })

  test('após desconexão, a reconexão recupera mudanças perdidas', async ({ app, page }) => {
    await openCheckout(app)
    await app.mock('setRealtimeOffline', true)
    await app.mock('dropRealtime')
    await app.mock('updateNft', 'nft_001', [{ editionId: EDITION, price: '1.6' }])
    await page.waitForTimeout(500)
    await app.mock('setRealtimeOffline', false)
    await expect(page.getByText('1.60 ETH').first()).toBeVisible({ timeout: 20_000 })
  })
})
