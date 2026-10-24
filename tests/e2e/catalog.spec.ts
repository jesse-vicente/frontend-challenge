import { expect, type Page } from '@playwright/test'
import { test } from './fixtures'

const catalog = (page: Page) => page.locator('#market')
const cardTitles = (page: Page) => catalog(page).locator('article h3')
/** The checkbox is visually hidden: the collector clicks the option label. */
const toggleFilter = (page: Page, name: string) =>
  page.getByRole('complementary', { name: 'Filtros' }).locator('label').filter({ hasText: name }).click()
const settled = (page: Page) => expect(catalog(page).locator('[aria-busy=true]')).toHaveCount(0)
const cardPrices = async (page: Page) =>
  (await catalog(page).locator('article p > span:first-child').allTextContents()).map((text) => Number.parseFloat(text))

test.describe('catálogo', () => {
  test('combina filtros, ordena, pagina e restaura o estado pelo histórico', async ({ app, page }) => {
    await app.open('/')
    const filters = page.getByRole('complementary', { name: 'Filtros' })
    await expect(cardTitles(page).first()).toBeVisible()

    await toggleFilter(page, 'Arte digital')
    await toggleFilter(page, 'Ethereum')
    await expect(page).toHaveURL(/categories=.*digital-art/)
    await expect(page).toHaveURL(/networks=.*ethereum/)
    await expect(filters.getByRole('checkbox', { name: /^Arte digital/ })).toBeChecked()
    const filteredCount = await cardTitles(page).count()
    expect(filteredCount).toBeGreaterThan(0)

    await page.getByRole('button', { name: /Ordenar por/ }).click()
    await page.getByRole('menuitemradio', { name: 'Menor preço' }).click()
    await expect(page).toHaveURL(/sort=price-asc/)
    await settled(page)
    const prices = await cardPrices(page)
    expect(prices).toEqual([...prices].sort((a, b) => a - b))

    // Back to the unfiltered list, then paginate.
    await toggleFilter(page, 'Arte digital')
    await toggleFilter(page, 'Ethereum')
    await expect(page).not.toHaveURL(/categories=/)
    await settled(page)
    const firstOnPageOne = (await cardTitles(page).first().textContent())?.trim() ?? ''
    await page
      .getByRole('navigation', { name: 'Paginação do catálogo' })
      .getByRole('button', { name: 'Página 2' })
      .click()
    await expect(page).toHaveURL(/page=2/)
    await expect(cardTitles(page).first()).not.toHaveText(firstOnPageOne)
    await expect(page.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page')

    // History restores each step from the URL.
    await page.goBack()
    await expect(page).not.toHaveURL(/page=2/)
    await expect(cardTitles(page).first()).toHaveText(firstOnPageOne)
    await page.goBack()
    await page.goBack()
    await expect(page).toHaveURL(/categories=.*digital-art/)
    await expect(filters.getByRole('checkbox', { name: /^Arte digital/ })).toBeChecked()
  })

  test('setas da paginação deslizam os números sem trocar de página', async ({ app, page }) => {
    await app.open('/')
    await settled(page)
    const pagination = page.getByRole('navigation', { name: 'Paginação do catálogo' })
    const number = (value: number) => pagination.getByRole('button', { name: `Página ${value}`, exact: true })
    const previous = pagination.getByRole('button', { name: 'Páginas anteriores' })
    const next = pagination.getByRole('button', { name: 'Próximas páginas' })
    await expect(number(4)).toBeVisible()
    await expect(previous).toHaveAttribute('aria-disabled', 'true')

    // 72 NFTs, 9 per page: the arrows slide the four numbers up to page 8.
    for (let clicks = 0; clicks < 4; clicks += 1) await next.click()
    await expect(number(8)).toBeVisible()
    await expect(number(4)).toBeHidden()
    await expect(next).toHaveAttribute('aria-disabled', 'true')
    await expect(next).toBeFocused()
    await expect(page).not.toHaveURL(/page=/)
    await expect(cardTitles(page)).toHaveCount(9)

    await number(7).click()
    await expect(page).toHaveURL(/page=7/)
    await expect(number(7)).toHaveAttribute('aria-current', 'page')
    // The numbers stay where they were under the pointer.
    await expect(number(5)).toBeVisible()

    await previous.click()
    await expect(number(4)).toBeVisible()
    await expect(page).toHaveURL(/page=7/)

    // A page change from elsewhere brings its number back into view.
    await page.goBack()
    await expect(page).not.toHaveURL(/page=/)
    await expect(number(1)).toHaveAttribute('aria-current', 'page')
  })

  test('busca global leva ao catálogo com o termo na URL @mobile', async ({ app, page }) => {
    await app.open('/')
    await page.getByRole('button', { name: 'Buscar NFTs' }).filter({ visible: true }).first().click()
    const dialog = page.getByRole('dialog', { name: 'Buscar NFTs' })
    await dialog.getByRole('searchbox', { name: 'Termo de busca' }).fill('Ape')
    await dialog.getByRole('button', { name: 'Buscar' }).click()
    await expect(page).toHaveURL(/q=Ape/)
    await expect(page.getByText('Resultados para')).toBeVisible()
    await expect(cardTitles(page).first()).toContainText(/Ape/i)
  })

  test('busca sem resultados mostra estado vazio com ação', async ({ app, page }) => {
    await app.open('/?q=zzzz-inexistente')
    await expect(catalog(page).getByText('Nenhum NFT encontrado')).toBeVisible()
    await page.getByRole('button', { name: 'limpar busca' }).click()
    await expect(page).not.toHaveURL(/q=/)
    await expect(cardTitles(page).first()).toBeVisible()
  })

  test('Início, logo e Mercado voltam à seção mesmo quando a URL não muda', async ({ app, page }) => {
    await app.open('/')
    await expect(cardTitles(page).first()).toBeVisible()
    const header = page.getByRole('banner')
    const scrollY = () => page.evaluate(() => window.scrollY)
    const marketOffset = () =>
      page.evaluate(() => Math.abs(document.getElementById('market')?.getBoundingClientRect().top ?? Number.NaN))
    const scrollToFooter = () => page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))

    // Scrolling keeps the URL at "/": the router sees these clicks as navigations to the same page.
    await scrollToFooter()
    await header.getByRole('link', { name: 'Início' }).click()
    await expect.poll(scrollY).toBe(0)

    await scrollToFooter()
    await header.getByRole('link', { name: 'Kurio, página inicial' }).click()
    await expect.poll(scrollY).toBe(0)

    await header.getByRole('link', { name: 'Mercado' }).click()
    await expect(page).toHaveURL(/#market$/)
    await expect.poll(marketOffset).toBeLessThan(200)
    await scrollToFooter()
    await header.getByRole('link', { name: 'Mercado' }).click()
    await expect.poll(marketOffset).toBeLessThan(200)
  })
})

