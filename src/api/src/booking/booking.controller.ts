import { Controller, UseGuards } from '@nestjs/common'
import { TsRestHandler } from '@ts-rest/nest'
import { bookingContract } from '../../../shared/contracts/booking.contract'
import { BookingService } from './booking.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'

/**
 * Thứ tự route: segment tĩnh (`/me`, `/admin/...`, `/by-tour/...`) trước `/:id`
 * để không bị nuốt nhầm (vd. `by-tour` thành id).
 */
@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @TsRestHandler(bookingContract.getMyBookings)
  @UseGuards(JwtAuthGuard)
  getMyBookings(@CurrentUser() user: { id: number }) {
    return async () => {
      const body = await this.bookingService.getMyBookings(user.id)
      return { status: 200, body }
    }
  }

  @TsRestHandler(bookingContract.getAdminTourSchedulesOverview)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getAdminTourSchedulesOverview() {
    return async ({ query }: { query: Record<string, unknown> }) => {
      const body = await this.bookingService.getAdminTourSchedulesOverview(
        query as any,
      )
      return { status: 200, body }
    }
  }

  @TsRestHandler(bookingContract.getBookingsByTour)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getBookingsByTour() {
    return async ({ params }: { params: { tourId: string } }) => {
      const body = await this.bookingService.getBookingsGroupedByTour(
        Number(params.tourId),
      )
      return { status: 200, body }
    }
  }

  @TsRestHandler(bookingContract.getBookings)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getBookings() {
    return async ({ query }: { query: Record<string, unknown> }) => {
      const body = await this.bookingService.getBookings(query as any)
      return { status: 200, body }
    }
  }

  @TsRestHandler(bookingContract.previewPromo)
  previewPromo() {
    return async ({ body }: { body: Record<string, unknown> }) => {
      const result = await this.bookingService.previewPromo(body as any)
      return { status: 200, body: result }
    }
  }

  @TsRestHandler(bookingContract.createBooking)
  @UseGuards(OptionalJwtAuthGuard)
  createBooking(@CurrentUser() user?: { id: number }) {
    return async ({ body }: { body: any }) => {
      const result = await this.bookingService.createBooking(user?.id ?? null, body)
      return { status: 201, body: result }
    }
  }

  @TsRestHandler(bookingContract.cancelMyBooking)
  @UseGuards(JwtAuthGuard)
  cancelMyBooking(@CurrentUser() user: { id: number }) {
    return async ({ params }: { params: { id: string } }) => {
      const body = await this.bookingService.cancelMyBooking(
        Number(params.id),
        user.id,
      )
      return { status: 200, body }
    }
  }

  @TsRestHandler(bookingContract.approveBookingCancellation)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  approveBookingCancellation() {
    return async ({ params }: { params: { id: string } }) => {
      const body = await this.bookingService.approveBookingCancellation(
        Number(params.id),
      )
      return { status: 200, body }
    }
  }

  @TsRestHandler(bookingContract.rejectBookingCancellation)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  rejectBookingCancellation() {
    return async ({
      params,
      body,
    }: {
      params: { id: string }
      body: Record<string, unknown>
    }) => {
      const result = await this.bookingService.rejectBookingCancellation(
        Number(params.id),
        body as any,
      )
      return { status: 200, body: result }
    }
  }

  @TsRestHandler(bookingContract.updateBookingStatus)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  updateBookingStatus() {
    return async ({ params, body }: { params: { id: string }; body: any }) => {
      const result = await this.bookingService.updateBookingStatus(
        Number(params.id),
        body,
      )
      return { status: 200, body: result }
    }
  }

  @TsRestHandler(bookingContract.getBookingById)
  @UseGuards(JwtAuthGuard)
  getBookingById(@CurrentUser() user: { id: number; role: string }) {
    return async ({ params }: { params: { id: string } }) => {
      const body = await this.bookingService.getBookingById(Number(params.id), user)
      return { status: 200, body }
    }
  }
}
