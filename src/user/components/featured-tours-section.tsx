"use client";

import { useCallback, useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { TourListItem } from "@/lib/api-types";
import Link from "next/link";
import { TourDealCard } from "./tour-deal-card";
import { MotionInView } from "./motion-in-view";

type Props = {
  tours: TourListItem[];
  loadError: ReactNode | null;
  emptyMessage?: string;
};

export function FeaturedToursSection({
  tours,
  loadError,
  emptyMessage = "Chưa có tour nào.",
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollBy = useCallback((dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const w = el.clientWidth;
    el.scrollBy({ left: dir * Math.max(280, w * 0.85), behavior: "smooth" });
  }, []);

  return (
    <section
      id="featured-tours"
      className="scroll-mt-24 border-b border-sky-200/60 py-10 sm:scroll-mt-28 sm:py-14"
      style={{ backgroundColor: "#e0f2f7" }}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h2 className="text-xl font-bold uppercase tracking-wide text-[#0056b3] sm:text-2xl">
              <span className="relative inline-block">
                Tour
                <span
                  className="absolute -bottom-1 left-0 h-1 w-full min-w-[2.5rem] rounded-full bg-[#0056b3]"
                  aria-hidden
                />
              </span>{" "}
              nổi bật
            </h2>
            <p className="mt-3 max-w-xl text-sm text-stone-600 sm:mt-2">
              Chọn nhanh các chương trình được yêu thích — giá minh bạch, khởi hành linh hoạt.
            </p>
          </div>
          <div className="flex shrink-0 justify-center gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200/80 bg-white text-stone-600 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-sky-50 hover:text-sky-800 active:translate-y-0"
              aria-label="Trước"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200/80 bg-white text-stone-600 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-sky-50 hover:text-sky-800 active:translate-y-0"
              aria-label="Sau"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {loadError ? (
          <div className="mt-8">{loadError}</div>
        ) : tours.length === 0 ? (
          <p className="mt-8 text-center text-sm text-stone-600">{emptyMessage}</p>
        ) : (
          <MotionInView
            className="tours-reveal-wrap"
            once
            rootMargin="0px 0px 8% 0px"
          >
            <div
              ref={scrollerRef}
              className="featured-tours-scroll mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-5 [&::-webkit-scrollbar]:hidden"
            >
              {tours.map((t) => (
                <div
                  key={t.id}
                  className="tours-stagger-item w-[min(88vw,300px)] shrink-0 snap-start scroll-ml-4 first:scroll-ml-0 sm:w-[300px] sm:scroll-ml-0"
                >
                  <TourDealCard tour={t} homeFeatured />
                </div>
              ))}
            </div>
          </MotionInView>
        )}

        <div className="mt-10 flex justify-center">
          <Link
            href="/tours?featured=true"
            className="inline-flex min-w-[200px] items-center justify-center rounded-lg border border-sky-500 bg-sky-100/80 px-8 py-2.5 text-sm font-semibold text-sky-800 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-sky-200/90 hover:shadow-md active:translate-y-0"
          >
            Xem tất cả
          </Link>
        </div>
      </div>
    </section>
  );
}
