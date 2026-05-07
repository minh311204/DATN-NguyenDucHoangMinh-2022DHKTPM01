"use client";

import Image from "next/image";
import Link from "next/link";
import { Tent } from "lucide-react";
import { MotionInView } from "@/components/motion-in-view";

const IMG_BOX = "/assets/images/features/features-box.jpg";
const AUTH = [
  "/assets/images/features/feature-author1.jpg",
  "/assets/images/features/feature-author2.jpg",
  "/assets/images/features/feature-author3.jpg",
] as const;

const FEATURE_ITEMS: { title: string; desc: string }[] = [
  {
    title: "Chinh phục cảnh quan Việt Nam",
    desc: "Khám phá những cảnh đẹp hùng vĩ và tuyệt vời của đất nước Việt Nam.",
  },
  {
    title: "Khám phá di sản Việt Nam",
    desc: "Khám phá các di sản thế giới và những kỳ quan thiên nhiên nổi tiếng.",
  },
  {
    title: "Trải nghiệm đặc sắc Việt Nam",
    desc: "Trải nghiệm những hoạt động và lễ hội đặc trưng của văn hóa Việt.",
  },
  {
    title: "Vẻ đẹp thiên nhiên Việt",
    desc: "Chinh phục vẻ đẹp tự nhiên hoang sơ và kỳ vĩ của Việt Nam.",
  },
];

const BRAND_ORANGE_4K = "#f97316";
const BRAND_GREEN = "#4CAF50";

const FEATURE_STAGGER_RIGHT_PT = "sm:pt-8 md:pt-11 lg:pt-12";

type FeatureItem = (typeof FEATURE_ITEMS)[number];

function FeatureProductCard({ title, desc }: FeatureItem) {
  return (
    <li className="flex min-h-0 list-none">
      <Link
        href="/tours"
        className="group relative flex w-full min-h-0 flex-1 flex-col gap-4 overflow-hidden rounded-2xl border border-stone-200/55 bg-stone-50/95 p-6 shadow-[0_1px_0_rgba(0,0,0,0.04),0_3px_16px_rgba(15,23,42,0.05),0_10px_28px_rgba(15,23,42,0.04)] transition duration-300 ease-out [transition-property:box-shadow,transform,border-color,background-color] sm:gap-4 sm:rounded-2xl sm:p-7 md:p-[1.75rem] hover:-translate-y-0.5 hover:border-stone-200/80 hover:bg-white hover:shadow-[0_4px_24px_rgba(15,23,42,0.07),0_1px_3px_rgba(15,23,42,0.04)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500/50"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 h-[2px] w-full origin-left scale-x-0 bg-gradient-to-r from-emerald-500/0 via-emerald-400/30 to-emerald-500/0 transition duration-300 group-hover:scale-x-100"
        />
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50/80 text-emerald-600 ring-1 ring-emerald-100/80 transition duration-300 group-hover:bg-emerald-100/70 group-hover:ring-emerald-200/50 sm:h-12 sm:w-12">
          <Tent
            className="h-5 w-5 sm:h-[1.35rem] sm:w-[1.35rem]"
            strokeWidth={1.75}
            style={{ color: "#15803d" }}
          />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <h3 className="text-base font-extrabold leading-snug tracking-tight text-stone-900 transition duration-200 group-hover:text-[#0d5aa7] sm:text-[1.02rem]">
            {title}
          </h3>
          <p className="mt-2.5 text-left text-sm font-normal leading-relaxed text-stone-500 sm:text-[15px] sm:leading-[1.55]">
            {desc}
          </p>
        </div>
      </Link>
    </li>
  );
}

