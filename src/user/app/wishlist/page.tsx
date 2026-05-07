"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Trash2 } from "lucide-react";
import { fetchMyWishlist, removeFromWishlist } from "@/lib/client-wishlist";
import type { WishlistItem } from "@/lib/api-types";
import { hasAccessToken } from "@/lib/auth-storage";
import { ensureSessionFresh } from "@/lib/client-auth";
import { formatVnd } from "@/lib/format";
import { Star, MapPin, Calendar } from "lucide-react";

export default function WishlistPage() {
  const [mounted, setMounted] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<number | null>(null);

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
      const res = await fetchMyWishlist();
      if (!alive) return;
      if (res.ok) setItems(res.data);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function onRemove(tourId: number) {
    setRemoving(tourId);
    const res = await removeFromWishlist(tourId);
    if (res.ok) setItems((prev) => prev.filter((i) => i.tourId !== tourId));
    setRemoving(null);
  }

  if (!mounted || loading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12">
        <div className="h-8 w-48 animate-pulse rounded bg-stone-200" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-stone-100" />
          ))}
        </div>
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center px-4">
        <Heart className="h-12 w-12 text-stone-300" />
        <h2 className="mt-4 text-xl font-bold text-stone-700">Danh sách yêu thích</h2>
        <p className="mt-2 text-stone-500">
          Vui lòng{" "}
          <Link href="/login" className="font-semibold text-teal-700 hover:underline">
            đăng nhập
          </Link>{" "}
          để xem tour yêu thích của bạn.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <Heart className="h-6 w-6 fill-rose-500 text-rose-500" />
        <h1 className="text-2xl font-bold text-stone-900">
          Tour yêu thích ({items.length})
        </h1>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-stone-400">
          <Heart className="h-16 w-16 opacity-30" />
          <p className="mt-4 text-lg">Bạn chưa có tour yêu thích nào.</p>
          <Link
            href="/tours"
            className="mt-6 rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Khám phá tour ngay
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => {
            const t = item.tour;
            return (
              <article
                key={item.id}
                className="group relative overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:shadow-md"
              >
                <Link href={`/tours/${t.id}`} className="block">
                  <div className="relative h-40 overflow-hidden bg-stone-100">
                    {t.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={t.thumbnailUrl}
                        alt=""
                        className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-teal-600 to-blue-800" />
                    )}
                    <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-black/35 px-2.5 py-1 text-xs text-white backdrop-blur">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {t.ratingAvg ? t.ratingAvg.toFixed(1) : "Mới"}
                    </div>
                  </div>
                  <div className="p-4 pb-3">
                    <h3 className="line-clamp-2 font-semibold text-stone-900 group-hover:text-teal-800">
                      {t.name}
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-3 text-sm text-stone-500">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-4 w-4 shrink-0 text-teal-600" />
                        {t.destinationLocation?.name ?? "—"}
                      </span>
                      {t.durationDays ? (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-4 w-4 shrink-0 text-teal-600" />
                          {t.durationDays} ngày
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-lg font-bold text-teal-700">
                      {formatVnd(t.basePrice ?? null)}
                      <span className="text-sm font-normal text-stone-500"> / khách</span>
                    </p>
                  </div>
                </Link>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => void onRemove(t.id)}
                  disabled={removing === t.id}
                  title="Xoá khỏi yêu thích"
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-rose-500 shadow backdrop-blur hover:bg-white disabled:opacity-50"
                >
                  {removing === t.id ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-rose-400 border-t-transparent" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
