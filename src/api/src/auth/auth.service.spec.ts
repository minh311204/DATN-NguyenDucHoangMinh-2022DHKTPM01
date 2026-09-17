import { UnauthorizedException } from '@nestjs/common'
import { AuthService } from './auth.service'

describe('AuthService', () => {
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
    refreshToken: {
      findUnique: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    blacklistedAccessToken: {
      create: jest.fn(),
    },
  } as any

  const mockJwt = {
    signAsync: jest.fn(),
  } as any

  const mockMail = {
    sendEmailVerificationEmail: jest.fn(),
  } as any

  let service: AuthService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new AuthService(mockPrisma, mockJwt, mockMail)
  })

  it('rejects refresh token for non-active users', async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      userId: 100,
      accessTokenJti: 'old-jti',
      expiredDateTimeUtc: new Date(Date.now() + 60_000),
    })
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 100,
      email: 'demo@test.dev',
      status: 'BANNED',
    })

    await expect(service.refreshToken('refresh-token')).rejects.toThrow(
      UnauthorizedException,
    )
    expect(mockJwt.signAsync).not.toHaveBeenCalled()
  })

  it('blacklists access token for about one day on logout', async () => {
    mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 })
    mockPrisma.blacklistedAccessToken.create.mockResolvedValue({ id: 1 })

    const before = Date.now()
    await service.logout(7, 'jti-123')

    expect(mockPrisma.blacklistedAccessToken.create).toHaveBeenCalledTimes(1)
    const arg = mockPrisma.blacklistedAccessToken.create.mock.calls[0][0]
    const expiry = new Date(arg.data.expiredDateTimeUtc).getTime()
    const diffMs = expiry - before

    expect(diffMs).toBeGreaterThan(23 * 60 * 60 * 1000)
    expect(diffMs).toBeLessThan(25 * 60 * 60 * 1000)
  })
})
