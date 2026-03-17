import { z } from 'zod'

export const CreateUserSchema = z.object({
  email: z.string(),
  password: z.string(),
  name: z.string().min(1),
  role: z.enum(['ADMIN', 'USER']).optional()
})

export type CreateUserRequest = z.infer<typeof CreateUserSchema>


export const UpdateUserSchema = z.object({
  name: z.string().optional(),
  role: z.enum(['ADMIN', 'USER']).optional()
})

export type UpdateUserRequest = z.infer<typeof UpdateUserSchema>

export const UserResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: z.string(),
  createdAt: z.date()
})

export type UserResponse = z.infer<typeof UserResponseSchema>