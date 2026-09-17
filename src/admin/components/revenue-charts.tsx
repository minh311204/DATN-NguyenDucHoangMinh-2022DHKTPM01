"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/** Doanh thu — `revenueVnd` quy đổi hiển thị theo triệu VND */
export function RevenueAreaChart({
  data,
}: {
  data: { label: string; revenueVnd: number }[];
}) {
  const chartData = data.map((d) => ({
    label: d.label,
    revenueTriệu: d.revenueVnd / 1_000_000,
  }));

  return (
    <div className="h-[280px] w-full min-h-[280px] min-w-0">
      {chartData.length === 0 ? (
        <p className="flex h-full items-center justify-center text-sm text-slate-500">
          Không có dữ liệu thanh toán trong khoảng đã chọn.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="label" stroke="#64748b" fontSize={12} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "#0f172a" }}
              formatter={(value) => {
                const n = typeof value === "number" ? value : Number(value);
                return [
                  `${Number.isFinite(n) ? n.toLocaleString("vi-VN", { maximumFractionDigits: 2 }) : "0"} triệu`,
                  "Doanh thu",
                ];
              }}
            />
            <Area
              type="monotone"
              dataKey="revenueTriệu"
              stroke="#38bdf8"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRev)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function TopToursBarChart({
  data,
}: {
  data: { name: string; bookings: number }[];
}) {
  const heightPx =
    data.length === 0 ? 128 : Math.min(400, Math.max(160, data.length * 46 + 72));

  return (
    <div
      className="w-full min-w-0"
      style={{ height: heightPx, minHeight: heightPx }}
    >
      {data.length === 0 ? (
        <p className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
          Chưa có đơn trong khoảng thời gian này.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
            barCategoryGap="12%"
          >
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-slate-200 dark:stroke-slate-700"
              horizontal={false}
            />
            <XAxis
              type="number"
              className="text-slate-500"
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              className="text-slate-500"
              fontSize={11}
              width={148}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "currentColor" }}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
              }}
              wrapperClassName="!rounded-lg !border !border-slate-200 !bg-white dark:!border-slate-600 dark:!bg-slate-900"
              formatter={(value) => [`${value ?? 0} đơn`, "Đặt tour"]}
            />
            <Bar dataKey="bookings" fill="#22d3ee" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
