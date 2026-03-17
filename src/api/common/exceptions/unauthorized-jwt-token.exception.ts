import { UnauthorizedException } from '@nestjs/common'

export class UnauthorizedJwtTokenException extends UnauthorizedException {
  constructor() {
    super('Invalid or expired JWT token')
  }
}