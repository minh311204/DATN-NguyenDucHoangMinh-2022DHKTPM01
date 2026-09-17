import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { HEADER_LOGO_SRC, SITE_BRAND } from "@/lib/site-brand";

/**
 * Thanh auth: logo trái — “Về trang chủ” phải (giống trước khi căn giữa logo).
 */
export function AuthLogoBar() {
  return (
    <header className="sticky top-0 z-50 w-full shrink-0 border-b border-sky-200/60 bg-white/95 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6 sm:py-3">
        <Link
          href="/"
          className="group relative isolate block h-[52px] w-[min(48vw,188px)] shrink-0 overflow-hidden rounded-xl bg-transparent outline-none ring-offset-2 ring-offset-white transition-transform duration-200 hover:scale-[1.015] focus-visible:ring-2 focus-visible:ring-sky-400/80 sm:h-[60px] sm:w-[min(44vw,216px)]"
        >
          <Image
            src={HEADER_LOGO_SRC}
            alt="IPSUMTRAVEL — Your Travel Partner"
            fill
            className="origin-center scale-[1.24] object-contain object-center sm:scale-[1.28]"
            sizes="(max-width: 640px) 188px, 216px"
            priority
            quality={95}
            unoptimized
          />
        </Link>
        <Link
          href="/"
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium transition hover:underline"
          style={{ color: SITE_BRAND }}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Về trang chủ
        </Link>
      </div>
    </header>
  );
}
