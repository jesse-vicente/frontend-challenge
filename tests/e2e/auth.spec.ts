import { expect, type Page } from '@playwright/test'
import { test } from './fixtures'

const accountMenu = (page: Page) => page.getByRole('button', { name: /^Conta de/ })

async function logoutFromHeader(page: Page) {
  await accountMenu(page).click()
  await page.getByRole('menuitem', { name: 'Sair' }).click()
  await expect(page.getByRole('link', { name: 'Entrar' }).first()).toBeVisible()
}

test.describe('conta e sessão', () => {
  test('cadastro valida campos, rejeita e-mail em uso e entra na conta nova', async ({ app, page }) => {
    await app.open('/register')
    await page.getByRole('button', { name: 'Criar conta', exact: true }).last().click()
    await expect(page.getByText('Use de 3 a 20 caracteres: letras minúsculas, números ou _.')).toBeVisible()
    await expect(page.getByPlaceholder('Nome de usuário')).toHaveAttribute('aria-invalid', 'true')

    await page.getByPlaceholder('Nome de usuário').fill('carla_nft')
    await page.getByPlaceholder('Digite seu e-mail', { exact: true }).fill('alice@nft.test')
    await page.getByPlaceholder('Senha', { exact: true }).fill('Senha123')
    await page.getByPlaceholder('Confirmar senha').fill('Senha124')
    await page.getByRole('button', { name: 'Criar conta', exact: true }).last().click()
    await expect(page.getByText('As senhas não coincidem.')).toBeVisible()

    await page.getByPlaceholder('Confirmar senha').fill('Senha123')
    await page.getByRole('button', { name: 'Criar conta', exact: true }).last().click()
    await expect(page.getByText(/e-mail já/i)).toBeVisible()

    await page.getByPlaceholder('Digite seu e-mail', { exact: true }).fill('carla@nft.test')
    await page.getByRole('button', { name: 'Criar conta', exact: true }).last().click()
    await expect(accountMenu(page)).toBeVisible()
  })

  test('login com senha errada mostra erro e com a correta volta ao fluxo @mobile', async ({ app, page }) => {
    await app.open('/login?redirect=%2Fprofile')
    await app.submitLogin('alice', 'Errada123')
    await expect(page.getByText('E-mail ou senha inválidos.')).toBeVisible()
    await expect(page.getByPlaceholder('Senha')).toHaveAttribute('aria-invalid', 'true')
    await app.submitLogin('alice')
    await expect(page).toHaveURL(/\/profile$/)
    await expect(page.getByRole('textbox', { name: 'E-mail', exact: true })).toHaveValue('alice@nft.test')
  })

  test('rota privada sem sessão redireciona ao login e retorna depois', async ({ app, page }) => {
    await app.open('/wallets')
    await expect(page).toHaveURL(/\/login\?redirect=%2Fwallets/)
    await app.submitLogin('alice')
    await expect(page).toHaveURL(/\/wallets$/)
  })

  test('sessão expirada (relógio controlado) leva ao login com aviso', async ({ app, page }) => {
    await page.clock.install()
    await app.open('/', { scenario: 'session-expired' })
    await app.signIn('alice', '/profile')
    await expect(page.getByRole('textbox', { name: 'E-mail', exact: true })).toHaveValue('alice@nft.test')

    // Sessions in this scenario last 45 s: past it, the next private request ends the session.
    await page.clock.fastForward('00:50')
    await expect(page).toHaveURL(/\/login\?redirect=%2Fprofile/)
    await expect(page.getByText('Sua sessão expirou. Entre novamente para continuar de onde parou.')).toBeVisible()
    await app.submitLogin('alice')
    await expect(page).toHaveURL(/\/profile$/)
  })

  test('logout e troca de usuário não expõem dados do anterior', async ({ app, page }) => {
    await app.open('/')
    await app.signIn('alice', '/')
    await app.buyFromDetail('nft_001')
    await expect(page.getByRole('link', { name: 'Carrinho, 1 item' })).toBeVisible()

    await logoutFromHeader(page)
    await expect(page.getByRole('link', { name: 'Carrinho vazio' })).toBeVisible()

    await app.signIn('bob', '/profile')
    await expect(page.getByRole('textbox', { name: 'E-mail', exact: true })).toHaveValue('bob@nft.test')
    await expect(page.getByRole('link', { name: 'Carrinho vazio' })).toBeVisible()
    await page.goto('/wallets')
    await expect(page.locator('#primary-wallet-form').getByLabel('Endereço da carteira')).not.toHaveValue(/0xa91f7656/i)
  })
})
