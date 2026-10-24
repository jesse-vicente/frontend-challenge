import { expect, type Page } from '@playwright/test'
import { test } from './fixtures'

/**
 * Visual regression of the main frames. Data comes from the deterministic mock seed;
 * every image must be decoded and fonts loaded before the capture.
 */
/** Rendered images inside the page width (carousel items scrolled sideways stay lazy). */
const renderedImagesLoaded = () =>
  [...document.images]
    .filter((image) => {
      const rect = image.getBoundingClientRect()
      return image.getClientRects().length > 0 && rect.right > 0 && rect.left < window.innerWidth
    })
    .every((image) => image.complete && image.naturalWidth > 0)

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready)
  await expect(page.locator('[aria-busy=true]')).toHaveCount(0)
  // Lazy images below the fold load as the page is scrolled through.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y)
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    window.scrollTo(0, 0)
  })
  await page.waitForFunction(renderedImagesLoaded)
}

const shot = { fullPage: true, animations: 'disabled' as const }

// Reduced motion also turns off the hero autoplay, so every capture shows the first slide.
test.use({ reducedMotion: 'reduce' })

test.describe('regressão visual @mobile', () => {
  test('início', async ({ app, page }) => {
    await app.open('/')
    await expect(page.locator('#mercado article').first()).toBeVisible()
    await settle(page)
    await expect(page).toHaveScreenshot('inicio.png', shot)
  })

  test('detalhe do NFT', async ({ app, page }) => {
    await app.open('/nfts/nft_001')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Emerald Ape')
    await settle(page)
    await expect(page).toHaveScreenshot('detalhe.png', shot)
  })

  test('carrinho', async ({ app, page }) => {
    await app.open('/')
    await app.buyFromDetail('nft_001')
    await expect(page.getByText('Total').filter({ visible: true }).first()).toBeVisible()
    await settle(page)
    await expect(page).toHaveScreenshot('carrinho.png', shot)
  })

  test('pagamento', async ({ app, page }) => {
    await app.open('/')
    await app.buyFromDetail('nft_001')
    await page.getByRole('button', { name: 'Conectar e finalizar' }).filter({ visible: true }).click()
    await app.submitLogin('alice')
    await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeEnabled()
    await settle(page)
    await expect(page).toHaveScreenshot('pagamento.png', shot)
  })
})
