"use client";

import {
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";

const SCROLL_REVEAL_PX = 68;

function cn(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

type Props = {
  /** Nền ảnh (absolute layer) + overlay — render bởi trang */
  children: ReactNode;
  kicker: ReactNode;
  /** Tuỳ chọn: dòng tagline lớn khi cuộn (bỏ trống nếu không cần) */
  tagline?: ReactNode;
  subline: ReactNode;
  search: ReactNode;
  className?: string;
};

/**
 * Travela-style: hero ảnh lớn; khi người dùng cuộn xuống một chút, khối
 * tagline + thanh tìm kiếm mới trượt lên lộ dần (stagger qua data-attribute + CSS).
 * prefers-reduced-motion: hiện toàn bộ ngay, không cần cuộn.
 */
export function HomeHeroTravelaReveal({
  children,
  kicker,
  tagline,
  subline,
  search,
  className,
}: Props) {
  const [revealed, setRevealed] = useState(false);
  const hasTagline = tagline != null && tagline !== false;
  const subStagger = hasTagline ? "home-hero-stagger-2" : "home-hero-stagger-1";
  const searchStagger = hasTagline ? "home-hero-stagger-3" : "home-hero-stagger-2";

  useLayoutEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setRevealed(true);
      return;
    }

    const update = () => {
      if (window.scrollY >= SCROLL_REVEAL_PX) setRevealed(true);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <section
      className={cn(
        "relative flex min-h-[min(88svh,52rem)] flex-col overflow-hidden border-b border-white/10 bg-[#1a1d2e] pb-8 pt-24 text-white sm:pb-12 sm:pt-28",
        className,
      )}
    >
      {children}
      <div
        className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 sm:px-6"
        data-home-hero-revealed={revealed ? "true" : "false"}
      >
        <div className="mx-auto w-full max-w-[min(100%,56rem)] text-center">
          {kicker}
        </div>
        {hasTagline ? (
          <div className="home-hero-stagger-1 mt-5 max-w-4xl self-center text-center sm:mt-6">
            {tagline}
          </div>
        ) : null}
        <div
          className={cn(
            hasTagline ? "mt-3" : "mt-5 sm:mt-6",
            subStagger,
            "mx-auto max-w-2xl text-center",
          )}
        >
          {subline}
        </div>
        <div
          className={cn("mx-auto mt-6 w-full max-w-5xl sm:mt-8", searchStagger)}
        >
          {search}
        </div>
      </div>
    </section>
  );
}
