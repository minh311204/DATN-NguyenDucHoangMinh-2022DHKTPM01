"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, Trash2, PenLine } from "lucide-react";
import { deleteMyTourReview } from "@/lib/client-tour-reviews";
import { hasAccessToken, AUTH_KEYS } from "@/lib/auth-storage";
import { ensureSessionFresh } from "@/lib/client-auth";
import { errorMessage } from "@/lib/format";
import { API_BASE_URL } from "@/lib/env";

type ReviewWithTour = {
  id: number;
  tourId: number;
  tourName?: string;
  rating: number;
  comment: string | null;
  createdAtUtc: string | null;
};

async function fetchMyReviews(): Promise<ReviewWithTour[]> {
  const token = localStorage.getItem(AUTH_KEYS.accessToken);
  if (!token) return [];
  try {
    // Lấy lịch sử behavior để biết tour nào user đã review
    const behRes = await fetch(
      `${API_BASE_URL}/preferences/behaviors?action=review&limit=50`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
    );
    if (!behRes.ok) return [];
    const behaviors: { tourId: number }[] = await behRes.json();
    const tourIds = [...new Set(behaviors.map((b) => b.tourId))];

    // Decode userId từ JWT
    let userId: number | null = null;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      userId = payload.sub ?? payload.id ?? null;
    } catch {
      return [];
    }
    if (!userId) return [];

    // Lấy review từ các tour đã tương tác
    const reviews: ReviewWithTour[] = [];
    for (const tourId of tourIds.slice(0, 20)) {
      const res = await fetch(`${API_BASE_URL}/tours/${tourId}/reviews`);
      if (!res.ok) continue;
      const list: any[] = await res.json();
      const mine = list.find((r) => r.userId === userId);
      if (mine) {
        // Lấy tên tour
        let tourName = `Tour #${tourId}`;
        try {
          const tr = await fetch(`${API_BASE_URL}/tours/${tourId}`);
          if (tr.ok) {
            const tourData = await tr.json();
            tourName = tourData.name ?? tourName;
          }
        } catch {/* ignore */}
        reviews.push({
          id: mine.id,
          tourId,
          tourName,
          rating: mine.rating,
          comment: mine.comment ?? null,
          createdAtUtc: mine.createdAtUtc ?? null,
        });
      }
    }
    return reviews;
  } catch {
    return [];
  }
}

export default function MyReviewsPage() {
  const [mounted, setMounted] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [reviews, setReviews] = useState<ReviewWithTour[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setMounted(true);
    void (async () => {
      await ensureSessionFresh();
      if (!alive) return;
      const isAuthed = hasAccessToken();
      setAuthed(isAuthed);
      if (!isAuthed) {
        setLoading(false);
        return;
      }
      const data = await fetchMyReviews();
      if (!alive) return;
      setReviews(data);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function onDelete(tourId: number) {
    if (!confirm("Xoá đánh giá này?")) return;
    setDeleting(tourId);
    setErr(null);
    const res = await deleteMyTourReview(tourId);
    if (!res.ok) {
      setErr(errorMessage(res.body));
    } else {
      setReviews((prev) => prev.filter((r) => r.tourId !== tourId));
    }
    setDeleting(null);
  }

  if (!mounted || loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="h-8 w-48 animate-pulse rounded bg-stone-200" />
        <div className="mt-8 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-stone-100" />
          ))}
        </div>
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center px-4">
        <PenLine className="h-12 w-12 text-stone-300" />
        <p className="mt-4 text-stone-500">
          Vui lòng{" "}
          <Link href="/login" className="font-semibold text-teal-700 hover:underline">
            đăng nhập
          </Link>{" "}
          để xem đánh giá của bạn.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
        <h1 className="text-2xl font-bold text-stone-900">
          Đánh giá của tôi ({reviews.length})
        </h1>
      </div>

      {err ? (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {err}
        </div>
      ) : null}

      {reviews.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-stone-400">
          <Star className="h-16 w-16 opacity-30" />
          <p className="mt-4 text-lg">Bạn chưa có đánh giá nào.</p>
          <Link
            href="/tours"
            className="mt-6 rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Khám phá tour
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <Link
                    href={`/tours/${r.tourId}`}
                    className="line-clamp-1 font-semibold text-teal-700 hover:underline"
                  >
                    {r.tourName ?? `Tour #${r.tourId}`}
                  </Link>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={
                            n <= r.rating
                              ? "h-4 w-4 fill-yellow-500 text-yellow-500"
                              : "h-4 w-4 text-stone-300"
                          }
                        />
                      ))}
                    </div>
                    <span className="text-sm font-semibold text-stone-800">
                      {r.rating}/5
                    </span>
                  </div>
                  {r.comment ? (
                    <p className="mt-2 text-sm text-stone-600">{r.comment}</p>
                  ) : (
                    <p className="mt-2 text-sm italic text-stone-400">Không có nhận xét</p>
                  )}
                  {r.createdAtUtc ? (
                    <p className="mt-1 text-xs text-stone-400">
                      {new Date(r.createdAtUtc).toLocaleDateString("vi-VN")}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link
                    href={`/tours/${r.tourId}#reviews`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50"
                    title="Chỉnh sửa đánh giá"
                  >
                    <PenLine className="h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => void onDelete(r.tourId)}
                    disabled={deleting === r.tourId}
                    title="Xoá đánh giá"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-rose-100 text-rose-500 hover:bg-rose-50 disabled:opacity-50"
                  >
                    {deleting === r.tourId ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-rose-400 border-t-transparent" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
