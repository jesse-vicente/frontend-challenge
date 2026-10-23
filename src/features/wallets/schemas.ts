import { z } from 'zod'
import {
  ENS_LABEL_PATTERN,
  ENS_SUFFIXES,
  REFERRAL_CODE_PATTERN,
  splitEnsName,
  USERNAME_PATTERN,
} from '@/domain/account'
import { isEvmAddress, type WalletRole } from '@/domain/wallet'
import { NETWORK_LABELS } from '@/features/catalog/labels'
import { networkSchema } from '@/shared/api/dtos/network'
import { type UpsertWalletRequest, type WalletDto, walletProviderSchema } from '@/shared/api/dtos/wallet'
import { PROVIDER_LABELS } from './queries'

export const NETWORK_OPTIONS = networkSchema.options.map((value) => ({ value, label: NETWORK_LABELS[value] }))
export const PROVIDER_OPTIONS = walletProviderSchema.options.map((value) => ({ value, label: PROVIDER_LABELS[value] }))

const required = (message: string) => z.string().trim().min(1, message)
const handle = (message: string) =>
  required(message).regex(USERNAME_PATTERN, 'Use 3 a 20 letras minúsculas, números ou _.')

/** Field rules shared by the wallet, profile and payment forms (same labels in the layout). */
export const accountFields = {
  displayName: required('Informe o nome de exibição.')
    .min(2, 'Use pelo menos 2 caracteres.')
    .max(40, 'Use até 40 caracteres.'),
  username: handle('Informe o nome de usuário.'),
  profileName: handle('Informe o nome do perfil.'),
  network: networkSchema.or(z.literal('')).refine((value) => value !== '', 'Selecione uma rede.'),
  secondaryAddress: z.string().trim().max(64, 'Use até 64 caracteres.'),
  provider: walletProviderSchema.or(z.literal('')).refine((value) => value !== '', 'Selecione o tipo de carteira.'),
  referralCode: required('Informe o código de indicação.').regex(
    REFERRAL_CODE_PATTERN,
    'Use de 4 a 12 letras ou números.',
  ),
  email: required('Informe o e-mail.').pipe(z.email('Informe um e-mail válido.')),
  ensLabel: required('Informe o nome ENS.').regex(ENS_LABEL_PATTERN, 'Use letras minúsculas, números, hífen ou ponto.'),
  ensSuffix: z.enum(ENS_SUFFIXES),
  walletNickname: required('Informe o apelido da carteira.')
    .min(2, 'Use pelo menos 2 caracteres.')
    .max(32, 'Use até 32 caracteres.'),
}

/** "Carteira principal/secundária" form. */
export const walletFormSchema = z.object({
  label: accountFields.walletNickname,
  displayName: accountFields.displayName,
  profileName: accountFields.profileName,
  network: accountFields.network,
  address: required('Informe o endereço da carteira.').refine(
    isEvmAddress,
    'Use um endereço 0x com 40 caracteres hexadecimais.',
  ),
  secondaryAddress: accountFields.secondaryAddress,
  provider: accountFields.provider,
  referralCode: accountFields.referralCode,
  email: accountFields.email,
  ensLabel: accountFields.ensLabel,
  ensSuffix: accountFields.ensSuffix,
})
export type WalletFormValues = z.input<typeof walletFormSchema>

/** Form fields that the API may reject by name (409/422 `fields`). */
export const WALLET_FORM_FIELDS = Object.keys(walletFormSchema.shape) as (keyof WalletFormValues)[]

export const emptyWalletForm: WalletFormValues = {
  label: '',
  displayName: '',
  profileName: '',
  network: '',
  address: '',
  secondaryAddress: '',
  provider: '',
  referralCode: '',
  email: '',
  ensLabel: '',
  ensSuffix: '.eth',
}

export function walletFormValues(wallet: WalletDto): WalletFormValues {
  const ens = splitEnsName(wallet.ensName)
  return {
    label: wallet.label,
    displayName: wallet.displayName,
    profileName: wallet.profileName,
    network: wallet.network,
    address: wallet.address,
    secondaryAddress: wallet.secondaryAddress ?? '',
    provider: wallet.provider,
    referralCode: wallet.referralCode,
    email: wallet.email,
    ensLabel: ens.label,
    ensSuffix: ens.suffix,
  }
}

export function toWalletRequest(values: WalletFormValues, role: WalletRole): UpsertWalletRequest {
  const parsed = walletFormSchema.parse(values)
  if (!parsed.network || !parsed.provider) throw new Error('Network and provider are validated by the form schema.')
  return {
    role,
    label: parsed.label,
    displayName: parsed.displayName,
    profileName: parsed.profileName,
    network: parsed.network,
    address: parsed.address,
    secondaryAddress: parsed.secondaryAddress || null,
    provider: parsed.provider,
    referralCode: parsed.referralCode,
    email: parsed.email,
    ensName: `${parsed.ensLabel}${parsed.ensSuffix}`,
  }
}
