export function formatVnd(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) {
    return "—";
  }
  return `${new Intl.NumberFormat("vi-VN").format(n)}đ`;
}

export function errorMessage(body: unknown, status?: number): string {
  if (status === 403) {
    return "Không có quyền. Hành động này yêu cầu quyền ADMIN (hoặc bạn chưa đăng nhập đúng tài khoản).";
  }
  if (status === 401) {
    return "Phiên đăng nhập hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.";
  }
  if (body && typeof body === "object") {
    const o = body as Record<string, unknown>;
    if (typeof o.message === "string") return o.message;
    if (
      Array.isArray(o.message) &&
      o.message.length > 0 &&
      typeof o.message[0] === "string"
    ) {
      return o.message.join(", ");
    }
  }
  return "Đã có lỗi xảy ra";
}

export function formatDateTimeVi(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

export function formatDateVi(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(
      new Date(iso),
    );
  } catch {
    return "—";
  }
}

const TOUR_LINE_LABEL: Record<string, string> = {
  PREMIUM: "Cao cấp",
  STANDARD: "Tiêu chuẩn",
  ECONOMY: "Tiết kiệm",
  GOOD_VALUE: "Giá tốt",
};

/** Giá trị enum API / form tour — dùng cho `<select>` lọc dòng tour */
export const TOUR_LINE_VALUES = [
  "PREMIUM",
  "STANDARD",
  "ECONOMY",
  "GOOD_VALUE",
] as const;

const TRANSPORT_LABEL: Record<string, string> = {
  BUS: "Xe khách",
  FLIGHT: "Máy bay",
  MIXED: "Kết hợp",
};

export function labelTourLine(v: string | null | undefined): string {
  if (!v) return "—";
  return TOUR_LINE_LABEL[v] ?? v;
}

export function labelTransport(v: string | null | undefined): string {
  if (!v) return "—";
  return TRANSPORT_LABEL[v] ?? v;
}

const BOOKING_STATUS_LABEL: Record<string, string> = {
  PENDING: "Chờ xử lý",
  CONFIRMED: "Đã xác nhận",
  CANCELLED: "Đã hủy",
  COMPLETED: "Hoàn tất",
};

export function labelBookingStatus(v: string | null | undefined): string {
  if (!v) return "—";
  return BOOKING_STATUS_LABEL[v] ?? v;
}

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: "Chờ thanh toán",
  SUCCESS: "Thành công",
  FAILED: "Thất bại",
};

export function labelPaymentStatus(v: string | null | undefined): string {
  if (!v) return "—";
  return PAYMENT_STATUS_LABEL[v] ?? v;
}
