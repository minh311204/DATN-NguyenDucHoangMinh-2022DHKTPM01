"use client";

import Image from "next/image";
import Link from "next/link";
import { type FormEvent, type ReactNode, useState } from "react";
import {
  ArrowRight,
  ChevronUp,
  Clock,
  Facebook,
  Mail,
  MapPinned,
  Phone,
  Youtube,
} from "lucide-react";
import { HEADER_LOGO_SRC } from "@/lib/site-brand";
import { MotionInView } from "@/components/motion-in-view";

const FOOTER_BG = "/assets/images/about/banner.jpg";

const SERVICE_LINKS = [
  { href: "/login", label: "Đăng nhập" },
  { href: "/register", label: "Đăng ký" },
  { href: "/tours", label: "Đặt tour" },
  { href: "/tours", label: "Khám phá lộ trình" },
  { href: "/bookings", label: "Đặt chỗ của tôi" },
];

const COMPANY_LINKS = [
  { href: "/gioi-thieu", label: "Giới thiệu về công ty" },
  { href: "/lien-he", label: "Liên hệ với chúng tôi" },
  { href: "/tin-tuc", label: "Tin tức" },
];

const DESTINATION_LINKS = [
  { href: "/tours", label: "Miền Bắc" },
  { href: "/tours", label: "Miền Trung" },
  { href: "/tours", label: "Miền Nam" },
];

const CATEGORY_LINKS = [
  { href: "/tours?tourLine=PREMIUM", label: "Tour cao cấp" },
  { href: "/tours?tourLine=GOOD_VALUE", label: "Giá tốt" },
  { href: "/tours?tourLine=ECONOMY", label: "Tiết kiệm" },
];

const BOTTOM_NAV = [
  { href: "/gioi-thieu", label: "Điều khoản" },
  { href: "/gioi-thieu", label: "Chính sách bảo mật" },
  { href: "/gioi-thieu", label: "Thông báo pháp lý" },
  { href: "/lien-he", label: "Khả năng truy cập" },
];

function socialIcon(
  href: string,
  label: string,
  children: ReactNode,
  className?: string,
) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={
        "flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition hover:border-white/50 hover:bg-white/20 " +
        (className ?? "")
      }
    >
      {children}
    </a>
  );
}

function FooterNewsletterBlock() {
  const [done, setDone] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setDone(true);
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Đăng ký nhận bản tin
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-white/75">
          Hơn{" "}
          <span className="font-semibold text-amber-300 tabular-nums">34.500</span>+
          lượt trải nghiệm — nhận ưu đãi và cảm hứng du lịch mỗi tuần.
        </p>
      </div>
      {done ? (
        <p className="rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100">
          Cảm ơn bạn đã đăng ký.
        </p>
      ) : (
        <form
          onSubmit={onSubmit}
          className="flex max-w-xl flex-col gap-3 sm:flex-row sm:items-stretch"
        >
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="Địa chỉ email"
            className="min-h-[52px] flex-1 rounded-full border border-white/20 bg-white/10 px-5 text-[15px] text-white outline-none ring-emerald-400/0 transition placeholder:text-white/45 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/30"
          />
          <button
            type="submit"
            className="inline-flex min-h-[52px] shrink-0 items-center justify-center gap-2 rounded-full bg-emerald-500 px-7 text-[15px] font-semibold text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-400"
          >
            Đăng ký
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </form>
      )}
    </div>
  );
}

