import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common'
import type { Request, Response } from 'express'
import { PaymentStatus } from '@prisma/client'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { PaymentService } from './payment.service'

const PAYMENT_STATUSES: PaymentStatus[] = ['PENDING', 'SUCCESS', 'FAILED']

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /** Admin: danh sách thanh toán (lọc theo status / booking). */
  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async listAdmin(
    @Query('status') status?: string,
    @Query('bookingId') bookingId?: string,
    @Query('take') take?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    let st: PaymentStatus | undefined
    if (status != null && status !== '') {
      if (!PAYMENT_STATUSES.includes(status as PaymentStatus)) {
        throw new BadRequestException('status phải là PENDING, SUCCESS hoặc FAILED')
      }
      st = status as PaymentStatus
    }
    let bid: number | undefined
    if (bookingId != null && bookingId !== '') {
      bid = Number(bookingId)
      if (!Number.isFinite(bid)) {
        throw new BadRequestException('bookingId không hợp lệ')
      }
    }
    let t: number | undefined
    if (take != null && take !== '') {
      t = Number(take)
      if (!Number.isFinite(t)) {
        throw new BadRequestException('take không hợp lệ')
      }
    }
    let pg: number | undefined
    if (page != null && page !== '') {
      pg = Number(page)
      if (!Number.isFinite(pg) || pg < 1) {
        throw new BadRequestException('page không hợp lệ')
      }
    }
    let ps: number | undefined
    if (pageSize != null && pageSize !== '') {
      ps = Number(pageSize)
      if (!Number.isFinite(ps) || ps < 1) {
        throw new BadRequestException('pageSize không hợp lệ')
      }
    }
    return this.paymentService.listForAdmin({
      status: st,
      bookingId: bid,
      take: t,
      page: pg,
      pageSize: ps,
    })
  }

  @Post('vnpay/create')
  @UseGuards(OptionalJwtAuthGuard)
  async createVnpay(
    @CurrentUser() user: { id: number } | null,
    @Body() body: { bookingId?: number; contactEmail?: string },
    @Req() req: Request,
  ) {
    const bookingId = Number(body?.bookingId)
    if (!Number.isFinite(bookingId)) {
      throw new BadRequestException('bookingId không hợp lệ')
    }
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      '127.0.0.1'
    return this.paymentService.createVnpayPayment(
      user?.id ?? null,
      bookingId,
      ip,
      body?.contactEmail,
    )
  }

  @Get('vnpay/return')
  async vnpayReturn(
    @Query() query: Record<string, string | string[] | undefined>,
    @Res() res: Response,
  ) {
    const userBase = process.env.USER_APP_PUBLIC_URL || 'http://localhost:3000'
    const base = userBase.replace(/\/$/, '')
    try {
      const r = await this.paymentService.handleVnpayReturn(query)
      const booking = r.bookingId != null ? `&bookingId=${r.bookingId}` : ''
      if (r.ok) {
        const qp = new URLSearchParams()
        qp.set('payment', 'success')
        if (r.bookingId != null) qp.set('bookingId', String(r.bookingId))
        const qs = qp.toString()
        if (r.tourId != null) {
          return res.redirect(302, `${base}/book/${r.tourId}?${qs}`)
        }
        return res.redirect(302, `${base}/?${qs}`)
      }
      return res.redirect(
        302,
        `${base}/bookings?payment=failed${booking}`,
      )
    } catch {
      return res.redirect(302, `${base}/bookings?payment=error`)
    }
  }

  @Post('vnpay/ipn')
  async vnpayIpn(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const merged = {
      ...req.query,
      ...req.body,
    } as Record<string, string | string[] | undefined>
    try {
      const out = await this.paymentService.handleVnpayIpn(merged)
      return res.status(200).json(out)
    } catch {
      return res.status(200).json({ RspCode: '99', Message: 'Unknown error' })
    }
  }
}
