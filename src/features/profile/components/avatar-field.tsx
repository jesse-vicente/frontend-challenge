import { ImagePlus } from 'lucide-react'
import { type ChangeEvent, useId, useRef, useState } from 'react'
import { AVATAR_MAX_BYTES, AVATAR_MIME_TYPES, type ProfileDto } from '@/shared/api/dtos/profile'
import { isApiError } from '@/shared/api/errors'
import { describeError } from '@/shared/components/feedback-states'
import { fieldLabelClass } from '@/shared/components/form-fields'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { useRemoveAvatar, useUploadAvatar } from '../queries'

function checkFile(file: File): string | null {
  if (!(AVATAR_MIME_TYPES as readonly string[]).includes(file.type)) return 'Use uma imagem PNG, JPG ou WebP.'
  if (file.size > AVATAR_MAX_BYTES) return 'A imagem deve ter no máximo 1 MB.'
  return null
}

/** "Avatar": preview circle, "Alterar" (file picker) and "Remover". Saved immediately, apart from "Salvar". */
export function AvatarField({ profile }: { profile: ProfileDto }) {
  const upload = useUploadAvatar()
  const remove = useRemoveAvatar()
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const errorId = useId()
  const busy = upload.isPending || remove.isPending

  const onPick = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const problem = checkFile(file)
    setError(problem)
    if (problem) return
    upload.mutate(file, {
      onError: (cause) =>
        setError(isApiError(cause) && cause.fields?.avatar ? cause.fields.avatar : describeError(cause)),
    })
  }

  return (
    <fieldset aria-describedby={error ? errorId : undefined} className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
      <legend className={cn(fieldLabelClass, 'mb-2')}>Avatar</legend>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <span className="grid size-[50px] shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-surface text-amber">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="Avatar atual" className="size-full object-cover" />
          ) : (
            <ImagePlus aria-hidden="true" strokeWidth={1.5} className="size-5" />
          )}
        </span>
        <input
          ref={input}
          type="file"
          accept={AVATAR_MIME_TYPES.join(',')}
          onChange={onPick}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
        <Button type="button" className="h-10 w-[98px]" disabled={busy} onClick={() => input.current?.click()}>
          {upload.isPending ? 'Enviando…' : 'Alterar'}
        </Button>
        <button
          type="button"
          disabled={busy || !profile.avatarUrl}
          onClick={() => {
            setError(null)
            remove.mutate(undefined, { onError: (cause) => setError(describeError(cause)) })
          }}
          className="text-sm text-foreground hover:text-amber disabled:cursor-not-allowed disabled:opacity-50"
        >
          Remover
        </button>
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </fieldset>
  )
}
