"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  Check,
  Globe2,
} from "lucide-react";
import { MotionInView } from "@/components/motion-in-view";

const IMG = {
  banner: "/assets/images/about/banner.jpg",
  feature1: "/assets/images/about/about-feature1.jpg",
  feature2: "/assets/images/about/about-feature2.jpg",
  aboutPage: "/assets/images/about/about-page.jpg",
  tourist: "/assets/images/about/tourist-with-thumb-up.jpg",
} as const;

const CTA_GREEN = "#5B9A42";
const ACCENT_ORANGE = "#FF9800";
const RIBBON_ORANGE = "#F57C00";

const INTRO_LIST = [
  "Cơ quan trải nghiệm",
  "Đội ngũ chuyên nghiệp",
  "Du lịch chi phí hợp lý",
  "Hỗ trợ trực tuyến 24/7",
];

const TEAM = [
  {
    name: "Nguyễn Đức Hoàng Minh",
    role: "Founder",
    image: IMG.tourist,
  },
  {
    name: "Phạm Đình Dũng",
    role: "Co-founder",
    image: IMG.feature2,
  },
] as const;

function AboutPageHero() {
  return (
    <header className="relative isolate h-[min(70vw,360px)] w-full sm:h-[min(56vw,420px)] md:h-[min(50vw,480px)]">
      <Image
        src={IMG.banner}
        alt="Trải nghiệm du lịch ngoài trời"
        fill
        priority
        className="object-cover"
        sizes="100vw"
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-stone-900/80 via-stone-900/35 to-stone-900/20"
        aria-hidden
      />
      <div className="relative z-10 mx-auto flex h-full max-w-6xl flex-col justify-end px-4 pb-10 pt-24 sm:px-6 sm:pb-12 sm:pt-28">
        <MotionInView axis="left" className="w-full" rootMargin="0px 0px 2% 0px">
          <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow sm:text-4xl md:text-5xl">
            Giới thiệu
          </h1>
        </MotionInView>
        <MotionInView
          axis="right"
          className="mt-4 w-full"
          delayMs={120}
          rootMargin="0px 0px 2% 0px"
        >
          <nav aria-label="Breadcrumb" className="text-sm text-white/90">
            <ol className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              <li>
                <Link href="/" className="text-emerald-200 underline-offset-2 hover:underline">
                  Trang chủ
                </Link>
              </li>
              <li aria-hidden className="text-white/40">
                /
              </li>
              <li className="text-white/95">Giới thiệu</li>
            </ol>
          </nav>
        </MotionInView>
      </div>
    </header>
  );
}

