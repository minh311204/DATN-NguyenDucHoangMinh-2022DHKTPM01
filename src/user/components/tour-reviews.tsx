"use client";

import { useEffect, useMemo, useState } from "react";
import { Star, Trash2 } from "lucide-react";
import Link from "next/link";
import {
  upsertTourReview,
  fetchTourReviews,
  deleteMyTourReview,
} from "@/lib/client-tour-reviews";
import type { TourReview, TourReviewUser } from "@/lib/api-types";
import { AUTH_KEYS } from "@/lib/auth-storage";
import { errorMessage } from "@/lib/format";

const CARD =
  "overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]";

function displayName(u: TourReviewUser): string {
  const n = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
  return n || "Khách";
}

function initialsFromUser(u: TourReviewUser): string {
  const fn = u.firstName?.trim().charAt(0) ?? "";
  const ln = u.lastName?.trim().charAt(0) ?? "";
  const s = (fn + ln).toUpperCase();
  if (s.length >= 2) return s.slice(0, 2);
  if (s.length === 1) return s;
  return "K";
}

function StarRow({
  value,
  size = "sm",
}: {
  value: number;
  size?: "sm" | "md";
}) {
  const dim = size === "md" ? "h-5 w-5 sm:h-6 sm:w-6" : "h-4 w-4";
  return (
    <div className="flex items-center gap-0.5 text-amber-400" aria-hidden>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${dim} shrink-0 ${n <= value ? "fill-amber-400" : "fill-transparent text-stone-200"}`}
          strokeWidth={n <= value ? 0 : 1.35}
        />
      ))}
    </div>
  );
}

export default function TourReviews({
  tourId,
  initialRatingAvg,
  initialTotalReviews,
}: {
  tourId: number;
  initialRatingAvg?: number | null;
  initialTotalReviews?: number | null;
}) {
  const [reviews, setReviews] = useState<TourReview[]>([]);
  const [ratingAvg, setRatingAvg] = useState<number | null>(
    initialRatingAvg ?? null,
  );
  const [totalReviews, setTotalReviews] = useState<number | null>(
    initialTotalReviews ?? null,
  );

  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [isAuthed, setIsAuthed] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const stars = useMemo(() => [1, 2, 3, 4, 5], []);

  const distribution = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    for (const r of reviews) {
      const v = Math.min(5, Math.max(1, Math.round(Number(r.rating))));
      counts[v - 1] += 1;
    }
    return counts;
  }, [reviews]);

  const maxBar = useMemo(
    () => Math.max(1, ...distribution),
    [distribution],
  );

  useEffect(() => {
    const token = localStorage.getItem(AUTH_KEYS.accessToken);
    setIsAuthed(token != null);
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setCurrentUserId(payload.sub ?? payload.id ?? null);
      } catch {
        setCurrentUserId(null);
      }
    }
    void (async () => {
      const res = await fetchTourReviews(tourId);
      if (res.ok) setReviews(res.data);
    })();
  }, [tourId]);

  async function reload() {
    const res = await fetchTourReviews(tourId);
    if (res.ok) setReviews(res.data);
  }

  async function onDeleteReview() {
    if (!confirm("Xoá đánh giá của bạn?")) return;
    setDeleting(true);
    try {
      const res = await deleteMyTourReview(tourId);
      if (!res.ok) {
        setErr(errorMessage(res.body));
        return;
      }
      setRatingAvg(res.data.tour.ratingAvg);
      setTotalReviews(res.data.tour.totalReviews);
      await reload();
    } finally {
      setDeleting(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const trimmed = comment.trim();
      const res = await upsertTourReview(
        tourId,
        rating,
        trimmed.length ? trimmed : null,
      );
      if (!res.ok) {
        setErr(errorMessage(res.body));
        return;
      }

      setRatingAvg(res.data.tour.ratingAvg);
      setTotalReviews(res.data.tour.totalReviews);
      await reload();
      setComment("");
    } finally {
      setLoading(false);
    }
  }

  const total = reviews.length;
  const showDist = total > 0;

  return (
    <section className="mt-2">
      {/* Tổng quan điểm — một khối nổi bật, dễ quét */}
      <div className={`${CARD} p-5 sm:p-6`}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-10">
          <div className="flex shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-sky-50 to-stone-50 px-8 py-6 text-center lg:min-w-[200px]">
            <p className="text-5xl font-bold tabular-nums tracking-tight text-stone-900 sm:text-6xl">
              {ratingAvg != null ? ratingAvg.toFixed(1) : "—"}
            </p>
            <div className="mt-2 flex justify-center">
              <StarRow
                value={
                  ratingAvg != null
                    ? Math.min(5, Math.max(0, Math.round(ratingAvg)))
                    : 0
                }
                size="md"
              />
            </div>
            <p className="mt-2 text-sm font-medium text-stone-600">
              {totalReviews != null && totalReviews > 0
                ? `Dựa trên ${totalReviews} đánh giá`
                : total > 0
                  ? `Dựa trên ${total} đánh giá`
                  : "Chưa có đánh giá"}
            </p>
          </div>

          {showDist ? (
            <div className="min-w-0 flex-1 space-y-2.5">
              <h3 className="text-sm font-semibold text-stone-900">
                Phân bố số sao
              </h3>
              {[5, 4, 3, 2, 1].map((level) => {
                const count = distribution[level - 1];
                const pct = Math.round((count / maxBar) * 100);
                return (
                  <div
                    key={level}
                    className="grid grid-cols-[2.5rem_minmax(0,1fr)_2.25rem] items-center gap-3 text-sm"
                  >
                    <span className="tabular-nums text-stone-500">
                      {level}★
                    </span>
                    <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                      <div
                        className="h-full rounded-full bg-amber-400/90 transition-[width] duration-500 ease-out"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-right tabular-nums text-stone-600">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-stone-200 bg-stone-50/80 px-6 py-8 text-center">
              <p className="max-w-sm text-sm leading-relaxed text-stone-600">
                Hãy là người đầu tiên chia sẻ cảm nhận sau chuyến đi — điều
                này giúp mọi người chọn tour phù hợp hơn.
              </p>
            </div>
          )}
        </div>

        {!isAuthed ? (
          <p className="mt-5 border-t border-stone-100 pt-5 text-center text-sm text-stone-600 sm:text-left">
            Bạn cần{" "}
            <Link
              href="/login"
              className="font-semibold text-[#0b5ea8] underline-offset-2 hover:underline"
            >
              đăng nhập
            </Link>{" "}
            để gửi đánh giá.
          </p>
        ) : null}
      </div>

      {/* Danh sách đánh giá */}
      {reviews.length > 0 ? (
        <ul className="mt-5 space-y-4">
          {reviews.map((r) => {
            const name = displayName(r.user);
            const ini = initialsFromUser(r.user);
            const dateStr = r.createdAtUtc
              ? new Date(r.createdAtUtc).toLocaleDateString("vi-VN", {
                  day: "numeric",
                  month: "numeric",
                  year: "numeric",
                })
              : "";
            const isMine =
              currentUserId != null && r.userId === currentUserId;

            return (
              <li key={r.id} className={`${CARD} p-4 sm:p-5`}>
                <div className="flex gap-3 sm:gap-4">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0b5ea8] to-sky-600 text-sm font-bold text-white shadow-sm"
                    aria-hidden
                  >
                    {ini}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                      <div className="min-w-0">
                        <p className="text-base font-semibold leading-snug text-stone-900 break-words">
                          {name}
                        </p>
                        <div className="mt-1">
                          <StarRow value={r.rating} />
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end sm:gap-1">
                        {dateStr ? (
                          <time
                            dateTime={r.createdAtUtc ?? undefined}
                            className="text-xs tabular-nums text-stone-500"
                          >
                            {dateStr}
                          </time>
                        ) : null}
                        {isMine ? (
                          <button
                            type="button"
                            onClick={onDeleteReview}
                            disabled={deleting}
                            title="Xoá đánh giá của bạn"
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-stone-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                            Xoá
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {r.comment ? (
                      <p className="mt-3 rounded-xl bg-stone-50/90 px-4 py-3 text-sm leading-relaxed text-stone-700 whitespace-pre-wrap">
                        {r.comment}
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {/* Form gửi đánh giá */}
      {isAuthed ? (
        <form
          onSubmit={onSubmit}
          className={`${CARD} mt-6 p-5 sm:p-6`}
        >
          <h3 className="text-lg font-bold text-stone-900">
            Chia sẻ trải nghiệm của bạn
          </h3>
          <p className="mt-1 text-sm text-stone-600">
            Đánh giá trung thực giúp cộng đồng du lịch tin tưởng hơn.
          </p>

          {err ? (
            <p
              className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800"
              role="alert"
            >
              {err}
            </p>
          ) : null}

          <div className="mt-6">
            <span
              id="review-rating-label"
              className="mb-2 block text-sm font-semibold text-stone-800"
            >
              Điểm đánh giá
            </span>
            <div
              className="flex flex-wrap items-center gap-1"
              role="group"
              aria-labelledby="review-rating-label"
            >
              {stars.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className="rounded-lg p-1.5 transition hover:bg-amber-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b5ea8]"
                  aria-label={`${n} sao`}
                  aria-pressed={n === rating}
                >
                  <Star
                    className={`h-8 w-8 transition-transform hover:scale-105 ${
                      n <= rating
                        ? "fill-amber-400 text-amber-400"
                        : "fill-transparent text-stone-300"
                    }`}
                    strokeWidth={n <= rating ? 0 : 1.25}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <label
              htmlFor="review-comment"
              className="mb-2 block text-sm font-semibold text-stone-800"
            >
              Nội dung
            </label>
            <textarea
              id="review-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={1000}
              className="w-full resize-y rounded-xl border border-stone-200 bg-stone-50/50 px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 transition focus:border-[#0b5ea8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0b5ea8]/20"
              placeholder="Ví dụ: Hành trình, hướng dẫn viên, chỗ ở, ẩm thực…"
            />
            <div className="mt-1.5 flex justify-between text-xs text-stone-500">
              <span>{loading ? "Đang gửi…" : "\u00a0"}</span>
              <span className="tabular-nums">{comment.trim().length}/1000</span>
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-xl bg-[#0b5ea8] px-8 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#063d6b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b5ea8] disabled:opacity-60"
            >
              {loading ? "Đang gửi…" : "Gửi đánh giá"}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
