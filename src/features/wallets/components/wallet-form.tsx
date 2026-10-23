import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { type WalletRole } from '@/domain/wallet'
import { type WalletDto } from '@/shared/api/dtos/wallet'
import { isApiError } from '@/shared/api/errors'
import { EnsFormField, FormAlert, SelectFormField, TextFormField } from '@/shared/components/form-fields'
import { applyApiErrors } from '@/shared/lib/form-errors'
import { Button } from '@/shared/ui/button'
import { Form } from '@/shared/ui/form'
import { useSaveWallet } from '../queries'
import {
  NETWORK_OPTIONS,
  PROVIDER_OPTIONS,
  toWalletRequest,
  WALLET_FORM_FIELDS,
  type WalletFormValues,
  walletFormSchema,
} from '../schemas'

interface WalletFormProps {
  walletRole: WalletRole
  /** Registered wallet being edited; absent when adding a new one. */
  wallet: WalletDto | undefined
  /** Values to start from (the wallet itself, or a copy of the primary one). */
  values: WalletFormValues
  onSaved?: (wallet: WalletDto) => void
}

/** "Carteira principal/secundária" form of the wallets frame. */
export function WalletForm({ walletRole, wallet, values, onSaved }: WalletFormProps) {
  const save = useSaveWallet()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<WalletFormValues>({ resolver: zodResolver(walletFormSchema), defaultValues: values })

  // "Igual à carteira principal" swaps the starting values while the form is open.
  useEffect(() => {
    form.reset(values)
  }, [values, form])

  const submit = form.handleSubmit(async (input) => {
    setFormError(null)
    try {
      const saved = await save.mutateAsync({ id: wallet?.id, ...toWalletRequest(input, walletRole) })
      toast.success(walletRole === 'primary' ? 'Carteira principal salva.' : 'Carteira secundária salva.')
      onSaved?.(saved)
    } catch (error) {
      // "role" is not an input: a role conflict is reported for the whole form.
      const roleConflict = isApiError(error) ? error.fields?.role : undefined
      setFormError(roleConflict ?? applyApiErrors(error, form.setError, WALLET_FORM_FIELDS))
    }
  })

  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-6">
        <FormAlert message={formError} />
        <div className="grid grid-cols-1 gap-x-7 gap-y-6 md:grid-cols-2 md:gap-y-[24px]">
          <TextFormField control={form.control} name="displayName" label="Nome de exibição" autoComplete="name" />
          <TextFormField control={form.control} name="label" label="Apelido da carteira" />
          <SelectFormField
            control={form.control}
            name="network"
            label="Rede"
            placeholder="Selecione uma rede"
            options={NETWORK_OPTIONS}
          />
          <TextFormField control={form.control} name="profileName" label="Nome do perfil" />
          <TextFormField
            control={form.control}
            name="address"
            label="Endereço da carteira"
            placeholder="Endereço 0x da carteira"
            autoComplete="off"
          />
          <TextFormField
            control={form.control}
            name="secondaryAddress"
            label="ENS ou carteira secundária (opcional)"
            placeholder="ENS ou carteira secundária (opcional)"
            required={false}
            hideLabel
            className="md:pt-6"
          />
          <SelectFormField
            control={form.control}
            name="provider"
            label="Tipo de carteira"
            placeholder="Selecione uma carteira"
            options={PROVIDER_OPTIONS}
          />
          <TextFormField control={form.control} name="referralCode" label="Código de indicação" />
          <TextFormField control={form.control} name="email" label="E-mail" type="email" autoComplete="email" />
          <EnsFormField control={form.control} labelName="ensLabel" suffixName="ensSuffix" />
        </div>
        <Button
          type="submit"
          className="h-10 self-start px-2 max-md:h-[60px] max-md:w-full max-md:rounded-xl"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? 'Salvando…' : 'Salvar carteira'}
        </Button>
      </form>
    </Form>
  )
}