export function AboutPageContent() {
  return (
    <div className="bg-white">
      <AboutPageHero />

      {/* 1 — Về chúng tôi (ref ảnh 2) */}
      <section className="border-b border-stone-200/80 py-12 sm:py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-12 lg:gap-10 lg:gap-y-6">
            <MotionInView className="lg:col-span-3" axis="up" rootMargin="0px 0px 5% 0px">
              <span className="inline-block rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">
                Về chúng tôi
              </span>
            </MotionInView>
            <MotionInView
              className="lg:col-span-9"
              axis="up"
              delayMs={40}
              rootMargin="0px 0px 5% 0px"
            >
              <h2 className="text-2xl font-extrabold leading-snug text-stone-900 sm:text-3xl md:text-4xl">
                Kinh nghiệm và công ty du lịch chuyên nghiệp tại Việt Nam
              </h2>
            </MotionInView>

            <div className="grid items-start gap-8 lg:col-span-12 lg:grid-cols-12 lg:gap-10">
              <MotionInView
                className="flex justify-center lg:col-span-4 lg:justify-start"
                axis="up"
                delayMs={50}
                rootMargin="0px 0px 5% 0px"
              >
                <div className="relative pt-2">
                  <div
                    className="absolute -right-1 top-0 z-10 max-w-[9rem] rotate-6 rounded-sm px-2.5 py-1.5 text-center text-[10px] font-bold uppercase leading-tight text-white shadow-md sm:text-xs"
                    style={{ backgroundColor: RIBBON_ORANGE }}
                  >
                    Năm kinh nghiệm
                  </div>
                  <div className="flex h-52 w-52 flex-col items-center justify-center rounded-full border-2 border-stone-200 bg-white shadow-sm sm:h-56 sm:w-56">
                    <span className="text-sm text-stone-600">Chúng tôi có</span>
                    <span className="mt-1 text-5xl font-black tabular-nums text-stone-900 sm:text-6xl">
                      5+
                    </span>
                  </div>
                </div>
              </MotionInView>
              <MotionInView
                className="lg:col-span-8"
                axis="up"
                delayMs={80}
                rootMargin="0px 0px 5% 0px"
              >
                <p className="max-w-2xl leading-relaxed text-stone-600">
                  Chúng tôi tạo ra những trải nghiệm thành phố đáng nhớ: tour có hướng dẫn chuyên nghiệp, lịch linh
                  hoạt và sự hỗ trợ rõ ràng trên TourBooking — để bạn an tâm từ lúc lên kế hoạch đến khi về.
                </p>
                <ul className="mt-8 grid gap-3 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-3">
                  {INTRO_LIST.map((line) => (
                    <li key={line} className="flex items-start gap-3 text-[15px] font-semibold text-stone-800">
                      <span
                        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white"
                        style={{ backgroundColor: ACCENT_ORANGE }}
                        aria-hidden
                      >
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      </span>
                      {line}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/tours"
                  className="mt-8 inline-flex items-center gap-2 rounded-full border-2 border-stone-900 bg-white px-6 py-3 text-sm font-semibold text-stone-900 transition hover:bg-stone-50"
                >
                  Khám phá tour
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </MotionInView>
            </div>
          </div>
        </div>
      </section>

      {/* 2 — Hai ảnh dọc + hộp cam & xanh (ref ảnh 3) */}
      <section className="border-b border-stone-100 bg-[#fafafa] py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-3 md:items-stretch">
            <MotionInView className="min-h-0" axis="up" rootMargin="0px 0px 5% 0px">
              <div className="relative h-full min-h-[320px] overflow-hidden rounded-2xl shadow-md sm:min-h-[400px] md:min-h-0">
                <Image
                  src={IMG.feature1}
                  alt="Du khách với bản đồ"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
            </MotionInView>
            <MotionInView
              className="min-h-0"
              axis="up"
              delayMs={50}
              rootMargin="0px 0px 5% 0px"
            >
              <div className="relative h-full min-h-[320px] overflow-hidden rounded-2xl shadow-md sm:min-h-[400px] md:min-h-0">
                <Image
                  src={IMG.feature2}
                  alt="Phong cảnh du lịch"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
            </MotionInView>
            <MotionInView
              className="flex min-h-0 flex-col gap-4"
              axis="up"
              delayMs={100}
              rootMargin="0px 0px 5% 0px"
            >
              <div
                className="flex flex-1 flex-col justify-center rounded-2xl p-6 text-white shadow-md sm:p-7"
                style={{ backgroundColor: ACCENT_ORANGE }}
              >
                <Award className="h-9 w-9 shrink-0" strokeWidth={1.5} />
                <h3 className="mt-4 text-lg font-bold leading-snug sm:text-xl">
                  Chúng tôi là công ty đạt nhiều ghi nhận tích cực
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-white/90">
                  TourBooking cam kết sự rõ ràng, hỗ trợ tận tâm và trải nghiệm đặt tour thuận tiện cho du khách.
                </p>
              </div>
              <div
                className="flex flex-1 flex-col justify-center rounded-2xl p-6 text-white shadow-md sm:p-7"
                style={{ backgroundColor: CTA_GREEN }}
              >
                <Globe2 className="h-9 w-9 shrink-0" strokeWidth={1.5} />
                <h3 className="mt-4 text-lg font-bold leading-snug sm:text-xl">
                  Hàng trăm điểm đến &amp; lộ trình
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-white/90">
                  Đội ngũ của chúng tôi liên tục cập nhật tour, giá và lịch khởi hành — gọn gàng trên một nền
                  tảng.
                </p>
              </div>
            </MotionInView>
          </div>
        </div>
      </section>

      {/* 3 — Tự tin + ảnh (ref ảnh 4) */}
      <section className="border-b border-stone-200/80 py-12 sm:py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-stretch gap-10 lg:flex-row lg:gap-12">
            <MotionInView className="flex-1" axis="left" rootMargin="0px 0px 5% 0px">
              <h2 className="text-2xl font-extrabold leading-snug text-stone-900 sm:text-3xl md:max-w-xl">
                Du lịch với sự tự tin — lý do hàng đầu để chọn TourBooking
              </h2>
              <p className="mt-4 max-w-xl leading-relaxed text-stone-600">
                Chúng tôi phối hợp chặt chẽ cùng bạn: hiểu nhu cầu, gợi ý lộ trình, xác nhận đặt chỗ và thanh toán
                an toàn — giúp bạn tiết kiệm thời gian và yên tâm trước mỗi chuyến đi.
              </p>
              <div className="mt-8 grid max-w-md grid-cols-2 gap-8">
                <div>
                  <p className="text-3xl font-black tabular-nums text-stone-900 sm:text-4xl">10K+</p>
                  <p className="mt-1 text-sm text-stone-500">Điểm đến phổ biến</p>
                </div>
                <div>
                  <p className="text-3xl font-black tabular-nums text-stone-900 sm:text-4xl">3M+</p>
                  <p className="mt-1 text-sm text-stone-500">Khách hàng hài lòng</p>
                </div>
              </div>
              <Link
                href="/tours"
                className="mt-8 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
                style={{ backgroundColor: CTA_GREEN }}
              >
                Khám phá điểm đến
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </MotionInView>
            <MotionInView
              className="w-full flex-1 lg:max-w-[55%]"
              axis="right"
              delayMs={60}
              rootMargin="0px 0px 5% 0px"
            >
              <div className="relative overflow-hidden rounded-2xl shadow-lg ring-1 ring-stone-200/40">
                <div className="relative aspect-[4/3] w-full sm:aspect-[16/10]">
                  <Image
                    src={IMG.aboutPage}
                    alt="Khoảnh khắc du lịch"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
              </div>
            </MotionInView>
          </div>
        </div>
      </section>

      {/* 4 — Đội ngũ (ref ảnh 5) */}
      <section className="border-b border-stone-200/80 py-12 sm:py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <MotionInView className="text-center" axis="up" rootMargin="0px 0px 5% 0px">
            <h2 className="text-2xl font-extrabold text-stone-900 sm:text-3xl">
              Gặp gỡ những hướng dẫn &amp; đội ngũ tư vấn giàu kinh nghiệm
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-stone-600">
              <span className="inline-flex flex-wrap items-center justify-center gap-2">
                Hơn
                <span
                  className="inline-flex rounded-full px-2.5 py-0.5 text-sm font-bold text-white"
                  style={{ backgroundColor: CTA_GREEN }}
                >
                  34.000+
                </span>
                trải nghiệm phổ biến mà bạn sẽ nhớ
              </span>
            </p>
          </MotionInView>
          <ul className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-10 gap-y-12 sm:grid-cols-2 sm:gap-8 md:mt-14">
            {TEAM.map((m, i) => (
              <MotionInView key={m.name} axis="up" delayMs={i * 80} rootMargin="0px 0px 5% 0px">
                <li className="list-none">
                  <div className="relative flex flex-col items-center pb-8">
                    <div className="relative w-full max-w-sm overflow-hidden rounded-2xl shadow-lg">
                      <div className="relative aspect-[3/4] w-full">
                        <Image
                          src={m.image}
                          alt={m.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, 400px"
                        />
                      </div>
                    </div>
                    <div className="relative z-10 -mt-7 w-[88%] max-w-sm rounded-xl bg-white px-5 py-4 text-center shadow-lg ring-1 ring-stone-200/80">
                      <p className="text-sm font-bold uppercase tracking-wide text-stone-900">{m.name}</p>
                      <p className="mt-1 text-sm text-stone-500">{m.role}</p>
                    </div>
                  </div>
                </li>
              </MotionInView>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
