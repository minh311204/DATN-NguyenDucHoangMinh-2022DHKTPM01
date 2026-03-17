import { z } from 'zod'

export const ExceptionSchema = z.object({
  message: z.string(),
  error: z.string().optional(),
  statusCode: z.number()
})