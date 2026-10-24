import { expect, type Page } from '@playwright/test'
import { test } from './fixtures'

const favoriteButton = (page: Page) => page.getByRole('button', { name: /^Favorit/ }).filter({ visible: true })
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

  test('visitante é levado ao login e volta ao NFT', async ({ app, page }) => {
    await app.open('/nfts/nft_002')
    await favoriteButton(page).click()
    await expect(page).toHaveURL(/\/login\?redirect=%2Fnfts%2Fnft_002/)
    await app.submitLogin('alice')
    await expect(page).toHaveURL(/\/nfts\/nft_002$/)
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

  test('carrinho do visitante é mantido após o login', async ({ app, page }) => {
    await app.open('/')
    await app.buyFromDetail('nft_003')
    await expect(page.getByRole('link', { name: 'Carrinho, 1 item' })).toBeVisible()
    await visible(page, 'Conectar e finalizar').click()
    await expect(page).toHaveURL(/\/login\?redirect=%2Fcheckout/)
    await app.submitLogin('bob')
    await expect(page).toHaveURL(/\/checkout$/)
    await page.goto('/cart')
    await expect(page.getByRole('list', { name: 'Itens do carrinho' })).toContainText(/#/)
    await expect(page.getByRole('link', { name: /^Carrinho, \d+ ite/ })).toBeVisible()
  })
})
