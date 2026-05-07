"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { AuthHeroShell } from "@/components/auth-hero-shell";
import { AuthGuestFooterLink } from "@/components/auth-guest-footer-link";
import {
  postLogin,
  postOAuthFacebook,
  postOAuthGoogle,
  storeAuthSession,
} from "@/lib/client-auth";
import { AUTH_INPUT_CLASS, AUTH_BRAND } from "@/lib/auth-ui";
import { errorMessage } from "@/lib/format";

declare global {
  interface Window {
    FB?: {
      init: (config: {
        appId: string;
        cookie: boolean;
        xfbml: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: {
          authResponse?: { accessToken: string };
          status?: string;
        }) => void,
        opts: { scope: string },
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

function useFacebookSdk(appId: string | undefined) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!appId) return;

    if (typeof window === "undefined") return;

    const done = () => setReady(true);

    if (window.FB) {
      done();
      return;
    }

    window.fbAsyncInit = function () {
      window.FB?.init({
        appId,
        cookie: true,
        xfbml: true,
        version: "v21.0",
      });
      done();
    };

    const existing = document.getElementById("facebook-jssdk");
    if (!existing) {
      const js = document.createElement("script");
      js.id = "facebook-jssdk";
      js.src = "https://connect.facebook.net/vi_VN/sdk.js";
      js.async = true;
      js.defer = true;
      document.body.appendChild(js);
    }
  }, [appId]);

  return ready;
}

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

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
  const fbAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID ?? "";
  const fbReady = useFacebookSdk(fbAppId || undefined);

  const onFacebookClick = useCallback(() => {
    if (!window.FB) {
      setErr("SDK Facebook chưa tải xong. Thử lại sau vài giây.");
      return;
    }
    setErr(null);
    window.FB.login(
      (response) => {
        const token = response.authResponse?.accessToken;
        if (!token) {
          setErr("Đăng nhập Facebook bị hủy hoặc thiếu quyền.");
          return;
        }
        setLoading(true);
        void (async () => {
          try {
            const res = await postOAuthFacebook(token);
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
            setErr("Không kết nối được API.");
          } finally {
            setLoading(false);
          }
        })();
      },
      { scope: "email,public_profile" },
    );
  }, [router]);

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

  const hasSocial = Boolean(googleClientId || fbAppId);

  const card = (
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

      {hasSocial ? (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="text-center text-sm font-medium text-slate-600">
            Hoặc đăng nhập nhanh
          </p>
          <div className="mt-4 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
            {googleClientId ? (
              <div className="flex justify-center sm:flex-1">
                <GoogleLogin
                  onSuccess={async (credentialResponse) => {
                    const idToken = credentialResponse.credential;
                    if (!idToken) {
                      setErr("Google không trả token. Thử lại.");
                      return;
                    }
                    setErr(null);
                    setLoading(true);
                    try {
                      const res = await postOAuthGoogle(idToken);
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
                      setErr("Không kết nối được API.");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  onError={() => setErr("Đăng nhập Google thất bại.")}
                  theme="outline"
                  size="medium"
                  text="continue_with"
                  shape="rectangular"
                />
              </div>
            ) : null}
            {fbAppId ? (
              <button
                type="button"
                disabled={!fbReady || loading}
                onClick={onFacebookClick}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-60 sm:flex-1"
              >
                <span className="text-[#1877F2]" aria-hidden>
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </span>
                Facebook
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <AuthHeroShell
      title="Chào mừng trở lại!"
      subtitle="Đăng nhập vào tài khoản của bạn"
      footer={<AuthGuestFooterLink />}
    >
      {card}
    </AuthHeroShell>
  );
}

export default function LoginPage() {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
  if (googleClientId) {
    return (
      <GoogleOAuthProvider clientId={googleClientId}>
        <LoginForm />
      </GoogleOAuthProvider>
    );
  }
  return <LoginForm />;
}
