// auth.contract.ts
import { initContract } from '@ts-rest/core'
import { z } from 'zod'
import {
  RegisterPublicSchema,
  RegisterSuccessSchema,
  VerifyEmailSchema,
  UserResponseSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  ChangePasswordSchema,
  OAuthGoogleSchema,
  OAuthFacebookSchema,
} from '../schema/user.schema'
import { withExceptionResponse } from './helpers'

const c = initContract()

/** Định nghĩa một lần — dùng cho client đầy đủ + tách public / cần Bearer */
const authRoutes = {
  register: {
    method: 'POST' as const,
    path: '/register',
    body: RegisterPublicSchema,
    responses: withExceptionResponse({
      201: RegisterSuccessSchema,
    }),
  },

  verifyEmail: {
    method: 'POST' as const,
    path: '/verify-email',
    body: VerifyEmailSchema,
    responses: withExceptionResponse({
      200: z.object({
        accessToken: z.string(),
        refreshToken: z.string(),
        jti: z.string(),
      }),
    }),
  },

  login: {
    method: 'POST' as const,
    path: '/login',
    body: LoginSchema,
    responses: withExceptionResponse({
      200: z.object({
        accessToken: z.string(),
        refreshToken: z.string(),
        jti: z.string(),
      }),
    }),
  },

  refreshToken: {
    method: 'POST' as const,
    path: '/refresh',
    body: z.object({
      refreshToken: z.string(),
    }),
    responses: withExceptionResponse({
      200: z.object({
        accessToken: z.string(),
        jti: z.string(),
      }),
    }),
  },

  forgotPassword: {
    method: 'POST' as const,
    path: '/forgot-password',
    body: ForgotPasswordSchema,
    responses: withExceptionResponse({
      200: z.object({ message: z.string() }),
    }),
  },

  resetPassword: {
    method: 'POST' as const,
    path: '/reset-password',
    body: ResetPasswordSchema,
    responses: withExceptionResponse({
      200: z.object({ message: z.string() }),
    }),
  },

  oauthGoogle: {
    method: 'POST' as const,
    path: '/oauth/google',
    body: OAuthGoogleSchema,
    responses: withExceptionResponse({
      200: z.object({
        accessToken: z.string(),
        refreshToken: z.string(),
        jti: z.string(),
      }),
    }),
  },

  oauthFacebook: {
    method: 'POST' as const,
    path: '/oauth/facebook',
    body: OAuthFacebookSchema,
    responses: withExceptionResponse({
      200: z.object({
        accessToken: z.string(),
        refreshToken: z.string(),
        jti: z.string(),
      }),
    }),
  },

  /** Cần header Authorization: Bearer <accessToken> — body `{}` */
  logout: {
    method: 'POST' as const,
    path: '/logout',
    body: z.object({}),
    responses: withExceptionResponse({
      200: z.object({
        message: z.string(),
      }),
    }),
  },

  me: {
    method: 'GET' as const,
    path: '/me',
    responses: withExceptionResponse({
      200: UserResponseSchema,
    }),
  },

  changePassword: {
    method: 'POST' as const,
    path: '/change-password',
    body: ChangePasswordSchema,
    responses: withExceptionResponse({
      200: z.object({ message: z.string() }),
    }),
  },
}

/** Handler công khai (không Bearer) — dùng trong AuthController.handler() */
export const authPublicContract = c.router({
  register: authRoutes.register,
  verifyEmail: authRoutes.verifyEmail,
  login: authRoutes.login,
  refreshToken: authRoutes.refreshToken,
  forgotPassword: authRoutes.forgotPassword,
  resetPassword: authRoutes.resetPassword,
  oauthGoogle: authRoutes.oauthGoogle,
  oauthFacebook: authRoutes.oauthFacebook,
})

/** me + logout — guard JWT trong controller */
export const authSessionContract = c.router({
  me: authRoutes.me,
  logout: authRoutes.logout,
  changePassword: authRoutes.changePassword,
})

/** Toàn bộ route auth (client / contract gốc) */
export const authContract = c.router(authRoutes)

const roleSchema = z.enum(['ADMIN', 'USER'])

const userSchema = z.object({
  id: z.number(),
  email: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BANNED']),
  role: roleSchema,
})

const getUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
})

const userListPaginatedSchema = z.object({
  items: z.array(userSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
})

export const userContract = c.router({
  getUsers:{
    method: 'GET',
    path: '',
    query: getUsersQuerySchema,
    responses: {
      200: z.union([z.array(userSchema), userListPaginatedSchema]),
    },
  },

  getUserById: {
    method: 'GET',
    path: '/:id',
    responses: {
      200: userSchema,
      404: z.object({ message: z.string() }),
    },
  },

  updateUser: {
    method: 'PATCH',
    path: '/:id',
    body: z.object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
    }),
    responses: {
      200: userSchema,
    },
  },

  deleteUser: {
    method: 'DELETE',
    path: '/:id',
    responses: {
      200: z.object({ success: z.boolean() }),
    },
  },
})
