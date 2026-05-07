import Link from "next/link";
import { AUTH_BRAND } from "@/lib/auth-ui";

/** Chỉ dùng trên trang Đăng nhập — gợi ý xem tour không cần tài khoản */
export function AuthGuestFooterLink() {
  return (
    <Link
      href="/tours"
      className="inline-flex items-center justify-center gap-1 text-sm font-medium transition hover:opacity-90"
    >
      <span className="text-slate-600">Chỉ muốn xem tour? </span>
      <span className="font-semibold" style={{ color: AUTH_BRAND }}>
        Tiếp tục với tư cách khách
      </span>
      <span aria-hidden className="text-base font-semibold" style={{ color: AUTH_BRAND }}>
        →
      </span>
    </Link>
  );
}
