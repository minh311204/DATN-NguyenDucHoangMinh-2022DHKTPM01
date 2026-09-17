import { z } from 'zod'

export const BookingStatusSchema = z.enum([
  'PENDING',
  'CONFIRMED',
  'CANCELLED',
  'COMPLETED',
])

export const BookingCancellationRequestStateSchema = z.enum([
  'NONE',
  'PENDING',
  'REJECTED',
])

export const BookingPassengerAgeCategorySchema = z.enum([
  'ADULT',
  'CHILD',
  'INFANT',
])

export const BookingPassengerSchema = z.object({
  id: z.number(),
  bookingId: z.number(),
  ageCategory: BookingPassengerAgeCategorySchema,
  fullName: z.string(),
  dateOfBirth: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  passportNumber: z.string().nullable().optional(),
})

/** Đủ field ghế — dùng cho chi tiết booking / nhóm theo lịch (mỗi lịch một lần) */
export const TourScheduleBriefSchema = z.object({
  id: z.number(),
  startDate: z.string(),
  endDate: z.string(),
  availableSeats: z.number().nullable().optional(),
  bookedSeats: z.number().nullable().optional(),
  remainingSeats: z.number().nullable().optional(),
  priceOverride: z.number().nullable().optional(),
  /** Adult: đủ giá */
  adultPrice: z.number().nullable().optional(),
  /** Child: 1/2 giá */
  childPrice: z.number().nullable().optional(),
  /** Infant: miễn phí */
  infantPrice: z.number().nullable().optional(),
  tour: z.object({
    id: z.number(),
    name: z.string(),
    basePrice: z.number().nullable().optional(),
  }),
})

/**
 * List booking: giữ `remainingSeats` (chung theo lịch) để UI không phải tự tính;
 * không trả `availableSeats` / `bookedSeats` để gọn.
 */
export const TourScheduleListBriefSchema = z.object({
  id: z.number(),
  startDate: z.string(),
  endDate: z.string(),
  remainingSeats: z.number().nullable().optional(),
  priceOverride: z.number().nullable().optional(),
  adultPrice: z.number().nullable().optional(),
  childPrice: z.number().nullable().optional(),
  infantPrice: z.number().nullable().optional(),
  tour: z.object({
    id: z.number(),
    name: z.string(),
    basePrice: z.number().nullable().optional(),
  }),
})

export const ContactInfoSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  address: z.string().optional(),
})

export const PassengerCountsSchema = z.object({
  /** Người lớn (sinh trước 18/05/2014), giá đủ */
  adults: z.number().int().min(0),
  /** Trẻ em (18/05/2014 – 17/05/2021), ~giá nhóm phụ */
  children: z.number().int().min(0),
  /** Trẻ nhỏ (18/05/2021 – 17/05/2024), ~giá nhóm phụ */
  infants: z.number().int().min(0),
})

export const BookingContactResponseSchema = z.object({
  fullName: z.string(),
  email: z.string(),
  phone: z.string(),
  address: z.string().optional(),
})

export const BookingResponseSchema = z.object({
  id: z.number(),
  userId: z.number().nullable(),
  tourScheduleId: z.number(),
  numberOfPeople: z.number(),
  bookingDateUtc: z.string().nullable().optional(),
  totalAmount: z.number().nullable().optional(),
  status: BookingStatusSchema,
  contact: BookingContactResponseSchema,
  notes: z.string().nullable().optional(),
  /** Chờ thanh toán — hết hạn thì client có thể bỏ qua khi kiểm tra trùng lịch */
  expiredAtUtc: z.string().nullable().optional(),
  passengerCounts: z.object({
    adults: z.number(),
    children: z.number(),
    infants: z.number(),
  }),
  /** Mã giảm giá đã áp dụng (nếu có) */
  discountCode: z.string().nullable().optional(),
  discountAmount: z.number().nullable().optional(),
  singleRoomCount: z.number().int().optional(),
  singleRoomSupplementAmount: z.number().nullable().optional(),
  /** Chính sách hủy: số ngày tối thiểu trước giờ khởi hành (server) */
  cancelMinDaysBeforeDeparture: z.number().int(),
  cancellationRequestState: BookingCancellationRequestStateSchema,
  cancellationRequestedAtUtc: z.string().nullable().optional(),
  cancellationRejectedAtUtc: z.string().nullable().optional(),
  cancellationApprovedAtUtc: z.string().nullable().optional(),
  schedule: TourScheduleBriefSchema,
  passengers: z.array(BookingPassengerSchema),
})

/** Giống BookingResponse nhưng schedule gọn (có remainingSeats, không có available/booked) */
export const BookingListItemSchema = BookingResponseSchema.extend({
  schedule: TourScheduleListBriefSchema,
})

/** Một booking không lồng schedule — dùng trong nhóm theo lịch */
export const BookingWithoutScheduleSchema = BookingResponseSchema.omit({
  schedule: true,
})

/** Admin: danh sách đặt theo tour, nhóm theo lịch khởi hành */
export const TourBookingsGroupedResponseSchema = z.object({
  tour: z.object({
    id: z.number(),
    name: z.string(),
  }),
  groups: z.array(
    z.object({
      schedule: TourScheduleBriefSchema,
      bookings: z.array(BookingWithoutScheduleSchema),
    }),
  ),
})

