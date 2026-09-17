"use client";

import { useState } from "react";
import Image from "next/image";
import { resolvePublicImageUrl } from "@/lib/media-url";

type Props = {
  url: string | null | undefined;
  name: string;
  className?: string;
  /** Vuông nhỏ cho bảng danh sách */
  variant?: "card" | "thumb";
};

/**
 * Ảnh tour: resolve URL tương đối → absolute, fallback khi lỗi tải.
 * Dùng next/image với remotePatterns trong next.config.ts.
 */
export function TourImage({
  url,
  name,
  className = "",
  variant = "card",
}: Props) {
  const [broken, setBroken] = useState(false);
  const resolved = resolvePublicImageUrl(url);

  if (variant === "thumb") {
    if (!resolved || broken) {
      return (
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[10px] leading-tight text-slate-500 ${className}`}
          title={broken ? "Không tải được ảnh" : "Chưa có ảnh"}
        >
          —
        </div>
      );
    }
    return (
      <div
        className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-slate-100 ${className}`}
      >
        <Image
          src={resolved}
          alt={name}
          fill
          className="object-cover"
          sizes="56px"
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
          unoptimized
        />
      </div>
    );
  }

  if (!resolved || broken) {
    return (
      <div
        className={`flex aspect-[16/10] w-full items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-500 ${className}`}
      >
        {broken ? "Không tải được ảnh" : "Chưa có ảnh"}
      </div>
    );
  }

  return (
    <div
      className={`relative aspect-[16/10] w-full overflow-hidden rounded-lg bg-slate-100 ${className}`}
    >
      <Image
        src={resolved}
        alt={name}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 400px"
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        unoptimized
      />
    </div>
  );
}
