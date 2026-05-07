"use client";

import { AUTH_SHELL_LAYOUT_CLASS } from "@/lib/auth-ui";

/** Khối auth — một cột max-width cố định cho tiêu đề / phụ đề / form / footer phụ */
export function AuthHeroShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const col = AUTH_SHELL_LAYOUT_CLASS;

  return (
    <div className="flex w-full flex-col items-center px-4 pb-6 pt-4 sm:pb-8 sm:pt-5">
      <h1
        className={`text-center font-serif text-2xl font-semibold leading-snug tracking-tight text-slate-900 sm:text-[1.65rem] ${col}`}
      >
        {title}
      </h1>
      {subtitle ? (
        <p className={`mt-2 text-center text-sm text-slate-600 sm:text-[15px] ${col}`}>
          {subtitle}
        </p>
      ) : null}
      <div className={`mt-5 ${col}`}>{children}</div>
      {footer ? (
        <div className={`mt-5 text-center text-sm text-slate-600 ${col}`}>{footer}</div>
      ) : null}
    </div>
  );
}
