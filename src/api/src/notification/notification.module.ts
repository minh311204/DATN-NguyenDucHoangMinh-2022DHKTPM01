import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PrismaModule } from '../prisma/prima.module'
import { NotificationController } from './notification.controller'
import { NotificationService } from './notification.service'
import { NotificationGateway } from './notification.gateway'

const jwtSecret = process.env.JWT_SECRET
if (!jwtSecret) {
  throw new Error('JWT_SECRET is required')
}

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: jwtSecret,
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [NotificationController],
  providers: [NotificationGateway, NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
