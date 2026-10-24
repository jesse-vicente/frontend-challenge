import { expect, type Page } from '@playwright/test'
import { test } from './fixtures'

const field = (page: Page, name: string) => page.getByRole('textbox', { name, exact: true })
const errorsShown = (page: Page) => page.locator('[id$="-form-item-message"]')
const save = (page: Page) => page.getByRole('button', { name: 'Salvar', exact: true })

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

test.describe('perfil', () => {
  test.beforeEach(async ({ app }) => {
    await app.open('/')
    await app.signIn('bob', '/profile')
    // Bob has no ENS name yet: required by the profile frame.
    await field(app.page, 'Nome ENS').fill('bob.kurio')
  })

  test('valida campos e mostra conflito de nome de usuário da API', async ({ page }) => {
    await field(page, 'Nome de exibição').fill('')
    await field(page, 'E-mail').fill('bob@')
    await save(page).click()
    await expect(errorsShown(page)).toContainText(['Informe o nome de exibição.', 'Informe um e-mail válido.'])
    await expect(field(page, 'Nome de exibição')).toBeFocused()

    await field(page, 'Nome de exibição').fill('Bob Novo')
    await field(page, 'E-mail').fill('bob@nft.test')
    await field(page, 'Nome de usuário').fill('alice')
    await save(page).click()
    await expect(errorsShown(page)).toHaveText(['Este nome de usuário já existe.'])

    await field(page, 'Nome de usuário').fill('bob')
    await save(page).click()
    await expect(page.getByText('Perfil atualizado.').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Conta de Bob Novo' })).toBeVisible()
    await page.reload()
    await expect(field(page, 'Nome de exibição')).toHaveValue('Bob Novo')
  })

  test('altera a senha validando confirmação e senha atual', async ({ app, page }) => {
    await page.getByLabel('Nova senha', { exact: true }).fill('Outra1234')
    await save(page).click()
    await expect(errorsShown(page)).toContainText(['Informe a senha atual.', 'As senhas não coincidem.'])

    await page.getByLabel('Senha atual').fill('Errada123')
    await page.getByLabel('Confirmar nova senha').fill('Outra1234')
    await save(page).click()
    await expect(errorsShown(page)).toHaveText(['Senha atual incorreta.'])

    await page.getByLabel('Senha atual').fill('Senha123')
    await save(page).click()
    await expect(page.getByText('Perfil e senha atualizados.').first()).toBeVisible()
    await expect(page.getByLabel('Senha atual')).toHaveValue('')

    // The new password is the one that works now.
    await page.getByRole('button', { name: /^Conta de/ }).click()
    await page.getByRole('menuitem', { name: 'Sair' }).click()
    await expect(page.getByRole('link', { name: 'Entrar' }).first()).toBeVisible()
    await app.open('/login', { reset: false })
    await app.submitLogin('bob', 'Senha123')
    await expect(page.getByText('E-mail ou senha inválidos.')).toBeVisible()
    await app.submitLogin('bob', 'Outra1234')
    await expect(page.getByRole('button', { name: /^Conta de/ })).toBeVisible()
  })

  test('avatar: envia, rejeita formato inválido e remove', async ({ page }) => {
    const input = page.locator('input[type=file]')
    await input.setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: PNG })
    await expect(page.getByAltText('Avatar atual')).toBeVisible()

    await input.setInputFiles({ name: 'avatar.gif', mimeType: 'image/gif', buffer: PNG })
    await expect(page.getByRole('alert').filter({ hasText: 'Use uma imagem PNG, JPG ou WebP.' })).toBeVisible()

    await page.getByRole('button', { name: 'Remover' }).click()
    await expect(page.getByAltText('Avatar atual')).toHaveCount(0)
  })
})

test.describe('carteiras', () => {
  test('cadastra carteira secundária copiando a principal e trata conflito de endereço', async ({ app, page }) => {
    await app.open('/')
    await app.signIn('bob', '/wallets')
    await expect(page.getByText('Você ainda não adicionou uma carteira secundária.')).toBeVisible()

    await page.getByLabel('Igual à carteira principal').check()
    const secondary = page.locator('#secondary-wallet-form')
    await expect(secondary.getByLabel('Nome de exibição')).toHaveValue('Bruno Oliveira')
    await expect(secondary.getByLabel('Endereço da carteira')).toHaveValue('')

    await secondary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(secondary.locator('[id$="-form-item-message"]')).toContainText([
      'Informe o apelido da carteira.',
      'Informe o endereço da carteira.',
    ])

    await secondary.getByLabel('Apelido da carteira').fill('Reserva')
    await secondary.getByLabel('Endereço da carteira').fill('0xbda5747bfd65f08deb54cb465eb87d40e51b197e')
    await secondary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(secondary.locator('[id$="-form-item-message"]')).toHaveText(['Este endereço já está cadastrado.'])

    await secondary.getByLabel('Endereço da carteira').fill('0x1111111111111111111111111111111111111111')
    await secondary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.getByText('Carteira secundária salva.').first()).toBeVisible()
    await page.reload()
    await expect(page.locator('#secondary-wallet-form').getByLabel('Apelido da carteira')).toHaveValue('Reserva')
  })

  test('valida o endereço da carteira principal @mobile', async ({ app, page }) => {
    await app.open('/')
    await app.signIn('alice', '/wallets')
    const primary = page.locator('#primary-wallet-form')
    await primary.getByLabel('Endereço da carteira').fill('0x123')
    await primary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(primary.getByText('Use um endereço 0x com 40 caracteres hexadecimais.')).toBeVisible()
    await expect(primary.getByLabel('Endereço da carteira')).toBeFocused()
  })
})
