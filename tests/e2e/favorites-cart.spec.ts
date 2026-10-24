import { expect, type Page } from '@playwright/test'
import { test } from './fixtures'

/** The detail page's text button (the cards of its carousels have "Favoritar <name>" hearts). */
const favoriteButton = (page: Page) =>
  page.getByRole('button', { name: /^(Favoritar|Favoritado)$/ }).filter({ visible: true })
/** Waits for the server to answer the optimistic toggle before reloading. */
const favoriteSaved = (page: Page) =>
  page.waitForResponse((response) => response.url().includes('/api/me/favorites/') && response.ok())
const summary = (page: Page) => page.locator('aside').filter({ has: page.getByText('Subtotal') })
const visible = (page: Page, name: string | RegExp) => page.getByRole('button', { name }).filter({ visible: true })

test.describe('favoritos', () => {
  test('favoritar persiste no servidor e aparece na lista de interesse', async ({ app, page }) => {
    await app.open('/')
    await app.signIn('alice', '/nfts/nft_002')
    await expect(favoriteButton(page)).toHaveAttribute('aria-pressed', 'false')
    await Promise.all([favoriteSaved(page), favoriteButton(page).click()])
    await expect(favoriteButton(page)).toHaveAttribute('aria-pressed', 'true')
    await expect(favoriteButton(page)).toHaveText('Favoritado')

    await page.reload()
    await expect(favoriteButton(page)).toHaveAttribute('aria-pressed', 'true')
    await page.goto('/profile#favorites')
    await expect(
      page
        .locator('#favorites')
        .getByRole('link', { name: /\(favorito\)/ })
        .first(),
    ).toBeVisible()
  })

  test('falha na mutation desfaz a atualização otimista e a nova tentativa recupera', async ({ app, page }) => {
    await app.open('/', { scenario: 'favorites-failure' })
    await app.signIn('alice', '/nfts/nft_002')
    await favoriteButton(page).click()
    await expect(page.getByText(/Não foi possível atualizar os favoritos/)).toBeVisible()
    await expect(favoriteButton(page)).toHaveAttribute('aria-pressed', 'false')

    await app.mock('setScenario', 'default')
    await Promise.all([favoriteSaved(page), favoriteButton(page).click()])
    await expect(favoriteButton(page)).toHaveAttribute('aria-pressed', 'true')
    await page.reload()
    await expect(favoriteButton(page)).toHaveAttribute('aria-pressed', 'true')
  })

  test('visitante entra pelo modal sobre o NFT e continua nele', async ({ app, page }) => {
    await app.open('/nfts/nft_002')
    await favoriteButton(page).click()
    await expect(page).toHaveURL(/\/nfts\/nft_002\?auth=login$/)
    await expect(page.getByRole('dialog', { name: 'Entrar' })).toBeVisible()
    await app.submitLogin('alice')
    await expect(page).toHaveURL(/\/nfts\/nft_002$/)
    await expect(page.getByRole('dialog')).toBeHidden()
  })
})

test.describe('carrinho', () => {
  test('quantidade, cupom, remoção e persistência após refresh @mobile', async ({ app, page }) => {
    await app.open('/')
    await app.buyFromDetail('nft_001')
    await expect(page.getByText('Emerald Ape #042').filter({ visible: true }).first()).toBeVisible()

    await visible(page, 'Aumentar quantidade').first().click()
    await expect(page.getByLabel('2 unidades').filter({ visible: true }).first()).toBeVisible()
    await expect(summary(page).filter({ visible: true }).first()).toContainText('2.38 ETH')

    await page.reload()
    await expect(page.getByLabel('2 unidades').filter({ visible: true }).first()).toBeVisible()

    const coupon = page.getByPlaceholder('Digite o código promocional...')
    await coupon.fill('NAOEXISTE')
    await visible(page, 'Aplicar').click()
    await expect(page.getByRole('alert').filter({ hasText: /cupom/i })).toBeVisible()
    await coupon.fill('EXPIRED20')
    await visible(page, 'Aplicar').click()
    await expect(page.getByRole('alert').filter({ hasText: /expirou|expirado/i })).toBeVisible()
    await coupon.fill('WELCOME10')
    await visible(page, 'Aplicar').click()
    await expect(page.getByText('WELCOME10').filter({ visible: true }).first()).toBeVisible()

    await visible(page, 'Remover Emerald Ape #042 do carrinho').first().click()
    await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
  })

  test('cliques rápidos na quantidade somam sem voltar ao valor anterior', async ({ app, page }) => {
    await app.open('/')
    await app.buyFromDetail('nft_001')
    const increase = visible(page, 'Aumentar quantidade').first()
    const quantity = (units: number) => page.getByLabel(`${units} unidades`).filter({ visible: true }).first()
    let saved = 0
    page.on('response', (response) => {
      if (response.request().method() === 'PATCH' && response.url().includes('/cart/items/')) saved += 1
    })

    // No waiting for the server between clicks: each answer must not undo the clicks queued after it.
    for (const units of [2, 3, 4]) {
      await increase.click()
      await expect(quantity(units)).toBeVisible()
    }
    await visible(page, 'Diminuir quantidade').first().click()
    await expect(quantity(3)).toBeVisible()
    // The quote showed 3.57 ETH once already (on the way up), so it cannot tell that the last change
    // reached the server, and a reload with a change still queued would drop it.
    await expect.poll(() => saved).toBe(4)
    await expect(summary(page).filter({ visible: true }).first()).toContainText('3.57 ETH')

    await page.reload()
    await expect(quantity(3)).toBeVisible()
  })

  test('carrinho do visitante é mantido após o login', async ({ app, page }) => {
    await app.open('/')
    await app.buyFromDetail('nft_003')
    await expect(page.getByRole('link', { name: 'Carrinho, 1 item' })).toBeVisible()
    await visible(page, 'Conectar e finalizar').click()
    // Sign-in modal over the cart, continuing to the checkout.
    await expect(page).toHaveURL(/\/cart\?auth=login&redirect=%2Fcheckout$/)
    await app.submitLogin('bob')
    await expect(page).toHaveURL(/\/checkout$/)
    await page.goto('/cart')
    await expect(page.getByRole('list', { name: 'Itens do carrinho' })).toContainText(/#/)
    await expect(page.getByRole('link', { name: /^Carrinho, \d+ ite/ })).toBeVisible()
  })
})
