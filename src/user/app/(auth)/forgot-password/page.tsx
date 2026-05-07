"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthHeroShell } from "@/components/auth-hero-shell";
import { postForgotPassword } from "@/lib/client-auth";
import { AUTH_BRAND, AUTH_INPUT_CLASS } from "@/lib/auth-ui";
import { errorMessage } from "@/lib/format";

export default function ForgotPasswordPage() {
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    setLoading(true);
    try {
      const res = await postForgotPassword(email);
      if (res.ok) {
        setSent(true);
        return;
      }
      setErr(errorMessage(res.body));
    } catch {
      setErr("Không kết nối được API. Kiểm tra NEXT_PUBLIC_API_URL và backend.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <AuthHeroShell title="Đã gửi hướng dẫn" subtitle="Kiểm tra hộp thư của bạn">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 text-sm leading-relaxed text-slate-700 shadow-md shadow-slate-200/80 sm:p-6">
          <p>
            Nếu email tồn tại trong hệ thống, bạn sẽ nhận được liên kết đặt lại mật
            khẩu. Vui lòng kiểm tra hộp thư (cả mục spam).
          </p>
          <p className="mt-8 text-center">
            <Link
              href="/login"
              className="font-semibold hover:underline"
              style={{ color: AUTH_BRAND }}
            >
              Quay lại đăng nhập
            </Link>
          </p>
        </div>
      </AuthHeroShell>
    );
  }

  return (
    <AuthHeroShell
      title="Quên mật khẩu"
      subtitle="Nhập email đã đăng ký — chúng tôi sẽ gửi liên kết đặt lại mật khẩu."
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
              htmlFor="email"
              className="mb-1 block text-sm font-semibold text-slate-900"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="email@vi_du.com"
              className={AUTH_INPUT_CLASS}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-3 text-[15px] font-semibold text-white shadow-md transition hover:brightness-110 disabled:opacity-60"
            style={{ backgroundColor: AUTH_BRAND }}
          >
            {loading ? "Đang gửi…" : "Gửi liên kết"}
          </button>
        </form>
      </div>
    </AuthHeroShell>
  );
}
