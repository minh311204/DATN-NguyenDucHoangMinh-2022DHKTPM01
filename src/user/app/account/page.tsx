"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BookMarked,
  FilePenLine,
  Heart,
  MessageSquareText,
  UserRound,
} from "lucide-react";
import {
  AUTH_CHANGED_EVENT,
  getStoredUserEmail,
  hasAccessToken,
  initialsFromEmail,
} from "@/lib/auth-storage";
import { ensureSessionFresh } from "@/lib/client-auth";

function displayNameFromEmail(email: string | null): string {
  if (!email) return "Khách";
  return email.split("@")[0] ?? email;
}

type ProfileField = {
  id: string;
  label: string;
  value: string;
  editable?: boolean;
};

const LEFT_FIELDS: ProfileField[] = [
  { id: "fullName", label: "Họ tên", value: "—", editable: true },
  { id: "dob", label: "Ngày sinh", value: "—", editable: true },
  { id: "email", label: "Email", value: "—" },
  { id: "passport", label: "Hộ chiếu", value: "—", editable: true },
  { id: "address", label: "Địa chỉ", value: "—", editable: true },
  { id: "cardType", label: "Loại thẻ", value: "—" },
  { id: "goldPoints", label: "Điểm vàng", value: "0" },
  { id: "pointsToUpgrade", label: "Điểm cần để nâng hạng", value: "0" },
];

const RIGHT_FIELDS: ProfileField[] = [
  { id: "gender", label: "Giới tính", value: "—", editable: true },
  { id: "phone", label: "Điện thoại", value: "—", editable: true },
  { id: "idCard", label: "CMND/CCCD", value: "—", editable: true },
  { id: "nationality", label: "Quốc tịch", value: "—", editable: true },
  { id: "toursDone1", label: "Tổng số tour đã đi", value: "0" },
  { id: "toursDone2", label: "Tổng số tour đã đi", value: "0" },
  { id: "pointsToKeep", label: "Điểm cần để giữ hạng", value: "0" },
  { id: "rankReviewDate", label: "Ngày xét nâng hạng", value: "—" },
];

function ProfileColumn({
  fields,
  userEmail,
}: {
  fields: ProfileField[];
  userEmail: string | null;
}) {
  return (
    <div>
      {fields.map((field) => {
        const value = field.id === "email" ? (userEmail ?? "—") : field.value;
        return (
          <div
            key={field.id}
            className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-stone-200 py-3 text-sm"
          >
            <p className="font-medium text-stone-700">{field.label}</p>
            <p className="text-stone-900">{value}</p>
            {field.editable ? (
              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
                aria-label={`Chỉnh sửa ${field.label}`}
              >
                <FilePenLine className="h-3.5 w-3.5" />
              </button>
            ) : (
              <span className="h-7 w-7" aria-hidden />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function AccountPage() {
  const [mounted, setMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setMounted(true);
    syncLocal();
    void ensureSessionFresh().finally(() => {
      if (!alive) return;
      syncLocal();
    });
    return () => {
      alive = false;
    };

    function syncLocal() {
      setIsLoggedIn(hasAccessToken());
      setUserEmail(getStoredUserEmail());
    }
  }, []);

  useEffect(() => {
    function onAuthChanged() {
      setIsLoggedIn(hasAccessToken());
      setUserEmail(getStoredUserEmail());
    }
    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
  }, []);

  const displayName = displayNameFromEmail(userEmail);

  /** Trùng HTML server/client: chưa đọc localStorage → skeleton, sau mount mới nhánh login/dashboard. */
  if (!mounted) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6" aria-busy="true">
        <div className="h-5 w-24 animate-pulse rounded bg-stone-200" />
        <div className="mx-auto mt-6 h-10 max-w-sm animate-pulse rounded-lg bg-stone-200" />
        <div className="mt-8 grid gap-6 lg:grid-cols-[260px_1fr]">
          <div className="h-[420px] animate-pulse rounded-xl bg-stone-200/80" />
          <div className="h-[420px] animate-pulse rounded-xl bg-stone-200/80" />
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-bold text-stone-900">Tài khoản của bạn</h1>
        <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-600 shadow-sm">
          Bạn cần đăng nhập để xem thông tin tài khoản.{" "}
          <Link href="/login" className="font-semibold text-teal-700 hover:underline">
            Đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-stone-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại
      </Link>

      <h1 className="mt-4 text-center text-4xl font-bold tracking-tight text-sky-800">
        Tài khoản của bạn
      </h1>

      <div className="mt-8 grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3 border-b border-stone-200 pb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-600 font-semibold text-white">
              {initialsFromEmail(userEmail)}
            </div>
            <div>
              <p className="font-semibold text-stone-900">{displayName}</p>
              <p className="text-xs text-stone-500">{userEmail}</p>
            </div>
          </div>

          <nav className="mt-4 space-y-1 text-sm">
            <p className="px-2 pb-1 font-semibold text-red-500">Tài khoản</p>
            <div className="rounded-lg bg-stone-50 px-2 py-2 text-red-500">
              <Link href="/account" className="inline-flex items-center gap-2 font-semibold">
                <UserRound className="h-4 w-4" />
                Thông tin cá nhân
              </Link>
            </div>
            <Link
              href="/account/password"
              className="block px-2 py-2 text-stone-700 hover:text-stone-900"
            >
              Đổi mật khẩu
            </Link>
            <button type="button" className="block px-2 py-2 text-left text-stone-700">
              Đăng xuất
            </button>
            <p className="px-2 py-2 text-stone-700">Yêu cầu xóa tài khoản</p>

            <div className="my-2 border-t border-stone-200" />

            <Link
              href="/bookings"
              className="inline-flex w-full items-center gap-2 px-2 py-2 text-stone-700 hover:text-stone-900"
            >
              <BookMarked className="h-4 w-4" />
              Đơn đặt chỗ
            </Link>
            <button
              type="button"
              className="inline-flex w-full items-center gap-2 px-2 py-2 text-stone-700"
            >
              <MessageSquareText className="h-4 w-4" />
              Đánh giá của quý khách
            </button>
            <Link
              href="/favorites/0"
              className="inline-flex w-full items-center gap-2 px-2 py-2 text-stone-700 hover:text-stone-900"
            >
              <Heart className="h-4 w-4" />
              Yêu thích đã lưu
            </Link>
          </nav>
        </aside>

        <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-stone-900">Thông tin cá nhân</h2>
          <p className="mt-1 text-sm text-stone-500">
            
          </p>

          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            <ProfileColumn fields={LEFT_FIELDS} userEmail={userEmail} />
            <ProfileColumn fields={RIGHT_FIELDS} userEmail={userEmail} />
          </div>
        </section>
      </div>
    </div>
  );
}
