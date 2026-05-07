"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { AdminHeader } from "@/components/admin-header";
import type { BookingDetail, BookingStatus } from "@/lib/api-types";
import {
  approveBookingCancellation,
  fetchBookingById,
  rejectBookingCancellation,
  updateBookingStatus,
} from "@/lib/admin-api";
import {
  errorMessage,
  formatDateTimeVi,
  formatDateVi,
  formatVnd,
  labelBookingStatus,
} from "@/lib/format";

const STATUS_OPTIONS: BookingStatus[] = [
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
];

export default function AdminBookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id;
  const id =
    typeof rawId === "string"
      ? Number(rawId)
      : Array.isArray(rawId)
        ? Number(rawId[0])
        : NaN;

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nextStatus, setNextStatus] = useState<BookingStatus | "">("");
  const [saving, setSaving] = useState(false);
  const [cancelAction, setCancelAction] = useState<"approve" | "reject" | null>(
    null,
  );

  const load = useCallback(async () => {
    if (!Number.isFinite(id) || id < 1) {
      setErr("Mã booking không hợp lệ.");
      setLoading(false);
      return;
    }
    setErr(null);
    setLoading(true);
    const res = await fetchBookingById(id);
    setLoading(false);
    if (!res.ok) {
      setErr(errorMessage(res.body, res.status));
      setBooking(null);
      return;
    }
    setBooking(res.data);
    setNextStatus(res.data.status);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSaveStatus(e: React.FormEvent) {
    e.preventDefault();
    if (!booking || !nextStatus || nextStatus === booking.status) return;
    setSaving(true);
    setErr(null);
    const res = await updateBookingStatus(booking.id, { status: nextStatus });
    setSaving(false);
    if (!res.ok) {
      setErr(errorMessage(res.body, res.status));
      return;
    }
    setBooking(res.data);
    router.refresh();
  }

  async function onApproveCancellation(e: React.FormEvent) {
    e.preventDefault();
    if (!booking) return;
    setCancelAction("approve");
    setErr(null);
    const res = await approveBookingCancellation(booking.id);
    setCancelAction(null);
    if (!res.ok) {
      setErr(errorMessage(res.body, res.status));
      return;
    }
    setBooking(res.data);
    router.refresh();
  }

  async function onRejectCancellation(e: React.FormEvent) {
    e.preventDefault();
    if (!booking) return;
    setCancelAction("reject");
    setErr(null);
    const res = await rejectBookingCancellation(booking.id, {});
    setCancelAction(null);
    if (!res.ok) {
      setErr(errorMessage(res.body, res.status));
      return;
    }
    setBooking(res.data);
    router.refresh();
  }

  return (
    <>
      <AdminHeader
        title="Chi tiết booking"
        subtitle={booking ? `Đơn #${booking.id}` : "Đang tải…"}
      />
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <Link
            href="/bookings"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-sky-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Danh sách booking
          </Link>

          {err ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {err}
            </div>
          ) : null}

          {loading ? (
            <p className="text-slate-500">Đang tải…</p>
          ) : booking ? (
            <div className="space-y-6">
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-800">
                  Trạng thái
                </h2>
                <form
                  onSubmit={onSaveStatus}
                  className="mt-3 flex flex-wrap items-end gap-3"
                >
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">
                      Cập nhật
                    </label>
                    <select
                      value={nextStatus}
                      onChange={(e) =>
                        setNextStatus(e.target.value as BookingStatus)
                      }
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {labelBookingStatus(s)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={
                      saving || !nextStatus || nextStatus === booking.status
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? "Đang lưu…" : "Lưu trạng thái"}
                  </button>
                </form>
              </section>

              {booking.cancellationRequestState === "PENDING" ? (
                <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                  <h2 className="text-sm font-semibold text-amber-950">
                    Yêu cầu hủy từ khách
                  </h2>
                  <p className="mt-2 text-sm text-amber-950/90">
                    Gửi lúc:{" "}
                    <strong>
                      {formatDateTimeVi(booking.cancellationRequestedAtUtc ?? null)}
                    </strong>
                    . Chỉ chấp nhận hủy có điều kiện hoàn tiền khi thời điểm duyệt vẫn còn ít nhất{" "}
                    <strong>{booking.cancelMinDaysBeforeDeparture} ngày</strong> trước giờ
                    khởi hành.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <form onSubmit={onApproveCancellation}>
                      <button
                        type="submit"
                        disabled={cancelAction !== null}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                      >
                        {cancelAction === "approve"
                          ? "Đang xử lý…"
                          : "Chấp nhận hủy"}
                      </button>
                    </form>
                    <form onSubmit={onRejectCancellation}>
                      <button
                        type="submit"
                        disabled={cancelAction !== null}
                        className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-50"
                      >
                        {cancelAction === "reject"
                          ? "Đang xử lý…"
                          : "Từ chối yêu cầu"}
                      </button>
                    </form>
                  </div>
                </section>
              ) : null}

              {booking.status === "CANCELLED" && booking.cancellationApprovedAtUtc ? (
                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-semibold text-slate-800">
                    Hủy &amp; hoàn tiền (theo yêu cầu)
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Admin đã chấp nhận hủy lúc{" "}
                    <strong>
                      {formatDateTimeVi(booking.cancellationApprovedAtUtc)}
                    </strong>
                    . Khách gửi yêu cầu lúc{" "}
                    {formatDateTimeVi(booking.cancellationRequestedAtUtc ?? null)}.
                  </p>
                </section>
              ) : null}

              {booking.cancellationRequestState === "REJECTED" ? (
                <section className="rounded-xl border border-red-100 bg-red-50/60 p-5 shadow-sm">
                  <h2 className="text-sm font-semibold text-red-900">
                    Yêu cầu hủy đã bị từ chối
                  </h2>
                  <p className="mt-2 text-sm text-red-900/85">
                    Thời điểm từ chối:{" "}
                    {formatDateTimeVi(booking.cancellationRejectedAtUtc ?? null)}
                  </p>
                </section>
              ) : null}

              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-800">Tour</h2>
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <dt className="text-slate-500">Tên tour</dt>
                  <dd className="text-slate-900">{booking.schedule.tour.name}</dd>
                  <dt className="text-slate-500">Khởi hành</dt>
                  <dd>{formatDateVi(booking.schedule.startDate)}</dd>
                  <dt className="text-slate-500">Kết thúc</dt>
                  <dd>{formatDateVi(booking.schedule.endDate)}</dd>
                  <dt className="text-slate-500">Chỗ còn (lịch)</dt>
                  <dd>
                    {booking.schedule.remainingSeats != null
                      ? String(booking.schedule.remainingSeats)
                      : "—"}
                  </dd>
                </dl>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-800">
                  Liên hệ
                </h2>
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <dt className="text-slate-500">Họ tên</dt>
                  <dd>{booking.contact.fullName}</dd>
                  <dt className="text-slate-500">Email</dt>
                  <dd className="break-all">{booking.contact.email}</dd>
                  <dt className="text-slate-500">Điện thoại</dt>
                  <dd>{booking.contact.phone}</dd>
                </dl>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-800">
                  Thanh toán &amp; số lượng
                </h2>
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <dt className="text-slate-500">Tổng tiền</dt>
                  <dd className="font-medium">
                    {formatVnd(booking.totalAmount ?? null)}
                  </dd>
                  <dt className="text-slate-500">Số khách (tổng)</dt>
                  <dd>{booking.numberOfPeople}</dd>
                  <dt className="text-slate-500">Người lớn / trẻ / em bé</dt>
                  <dd>
                    {booking.passengerCounts.adults} /{" "}
                    {booking.passengerCounts.children} /{" "}
                    {booking.passengerCounts.infants}
                  </dd>
                  <dt className="text-slate-500">Đặt lúc</dt>
                  <dd>{formatDateTimeVi(booking.bookingDateUtc ?? null)}</dd>
                </dl>
              </section>

              {booking.notes ? (
                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-semibold text-slate-800">Ghi chú</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                    {booking.notes}
                  </p>
                </section>
              ) : null}

              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-800">
                  Hành khách
                </h2>
                <ul className="mt-3 divide-y divide-slate-100 text-sm">
                  {booking.passengers.map((p) => (
                    <li
                      key={p.id}
                      className="flex flex-wrap justify-between gap-2 py-2"
                    >
                      <span className="font-medium text-slate-900">
                        {p.fullName}
                      </span>
                      <span className="text-slate-500">{p.ageCategory}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          ) : !err ? (
            <p className="text-slate-500">Không tìm thấy booking.</p>
          ) : null}
        </div>
      </main>
    </>
  );
}
