import { z } from 'zod'

export const networkSchema = z.enum(['ethereum', 'polygon', 'solana'])
export type Network = z.infer<typeof networkSchema>
