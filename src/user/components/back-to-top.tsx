"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";

const SHOW_AFTER_PX = 400;

/**
 * Tương đương "Back to top" trong bộ template Travela (Owl/BS): cuộn mượt lên đầu,
 * gốc phải dưới chat widget (z thấp hơn, bottom cao hơn).
 */
export function BackToTop() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  const onScroll = useCallback(() => {
    setVisible(window.scrollY >= SHOW_AFTER_PX);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [mounted, onScroll]);

  const goTop = useCallback(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    try {
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    } catch {
      window.scrollTo(0, 0);
    }
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={goTop}
      aria-label="Lên đầu trang"
      tabIndex={visible ? 0 : -1}
      className={
        "fixed right-4 z-[55] flex h-11 w-11 items-center justify-center rounded-full border border-stone-200/90 bg-white/95 text-teal-700 shadow-lg backdrop-blur-sm transition duration-300 hover:bg-teal-50 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 sm:right-5 " +
        (visible
          ? "pointer-events-auto bottom-20 translate-y-0 opacity-100 sm:bottom-20"
          : "pointer-events-none bottom-20 translate-y-2 opacity-0 sm:bottom-20")
      }
    >
      <ChevronUp className="h-5 w-5" strokeWidth={2.5} />
    </button>
  );
}
