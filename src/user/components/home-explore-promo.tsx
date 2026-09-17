"use client";

import type { ComponentType } from "react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Mountain,
  Palmtree,
  Percent,
  UtensilsCrossed,
  Waves,
} from "lucide-react";
import { MotionInView } from "./motion-in-view";

/** Xanh chủ đạo */
const BRAND = "#0056b3";

/** Ảnh trong public/assets/images — encode từng phần để URL đúng với tên tiếng Việt */
function vnThumb(folder: string, file: string): string {
  return `/assets/images/${encodeURIComponent(folder)}/${encodeURIComponent(file)}`;
}

const CATEGORIES: {
  Icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  href: string;
}[] = [
  { Icon: MapPin, label: "Tour khắp VN", href: "/tours" },
  { Icon: Waves, label: "Biển đảo", href: "/tours?q=bi%E1%BB%83n" },
  { Icon: Mountain, label: "Tây Bắc · vùng cao", href: "/tours?q=H%C3%A0+Giang" },
  { Icon: Palmtree, label: "Miền Trung", href: "/tours?q=%C4%90%C3%A0+N%E1%BA%B5ng" },
  { Icon: UtensilsCrossed, label: "Ẩm thực 3 miền", href: "/tours?q=%E1%BA%A9m+th%E1%BB%B1c" },
  { Icon: Percent, label: "Ưu đãi nội địa", href: "/tours" },
];

type BannerMini = { kicker: string; price: string; sub: string };

/** Banner khuyến mãi — toàn bộ điểm đến trong nước */
const BANNER_SLIDES: BannerMini[][] = [
  [
    { kicker: "Hà Nội · văn hoá & ẩm thực", price: "Từ 1.990.000đ", sub: "City tour · 2–3 ngày" },
    { kicker: "Vịnh Hạ Long", price: "Từ 2.400.000đ", sub: "Thuyền overnight · trọn gói" },
    { kicker: "Sa Pa · Fansipan", price: "Từ 2.890.000đ", sub: "Tàu leo núi · khách sạn 3*" },
  ],
  [
    { kicker: "Huế · di sản cố đô", price: "Từ 2.100.000đ", sub: "Tham quan · 2 ngày 1 đêm" },
    { kicker: "Đà Nẵng · Bà Nà", price: "Từ 2.600.000đ", sub: "Cáp treo · vé tham quan" },
    { kicker: "Hội An · phố cổ", price: "Từ 1.800.000đ", sub: "Làng nghề · đêm phố cổ" },
  ],
  [
    { kicker: "Nha Trang · biển xanh", price: "Từ 2.200.000đ", sub: "Resort 4* · gói nghỉ" },
    { kicker: "Đà Lạt · thành phố ngàn hoa", price: "Từ 1.950.000đ", sub: "Tham quan · 3 ngày" },
    { kicker: "Phan Thiết · Mũi Né", price: "Từ 2.300.000đ", sub: "Biển · resort cao cấp" },
  ],
  [
    { kicker: "Phú Quốc · đảo ngọc", price: "Từ 3.500.000đ", sub: "Bay nội địa · combo khách sạn" },
    { kicker: "Cần Thơ · miền Tây", price: "Từ 1.650.000đ", sub: "Chợ nổi · 2 ngày 1 đêm" },
    { kicker: "TP.HCM · cảm hứng đô thị", price: "Từ 1.200.000đ", sub: "City tour · Cu Chi tùy chọn" },
  ],
  [
    { kicker: "Ưu đãi đặt online", price: "Giảm tới 15%", sub: "Áp dụng tour nội địa" },
    { kicker: "Thanh toán linh hoạt", price: "VNPAY · MoMo", sub: "An toàn & nhanh chóng" },
    { kicker: "Tư vấn miễn phí", price: "Hotline 24/7", sub: "Đội ngũ hỗ trợ tiếng Việt" },
  ],
];

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

function PromoTile({ b }: { b: BannerMini }) {
  return (
    <div
      className="motion-promo-tile-enter relative min-h-[140px] overflow-hidden rounded-lg bg-gradient-to-br px-4 py-4 text-white shadow-md transition duration-300 hover:-translate-y-0.5 hover:shadow-lg sm:min-h-[160px]"
      style={{
        backgroundImage: `linear-gradient(135deg, ${BRAND} 0%, #003d82 55%, #001a38 100%)`,
      }}
    >
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/25 to-transparent"
        aria-hidden
      />
      <MapPin
        className="absolute right-3 top-3 h-8 w-8 opacity-20"
        strokeWidth={1.25}
        aria-hidden
      />
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/85">
        TourBooking · Việt Nam
      </p>
      <p className="mt-2 line-clamp-2 text-sm font-bold leading-snug">{b.kicker}</p>
      <p className="mt-2 text-xl font-black tracking-tight text-amber-300">
        {b.price}
      </p>
      <p className="mt-1 text-xs text-white/80">{b.sub}</p>
    </div>
  );
}

export function HomeExplorePromo() {
  const [bannerSlide, setBannerSlide] = useState(0);
  const [exploreStart, setExploreStart] = useState(0);
  const slideCount = BANNER_SLIDES.length;
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

  useEffect(() => {
    const t = window.setInterval(() => {
      setBannerSlide((i) => (i + 1) % slideCount);
    }, 6500);
    return () => window.clearInterval(t);
  }, [slideCount]);

  return (
    <section
      className="w-full min-w-0 border-b border-sky-200/60"
      style={{ backgroundColor: "#e0f2f7" }}
    >
      <MotionInView className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        {/* Hàng icon — gợi ý theo du lịch trong nước */}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 sm:gap-4">
          {CATEGORIES.map(({ Icon, label, href }) => (
            <Link
              key={label}
              href={href}
              className="group flex flex-col items-center gap-2 rounded-xl border border-white/60 bg-white/90 py-3 shadow-sm ring-1 ring-sky-200/50 transition duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-md"
            >
              <span
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-sky-100 transition duration-300 group-hover:scale-110 group-hover:ring-sky-200 sm:h-14 sm:w-14"
                style={{ color: BRAND }}
              >
                <Icon className="h-6 w-6 transition duration-300 group-hover:scale-105 sm:h-7 sm:w-7" strokeWidth={1.75} />
              </span>
              <span className="text-center text-[10px] font-semibold uppercase leading-tight tracking-wide text-stone-800 sm:text-[11px]">
                {label}
              </span>
            </Link>
          ))}
        </div>

        {/* Carousel banner */}
        <div className="relative mt-10">
          <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
            {BANNER_SLIDES[bannerSlide].map((b, idx) => (
              <PromoTile key={`${bannerSlide}-${idx}`} b={b} />
            ))}
          </div>
          <div className="mt-5 flex justify-center gap-2">
            {BANNER_SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setBannerSlide(i)}
                className={
                  "h-2 w-2 rounded-full transition duration-300 " +
                  (i === bannerSlide
                    ? "w-6 bg-[#0056b3]"
                    : "bg-stone-300 hover:bg-stone-400")
                }
                aria-label={`Trang khuyến mãi ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Khám phá — thumbnail từ public/assets/images */}
        <div className="mt-14 flex flex-col gap-4 sm:mt-16 sm:flex-row sm:items-end sm:justify-between">
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
