"use client";

import { Bell, ChevronDown, LogOut, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  FormEvent,
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";
import { clearAuth } from "@/lib/client-auth";
import { ThemeToggle } from "@/components/theme-toggle";

type Props = { title: string; subtitle?: string };

function QuickSearchForm() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState("");

  useEffect(() => {
    setQ(searchParams.get("q") ?? "");
  }, [searchParams]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (pathname.startsWith("/tours")) {
      const p = new URLSearchParams(searchParams.toString());
      if (term) p.set("q", term);
      else p.delete("q");
      p.delete("page");
      const s = p.toString();
      router.push(s ? `/tours?${s}` : "/tours");
      return;
    }
    if (term) {
      router.push(`/tours?q=${encodeURIComponent(term)}`);
    } else {
      router.push("/tours");
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="relative hidden min-w-0 sm:block"
      role="search"
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        name="q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder=""
        autoComplete="off"
        className="h-10 w-48 rounded-xl border border-slate-200/90 bg-slate-50/90 pl-9 pr-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 transition focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 lg:w-64"
        aria-label="Tìm nhanh tour"
      />
    </form>
  );
}

function AccountMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-full p-0.5 ring-2 ring-white transition hover:ring-sky-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Tài khoản admin"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-xs font-semibold text-white shadow-md">
          AD
        </span>
        <ChevronDown
          className={`hidden h-4 w-4 text-slate-500 transition sm:block ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 min-w-[12rem] rounded-xl border border-slate-200/90 bg-white py-1 shadow-lg ring-1 ring-slate-900/5"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
            onClick={() => {
              setOpen(false);
              clearAuth();
              window.location.href = "/login";
            }}
          >
            <LogOut className="h-4 w-4 shrink-0 text-slate-500" />
            Đăng xuất
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function AdminHeader({ title, subtitle }: Props) {
  return (
    <header className="sticky top-0 z-30 flex h-[4.25rem] shrink-0 items-center justify-between gap-4 border-b border-slate-200/80 bg-white/90 px-5 backdrop-blur-md supports-[backdrop-filter]:bg-white/75 dark:border-slate-800 dark:bg-slate-900/90 sm:px-6">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <Suspense
          fallback={
            <div
              className="hidden h-10 w-48 animate-pulse rounded-xl bg-slate-100 sm:block lg:w-64"
              aria-hidden
            />
          }
        >
          <QuickSearchForm />
        </Suspense>
        <ThemeToggle />
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/90 bg-slate-50/80 text-slate-500 shadow-sm transition hover:border-sky-200 hover:bg-sky-50/80 hover:text-sky-700 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:border-sky-500/50"
          aria-label="Thông báo"
        >
          <Bell className="h-5 w-5" />
        </button>
        <AccountMenu />
      </div>
    </header>
  );
}
