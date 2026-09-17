import { Controller, UnauthorizedException, UseGuards } from '@nestjs/common'
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest'
import {
  authPublicContract,
  authSessionContract,
} from '../../../shared/contracts/user.contract'
import { AuthService } from './auth.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @TsRestHandler(authPublicContract)
  handler() {
    return tsRestHandler(authPublicContract, {
      register: async ({ body }) => {
        const result = await this.authService.register(body)

        return {
          status: 201,
          body: result,
        }
      },

      verifyEmail: async ({ body }) => {
        const result = await this.authService.verifyEmail(body.token)
        return { status: 200, body: result }
      },

      login: async ({ body }) => {
        const result = await this.authService.Login(body)

        return {
          status: 200,
          body: result,
        }
      },

      refreshToken: async ({ body }) => {
        const result = await this.authService.refreshToken(body.refreshToken)

        return {
          status: 200,
          body: result,
        }
      },

      forgotPassword: async ({ body }) => {
        const result = await this.authService.requestPasswordReset(body.email)
        return { status: 200, body: result }
      },

      resetPassword: async ({ body }) => {
        const result = await this.authService.resetPasswordWithToken(
          body.token,
          body.password,
        )
        return { status: 200, body: result }
      },

      oauthGoogle: async ({ body }) => {
        const result = await this.authService.loginWithGoogle(body.idToken)
        return { status: 200, body: result }
      },

      oauthFacebook: async ({ body }) => {
        const result = await this.authService.loginWithFacebook(body.accessToken)
        return { status: 200, body: result }
      },
    })
  }

  @TsRestHandler(authSessionContract.me)
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: { id: number }) {
    return async () => {
      const result = await this.authService.me(user.id)
      return { status: 200, body: result }
    }
  }

  @TsRestHandler(authSessionContract.logout)
  @UseGuards(JwtAuthGuard)
  logout(@CurrentUser() user: { id: number; jti?: string }) {
    return async () => {
      if (!user.jti) {
        throw new UnauthorizedException()
      }
      const result = await this.authService.logout(user.id, user.jti)
      return { status: 200, body: result }
    }
  }

  @TsRestHandler(authSessionContract.changePassword)
  @UseGuards(JwtAuthGuard)
  changePassword(@CurrentUser() user: { id: number }) {
    return async ({
      body,
    }: {
      body: { currentPassword?: string; newPassword: string }
    }) => {
      const result = await this.authService.changePassword(
        user.id,
        body.currentPassword,
        body.newPassword,
      )
      return { status: 200, body: result }
    }
  }
}
