"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MapPinned,
  CalendarCheck,
  CreditCard,
  Users,
  Truck,
  Layers,
} from "lucide-react";

const nav = [
  { href: "/", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/tours", label: "Quản lý tour", icon: MapPinned },
  { href: "/catalog", label: "Quản lý danh mục", icon: Layers },
  { href: "/bookings", label: "Quản lý booking", icon: CalendarCheck },
  { href: "/payments", label: "Quản lý thanh toán", icon: CreditCard },
  { href: "/users", label: "Quản lý người dùng", icon: Users },
  { href: "/suppliers", label: "Quản lý cung cấp", icon: Truck },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="relative flex w-[17.5rem] shrink-0 flex-col border-r border-white/[0.06] bg-[#0b0f19] text-slate-100 shadow-[4px_0_32px_-8px_rgba(0,0,0,0.45)]">
      {/* Glow trang trí — kiểu dashboard hiện đại */}
      <div
        className="pointer-events-none absolute -right-px top-0 h-72 w-72 rounded-full bg-sky-500/15 blur-[100px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 h-48 w-48 rounded-full bg-indigo-600/10 blur-[80px]"
        aria-hidden
      />

      <div className="relative border-b border-white/[0.06] px-4 pb-5 pt-6">
        <div className="flex items-start gap-3">
          <div className="relative">
            <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-br from-sky-400/40 to-indigo-600/40 blur-sm" />
            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-lg ring-1 ring-white/20">
              <MapPinned className="h-5 w-5" strokeWidth={2} />
            </div>
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-center gap-2">
              <p className="truncate text-[15px] font-semibold tracking-tight text-white">
                Tour Admin
              </p>
              <span className="shrink-0 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-emerald-300/90">
                Admin
              </span>
            </div>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
            </p>
          </div>
        </div>
      </div>

      <nav className="relative flex flex-1 flex-col gap-1 px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Menu
        </p>
        {nav.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`group relative flex items-center gap-3 rounded-xl py-2 pl-3 pr-3 text-[13px] font-medium transition-all duration-200 ${
                active
                  ? "bg-white/[0.08] text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] ring-1 ring-white/[0.08]"
                  : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
              }`}
            >
              {active ? (
                <span
                  className="absolute left-0 top-1/2 h-8 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-sky-400 to-indigo-500 shadow-[0_0_12px_rgba(56,189,248,0.5)]"
                  aria-hidden
                />
              ) : null}
              <span
                className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  active
                    ? "bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/25"
                    : "bg-white/[0.04] text-slate-500 group-hover:bg-white/[0.07] group-hover:text-slate-300"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
              </span>
              <span className="relative min-w-0 flex-1 truncate">{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
