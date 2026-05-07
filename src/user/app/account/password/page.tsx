"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import {
  ensureSessionFresh,
  getMe,
  postChangePassword,
} from "@/lib/client-auth";
import {
  AUTH_KEYS,
  clearAuthStorage,
  hasAccessToken,
} from "@/lib/auth-storage";
import { errorMessage } from "@/lib/format";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [hasPassword, setHasPassword] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setMounted(true);
    void (async () => {
      await ensureSessionFresh();
      if (!alive) return;
      if (!hasAccessToken()) {
        setLoggedIn(false);
        return;
      }
      setLoggedIn(true);
      const token = localStorage.getItem(AUTH_KEYS.accessToken);
      if (!token) {
        setHasPassword(true);
        return;
      }
      const me = await getMe(token);
      if (!alive) return;
      if (me.ok) setHasPassword(me.data.hasPassword);
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setOk(null);
    const token = localStorage.getItem(AUTH_KEYS.accessToken);
    if (!token) {
      router.push("/login");
      return;
    }
    const fd = new FormData(e.currentTarget);
    const current = String(fd.get("currentPassword") ?? "");
    const next = String(fd.get("newPassword") ?? "");
    const confirm = String(fd.get("confirmPassword") ?? "");
    if (next !== confirm) {
      setErr("Mật khẩu mới nhập lại không khớp.");
      return;
    }
    setLoading(true);
    try {
      const res = await postChangePassword(token, {
        currentPassword: hasPassword && current ? current : undefined,
        newPassword: next,
      });
      if (res.ok) {
        setOk(res.data.message);
        clearAuthStorage();
        setTimeout(() => router.push("/login"), 2000);
        return;
      }
      if ("networkError" in res && res.networkError) {
        setErr("Không kết nối được API. Kiểm tra backend đang chạy và NEXT_PUBLIC_API_URL.");
        return;
      }
      setErr(errorMessage(res.body));
    } catch {
      setErr("Không kết nối được API.");
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 sm:px-6" aria-busy="true">
        <div className="h-8 animate-pulse rounded bg-stone-200" />
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
        <h1 className="text-xl font-bold text-stone-900">Đổi mật khẩu</h1>
        <p className="mt-3 text-sm text-stone-600">
          Bạn cần{" "}
          <Link href="/login" className="font-semibold text-teal-700 hover:underline">
            đăng nhập
          </Link>{" "}
          trước.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:px-6">
      <Link
        href="/account"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-stone-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Tài khoản
      </Link>

      <h1 className="mt-6 text-2xl font-bold text-stone-900">Đổi mật khẩu</h1>
      {!hasPassword ? (
        <p className="mt-2 text-sm text-stone-600">
          Bạn đăng nhập bằng Google/Facebook — chỉ cần đặt mật khẩu mới cho tài
          khoản (không cần mật khẩu cũ).
        </p>
      ) : (
        <p className="mt-2 text-sm text-stone-600">
          Sau khi đổi mật khẩu, bạn sẽ được chuyển tới trang đăng nhập.
        </p>
      )}

      <form
        className="mt-8 space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
        onSubmit={onSubmit}
      >
        {err ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            {err}
          </p>
        ) : null}
        {ok ? (
          <p className="rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-900">
            {ok}
          </p>
        ) : null}

        {hasPassword ? (
          <div>
            <label
              htmlFor="currentPassword"
              className="mb-1 block text-sm font-medium text-stone-700"
            >
              Mật khẩu hiện tại
            </label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              required={hasPassword}
              autoComplete="current-password"
              className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-stone-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>
        ) : null}

        <div>
          <label
            htmlFor="newPassword"
            className="mb-1 block text-sm font-medium text-stone-700"
          >
            Mật khẩu mới (tối thiểu 8 ký tự)
          </label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-stone-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>
        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-1 block text-sm font-medium text-stone-700"
          >
            Nhập lại mật khẩu mới
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-stone-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-teal-600 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {loading ? "Đang lưu…" : "Cập nhật mật khẩu"}
        </button>
      </form>
    </div>
  );
}
