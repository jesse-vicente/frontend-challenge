import { type Control } from 'react-hook-form'
import { NETWORK_OPTIONS, PROVIDER_OPTIONS } from '@/features/wallets/schemas'
import { type WalletDto } from '@/shared/api/dtos/wallet'
import {
  EnsFormField,
  fieldLabelClass,
  RequiredMark,
  SelectFormField,
  TextFormField,
} from '@/shared/components/form-fields'
import { textFieldClass } from '@/shared/components/text-field'
import { cn } from '@/shared/lib/cn'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form'
import { type CheckoutFormValues } from '../schema'

/** Left column of the payment frame ("Perfil do colecionador"). */
export function CollectorFields({
  control,
  wallet,
  hasSecondary,
}: {
  control: Control<CheckoutFormValues>
  wallet: WalletDto | undefined
  hasSecondary: boolean
}) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-6 md:grid-cols-2 md:gap-y-[17px]">
      <TextFormField control={control} name="displayName" label="Nome de exibição" autoComplete="name" />
      <TextFormField control={control} name="username" label="Nome de usuário" autoComplete="username" />
      <SelectFormField
        control={control}
        name="network"
        label="Rede"
        placeholder="Selecione uma rede"
        options={NETWORK_OPTIONS}
      />
      <TextFormField control={control} name="profileName" label="Nome do perfil" />
      <div className="flex flex-col gap-2">
        <label htmlFor="checkout-wallet-address" className={fieldLabelClass}>
          Endereço da carteira
          <RequiredMark />
        </label>
        <input
          id="checkout-wallet-address"
          readOnly
          value={wallet?.address ?? ''}
          placeholder="Endereço 0x da carteira"
          aria-describedby="checkout-wallet-address-hint"
          className={cn(textFieldClass, 'text-sand')}
        />
        <p id="checkout-wallet-address-hint" className="sr-only">
          Definido pela carteira cadastrada selecionada.
        </p>
      </div>
      <TextFormField
        control={control}
        name="secondaryAddress"
        label="ENS ou carteira secundária (opcional)"
        placeholder="ENS ou carteira secundária (opcional)"
        required={false}
        hideLabel
        className="md:pt-6"
      />
      <SelectFormField
        control={control}
        name="provider"
        label="Tipo de carteira"
        placeholder="Selecione uma carteira"
        options={PROVIDER_OPTIONS}
      />
      <TextFormField control={control} name="referralCode" label="Código de indicação" />
      <TextFormField control={control} name="email" label="E-mail" type="email" autoComplete="email" />
      <EnsFormField control={control} labelName="ensLabel" suffixName="ensSuffix" />
      <FormField
        control={control}
        name="useOtherWallet"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center gap-2 md:col-span-2">
            <FormControl>
              <input
                type="checkbox"
                checked={field.value}
                onChange={(event) => field.onChange(event.target.checked)}
                disabled={!hasSecondary}
                className="size-4 cursor-pointer appearance-none rounded-full border-2 border-primary checked:border-[5px] disabled:opacity-40"
              />
            </FormControl>
            <FormLabel className="text-sm font-normal text-foreground">
              Usar outra carteira?{' '}
              {!hasSecondary ? <span className="text-xs text-sand">(cadastre uma carteira secundária)</span> : null}
            </FormLabel>
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="note"
        render={({ field }) => (
          <FormItem className="gap-2 md:col-span-2 md:max-w-[347px]">
            <FormLabel className={fieldLabelClass}>Observação do colecionador (opcional)</FormLabel>
            <FormControl>
              <textarea rows={6} className={cn(textFieldClass, 'h-[150px] resize-none py-3')} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
