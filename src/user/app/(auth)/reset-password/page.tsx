import { Suspense } from "react";
import { AuthHeroShell } from "@/components/auth-hero-shell";
import { ResetPasswordForm } from "./reset-password-form";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthHeroShell title="Đặt lại mật khẩu">
          <p className="text-center text-sm text-slate-500">Đang tải…</p>
        </AuthHeroShell>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
