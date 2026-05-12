import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  BookingStatus,
  Prisma,
  PrismaClient,
} from '@prisma/client'
import { PrismaService } from '../prisma/prima.service'
import { NotificationService } from '../notification/notification.service'
import { validateDobUtcForCategory } from '../../../shared/lib/booking-passenger-age'
import { schedulesOverlapUtc } from '../../../shared/lib/booking-schedule-overlap'
import {
  AdminTourSchedulesOverviewQuerySchema,
  BookingListQuerySchema,
  CreateBookingSchema,
  PreviewPromoBodySchema,
  RejectBookingCancellationSchema,
  UpdateBookingStatusSchema,
} from '../../../shared/schema/booking.schema'
import type { z } from 'zod'

type CreateBookingInput = z.infer<typeof CreateBookingSchema>
type BookingListQuery = z.infer<typeof BookingListQuerySchema>
type UpdateBookingStatusInput = z.infer<typeof UpdateBookingStatusSchema>
type AdminTourSchedulesOverviewQuery = z.infer<
  typeof AdminTourSchedulesOverviewQuerySchema
>

const PENDING_BOOKING_TTL_MINUTES = Number(
  process.env.BOOKING_PENDING_TTL_MINUTES ?? 30,
)

/** Phải còn ít nhất N ngày (24h) trước giờ khởi hành mới được gửi yêu cầu hủy / admin duyệt hủy (hoàn tiền). */
const BOOKING_CANCEL_MIN_DAYS_BEFORE_DEPARTURE = Math.max(
  0,
  Number(process.env.BOOKING_CANCEL_MIN_DAYS_BEFORE_DEPARTURE ?? 3),
)

const MS_PER_DAY = 24 * 60 * 60 * 1000

const bookingInclude = {
  schedule: {
    include: {
      tour: {
        select: {
          id: true,
          name: true,
          basePrice: true,
        },
      },
    },
  },
  passengers: true,
} satisfies Prisma.BookingInclude

type BookingRow = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>

type SchedulePayloadFull = {
  id: number
  startDate: string
  endDate: string
  availableSeats: number | null
  bookedSeats: number | null
  remainingSeats: number | null
  priceOverride: number | null
  adultPrice: number | null
  childPrice: number | null
  infantPrice: number | null
  tour: { id: number; name: string; basePrice: number | null }
}

type SchedulePayloadList = {
  id: number
  startDate: string
  endDate: string
  remainingSeats: number | null
  priceOverride: number | null
  adultPrice: number | null
  childPrice: number | null
  infantPrice: number | null
  tour: { id: number; name: string; basePrice: number | null }
}

function num(d: unknown): number | null {
  if (d == null) return null
  return Number(d)
}

function iso(d: Date | null | undefined): string | null {
  if (d == null) return null
  return d.toISOString()
}

/** DOB YYYY-MM-DD → UTC midnight */
function parseYmdUtc(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  // Reject invalid/overflow dates like 2026-99-99.
  if (
    Number.isNaN(dt.getTime()) ||
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    throw new BadRequestException('Ngày sinh không hợp lệ (YYYY-MM-DD)')
  }
  return dt
}

