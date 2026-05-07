"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthHeroShell } from "@/components/auth-hero-shell";
import { postVerifyEmail, storeAuthSession } from "@/lib/client-auth";
import { AUTH_BRAND } from "@/lib/auth-ui";
import { errorMessage } from "@/lib/format";

export function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = searchParams.get("token")?.trim();
    if (!token) {
      setErr("Thiếu liên kết xác nhận. Hãy mở đúng đường dẫn trong email.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await postVerifyEmail(token);
        if (cancelled) return;
        if (res.ok) {
          await storeAuthSession(res.data.accessToken, res.data.refreshToken);
          router.push("/");
          router.refresh();
          return;
        }
        setErr(errorMessage(res.body));
      } catch {
        if (!cancelled) {
          setErr("Không kết nối được API. Kiểm tra NEXT_PUBLIC_API_URL và backend.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, router]);

  return (
    <AuthHeroShell
      title="Xác nhận email"
      subtitle={loading ? "Đang xác nhận tài khoản của bạn…" : undefined}
    >
      {loading ? (
        <p className="text-center text-sm text-slate-600">Vui lòng đợi trong giây lát.</p>
      ) : err ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-md shadow-slate-200/80 sm:p-6">
          <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-800">{err}</p>
          <p className="mt-6 text-center text-sm text-slate-600">
            <Link href="/login" className="font-semibold hover:underline" style={{ color: AUTH_BRAND }}>
              Đăng nhập
            </Link>
            {" · "}
            <Link
              href="/register"
              className="font-semibold hover:underline"
              style={{ color: AUTH_BRAND }}
            >
              Đăng ký lại
            </Link>
          </p>
        </div>
      ) : null}
    </AuthHeroShell>
  );
}
