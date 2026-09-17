import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";
import { ContactFormBlock } from "@/components/contact-form-block";
import { MotionInView } from "@/components/motion-in-view";
import "./contact-travela.css";

export const metadata: Metadata = {
  title: "Liên hệ | TourBooking",
  description:
    "Liên hệ TourBooking — hỗ trợ đặt tour, hotline 1900 646 888, email info@tourbooking.vn.",
};

const IMG = "/assets/images/contact";

const TEAM_AVATARS = [1, 2, 3, 4, 5, 6, 7].map(
  (n) => `${IMG}/feature-author${n}.jpg`,
);

/**
 * Bản đồ chỉ đường (tương đương liên kết Maps của bạn; iframe cần output=embed).
 * Đích: Central Point, 219 Trung Kính — tọa độ lấy từ chuỗi !2d21.0200736 !1d105.79149
 */
const MAP_IFRAME =
  "https://www.google.com/maps?saddr=21.3425399%2C105.3716684&daddr=21.0200736%2C105.79149&hl=vi&dirflg=d&output=embed";

export default function ContactPage() {
  return (
    <div className="travela-contact">
      {/* Hero giống trang Giới thiệu (chữ dưới-trái, gradient) — ảnh contact/banner.jpg */}
      <section className="relative isolate z-1 h-[min(70vw,360px)] w-full overflow-hidden sm:h-[min(56vw,420px)] md:h-[min(50vw,480px)]">
        <Image
          src={`${IMG}/banner.jpg`}
          alt="Banner Liên hệ — cảnh du lịch ngoài trời"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-stone-900/80 via-stone-900/35 to-stone-900/20"
          aria-hidden
        />
        <div className="relative z-10 mx-auto flex h-full max-w-6xl flex-col justify-end px-4 pb-10 pt-24 sm:px-6 sm:pb-12 sm:pt-28">
          <MotionInView axis="left" className="w-full" rootMargin="0px 0px 2% 0px">
            <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow sm:text-4xl md:text-5xl">
              Liên hệ
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
                  <Link
                    href="/"
                    className="text-emerald-200 underline-offset-2 hover:underline"
                  >
                    Trang chủ
                  </Link>
                </li>
                <li aria-hidden className="text-white/40">
                  /
                </li>
                <li className="text-white/95">Liên hệ</li>
              </ol>
            </nav>
          </MotionInView>
        </div>
      </section>

      {/* Contact Info Area — contact.blade.php */}
      <section className="contact-info-area rel z-1">
        <div className="tb-container">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-8">
            <MotionInView className="lg:col-span-4" axis="up">
              <div className="contact-info-content mb-30 rmb-55">
                <div className="section-title mb-30">
                  <h2>
                    Hãy nói chuyện với các hướng dẫn viên du lịch chuyên nghiệp của chúng tôi
                  </h2>
                </div>
                <p>
                  Đội ngũ hỗ trợ tận tâm của chúng tôi luôn sẵn sàng hỗ trợ bạn giải đáp mọi thắc
                  mắc hoặc vấn đề, cung cấp các giải pháp nhanh chóng và được cá nhân hóa để đáp ứng
                  nhu cầu của bạn.
                </p>
                <div className="features-team-box mt-40">
                  <h6>85+ Thành viên nhóm chuyên gia</h6>
                  <div className="feature-authors">
                    {TEAM_AVATARS.map((src) => (
                      <Image
                        key={src}
                        src={src}
                        alt="Author"
                        width={55}
                        height={55}
                        className="!h-[55px] !w-[55px]"
                      />
                    ))}
                    <span>+</span>
                  </div>
                </div>
              </div>
            </MotionInView>

            <div className="contact-info-grid lg:col-span-8">
              <MotionInView axis="up" delayMs={50} className="h-full min-h-0">
                <div className="contact-info-item">
                  <div className="icon">
                    <Mail className="size-7" strokeWidth={2} aria-hidden />
                  </div>
                  <div className="content">
                    <h5>Cần trợ giúp và hỗ trợ</h5>
                    <div className="text flex flex-wrap items-center gap-1.5">
                      <Mail className="inline size-4 shrink-0 opacity-80" aria-hidden />
                      <a href="mailto:info@tourbooking.vn">info@tourbooking.vn</a>
                    </div>
                  </div>
                </div>
              </MotionInView>
              <MotionInView axis="up" delayMs={100}>
                <div className="contact-info-item">
                  <div className="icon">
                    <Phone className="size-7" strokeWidth={2} aria-hidden />
                  </div>
                  <div className="content">
                    <h5>Cần bất kỳ việc khẩn cấp nào</h5>
                    <div className="text flex flex-wrap items-center gap-1.5">
                      <Phone className="inline size-4 shrink-0 opacity-80" aria-hidden />
                      <a href="tel:1900646888">1900 646 888</a>
                    </div>
                  </div>
                </div>
              </MotionInView>
              <MotionInView axis="up" delayMs={50}>
                <div className="contact-info-item">
                  <div className="icon">
                    <MapPin className="size-7" strokeWidth={2} aria-hidden />
                  </div>
                  <div className="content">
                    <h5>Gia Lai</h5>
                    <div className="text flex flex-wrap items-start gap-1.5">
                      <MapPin className="mt-0.5 inline size-4 shrink-0 opacity-80" aria-hidden />
                      <span>Cửu An, An Khê, Gia Lai</span>
                    </div>
                  </div>
                </div>
              </MotionInView>
              <MotionInView axis="up" delayMs={100}>
                <div className="contact-info-item">
                  <div className="icon">
                    <MapPin className="size-7" strokeWidth={2} aria-hidden />
                  </div>
                  <div className="content">
                    <h5>Kí túc xá Việt Hàn</h5>
                    <div className="text flex flex-wrap items-start gap-1.5">
                      <MapPin className="mt-0.5 inline size-4 shrink-0 opacity-80" aria-hidden />
                      <span>470 Trần Đại Nghĩa, Ngũ Hành Sơn, Thành phố Đà Nẵng</span>
                    </div>
                  </div>
                </div>
              </MotionInView>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form Area */}
      <section className="contact-form-area rel z-1">
        <div className="tb-container">
          <div className="contact-form-2col grid items-stretch gap-10 lg:grid-cols-12 lg:gap-12 xl:gap-14">
            <div className="lg:col-span-6">
              <MotionInView
                axis="left"
                className="contact-form-scroll-motion"
                rootMargin="0px 0px -50px 0px"
              >
                <ContactFormBlock />
              </MotionInView>
            </div>
            <MotionInView
              className="contact-form-scroll-motion lg:col-span-6"
              axis="right"
              delayMs={120}
              rootMargin="0px 0px -50px 0px"
            >
              <div className="contact-images-part">
                <div className="img-row">
                  <div className="img-col-12">
                    <div className="img-wrap img-wrap--hero">
                      <Image
                        src={`${IMG}/contact1.jpg`}
                        alt="Contact"
                        fill
                        className="object-cover object-center"
                        sizes="(min-width: 1024px) 560px, (min-width: 768px) 90vw, 100vw"
                        priority
                      />
                    </div>
                  </div>
                  <div className="img-col-6">
                    <div className="img-wrap img-wrap--half">
                      <Image
                        src={`${IMG}/contact2.jpg`}
                        alt="Contact"
                        fill
                        className="object-cover object-center"
                        sizes="(min-width: 1024px) 320px, 50vw"
                      />
                    </div>
                  </div>
                  <div className="img-col-6">
                    <div className="img-wrap img-wrap--half">
                      <Image
                        src={`${IMG}/contact3.jpg`}
                        alt="Contact"
                        fill
                        className="object-cover object-center"
                        sizes="(min-width: 1024px) 320px, 50vw"
                      />
                    </div>
                  </div>
                </div>
                <div className="circle-logo">
                  <Image
                    src={`${IMG}/icon.png`}
                    alt="Logo"
                    width={50}
                    height={50}
                    className="!max-h-[50px] !w-auto"
                  />
                  <span className="title h2">TourBooking</span>
                </div>
              </div>
            </MotionInView>
          </div>
        </div>
      </section>

      <div className="contact-map">
        <iframe
          src={MAP_IFRAME}
          style={{ border: 0, width: "100%" }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Bản đồ chỉ đường tới Central Point, Hà Nội"
        />
      </div>
    </div>
  );
}