function assertWithinCancellationWindow(
  departureUtc: Date,
  atUtc: Date,
  minDays: number,
  messageKind: 'default' | 'approveRefund' = 'default',
) {
  if (minDays <= 0) return
  if (departureUtc.getTime() - atUtc.getTime() < minDays * MS_PER_DAY) {
    const msg =
      messageKind === 'approveRefund'
        ? `Không thể chấp nhận hủy có điều kiện hoàn tiền: tại thời điểm duyệt phải còn ít nhất ${minDays} ngày trước giờ khởi hành. Vui lòng từ chối yêu cầu hoặc xử lý thủ công nếu phù hợp.`
        : `Chỉ được thực hiện khi còn ít nhất ${minDays} ngày trước giờ khởi hành.`
    throw new BadRequestException(msg)
  }
}

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  private async resolveBookingUserId(
    authUserId: number | null,
    contact: { email: string; fullName: string },
  ): Promise<number | null> {
    if (authUserId != null) return authUserId

    const email = contact.email.trim().toLowerCase()
    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })

    if (existing) {
      throw new BadRequestException(
        'Email này đã có tài khoản. Vui lòng đăng nhập để đặt tour.',
      )
    }

    return null
  }

  private bookingExpiredAtUtc(baseDate = new Date()): Date {
    return new Date(baseDate.getTime() + PENDING_BOOKING_TTL_MINUTES * 60_000)
  }

  private buildSchedulePayload(
    schedule: BookingRow['schedule'],
    mode: 'full' | 'list',
  ): SchedulePayloadFull | SchedulePayloadList {
    const tour = {
      id: schedule.tour.id,
      name: schedule.tour.name,
      basePrice: num(schedule.tour.basePrice),
    }
    const remainingSeats =
      schedule.availableSeats == null
        ? null
        : Math.max(
            schedule.availableSeats - (schedule.bookedSeats ?? 0),
            0,
          )

    const unitPrice = num(schedule.priceOverride) ?? num(schedule.tour.basePrice)
    const adultPrice = unitPrice
    /** Khớp UI: trẻ em / trẻ nhỏ theo ngày sinh; ~90% / ~50% giá người lớn */
    const childPrice =
      unitPrice == null ? null : Math.round(Number(unitPrice) * 0.9)
    const infantPrice =
      unitPrice == null ? null : Math.round(Number(unitPrice) * 0.5)

    const baseList: SchedulePayloadList = {
      id: schedule.id,
      startDate: schedule.startDate.toISOString(),
      endDate: schedule.endDate.toISOString(),
      remainingSeats,
      priceOverride: num(schedule.priceOverride),
      adultPrice,
      childPrice,
      infantPrice,
      tour,
    }
    if (mode === 'list') return baseList
    const full: SchedulePayloadFull = {
      ...baseList,
      availableSeats: schedule.availableSeats,
      bookedSeats: schedule.bookedSeats,
    }
    return full
  }

  /**
   * Áp dụng mã giảm giá (bảng PromoCode). `db` có thể là prisma hoặc tx transaction.
   */
  private async resolvePromoDiscount(
    db: PrismaClient | Prisma.TransactionClient,
    rawCode: string | undefined,
    tourId: number,
    subtotalBeforeDiscount: number,
    now: Date,
  ): Promise<{ discountAmount: number; codeStored: string | null }> {
    if (!rawCode?.trim()) {
      return { discountAmount: 0, codeStored: null }
    }
    const normalized = rawCode.trim().toUpperCase()
    const promo = await db.promoCode.findFirst({
      where: {
        code: normalized,
        isActive: true,
        AND: [
          { OR: [{ tourId: null }, { tourId }] },
          {
            OR: [{ validFromUtc: null }, { validFromUtc: { lte: now } }],
          },
          {
            OR: [{ validToUtc: null }, { validToUtc: { gte: now } }],
          },
        ],
      },
    })
    if (!promo) {
      throw new BadRequestException(
        'Mã giảm giá không hợp lệ, hết hạn hoặc không áp dụng cho tour này',
      )
    }

    const fixed =
      promo.fixedOff != null ? Number(promo.fixedOff) : null
    const pct =
      promo.percentOff != null ? Number(promo.percentOff) : null

    let disc = 0
    if (fixed != null && fixed > 0) {
      disc = fixed
    } else if (pct != null && pct > 0) {
      disc = (subtotalBeforeDiscount * pct) / 100
      if (promo.maxDiscountAmount != null) {
        disc = Math.min(disc, Number(promo.maxDiscountAmount))
      }
    }

    disc = Math.min(Math.max(0, disc), subtotalBeforeDiscount)
    return {
      discountAmount: Math.round(disc),
      codeStored: normalized,
    }
  }

  async previewPromo(raw: unknown) {
    const now = new Date()
    const body = PreviewPromoBodySchema.parse(raw)
    const { discountAmount } = await this.resolvePromoDiscount(
      this.prisma,
      body.code,
      body.tourId,
      body.subtotalBeforeDiscount,
      now,
    )
    return { discountAmount }
  }

  private mapBooking(row: BookingRow, mode: 'full' | 'list' = 'full') {
    let adults = 0
    let children = 0
    let infants = 0
    for (const p of row.passengers) {
      if (p.ageCategory === 'ADULT') adults++
      else if (p.ageCategory === 'CHILD') children++
      else infants++
    }

    const core = {
      id: row.id,
      userId: row.userId,
      tourScheduleId: row.tourScheduleId,
      numberOfPeople: row.numberOfPeople,
      bookingDateUtc: iso(row.bookingDateUtc),
      expiredAtUtc: iso(row.expiredAtUtc),
      totalAmount: num(row.totalAmount),
      status: row.status,
      discountCode: row.discountCode,
      discountAmount: num(row.discountAmount),
      singleRoomCount: row.singleRoomCount,
      singleRoomSupplementAmount: num(row.singleRoomSupplementAmount),
      cancelMinDaysBeforeDeparture: BOOKING_CANCEL_MIN_DAYS_BEFORE_DEPARTURE,
      cancellationRequestState: row.cancellationRequestState,
      cancellationRequestedAtUtc: iso(row.cancellationRequestedAtUtc),
      cancellationRejectedAtUtc: iso(row.cancellationRejectedAtUtc),
      cancellationApprovedAtUtc: iso(row.cancellationApprovedAtUtc),
      contact: {
        fullName: row.contactFullName ?? '',
        email: row.contactEmail ?? '',
        phone: row.contactPhone ?? '',
        address: row.contactAddress ?? '',
      },
      notes: row.notes,
      passengerCounts: { adults, children, infants },
      schedule: this.buildSchedulePayload(row.schedule, mode),
      passengers: row.passengers.map((p) => ({
        id: p.id,
        bookingId: p.bookingId,
        ageCategory: p.ageCategory,
        fullName: p.fullName,
        dateOfBirth: iso(p.dateOfBirth),
        gender: p.gender,
        passportNumber: p.passportNumber,
      })),
    }
    return core
  }

  private async getBookingRowById(id: number) {
    const row = await this.prisma.booking.findUnique({
      where: { id },
      include: bookingInclude,
    })
    if (!row) throw new NotFoundException('Booking not found')
    return row
  }

  async getMyBookings(userId: number) {
    const rows = await this.prisma.booking.findMany({
      where: { userId },
      include: bookingInclude,
      orderBy: { id: 'desc' },
    })
    return rows.map((r) => this.mapBooking(r, 'list'))
  }

  async getBookingById(id: number, currentUser: { id: number; role: string }) {
    const row = await this.getBookingRowById(id)
    const canView = currentUser.role === 'ADMIN' || row.userId === currentUser.id
    if (!canView) throw new ForbiddenException()
    return this.mapBooking(row)
  }

  /**
   * Đặt cho chính mình: không cho phép hai lịch có khoảng [startDate, endDate]
   * giao nhau khi booking đang PENDING (chưa hết hạn thanh toán) hoặc CONFIRMED.
   */
  private async assertNoOverlappingTourDatesForSelf(
    userId: number,
    newStart: Date,
    newEnd: Date,
    now: Date,
  ): Promise<void> {
    const rows = await this.prisma.booking.findMany({
      where: {
        userId,
        OR: [
          { status: 'CONFIRMED' },
          {
            status: 'PENDING',
            OR: [{ expiredAtUtc: null }, { expiredAtUtc: { gt: now } }],
          },
        ],
      },
      select: {
        id: true,
        schedule: { select: { startDate: true, endDate: true } },
      },
    })
    for (const row of rows) {
      const s = row.schedule.startDate
      const e = row.schedule.endDate
      if (schedulesOverlapUtc(newStart, newEnd, s, e)) {
        throw new BadRequestException(
          `Bạn đang có chuyến trùng khung thời gian (BK-${row.id}). Chọn ngày khác, hoặc chọn «Đặt hộ cho người khác» nếu bạn không tham gia chuyến này.`,
        )
      }
    }
  }

  async createBooking(authUserId: number | null, raw: unknown) {
    const body = CreateBookingSchema.parse(raw)
    const userId = await this.resolveBookingUserId(authUserId, body.contact)
    const schedule = await this.prisma.tourSchedule.findUnique({
      where: { id: body.tourScheduleId },
      include: {
        tour: {
          select: {
            id: true,
            name: true,
            basePrice: true,
            singleRoomSupplement: true,
            isActive: true,
          },
        },
      },
    })
    if (!schedule) throw new NotFoundException('Tour schedule not found')
    if (schedule.deletedAt != null) {
      throw new BadRequestException(
        'Lịch khởi hành đã kết thúc hoặc không còn mở đặt trên hệ thống',
      )
    }
    if (schedule.tour.isActive !== true) {
      throw new BadRequestException(
        'Tour không mở bán hoặc đã ngừng hiển thị',
      )
    }

    const now = new Date()
    if (schedule.startDate.getTime() < now.getTime()) {
      throw new BadRequestException(
        'Lịch khởi hành đã qua, không thể đặt chỗ',
      )
    }

    if (body.bookingForSelf === false && authUserId == null) {
      throw new BadRequestException(
        'Đặt hộ cho người khác cần đăng nhập tài khoản.',
      )
    }
    if (authUserId != null && body.bookingForSelf) {
      await this.assertNoOverlappingTourDatesForSelf(
        authUserId,
        schedule.startDate,
        schedule.endDate,
        now,
      )
    }

    const { adults, children, infants } = body.passengerCounts
    const totalPeople = adults + children + infants
    const tourStartUtc = schedule.startDate

    for (const p of body.passengers) {
      const dob = parseYmdUtc(p.dateOfBirth)
      const ageErr = validateDobUtcForCategory(
        dob,
        p.ageCategory,
        tourStartUtc,
      )
      if (ageErr) throw new BadRequestException(ageErr)
    }

    const unitPrice =
      num(schedule.priceOverride) ?? num(schedule.tour.basePrice) ?? null
    if (unitPrice == null) {
      throw new BadRequestException(
        'Tour chưa có giá (basePrice / priceOverride). Vui lòng cập nhật trước khi đặt.',
      )
    }
    const supplementPer = num(schedule.tour.singleRoomSupplement) ?? 0
    const singleRoomCount = body.singleRoomCount ?? 0
    const singleRoomSupplementAmount = Math.round(
      singleRoomCount * supplementPer,
    )

    const subPassengers =
      Math.round(unitPrice * adults) +
      Math.round(unitPrice * 0.9 * children) +
      Math.round(unitPrice * 0.5 * infants)
    const subtotalBeforeDiscount = subPassengers + singleRoomSupplementAmount

    if (singleRoomCount > 0 && supplementPer <= 0) {
      throw new BadRequestException(
        'Tour chưa cấu hình phụ thu phòng đơn (singleRoomSupplement)',
      )
    }

    const { discountAmount, codeStored } = await this.resolvePromoDiscount(
      this.prisma,
      body.discountCode,
      schedule.tour.id,
      subtotalBeforeDiscount,
      now,
    )

    /** VND nguyên — khớp thanh toán VNPay và tránh lệch .5 float */
    const totalAmount = Math.max(
      0,
      Math.round(subtotalBeforeDiscount - discountAmount),
    )

    const normalizedContactEmail = body.contact.email.trim().toLowerCase()
    const duplicateActiveBooking = await this.prisma.booking.findFirst({
      where: {
        ...(userId != null
          ? { userId }
          : { userId: { equals: null }, contactEmail: normalizedContactEmail }),
        tourScheduleId: body.tourScheduleId,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      select: { id: true, status: true },
    })
    if (duplicateActiveBooking) {
      throw new BadRequestException(
        `Bạn đã có booking ${duplicateActiveBooking.status} cho lịch này (BK-${duplicateActiveBooking.id})`,
      )
    }

    const bookingId = await this.prisma.$transaction(async (tx) => {
      const liveSchedule = await tx.tourSchedule.findUnique({
        where: { id: schedule.id },
      })
      if (!liveSchedule) throw new NotFoundException('Tour schedule not found')

      const currentBooked = liveSchedule.bookedSeats ?? 0
      const seatsLimit = liveSchedule.availableSeats
      if (seatsLimit != null && currentBooked + totalPeople > seatsLimit) {
        throw new BadRequestException('Not enough available seats')
      }

      const booking = await tx.booking.create({
        data: {
          userId: userId ?? undefined,
          tourScheduleId: body.tourScheduleId,
          numberOfPeople: totalPeople,
          totalAmount,
          discountCode: codeStored,
          discountAmount,
          singleRoomCount,
          singleRoomSupplementAmount:
            singleRoomSupplementAmount > 0
              ? singleRoomSupplementAmount
              : null,
          status: 'PENDING',
          expiredAtUtc: this.bookingExpiredAtUtc(now),
          contactFullName: body.contact.fullName,
          contactEmail: body.contact.email,
          contactPhone: body.contact.phone,
          contactAddress: body.contact.address ?? null,
          notes: body.notes ?? null,
          passengers: {
            create: body.passengers.map((p) => ({
              ageCategory: p.ageCategory,
              fullName: p.fullName,
              dateOfBirth: parseYmdUtc(p.dateOfBirth),
              gender: p.gender ?? undefined,
            })),
          },
        },
      })

      await tx.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          oldStatus: null,
          newStatus: 'PENDING',
        },
      })

      if (seatsLimit != null || liveSchedule.bookedSeats != null) {
        const updated = await tx.tourSchedule.updateMany({
          where: {
            id: schedule.id,
            bookedSeats: liveSchedule.bookedSeats,
          },
          data: { bookedSeats: currentBooked + totalPeople },
        })
        if (updated.count !== 1) {
          throw new BadRequestException(
            'Số chỗ đã thay đổi, vui lòng thử lại',
          )
        }
      }

      return booking.id
    })

    /**
     * Tracking hành vi `book` để cụm gợi ý theo sở thích có tín hiệu booking.
     * Đặt ngoài transaction & try/catch để không bao giờ chặn / rollback luồng
     * đặt tour nếu insert tracking thất bại. Guest booking (userId null) bỏ qua.
     */
    if (userId != null) {
      this.prisma.userBehavior
        .create({
          data: { userId, tourId: schedule.tour.id, action: 'book' },
        })
        .catch(() => {
          // tracking phụ trợ — nuốt lỗi
        })
    }

    const row = await this.getBookingRowById(bookingId)
    return this.mapBooking(row)
  }

  async cancelMyBooking(id: number, userId: number) {
    const row = await this.getBookingRowById(id)
    if (row.userId !== userId) throw new ForbiddenException()
    if (row.status === 'CANCELLED') return this.mapBooking(row)
    if (row.status === 'COMPLETED') {
      throw new BadRequestException('Completed booking cannot be cancelled')
    }
    if (row.status !== 'PENDING' && row.status !== 'CONFIRMED') {
      throw new BadRequestException(
        'Không thể gửi yêu cầu hủy ở trạng thái hiện tại',
      )
    }
    if (row.cancellationRequestState === 'PENDING') {
      throw new BadRequestException(
        'Yêu cầu hủy của bạn đang chờ admin xử lý',
      )
    }

    assertWithinCancellationWindow(
      row.schedule.startDate,
      new Date(),
      BOOKING_CANCEL_MIN_DAYS_BEFORE_DEPARTURE,
    )

    const now = new Date()
    const updated = await this.prisma.booking.update({
      where: { id },
      data: {
        cancellationRequestState: 'PENDING',
        cancellationRequestedAtUtc: now,
        cancellationRejectedAtUtc: null,
        cancellationApprovedAtUtc: null,
      },
      include: bookingInclude,
    })
    return this.mapBooking(updated)
  }

  async approveBookingCancellation(id: number) {
    const row = await this.getBookingRowById(id)
    if (row.cancellationRequestState !== 'PENDING') {
      throw new BadRequestException(
        'Booking không có yêu cầu hủy đang chờ xử lý',
      )
    }
    if (row.status === 'CANCELLED') return this.mapBooking(row)
    if (row.status === 'COMPLETED') {
      throw new BadRequestException('Booking đã hoàn tất, không thể hủy')
    }

    assertWithinCancellationWindow(
      row.schedule.startDate,
      new Date(),
      BOOKING_CANCEL_MIN_DAYS_BEFORE_DEPARTURE,
      'approveRefund',
    )

    await this.applyStatusChange(
      id,
      row.status,
      'CANCELLED',
      row.numberOfPeople,
      row.tourScheduleId,
      { recordCancellationApproval: true },
    )
    const updated = await this.getBookingRowById(id)
    const mappedFull = this.mapBooking(updated)
    const uid = row.userId
    if (uid != null) {
      const tourName = updated.schedule.tour.name
      await this.notifications.create(uid, {
        title: 'Đặt chỗ đã được hủy',
        content: `Admin đã chấp nhận hủy BK-${id} (${tourName}). Đơn của bạn hiện ở trạng thái Đã hủy.`,
      })
      this.notifications.emitBookingUpdated(
        uid,
        this.mapBooking(updated, 'list') as unknown as Record<string, unknown>,
      )
    }
    return mappedFull
  }

  async rejectBookingCancellation(id: number, raw: unknown) {
    const body = RejectBookingCancellationSchema.parse(raw)
    void body.reason
    const row = await this.getBookingRowById(id)
    if (row.cancellationRequestState !== 'PENDING') {
      throw new BadRequestException(
        'Booking không có yêu cầu hủy đang chờ xử lý',
      )
    }

    const updated = await this.prisma.booking.update({
      where: { id },
      data: {
        cancellationRequestState: 'REJECTED',
        cancellationRejectedAtUtc: new Date(),
      },
      include: bookingInclude,
    })
    const mappedFull = this.mapBooking(updated)
    const uid = row.userId
    if (uid != null) {
      const tourName = updated.schedule.tour.name
      await this.notifications.create(uid, {
        title: 'Yêu cầu hủy không được chấp nhận',
        content: `Admin đã từ chối yêu cầu hủy BK-${id} (${tourName}). Đặt chỗ của bạn giữ nguyên.`,
      })
      this.notifications.emitBookingUpdated(
        uid,
        this.mapBooking(updated, 'list') as unknown as Record<string, unknown>,
      )
    }
    return mappedFull
  }

  async getBookings(query: BookingListQuery) {
    const where: Prisma.BookingWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.userId != null ? { userId: query.userId } : {}),
      ...(query.cancellationRequestState
        ? { cancellationRequestState: query.cancellationRequestState }
        : {}),
    }
    const paginate = query.page != null || query.pageSize != null
    if (paginate) {
      const page = query.page ?? 1
      const pageSize = query.pageSize ?? 10
      const [total, rows] = await Promise.all([
        this.prisma.booking.count({ where }),
        this.prisma.booking.findMany({
          where,
          include: bookingInclude,
          orderBy: [{ bookingDateUtc: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ])
      return {
        items: rows.map((r) => this.mapBooking(r, 'list')),
        total,
        page,
        pageSize,
      }
    }
    const rows = await this.prisma.booking.findMany({
      where,
      include: bookingInclude,
      orderBy: [{ bookingDateUtc: 'desc' }, { id: 'desc' }],
    })
    return rows.map((r) => this.mapBooking(r, 'list'))
  }

  /**
   * Admin: danh sách tour + mọi lịch và remainingSeats (theo TourSchedule).
   * Không nhúng từng booking — dùng cho dashboard chỗ; chi tiết booking xem getBookings / by-tour.
   */
  async getAdminTourSchedulesOverview(query: AdminTourSchedulesOverviewQuery) {
    const whereTour: Prisma.TourWhereInput = {
      ...(query.tourId != null ? { id: query.tourId } : {}),
      ...(query.destinationLocationId != null
        ? { destinationLocationId: query.destinationLocationId }
        : {}),
      ...(query.departureLocationId != null
        ? { departureLocationId: query.departureLocationId }
        : {}),
    }

    const scheduleWhere: Prisma.TourScheduleWhereInput = {
      ...(query.departureFrom || query.departureTo
        ? {
            startDate: {
              ...(query.departureFrom
                ? {
                    gte: new Date(`${query.departureFrom}T00:00:00.000Z`),
                  }
                : {}),
              ...(query.departureTo
                ? {
                    lte: new Date(`${query.departureTo}T23:59:59.999Z`),
                  }
                : {}),
            },
          }
        : {}),
    }

    const tours = await this.prisma.tour.findMany({
      where: whereTour,
      select: {
        id: true,
        name: true,
        basePrice: true,
        departureLocationId: true,
        destinationLocationId: true,
        schedules: {
          where: scheduleWhere,
          orderBy: { startDate: 'asc' },
        },
      },
      orderBy: { id: 'desc' },
    })

    const scheduleIds = tours.flatMap((t) => t.schedules.map((s) => s.id))
    let countMap = new Map<number, number>()
    if (scheduleIds.length > 0) {
      const counts = await this.prisma.booking.groupBy({
        by: ['tourScheduleId'],
        where: { tourScheduleId: { in: scheduleIds } },
        _count: { id: true },
      })
      countMap = new Map(
        counts.map((c) => [c.tourScheduleId, c._count.id]),
      )
    }

    return tours.map((tour) => ({
      tour: {
        id: tour.id,
        name: tour.name,
        departureLocationId: tour.departureLocationId,
        destinationLocationId: tour.destinationLocationId,
      },
      schedules: tour.schedules.map((s) => {
        const unitPrice = num(s.priceOverride) ?? num(tour.basePrice)
        return {
          id: s.id,
          tourId: s.tourId,
          startDate: s.startDate.toISOString(),
          endDate: s.endDate.toISOString(),
          availableSeats: s.availableSeats,
          bookedSeats: s.bookedSeats,
          remainingSeats:
            s.availableSeats == null
              ? null
              : Math.max(s.availableSeats - (s.bookedSeats ?? 0), 0),
          priceOverride: num(s.priceOverride),
          adultPrice: unitPrice,
          childPrice: unitPrice == null ? null : Math.round(Number(unitPrice) * 0.9),
          infantPrice: unitPrice == null ? null : Math.round(Number(unitPrice) * 0.5),
          bookingCount: countMap.get(s.id) ?? 0,
        }
      }),
    }))
  }

  /** Admin: tất cả booking của một tour, nhóm theo lịch — remainingSeats mỗi lịch một lần */
   async getBookingsGroupedByTour(tourId: number) {
    const tour = await this.prisma.tour.findUnique({
      where: { id: tourId },
      select: { id: true, name: true },
    })
    if (!tour) throw new NotFoundException('Tour not found')

    const rows = await this.prisma.booking.findMany({
      where: { schedule: { tourId } },
      include: bookingInclude,
      orderBy: [{ schedule: { startDate: 'asc' } }, { id: 'asc' }],
    })

    const bySchedule = new Map<number, BookingRow[]>()
    for (const r of rows) {
      const list = bySchedule.get(r.tourScheduleId) ?? []
      list.push(r)
      bySchedule.set(r.tourScheduleId, list)
    }

    const groups = [...bySchedule.entries()]
      .sort(
        (a, b) =>
          a[1][0].schedule.startDate.getTime() -
          b[1][0].schedule.startDate.getTime(),
      )
      .map(([, bookings]) => {
        const scheduleFull = this.buildSchedulePayload(
          bookings[0].schedule,
          'full',
        ) as SchedulePayloadFull
        return {
          schedule: scheduleFull,
          bookings: bookings.map((b) => {
            const m = this.mapBooking(b, 'full')
            const { schedule: _sched, ...rest } = m
            void _sched
            return rest
          }),
        }
      })

    return { tour, groups }
  }

  async updateBookingStatus(id: number, body: UpdateBookingStatusInput) {
    const row = await this.getBookingRowById(id)
    if (row.status === body.status) return this.mapBooking(row)
    if (row.status === 'COMPLETED' && body.status !== 'COMPLETED') {
      throw new BadRequestException(
        'Không thể đổi trạng thái booking đã hoàn thành',
      )
    }
    assertAdminBookingTransition(row.status, body.status as BookingStatus)
    await this.applyStatusChange(
      id,
      row.status,
      body.status as BookingStatus,
      row.numberOfPeople,
      row.tourScheduleId,
    )
    const updated = await this.getBookingRowById(id)
    return this.mapBooking(updated)
  }

  async expirePendingBookings(limit = 200) {
    const expiredRows = await this.prisma.booking.findMany({
      where: {
        status: 'PENDING',
        expiredAtUtc: { lte: new Date() },
      },
      select: {
        id: true,
        status: true,
        numberOfPeople: true,
        tourScheduleId: true,
      },
      orderBy: { id: 'asc' },
      take: limit,
    })

    let expiredCount = 0
    for (const row of expiredRows) {
      try {
        await this.applyStatusChange(
          row.id,
          row.status,
          'CANCELLED',
          row.numberOfPeople,
          row.tourScheduleId,
        )
        expiredCount++
      } catch {
        // best-effort batch: continue remaining rows
      }
    }

    return { scanned: expiredRows.length, expiredCount }
  }

  private async applyStatusChange(
    bookingId: number,
    oldStatus: BookingStatus,
    newStatus: BookingStatus,
    numberOfPeople: number,
    scheduleId: number,
    cancelOpts?: { recordCancellationApproval?: boolean },
  ) {
    await this.prisma.$transaction(async (tx) => {
      const cancelPatch: Prisma.BookingUpdateInput = {}
      if (newStatus === 'CANCELLED') {
        if (cancelOpts?.recordCancellationApproval) {
          cancelPatch.cancellationRequestState = 'NONE'
          cancelPatch.cancellationApprovedAtUtc = new Date()
          cancelPatch.cancellationRejectedAtUtc = null
        } else {
          cancelPatch.cancellationRequestState = 'NONE'
          cancelPatch.cancellationRequestedAtUtc = null
          cancelPatch.cancellationRejectedAtUtc = null
          cancelPatch.cancellationApprovedAtUtc = null
        }
      }

      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: newStatus,
          expiredAtUtc:
            newStatus === 'PENDING' ? this.bookingExpiredAtUtc() : null,
          ...cancelPatch,
        },
      })

      await tx.bookingStatusHistory.create({
        data: {
          bookingId,
          oldStatus,
          newStatus,
        },
      })

      const shouldReleaseSeats =
        oldStatus !== 'CANCELLED' && newStatus === 'CANCELLED'
      const shouldReserveSeats =
        oldStatus === 'CANCELLED' && newStatus !== 'CANCELLED'

      if (!shouldReleaseSeats && !shouldReserveSeats) return

      const schedule = await tx.tourSchedule.findUnique({
        where: { id: scheduleId },
      })
      if (!schedule) throw new NotFoundException('Tour schedule not found')

      const currentBooked = schedule.bookedSeats ?? 0
      const nextBooked = shouldReleaseSeats
        ? Math.max(currentBooked - numberOfPeople, 0)
        : currentBooked + numberOfPeople

      if (
        shouldReserveSeats &&
        schedule.availableSeats != null &&
        nextBooked > schedule.availableSeats
      ) {
        throw new BadRequestException('Not enough available seats')
      }

      const updated = await tx.tourSchedule.updateMany({
        where: {
          id: scheduleId,
          bookedSeats: schedule.bookedSeats,
        },
        data: { bookedSeats: nextBooked },
      })
      if (updated.count !== 1) {
        throw new BadRequestException('Số chỗ đã thay đổi, vui lòng thử lại')
      }
    })
  }
}

function assertAdminBookingTransition(
  from: BookingStatus,
  to: BookingStatus,
) {
  const allowed: Record<BookingStatus, BookingStatus[]> = {
    PENDING: ['CONFIRMED', 'CANCELLED', 'COMPLETED'],
    CONFIRMED: ['COMPLETED', 'CANCELLED'],
    CANCELLED: ['CONFIRMED'],
    COMPLETED: [],
  }
  if (!allowed[from].includes(to)) {
    throw new BadRequestException(
      `Không thể chuyển booking từ ${from} sang ${to}`,
    )
  }
}
