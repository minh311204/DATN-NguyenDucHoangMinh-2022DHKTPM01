"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { tourDetailScheduleHref } from "@/lib/tour-detail-nav";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Một ngày khởi hành theo UTC (khớp `scheduleDateMap` trên trang chi tiết) */
type DayItem = { ymd: string; d: Date };

function uniqueSortedUtcDays(schedules: { startDate: string | null }[]): DayItem[] {
  const byYmd = new Map<string, Date>();
  for (const s of schedules) {
    if (!s.startDate) continue;
    const dt = new Date(s.startDate);
    if (Number.isNaN(dt.getTime())) continue;
    const ymd = `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
    if (!byYmd.has(ymd)) byYmd.set(ymd, dt);
  }
  return [...byYmd.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ymd, d]) => ({ ymd, d }));
}

function formatDdMmUtc(d: Date): string {
  return `${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)}`;
}

const CHIP_LAYOUT =
  "tour-date-chip px-2 py-0.5 text-[11px] font-medium tabular-nums shrink-0 sm:text-xs";

type Props = {
  schedules: { startDate: string | null }[];
  tourId: string;
};

export function TourScheduleStrip({ schedules, tourId }: Props) {
  const router = useRouter();
  const dayItems = useMemo(() => uniqueSortedUtcDays(schedules), [schedules]);

  const [selectedYmd, setSelectedYmd] = useState<string | null>(null);
  useEffect(() => {
    setSelectedYmd((prev) => {
      if (dayItems.length === 0) return null;
      if (prev && dayItems.some((x) => x.ymd === prev)) return prev;
      return dayItems[0].ymd;
    });
  }, [dayItems]);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const refreshScrollState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const max = scrollWidth - clientWidth;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(max > 2 && scrollLeft < max - 2);
  }, []);

  useEffect(() => {
    refreshScrollState();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", refreshScrollState, { passive: true });
    const ro = new ResizeObserver(refreshScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", refreshScrollState);
      ro.disconnect();
    };
  }, [dayItems.length, refreshScrollState]);

  const scrollByDir = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const firstChip = el.querySelector("[data-schedule-chip]") as HTMLElement | null;
    const gap = 8;
    const chipW = firstChip ? firstChip.getBoundingClientRect().width + gap : 76;
    const approxFit = Math.max(1, Math.floor(el.clientWidth / chipW) - 0.25);
    const delta = chipW * approxFit * dir;
    el.scrollBy({ left: delta, behavior: "smooth" });
  };

  const navigateDetail = (ymd: string | null) => {
    const y = ymd ?? dayItems[0]?.ymd;
    if (!y) return;
    router.push(tourDetailScheduleHref(tourId, { dateYmd: y }), { scroll: false });
  };

  if (dayItems.length === 0) {
    return (
      <Link
        href={tourDetailScheduleHref(tourId)}
        scroll={false}
        className="flex items-center gap-1.5 rounded-md px-0.5 py-0.5 text-[11px] text-stone-600 outline-offset-2 transition hover:bg-stone-50 sm:text-xs"
      >
        <Calendar className="h-3.5 w-3.5 shrink-0 text-stone-400" aria-hidden />
        <span className="leading-snug">Ngày khởi hành:</span>
        <span className="text-stone-500">Đang cập nhật</span>
      </Link>
    );
  }

  return (
    <div
      className="flex min-w-0 items-center gap-1.5 rounded-md py-0.5"
      onClick={(ev) => {
        if ((ev.target as HTMLElement).closest("[data-strip-scroll]")) return;
        if ((ev.target as HTMLElement).closest("[data-schedule-chip]")) return;
        navigateDetail(selectedYmd);
      }}
      onKeyDown={(ev) => {
        if (ev.target !== ev.currentTarget) return;
        if (ev.key !== "Enter" && ev.key !== " ") return;
        ev.preventDefault();
        navigateDetail(selectedYmd);
      }}
      role="presentation"
    >
      <Calendar
        className="h-3.5 w-3.5 shrink-0 text-stone-400"
        aria-hidden
      />
      <span className="shrink-0 leading-snug">Ngày khởi hành:</span>
      {/*
        Nút trong luồng (không absolute): viền chip đủ hai mép, không bị overflow-hidden cắt.
        flex-1 basis-0 + min-w-0: vùng cuộn chia chỗ đúng, nút không đè chip.
      */}
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <button
          type="button"
          data-strip-scroll
          aria-label="Cuộn sang trái"
          disabled={!canScrollLeft}
          onClick={(e) => {
            e.stopPropagation();
            scrollByDir(-1);
          }}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 shadow-sm transition ${
            canScrollLeft
              ? "hover:bg-stone-100 active:scale-95"
              : "cursor-default opacity-45"
          }`}
        >
          <ChevronLeft className="h-3 w-3" strokeWidth={2.25} />
        </button>
        <div
          ref={scrollerRef}
          className="min-h-5 min-w-0 flex-1 basis-0 overflow-x-auto overflow-y-visible overscroll-x-contain scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="flex w-max items-center gap-2 py-px">
            {dayItems.map(({ ymd, d }) => (
              <button
                key={ymd}
                type="button"
                data-schedule-chip
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedYmd(ymd);
                  router.push(tourDetailScheduleHref(tourId, { dateYmd: ymd }), {
                    scroll: false,
                  });
                }}
                className={`${CHIP_LAYOUT} ${selectedYmd === ymd ? "tour-date-chip--selected" : ""}`}
              >
                {formatDdMmUtc(d)}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          data-strip-scroll
          aria-label="Cuộn sang phải"
          disabled={!canScrollRight}
          onClick={(e) => {
            e.stopPropagation();
            scrollByDir(1);
          }}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 shadow-sm transition ${
            canScrollRight
              ? "hover:bg-stone-100 active:scale-95"
              : "cursor-default opacity-45"
          }`}
        >
          <ChevronRight className="h-3 w-3" strokeWidth={2.25} />
        </button>
      </div>
    </div>
  );
}
