"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthHeroShell } from "@/components/auth-hero-shell";
import { postRegister } from "@/lib/client-auth";
import { AUTH_BRAND, AUTH_INPUT_CLASS } from "@/lib/auth-ui";
import { errorMessage } from "@/lib/format";

export default function RegisterPage() {
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{ message: string; email: string } | null>(
    null,
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const fd = new FormData(e.currentTarget);
    const firstName = String(fd.get("firstName") ?? "").trim();
    const lastName = String(fd.get("lastName") ?? "").trim();
    const emailVal = String(fd.get("email") ?? "").trim();
    const phone = String(fd.get("phone") ?? "").trim();
    const passwordVal = String(fd.get("password") ?? "");
    const passwordConfirm = String(fd.get("passwordConfirm") ?? "");
    if (passwordVal !== passwordConfirm) {
      setErr("Mật khẩu xác nhận không khớp.");
      return;
    }
    setLoading(true);
    try {
      const res = await postRegister({
        email: emailVal,
        firstName,
        lastName,
        phone,
        password: passwordVal,
        passwordConfirm,
      });
      if (res.ok) {
        setDone({ message: res.data.message, email: res.data.email });
        return;
      }
      setErr(errorMessage(res.body));
    } catch {
      setErr("Không kết nối được API. Kiểm tra NEXT_PUBLIC_API_URL và backend.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <AuthHeroShell
        title="Kiểm tra email"
        subtitle="Chúng tôi đã gửi liên kết xác nhận"
      >
        <div className="rounded-2xl border border-slate-100 bg-white p-5 text-sm text-slate-700 shadow-md shadow-slate-200/80 sm:p-6">
          <p className="leading-relaxed">{done.message}</p>
          <p className="mt-4 text-slate-600">
            Đã gửi tới: <span className="font-semibold text-slate-900">{done.email}</span>
          </p>
          <p className="mt-3 leading-relaxed text-slate-500">
            Sau khi nhấn liên kết trong email, tài khoản sẽ được kích hoạt và bạn vào được
            trang chủ.
          </p>
          <p className="mt-8 text-center">
            <Link
              href="/login"
              className="inline-flex rounded-xl px-6 py-2.5 text-[15px] font-semibold text-white shadow-md hover:brightness-110"
              style={{ backgroundColor: AUTH_BRAND }}
            >
              Quay lại đăng nhập
            </Link>
          </p>
        </div>
      </AuthHeroShell>
    );
  }

  const card = (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-md shadow-slate-200/80 sm:p-6">
      <form className="space-y-4" onSubmit={onSubmit}>
        {err ? (
          <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
            {err}
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          <div>
            <label
              htmlFor="lastName"
              className="mb-1 block text-sm font-semibold text-slate-900"
            >
              Tên
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              required
              autoComplete="given-name"
              placeholder="Tên"
              className={AUTH_INPUT_CLASS}
            />
          </div>
          <div>
            <label
              htmlFor="firstName"
              className="mb-1 block text-sm font-semibold text-slate-900"
            >
              Họ
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              required
              autoComplete="family-name"
              placeholder="Họ"
              className={AUTH_INPUT_CLASS}
            />
          </div>
        </div>

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

        <div>
          <label
            htmlFor="phone"
            className="mb-1 block text-sm font-semibold text-slate-900"
          >
            Số điện thoại
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            inputMode="tel"
            autoComplete="tel"
            placeholder="Ví dụ: 0912345678"
            className={AUTH_INPUT_CLASS}
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-sm font-semibold text-slate-900"
          >
            Mật khẩu
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Tối thiểu 8 ký tự"
            className={AUTH_INPUT_CLASS}
          />
        </div>

        <div>
          <label
            htmlFor="passwordConfirm"
            className="mb-1 block text-sm font-semibold text-slate-900"
          >
            Xác nhận mật khẩu
          </label>
          <input
            id="passwordConfirm"
            name="passwordConfirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Xác nhận mật khẩu"
            className={AUTH_INPUT_CLASS}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl py-3 text-[15px] font-semibold text-white shadow-md transition hover:brightness-110 disabled:opacity-60"
          style={{ backgroundColor: AUTH_BRAND }}
        >
          {loading ? "Đang tạo tài khoản…" : "Tạo tài khoản"}
        </button>

        <p className="text-center text-sm text-slate-600">
          Đã có tài khoản?{" "}
          <Link
            href="/login"
            className="font-semibold hover:underline"
            style={{ color: AUTH_BRAND }}
          >
            Đăng nhập
          </Link>
        </p>
      </form>
    </div>
  );

  return (
    <AuthHeroShell
      title="Tạo tài khoản"
      subtitle="Vài thông tin cơ bản — nhanh chóng, an toàn."
    >
      {card}
    </AuthHeroShell>
  );
}
