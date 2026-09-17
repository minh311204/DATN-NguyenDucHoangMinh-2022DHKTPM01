import { z } from 'zod'

function normalizeVnPhoneInput(s: string): string {
  let p = s.replace(/\s/g, '')
  if (p.startsWith('+84')) p = `0${p.slice(3)}`
  else if (p.startsWith('84') && p.length >= 10) p = `0${p.slice(2)}`
  return p
}

const vnPhoneSchema = z
  .string()
  .min(9)
  .max(20)
  .transform((s) => normalizeVnPhoneInput(s))
  .refine((phone) => /^0[0-9]{9,10}$/.test(phone), {
    message: 'Số điện thoại không hợp lệ',
  })

/** Đăng ký công khai — luôn tạo USER (không cho client chọn ADMIN). */
export const RegisterPublicSchema = z
  .object({
    email: z.string().email(),
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    phone: vnPhoneSchema,
    password: z.string().min(8),
    passwordConfirm: z.string().min(8),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['passwordConfirm'],
  })

export type RegisterPublicRequest = z.infer<typeof RegisterPublicSchema>

export const RegisterSuccessSchema = z.object({
  message: z.string(),
  email: z.string().email(),
})

export type RegisterSuccessResponse = z.infer<typeof RegisterSuccessSchema>

export const VerifyEmailSchema = z.object({
  token: z.string().min(1),
})

/** @deprecated dùng RegisterPublicSchema cho API register */
export const CreateUserSchema = RegisterPublicSchema

export type CreateUserRequest = z.infer<typeof CreateUserSchema>


export const UpdateUserSchema = z.object({
  name: z.string().optional(),
  role: z.enum(['ADMIN', 'USER']).optional()
})

export type UpdateUserRequest = z.infer<typeof UpdateUserSchema>

export const UserResponseSchema = z.object({
  id: z.number(),
  email: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  phone: z.string().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BANNED']),
  role: z.enum(['ADMIN', 'USER']),
  hasPassword: z.boolean(),
})

export type UserResponse = z.infer<typeof UserResponseSchema>

// auth 
export const LoginSchema = z.object({
  email: z.string(),
  password: z.string(),
  rememberMe: z.boolean().optional()
})

export type LoginRequest = z.infer<typeof LoginSchema>

export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
})

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
})

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1).optional(),
  newPassword: z.string().min(8),
})

export const OAuthGoogleSchema = z.object({
  idToken: z.string().min(1),
})

export const OAuthFacebookSchema = z.object({
  accessToken: z.string().min(1),
})

