"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  CreditCard,
  ExternalLink,
  MapPin,
  Search,
  Star,
  Users,
} from "lucide-react";
import {
  cancelMyBooking,
  createVnpayPayment,
  getBookingById,
  getMyBookings,
  parseBookingCode,
  type BookingListItem,
} from "@/lib/client-booking";
import { clearAuthStorage, hasAccessToken } from "@/lib/auth-storage";
import { ensureSessionFresh } from "@/lib/client-auth";
import { errorMessage, formatVnd } from "@/lib/format";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatVnDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

function isScheduleEnded(endDate?: string | null): boolean {
  if (!endDate) return false;
  return new Date(endDate) < new Date();
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Đủ điều kiện gửi yêu cầu hủy theo chính sách ngày (khớp server). */
function canSubmitCancellationRequest(row: BookingListItem): boolean {
  const minDays = row.cancelMinDaysBeforeDeparture ?? 0;
  if (minDays <= 0) return true;
  if (!row.schedule?.startDate) return false;
  const dep = new Date(row.schedule.startDate).getTime();
  return dep - Date.now() >= minDays * MS_PER_DAY;
}

const STATUS_CONFIG: Record<
  BookingListItem["status"],
  { label: string; badge: string; dot: string }
> = {
  PENDING: {
    label: "Chờ xác nhận",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-400",
  },
  CONFIRMED: {
    label: "Đã xác nhận",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  CANCELLED: {
    label: "Đã hủy",
    badge: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-400",
  },
  COMPLETED: {
    label: "Hoàn tất",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
};

function BookingCard({
  row,
  onRepay,
  paying,
  highlighted,
  onRowUpdate,
}: {
  row: BookingListItem;
  onRepay: (id: number) => void;
  paying: boolean;
  highlighted?: boolean;
  onRowUpdate: (next: BookingListItem) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [cancelErr, setCancelErr] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const cfg = STATUS_CONFIG[row.status];
  const tourId = row.schedule?.tour?.id;
  const tourName = row.schedule?.tour?.name ?? "Tour";
  const startDate = row.schedule?.startDate;
  const endDate = row.schedule?.endDate;
  const minCancelDays = row.cancelMinDaysBeforeDeparture ?? 3;
  const isCancellationPending = row.cancellationRequestState === "PENDING";
  const isCancellationRejected = row.cancellationRequestState === "REJECTED";
  const canSubmitCancellation =
    (row.status === "PENDING" || row.status === "CONFIRMED") &&
    !isCancellationPending &&
    canSubmitCancellationRequest(row);
  const couldCancelButOutsideWindow =
    (row.status === "PENDING" || row.status === "CONFIRMED") &&
    !isCancellationPending &&
    !canSubmitCancellationRequest(row);

  async function onBookingActions(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCancelErr(null);
    if (!canSubmitCancellation || cancelling) return;
    const ok = window.confirm(
      `Gửi yêu cầu hủy BK-${row.id}? Admin sẽ xử lý; hủy có điều kiện hoàn tiền chỉ khi còn ít nhất ${minCancelDays} ngày trước giờ khởi hành.`,
    );
    if (!ok) return;
    setCancelling(true);
    const res = await cancelMyBooking(row.id);
    setCancelling(false);
    if (!res.ok) {
      setCancelErr(errorMessage(res.body));
      return;
    }
    onRowUpdate(res.data);
    setExpanded(false);
  }
  const canReview =
    row.status === "COMPLETED" && isScheduleEnded(endDate);
  const canReviewSoon =
    row.status === "CONFIRMED" && isScheduleEnded(endDate);

  return (
    <li
      id={`booking-card-${row.id}`}
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md ${
        highlighted
          ? "border-teal-400 ring-2 ring-teal-300/60"
          : "border-stone-200"
      }`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className={`inline-block h-2 w-2 rounded-full ${cfg.dot}`} />
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.badge}`}>
            {cfg.label}
          </span>
          {isCancellationPending ? (
            <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
              Chờ duyệt hủy
            </span>
          ) : null}
          <span className="font-mono text-xs text-stone-400">BK-{row.id}</span>
        </div>
        <span className="text-sm font-bold text-stone-900">
          {formatVnd(row.totalAmount ?? null)}
        </span>
      </div>

      {/* Main info */}
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {/* Tour name with link */}
            <div className="flex items-start gap-2">
              <h3 className="line-clamp-2 font-semibold text-stone-900">{tourName}</h3>
              {tourId ? (
                <Link
                  href={`/tours/${tourId}`}
                  target="_blank"
                  title="Xem trang tour"
                  className="mt-0.5 shrink-0 text-teal-600 hover:text-teal-700"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              ) : null}
            </div>

            {/* Dates */}
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-stone-500">
              {startDate ? (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 shrink-0 text-teal-600" />
                  Khởi hành: <strong className="text-stone-700">{formatVnDate(startDate)}</strong>
                </span>
              ) : null}
              {endDate ? (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4 shrink-0 text-teal-600" />
                  Kết thúc: <strong className="text-stone-700">{formatVnDate(endDate)}</strong>
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4 shrink-0 text-teal-600" />
                {row.numberOfPeople} khách
              </span>
            </div>

            {couldCancelButOutsideWindow ? (
              <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-600">
                Đã quá thời hạn gửi yêu cầu hủy có điều kiện hoàn tiền: cần gửi trước{" "}
                <strong>ít nhất {minCancelDays} ngày</strong> trước giờ khởi hành. Liên hệ
                hotline nếu bạn cần hỗ trợ đặc biệt.
              </div>
            ) : null}

            {isCancellationPending ? (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                <span className="text-xs text-amber-900">
                  Yêu cầu hủy đã gửi — đang chờ admin xác nhận. Nếu được duyệt, hoàn tiền sẽ xử lý
                  theo chính sách (thời điểm duyệt vẫn phải trong hạn hủy).
                </span>
              </div>
            ) : null}

            {isCancellationRejected && !isCancellationPending ? (
              <div className="mt-3 rounded-xl border border-red-100 bg-red-50/80 px-3 py-2 text-xs text-red-800">
                Yêu cầu hủy trước đó bị từ chối.
                {canSubmitCancellation ? " Bạn có thể gửi yêu cầu mới nếu vẫn trong thời hạn." : null}
              </div>
            ) : null}

            {canReview ? (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" />
                <span className="text-xs text-amber-800">
                  Tour đã hoàn tất — hãy chia sẻ trải nghiệm của bạn!
                </span>
                {tourId ? (
                  <Link
                    href={`/tours/${tourId}#reviews`}
                    className="ml-auto shrink-0 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500"
                  >
                    Viết đánh giá
                  </Link>
                ) : null}
              </div>
            ) : canReviewSoon ? (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
                <Star className="h-4 w-4 shrink-0 text-blue-400" />
                <span className="text-xs text-blue-700">
                  Tour đã kết thúc — bạn có thể viết đánh giá ngay.
                </span>
                {tourId ? (
                  <Link
                    href={`/tours/${tourId}#reviews`}
                    className="ml-auto shrink-0 rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-600"
                  >
                    Đánh giá
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {/* Form thao tác trên đơn: Xem chi tiết (mở rộng ngay tại đây) / Hủy */}
        <form
          onSubmit={onBookingActions}
          className="mt-4 rounded-xl border border-stone-100 bg-stone-50/80 p-3"
        >
          <input type="hidden" name="bookingId" value={row.id} />
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-stone-400">
            Thao tác đặt chỗ
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {tourId ? (
              <Link
                href={`/tours/${tourId}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-white px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-50"
              >
                <MapPin className="h-3.5 w-3.5" />
                Xem tour
              </Link>
            ) : null}

            {row.status === "PENDING" ? (
              <button
                type="button"
                onClick={() => onRepay(row.id)}
                disabled={paying}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
              >
                <CreditCard className="h-3.5 w-3.5" />
                {paying ? "Đang tạo link…" : "Thanh toán"}
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100"
            >
              {expanded ? (
                <>
                  Thu gọn chi tiết <ChevronUp className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  Xem chi tiết <ChevronDown className="h-3.5 w-3.5" />
                </>
              )}
            </button>

            {canSubmitCancellation ? (
              <button
                type="submit"
                disabled={cancelling}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
              >
                {cancelling ? "Đang gửi…" : "Gửi yêu cầu hủy"}
              </button>
            ) : null}
          </div>
          {cancelErr ? (
            <p className="mt-2 text-xs text-red-600">{cancelErr}</p>
          ) : null}
        </form>

        {expanded ? (
          <div className="mt-4 space-y-3 border-t border-stone-100 pt-4 text-sm text-stone-700">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
              Chi tiết đặt chỗ
            </p>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                Thông tin liên hệ
              </p>
              <p className="mt-1">
                {row.contact?.fullName ?? "—"} ·{" "}
                <span className="text-stone-500">{row.contact?.email ?? "—"}</span> ·{" "}
                <span className="text-stone-500">{row.contact?.phone ?? "—"}</span>
              </p>
              {row.contact?.address ? (
                <p className="mt-0.5 text-stone-500">{row.contact.address}</p>
              ) : null}
            </div>

            {row.passengers && row.passengers.length > 0 ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                  Hành khách ({row.passengers.length})
                </p>
                <ul className="mt-1 space-y-1">
                  {row.passengers.map((p) => (
                    <li key={p.id} className="flex items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          p.ageCategory === "ADULT"
                            ? "bg-blue-50 text-blue-600"
                            : p.ageCategory === "CHILD"
                              ? "bg-green-50 text-green-600"
                              : "bg-orange-50 text-orange-600"
                        }`}
                      >
                        {p.ageCategory === "ADULT"
                          ? "Người lớn"
                          : p.ageCategory === "CHILD"
                            ? "Trẻ em"
                            : "Em bé"}
                      </span>
                      <span className="text-stone-800">{p.fullName}</span>
                      {p.dateOfBirth ? (
                        <span className="text-xs text-stone-400">
                          ({p.dateOfBirth})
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {row.notes ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                  Ghi chú
                </p>
                <p className="mt-1 text-stone-600">{row.notes}</p>
              </div>
            ) : null}

            {row.bookingDateUtc ? (
              <p className="text-xs text-stone-400">
                Đặt lúc:{" "}
                {new Date(row.bookingDateUtc).toLocaleString("vi-VN")}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}

export default function BookingsHistoryPage() {
  const [loading, setLoading] = useState(true);
  const [authMissing, setAuthMissing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<BookingListItem[]>([]);
  const [payingBookingId, setPayingBookingId] = useState<number | null>(null);
  const [paymentNotice, setPaymentNotice] = useState<
    "failed" | "error" | null
  >(null);
  const [lookupInput, setLookupInput] = useState("");
  const [lookupErr, setLookupErr] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [highlightBookingId, setHighlightBookingId] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const p = sp.get("payment");
    if (p === "failed") setPaymentNotice("failed");
    else if (p === "error") setPaymentNotice("error");
    const bidRaw = sp.get("bookingId");
    if (
      bidRaw != null &&
      /^\d+$/.test(bidRaw) &&
      Number.isFinite(Number(bidRaw))
    ) {
      setHighlightBookingId(Number(bidRaw));
    }
  }, []);

  useEffect(() => {
    let alive = true;
    async function load() {
      await ensureSessionFresh();
      if (!alive) return;
      if (!hasAccessToken()) {
        setAuthMissing(true);
        setLoading(false);
        return;
      }
      const res = await getMyBookings();
      if (!alive) return;
      if (!res.ok) {
        if (res.status === 401) {
          clearAuthStorage();
          setAuthMissing(true);
        }
        else setErr(errorMessage(res.body));
        setLoading(false);
        return;
      }
      setRows(res.data);
      setLoading(false);
    }
    void load();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (highlightBookingId == null) return;
    const t = setTimeout(() => setHighlightBookingId(null), 5000);
    return () => clearTimeout(t);
  }, [highlightBookingId]);

  async function onRepay(bookingId: number) {
    setErr(null);
    setPayingBookingId(bookingId);
    const res = await createVnpayPayment(bookingId);
    setPayingBookingId(null);
    if (!res.ok) { setErr(errorMessage(res.body)); return; }
    window.location.href = res.data.paymentUrl;
  }

  async function onLookupBooking(e: React.FormEvent) {
    e.preventDefault();
    setLookupErr(null);
    setHighlightBookingId(null);
    const id = parseBookingCode(lookupInput);
    if (id == null) {
      setLookupErr("Nhập mã hợp lệ (VD: BK-12 hoặc 12).");
      return;
    }
    setLookupLoading(true);
    const res = await getBookingById(id);
    setLookupLoading(false);
    if (!res.ok) {
      if (res.status === 404) {
        setLookupErr("Không tìm thấy đặt chỗ với mã này.");
        return;
      }
      if (res.status === 403) {
        setLookupErr("Đặt chỗ này không thuộc tài khoản của bạn.");
        return;
      }
      if (res.status === 401) {
        setLookupErr("Bạn cần đăng nhập để tra cứu.");
        return;
      }
      setLookupErr(errorMessage(res.body));
      return;
    }
    setRows((prev) => {
      if (prev.some((r) => r.id === res.data.id)) return prev;
      return [res.data, ...prev];
    });
    setHighlightBookingId(res.data.id);
    requestAnimationFrame(() => {
      document
        .getElementById(`booking-card-${res.data.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  const stats = useMemo(() => {
    const total = rows.length;
    const pending = rows.filter((r) => r.status === "PENDING").length;
    const completed = rows.filter((r) => r.status === "COMPLETED").length;
    return { total, pending, completed };
  }, [rows]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Đặt chỗ của tôi</h1>
        <p className="mt-1 text-stone-500">Lịch sử và quản lý các đặt tour</p>
      </div>

      {!loading && !authMissing ? (
        <form
          onSubmit={onLookupBooking}
          className="mb-6 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
        >
          <p className="text-sm font-medium text-stone-800">Tra cứu theo mã đặt chỗ</p>
          <p className="mt-0.5 text-xs text-stone-500">
            Mã hiển thị trên mỗi đơn (VD: <span className="font-mono">BK-42</span>). Chỉ xem được đơn của chính bạn.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={lookupInput}
                onChange={(e) => {
                  setLookupInput(e.target.value);
                  setLookupErr(null);
                }}
                placeholder="VD: BK-42 hoặc 42"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 pl-10 pr-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                autoComplete="off"
              />
            </div>
            <button
              type="submit"
              disabled={lookupLoading}
              className="shrink-0 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {lookupLoading ? "Đang tra…" : "Tra cứu"}
            </button>
          </div>
          {lookupErr ? (
            <p className="mt-2 text-sm text-red-700">{lookupErr}</p>
          ) : null}
        </form>
      ) : null}

      {/* Payment notices (thất bại / lỗi — thành công về trang chủ) */}
      {paymentNotice === "failed" ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          ⚠️ Thanh toán chưa hoàn tất hoặc bị từ chối. Bạn có thể thử lại.
        </div>
      ) : null}
      {paymentNotice === "error" ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          Có lỗi khi xác nhận giao dịch. Vui lòng kiểm tra đơn hoặc thử thanh
          toán lại.
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl bg-stone-100" />
          ))}
        </div>
      ) : authMissing ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <p className="text-stone-600">Bạn cần đăng nhập để xem lịch sử đặt chỗ.</p>
          <Link
            href="/login"
            className="mt-4 inline-block rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Đăng nhập
          </Link>
        </div>
      ) : err ? (
        <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-800">{err}</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <CalendarDays className="mx-auto h-12 w-12 text-stone-300" />
          <p className="mt-4 text-stone-600">Bạn chưa có đặt chỗ nào.</p>
          <Link
            href="/tours"
            className="mt-4 inline-block rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Khám phá tour ngay
          </Link>
        </div>
      ) : (
        <>
          {/* Stats summary */}
          <div className="mb-5 grid grid-cols-3 gap-3">
            {[
              { label: "Tổng đặt", value: stats.total, color: "text-stone-800" },
              { label: "Chờ xử lý", value: stats.pending, color: "text-amber-600" },
              { label: "Hoàn tất", value: stats.completed, color: "text-emerald-600" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-stone-200 bg-white p-3 text-center shadow-sm"
              >
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="mt-0.5 text-xs text-stone-500">{s.label}</p>
              </div>
            ))}
          </div>

          <ul className="space-y-4">
            {rows.map((row) => (
              <BookingCard
                key={row.id}
                row={row}
                onRepay={onRepay}
                paying={payingBookingId === row.id}
                highlighted={highlightBookingId === row.id}
                onRowUpdate={(next) =>
                  setRows((prev) =>
                    prev.map((r) => (r.id === next.id ? next : r)),
                  )
                }
              />
            ))}
          </ul>
        </>
      )}

      <div className="mt-8 text-center">
        <Link href="/tours" className="text-sm font-medium text-teal-700 hover:underline">
          Đặt thêm tour →
        </Link>
      </div>
    </div>
  );
}
