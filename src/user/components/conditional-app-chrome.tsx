"use client";

import { usePathname } from "next/navigation";
import { AuthLogoBar } from "@/components/auth-logo-bar";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ChatWidget } from "@/components/chat-widget";
import { BackToTop } from "@/components/back-to-top";

const AUTH_ONLY_FOOTER_PATHS = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
]);

/** Trang đặt tour: không header site — bắt đầu từ khối Quay lại / ĐẶT TOUR */
function hideSiteHeader(pathname: string) {
  return pathname === "/book" || pathname.startsWith("/book/");
}

/**
 * Trang đăng nhập / đăng ký: không header site, không chat — footer giống trang chủ.
 */
export function ConditionalAppChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const pathnameNorm = pathname.replace(/\/+$/, "") || "/";
  const authMinimal = AUTH_ONLY_FOOTER_PATHS.has(pathnameNorm);
  const noChromeHeader = hideSiteHeader(pathnameNorm);

  if (authMinimal) {
    return (
      <div className="flex min-h-dvh flex-col bg-[#f5f9ff]">
        <AuthLogoBar />
        {/* Ít nhất ~1 viewport trừ thanh logo: Đăng nhập không bị cụt ngắn so với trang Đăng ký dài */}
        <main className="flex min-h-[calc(100svh-5.25rem)] w-full flex-grow flex-col px-0">
          {children}
        </main>
        <div className="shrink-0">
          <SiteFooter />
        </div>
        <BackToTop />
      </div>
    );
  }

  return (
    <>
      {noChromeHeader ? null : <SiteHeader />}
      <div className="flex-1">{children}</div>
      <SiteFooter />
      <BackToTop />
      <ChatWidget />
    </>
  );
}
