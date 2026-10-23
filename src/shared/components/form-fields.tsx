import { type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { ENS_SUFFIXES } from '@/domain/account'
import { cn } from '../lib/cn'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form'
import { PasswordField, SelectField, TextField } from './text-field'

/** Labels of the account forms (payment, profile, wallets). */
export const fieldLabelClass = 'gap-0 text-[15px] leading-4 font-normal text-foreground'

export function RequiredMark() {
  return (
    <span aria-hidden="true" className="ml-0.5 text-lg leading-none text-[#ff6b4a]">
      *
    </span>
  )
}

interface FieldProps<T extends FieldValues> {
  control: Control<T>
  name: FieldPath<T>
  label: string
  required?: boolean
  className?: string
}

/** Labeled text input; without a visible label (placeholder-only layouts) the label stays for screen readers. */
export function TextFormField<T extends FieldValues>({
  control,
  name,
  label,
  required = true,
  className,
  placeholder,
  autoComplete,
  type = 'text',
  hideLabel = false,
}: FieldProps<T> & { placeholder?: string; autoComplete?: string; type?: string; hideLabel?: boolean }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn('gap-2', className)}>
          <FormLabel className={cn(fieldLabelClass, hideLabel && 'sr-only')}>
            {label}
            {required && !hideLabel ? <RequiredMark /> : null}
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

export function PasswordFormField<T extends FieldValues>({
  control,
  name,
  label,
  className,
  autoComplete,
}: FieldProps<T> & { autoComplete: 'current-password' | 'new-password' }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn('gap-2', className)}>
          <FormLabel className={fieldLabelClass}>{label}</FormLabel>
          <FormControl>
            <PasswordField autoComplete={autoComplete} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

/** Native select with a disabled placeholder option, as in the layout dropdowns. */
export function SelectFormField<T extends FieldValues>({
  control,
  name,
  label,
  required = true,
  className,
  placeholder,
  options,
}: FieldProps<T> & { placeholder: string; options: readonly { value: string; label: string }[] }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn('gap-2', className)}>
          <FormLabel className={fieldLabelClass}>
            {label}
            {required ? <RequiredMark /> : null}
          </FormLabel>
          <FormControl>
            <SelectField aria-required={required} {...field}>
              <option value="" disabled>
                {placeholder}
              </option>
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

/** "Nome ENS": suffix dropdown (.eth) followed by the name input. */
export function EnsFormField<T extends FieldValues>({
  control,
  labelName,
  suffixName,
}: {
  control: Control<T>
  labelName: FieldPath<T>
  suffixName: FieldPath<T>
}) {
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
      <legend className={cn(fieldLabelClass, 'mb-2')}>
        Nome ENS
        <RequiredMark />
      </legend>
      <div className="flex gap-2.5">
        <FormField
          control={control}
          name={suffixName}
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
          name={labelName}
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
  )
}

/** Form-level error (API failures that are not tied to a field). */
export function FormAlert({ message }: { message: string | null }) {
  return message ? (
    <p
      role="alert"
      className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {message}
    </p>
  ) : null
}
