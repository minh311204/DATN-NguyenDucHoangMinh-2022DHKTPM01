import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prima.service'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { randomUUID, randomBytes } from 'node:crypto'
import dayjs from 'dayjs'
import { OAuth2Client } from 'google-auth-library'
import { OAuthProvider } from '@prisma/client'
import type { RegisterPublicRequest } from '../../../shared/schema/user.schema'
import { MailService } from '../payment/mail.service'

const ACCESS_TOKEN_BLACKLIST_TTL_DAYS = 1

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private mail: MailService,
  ) {}

  private async issueAuthTokens(user: { id: number; email: string }) {
    const jti = randomUUID()
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      jti,
    })
    const refreshToken = randomBytes(64).toString('hex')
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        refreshToken,
        accessTokenJti: jti,
        expiredDateTimeUtc: dayjs().add(7, 'days').toDate(),
      },
    })
    return { accessToken, refreshToken, jti }
  }

  /** Đăng ký công khai — luôn là USER; kích hoạt sau khi xác nhận email. */
  async register(body: RegisterPublicRequest) {
    const { email, firstName, lastName, phone, password } = body

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      throw new ConflictException('Email đã được đăng ký')
    }

    const existingPhone = await this.prisma.user.findFirst({
      where: { phone },
    })
    if (existingPhone) {
      throw new ConflictException('Số điện thoại đã được sử dụng')
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const user = await this.prisma.user.create({
      data: {
        email,
        phone,
        passwordHash,
        firstName,
        lastName,
        status: 'INACTIVE',
        emailVerified: false,
        role: 'USER',
        hasPassword: true,
      },
    })

    await this.prisma.emailVerificationToken.deleteMany({
      where: { userId: user.id },
    })

    const token = randomBytes(32).toString('hex')

    await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token,
        expiredDateTimeUtc: dayjs().add(24, 'hour').toDate(),
      },
    })

    const base = process.env.USER_APP_PUBLIC_URL || 'http://localhost:3000'
    const verifyUrl = `${base.replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(token)}`

    await this.mail.sendEmailVerificationEmail(user.email, verifyUrl)

    return {
      message:
        'Đã gửi email xác nhận. Vui lòng kiểm tra hộp thư và nhấn liên kết để kích hoạt tài khoản.',
      email: user.email,
    }
  }

  async verifyEmail(token: string) {
    const row = await this.prisma.emailVerificationToken.findUnique({
      where: { token },
    })

    if (!row || row.expiredDateTimeUtc < new Date()) {
      throw new BadRequestException(
        'Liên kết xác nhận không hợp lệ hoặc đã hết hạn.',
      )
    }

    const user = await this.prisma.user.findUnique({
      where: { id: row.userId },
    })

    if (!user) {
      throw new BadRequestException('Liên kết xác nhận không hợp lệ.')
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          status: 'ACTIVE',
          emailVerified: true,
          emailVerifiedAtUtc: new Date(),
        },
      }),
      this.prisma.emailVerificationToken.deleteMany({
        where: { userId: user.id },
      }),
    ])

    const updated = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    })

    return this.issueAuthTokens(updated)
  }

  async Login({
    email,
    password,
  }: {
    email?: string
    password: string
  }) {
    const user = await this.prisma.user.findUnique({
      where: { email: email },
    })

    if (!user) throw new UnauthorizedException('Sai email hoặc mật khẩu')

    if (user.status === 'BANNED') {
      throw new UnauthorizedException('Account is suspended')
    }

    if (!user.hasPassword) {
      throw new UnauthorizedException(
        'Tài khoản chỉ đăng nhập Google/Facebook. Hãy đăng nhập bằng SSO hoặc đặt mật khẩu qua quên mật khẩu.',
      )
    }

    const valid = await bcrypt.compare(password, user.passwordHash)

    if (!valid) throw new UnauthorizedException('Sai email hoặc mật khẩu')

    if (!user.emailVerified) {
      throw new UnauthorizedException(
        'Vui lòng xác nhận email trước khi đăng nhập.',
      )
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Tài khoản chưa được kích hoạt.')
    }

    return this.issueAuthTokens(user)
  }

  async refreshToken(refreshToken: string) {
    const token = await this.prisma.refreshToken.findUnique({
      where: { refreshToken },
    })

    if (!token) {
      throw new UnauthorizedException()
    }

    if (token.expiredDateTimeUtc < new Date()) {
      throw new UnauthorizedException()
    }

    const user = await this.prisma.user.findUnique({
      where: { id: token.userId },
    })

    if (!user) {
      throw new UnauthorizedException()
    }

    if (user.status !== 'ACTIVE' || !user.emailVerified) {
      throw new UnauthorizedException('Account is suspended')
    }

    const jti = randomUUID()

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      jti,
    })

    await this.prisma.blacklistedAccessToken.create({
      data: {
        userId: user.id,
        jti: token.accessTokenJti,
        expiredDateTimeUtc: dayjs()
          .add(ACCESS_TOKEN_BLACKLIST_TTL_DAYS, 'day')
          .toDate(),
      },
    })

    await this.prisma.refreshToken.update({
      where: { id: token.id },
      data: {
        accessTokenJti: jti,
      },
    })

    return {
      accessToken,
      jti,
    }
  }

  async logout(userId: number, jti: string) {
    await this.prisma.blacklistedAccessToken.create({
      data: {
        userId,
        jti,
        expiredDateTimeUtc: dayjs()
          .add(ACCESS_TOKEN_BLACKLIST_TTL_DAYS, 'day')
          .toDate(),
      },
    })

    await this.prisma.refreshToken.deleteMany({
      where: {
        userId,
      },
    })

    return {
      message: 'Logged out successfully',
    }
  }

  async me(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) throw new UnauthorizedException()

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      status: user.status,
      role: user.role,
      hasPassword: user.hasPassword,
    }
  }

  async changePassword(
    userId: number,
    currentPassword: string | undefined,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new UnauthorizedException()

    if (user.hasPassword) {
      if (!currentPassword?.length) {
        throw new BadRequestException('Vui lòng nhập mật khẩu hiện tại')
      }
      const ok = await bcrypt.compare(currentPassword, user.passwordHash)
      if (!ok) {
        throw new BadRequestException('Mật khẩu hiện tại không đúng')
      }
    }

    const passwordHash = await bcrypt.hash(newPassword, 10)
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, hasPassword: true },
    })

    await this.prisma.refreshToken.deleteMany({ where: { userId } })

    return {
      message:
        'Đã cập nhật mật khẩu. Phiên đăng nhập khác đã được đăng xuất; vui lòng đăng nhập lại nếu cần.',
    }
  }

  async loginWithGoogle(idToken: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID
    if (!clientId) {
      throw new BadRequestException('Google OAuth chưa được cấu hình (GOOGLE_CLIENT_ID)')
    }

    const client = new OAuth2Client(clientId)
    const ticket = await client.verifyIdToken({
      idToken,
      audience: clientId,
    })
    const payload = ticket.getPayload()
    if (!payload?.sub || !payload.email) {
      throw new UnauthorizedException('Token Google không hợp lệ hoặc thiếu email')
    }

    return this.upsertOAuthUser({
      provider: OAuthProvider.GOOGLE,
      providerUserId: payload.sub,
      email: payload.email,
      firstName: payload.given_name ?? null,
      lastName: payload.family_name ?? null,
    })
  }

  async loginWithFacebook(accessToken: string) {
    const appId = process.env.FACEBOOK_APP_ID
    const appSecret = process.env.FACEBOOK_APP_SECRET
    if (!appId || !appSecret) {
      throw new BadRequestException(
        'Facebook OAuth chưa được cấu hình (FACEBOOK_APP_ID / FACEBOOK_APP_SECRET)',
      )
    }

    const debugUrl =
      `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(accessToken)}` +
      `&access_token=${encodeURIComponent(`${appId}|${appSecret}`)}`

    const debugRes = await fetch(debugUrl)
    const debugJson = (await debugRes.json()) as {
      data?: { app_id?: string; is_valid?: boolean; user_id?: string }
    }
    const d = debugJson.data
    if (!d?.is_valid || String(d.app_id) !== String(appId)) {
      throw new UnauthorizedException('Token Facebook không hợp lệ')
    }

    const meUrl =
      `https://graph.facebook.com/me?fields=id,email,first_name,last_name` +
      `&access_token=${encodeURIComponent(accessToken)}`
    const meRes = await fetch(meUrl)
    const me = (await meRes.json()) as {
      id?: string
      email?: string
      first_name?: string
      last_name?: string
      error?: { message?: string }
    }

    if (me.error) {
      throw new BadRequestException(me.error.message ?? 'Facebook API lỗi')
    }
    if (!me.id || !me.email) {
      throw new BadRequestException(
        'Facebook không trả email. Hãy cấp quyền email khi đăng nhập.',
      )
    }

    return this.upsertOAuthUser({
      provider: OAuthProvider.FACEBOOK,
      providerUserId: me.id,
      email: me.email,
      firstName: me.first_name ?? null,
      lastName: me.last_name ?? null,
    })
  }

  private async upsertOAuthUser({
    provider,
    providerUserId,
    email,
    firstName,
    lastName,
  }: {
    provider: OAuthProvider
    providerUserId: string
    email: string
    firstName: string | null
    lastName: string | null
  }) {
    const linked = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerUserId: { provider, providerUserId },
      },
      include: { user: true },
    })

    if (linked) {
      if (linked.user.status === 'BANNED') {
        throw new UnauthorizedException('Account is suspended')
      }
      if (linked.user.status !== 'ACTIVE') {
        throw new UnauthorizedException('Account is not active')
      }
      return this.issueAuthTokens(linked.user)
    }

    const existingEmail = await this.prisma.user.findUnique({
      where: { email },
    })

    if (existingEmail) {
      if (existingEmail.status === 'BANNED') {
        throw new UnauthorizedException('Account is suspended')
      }
      if (existingEmail.status !== 'ACTIVE') {
        throw new UnauthorizedException('Account is not active')
      }
      await this.prisma.oAuthAccount.create({
        data: {
          userId: existingEmail.id,
          provider,
          providerUserId,
        },
      })
      return this.issueAuthTokens(existingEmail)
    }

    const randomPw = randomBytes(48).toString('hex')
    const passwordHash = await bcrypt.hash(randomPw, 10)

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        status: 'ACTIVE',
        emailVerified: true,
        role: 'USER',
        hasPassword: false,
        oauthAccounts: {
          create: {
            provider,
            providerUserId,
          },
        },
      },
    })

    return this.issueAuthTokens(user)
  }

  /**
   * Luôn trả cùng một message (tránh lộ email có tồn tại hay không).
   * Token in ra console (thay email gửi thật khi có SMTP).
   */
  async requestPasswordReset(email: string) {
    const generic = {
      message:
        'Nếu email tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.',
    }

    const user = await this.prisma.user.findUnique({ where: { email } })
    if (!user) {
      return generic
    }

    await this.prisma.resetPasswordToken.deleteMany({
      where: { userId: user.id },
    })

    const token = randomBytes(32).toString('hex')

    await this.prisma.resetPasswordToken.create({
      data: {
        userId: user.id,
        token,
        expiredDateTimeUtc: dayjs().add(1, 'hour').toDate(),
      },
    })

    const base = process.env.USER_APP_PUBLIC_URL || 'http://localhost:3000'
    const resetUrl = `${base.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`

    await this.mail.sendPasswordResetEmail(user.email, resetUrl)

    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `[auth] Password reset token for ${email}: ${token} (expires in 1h)`,
      )
    }

    return generic
  }

  async resetPasswordWithToken(token: string, newPassword: string) {
    const row = await this.prisma.resetPasswordToken.findUnique({
      where: { token },
    })

    if (!row || row.expiredDateTimeUtc < new Date()) {
      throw new BadRequestException('Invalid or expired reset token')
    }

    const passwordHash = await bcrypt.hash(newPassword, 10)

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: row.userId },
        data: { passwordHash, hasPassword: true },
      }),
      this.prisma.resetPasswordToken.delete({
        where: { id: row.id },
      }),
    ])

    await this.prisma.refreshToken.deleteMany({
      where: { userId: row.userId },
    })

    return { message: 'Đã đặt lại mật khẩu. Vui lòng đăng nhập lại.' }
  }
}
