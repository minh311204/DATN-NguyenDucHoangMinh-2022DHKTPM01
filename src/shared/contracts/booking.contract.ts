import { initContract } from '@ts-rest/core'
import { z } from 'zod'
import { withExceptionResponse } from './helpers'
import {
  AdminTourSchedulesOverviewQuerySchema,
  AdminTourSchedulesOverviewResponseSchema,
  BookingListItemSchema,
  BookingListQuerySchema,
  BookingListPaginatedResponseSchema,
  BookingResponseSchema,
  CreateBookingSchema,
  PreviewPromoBodySchema,
  PreviewPromoResponseSchema,
  TourBookingsGroupedResponseSchema,
  RejectBookingCancellationSchema,
  UpdateBookingStatusSchema,
} from '../schema/booking.schema'

const c = initContract()
const idParams = z.object({ id: z.coerce.number().int() })
const tourIdParams = z.object({ tourId: z.coerce.number().int() })

export const bookingContract = c.router({
  getMyBookings: {
    method: 'GET',
    path: '/me',
    responses: withExceptionResponse({
      200: z.array(BookingListItemSchema),
    }),
  },

  getBookingById: {
    method: 'GET',
    path: '/:id',
    pathParams: idParams,
    responses: withExceptionResponse({
      200: BookingResponseSchema,
    }),
  },

  /** Kiểm tra mã giảm giá trước khi đặt (không tạo booking) */
  previewPromo: {
    method: 'POST',
    path: '/promo/preview',
    body: PreviewPromoBodySchema,
    responses: withExceptionResponse({
      200: PreviewPromoResponseSchema,
    }),
  },

  createBooking: {
    method: 'POST',
    path: '/',
    body: CreateBookingSchema,
    responses: withExceptionResponse({
      201: BookingResponseSchema,
    }),
  },

  cancelMyBooking: {
    method: 'POST',
    path: '/:id/cancel',
    pathParams: idParams,
    body: z.object({}),
    responses: withExceptionResponse({
      200: BookingResponseSchema,
    }),
  },

  /** Admin: chấp nhận hủy (chỉ khi đơn đang chờ duyệt hủy và vẫn trong khung thời gian) */
  approveBookingCancellation: {
    method: 'POST',
    path: '/:id/cancellation/approve',
    pathParams: idParams,
    body: z.object({}),
    responses: withExceptionResponse({
      200: BookingResponseSchema,
    }),
  },

  rejectBookingCancellation: {
    method: 'POST',
    path: '/:id/cancellation/reject',
    pathParams: idParams,
    body: RejectBookingCancellationSchema,
    responses: withExceptionResponse({
      200: BookingResponseSchema,
    }),
  },

  // Admin
  /** Tất cả tour (lọc tùy chọn) + từng lịch khởi hành và remainingSeats */
  getAdminTourSchedulesOverview: {
    method: 'GET',
    path: '/admin/tour-schedules',
    query: AdminTourSchedulesOverviewQuerySchema,
    responses: withExceptionResponse({
      200: AdminTourSchedulesOverviewResponseSchema,
    }),
  },

  getBookings: {
    method: 'GET',
    path: '/',
    query: BookingListQuerySchema,
    responses: withExceptionResponse({
      200: z.union([
        z.array(BookingListItemSchema),
        BookingListPaginatedResponseSchema,
      ]),
    }),
  },

  /** Admin: booking theo tour, nhóm theo lịch (remainingSeats một lần / lịch) */
  getBookingsByTour: {
    method: 'GET',
    path: '/by-tour/:tourId',
    pathParams: tourIdParams,
    responses: withExceptionResponse({
      200: TourBookingsGroupedResponseSchema,
    }),
  },

  updateBookingStatus: {
    method: 'PUT',
    path: '/:id/status',
    pathParams: idParams,
    body: UpdateBookingStatusSchema,
    responses: withExceptionResponse({
      200: BookingResponseSchema,
    }),
  },
})