export const CreateBookingPassengerSchema = z.object({
  fullName: z.string().min(1),
  gender: z.string().nullable().optional(),
  /** YYYY-MM-DD — khớp loại với các mốc ngày sinh quy định (và không sau ngày khởi hành) */
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ageCategory: BookingPassengerAgeCategorySchema,
})

function isValidYmd(ymd: string): boolean {
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return (
    !Number.isNaN(dt.getTime()) &&
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  )
}

export const CreateBookingSchema = z
  .object({
    tourScheduleId: z.number().int(),
    contact: ContactInfoSchema,
    passengerCounts: PassengerCountsSchema,
    passengers: z.array(CreateBookingPassengerSchema).min(1),
    notes: z.string().optional(),
    /** Số suất phụ thu phòng đơn (≤ số người lớn) */
    singleRoomCount: z.number().int().min(0).max(100).optional().default(0),
    /** Mã giảm giá (server kiểm tra bảng PromoCode) */
    discountCode: z.string().max(64).optional(),
    /**
     * true = đặt cho chính mình (mặc định): server kiểm tra trùng khoảng
     * khởi hành–kết thúc với booking PENDING (còn hạn) / CONFIRMED của user.
     * false = đặt hộ: bỏ kiểm tra trùng lịch; bắt buộc đã đăng nhập.
     */
    bookingForSelf: z.boolean().optional().default(true),
  })
  .superRefine((data, ctx) => {
    const { adults, children, infants } = data.passengerCounts
    const total = adults + children + infants
    if (total < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Cần ít nhất một hành khách',
        path: ['passengerCounts'],
      })
    }
    if (adults < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Cần ít nhất một người lớn',
        path: ['passengerCounts', 'adults'],
      })
    }
    if (data.passengers.length !== total) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Số dòng hành khách phải bằng tổng người lớn + trẻ em + em bé',
        path: ['passengers'],
      })
    }
    let ca = 0
    let cc = 0
    let ci = 0
    for (const p of data.passengers) {
      if (p.ageCategory === 'ADULT') ca++
      else if (p.ageCategory === 'CHILD') cc++
      else ci++
      if (!isValidYmd(p.dateOfBirth)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'dateOfBirth không hợp lệ (YYYY-MM-DD)',
          path: ['passengers'],
        })
      }
    }
    if (ca !== adults || cc !== children || ci !== infants) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Số lượng theo ageCategory trong danh sách hành khách phải khớp passengerCounts',
        path: ['passengers'],
      })
    }
    const sr = data.singleRoomCount ?? 0
    if (sr > adults) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Phụ thu phòng đơn không vượt quá số người lớn',
        path: ['singleRoomCount'],
      })
    }
  })

export const PreviewPromoBodySchema = z.object({
  code: z.string().min(1).max(64),
  tourId: z.number().int(),
  subtotalBeforeDiscount: z.number().nonnegative(),
})

export const PreviewPromoResponseSchema = z.object({
  discountAmount: z.number(),
})

export const BookingListQuerySchema = z.object({
  status: BookingStatusSchema.optional(),
  userId: z.coerce.number().int().optional(),
  /** Admin: lọc đơn đang chờ duyệt hủy */
  cancellationRequestState: BookingCancellationRequestStateSchema.optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
})

export const BookingListPaginatedResponseSchema = z.object({
  items: z.array(BookingListItemSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
})

export const UpdateBookingStatusSchema = z.object({
  status: BookingStatusSchema,
})

export const RejectBookingCancellationSchema = z.object({
  /** Ghi chú nội bộ / lý do từ chối (tuỳ chọn) */
  reason: z.string().max(2000).optional(),
})

/** Admin: danh sách lịch tour + chỗ còn (không cần load từng booking) */
export const AdminTourSchedulesOverviewQuerySchema = z.object({
  tourId: z.coerce.number().int().optional(),
  destinationLocationId: z.coerce.number().int().optional(),
  departureLocationId: z.coerce.number().int().optional(),
  /** YYYY-MM-DD — lọc TourSchedule.startDate >= */
  departureFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  /** YYYY-MM-DD — lọc TourSchedule.startDate <= end of day */
  departureTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})

export const AdminTourScheduleSeatRowSchema = z.object({
  id: z.number(),
  tourId: z.number(),
  startDate: z.string(),
  endDate: z.string(),
  availableSeats: z.number().nullable().optional(),
  bookedSeats: z.number().nullable().optional(),
  remainingSeats: z.number().nullable().optional(),
  priceOverride: z.number().nullable().optional(),
  adultPrice: z.number().nullable().optional(),
  childPrice: z.number().nullable().optional(),
  infantPrice: z.number().nullable().optional(),
  /** Số booking gắn lịch này (mọi trạng thái) */
  bookingCount: z.number().int(),
})

export const AdminTourSchedulesOverviewResponseSchema = z.array(
  z.object({
    tour: z.object({
      id: z.number(),
      name: z.string(),
      departureLocationId: z.number(),
      destinationLocationId: z.number(),
    }),
    schedules: z.array(AdminTourScheduleSeatRowSchema),
  }),
)
