import { type Control } from 'react-hook-form'
import { ENS_SUFFIXES } from '@/domain/account'
import { NETWORK_LABELS } from '@/features/catalog/labels'
import { PROVIDER_LABELS } from '@/features/wallets/queries'
import { networkSchema } from '@/shared/api/dtos/network'
import { type WalletDto, walletProviderSchema } from '@/shared/api/dtos/wallet'
import { SelectField, TextField, textFieldClass } from '@/shared/components/text-field'
import { cn } from '@/shared/lib/cn'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form'
import { type CheckoutFormValues } from '../schema'

const labelClass = 'text-[15px] leading-4 font-normal text-foreground'

function Required() {
  return (
    <span aria-hidden="true" className="ml-0.5 text-lg leading-none text-[#ff6b4a]">
      *
    </span>
  )
}

function TextInputField({
  control,
  name,
  label,
  required = true,
  placeholder,
  autoComplete,
  type = 'text',
}: {
  control: Control<CheckoutFormValues>
  name: 'displayName' | 'username' | 'profileName' | 'secondaryAddress' | 'referralCode' | 'email'
  label: string
  required?: boolean
  placeholder?: string
  autoComplete?: string
  type?: string
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="gap-2">
          <FormLabel className={cn(labelClass, !label && 'sr-only')}>
            {label || placeholder}
            {required && label ? <Required /> : null}
          </FormLabel>
          <FormControl>
            <TextField
              type={type}
              placeholder={placeholder}
              autoComplete={autoComplete}
              aria-required={required}
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

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
      <TextInputField control={control} name="displayName" label="Nome de exibição" autoComplete="name" />
      <TextInputField control={control} name="username" label="Nome de usuário" autoComplete="username" />
      <FormField
        control={control}
        name="network"
        render={({ field }) => (
          <FormItem className="gap-2">
            <FormLabel className={labelClass}>
              Rede <Required />
            </FormLabel>
            <FormControl>
              <SelectField aria-required {...field}>
                <option value="" disabled>
                  Selecione uma rede
                </option>
                {networkSchema.options.map((network) => (
                  <option key={network} value={network}>
                    {NETWORK_LABELS[network]}
                  </option>
                ))}
              </SelectField>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <TextInputField control={control} name="profileName" label="Nome do perfil" />
      <div className="flex flex-col gap-2">
        <label htmlFor="checkout-wallet-address" className={labelClass}>
          Endereço da carteira <Required />
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
      <div className="flex flex-col gap-2 md:pt-6">
        <TextInputField
          control={control}
          name="secondaryAddress"
          label=""
          required={false}
          placeholder="ENS ou carteira secundária (opcional)"
        />
      </div>
      <FormField
        control={control}
        name="provider"
        render={({ field }) => (
          <FormItem className="gap-2">
            <FormLabel className={labelClass}>
              Tipo de carteira <Required />
            </FormLabel>
            <FormControl>
              <SelectField aria-required {...field}>
                <option value="" disabled>
                  Selecione uma carteira
                </option>
                {walletProviderSchema.options.map((provider) => (
                  <option key={provider} value={provider}>
                    {PROVIDER_LABELS[provider]}
                  </option>
                ))}
              </SelectField>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <TextInputField control={control} name="referralCode" label="Código de indicação" />
      <TextInputField control={control} name="email" label="E-mail" type="email" autoComplete="email" />
      <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
        <legend className={cn(labelClass, 'mb-2')}>
          Nome ENS <Required />
        </legend>
        <div className="flex gap-2.5">
          <FormField
            control={control}
            name="ensSuffix"
            render={({ field }) => (
              <FormItem className="w-[78px] shrink-0">
                <FormLabel className="sr-only">Sufixo ENS</FormLabel>
                <FormControl>
                  <SelectField {...field} className="px-3">
                    {ENS_SUFFIXES.map((suffix) => (
                      <option key={suffix} value={suffix}>
                        {suffix}
                      </option>
                    ))}
                  </SelectField>
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="ensLabel"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel className="sr-only">Nome ENS</FormLabel>
                <FormControl>
                  <TextField placeholder="seu.nome" aria-required {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </fieldset>
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
            <FormLabel className={labelClass}>Observação do colecionador (opcional)</FormLabel>
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
