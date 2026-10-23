import { z } from 'zod'
import {
  ENS_LABEL_PATTERN,
  ENS_SUFFIXES,
  REFERRAL_CODE_PATTERN,
  splitEnsName,
  USERNAME_PATTERN,
} from '@/domain/account'
import { networkSchema } from '@/shared/api/dtos/network'
import { type CollectorDto } from '@/shared/api/dtos/order'
import { type ProfileDto } from '@/shared/api/dtos/profile'
import { type WalletDto, walletProviderSchema } from '@/shared/api/dtos/wallet'

const required = (message: string) => z.string().trim().min(1, message)

/** Fields of the "Perfil do colecionador" payment form, with the layout's required marks. */
export const checkoutFormSchema = z.object({
  walletId: required('Selecione uma carteira cadastrada.'),
  displayName: required('Informe o nome de exibição.').max(40, 'Use até 40 caracteres.'),
  username: required('Informe o nome de usuário.').regex(
    USERNAME_PATTERN,
    'Use 3 a 20 letras minúsculas, números ou _.',
  ),
  network: networkSchema.or(z.literal('')).refine((value) => value !== '', 'Selecione uma rede.'),
  profileName: required('Informe o nome do perfil.').regex(
    USERNAME_PATTERN,
    'Use 3 a 20 letras minúsculas, números ou _.',
  ),
  secondaryAddress: z.string().trim().max(64, 'Use até 64 caracteres.'),
  provider: walletProviderSchema.or(z.literal('')).refine((value) => value !== '', 'Selecione o tipo de carteira.'),
  referralCode: required('Informe o código de indicação.').regex(
    REFERRAL_CODE_PATTERN,
    'Use de 4 a 12 letras ou números.',
  ),
  email: required('Informe o e-mail.').pipe(z.email('Informe um e-mail válido.')),
  ensLabel: required('Informe o nome ENS.').regex(ENS_LABEL_PATTERN, 'Use letras minúsculas, números, hífen ou ponto.'),
  ensSuffix: z.enum(ENS_SUFFIXES),
  useOtherWallet: z.boolean(),
  note: z.string().trim().max(500, 'Use até 500 caracteres.'),
})
export type CheckoutFormValues = z.input<typeof checkoutFormSchema>

export const emptyCheckoutForm: CheckoutFormValues = {
  walletId: '',
  displayName: '',
  username: '',
  network: '',
  profileName: '',
  secondaryAddress: '',
  provider: '',
  referralCode: '',
  email: '',
  ensLabel: '',
  ensSuffix: '.eth',
  useOtherWallet: false,
  note: '',
}

/** Prefills the form from the chosen registered wallet (and the profile as fallback). */
export function valuesFromWallet(
  wallet: WalletDto,
  profile: ProfileDto | undefined,
  current: CheckoutFormValues,
): CheckoutFormValues {
  const ens = splitEnsName(wallet.ensName || profile?.ensName || null)
  return {
    ...current,
    walletId: wallet.id,
    displayName: wallet.displayName || profile?.displayName || '',
    username: profile?.username ?? current.username,
    network: wallet.network,
    profileName: wallet.profileName,
    secondaryAddress: wallet.secondaryAddress ?? '',
    provider: wallet.provider,
    referralCode: wallet.referralCode,
    email: wallet.email || profile?.email || '',
    ensLabel: ens.label,
    ensSuffix: ens.suffix,
  }
}

export function toCollector(values: z.output<typeof checkoutFormSchema>): CollectorDto {
  return {
    displayName: values.displayName,
    username: values.username,
    profileName: values.profileName,
    email: values.email,
    referralCode: values.referralCode,
    ensName: `${values.ensLabel}${values.ensSuffix}`,
    secondaryAddress: values.secondaryAddress || null,
    note: values.note || null,
  }
}
