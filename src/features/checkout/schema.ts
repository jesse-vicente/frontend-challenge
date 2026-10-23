import { z } from 'zod'
import { splitEnsName } from '@/domain/account'
import { accountFields } from '@/features/wallets/schemas'
import { type CollectorDto } from '@/shared/api/dtos/order'
import { type ProfileDto } from '@/shared/api/dtos/profile'
import { type WalletDto } from '@/shared/api/dtos/wallet'

/** Fields of the "Perfil do colecionador" payment form, with the layout's required marks. */
export const checkoutFormSchema = z.object({
  walletId: z.string().trim().min(1, 'Selecione uma carteira cadastrada.'),
  displayName: accountFields.displayName,
  username: accountFields.username,
  network: accountFields.network,
  profileName: accountFields.profileName,
  secondaryAddress: accountFields.secondaryAddress,
  provider: accountFields.provider,
  referralCode: accountFields.referralCode,
  email: accountFields.email,
  ensLabel: accountFields.ensLabel,
  ensSuffix: accountFields.ensSuffix,
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
