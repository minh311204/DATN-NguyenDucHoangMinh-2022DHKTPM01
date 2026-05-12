"use client";

import { useEffect, useState } from "react";
import { Pencil, X } from "lucide-react";
import { TourForm } from "@/components/tour-form";
import { TourImage } from "@/components/tour-image";
import type { LocationRow, TourDetail } from "@/lib/api-types";
import { fetchLocations, fetchTourById } from "@/lib/admin-api";
import {
  errorMessage,
  formatDateTimeVi,
  formatDateVi,
  formatVnd,
  labelTourLine,
  labelTransport,
} from "@/lib/format";

export type TourManageDrawerState =
  | { tourId: number; mode: "view" | "edit" }
  | { mode: "create" }
  | null;

type Props = {
  state: TourManageDrawerState;
  onClose: () => void;
  onSaved: () => void;
  onChangeMode: (mode: "view" | "edit") => void;
};

function DetailView({ tour }: { tour: TourDetail }) {
  return (
    <div className="space-y-6 pb-8">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50">
        <TourImage url={tour.thumbnailUrl} name={tour.name} />
      </div>

      <div>
        <h3 className="text-lg font-semibold text-slate-900">{tour.name}</h3>
        {tour.slug ? (
          <p className="mt-1 font-mono text-xs text-slate-500">{tour.slug}</p>
        ) : null}
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">Giá cơ bản</dt>
          <dd className="font-medium text-slate-900">
            {formatVnd(tour.basePrice ?? null)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Thời lượng</dt>
          <dd className="text-slate-900">
            {tour.durationDays != null ? `${tour.durationDays} ngày` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Dòng tour / Phương tiện</dt>
          <dd className="text-slate-900">
            {labelTourLine(tour.tourLine)} · {labelTransport(tour.transportType)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Điểm đi</dt>
          <dd className="text-slate-900">
            {tour.departureLocation?.name ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Điểm đến</dt>
          <dd className="text-slate-900">
            {tour.destinationLocation?.name ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Hiển thị / Nổi bật</dt>
          <dd className="text-slate-900">
            {tour.isActive !== false ? "Đang mở" : "Tạm dừng"}
            {tour.isFeatured ? " · Nổi bật" : ""}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Đánh giá</dt>
          <dd className="text-slate-900">
            {tour.ratingAvg != null
              ? `${tour.ratingAvg.toFixed(1)} ★ (${tour.totalReviews ?? 0})`
              : "—"}
          </dd>
        </div>
        {tour.createdAtUtc ? (
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Tạo lúc</dt>
            <dd className="text-slate-900">
              {formatDateTimeVi(tour.createdAtUtc)}
            </dd>
          </div>
        ) : null}
      </dl>

      {tour.description?.trim() ? (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Mô tả
          </h4>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {tour.description}
          </p>
        </div>
      ) : null}

      {tour.tags?.length ? (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Nhãn
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {tour.tags.map((t) => (
              <span
                key={t.id}
                className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-800"
              >
                {t.name}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {tour.schedules?.length ? (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Lịch khởi hành
          </h4>
          <ul className="space-y-2 text-sm">
            {tour.schedules.map((s) => (
              <li
                key={s.id}
                className="rounded-lg border border-slate-100 bg-white px-3 py-2"
              >
                {formatDateVi(s.startDate)} → {formatDateVi(s.endDate)}
                {s.availableSeats != null ? (
                  <span className="ml-2 text-slate-500">
                    · Còn {s.availableSeats} chỗ
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {tour.itineraries?.length ? (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Chương trình theo ngày
          </h4>
          <ul className="space-y-2 text-sm">
            {tour.itineraries
              .slice()
              .sort((a, b) => a.dayNumber - b.dayNumber)
              .map((it) => (
                <li
                  key={it.id}
                  className="rounded-lg border border-slate-100 bg-white px-3 py-2"
                >
                  <span className="font-medium text-slate-800">
                    Ngày {it.dayNumber}
                    {it.title ? `: ${it.title}` : ""}
                  </span>
                  {it.description?.trim() ? (
                    <p className="mt-1 text-slate-600">{it.description}</p>
                  ) : null}
                </li>
              ))}
          </ul>
        </div>
      ) : null}

      {(tour.inclusions?.trim() || tour.exclusions?.trim()) ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {tour.inclusions?.trim() ? (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Bao gồm
              </h4>
              <p className="whitespace-pre-wrap text-sm text-slate-700">
                {tour.inclusions}
              </p>
            </div>
          ) : null}
          {tour.exclusions?.trim() ? (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
                Không bao gồm
              </h4>
              <p className="whitespace-pre-wrap text-sm text-slate-700">
                {tour.exclusions}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {tour.images && tour.images.length > 1 ? (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Thư viện ảnh
          </h4>
          <div className="flex flex-wrap gap-2">
            {tour.images.map((im) => (
              <TourImage
                key={im.id}
                url={im.imageUrl}
                name={`${tour.name} (${im.id})`}
                variant="thumb"
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function TourManageDrawer({
  state,
  onClose,
  onSaved,
  onChangeMode,
}: Props) {
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [tour, setTour] = useState<TourDetail | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const tourId =
    state != null && "tourId" in state ? state.tourId : null;

  useEffect(() => {
    if (!state) {
      setTour(null);
      setLocations([]);
      setLoadErr(null);
      setLoading(false);
      return;
    }

    if (state.mode === "create") {
      let cancelled = false;
      (async () => {
        setLoading(true);
        setLoadErr(null);
        setTour(null);
        const l = await fetchLocations();
        if (cancelled) return;
        if (!l.ok) {
          setLoadErr(errorMessage(l.body, l.status));
          setLocations([]);
        } else {
          setLocations(l.data.filter((x) => x.isActive !== false));
          setLoadErr(null);
        }
        setLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }

    const id = state.tourId;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadErr(null);
      const [l, t] = await Promise.all([
        fetchLocations(),
        fetchTourById(id),
      ]);
      if (cancelled) return;
      if (!l.ok) {
        setLoadErr(errorMessage(l.body, l.status));
        setTour(null);
        setLocations([]);
      } else if (!t.ok) {
        setLoadErr(errorMessage(t.body, t.status));
        setTour(null);
        setLocations(l.data.filter((x) => x.isActive !== false));
      } else {
        setLocations(l.data.filter((x) => x.isActive !== false));
        setTour(t.data);
        setLoadErr(null);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [state]);

  useEffect(() => {
    if (!state) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [state]);

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, onClose]);

  if (!state) return null;

  const title =
    state.mode === "create"
      ? "Thêm tour"
      : state.mode === "view"
        ? "Chi tiết tour"
        : "Chỉnh sửa tour";

  const isCreate = state.mode === "create";
  const showViewEditToggle = !isCreate && tourId != null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Đóng"
        className="absolute inset-0 bg-black/40 transition hover:bg-black/50 z-0"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-drawer-title"
        className="relative z-10 flex h-full w-full max-w-4xl flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:ring-1 dark:ring-white/10"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
          <h2
            id="tour-drawer-title"
            className="truncate text-base font-semibold text-slate-900 dark:text-slate-100"
          >
            {title}
            {tour?.name ? (
              <span className="ml-2 font-normal text-slate-500">
                · {tour.name}
              </span>
            ) : null}
          </h2>
          <div className="flex shrink-0 items-center gap-2">
            {showViewEditToggle && state.mode === "view" && tour ? (
              <button
                type="button"
                onClick={() => onChangeMode("edit")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#ff6600] px-3 py-2 text-sm font-medium text-white hover:bg-[#e65c00]"
              >
                <Pencil className="h-4 w-4" />
                Chỉnh sửa
              </button>
            ) : null}
            {showViewEditToggle && state.mode === "edit" ? (
              <button
                type="button"
                onClick={() => onChangeMode("view")}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Xem chi tiết
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng panel"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {isCreate ? (
            loading ? (
              <p className="text-sm text-slate-500">Đang tải địa điểm…</p>
            ) : loadErr ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
                {loadErr}
              </p>
            ) : (
              <TourForm
                key="create-tour"
                mode="create"
                initialDetail={null}
                locations={locations}
                onSavedToList={() => {
                  onSaved();
                  onClose();
                }}
              />
            )
          ) : loading ? (
            <p className="text-sm text-slate-500">Đang tải…</p>
          ) : loadErr ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
              {loadErr}
            </p>
          ) : !tour ? (
            <p className="text-sm text-slate-500">Không có dữ liệu tour.</p>
          ) : state.mode === "view" ? (
            <DetailView tour={tour} />
          ) : (
            <TourForm
              key={tourId}
              mode="edit"
              tourId={tourId!}
              initialDetail={tour}
              locations={locations}
              onSavedToList={() => {
                onSaved();
                onClose();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
