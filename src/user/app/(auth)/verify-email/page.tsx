import { Suspense } from "react";
import { AuthHeroShell } from "@/components/auth-hero-shell";
import { VerifyEmailForm } from "./verify-email-form";

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <AuthHeroShell title="Xác nhận email">
          <p className="text-center text-sm text-slate-500">Đang tải…</p>
        </AuthHeroShell>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}
