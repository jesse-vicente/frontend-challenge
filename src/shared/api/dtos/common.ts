import { z } from 'zod'
import { isEthAmount } from '@/domain/money'

export const idSchema = z.string().min(1)

/** ETH amounts always travel as decimal strings. */
export const ethAmountSchema = z.string().refine(isEthAmount, { message: 'Invalid ETH amount' })

export const isoDateTimeSchema = z.iso.datetime({ offset: true })

export const imageSchema = z.object({
  url: z.string().min(1),
  alt: z.string(),
  width: z.int().positive(),
  height: z.int().positive(),
})
export type ImageDto = z.infer<typeof imageSchema>

export function paginatedSchema<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    page: z.int().min(1),
    pageSize: z.int().min(1),
    total: z.int().min(0),
    totalPages: z.int().min(0),
  })
}

export interface Paginated<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}
