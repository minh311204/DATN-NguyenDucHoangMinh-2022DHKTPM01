"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  Cloud,
  Globe2,
  Luggage,
  MapPin,
  Mountain,
  Rocket,
  type LucideIcon,
} from "lucide-react";
import { MotionInView } from "@/components/motion-in-view";

const CTA_GREEN = "#5B9A42";

const ABOUT_HERO = "/assets/images/about/tourist-with-thumb-up.jpg";

/**
 * 6 icon trên một vòng, giống mẫu: địa cầu, bầu trời, vali, tên lửa, điểm đến, cảnh quan
 * (Cloud thay bóng khí cầu; Lucide không có icon khinh khí cầu).
 */
const ORBIT_ICONS: { Icon: LucideIcon; className: string }[] = [
  { Icon: Globe2, className: "text-amber-500" },
  { Icon: Cloud, className: "text-sky-500" },
  { Icon: Luggage, className: "text-rose-500" },
  { Icon: Rocket, className: "text-violet-500" },
  { Icon: MapPin, className: "text-emerald-600" },
  { Icon: Mountain, className: "text-cyan-600" },
];

const ORBIT_STEPS = 6;

/**
 * Dải nền trắng. Ảnh lớn (gần cao cột trái) + 6 icon xoay đều 60° trên một vòng nét đứt.
 */
export function HomeAboutSnapshotSection() {
  return (
    <section
      className="w-full min-w-0 border-b border-stone-200/80 bg-white"
      aria-label="Lý do chọn TourBooking"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid items-stretch gap-10 lg:grid-cols-2 lg:gap-14">
          <MotionInView
            axis="right"
            className="order-2 min-h-0 lg:order-1"
            rootMargin="0px 0px 5% 0px"
          >
            <h2 className="text-2xl font-extrabold leading-snug text-stone-900 sm:text-3xl sm:leading-tight">
              Du lịch với sự tự tin — lý do hàng đầu để chọn công ty chúng tôi
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-stone-500 sm:text-base">
              Chúng tôi sẽ nỗ lực hết mình để biến giấc mơ du lịch của bạn thành hiện thực những viên ngọc ẩn và những điểm tham quan không thể bỏ qua
            </p>
            <div
              className="relative my-8 flex min-h-[2.5rem] items-center gap-2 sm:gap-4"
              role="separator"
              aria-label="Kinh nghiệm"
            >
              <div className="h-px min-w-0 flex-1 bg-stone-200" />
              <p className="shrink-0 text-center text-sm leading-relaxed text-stone-600 sm:text-[15px]">
                <span>Chúng tôi có </span>
                <span className="inline-block align-middle text-[0.9em]">
                  <span className="inline-block rounded-md bg-amber-500 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white sm:px-3 sm:py-1.5 sm:text-sm">
                    5+ Năm
                  </span>
                </span>
                <span> kinh nghiệm</span>
              </p>
              <div className="h-px min-w-0 flex-1 bg-stone-200" />
            </div>
            <div className="grid max-w-md grid-cols-2 gap-6 sm:gap-8">
              <div>
                <p className="text-3xl font-black tabular-nums text-stone-900 sm:text-4xl">
                  1K+
                </p>
                <p className="mt-1 text-sm text-stone-500">Điểm đến phổ biến</p>
              </div>
              <div>
                <p className="text-3xl font-black tabular-nums text-stone-900 sm:text-4xl">
                  8M+
                </p>
                <p className="mt-1 text-sm text-stone-500">Khách hàng hài lòng</p>
              </div>
            </div>
            <Link
              href="/tours"
              className="mt-8 inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-white shadow-md transition duration-200 hover:brightness-110 active:scale-[0.99]"
              style={{ backgroundColor: CTA_GREEN }}
            >
              Khám phá điểm đến
              <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} />
            </Link>
          </MotionInView>
          <MotionInView
            axis="left"
            className="order-1 flex h-full min-h-0 w-full self-stretch lg:order-2"
            delayMs={60}
            rootMargin="0px 0px 5% 0px"
          >
            <div className="flex h-full w-full min-h-[18rem] items-center justify-center sm:min-h-[20rem]">
              <div
                className="relative aspect-square w-full max-w-[min(100%,44rem)] shrink-0 [--orbit-r:min(7.25rem,24vw)] sm:[--orbit-r:min(8.5rem,22vw)] lg:max-h-[min(100%,44rem)] lg:[--orbit-r:min(15.25rem,20vw)]"
                aria-hidden={false}
              >
                <div className="relative z-[5] flex h-full w-full items-center justify-center px-0 py-[1%] sm:px-1 sm:py-[2%]">
                  <div className="w-[min(100%,_88%)] max-w-[22rem] bg-white sm:max-w-[30rem] lg:max-w-[40rem] lg:w-[min(100%,_92%)]">
                    <Image
                      src={ABOUT_HERO}
                      width={800}
                      height={1000}
                      alt="Du khách hài lòng với hành trình"
                      className="h-auto w-full max-w-full object-contain mix-blend-multiply"
                      sizes="(max-width: 1024px) 92vw, 640px"
                      priority={false}
                    />
                  </div>
                </div>

                <div
                  className="pointer-events-none absolute inset-[5%] z-[6] rounded-full border border-dashed border-stone-200/80"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute inset-[1.5%] z-[6] rounded-full border-2 border-dashed border-stone-200/90"
                  aria-hidden
                />

                <div
                  className="pointer-events-none absolute inset-0 z-20"
                  aria-hidden
                >
                  <div className="home-about-orbit-spin relative h-full w-full">
                    {ORBIT_ICONS.map(({ Icon, className: iconClass }, i) => {
                      const deg = (360 / ORBIT_STEPS) * i;
                      return (
                        <div
                          key={i}
                          className="absolute left-1/2 top-1/2 h-11 w-11 sm:h-12 sm:w-12"
                          style={{
                            transform: `translate(-50%, -50%) rotate(${deg}deg) translateY(calc(-1 * var(--orbit-r)))`,
                          }}
                        >
                          <div className="home-about-orbit-icon flex h-full w-full items-center justify-center rounded-full bg-white shadow-md ring-2 ring-stone-200/80">
                            <Icon
                              className={`h-[1.15rem] w-[1.15rem] sm:h-6 sm:w-6 ${iconClass}`}
                              strokeWidth={2}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </MotionInView>
        </div>
      </div>
    </section>
  );
}
