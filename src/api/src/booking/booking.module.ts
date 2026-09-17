import { Module } from '@nestjs/common'
import { BookingController } from './booking.controller'
import { BookingService } from './booking.service'
import { PrismaModule } from '../prisma/prima.module'
import { BookingExpirationService } from './booking-expiration.service'
import { NotificationModule } from '../notification/notification.module'

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [BookingController],
  providers: [BookingService, BookingExpirationService],
})
export class BookingModule {}
