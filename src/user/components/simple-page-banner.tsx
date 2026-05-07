import Image from "next/image";
import Link from "next/link";
import { MotionInView } from "@/components/motion-in-view";

type Props = {
  title: string;
  /** Tên hiển thị trên breadcrumb (mặc định = title) */
  breadcrumbLabel?: string;
  /**
   * Đường dẫn ảnh trong `public/` (vd. `/assets/images/contact/banner.jpg`).
   * Khi có: banner full-width kiểu Travela (ảnh phủ + tiêu đề trắng).
   */
  backgroundImageSrc?: string;
  /** Mô tả ảnh nền (a11y); mặc định rỗng nếu chỉ mang tính trang trí */
  backgroundImageAlt?: string;
};

function cn(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/**
 * Tiêu đề trang + breadcrumb: mặc định nền gradient nhẹ; có thể truyền ảnh nền giống page-banner Travela.
 */
export function SimplePageBanner({
  title,
  breadcrumbLabel,
  backgroundImageSrc,
  backgroundImageAlt = "",
}: Props) {
  const crumb = breadcrumbLabel ?? title;
  const photo = Boolean(backgroundImageSrc);

  return (
    <header
      className={cn(
        "relative isolate overflow-hidden",
        photo ? "border-b border-white/10" : "border-b border-sky-200/60 bg-gradient-to-b from-[#e0f2f7] to-[#faf8f5]",
      )}
      aria-label="Tiêu đề trang"
    >
      {photo && backgroundImageSrc ? (
        <>
          <Image
            src={backgroundImageSrc}
            alt={backgroundImageAlt}
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/40 to-black/25"
            aria-hidden
          />
        </>
      ) : null}

      <div
        className={cn(
          "relative z-10 mx-auto max-w-6xl px-4 sm:px-6",
          photo ? "py-14 text-center sm:py-20 lg:py-24" : "py-7 sm:py-9",
        )}
      >
        <div className={cn(photo && "mx-auto max-w-3xl")}>
          <MotionInView axis="left" className={cn("w-full", !photo && "sm:inline-block")}>
            <h1
              className={cn(
                "text-2xl font-bold tracking-tight sm:text-3xl",
                photo ? "text-white drop-shadow-sm" : "text-[#0056b3]",
              )}
            >
              <span className="relative inline-block">
                {title}
                <span
                  className={cn(
                    "absolute -bottom-1 left-0 h-1 w-full min-w-[2.5rem] rounded-full",
                    photo ? "bg-white/90" : "bg-[#0056b3]",
                  )}
                  aria-hidden
                />
              </span>
            </h1>
          </MotionInView>
          <MotionInView
            axis="right"
            className={cn("w-full", photo ? "mt-4 justify-center sm:flex" : "mt-3")}
            delayMs={180}
            rootMargin="0px 0px 2% 0px"
          >
            <nav
              aria-label="Breadcrumb"
              className={cn(
                "text-sm",
                photo ? "text-white/85 [&_a]:text-white [&_a]:underline-offset-2 hover:[&_a]:underline" : "text-stone-500",
              )}
            >
              <ol
                className={cn(
                  "flex flex-wrap items-center gap-2 sm:gap-2.5",
                  photo && "justify-center",
                )}
              >
                <li>
                  <Link href="/" className={photo ? "" : "text-teal-700 hover:underline"}>
                    Trang chủ
                  </Link>
                </li>
                <li aria-hidden className={photo ? "text-white/40" : "text-stone-300"}>
                  /
                </li>
                <li className={photo ? "text-white" : "text-stone-600"}>{crumb}</li>
              </ol>
            </nav>
          </MotionInView>
        </div>
      </div>
    </header>
  );
}
