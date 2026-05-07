"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AuthHeroShell } from "@/components/auth-hero-shell";
import { postResetPassword } from "@/lib/client-auth";
import { AUTH_BRAND, AUTH_INPUT_CLASS } from "@/lib/auth-ui";
import { errorMessage } from "@/lib/format";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    if (!token) {
      setErr("Thiếu mã đặt lại mật khẩu. Hãy mở đúng liên kết trong email.");
      return;
    }
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    const passwordConfirm = String(fd.get("passwordConfirm") ?? "");
    if (password !== passwordConfirm) {
      setErr("Mật khẩu xác nhận không khớp.");
      return;
    }
    setLoading(true);
    try {
      const res = await postResetPassword(token, password);
      if (res.ok) {
        router.push("/login?reset=1");
        router.refresh();
        return;
      }
      setErr(errorMessage(res.body));
    } catch {
      setErr("Không kết nối được API. Kiểm tra NEXT_PUBLIC_API_URL và backend.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <AuthHeroShell title="Đặt lại mật khẩu" subtitle="Liên kết không hợp lệ">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-md shadow-slate-200/80 sm:p-6">
          <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
            Thiếu liên kết hợp lệ. Hãy mở đúng đường dẫn trong email hoặc yêu cầu
            gửi lại.
          </p>
          <p className="mt-6 text-center text-sm">
            <Link href="/forgot-password" className="font-semibold hover:underline" style={{ color: AUTH_BRAND }}>
              Gửi lại email
            </Link>
          </p>
        </div>
      </AuthHeroShell>
    );
  }

  return (
    <AuthHeroShell
      title="Đặt lại mật khẩu"
      subtitle="Nhập mật khẩu mới cho tài khoản của bạn."
      footer={
        <Link
          href="/login"
          className="font-semibold hover:underline"
          style={{ color: AUTH_BRAND }}
        >
          Quay lại đăng nhập
        </Link>
      }
    >
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-md shadow-slate-200/80 sm:p-6">
        <form className="space-y-4" onSubmit={onSubmit}>
          {err ? (
            <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
              {err}
            </p>
          ) : null}
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-semibold text-slate-900"
            >
              Mật khẩu mới (tối thiểu 8 ký tự)
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className={AUTH_INPUT_CLASS}
            />
          </div>
          <div>
            <label
              htmlFor="passwordConfirm"
              className="mb-1 block text-sm font-semibold text-slate-900"
            >
              Nhập lại mật khẩu
            </label>
            <input
              id="passwordConfirm"
              name="passwordConfirm"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className={AUTH_INPUT_CLASS}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-3 text-[15px] font-semibold text-white shadow-md transition hover:brightness-110 disabled:opacity-60"
            style={{ backgroundColor: AUTH_BRAND }}
          >
            {loading ? "Đang lưu…" : "Đặt lại mật khẩu"}
          </button>
        </form>
      </div>
    </AuthHeroShell>
  );
}
