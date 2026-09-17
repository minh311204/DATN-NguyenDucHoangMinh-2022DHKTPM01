import { Injectable, Logger } from '@nestjs/common'
import * as nodemailer from 'nodemailer'

export type BookingConfirmationPayload = {
  to: string
  bookingId: number
  tourName: string
  totalVnd: number
  departureDate: string
  /** Ngày kết thúc lịch (nếu có) */
  endDate?: string | null
  /** Điểm khởi hành hiển thị (tên địa điểm) */
  departurePointLabel?: string | null
  contactFullName?: string | null
  contactPhone?: string | null
  contactAddress?: string | null
  notes?: string | null
  numberOfPeople: number
  passengerCounts: {
    adult: number
    child: number
    infant: number
  }
}

@Injectable()
export class MailService {
  private readonly log = new Logger(MailService.name)

  /** Gửi qua SMTP (SendGrid) hoặc ghi log nếu chưa cấu hình. */
  private async sendOrLogEmail(opts: {
    to: string
    subject: string
    text: string
    html: string
  }): Promise<void> {
    const host = process.env.SMTP_HOST
    const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'noreply@localhost'

    if (!host) {
      this.log.warn(
        `SMTP_HOST chưa cấu hình — ghi log thay vì gửi email tới ${opts.to}`,
      )
      this.log.log(`[email preview subject=${opts.subject}]\n${opts.text}`)
      return
    }

    const port = Number(process.env.SMTP_PORT) || 587
    const secure = process.env.SMTP_SECURE === 'true'
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASS

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    })

    await transporter.sendMail({
      from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    })
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    const subject = '[TourBooking] Đặt lại mật khẩu'
    const text = [
      `Xin chào,`,
      ``,
      `Bạn (hoặc ai đó) đã yêu cầu đặt lại mật khẩu cho tài khoản TourBooking.`,
      `Mở liên kết sau (có hiệu lực trong 1 giờ):`,
      resetUrl,
      ``,
      `Nếu bạn không yêu cầu, vui lòng bỏ qua email này.`,
    ].join('\n')
    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#222;max-width:560px;">
        <p>Xin chào,</p>
        <p>Bạn đã yêu cầu đặt lại mật khẩu. Nhấn nút bên dưới (hiệu lực trong 1 giờ):</p>
        <p><a href="${escapeHtml(resetUrl)}" style="display:inline-block;padding:10px 18px;background:#0d9488;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Đặt lại mật khẩu</a></p>
        <p style="font-size:13px;color:#666;">Hoặc copy liên kết: ${escapeHtml(resetUrl)}</p>
        <p style="font-size:13px;color:#666;">Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
      </div>`
    await this.sendOrLogEmail({ to, subject, text, html })
  }

  async sendEmailVerificationEmail(to: string, verifyUrl: string): Promise<void> {
    const subject = '[TourBooking] Xác nhận đăng ký tài khoản'
    const text = [
      `Xin chào,`,
      ``,
      `Cảm ơn bạn đã đăng ký TourBooking.`,
      `Vui lòng mở liên kết sau để kích hoạt tài khoản (hiệu lực trong 24 giờ):`,
      verifyUrl,
      ``,
      `Nếu bạn không đăng ký, vui lòng bỏ qua email này.`,
    ].join('\n')
    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#222;max-width:560px;">
        <p>Xin chào,</p>
        <p>Cảm ơn bạn đã đăng ký. Nhấn nút để xác nhận email và kích hoạt tài khoản (24 giờ):</p>
        <p><a href="${escapeHtml(verifyUrl)}" style="display:inline-block;padding:10px 18px;background:#0d9488;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Xác nhận email</a></p>
        <p style="font-size:13px;color:#666;">Hoặc copy liên kết: ${escapeHtml(verifyUrl)}</p>
      </div>`
    await this.sendOrLogEmail({ to, subject, text, html })
  }

  async sendBookingPaidConfirmation(payload: BookingConfirmationPayload): Promise<void> {
    const subject = `[Tour] Xác nhận đặt tour thành công — Mã #${payload.bookingId}`
    const departureText = formatDateTimeVn(payload.departureDate)
    const endText =
      payload.endDate != null && payload.endDate !== ''
        ? formatDateTimeVn(payload.endDate)
        : null
    const paidAtText = formatDateTimeVn(new Date().toISOString())
    const bookingCode = `TBK${String(payload.bookingId).padStart(6, '0')}`
    const totalText = formatMoneyVnd(payload.totalVnd)
    const departurePoint =
      payload.departurePointLabel?.trim() || 'Theo lịch tour đã đặt'
    const { adult, child, infant } = payload.passengerCounts
    const hasBreakdown = adult + child + infant > 0
    const passengerLine = hasBreakdown
      ? `Số khách: ${payload.numberOfPeople} (Người lớn: ${adult}, Trẻ em: ${child}, Em bé: ${infant})`
      : `Số khách: ${payload.numberOfPeople}`

    const text = [
      `Xin chào,`,
      ``,
      `Đơn đặt tour #${payload.bookingId} đã được xác nhận và thanh toán thành công.`,
      `Tour: ${payload.tourName}`,
      `Mã booking: ${bookingCode}`,
      `Ngày khởi hành: ${departureText}`,
      ...(endText ? [`Ngày về: ${endText}`] : []),
      `Điểm khởi hành: ${departurePoint}`,
      passengerLine,
      `Trị giá booking: ${totalText}`,
      `Thời gian xác nhận: ${paidAtText}`,
      ``,
      `Thông tin liên lạc:`,
      `Họ tên: ${payload.contactFullName?.trim() || '—'}`,
      `Địa chỉ: ${payload.contactAddress?.trim() || '—'}`,
      `Điện thoại: ${payload.contactPhone?.trim() || '—'}`,
      `Email: ${payload.to}`,
      `Ghi chú: ${payload.notes?.trim() || '—'}`,
      ``,
      `Cảm ơn bạn đã đặt tour.`,
    ].join('\n')

    const html = `
      <div style="margin:0;padding:0;background:#f2f2f2;font-family:Arial,Helvetica,sans-serif;color:#222;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f2f2f2;padding:18px 0;">
          <tr>
            <td align="center">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="760" style="max-width:760px;width:100%;background:#fff;border:1px solid #d8d8d8;">
                <tr>
                  <td style="padding:16px 20px 8px;border-top:2px solid #bfbfbf;">
                    <div style="text-align:center;font-size:36px;line-height:1;font-weight:700;letter-spacing:0.4px;color:#2b2b2b;">TourBooking</div>
                    <div style="margin-top:8px;border-top:1px dotted #bcbcbc;"></div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 20px 20px;">
                    <h2 style="margin:0 0 14px;text-align:center;font-size:34px;line-height:1.1;font-weight:700;color:#111;">BOOKING CỦA QUÝ KHÁCH</h2>
                    <div style="border-top:1px dotted #bcbcbc;margin:0 0 16px;"></div>

                    <p style="margin:0 0 8px;color:#d40000;font-weight:700;">I. PHIẾU XÁC NHẬN BOOKING:</p>
                    <p style="margin:0 0 8px;color:#0057a8;font-size:16px;line-height:1.35;">
                      ${escapeHtml(payload.tourName)}
                    </p>

                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;margin:0 0 14px;">
                      <tr>
                        <td style="width:190px;background:#f6f6f6;border:1px solid #e4e4e4;padding:6px 8px;text-align:right;">Mã tour:</td>
                        <td style="border:1px solid #e4e4e4;padding:6px 8px;">${escapeHtml(bookingCode)}</td>
                      </tr>
                      <tr>
                        <td style="background:#f6f6f6;border:1px solid #e4e4e4;padding:6px 8px;text-align:right;">Ngày đi:</td>
                        <td style="border:1px solid #e4e4e4;padding:6px 8px;">${escapeHtml(departureText)}</td>
                      </tr>
                      ${
                        endText
                          ? `<tr>
                        <td style="background:#f6f6f6;border:1px solid #e4e4e4;padding:6px 8px;text-align:right;">Ngày về:</td>
                        <td style="border:1px solid #e4e4e4;padding:6px 8px;">${escapeHtml(endText)}</td>
                      </tr>`
                          : ''
                      }
                      <tr>
                        <td style="background:#f6f6f6;border:1px solid #e4e4e4;padding:6px 8px;text-align:right;">Điểm khởi hành:</td>
                        <td style="border:1px solid #e4e4e4;padding:6px 8px;">${escapeHtml(departurePoint)}</td>
                      </tr>
                    </table>

                    <p style="margin:0 0 8px;color:#d40000;font-weight:700;">II. CHI TIẾT BOOKING:</p>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;margin:0 0 14px;">
                      <tr>
                        <td style="width:190px;background:#f6f6f6;border:1px solid #e4e4e4;padding:6px 8px;text-align:right;">Số booking:</td>
                        <td style="border:1px solid #e4e4e4;padding:6px 8px;">
                          ${payload.bookingId}
                          <span style="color:#6a6a6a;font-style:italic;"> (vui lòng lưu để đối soát)</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="background:#f6f6f6;border:1px solid #e4e4e4;padding:6px 8px;text-align:right;">Trị giá booking:</td>
                        <td style="border:1px solid #e4e4e4;padding:6px 8px;color:#d40000;font-weight:700;">${escapeHtml(totalText)}</td>
                      </tr>
                      <tr>
                        <td style="background:#f6f6f6;border:1px solid #e4e4e4;padding:6px 8px;text-align:right;">Ngày xác nhận:</td>
                        <td style="border:1px solid #e4e4e4;padding:6px 8px;">${escapeHtml(paidAtText)} (Theo giờ Việt Nam)</td>
                      </tr>
                      <tr>
                        <td style="background:#f6f6f6;border:1px solid #e4e4e4;padding:6px 8px;text-align:right;">Tình trạng:</td>
                        <td style="border:1px solid #e4e4e4;padding:6px 8px;color:#d40000;font-weight:700;">
                          Booking của quý khách đã được chúng tôi xác nhận thành công
                        </td>
                      </tr>
                      <tr>
                        <td style="background:#f6f6f6;border:1px solid #e4e4e4;padding:6px 8px;text-align:right;vertical-align:top;">Số khách:</td>
                        <td style="border:1px solid #e4e4e4;padding:6px 8px;">
                          <strong>${payload.numberOfPeople}</strong>
                          ${
                            hasBreakdown
                              ? `<div style="margin-top:6px;font-size:13px;color:#444;line-height:1.45;">
                            Người lớn: <strong>${adult}</strong> &nbsp;|&nbsp;
                            Trẻ em: <strong>${child}</strong> &nbsp;|&nbsp;
                            Em bé: <strong>${infant}</strong>
                          </div>`
                              : ''
                          }
                        </td>
                      </tr>
                    </table>

                    <p style="margin:0 0 8px;color:#d40000;font-weight:700;">III. THÔNG TIN LIÊN LẠC:</p>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;">
                      <tr>
                        <td style="width:190px;background:#f6f6f6;border:1px solid #e4e4e4;padding:6px 8px;text-align:right;">Họ tên:</td>
                        <td style="border:1px solid #e4e4e4;padding:6px 8px;">${cellOrDash(payload.contactFullName)}</td>
                      </tr>
                      <tr>
                        <td style="background:#f6f6f6;border:1px solid #e4e4e4;padding:6px 8px;text-align:right;">Địa chỉ:</td>
                        <td style="border:1px solid #e4e4e4;padding:6px 8px;">${cellOrDash(payload.contactAddress)}</td>
                      </tr>
                      <tr>
                        <td style="background:#f6f6f6;border:1px solid #e4e4e4;padding:6px 8px;text-align:right;">Điện thoại:</td>
                        <td style="border:1px solid #e4e4e4;padding:6px 8px;">${cellOrDash(payload.contactPhone)}</td>
                      </tr>
                      <tr>
                        <td style="width:190px;background:#f6f6f6;border:1px solid #e4e4e4;padding:6px 8px;text-align:right;">Email:</td>
                        <td style="border:1px solid #e4e4e4;padding:6px 8px;color:#0057a8;">${escapeHtml(payload.to)}</td>
                      </tr>
                      <tr>
                        <td style="background:#f6f6f6;border:1px solid #e4e4e4;padding:6px 8px;text-align:right;vertical-align:top;">Ghi chú:</td>
                        <td style="border:1px solid #e4e4e4;padding:6px 8px;">${notesCell(payload.notes)}</td>
                      </tr>
                    </table>

                    <p style="margin:14px 0 0;">Chúc quý khách có một chuyến du lịch thật vui vẻ và bổ ích!</p>
                    <p style="margin:8px 0 0;color:#666;font-size:12px;">
                      Email được gửi tự động từ hệ thống TourBooking.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `

    await this.sendOrLogEmail({
      to: payload.to,
      subject,
      text,
      html,
    })
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function cellOrDash(s: string | null | undefined): string {
  const t = s?.trim()
  if (!t) return '<span style="color:#888;">—</span>'
  return escapeHtml(t)
}

function notesCell(notes: string | null | undefined): string {
  const t = notes?.trim()
  const userPart = t
    ? escapeHtml(t).replace(/\n/g, '<br/>')
    : '<span style="color:#888;">Không có ghi chú</span>'
  return `${userPart}<div style="margin-top:8px;font-size:12px;color:#666;">Nếu cần hỗ trợ, vui lòng phản hồi email này hoặc liên hệ hotline.</div>`
}

function formatDateTimeVn(isoOrDate: string): string {
  const d = new Date(isoOrDate)
  if (Number.isNaN(d.getTime())) return isoOrDate
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)
}

function formatMoneyVnd(v: number): string {
  return `${v.toLocaleString('vi-VN')} đ`
}
