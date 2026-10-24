import { expect, type Locator, type Page } from '@playwright/test'
import { test } from './fixtures'

/**
 * Widths the layout must hold without horizontal scrolling: 390, 768 and 1440 from the
 * challenge, 1024 between the tablet and desktop layouts, and the widths a 1280 px window
 * has at 200% (640) and 400% zoom (320, WCAG 1.4.10 reflow).
 */
const WIDTHS = [320, 390, 640, 768, 1024, 1440] as const

/** Elements that stick out of the viewport outside an intentional horizontal scroller. */
function overflowingElements(page: Page) {
  return page.evaluate(() => {
    const limit = document.documentElement.clientWidth
    const scrolls = (element: Element) =>
      ['auto', 'scroll', 'hidden', 'clip'].includes(getComputedStyle(element).overflowX)
    const insideScroller = (element: Element) => {
      for (let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
        if (scrolls(parent)) return true
      }
      return false
    }
    const offenders: string[] = []
    for (const element of document.body.querySelectorAll('*')) {
      const rect = element.getBoundingClientRect()
      if (rect.width === 0 || rect.right <= limit + 1 || insideScroller(element)) continue
      const name = element.getAttribute('aria-label') ?? element.textContent?.trim().slice(0, 40) ?? ''
      offenders.push(
        `${element.tagName.toLowerCase()}.${String(element.className).slice(0, 50)} "${name}" → ${Math.round(rect.right)}px`,
      )
    }
    return { scrollWidth: document.documentElement.scrollWidth, limit, offenders: offenders.slice(0, 5) }
  })
}

/** Resizes through every width and expects the page to fit it horizontally. */
async function expectFitsEveryWidth(page: Page, ready: () => Locator) {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 })
    await expect(ready().filter({ visible: true }).first()).toBeVisible()
    // Layout of the new width settled.
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    const result = await overflowingElements(page)
    expect
      .soft(result.scrollWidth, `${page.url()} @ ${width}px: ${result.offenders.join(' | ')}`)
      .toBeLessThanOrEqual(result.limit)
  }
}

test.describe('responsividade (320 a 1440 px)', () => {
  // Every screen at every width, plus a purchase to reach the receipt.
  test.describe.configure({ timeout: 90_000 })

  test('início, detalhe, páginas inexistentes, login e cadastro', async ({ app, page }) => {
    await app.open('/')
    await expect(page.locator('#market article h3').first()).toBeVisible()
    await expectFitsEveryWidth(page, () => page.locator('#market article h3'))

    await page.goto('/nfts/nft_001')
    await expectFitsEveryWidth(page, () => page.getByRole('heading', { level: 1 }))

    await page.goto('/nfts/nft_inexistente')
    await expectFitsEveryWidth(page, () => page.getByText('NFT não encontrado'))

    await page.goto('/rota-inexistente')
    await expectFitsEveryWidth(page, () => page.getByRole('heading', { name: 'PÁGINA NÃO ENCONTRADA' }))

    await page.goto('/login')
    await expectFitsEveryWidth(page, () => page.getByPlaceholder('contato@email.com'))

    await page.goto('/register')
    await expectFitsEveryWidth(page, () => page.getByPlaceholder('Confirmar senha'))
  })

  test('carrinho, pagamento, recibo, perfil e carteiras', async ({ app, page }) => {
    await app.open('/')
    await app.buyFromDetail('nft_001')
    await expectFitsEveryWidth(page, () => page.getByRole('list', { name: 'Itens do carrinho' }))

    await page.getByRole('button', { name: 'Conectar e finalizar' }).filter({ visible: true }).click()
    await app.submitLogin('alice')
    const confirm = () => page.getByRole('button', { name: 'Confirmar compra' })
    await expect(confirm()).toBeEnabled()
    await expectFitsEveryWidth(page, confirm)

    await page.setViewportSize({ width: 1440, height: 900 })
    await confirm().click()
    const review = page.getByRole('dialog', { name: 'Revise seu pedido' })
    await expectFitsEveryWidth(page, () => review)
    await review.getByRole('button', { name: 'Confirmar e pagar' }).click()
    const receipt = () => page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })
    await expect(receipt()).toBeVisible({ timeout: 15_000 })
    await expectFitsEveryWidth(page, receipt)

    await page.goto('/profile')
    await expectFitsEveryWidth(page, () => page.getByRole('button', { name: 'Salvar' }))

    await page.goto('/wallets')
    await expectFitsEveryWidth(page, () => page.getByRole('heading', { level: 1 }))
  })
})
