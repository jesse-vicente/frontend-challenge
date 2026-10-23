import { z } from 'zod'

export const networkSchema = z.enum(['ethereum', 'polygon', 'arbitrum'])
export type Network = z.infer<typeof networkSchema>