function FooterLinkColumn({
  title,
  links,
  delayMs,
}: {
  title: string;
  links: { href: string; label: string }[];
  delayMs?: number;
}) {
  return (
    <MotionInView axis="up" delayMs={delayMs ?? 0} rootMargin="0px 0px -8% 0px">
      <div>
        <h5 className="text-base font-semibold text-white">{title}</h5>
        <ul className="mt-5 space-y-3 text-[15px]">
          {links.map((l) => (
            <li key={l.href + l.label}>
              <Link
                href={l.href}
                className="text-white/70 transition hover:text-white hover:underline"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </MotionInView>
  );
}

function FooterScrollTopEmbedded() {
  function goTop() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <button
      type="button"
      onClick={goTop}
      aria-label="Lên đầu trang"
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white shadow-lg shadow-black/20 transition hover:bg-amber-400"
    >
      <ChevronUp className="h-6 w-6" strokeWidth={2.5} />
    </button>
  );
}

/** Footer trang công khai — bố cục theo Travela `footer_home.blade.php` */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative isolate overflow-hidden text-white">
      <div className="pointer-events-none absolute inset-0 -z-20">
        <Image
          src={FOOTER_BG}
          alt=""
          fill
          className="object-cover object-center"
          sizes="100vw"
          priority={false}
        />
      </div>
      <div className="absolute inset-0 -z-10 bg-slate-900/88" aria-hidden />

      {/* footer-top */}
      <div className="mx-auto max-w-6xl px-4 pt-16 sm:px-6 sm:pt-20 lg:pt-24">
        <div className="flex flex-col gap-12 pb-10 lg:flex-row lg:justify-between lg:gap-10 lg:pb-12">
          <MotionInView
            className="max-w-lg lg:max-w-md"
            axis="up"
            rootMargin="0px 0px -8% 0px"
          >
            <Link href="/" className="inline-block">
              <Image
                src={HEADER_LOGO_SRC}
                alt="TourBooking"
                width={200}
                height={64}
                className="h-12 w-auto brightness-0 invert sm:h-14"
              />
            </Link>
            <p className="mt-6 text-[15px] leading-relaxed text-white/75">
              Chúng tôi biên soạn các hành trình riêng biệt phù hợp với sở thích của bạn,
              đảm bảo mọi chuyến đi đều liền mạch và gợi mở thêm những điểm đến ẩn giấu.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {socialIcon(
                "https://www.facebook.com",
                "Facebook",
                <Facebook className="h-4 w-4" />,
              )}
              {socialIcon(
                "https://www.youtube.com",
                "YouTube",
                <Youtube className="h-4 w-4" />,
              )}
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X (Twitter)"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-white/10 text-sm font-bold text-white transition hover:border-white/50 hover:bg-white/20"
              >
                𝕏
              </a>
            </div>
          </MotionInView>

          <MotionInView
            className="max-w-xl flex-1 lg:pt-1"
            axis="up"
            delayMs={50}
            rootMargin="0px 0px -8% 0px"
          >
            <FooterNewsletterBlock />
          </MotionInView>
        </div>
      </div>

      {/* widget-area */}
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-5">
            <FooterLinkColumn title="Dịch vụ" links={SERVICE_LINKS} delayMs={0} />
            <FooterLinkColumn title="Công ty" links={COMPANY_LINKS} delayMs={50} />
            <FooterLinkColumn title="Điểm đến" links={DESTINATION_LINKS} delayMs={100} />
            <FooterLinkColumn title="Thể loại" links={CATEGORY_LINKS} delayMs={150} />
            <MotionInView
              className="col-span-2 md:col-span-3 lg:col-span-1"
              axis="up"
              delayMs={200}
              rootMargin="0px 0px -8% 0px"
            >
              <div>
                <h5 className="text-base font-semibold text-white">Liên hệ</h5>
                <ul className="mt-5 space-y-4 text-[15px] text-white/75">
                  <li className="flex gap-3">
                    <MapPinned className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                    <span>190 Pasteur, Phường Xuân Hòa, TP. Hồ Chí Minh, Việt Nam</span>
                  </li>
                  <li className="flex gap-3">
                    <Mail className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                    <a href="mailto:info@tourbooking.vn" className="hover:text-white">
                      info@tourbooking.vn
                    </a>
                  </li>
                  <li className="flex gap-3">
                    <Clock className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                    Thứ Hai – Thứ Sáu, 08:00 – 17:00
                  </li>
                  <li className="flex gap-3">
                    <Phone className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                    <a href="tel:1900646888" className="hover:text-white">
                      1900 646 888
                    </a>
                  </li>
                </ul>
              </div>
            </MotionInView>
          </div>
        </div>
      </div>

      {/* footer-bottom — nút lên đầu trang căn giữa theo toàn bộ chiều ngang footer */}
      <div className="relative border-t border-white/10 pb-10 pt-6">
        <div className="pointer-events-none absolute -top-7 left-1/2 z-10 -translate-x-1/2 md:-top-8">
          <div className="pointer-events-auto">
            <FooterScrollTopEmbedded />
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between sm:gap-4">
            <p className="text-center text-sm text-white/60 sm:text-start">
              © {year}{" "}
              <Link href="/" className="text-white/85 hover:text-white hover:underline">
                TourBooking
              </Link>
              , All rights reserved
            </p>
            <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm sm:justify-end">
              {BOTTOM_NAV.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-white/65 transition hover:text-white hover:underline"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
