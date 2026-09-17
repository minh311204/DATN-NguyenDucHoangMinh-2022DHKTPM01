"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MotionInView } from "./motion-in-view";

/** Xanh chủ đạo */
const BRAND = "#0056b3";

/** Ảnh trong public/assets/images — encode từng phần để URL đúng với tên tiếng Việt */
function vnThumb(folder: string, file: string): string {
  return `/assets/images/${encodeURIComponent(folder)}/${encodeURIComponent(file)}`;
}

const EXPLORE_CARDS: {
  title: string;
  href: string;
  image: string;
}[] = [
  {
    title: "Hà Nội — phố cổ & hồ Hoàn Kiếm",
    href: "/tours?q=H%C3%A0+N%E1%BB%99i",
    image: vnThumb("Miền Bắc", "HÀ NỘI.jpg"),
  },
  {
    title: "Quảng Ninh — vịnh Hạ Long",
    href: "/tours?q=H%E1%BA%A1+Long",
    image: vnThumb("Miền Bắc", "QUẢNG NINH.jpg"),
  },
  {
    title: "Đà Nẵng — biển Mỹ Khê & Bà Nà",
    href: "/tours?q=%C4%90%C3%A0+N%E1%BA%B5ng",
    image: vnThumb("Miền Trung", "ĐÀ NẴNG.jpg"),
  },
  {
    title: "Hội An — phố cổ đèn lồng",
    href: "/tours?q=H%E1%BB%99i+An",
    image: vnThumb("Miền Trung", "HỘI AN.jpg"),
  },
  {
    title: "Phú Quốc — biển xanh đảo ngọc",
    href: "/tours?q=Ph%C3%BA+Qu%E1%BB%91c",
    image: vnThumb("Miền Tây Nam Bộ", "PHÚ QUỐC.jpg"),
  },
  {
    title: "TP.HCM — Sài Gòn hoa lệ",
    href: "/tours?q=H%E1%BB%93+Ch%C3%AD+Minh",
    image: vnThumb("Miền Đông Nam Bộ", "TP. HỒ CHÍ MINH.jpg"),
  },
];

export function HomeExplorePromo() {
  const [exploreStart, setExploreStart] = useState(0);
  const visibleExplore = 3;
  const maxExploreStart = Math.max(0, EXPLORE_CARDS.length - visibleExplore);

  const goExplore = useCallback(
    (dir: -1 | 1) => {
      setExploreStart((s) => {
        const n = s + dir;
        if (n < 0) return maxExploreStart;
        if (n > maxExploreStart) return 0;
        return n;
      });
    },
    [maxExploreStart],
  );

  return (
    <section
      className="w-full min-w-0 border-b border-sky-200/60"
      style={{ backgroundColor: "#e0f2f7" }}
    >
      <MotionInView className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        {/* Khám phá — thumbnail từ public/assets/images */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <h2
              className="text-lg font-bold uppercase tracking-wide sm:text-xl"
              style={{ color: BRAND }}
            >
              Khám phá sản phẩm TourBooking
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-600 sm:text-[15px]">
              Hãy tận hưởng trải nghiệm du lịch chuyên nghiệp, mang lại cho bạn những khoảnh khắc tuyệt vời và nâng tầm cuộc sống. Chúng tôi cam kết mang đến những chuyến đi đáng nhớ, giúp bạn khám phá thế giới theo cách hoàn hảo nhất.
            </p>
          </div>
          <div className="flex shrink-0 justify-end gap-2 sm:pb-0.5">
            <button
              type="button"
              onClick={() => goExplore(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-stone-50 hover:text-[#0056b3] active:translate-y-0"
              aria-label="Xem nhóm trước"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => goExplore(1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-stone-50 hover:text-[#0056b3] active:translate-y-0"
              aria-label="Xem nhóm sau"
            >
              <ChevronRight className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {EXPLORE_CARDS.slice(exploreStart, exploreStart + visibleExplore).map(
            (card) => (
              <Link
                key={card.title}
                href={card.href}
                className="group relative aspect-[4/3] overflow-hidden rounded-2xl shadow-md ring-1 ring-black/5 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-[#0056b3]/25"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition duration-700 ease-out group-hover:scale-110"
                  style={{ backgroundImage: `url(${card.image})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                <p className="absolute bottom-0 left-0 right-0 p-4 text-xs font-bold uppercase leading-snug tracking-wide text-white sm:text-sm">
                  {card.title}
                </p>
              </Link>
            ),
          )}
        </div>
      </MotionInView>
    </section>
  );
}