test.describe('início pré-renderizado', () => {
  /** Opens the prerendered home page; resolves to whether React kept the hero from index.html. */
  async function openPrerendered(
    app: { open: (path: string, options: { reset: boolean }) => Promise<void> },
    page: Page,
  ) {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => message.type() === 'error' && errors.push(message.text()))
    // The hero as parsed from index.html, before any script runs.
    await page.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => {
        Object.assign(window, { __prerenderedHero: document.querySelector('#root section[aria-roledescription]') })
      })
    })
    // Without parameters (no scenario or reset): the page index.html was prerendered for.
    await app.open('/', { reset: false })
    await expect(cardTitles(page).first()).toBeVisible()
    const heroKept = await page.evaluate(
      () => (window as unknown as { __prerenderedHero?: Element | null }).__prerenderedHero?.isConnected,
    )
    return { heroKept, errors }
  }

  test('o HTML já traz o hero e o React adota essa marcação sem erros @mobile', async ({ app, page }) => {
    const { heroKept, errors } = await openPrerendered(app, page)
    expect(errors).toEqual([])
    expect(heroKept).toBe(true)
  })

  test('a hidratação não perde a marcação quando a API responde antes dela', async ({ app, page }) => {
    // A slow page chunk lets the simulated API answer before hydration (fast network, busy CPU).
    await page.route('**/assets/home-page-content-*.js', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      await route.continue()
    })
    const { heroKept, errors } = await openPrerendered(app, page)
    expect(errors).toEqual([])
    expect(heroKept).toBe(true)
  })
})

test.describe('detalhe', () => {
  test('acesso direto ao detalhe carrega o NFT e atualiza o título @mobile', async ({ app, page }) => {
    await app.open('/nfts/nft_001')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Emerald Ape')
    await expect(page).toHaveTitle(/Emerald Ape/)
  })

  test('NFT inexistente mostra 404 com retorno ao início @mobile', async ({ app, page }) => {
    await app.open('/nfts/nft_nao_existe')
    await expect(page.getByText(/não encontrado/i).first()).toBeVisible()
    await page
      .getByRole('link', { name: /Voltar ao início|Explorar/ })
      .first()
      .click()
    await expect(page).toHaveURL(/\/($|\?|#)/)
  })
})