export function HomeFeaturesSection() {
  return (
    <section
      className="relative z-10 border-b border-stone-200/80 bg-[#fafafa] py-12 sm:py-16 md:py-20"
      aria-label="Lý do chọn dịch vụ"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-start gap-10 md:gap-10 lg:grid-cols-12 lg:gap-10 xl:gap-12">
          <MotionInView
            axis="right"
            className="min-w-0 sm:pl-0 lg:col-span-6"
            rootMargin="0px 0px 5% 0px"
          >
            <h2 className="text-2xl font-extrabold leading-snug text-stone-900 sm:text-3xl sm:leading-tight">
              Trải nghiệm du lịch tuyệt đỉnh mang đến sự khác biệt cho công ty chúng tôi
            </h2>

            <div className="relative mt-7 sm:mt-8">
              <div className="flex flex-col items-stretch gap-5 sm:min-h-[15rem] sm:flex-row sm:items-stretch sm:gap-0">
                <div className="relative z-20 mx-auto w-full max-w-[12rem] shrink-0 sm:mx-0 sm:w-40 sm:max-w-none sm:self-center sm:-mr-12 md:w-44 md:-mr-14 lg:-mr-16">
                  <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl bg-stone-100 shadow-[0_2px_12px_rgba(0,0,0,0.05),0_1px_1px_rgba(0,0,0,0.03)] ring-1 ring-stone-200/20 md:rounded-[1.75rem] lg:rounded-[2rem]">
                    <Image
                      src={IMG_BOX}
                      alt="Cặp đôi tham quan, xem bản đồ"
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 200px"
                      priority={false}
                    />
                  </div>
                </div>

                <div className="relative z-0 min-w-0 flex-1 self-stretch">
                  <div className="h-full rounded-2xl border border-stone-200/30 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_18px_40px_-12px_rgba(0,0,0,0.07)] sm:rounded-[1.85rem] sm:p-5 sm:py-6 sm:pl-[max(1.5rem,20%)] sm:pr-6 md:rounded-[2.1rem] md:py-7 md:pl-24 md:pr-8 lg:rounded-[2.5rem] lg:pl-28 lg:pr-9">
                    <div className="mb-3 flex flex-wrap items-center gap-1.5 sm:gap-1">
                      <div className="flex -space-x-3">
                        {AUTH.map((src) => (
                          <div
                            key={src}
                            className="h-8 w-8 overflow-hidden rounded-full border-2 border-white ring-1 ring-stone-200/35 sm:h-9 sm:w-9"
                          >
                            <Image
                              src={src}
                              alt=""
                              width={40}
                              height={40}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                      <span
                        className="inline-flex h-7 min-w-[2.25rem] items-center justify-center rounded-full px-2 text-[11px] font-bold text-white sm:h-8 sm:px-2.5 sm:text-xs"
                        style={{ backgroundColor: BRAND_ORANGE_4K }}
                      >
                        4k+
                      </span>
                    </div>
                    <h3 className="text-lg font-extrabold leading-snug text-stone-900 sm:text-[1.35rem] sm:leading-tight">
                      850K+ Khách hàng hài lòng
                    </h3>
                    <div
                      className="my-4 flex w-full max-w-md items-center gap-2.5 sm:my-5 sm:gap-3"
                      role="separator"
                      aria-label="Kinh nghiệm"
                    >
                      <div className="h-px min-w-0 flex-1 bg-stone-200/45" />
                      <span
                        className="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold text-white sm:px-3 sm:py-1.5 sm:text-sm"
                        style={{ backgroundColor: BRAND_GREEN }}
                      >
                        5+ Năm
                      </span>
                      <div className="h-px min-w-0 flex-1 bg-stone-200/45" />
                    </div>
                    <p className="text-sm font-normal leading-relaxed text-stone-600 sm:text-[15px]">
                      Chúng tôi tự hào cung cấp các hành trình được cá nhân hóa
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </MotionInView>

          <MotionInView
            axis="left"
            className="min-w-0 lg:col-span-6 lg:pt-1"
            delayMs={50}
            rootMargin="0px 0px 5% 0px"
          >
            <ul className="space-y-4 sm:hidden" role="list">
              {FEATURE_ITEMS.map((item) => (
                <FeatureProductCard key={item.title} {...item} />
              ))}
            </ul>
            <div
              className="hidden min-w-0 sm:flex sm:flex-row sm:items-start sm:gap-4 md:gap-5"
              role="presentation"
            >
              <ul className="flex min-w-0 flex-1 flex-col gap-4 md:gap-5" role="list">
                <FeatureProductCard
                  key={FEATURE_ITEMS[0].title}
                  {...FEATURE_ITEMS[0]}
                />
                <FeatureProductCard
                  key={FEATURE_ITEMS[2].title}
                  {...FEATURE_ITEMS[2]}
                />
              </ul>
              <ul
                className={`flex min-w-0 flex-1 flex-col gap-4 md:gap-5 ${FEATURE_STAGGER_RIGHT_PT}`}
                role="list"
              >
                <FeatureProductCard
                  key={FEATURE_ITEMS[1].title}
                  {...FEATURE_ITEMS[1]}
                />
                <FeatureProductCard
                  key={FEATURE_ITEMS[3].title}
                  {...FEATURE_ITEMS[3]}
                />
              </ul>
            </div>
          </MotionInView>
        </div>
      </div>
    </section>
  );
}
