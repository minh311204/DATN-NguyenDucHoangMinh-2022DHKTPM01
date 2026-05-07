# Hướng dẫn cài đặt và chạy chương trình (ĐATN)

Repository: [https://github.com/minh311204/DATN-NguyenDucHoangMinh-2022DHKTPM01](https://github.com/minh311204/DATN-NguyenDucHoangMinh-2022DHKTPM01)

Dự án gồm **một repository** (monorepo): phần **server** là API NestJS ở thư mục gốc, phần **client** gồm hai ứng dụng Next.js — **ứng dụng người dùng** (`src/user`) và **ứng dụng quản trị** (`src/admin`). Khác với mẫu Spring Boot + frontend tách repo, tại đây chỉ cần tải **một** dự án GitHub ở đường dẫn trên.

---

## 2.5.1 Cài đặt chương trình Server (API)

### Yêu cầu môi trường

1. **Node.js** (khuyến nghị LTS 20.x hoặc 22.x): truy cập [https://nodejs.org/en/download](https://nodejs.org/en/download), tải và cài đặt (kèm **npm**).

2. **MySQL** hoặc **MariaDB**: cài đặt và tạo một **database** riêng cho hệ thống (ví dụ `tour_booking`). API dùng Prisma với provider MySQL.

### Kiểm tra phiên bản

Mở terminal (PowerShell / CMD / bash) và chạy:

```bash
node -v
npm -v
```

### Tải mã nguồn

- **Cách 1 — Git clone:**  
  `git clone https://github.com/minh311204/DATN-NguyenDucHoangMinh-2022DHKTPM01.git`

- **Cách 2 — ZIP:** trên GitHub chọn **Code → Download ZIP**, giải nén vào thư mục làm việc.

### Cài đặt thư viện phía server

Trong thư mục gốc của dự án (nơi có file `package.json` chính):

```bash
npm install
```

### Cấu hình biến môi trường

Tạo file **`src/api/.env`** (không commit file này lên git nếu chứa mật khẩu). Tối thiểu để chạy local:

| Biến | Ý nghĩa | Ví dụ local |
|------|---------|--------------|
| `DATABASE_URL` | Chuỗi kết nối MySQL | `mysql://USER:PASSWORD@localhost:3306/tour_booking` |
| `JWT_SECRET` | Khóa ký JWT | Chuỗi bí mật đủ dài, ngẫu nhiên |
| `API_PORT` | Cổng API | `4000` |
| `API_PUBLIC_URL` | URL gốc của API | `http://localhost:4000` |
| `USER_APP_PUBLIC_URL` | URL app người dùng | `http://localhost:3000` |

Các biến tùy chọn (VNPay, SMTP, OAuth Google/Facebook, OpenAI, …) được mô tả trong `docs/booking-payment.md` và mã nguồn API.

### Khởi tạo cơ sở dữ liệu

Luôn chạy các lệnh sau **từ thư mục gốc** của dự án:

```bash
npx prisma generate --config src/api/prisma.config.ts
npx prisma migrate deploy --config src/api/prisma.config.ts
npm run db:seed
```

Lệnh `db:seed` tạo dữ liệu mẫu (nếu cần có thể bỏ qua tùy quy định triển khai).

### Khởi chạy API

```bash
npm run dev:api
```

API mặc định lắng nghe tại **http://localhost:4000** (hoặc cổng đặt trong `API_PORT`).

---

## 2.5.2 Cài đặt chương trình Client

Phần client **nằm trong cùng repository** đã tải ở mục 2.5.1; **không** cần repository frontend riêng.

### Yêu cầu

Đã cài **Node.js** và **npm** như mục 2.5.1.

### Cài đặt thư viện cho từng ứng dụng giao diện

Từ **thư mục gốc** của dự án:

```bash
npm install --prefix src/user
npm install --prefix src/admin
```

### (Tùy chọn) Biến môi trường frontend

Mặc định app trỏ API tới `http://localhost:4000`. Nếu đổi cổng hoặc host API, tạo **`src/user/.env.local`** và/hoặc **`src/admin/.env.local`** với:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Đăng nhập Google/Facebook trên app người dùng có thể cần thêm `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_FACEBOOK_APP_ID` (khi bật OAuth).

### Khởi chạy chương trình client

Cần **API đang chạy** (`npm run dev:api`). Mở **hai terminal** (hoặc hai cửa sổ terminal) tại thư mục gốc:

**Ứng dụng người dùng (cổng 3000):**

```bash
npm run dev:user
```

Truy cập: **http://localhost:3000**

**Ứng dụng quản trị (cổng 3001):**

```bash
npm run dev:admin
```

Truy cập: **http://localhost:3001**

---

## Tóm tắt thứ tự chạy khi phát triển

1. Bật MySQL, đảm bảo `DATABASE_URL` trong `src/api/.env` đúng.
2. Terminal 1: `npm run dev:api`
3. Terminal 2: `npm run dev:user`
4. Terminal 3: `npm run dev:admin`

---

## Ghi chú so với mẫu Spring Boot + FE riêng

| Mẫu tham khảo | Dự án này |
|----------------|-----------|
| OpenJDK + Maven (`mvn spring-boot:run`) | Node.js + npm + NestJS (`npm run dev:api`) |
| Repo backend + repo frontend | **Một repo**: API + `src/user` + `src/admin` |
| Không nêu DB trong mẫu ngắn | **Bắt buộc** MySQL/MariaDB + Prisma migrate |
