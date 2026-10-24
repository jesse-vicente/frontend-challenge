import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { type ProfileDto } from '@/shared/api/dtos/profile'
import { ErrorState } from '@/shared/components/feedback-states'
import { EnsFormField, FormAlert, PasswordFormField, TextFormField } from '@/shared/components/form-fields'
import { applyApiErrors } from '@/shared/lib/form-errors'
import { useCacheOwner } from '@/shared/session/cache-owner'
import { Button } from '@/shared/ui/button'
import { Form } from '@/shared/ui/form'
import { profileQuery, useChangePassword, useUpdateProfile } from '../queries'
import {
  emptyPasswordFields,
  PROFILE_FORM_FIELDS,
  type ProfilePageValues,
  profileFormValues,
  profilePageSchema,
  toUpdateProfileRequest,
  wantsPasswordChange,
} from '../schemas'
import { AccountLayout, useProfileSection } from './account-layout'
import { AvatarField } from './avatar-field'
import { FavoritesSection } from './favorites-section'

function ProfileForm({ profile }: { profile: ProfileDto }) {
  const updateProfile = useUpdateProfile()
  const changePassword = useChangePassword()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<ProfilePageValues>({
    resolver: zodResolver(profilePageSchema),
    defaultValues: { ...profileFormValues(profile), ...emptyPasswordFields },
  })

  const submit = form.handleSubmit(async (values) => {
    setFormError(null)
    let saved: ProfileDto
    try {
      saved = await updateProfile.mutateAsync(toUpdateProfileRequest(values))
    } catch (error) {
      setFormError(applyApiErrors(error, form.setError, PROFILE_FORM_FIELDS))
      return
    }
    if (wantsPasswordChange(values)) {
      try {
        await changePassword.mutateAsync({ currentPassword: values.currentPassword, newPassword: values.newPassword })
      } catch (error) {
        // Profile data is already saved; keep the password block for another try.
        form.reset({ ...values, ...profileFormValues(saved) }, { keepErrors: true })
        setFormError(applyApiErrors(error, form.setError, ['currentPassword', 'newPassword']))
        return
      }
    }
    form.reset({ ...profileFormValues(saved), ...emptyPasswordFields })
    toast.success(wantsPasswordChange(values) ? 'Perfil e senha atualizados.' : 'Perfil atualizado.')
  })

  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate aria-labelledby="profile-title" className="flex flex-col">
        <h1 id="profile-title" className="mb-[38px] text-base font-bold text-foreground max-md:sr-only md:mt-1">
          Perfil do colecionador
        </h1>
        <FormAlert message={formError} />
        <div className="grid grid-cols-1 gap-x-7 gap-y-6 md:gap-y-[38px] lg:grid-cols-2">
          <TextFormField control={form.control} name="displayName" label="Nome de exibição" autoComplete="name" />
          <TextFormField control={form.control} name="username" label="Nome de usuário" autoComplete="username" />
          <TextFormField control={form.control} name="email" label="E-mail" type="email" autoComplete="email" />
          <EnsFormField control={form.control} labelName="ensLabel" suffixName="ensSuffix" />
          <TextFormField control={form.control} name="walletNickname" label="Apelido da carteira" />
          <AvatarField profile={profile} />
        </div>

        <fieldset className="m-0 mt-10 flex min-w-0 flex-col gap-6 border-0 p-0 md:max-w-[417px] md:gap-[18px]">
          <legend className="mb-6 text-base font-bold text-foreground md:mb-[18px]">Alterar senha</legend>
          <PasswordFormField
            control={form.control}
            name="currentPassword"
            label="Senha atual"
            autoComplete="current-password"
          />
          <PasswordFormField control={form.control} name="newPassword" label="Nova senha" autoComplete="new-password" />
          <PasswordFormField
            control={form.control}
            name="confirmPassword"
            label="Confirmar nova senha"
            autoComplete="new-password"
          />
        </fieldset>

        <Button
          type="submit"
          className="mt-8 h-10 w-[131px] max-md:h-[60px] max-md:w-full max-md:rounded-xl"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? 'Salvando…' : 'Salvar'}
        </Button>
      </form>
    </Form>
  )
}

export function ProfileView() {
  const owner = useCacheOwner()
  const profile = useQuery(profileQuery(owner))
  const section = useProfileSection()

  return (
    <AccountLayout current={section} title="Meu perfil">
      {profile.isPending ? (
        <div aria-busy="true" className="skeleton h-[640px] rounded-lg" />
      ) : profile.isError ? (
        <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />
      ) : (
        <ProfileForm profile={profile.data} />
      )}
      <FavoritesSection />
    </AccountLayout>
  )
}
