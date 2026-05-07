import { API_BASE_URL } from "./env";
import { AUTH_KEYS } from "./auth-storage";

export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";

export type BookingCancellationRequestState = "NONE" | "PENDING" | "REJECTED";

export type BookingPassengerAgeCategory = "ADULT" | "CHILD" | "INFANT";

export type TourScheduleBrief = {
  id: number;
  startDate: string;
  endDate: string;
  remainingSeats?: number | null;
  priceOverride?: number | null;
  adultPrice?: number | null;
  childPrice?: number | null;
  infantPrice?: number | null;
  tour: { id: number; name: string; basePrice?: number | null };
};

export type BookingPassenger = {
  id: number;
  bookingId: number;
  ageCategory: BookingPassengerAgeCategory;
  fullName: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  passportNumber?: string | null;
};

export type BookingContact = {
  fullName: string;
  email: string;
  phone: string;
  address?: string;
};

export type BookingListItem = {
  id: number;
  userId: number | null;
  tourScheduleId: number;
  numberOfPeople: number;
  bookingDateUtc?: string | null;
  totalAmount?: number | null;
  status: BookingStatus;
  cancelMinDaysBeforeDeparture: number;
  cancellationRequestState: BookingCancellationRequestState;
  cancellationRequestedAtUtc?: string | null;
  cancellationRejectedAtUtc?: string | null;
  cancellationApprovedAtUtc?: string | null;
  contact: BookingContact;
  notes?: string | null;
  passengerCounts: { adults: number; children: number; infants: number };
  schedule: TourScheduleBrief;
  passengers: BookingPassenger[];
};

export type CreateBookingPassengerInput = {
  fullName: string;
  gender?: string | null;
  dateOfBirth: string; // YYYY-MM-DD
  ageCategory: BookingPassengerAgeCategory;
};

export type CreateBookingInput = {
  tourScheduleId: number;
  contact: BookingContact;
  passengerCounts: { adults: number; children: number; infants: number };
  passengers: CreateBookingPassengerInput[];
  notes?: string;
  singleRoomCount?: number;
  discountCode?: string;
};

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_KEYS.accessToken);
}

type NextFetch = RequestInit;

async function authedRequest<T>(path: string, init: NextFetch) {
  const token = getAccessToken();
  if (!token) {
    return {
      ok: false as const,
      status: 401,
      body: { message: "Chưa đăng nhập" },
    };
  }

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers as Record<string, string> | undefined),
        Authorization: `Bearer ${token}`,
      },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false as const, status: res.status, body };
    return { ok: true as const, data: body as T };
  } catch {
    return {
      ok: false as const,
      status: 0,
      body: { message: "Không kết nối được API (kiểm tra backend đang chạy)." },
    };
  }
}

async function requestWithOptionalAuth<T>(path: string, init: NextFetch) {
  const token = getAccessToken();
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers as Record<string, string> | undefined),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false as const, status: res.status, body };
    return { ok: true as const, data: body as T };
  } catch {
    return {
      ok: false as const,
      status: 0,
      body: { message: "Không kết nối được API (kiểm tra backend đang chạy)." },
    };
  }
}

export async function createBooking(input: CreateBookingInput) {
  return requestWithOptionalAuth<BookingListItem>("/bookings/", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function previewPromo(body: {
  code: string;
  tourId: number;
  subtotalBeforeDiscount: number;
}) {
  return requestWithOptionalAuth<{ discountAmount: number }>("/bookings/promo/preview", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export type VnpayCreatePaymentResult = {
  paymentUrl: string;
  paymentId: number;
};

export async function createVnpayPayment(bookingId: number, contactEmail?: string) {
  return requestWithOptionalAuth<VnpayCreatePaymentResult>("/payments/vnpay/create", {
    method: "POST",
    body: JSON.stringify({ bookingId, contactEmail }),
  });
}

export async function getMyBookings() {
  return authedRequest<BookingListItem[]>("/bookings/me", {
    method: "GET",
  });
}

/**
 * Phân tích mã đặt chỗ hiển thị dạng BK-123 (hoặc chỉ số).
 * Trả về id số hoặc null nếu không hợp lệ.
 */
export function parseBookingCode(raw: string): number | null {
  const t = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (!t) return null;
  const withoutPrefix = t.startsWith("BK-") ? t.slice(3) : t;
  if (!/^\d+$/.test(withoutPrefix)) return null;
  const n = Number(withoutPrefix);
  if (!Number.isSafeInteger(n) || n < 1) return null;
  return n;
}

/** Chi tiết một booking — chỉ khi đặt chỗ thuộc tài khoản đang đăng nhập (hoặc admin). */
export async function getBookingById(id: number) {
  return authedRequest<BookingListItem>(`/bookings/${id}`, {
    method: "GET",
  });
}

/** Gửi yêu cầu hủy (admin duyệt). Trong khung: còn ít nhất cancelMinDaysBeforeDeparture ngày trước khởi hành. */
export async function cancelMyBooking(id: number) {
  return authedRequest<BookingListItem>(`/bookings/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

