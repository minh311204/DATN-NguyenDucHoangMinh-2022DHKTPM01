"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthHeroShell } from "@/components/auth-hero-shell";
import { OAuthSocialSection } from "@/components/oauth-social-section";
import { AuthGuestFooterLink } from "@/components/auth-guest-footer-link";
import { postLogin, storeAuthSession } from "@/lib/client-auth";
import { AUTH_INPUT_CLASS, AUTH_BRAND } from "@/lib/auth-ui";
import { errorMessage } from "@/lib/format";

async function persistSessionAndRedirect(
  accessToken: string,
  refreshToken: string,
  router: ReturnType<typeof useRouter>,
) {
  await storeAuthSession(accessToken, refreshToken);
  router.push("/");
  router.refresh();
}

function LoginForm() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onOAuthSuccess = useCallback(
    async (accessToken: string, refreshToken: string) => {
      await persistSessionAndRedirect(accessToken, refreshToken, router);
    },
    [router],
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const fd = new FormData(e.currentTarget);
    const emailVal = String(fd.get("email") ?? "").trim();
    const passwordVal = String(fd.get("password") ?? "");
    setLoading(true);
    try {
      const res = await postLogin(emailVal, passwordVal);
      if (res.ok) {
        await persistSessionAndRedirect(
          res.data.accessToken,
          res.data.refreshToken,
          router,
        );
        return;
      }
      setErr(errorMessage(res.body));
    } catch {
      setErr("Không kết nối được API. Kiểm tra NEXT_PUBLIC_API_URL và backend.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthHeroShell
      title="Chào mừng trở lại!"
      subtitle="Đăng nhập vào tài khoản của bạn"
      footer={<AuthGuestFooterLink />}
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
              autoComplete="current-password"
              placeholder="••••••••"
              className={AUTH_INPUT_CLASS}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                name="remember"
                type="checkbox"
                className="h-4 w-4 shrink-0 rounded border-slate-300 accent-[#0194f3]"
              />
              Ghi nhớ đăng nhập
            </label>
            <Link
              href="/forgot-password"
              className="text-sm font-semibold hover:underline"
              style={{ color: AUTH_BRAND }}
            >
              Quên mật khẩu?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-3 text-[15px] font-semibold text-white shadow-md transition hover:brightness-110 disabled:opacity-60"
            style={{ backgroundColor: AUTH_BRAND }}
          >
            {loading ? "Đang đăng nhập…" : "Đăng nhập"}
          </button>

          <p className="text-center text-sm text-slate-600">
            Chưa có tài khoản?{" "}
            <Link
              href="/register"
              className="font-semibold hover:underline"
              style={{ color: AUTH_BRAND }}
            >
              Tạo tài khoản mới
            </Link>
          </p>
        </form>

        <OAuthSocialSection
          facebookOAuthReturnPath="/login"
          loading={loading}
          setLoading={setLoading}
          setErr={setErr}
          onOAuthSuccess={onOAuthSuccess}
        />
      </div>
    </AuthHeroShell>
  );
}

export default function LoginPage() {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
  if (googleClientId) {
    return (
      <GoogleOAuthProvider clientId={googleClientId} locale="vi">
        <LoginForm />
      </GoogleOAuthProvider>
    );
  }
  return <LoginForm />;
}
