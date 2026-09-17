import { Injectable, Logger } from '@nestjs/common'
import { Interval } from '@nestjs/schedule'
import { BookingService } from './booking.service'

@Injectable()
export class BookingExpirationService {
  private readonly log = new Logger(BookingExpirationService.name)

  constructor(private readonly bookingService: BookingService) {}

  @Interval(60_000)
  async bookingMaintenanceJob() {
    const expired = await this.bookingService.expirePendingBookings()
    if (expired.expiredCount > 0) {
      this.log.log(
        `Auto-cancelled ${expired.expiredCount}/${expired.scanned} expired pending bookings`,
      )
    }

    const completed =
      await this.bookingService.autoCompleteBookingsAfterDeparture()
    if (completed.completedCount > 0) {
      this.log.log(
        `Auto-completed ${completed.completedCount}/${completed.scanned} bookings after departure time`,
      )
    }
  }
}

