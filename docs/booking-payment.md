# Booking + Payment (VNPay) Documentation

## 1) Scope

Tài liệu này mô tả luồng nghiệp vụ và kỹ thuật cho:

- Booking tour (`/bookings`)
- Thanh toán VNPay (`/payments/vnpay/*`)
- Đồng bộ trạng thái booking sau thanh toán
- Gửi email xác nhận sau khi thanh toán thành công

## 2) Booking Flow

### 2.1 Create booking

Endpoint: `POST /bookings/` (JWT required)

Input chính:

- `tourScheduleId`
- `contact` (fullName, email, phone, address?)
- `passengerCounts` (adults, children, infants)
- `passengers[]` (fullName, dateOfBirth `YYYY-MM-DD`, ageCategory)

Business rules:

- Lịch tour phải tồn tại và chưa khởi hành.
- Một user không được tạo trùng booking `PENDING/CONFIRMED` cho cùng `tourScheduleId`.
- Guest (chưa login) vẫn có thể đặt tour; booking guest sẽ có `userId = null` và gắn danh tính qua `contactEmail`.
- Nếu `contactEmail` đã thuộc tài khoản đã đăng ký, bắt buộc đăng nhập (không cho guest đặt bằng email đó).
- Tour phải có giá (`priceOverride` hoặc `basePrice`).
- Validate tuổi theo `ageCategory` tại ngày khởi hành:
  - `ADULT`: >= 12
  - `CHILD`: 5-11
  - `INFANT`: < 24 tháng
- Validate tổng số dòng hành khách khớp `passengerCounts`.
- Giá tính theo rule:
  - Adult = 100%
  - Child = 50%
  - Infant = 0%
- `totalAmount` được chuẩn hóa về VND nguyên (`Math.round`) để đồng bộ với VNPay.
- Booking `PENDING` có TTL (`expiredAtUtc`, mặc định 30 phút).
- Giữ chỗ bằng transaction + optimistic concurrency trên `TourSchedule.bookedSeats`.

Output:

- `BookingResponse` với status mặc định `PENDING`.

### 2.2 Cancel booking (user)

Endpoint: `POST /bookings/:id/cancel` (JWT required)

Rules:

- Chỉ owner được hủy.
- `COMPLETED` không được hủy.
- Hủy sẽ giải phóng ghế tương ứng.
- Booking `PENDING` quá hạn TTL sẽ tự động chuyển `CANCELLED` và giải phóng ghế.

### 2.3 Update booking status (admin)

Endpoint: `PUT /bookings/:id/status` (ADMIN)

Transition matrix hiện tại:

- `PENDING` -> `CONFIRMED | CANCELLED | COMPLETED`
- `CONFIRMED` -> `COMPLETED | CANCELLED`
- `CANCELLED` -> `CONFIRMED`
- `COMPLETED` -> (không cho chuyển sang trạng thái khác)

Mọi chuyển trạng thái sai matrix sẽ trả `400`.

## 3) VNPay Payment Flow

### 3.1 Create VNPay payment URL

Endpoint: `POST /payments/vnpay/create` (JWT required)

Input:

- `bookingId`

Rules:

- Booking phải thuộc về user hiện tại.
- Booking phải đang `PENDING`.
- Chưa có payment `SUCCESS` cho booking.
- `booking.totalAmount` phải hợp lệ (> 0).

Xử lý:

- Tạo hoặc tái sử dụng payment `PENDING` gateway `VNPAY`.
- Đồng bộ `payment.amount` = số tiền VND nguyên gửi VNPay.
- Build `paymentUrl` với:
  - `vnp_TxnRef = payment.id`
  - `vnp_ReturnUrl = {API_PUBLIC_URL}/payments/vnpay/return`
  - `vnp_IpnUrl = {API_PUBLIC_URL}/payments/vnpay/ipn` (gửi khi URL public hoặc bật cờ env)

Response:

- `{ paymentUrl, paymentId }`

### 3.2 VNPay return (browser redirect)

Endpoint: `GET /payments/vnpay/return`

Xử lý:

- Verify chữ ký query trả về từ VNPay.
- Nếu success: xác nhận payment/booking (idempotent).
- Redirect về user app:
  - success: `{USER_APP_PUBLIC_URL}/book/{tourId}?payment=success&bookingId=...` — màn ĐẶT TOUR (thông báo + stepper HOÀN TẤT), sau vài giây về trang chủ `/`
  - nếu không có `tourId`: fallback `/?payment=success&bookingId=...`
  - fail: `/bookings?payment=failed&bookingId=...`
  - lỗi xử lý return: `/bookings?payment=error`
- Route `/checkout` (bookmark cũ): redirect sang `/bookings` cùng query.

### 3.3 VNPay IPN (server-to-server)

Endpoint: `POST /payments/vnpay/ipn`

Xử lý:

- Verify checksum.
- Validate payment tồn tại + số tiền khớp.
- Cập nhật `payment: PENDING -> SUCCESS`.
- Cập nhật `booking: PENDING -> CONFIRMED` + ghi history.
- Trả response code cho VNPay (`IpnSuccess`, `IpnInvalidAmount`, ...).

## 4) Email Confirmation

Service: `MailService.sendBookingPaidConfirmation()`

Trigger:

- Chỉ gửi mail khi transaction thanh toán đổi được:
  - `payment: PENDING -> SUCCESS`
  - và `booking: PENDING -> CONFIRMED`

Nếu payment success nhưng booking không còn `PENDING`:

- Không gửi mail.
- Ghi warning log để xử lý thủ công.

## 5) Environment Variables

### 5.1 Core

- `DATABASE_URL`
- `JWT_SECRET`
- `API_PORT`
- `API_PUBLIC_URL`
- `USER_APP_PUBLIC_URL`
- `BOOKING_PENDING_TTL_MINUTES` (optional, mặc định `30`)

### 5.2 VNPay

- `VNPAY_TMN_CODE`
- `VNPAY_HASH_SECRET`
- `VNPAY_TEST_MODE=true|false`
- `VNPAY_HASH_ALGORITHM=SHA512|SHA256` (mặc định SHA512)
- `VNPAY_INCLUDE_IPN_URL=true|false` (optional)

### 5.3 SMTP (SendGrid example)

- `SMTP_HOST=smtp.sendgrid.net`
- `SMTP_PORT=587`
- `SMTP_SECURE=false`
- `SMTP_USER=apikey`
- `SMTP_PASS=<sendgrid_api_key>`
- `SMTP_FROM=<verified_sender_email>`

## 6) Operational Notes

- Localhost không nhận IPN trực tiếp từ VNPay; cần public URL (ngrok/cloudflared).
- Return URL vẫn test được trên local vì là browser redirect.
- Cần rotate secret/API keys nếu từng lộ trong logs/chat.

## 7) Suggested Test Cases

1. Booking thành công với đủ `adult/child/infant`.
2. Booking fail khi lịch đã qua hoặc thiếu giá.
3. Overbooking race: 2 request đồng thời vượt chỗ.
4. Create payment URL với booking `PENDING`.
5. Callback success -> payment `SUCCESS`, booking `CONFIRMED`, có email.
6. Callback thất bại -> payment `FAILED`, booking không `CONFIRMED`.
7. Idempotency callback (gọi lại return/ipn không double update).
8. Admin transition sai matrix -> trả `400`.

