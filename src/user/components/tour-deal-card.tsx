import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  Tag,
  Timer,
  Users,
} from "lucide-react";
import type { TourListItem } from "@/lib/api-types";
import { formatVnd } from "@/lib/format";
import { WishlistButton } from "./wishlist-button";
import { DealCountdown } from "./deal-countdown";

const gradients = [
  "from-cyan-600 to-blue-800",
  "from-emerald-700 to-teal-900",
  "from-amber-500 to-orange-700",
  "from-violet-600 to-fuchsia-800",
  "from-rose-600 to-red-900",
];

function pickGradient(id: number) {
  return gradients[Math.abs(id) % gradients.length];
}

function formatDepartureYmd(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** VD: 5 ngày → "5N4Đ" (gần cách ghi tour phổ biến) */
function formatDurationShort(days: number | null | undefined): string {
  if (days == null || days < 1) return "—";
  const n = days;
  const d = Math.max(0, days - 1);
  return `${n}N${d}Đ`;
}

type Props = {
  tour: TourListItem;
  /** `deal`: giờ chót + giá niêm yết gạch (khuyến mãi). `catalog`: cùng layout, không khuyến mãi. */
  variant?: "deal" | "catalog";
};

export function TourDealCard({ tour, variant = "deal" }: Props) {
  const showPromo = variant === "deal";
  const id = String(tour.id);
  const dep = tour.departureLocation?.name ?? "—";
  const schedules = tour.schedules ?? [];
  const first = schedules[0];
  const startIso = first?.startDate ?? null;
  const remainingSeats =
    first?.remainingSeats ?? tour.maxPeople ?? null;

  const deadlineMs = showPromo
    ? (() => {
        if (!startIso) return null;
        const t = new Date(startIso).getTime();
        if (Number.isNaN(t)) return null;
        return t;
      })()
    : null;

  const base = tour.basePrice ?? null;
  const listPrice =
    base != null ? Math.round(base * 1.06) : null;
  const salePrice = base;

  const tourCode = tour.slug?.trim()
    ? tour.slug.toUpperCase()
    : `TB${String(tour.id).padStart(5, "0")}`;

  const gradient = pickGradient(tour.id);

  return (
    <article className="group flex h-full w-full max-w-[320px] flex-col overflow-hidden rounded-xl border border-stone-200/80 bg-white shadow-sm ring-1 ring-black/[0.03] transition duration-300 ease-out hover:-translate-y-1 hover:shadow-lg hover:ring-black/[0.06] sm:max-w-none">
      <div className="relative h-[168px] shrink-0 overflow-hidden bg-stone-100 sm:h-[180px]">
        {tour.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={tour.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div
            className={`h-full w-full bg-gradient-to-br ${gradient} opacity-95`}
          />
        )}
        <div className="absolute left-2 top-2 z-10">
          <WishlistButton
            tourId={tour.id}
            tourName={tour.name}
            className="!bg-white/95 !text-stone-600 shadow-sm ring-1 ring-black/10 hover:!bg-white"
          />
        </div>
        {showPromo ? (
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-2 border-t border-stone-100 bg-white/95 px-2.5 py-1.5 text-[11px] backdrop-blur-sm sm:text-xs">
            <span className="flex items-center gap-1 font-semibold text-sky-700">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              Giờ chót
            </span>
            <span className="text-red-600">
              <DealCountdown deadlineMs={deadlineMs} />
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-snug text-stone-900">
          {tour.name}
        </h3>
        <p className="mt-1 flex items-center gap-1 text-[11px] text-stone-400">
          <Tag className="h-3 w-3 shrink-0" />
          {tourCode}
        </p>
        {tour.tags && tour.tags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {tour.tags.map((tg) => (
              <span
                key={tg.id}
                className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-800 ring-1 ring-violet-100"
              >
                {tg.name}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-2 space-y-1.5 text-[11px] text-stone-600 sm:text-xs">
          <p className="flex items-start gap-1.5">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400" />
            <span>
              Khởi hành:{" "}
              <span className="font-medium text-sky-700">{dep}</span>
            </span>
          </p>
          <p className="flex items-start gap-1.5">
            <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400" />
            <span>Ngày khởi hành: {formatDepartureYmd(startIso)}</span>
          </p>
          <p className="flex items-start gap-1.5">
            <Timer className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400" />
            <span>{formatDurationShort(tour.durationDays)}</span>
          </p>
          <p className="flex items-start gap-1.5">
            <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400" />
            <span>
              Số chỗ còn:{" "}
              <span className="font-semibold text-red-600">
                {remainingSeats != null ? remainingSeats : "—"}
              </span>
            </span>
          </p>
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 border-t border-stone-100 pt-3">
          <div className="min-w-0">
            {showPromo &&
            listPrice != null &&
            salePrice != null &&
            listPrice > salePrice ? (
              <p className="text-[11px] text-stone-400 line-through">
                {formatVnd(listPrice)}
              </p>
            ) : null}
            <p
              className={
                showPromo
                  ? "text-base font-bold leading-tight text-red-600 sm:text-lg"
                  : "text-base font-bold leading-tight text-stone-900 sm:text-lg"
              }
            >
              {formatVnd(salePrice)}
            </p>
          </div>
          <Link
            href={`/tours/${id}`}
            className="shrink-0 rounded border border-red-500 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition duration-200 hover:bg-red-50 active:scale-[0.98]"
          >
            Đặt ngay
          </Link>
        </div>
      </div>
    </article>
  );
}
