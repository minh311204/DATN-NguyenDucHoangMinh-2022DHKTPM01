import Link from "next/link";
import { MapPin, Tag } from "lucide-react";
import type { TourListItem } from "@/lib/api-types";
import { formatVnd } from "@/lib/format";
import { WishlistButton } from "./wishlist-button";

function transportLabel(v?: string | null): string {
  if (!v) return "Đang cập nhật";
  if (v === "FLIGHT" || v === "PLANE") return "Máy bay";
  if (v === "BUS" || v === "CAR") return "Xe";
  if (v === "MIXED") return "Máy bay, Xe";
  if (v === "TRAIN") return "Tàu hỏa";
  if (v === "BOAT") return "Tàu/Thuyền";
  return v;
}

function durationLabel(days?: number | null): string {
  if (!days) return "Đang cập nhật";
  return `${days}N${Math.max(days - 1, 0)}Đ`;
}

function tourProgramCode(id: number) {
  return `NNSGN${id}`;
}

function sightseeingText(tour: TourListItem): string {
  const raw = tour.description?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() ?? "";
  if (raw) {
    const max = 320;
    return raw.length > max ? `${raw.slice(0, max).trim()}…` : raw;
  }
  const parts = tour.name
    .split(/\s*[-–—]\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length > 1) return parts.join(", ");
  return tour.destinationLocation?.name ?? "Đang cập nhật";
}

const BRAND_BORDER = "border-[#0b5ea8]";
const BRAND_TITLE = "text-[#0c4a7a]";

function ProgramCard({ tour }: { tour: TourListItem }) {
  const href = `/tours/${tour.id}`;
  const code = tourProgramCode(tour.id);
  const dur = durationLabel(tour.durationDays ?? null);
  const depart = tour.departureLocation?.name ?? "Đang cập nhật";
  const price = tour.basePrice ?? null;
  const thumb = tour.thumbnailUrl;

  return (
    <article
      className={[
        "group/card relative flex min-h-[400px] flex-col overflow-hidden rounded-xl border-2 bg-white shadow-sm",
        BRAND_BORDER,
      ].join(" ")}
    >
      <div className="absolute left-2 top-2 z-30">
        <WishlistButton tourId={tour.id} tourName={tour.name} variant="icon" />
      </div>

      {/* Trạng thái mặc định */}
      <div className="relative z-0 flex min-h-0 flex-1 flex-col transition-opacity duration-300 ease-out group-hover/card:pointer-events-none group-hover/card:opacity-0">
        <Link href={href} className="relative block h-44 shrink-0 overflow-hidden bg-stone-200 sm:h-48">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-400 to-slate-600 text-sm text-white/90">
              Tour
            </div>
          )}
        </Link>
        <div className="flex min-h-0 flex-1 flex-col bg-[#ececec] px-3 py-3 sm:px-4">
          <Link href={href} className="block">
            <h3 className="line-clamp-2 text-sm font-bold leading-snug text-stone-900 sm:text-[15px]">
              {tour.name}
            </h3>
          </Link>
          <p className="mt-2 flex items-start gap-1.5 text-xs text-stone-500">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400" aria-hidden />
            <span>
              Khởi hành:{" "}
              <span className="font-semibold text-[#0b5ea8]">{depart}</span>
            </span>
          </p>
          <p className="mt-1.5 flex items-start gap-1.5 text-xs text-stone-500">
            <Tag className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400" aria-hidden />
            <span>
              Mã chương trình:{" "}
              <span className="font-semibold text-stone-900">
                {code} ({dur})
              </span>
            </span>
          </p>
          <div className="mt-auto flex items-end justify-between gap-2 pt-4">
            <div>
              <p className="text-[11px] text-stone-500">Giá từ</p>
              <p className="text-lg font-extrabold leading-tight text-[#d92d20] sm:text-xl">
                {formatVnd(price)}
              </p>
            </div>
            <Link
              href={href}
              className="group/link relative shrink-0 pb-0.5 text-sm font-semibold text-stone-800 transition-colors hover:text-[#0b5ea8]"
            >
              <span className="inline-flex items-center gap-0.5">
                Xem chi tiết
                <span aria-hidden className="transition-transform group-hover/card:translate-x-0.5">
                  →
                </span>
              </span>
              <span
                className="absolute bottom-0 left-0 h-px w-0 bg-current transition-all duration-300 ease-out group-hover/link:w-full"
                aria-hidden
              />
            </Link>
          </div>
        </div>
      </div>

      {/* Hover: trượt từ dưới lên */}
      <div
        className={[
          "pointer-events-none absolute inset-0 z-20 flex translate-y-full flex-col bg-white transition-transform duration-300 ease-out",
          "group-hover/card:pointer-events-auto group-hover/card:translate-y-0",
        ].join(" ")}
      >
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-400 to-slate-600" />
          )}
          <div className="relative h-full max-h-[280px] overflow-y-auto bg-white/90 px-3 py-3 text-xs leading-relaxed shadow-[inset_0_1px_0_rgba(0,0,0,0.04)] sm:max-h-[300px] sm:px-4 sm:text-[13px]">
            <p className="text-stone-900">
              <span className="font-bold">Chương trình</span>{" "}
              <span className="font-semibold text-stone-800">
                ({code}): {tour.name}
              </span>
            </p>
            <p className="mt-2 text-stone-800">
              <span className="font-bold text-stone-900">Điểm tham quan:</span>{" "}
              {sightseeingText(tour)}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-stone-800">
              <p>
                <span className="font-bold text-stone-900">Thời gian:</span> {dur}
              </p>
              <p>
                <span className="font-bold text-stone-900">Phương tiện:</span>{" "}
                {transportLabel(tour.transportType)}
              </p>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-end justify-between gap-3 border-t border-stone-200/80 bg-white px-3 py-3 sm:px-4">
          <div>
            <p className="text-[11px] text-stone-500">Giá từ</p>
            <p className="text-xl font-extrabold leading-tight text-[#d92d20]">
              {formatVnd(price)}
            </p>
          </div>
          <Link
            href={href}
            className="group/link2 relative pb-0.5 text-sm font-semibold text-stone-900 transition-colors hover:text-[#0b5ea8]"
          >
            <span className="inline-flex items-center gap-0.5">
              Xem chi tiết
              <span aria-hidden>→</span>
            </span>
            <span
              className="absolute bottom-0 left-0 h-px w-0 bg-current transition-all duration-300 ease-out group-hover/link2:w-full"
              aria-hidden
            />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function RelatedTourPrograms({ tours }: { tours: TourListItem[] }) {
  if (tours.length === 0) return null;

  return (
    <div className="w-full">
      <h2
        className={[
          "mb-6 border-b-2 pb-3 text-center text-lg font-bold uppercase tracking-wide sm:text-xl",
          BRAND_TITLE,
          BRAND_BORDER,
        ].join(" ")}
      >
        Các chương trình khác
      </h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {tours.map((t) => (
          <ProgramCard key={t.id} tour={t} />
        ))}
      </div>
    </div>
  );
}
