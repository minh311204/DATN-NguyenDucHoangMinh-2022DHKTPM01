"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminHeader } from "@/components/admin-header";
import { Eye } from "lucide-react";
import type { BookingListItem, BookingStatus } from "@/lib/api-types";
import { fetchBookings, unwrapBookingList } from "@/lib/admin-api";
import { AdminPagination } from "@/components/admin-pagination";
import {
  errorMessage,
  formatDateVi,
  formatDateTimeVi,
  formatVnd,
  labelBookingStatus,
} from "@/lib/format";

const STATUS_OPTIONS: { value: "" | BookingStatus; label: string }[] = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "PENDING", label: labelBookingStatus("PENDING") },
  { value: "CONFIRMED", label: labelBookingStatus("CONFIRMED") },
  { value: "CANCELLED", label: labelBookingStatus("CANCELLED") },
  { value: "COMPLETED", label: labelBookingStatus("COMPLETED") },
];

function statusBadgeClass(s: BookingStatus): string {
  switch (s) {
    case "PENDING":
      return "bg-amber-50 text-amber-800";
    case "CONFIRMED":
      return "bg-sky-50 text-sky-800";
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-800";
    case "CANCELLED":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function AdminBookingsPage() {
  const [rows, setRows] = useState<BookingListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"" | BookingStatus>("");
  const [onlyPendingCancellation, setOnlyPendingCancellation] = useState(false);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    const q: Record<string, string | undefined> = {
      page: String(page),
      pageSize: String(pageSize),
    };
    if (statusFilter) q.status = statusFilter;
    if (onlyPendingCancellation) q.cancellationRequestState = "PENDING";
    const res = await fetchBookings(q);
    if (res.ok) {
      const { items, total: t } = unwrapBookingList(res.data);
      setRows(items);
      setTotal(t);
    } else setErr(errorMessage(res.body, res.status));
    setLoading(false);
  }, [statusFilter, onlyPendingCancellation, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <AdminHeader title="Quản lý booking" />
      <main className="flex-1 space-y-4 overflow-auto p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span>Trạng thái</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setPage(1);
                setStatusFilter(e.target.value as "" | BookingStatus);
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={onlyPendingCancellation}
              onChange={(e) => {
                setPage(1);
                setOnlyPendingCancellation(e.target.checked);
              }}
              className="rounded border-slate-300"
            />
            Chỉ đơn chờ duyệt hủy
          </label>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Tải lại
          </button>
        </div>

        {err ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {err}
          </div>
        ) : null}

        {loading ? (
          <p className="py-12 text-center text-slate-500">Đang tải…</p>
        ) : rows.length === 0 && !err ? (
          <p className="py-12 text-center text-slate-500">Chưa có booking.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="px-4 py-3 font-medium">Mã</th>
                  <th className="px-4 py-3 font-medium">Khách</th>
                  <th className="px-4 py-3 font-medium">Tour</th>
                  <th className="px-4 py-3 font-medium">Khởi hành</th>
                  <th className="px-4 py-3 font-medium">Số tiền</th>
                  <th className="px-4 py-3 font-medium">Người</th>
                  <th className="px-4 py-3 font-medium">Đặt lúc</th>
                  <th className="px-4 py-3 font-medium">Trạng thái</th>
                  <th className="px-4 py-3 text-right font-medium">Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-sky-600">
                      #{row.id}
                    </td>
                    <td className="px-4 py-3 text-slate-800">
                      <div className="font-medium">{row.contact.fullName}</div>
                      <div className="text-xs text-slate-500">
                        {row.contact.email}
                      </div>
                    </td>
                    <td className="max-w-[200px] px-4 py-3 text-slate-700">
                      <span className="line-clamp-2">
                        {row.schedule.tour.name}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {formatDateVi(row.schedule.startDate)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-800">
                      {formatVnd(row.totalAmount ?? null)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {row.numberOfPeople}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                      {formatDateTimeVi(row.bookingDateUtc ?? null)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(row.status)}`}
                        >
                          {labelBookingStatus(row.status)}
                        </span>
                        {row.cancellationRequestState === "PENDING" ? (
                          <span className="inline-flex w-fit rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                            Chờ duyệt hủy
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/bookings/${row.id}`}
                        className="inline-flex rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-sky-600"
                        aria-label="Chi tiết"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <AdminPagination
              page={page}
              pageSize={pageSize}
              total={total}
              itemsLabel="booking"
              onPageChange={setPage}
              onPageSizeChange={(n) => {
                setPageSize(n);
                setPage(1);
              }}
            />
          </div>
        )}
      </main>
    </>
  );
}
