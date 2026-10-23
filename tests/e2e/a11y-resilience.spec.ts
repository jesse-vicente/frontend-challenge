import { expect, type Page } from '@playwright/test'
import { test } from './fixtures'

const cards = (page: Page) => page.locator('#mercado article')
const activeIsInside = (page: Page, selector: string) =>
  page.evaluate((target) => Boolean(document.activeElement?.closest(target)), selector)

test.describe('teclado e foco', () => {
  test('link de pular conteúdo move o foco para o conteúdo principal', async ({ app, page }) => {
    await app.open('/')
    await expect(cards(page).first()).toBeVisible()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('#conteudo')).toBeFocused()
  })

  test('diálogo de busca prende o foco, fecha com Esc e devolve o foco ao gatilho', async ({ app, page }) => {
    await app.open('/')
    const trigger = page.getByRole('button', { name: 'Buscar NFTs' }).filter({ visible: true }).first()
    await trigger.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Buscar NFTs' })
    await expect(dialog.getByRole('searchbox')).toBeFocused()
    for (let step = 0; step < 5; step += 1) {
      await page.keyboard.press('Tab')
      expect(await activeIsInside(page, '[role=dialog]')).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('login só com teclado: erros focam o primeiro campo inválido @mobile', async ({ app, page }) => {
    await app.open('/login?redirect=%2Fprofile')
    const email = page.getByPlaceholder('contato@email.com')
    await email.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByText('Informe seu e-mail.')).toBeVisible()
    await expect(email).toBeFocused()
    await expect(email).toHaveAttribute('aria-invalid', 'true')

    await page.keyboard.type('alice@nft.test')
    await page.keyboard.press('Tab')
    await expect(page.getByPlaceholder('Senha')).toBeFocused()
    await page.keyboard.type('Senha123')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/profile$/)
  })

  test('revisão do pedido recebe o foco e o devolve ao fechar', async ({ app, page }) => {
    await app.open('/')
    await app.buyFromDetail('nft_001')
    await page.getByRole('button', { name: 'Conectar e finalizar' }).filter({ visible: true }).click()
    await app.submitLogin('alice')
    const confirm = page.getByRole('button', { name: 'Confirmar compra' })
    await expect(confirm).toBeEnabled()
    await confirm.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Revise seu pedido' })
    await expect(dialog).toBeVisible()
    expect(await activeIsInside(page, '[role=dialog]')).toBe(true)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(confirm).toBeFocused()
  })
})

test.describe('carregamento, falha e recuperação', () => {
  test('rede lenta mostra skeletons até os dados chegarem @mobile', async ({ app, page }) => {
    await app.open('/', { scenario: 'slow' })
    await expect(page.locator('#mercado [aria-busy=true]').first()).toBeVisible()
    await expect(page.locator('#mercado .skeleton').filter({ visible: true }).first()).toBeVisible()
    await expect(cards(page).first()).toBeVisible({ timeout: 15_000 })
  })

  test('erro do servidor oferece nova tentativa que recupera o catálogo', async ({ app, page }) => {
    await app.open('/', { scenario: 'server-error' })
    const retry = page.locator('#mercado').getByRole('button', { name: 'Tentar novamente' })
    await expect(page.getByText('Não foi possível carregar o catálogo')).toBeVisible({ timeout: 15_000 })
    await expect(
      page.getByText('O serviço está temporariamente indisponível. Tente novamente em instantes.'),
    ).toBeVisible()
    await app.mock('setScenario', 'default')
    await retry.click()
    await expect(cards(page).first()).toBeVisible()
  })

  test('sem conexão no detalhe mostra o erro e recupera ao tentar de novo @mobile', async ({ app, page }) => {
    await app.open('/nfts/nft_001', { scenario: 'offline' })
    await expect(page.getByText('Sem conexão com o servidor. Verifique sua rede e tente novamente.')).toBeVisible({
      timeout: 15_000,
    })
    await app.mock('setScenario', 'default')
    await page.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Emerald Ape')
  })

  test('falha ao calcular a cotação do carrinho permite tentar de novo', async ({ app, page }) => {
    await app.open('/')
    await app.buyFromDetail('nft_001')
    await app.mock(
      'failNext',
      'POST',
      '/quote',
      {
        type: 'http-error',
        status: 503,
        code: 'TRANSIENT',
        message: 'Serviço temporariamente indisponível.',
      },
      3,
    )
    await page.getByRole('button', { name: 'Aumentar quantidade' }).filter({ visible: true }).first().click()
    await expect(page.getByText('Não foi possível calcular os valores')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: 'Conectar e finalizar' })).toBeDisabled()
    await page.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.getByText('2.38 ETH').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Conectar e finalizar' }).filter({ visible: true })).toBeEnabled()
  })
})
