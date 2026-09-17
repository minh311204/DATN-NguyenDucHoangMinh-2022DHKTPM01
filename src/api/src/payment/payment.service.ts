import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common'
import {
  HashAlgorithm,
  InpOrderAlreadyConfirmed,
  IpnFailChecksum,
  IpnInvalidAmount,
  IpnOrderNotFound,
  IpnSuccess,
  IpnUnknownError,
  type IpnResponse,
  type ReturnQueryFromVNPay,
  VNPay,
} from 'vnpay'
import type { PaymentStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prima.service'
import { MailService } from './mail.service'
import { NotificationService } from '../notification/notification.service'

function num(d: unknown): number | null {
  if (d == null) return null
  return Number(d)
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

function passengerCountsByAge(passengers: { ageCategory: string }[]): {
  adult: number
  child: number
  infant: number
} {
  let adult = 0
  let child = 0
  let infant = 0
  for (const p of passengers) {
    if (p.ageCategory === 'ADULT') adult++
    else if (p.ageCategory === 'CHILD') child++
    else if (p.ageCategory === 'INFANT') infant++
  }
  return { adult, child, infant }
}

const PAYMENT_BOOKING_MAIL_INCLUDE = {
  passengers: true,
  schedule: {
    include: {
      tour: {
        include: {
          departureLocation: true,
        },
      },
    },
  },
} as const

/** Bỏ khoảng trắng / dấu ngoặc nhầm khi copy .env */
function trimEnv(s: string): string {
  return s.trim().replace(/^["']+|["']+$/g, '')
}

/** VNPay yêu cầu IPv4; ::1 / ::ffff:127.0.0.1 đôi khi gây lỗi phía cổng */
function normalizeVnpIp(ip: string): string {
  const t = ip.trim()
  if (t === '::1' || t.startsWith('::ffff:127.0.0.1')) return '127.0.0.1'
  return t || '127.0.0.1'
}

function resolveHashAlgorithm(): HashAlgorithm {
  const a = (process.env.VNPAY_HASH_ALGORITHM || 'SHA512').toUpperCase()
  if (a === 'SHA256') return HashAlgorithm.SHA256
  return HashAlgorithm.SHA512
}

export type CreateVnpayPaymentResult = {
  paymentUrl: string
  paymentId: number
}

@Injectable()
export class PaymentService {
  private readonly log = new Logger(PaymentService.name)
  private vnpay: VNPay | null = null

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly notificationService: NotificationService,
  ) {
    const tmn = process.env.VNPAY_TMN_CODE
    const secret = process.env.VNPAY_HASH_SECRET
    if (tmn && secret) {
      this.vnpay = new VNPay({
        tmnCode: trimEnv(tmn),
        secureSecret: trimEnv(secret),
        testMode: process.env.VNPAY_TEST_MODE !== 'false',
        hashAlgorithm: resolveHashAlgorithm(),
      })
    }
  }

  private getVnpay(): VNPay {
    if (!this.vnpay) {
      throw new ServiceUnavailableException(
        'VNPay chưa cấu hình (VNPAY_TMN_CODE, VNPAY_HASH_SECRET)',
      )
    }
    return this.vnpay
  }

  private apiPublicBase(): string {
    const base = process.env.API_PUBLIC_URL || 'http://localhost:4000'
    return base.replace(/\/$/, '')
  }

  private userAppBase(): string {
    const base = process.env.USER_APP_PUBLIC_URL || 'http://localhost:3000'
    return base.replace(/\/$/, '')
  }

  async createVnpayPayment(
    userId: number | null,
    bookingId: number,
    clientIp: string,
    contactEmail?: string,
  ): Promise<CreateVnpayPaymentResult> {
    const vnpay = this.getVnpay()

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        schedule: {
          include: { tour: { select: { id: true, name: true } } },
        },
      },
    })
    if (!booking) throw new NotFoundException('Booking not found')
    const byContact =
      typeof contactEmail === 'string' &&
      contactEmail.trim().toLowerCase() ===
        String(booking.contactEmail ?? '').trim().toLowerCase()
    if (userId != null) {
      if (booking.userId !== userId && !byContact) {
        throw new ForbiddenException()
      }
    } else {
      if (!byContact) {
        throw new ForbiddenException(
          'Guest checkout requires matching contact email for this booking',
        )
      }
    }
    if (booking.status !== 'PENDING') {
      throw new BadRequestException(
        'Chỉ có thể thanh toán khi đơn đang ở trạng thái chờ xử lý',
      )
    }

    const paid = await this.prisma.payment.findFirst({
      where: { bookingId, status: 'SUCCESS' },
    })
    if (paid) {
      throw new BadRequestException('Đơn đã được thanh toán')
    }

    const totalAmount = num(booking.totalAmount)
    if (totalAmount == null || totalAmount <= 0) {
      throw new BadRequestException('Đơn không có số tiền hợp lệ')
    }
    /** VND nguyên — tránh float làm lệch vnp_Amount khi nhân 100 */
    const amountVnd = Math.round(totalAmount)

    let payment = await this.prisma.payment.findFirst({
      where: { bookingId, status: 'PENDING', paymentGateway: 'VNPAY' },
      orderBy: { id: 'desc' },
    })

    if (!payment) {
      payment = await this.prisma.payment.create({
        data: {
          bookingId,
          amount: amountVnd,
          status: 'PENDING',
          paymentGateway: 'VNPAY',
        },
      })
    } else {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { amount: amountVnd },
      })
    }

    const txnRef = String(payment.id)
    const returnUrl = `${this.apiPublicBase()}/payments/vnpay/return`
    const ipnUrl = `${this.apiPublicBase()}/payments/vnpay/ipn`
    const includeIpn =
      process.env.VNPAY_INCLUDE_IPN_URL === 'true' ||
      !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(this.apiPublicBase())

    const orderInfo = `Thanh toan booking ${bookingId} tour ${booking.schedule.tour.name}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s-]/g, ' ')
      .slice(0, 240)

    const payParams: Parameters<VNPay['buildPaymentUrl']>[0] & {
      vnp_IpnUrl?: string
    } = {
      vnp_Amount: amountVnd,
      vnp_IpAddr: normalizeVnpIp(clientIp),
      vnp_OrderInfo: orderInfo || `Thanh toan booking ${bookingId}`,
      vnp_ReturnUrl: returnUrl,
      vnp_TxnRef: txnRef,
    }
    if (includeIpn) {
      payParams.vnp_IpnUrl = ipnUrl
    }

    const paymentUrl = vnpay.buildPaymentUrl(payParams)

    return { paymentUrl, paymentId: payment.id }
  }

  /** Admin: danh sách giao dịch thanh toán (phân trang). */
  async listForAdmin(query: {
    status?: PaymentStatus
    bookingId?: number
    /** @deprecated dùng page + pageSize */
    take?: number
    page?: number
    pageSize?: number
  }) {
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.bookingId != null ? { bookingId: query.bookingId } : {}),
    }
    const pageSize = Math.min(
      Math.max(
        query.pageSize ?? query.take ?? 10,
        1,
      ),
      200,
    )
    const page = Math.max(query.page ?? 1, 1)
    const skip = (page - 1) * pageSize

    const [total, rows] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        include: {
          booking: {
            select: {
              id: true,
              contactFullName: true,
              contactEmail: true,
              status: true,
              totalAmount: true,
              schedule: {
                select: {
                  startDate: true,
                  tour: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
        orderBy: { id: 'desc' },
        skip,
        take: pageSize,
      }),
    ])

    const items = rows.map((p) => ({
      id: p.id,
      bookingId: p.bookingId,
      paymentGateway: p.paymentGateway,
      paymentMethod: p.paymentMethod,
      transactionCode: p.transactionCode,
      amount: num(p.amount),
      status: p.status,
      paidAtUtc: p.paidAtUtc ? p.paidAtUtc.toISOString() : null,
      booking: {
        id: p.booking.id,
        contactName: p.booking.contactFullName,
        contactEmail: p.booking.contactEmail,
        bookingStatus: p.booking.status,
        totalAmount: num(p.booking.totalAmount),
        tourName: p.booking.schedule.tour.name,
        tourId: p.booking.schedule.tour.id,
        departureStartUtc: p.booking.schedule.startDate.toISOString(),
      },
    }))

    return { items, total, page, pageSize }
  }

  /** Xác thực redirect từ VNPay (browser) — idempotent với IPN. */
  async handleVnpayReturn(
    query: Record<string, string | string[] | undefined>,
  ): Promise<{ ok: boolean; bookingId?: number; tourId?: number }> {
    const flat = normalizeVnpQuery(query)
    const vnpay = this.getVnpay()

    let verified: ReturnType<VNPay['verifyReturnUrl']>
    try {
      verified = vnpay.verifyReturnUrl(flat as ReturnQueryFromVNPay)
    } catch {
      return { ok: false }
    }

    const paymentId = Number.parseInt(String(flat.vnp_TxnRef ?? ''), 10)
    if (!Number.isFinite(paymentId)) return { ok: false }

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        booking: {
          include: PAYMENT_BOOKING_MAIL_INCLUDE,
        },
      },
    })
    if (!payment) return { ok: false }

    const bookingId = payment.bookingId
    const tourId = payment.booking.schedule.tour.id

    if (!verified.isVerified) {
      return { ok: false, bookingId, tourId }
    }

    if (!verified.isSuccess) {
      await this.markPaymentFailedIfPending(paymentId, flat)
      return { ok: false, bookingId, tourId }
    }

    if (payment.status === 'SUCCESS') {
      return { ok: true, bookingId, tourId }
    }

    const done = await this.tryConfirmPaymentFromVerified(
      payment,
      verified,
      payment.booking,
    )
    return { ok: done, bookingId, tourId }
  }

  /** IPN server-to-server — phản hồi JSON cho VNPay. */
  async handleVnpayIpn(
    query: Record<string, string | string[] | undefined>,
  ): Promise<IpnResponse> {
    const flat = normalizeVnpQuery(query)
    const vnpay = this.getVnpay()

    let verified: ReturnType<VNPay['verifyIpnCall']>
    try {
      verified = vnpay.verifyIpnCall(flat as ReturnQueryFromVNPay)
    } catch {
      return IpnUnknownError
    }

    if (!verified.isVerified) {
      return IpnFailChecksum
    }

    const paymentId = Number.parseInt(String(flat.vnp_TxnRef ?? ''), 10)
    if (!Number.isFinite(paymentId)) {
      return IpnOrderNotFound
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        booking: {
          include: PAYMENT_BOOKING_MAIL_INCLUDE,
        },
      },
    })
    if (!payment) {
      return IpnOrderNotFound
    }

    if (!verified.isSuccess) {
      await this.markPaymentFailedIfPending(paymentId, flat)
      return IpnSuccess
    }

    if (payment.status === 'SUCCESS') {
      return InpOrderAlreadyConfirmed
    }

    const expected = num(payment.amount)
    const got = Number(verified.vnp_Amount)
    if (
      expected == null ||
      roundMoney(expected) !== roundMoney(got)
    ) {
      return IpnInvalidAmount
    }

    const ok = await this.tryConfirmPaymentFromVerified(
      payment,
      verified,
      payment.booking,
    )
    return ok ? IpnSuccess : IpnUnknownError
  }

  private async markPaymentFailedIfPending(
    paymentId: number,
    flat: Record<string, string>,
  ): Promise<void> {
    const code = String(flat.vnp_TransactionNo ?? '')
    await this.prisma.payment.updateMany({
      where: { id: paymentId, status: 'PENDING' },
      data: {
        status: 'FAILED',
        transactionCode: code || null,
      },
    })
  }

  private async tryConfirmPaymentFromVerified(
    payment: {
      id: number
      bookingId: number
      status: string
      amount: unknown
    },
    verified: { vnp_Amount: number | string; vnp_TransactionNo?: number | string },
    booking: {
      id: number
      userId: number | null
      status: string
      numberOfPeople: number
      contactEmail: string | null
      contactFullName: string | null
      contactPhone: string | null
      contactAddress: string | null
      notes: string | null
      passengers: { ageCategory: string }[]
      schedule: {
        startDate: Date
        endDate: Date
        tour: {
          name: string
          departureLocation: { name: string | null } | null
        }
      }
    },
  ): Promise<boolean> {
    if (payment.status === 'SUCCESS') {
      return true
    }

    const expected = num(payment.amount)
    const got = Number(verified.vnp_Amount)
    if (
      expected == null ||
      roundMoney(expected) !== roundMoney(got)
    ) {
      return false
    }

    const txnRef = String(verified.vnp_TransactionNo ?? '')
    const paidAt = new Date()

    let shouldSendMail = false

    try {
      await this.prisma.$transaction(async (tx) => {
        const paid = await tx.payment.updateMany({
          where: { id: payment.id, status: 'PENDING' },
          data: {
            status: 'SUCCESS',
            transactionCode: txnRef || null,
            paidAtUtc: paidAt,
            paymentMethod: 'VNPAY',
            paymentGateway: 'VNPAY',
          },
        })
        if (paid.count !== 1) {
          return
        }

        const b = await tx.booking.updateMany({
          where: { id: booking.id, status: 'PENDING' },
          data: { status: 'CONFIRMED' },
        })
        if (b.count === 1) {
          await tx.bookingStatusHistory.create({
            data: {
              bookingId: booking.id,
              oldStatus: 'PENDING',
              newStatus: 'CONFIRMED',
            },
          })
          shouldSendMail = true
        } else {
          this.log.warn(
            `Thanh toán #${payment.id} đã SUCCESS nhưng booking #${booking.id} không còn PENDING — không gửi email, cần xử lý thủ công`,
          )
        }
      })
    } catch {
      return false
    }

    const emailTo = booking.contactEmail
    if (shouldSendMail && emailTo) {
      const passengerCounts = passengerCountsByAge(booking.passengers)
      void this.mail
        .sendBookingPaidConfirmation({
          to: emailTo,
          bookingId: booking.id,
          tourName: booking.schedule.tour.name,
          totalVnd: roundMoney(got),
          departureDate: booking.schedule.startDate.toISOString(),
          endDate: booking.schedule.endDate.toISOString(),
          departurePointLabel:
            booking.schedule.tour.departureLocation?.name?.trim() || null,
          contactFullName: booking.contactFullName,
          contactPhone: booking.contactPhone,
          contactAddress: booking.contactAddress,
          notes: booking.notes,
          numberOfPeople: booking.numberOfPeople,
          passengerCounts,
        })
        .catch((err) => {
          console.error('[payment] mail failed', err)
        })
    }

    if (shouldSendMail && booking.userId != null) {
      const code = `TBK${String(booking.id).padStart(6, '0')}`
      void this.notificationService
        .create(booking.userId, {
          title: 'Đặt tour thành công',
          content: `Thanh toán đã xác nhận cho tour "${booking.schedule.tour.name}". Mã đặt chỗ: ${code}.`,
        })
        .catch((err) => {
          this.log.warn(`[payment] in-app notification failed: ${String(err)}`)
        })
    }

    return true
  }
}

function normalizeVnpQuery(
  query: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined) continue
    out[k] = Array.isArray(v) ? v[0]! : v
  }
  return out
}
