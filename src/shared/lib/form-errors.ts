import { type FieldPath, type FieldValues, type UseFormSetError } from 'react-hook-form'
import { isApiError } from '../api/errors'
import { describeError } from '../components/feedback-states'

/**
 * Maps API field errors (422/409 with `fields`) onto the form inputs, so each
 * message is announced next to its field. Anything else becomes a form error.
 * Returns the message to show at form level, if any.
 */
export function applyApiErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly FieldPath<T>[],
): string | null {
  if (isApiError(error) && error.fields) {
    let matched = false
    for (const [name, message] of Object.entries(error.fields)) {
      if ((fields as readonly string[]).includes(name)) {
        setError(name as FieldPath<T>, { type: 'server', message }, { shouldFocus: !matched })
        matched = true
      }
    }
    if (matched) return null
  }
  return describeError(error)
}
