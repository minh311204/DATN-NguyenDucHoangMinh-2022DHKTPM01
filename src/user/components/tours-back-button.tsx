"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

const btnClass =
  "inline-flex items-center gap-1.5 text-sm font-semibold text-sky-800 transition hover:text-sky-950";

type Props = {
  /** Khi có `href`, dùng thẻ Link (luồng Tour nổi bật → trang chủ ổn định, không phụ thuộc history). */
  href?: string;
};

export function ToursBackButton({ href }: Props) {
  const router = useRouter();

  if (href) {
    return (
      <Link href={href} className={btnClass}>
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Quay lại
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className={btnClass}
    >
      <ChevronLeft className="h-4 w-4" aria-hidden />
      Quay lại
    </button>
  );
}
