"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Settings2, TrendingUp } from "lucide-react";
import { fetchMyPreference, upsertMyPreference, fetchRecommendations } from "@/lib/client-preference";
import type { UserPreference, TourListItem } from "@/lib/api-types";
import { hasAccessToken } from "@/lib/auth-storage";
import { ensureSessionFresh } from "@/lib/client-auth";
import { TourCard } from "@/components/tour-card";
import { errorMessage } from "@/lib/format";

const BUDGET_OPTIONS = [
  { value: "under_5m", label: "Dưới 5 triệu" },
  { value: "5_10m", label: "5 – 10 triệu" },
  { value: "10_20m", label: "10 – 20 triệu" },
  { value: "over_20m", label: "Trên 20 triệu" },
];

const STYLE_OPTIONS = [
  { value: "adventure", label: "Phiêu lưu, khám phá" },
  { value: "cultural", label: "Văn hóa, lịch sử" },
  { value: "relaxation", label: "Nghỉ dưỡng, thư giãn" },
  { value: "family", label: "Gia đình" },
  { value: "luxury", label: "Cao cấp" },
  { value: "budget", label: "Tiết kiệm" },
];

export default function PreferencesPage() {
  const [mounted, setMounted] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [pref, setPref] = useState<UserPreference | null>(null);
  const [recommendations, setRecommendations] = useState<TourListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [recLoading, setRecLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Form state
  const [budgetRange, setBudgetRange] = useState<string>("");
  const [travelStyle, setTravelStyle] = useState<string>("");
  const [preferredLocations, setPreferredLocations] = useState<string>("");

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
      const [prefRes, recRes] = await Promise.all([
        fetchMyPreference(),
        fetchRecommendations(8),
      ]);
      if (!alive) return;
      if (prefRes.ok && prefRes.data) {
        const p = prefRes.data;
        setPref(p);
        setBudgetRange(p.budgetRange ?? "");
        setTravelStyle(p.travelStyle ?? "");
        setPreferredLocations(p.preferredLocations ?? "");
      }
      if (recRes.ok) setRecommendations(recRes.data);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setErr(null);
    const res = await upsertMyPreference({
      budgetRange: budgetRange || null,
      travelStyle: travelStyle || null,
      preferredLocations: preferredLocations.trim() || null,
    });
    if (!res.ok) {
      setErr(errorMessage(res.body));
      setSaving(false);
      return;
    }
    setPref(res.data);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setSaving(false);

    /** Đồng bộ lại gợi ý theo sở thích vừa cập nhật. */
    setRecLoading(true);
    const recRes = await fetchRecommendations(8);
    if (recRes.ok) setRecommendations(recRes.data);
    setRecLoading(false);
  }

  if (!mounted || loading) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <div className="h-8 w-56 animate-pulse rounded bg-stone-200" />
        <div className="mt-8 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-stone-100" />
          ))}
        </div>
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center px-4">
        <Settings2 className="h-12 w-12 text-stone-300" />
        <p className="mt-4 text-stone-500">
          Vui lòng{" "}
          <Link href="/login" className="font-semibold text-teal-700 hover:underline">
            đăng nhập
          </Link>{" "}
          để quản lý sở thích.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      {/* Preference form */}
      <div className="mb-8 flex items-center gap-3">
        <Settings2 className="h-6 w-6 text-teal-600" />
        <h1 className="text-2xl font-bold text-stone-900">Sở thích du lịch</h1>
      </div>

      {err ? (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{err}</div>
      ) : null}
      {saved ? (
        <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
          Đã lưu sở thích thành công!
        </div>
      ) : null}

      <form onSubmit={onSave} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        {/* Budget */}
        <div className="mb-5">
          <label className="mb-2 block text-sm font-semibold text-stone-800">
            Ngân sách dự kiến
          </label>
          <div className="flex flex-wrap gap-2">
            {BUDGET_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setBudgetRange(budgetRange === opt.value ? "" : opt.value)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                  budgetRange === opt.value
                    ? "border-teal-500 bg-teal-50 text-teal-700"
                    : "border-stone-200 text-stone-600 hover:border-teal-300 hover:bg-teal-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Travel style */}
        <div className="mb-5">
          <label className="mb-2 block text-sm font-semibold text-stone-800">
            Phong cách du lịch
          </label>
          <div className="flex flex-wrap gap-2">
            {STYLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTravelStyle(travelStyle === opt.value ? "" : opt.value)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                  travelStyle === opt.value
                    ? "border-teal-500 bg-teal-50 text-teal-700"
                    : "border-stone-200 text-stone-600 hover:border-teal-300 hover:bg-teal-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Preferred locations */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-semibold text-stone-800">
            Điểm đến yêu thích
          </label>
          <input
            type="text"
            value={preferredLocations}
            onChange={(e) => setPreferredLocations(e.target.value)}
            placeholder="VD: Đà Nẵng, Phú Quốc, Hội An..."
            maxLength={500}
            className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm text-stone-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-teal-600 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {saving ? "Đang lưu..." : "Lưu sở thích"}
        </button>
      </form>

      {/* Recommendations */}
      {recLoading || recommendations.length > 0 ? (
        <section className="mt-10">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-teal-600" />
            <h2 className="text-lg font-bold text-stone-900">Tour gợi ý cho bạn</h2>
            {recLoading ? (
              <span className="text-xs text-stone-500">Đang cập nhật theo sở thích…</span>
            ) : null}
          </div>
          {recLoading && recommendations.length === 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-48 animate-pulse rounded-xl bg-stone-100" />
              ))}
            </div>
          ) : (
            <div className={`grid gap-4 sm:grid-cols-2 ${recLoading ? "opacity-60" : ""}`}>
              {recommendations.slice(0, 4).map((tour) => (
                <TourCard key={tour.id} tour={tour} />
              ))}
            </div>
          )}
          {recommendations.length > 4 ? (
            <div className="mt-4 text-center">
              <Link
                href="/tours"
                className="text-sm font-medium text-teal-600 hover:underline"
              >
                Xem thêm tour gợi ý →
              </Link>
            </div>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
