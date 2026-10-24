import { z } from 'zod'

/** Only same-app paths are accepted as post-login destinations (no open redirects). */
export const redirectSearchSchema = z.object({
  redirect: z
    .string()
    .refine((value) => value.startsWith('/') && !value.startsWith('//'))
    .optional()
    .catch(undefined),
})
export type RedirectSearch = z.infer<typeof redirectSearchSchema>
