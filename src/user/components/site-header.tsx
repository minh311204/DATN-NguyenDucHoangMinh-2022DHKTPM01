"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Heart, LogIn } from "lucide-react";
import { HEADER_LOGO_SRC, SITE_BRAND } from "@/lib/site-brand";
import {
  AUTH_CHANGED_EVENT,
  clearAuthStorage,
  getStoredUserEmail,
  hasAccessToken,
  initialsFromEmail,
} from "@/lib/auth-storage";
import { ensureSessionFresh } from "@/lib/client-auth";
import {
  SITE_HEADER_HIDE_AFTER_PX,
  SITE_HEADER_SHOW_WHEN_UNDER_PX,
} from "@/lib/site-header-scroll";
import { NotificationBell } from "./notification-bell";

const BRAND = SITE_BRAND;

function cn(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

const MAIN_NAV: { href: string; label: string }[] = [
  { href: "/", label: "Trang chủ" },
  { href: "/gioi-thieu", label: "Giới thiệu" },
  { href: "/tours", label: "Khám phá" },
  { href: "/lien-he", label: "Liên hệ" },
];

function mainNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === "/";
  const [mounted, setMounted] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const scrollRaf = useRef<number | null>(null);
  /** Trang nội dung: ẩn header khi đã cuộn xuống; chỉ hiện khi scroll về đỉnh trang */
  const [scrollAtTop, setScrollAtTop] = useState(true);
  const [headerHeight, setHeaderHeight] = useState(96);

  const syncAuth = useCallback(() => {
    setLoggedIn(hasAccessToken());
    setUserEmail(getStoredUserEmail());
  }, []);

  useEffect(() => {
    setMounted(true);
    let cancelled = false;
    syncAuth();
    void ensureSessionFresh().finally(() => {
      if (!cancelled) syncAuth();
    });
    return () => {
      cancelled = true;
    };
  }, [pathname, syncAuth]);

  useEffect(() => {
    function onVis() {
      if (document.visibilityState !== "visible") return;
      void ensureSessionFresh().finally(() => {
        syncAuth();
      });
    }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [syncAuth]);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (
        e.key === "accessToken" ||
        e.key === "userEmail" ||
        e.key === null
      ) {
        syncAuth();
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [syncAuth]);

  useEffect(() => {
    function onAuthChanged() {
      syncAuth();
    }
    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
  }, [syncAuth]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  useLayoutEffect(() => {
    if (isHome) return;
    const el = headerRef.current;
    if (!el) return;
    const applyHeight = (raw: number) => {
      const next = Math.ceil(raw);
      setHeaderHeight((prev) =>
        Math.abs(prev - next) < 2 ? prev : next,
      );
      document.documentElement.style.setProperty("--site-header-h", `${next}px`);
    };
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height;
      if (h != null) applyHeight(h);
    });
    ro.observe(el);
    applyHeight(el.getBoundingClientRect().height);
    return () => ro.disconnect();
  }, [isHome, mounted, loggedIn, menuOpen]);

  useLayoutEffect(() => {
    if (typeof document === "undefined") return;
    if (isHome) {
      document.documentElement.style.removeProperty("--site-header-h");
    }
  }, [isHome]);

  useEffect(() => {
    function onScroll() {
      if (scrollRaf.current != null) return;
      scrollRaf.current = window.requestAnimationFrame(() => {
        scrollRaf.current = null;
        const y = window.scrollY ?? document.documentElement.scrollTop;
        setScrollAtTop((visible) => {
          if (visible) {
            return y < SITE_HEADER_HIDE_AFTER_PX;
          }
          return y < SITE_HEADER_SHOW_WHEN_UNDER_PX;
        });
      });
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (scrollRaf.current != null) {
        window.cancelAnimationFrame(scrollRaf.current);
        scrollRaf.current = null;
      }
    };
  }, [pathname]);

  function logout() {
    clearAuthStorage();
    setLoggedIn(false);
    setUserEmail(null);
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  }

  function mainNavClass(href: string) {
    const active = mainNavActive(pathname, href);
    return cn(
      "whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-bold text-white transition-colors duration-200 sm:px-5",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7cba6a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1f2421]",
      active
        ? "bg-[#5c9b4a] shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)]"
        : "hover:bg-[#5c9b4a]",
    );
  }

  const innerHeader = (
    <header
      ref={headerRef}
      className={cn(
        "left-0 right-0 top-0 z-50 w-full",
        isHome
          ? cn(
              "fixed pb-1 transition-transform duration-300 ease-out will-change-transform",
              !scrollAtTop && "-translate-y-full pointer-events-none",
            )
          : cn(
              "fixed border-b border-stone-200/90 bg-[var(--background)]/95 shadow-sm backdrop-blur-md transition-transform duration-300 ease-out",
              !scrollAtTop && "-translate-y-full pointer-events-none",
            ),
      )}
    >
      {isHome ? (
        /* Chỉ gradient: ảnh nền chỉ vẽ 1 lần ở hero (page.tsx) — tránh 2 lớp ảnh lệch gây vệt “lặp” */
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-black/15 to-transparent"
          aria-hidden
        />
      ) : null}

      {/* Một hàng duy nhất trên mọi trang — cùng bố cục; trang chủ overlay hero, trang khác nền sáng */}
      <div className="relative z-10 mx-auto flex min-w-0 max-w-6xl items-center justify-between gap-2 px-4 py-2.5 sm:gap-3 sm:px-6 sm:py-3">
        <Link href="/" className="group isolate flex shrink-0 items-center outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-teal-400/80">
          {/*
            Trước đây dùng scale > 1 + overflow-hidden để cắt margin đen — dễ cắt mất viền logo.
            Giữ mix-blend-screen trên trang chủ để nền đen trong asset trộn nhẹ với hero.
          */}
          <span
            className={cn(
              "relative block shrink-0 overflow-visible rounded-xl bg-transparent transition-transform duration-200 ease-out will-change-transform group-hover:scale-[1.015]",
              "h-[62px] w-[min(48vw,210px)] sm:h-[72px] sm:w-[min(44vw,236px)]",
              isHome ? "drop-shadow-[0_4px_20px_rgba(0,0,0,0.45)]" : "",
            )}
          >
            <Image
              src={HEADER_LOGO_SRC}
              alt="IPSUMTRAVEL — Your Travel Partner"
              fill
              className={cn(
                "origin-center object-contain object-center",
                isHome ? "mix-blend-screen" : "",
              )}
              sizes="(max-width: 640px) 210px, 236px"
              priority={isHome}
              quality={95}
              unoptimized
            />
          </span>
        </Link>

        <nav
          aria-label="Điều hướng chính"
          aria-busy={!mounted}
          className="hidden min-w-0 flex-1 justify-center md:flex"
        >
          <div className="flex items-center gap-0.5 rounded-full bg-[#1f2421] p-1.5 shadow-lg shadow-black/25 ring-1 ring-black/30 md:gap-1">
            {mounted ? (
              MAIN_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={mainNavActive(pathname, item.href) ? "page" : undefined}
                  className={mainNavClass(item.href)}
                >
                  {item.label}
                </Link>
              ))
            ) : (
              <div
                className="flex min-h-[2.75rem] min-w-[14rem] flex-1 items-center justify-center px-2 md:min-w-[22rem]"
                aria-hidden
              >
                <span className="h-2.5 w-24 animate-pulse rounded-full bg-white/15 md:w-36" />
              </div>
            )}
          </div>
        </nav>

        <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
          {mounted && loggedIn ? (
            <>
              <NotificationBell isHome={isHome} />
              <Link
                href="/wishlist"
                title="Danh sách yêu thích"
                aria-label="Tour yêu thích"
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2",
                  isHome
                    ? "bg-white/95 text-rose-600 shadow-md ring-1 ring-black/15 backdrop-blur-sm hover:bg-white hover:shadow-lg hover:ring-rose-200/60"
                    : "text-stone-700 hover:bg-stone-100 focus-visible:ring-offset-white",
                )}
              >
                <Heart className="h-5 w-5" strokeWidth={2.25} />
              </Link>
            </>
          ) : null}
          {!mounted ? (
            <div className="h-9 w-9 animate-pulse rounded-full bg-stone-200/50" aria-hidden />
          ) : loggedIn ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className={cn(
                  "rounded-full p-1 transition",
                  isHome
                    ? "bg-white/15 ring-1 ring-white/25 hover:bg-white/25"
                    : "bg-stone-100 ring-1 ring-stone-200 hover:bg-stone-200",
                )}
                aria-expanded={menuOpen}
                aria-haspopup="true"
                aria-label="Tài khoản"
              >
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white shadow-inner"
                  style={{ background: `linear-gradient(135deg, ${BRAND}, #0369a1)` }}
                >
                  {initialsFromEmail(userEmail)}
                </span>
              </button>
              {menuOpen ? (
                <div
                  className="absolute right-0 top-full z-[60] mt-2 min-w-[200px] rounded-xl border border-stone-200 bg-white py-1.5 text-stone-800 shadow-xl"
                  role="menu"
                >
                  <Link
                    href="/account"
                    className="block px-4 py-2.5 text-sm hover:bg-stone-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    Tài khoản
                  </Link>
                  <Link
                    href="/bookings"
                    className="block px-4 py-2.5 text-sm hover:bg-stone-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    Đặt chỗ của tôi
                  </Link>
                  <Link
                    href="/wishlist"
                    className="block px-4 py-2.5 text-sm hover:bg-stone-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    Tour yêu thích
                  </Link>
                  <Link
                    href="/my-reviews"
                    className="block px-4 py-2.5 text-sm hover:bg-stone-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    Đánh giá của tôi
                  </Link>
                  <Link
                    href="/account/preferences"
                    className="block px-4 py-2.5 text-sm hover:bg-stone-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    Sở thích du lịch
                  </Link>
                  <div className="my-1 border-t border-stone-100" />
                  <button
                    type="button"
                    className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                    onClick={logout}
                  >
                    Đăng xuất
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition sm:px-4",
                  isHome
                    ? "text-white hover:bg-white/10"
                    : "text-stone-700 hover:bg-stone-100",
                )}
              >
                <LogIn className="h-4 w-4" />
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:brightness-110 sm:px-5"
                style={{ backgroundColor: BRAND }}
              >
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );

  if (isHome) return innerHeader;

  /** Luôn giữ chỗ cho header — KHÔNG thu về 0 khi ẩn header: thu spacer làm reflow,
   *  trình duyệt chỉnh scrollTop → có thể bật/tắt header liên tục (lặp khi cuộn, vd. /gioi-thieu). */
  const spacerH = Math.max(headerHeight, 72);

  return (
    <>
      {/* Không animate chiều cao — tránh layout giật + scroll tự kích hoạt lặp */}
      <div aria-hidden className="w-full shrink-0" style={{ height: spacerH }} />
      {innerHeader}
    </>
  );
}
