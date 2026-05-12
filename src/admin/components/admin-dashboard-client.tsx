"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  TrendingUp,
  Wallet,
  Users,
  Ticket,
  LineChart,
} from "lucide-react";
import { TopToursBarChart } from "@/components/revenue-charts";
import {
  BookingStatusDonut,
  BookingStatusFunnel,
  DashboardComboChart,
  MiniSparkline,
  RegionBookingsPie,
  SupplierTypeBar,
  WeekdayBookingBar,
} from "@/components/dashboard-charts";
import { fetchDashboardStats } from "@/lib/admin-api";
import type { AdminDashboardStats } from "@/lib/api-types";
import { errorMessage, formatVnd } from "@/lib/format";

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function DeltaBadge({ value }: { value: number | null }) {
  if (value == null) {
    return (
      <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
        —
      </span>
    );
  }
  const pos = value > 0;
  const neg = value < 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
        pos
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
          : neg
            ? "bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300"
            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
      }`}
    >
      {pos ? "↑" : neg ? "↓" : "→"} {pos || neg ? `${Math.abs(value)}%` : "0%"}
      <span className="font-normal opacity-80">vs kỳ trước</span>
    </span>
  );
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-36 rounded-2xl bg-slate-200/80 dark:bg-slate-800"
          />
        ))}
      </div>
      <div className="h-[360px] rounded-2xl bg-slate-200/80 dark:bg-slate-800" />
    </div>
  );
}

export function AdminDashboardClient() {
  const [granularity, setGranularity] = useState<"day" | "month" | "year">(
    "month",
  );
  const [year, setYear] = useState(() => String(new Date().getFullYear()));
  const [yearFrom, setYearFrom] = useState(() =>
    String(new Date().getFullYear() - 4),
  );
  const [yearTo, setYearTo] = useState(() =>
    String(new Date().getFullYear()),
  );
  const [start, setStart] = useState(() => {
    const n = new Date();
    return ymd(new Date(Date.UTC(n.getFullYear(), n.getMonth(), 1)));
  });
  const [end, setEnd] = useState(() => ymd(new Date()));

  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    const q: Record<string, string> = { granularity };
    if (granularity === "day") {
      q.start = start;
      q.end = end;
    } else if (granularity === "month") {
      q.year = year;
    } else {
      q.yearFrom = yearFrom;
      q.yearTo = yearTo;
    }
    const res = await fetchDashboardStats(q);
    if (res.ok) setStats(res.data);
    else setErr(errorMessage(res.body, res.status));
    setLoading(false);
  }, [granularity, year, yearFrom, yearTo, start, end]);

  useEffect(() => {
    void load();
  }, [load]);

  const topBar =
    stats?.topTours.map((t) => ({
      name:
        t.tourName.length > 26
          ? `${t.tourName.slice(0, 24)}…`
          : t.tourName,
      bookings: t.bookingCount,
    })) ?? [];

  const s = stats?.summary;
  const cmp = stats?.comparison;

  const revSpark =
    stats?.revenueSeries.map((x) => x.revenueVnd / 1_000_000) ?? [];
  const bookSpark = stats?.revenueSeries.map((x) => x.bookingCount) ?? [];

  const statBlocks = s && cmp
    ? [
        {
          label: "Doanh thu",
          value: formatVnd(s.totalRevenueVnd),
          hint: "",
          delta: cmp.revenueChangePercent,
          icon: Wallet,
          accent:
            "from-emerald-500/15 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/10",
          iconClass: "text-emerald-600 dark:text-emerald-400",
          spark: revSpark,
          sparkColor: "#10b981",
          href: "/payments",
          action: "Xem thanh toán",
        },
        {
          label: "Số đơn đặt",
          value: String(s.bookingCount),
          hint: "",
          delta: cmp.bookingChangePercent,
          icon: Ticket,
          accent:
            "from-sky-500/15 to-indigo-500/10 dark:from-sky-500/20 dark:to-indigo-500/10",
          iconClass: "text-sky-600 dark:text-sky-400",
          spark: bookSpark,
          sparkColor: "#0ea5e9",
          href: "/bookings",
          action: "Xem booking",
        },
        {
          label: "Khách mới",
          value: String(s.newUsersCount),
          hint: "",
          delta: cmp.usersChangePercent,
          icon: Users,
          accent:
            "from-violet-500/15 to-fuchsia-500/10 dark:from-violet-500/20 dark:to-fuchsia-500/10",
          iconClass: "text-violet-600 dark:text-violet-400",
          spark: revSpark.length ? revSpark : [0],
          sparkColor: "#8b5cf6",
          href: "/users",
          action: "Quản lý người dùng",
        },
        {
          label: "Hoàn thành / tỷ lệ",
          value:
            s.completionRatePercent != null
              ? `${s.completionRatePercent}%`
              : "—",
          hint: ``,
          delta: null,
          icon: TrendingUp,
          accent:
            "from-amber-500/15 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/10",
          iconClass: "text-amber-600 dark:text-amber-400",
          spark: bookSpark.length ? bookSpark : [0],
          sparkColor: "#f59e0b",
          href: "/bookings",
          action: "Chi tiết trạng thái",
        },
      ]
    : [];

  const friendlyErr =
    err &&
    (/cannot get|404|not found/i.test(err) || String(err).includes("Cannot GET"))
      ? "Không tải được thống kê. Hãy đảm bảo API đang chạy và đã đăng nhập admin (endpoint /admin/dashboard/stats)."
      : err;

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.04] dark:border-slate-700 dark:bg-slate-900">
        <div>
          <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">
            Thống kê theo
          </span>
          <select
            value={granularity}
            onChange={(e) =>
              setGranularity(e.target.value as "day" | "month" | "year")
            }
            className="mt-1 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-900 transition focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="day">Ngày</option>
            <option value="month">Tháng</option>
            <option value="year">Năm</option>
          </select>
        </div>
        {granularity === "day" ? (
          <>
            <div>
              <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                Từ
              </span>
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="mt-1 rounded-xl border border-slate-200 bg-slate-50/80 px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                Đến
              </span>
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="mt-1 rounded-xl border border-slate-200 bg-slate-50/80 px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </>
        ) : null}
        {granularity === "month" ? (
          <div>
            <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">
              Năm
            </span>
            <input
              type="number"
              min={2000}
              max={2100}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="mt-1 w-28 rounded-xl border border-slate-200 bg-slate-50/80 px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
        ) : null}
        {granularity === "year" ? (
          <>
            <div>
              <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                Từ năm
              </span>
              <input
                type="number"
                min={2000}
                max={2100}
                value={yearFrom}
                onChange={(e) => setYearFrom(e.target.value)}
                className="mt-1 w-24 rounded-xl border border-slate-200 bg-slate-50/80 px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                Đến năm
              </span>
              <input
                type="number"
                min={2000}
                max={2100}
                value={yearTo}
                onChange={(e) => setYearTo(e.target.value)}
                className="mt-1 w-24 rounded-xl border border-slate-200 bg-slate-50/80 px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </>
        ) : null}
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-md transition hover:from-sky-500 hover:to-indigo-500"
        >
          Áp dụng
        </button>
      </div>

      {err ? (
        <div className="mb-6 rounded-xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
          <p className="font-medium">Lỗi tải dữ liệu</p>
          <p className="mt-1 opacity-90">{friendlyErr}</p>
        </div>
      ) : null}

      {loading ? (
        <DashboardSkeleton />
      ) : stats ? (
        <div className="space-y-8">
          <div className="grid grid-cols-12 gap-5 lg:gap-6">
            {statBlocks.map(
              ({
                label,
                value,
                hint,
                delta,
                icon: Icon,
                accent,
                iconClass,
                spark,
                sparkColor,
                href,
                action,
              }) => (
                <div
                  key={label}
                  className={`group col-span-12 rounded-2xl border border-slate-200/90 bg-gradient-to-br ${accent} p-5 shadow-sm ring-1 ring-slate-900/[0.04] transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:from-slate-900 dark:to-slate-900/80 sm:col-span-6 xl:col-span-3`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {label}
                      </p>
                      <div className="mt-1 flex flex-wrap items-baseline gap-2">
                        <p className="text-2xl font-semibold tabular-nums tracking-tight text-slate-900 dark:text-white">
                          {value}
                        </p>
                        {delta !== null ? <DeltaBadge value={delta} /> : null}
                      </div>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
                        {hint}
                      </p>
                      <div className="mt-3 h-8 opacity-90 transition group-hover:opacity-100">
                        <MiniSparkline values={spark} color={sparkColor} />
                      </div>
                      <Link
                        href={href}
                        className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-500 dark:text-sky-400"
                      >
                        <LineChart className="h-3.5 w-3.5" aria-hidden />
                        {action}
                      </Link>
                    </div>
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/80 shadow-inner dark:bg-slate-800/80 ${iconClass}`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>

          <div className="grid grid-cols-12 items-start gap-6 lg:gap-8">
            <section className="col-span-12 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.04] dark:border-slate-700 dark:bg-slate-900 lg:col-span-8">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Doanh thu &amp; đơn đặt
              </h2>
              <div className="mt-4">
                <DashboardComboChart data={stats.revenueSeries} />
              </div>
            </section>
            <section className="col-span-12 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.04] dark:border-slate-700 dark:bg-slate-900 lg:col-span-4">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Top tour theo số đơn
              </h2>
              <div className="mt-4">
                <TopToursBarChart data={topBar} />
              </div>
            </section>

            <section className="col-span-12 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.04] dark:border-slate-700 dark:bg-slate-900 md:col-span-6 lg:col-span-4">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Trạng thái booking
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              </p>
              <BookingStatusDonut breakdown={stats.bookingStatusBreakdown} />
            </section>
            <section className="col-span-12 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.04] dark:border-slate-700 dark:bg-slate-900 md:col-span-6 lg:col-span-4">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Trạng thái bookingbooking
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              </p>
              <div className="mt-4">
                <BookingStatusFunnel breakdown={stats.bookingStatusBreakdown} />
              </div>
            </section>
            <section className="col-span-12 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.04] dark:border-slate-700 dark:bg-slate-900 md:col-span-6 lg:col-span-4">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Đặt tour điểm đến
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              </p>
              <RegionBookingsPie rows={stats.toursByRegion} />
            </section>

            <section className="col-span-12 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.04] dark:border-slate-700 dark:bg-slate-900 md:col-span-6">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Booking theo ngàyngày
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              </p>
              <WeekdayBookingBar data={stats.heatmapWeekday} />
            </section>
            <section className="col-span-12 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.04] dark:border-slate-700 dark:bg-slate-900 md:col-span-6">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Nhà cung cấp theo loại
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              </p>
              <SupplierTypeBar rows={stats.supplierCountByType} />
            </section>
          </div>
        </div>
      ) : null}
    </>
  );
}
