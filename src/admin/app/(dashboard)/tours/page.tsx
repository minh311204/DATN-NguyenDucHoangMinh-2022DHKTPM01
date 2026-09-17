"use client";

import Link from "next/link";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { AdminHeader } from "@/components/admin-header";
import {
  Download,
  Eye,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import type { TourListItem } from "@/lib/api-types";
import {
  deleteTour,
  fetchLocations,
  fetchTourTags,
  fetchTours,
  unwrapTourList,
  updateTour,
} from "@/lib/admin-api";
import { AdminPagination } from "@/components/admin-pagination";
import {
  TourManageDrawer,
  type TourManageDrawerState,
} from "@/components/tour-manage-drawer";
import {
  errorMessage,
  formatVnd,
  labelTourLine,
  TOUR_LINE_VALUES,
} from "@/lib/format";
import { TourImage } from "@/components/tour-image";

function isTourLineParam(v: string): v is (typeof TOUR_LINE_VALUES)[number] {
  return (TOUR_LINE_VALUES as readonly string[]).includes(v);
}

function exportToursToCsv(rows: TourListItem[]) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const header = ["ID", "Tên tour", "Mô tả", "Giá (VND)", "Hiển thị"];
  const lines = rows.map((r) =>
    [
      String(r.id),
      r.name ?? "",
      (r.description ?? "").replace(/\r?\n/g, " "),
      r.basePrice != null ? String(Math.round(Number(r.basePrice))) : "",
      r.isActive ? "Có" : "Không",
    ]
      .map(esc)
      .join(","),
  );
  const csv = `\uFEFF${[header.map(esc).join(","), ...lines].join("\r\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tour-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function AdminToursPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const q = searchParams.get("q")?.trim() || undefined;
  const departureLocationId =
    searchParams.get("departureLocationId")?.trim() || undefined;
  const destinationLocationId =
    searchParams.get("destinationLocationId")?.trim() || undefined;
  const tourLineRaw = searchParams.get("tourLine")?.trim() || undefined;
  const tourLine =
    tourLineRaw && isTourLineParam(tourLineRaw) ? tourLineRaw : undefined;
  const tagIdRaw = searchParams.get("tagId")?.trim() || undefined;
  const tagId =
    tagIdRaw && /^\d+$/.test(tagIdRaw) ? tagIdRaw : undefined;

  const [locById, setLocById] = useState<Record<string, string>>({});
  const [tagNameById, setTagNameById] = useState<Record<string, string>>({});
  const [rows, setRows] = useState<TourListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  /** Tab hiển thị: tour đang mở (isActive) hay tour đang ẩn */
  const [visibilityTab, setVisibilityTab] = useState<"shown" | "hidden">(
    "shown",
  );
  const [searchDraft, setSearchDraft] = useState(q ?? "");
  const [drawer, setDrawer] = useState<TourManageDrawerState>(null);

  useEffect(() => {
    setSearchDraft(q ?? "");
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetchLocations();
      if (cancelled || !res.ok) return;
      const m: Record<string, string> = {};
      for (const l of res.data) {
        if (l.isActive === false) continue;
        m[String(l.id)] = l.name?.trim() || `Điểm #${l.id}`;
      }
      setLocById(m);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetchTourTags({});
      if (cancelled || !res.ok) return;
      const m: Record<string, string> = {};
      for (const t of res.data) {
        m[String(t.id)] = t.name;
      }
      setTagNameById(m);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [q, departureLocationId, destinationLocationId, tourLine, tagId, visibilityTab]);

  const loadTours = useCallback(async () => {
    setErr(null);
    setLoading(true);
    const isActiveParam =
      visibilityTab === "shown" ? "true" : "false";
    const res = await fetchTours({
      isActive: isActiveParam,
      page: String(page),
      pageSize: String(pageSize),
      ...(q ? { q } : {}),
      ...(departureLocationId
        ? { departureLocationId }
        : {}),
      ...(destinationLocationId
        ? { destinationLocationId }
        : {}),
      ...(tourLine ? { tourLine } : {}),
      ...(tagId ? { tagId } : {}),
    });
    if (res.ok) {
      const { items, total: t } = unwrapTourList(res.data);
      setRows(items);
      setTotal(t);
    } else setErr(errorMessage(res.body, res.status));
    setLoading(false);
  }, [
    page,
    pageSize,
    q,
    departureLocationId,
    destinationLocationId,
    tourLine,
    tagId,
    visibilityTab,
  ]);

  useEffect(() => {
    void loadTours();
  }, [loadTours]);

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    const p = new URLSearchParams(searchParams.toString());
    const t = searchDraft.trim();
    if (t) p.set("q", t);
    else p.delete("q");
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
    setPage(1);
  }

  async function handleDelete(id: number, name: string) {
    if (
      !window.confirm(
        `Xóa tour "${name}"? Hành động này không thể hoàn tác.`,
      )
    ) {
      return;
    }
    setDeletingId(id);
    setErr(null);
    const res = await deleteTour(id);
    setDeletingId(null);
    if (!res.ok) {
      setErr(errorMessage(res.body, res.status));
      return;
    }
    await loadTours();
  }

  async function handleToggleActive(row: TourListItem) {
    const currentlyShown = row.isActive !== false;
    const next = !currentlyShown;
    setTogglingId(row.id);
    setErr(null);
    const res = await updateTour(row.id, { isActive: next });
    setTogglingId(null);
    if (!res.ok) {
      setErr(errorMessage(res.body, res.status));
      return;
    }
    await loadTours();
  }

  const hasActiveFilters = Boolean(
    q || departureLocationId || destinationLocationId || tourLine || tagId,
  );

  const depLabel = departureLocationId
    ? locById[departureLocationId] ?? `ID ${departureLocationId}`
    : null;
  const destLabel = destinationLocationId
    ? locById[destinationLocationId] ?? `ID ${destinationLocationId}`
    : null;
  const tagFilterLabel = tagId
    ? tagNameById[tagId] ?? `ID ${tagId}`
    : null;

  const tabBtn =
    "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition";
  const tabBtnActive =
    "bg-emerald-500 text-white shadow-sm hover:bg-emerald-600";
  const tabBtnIdle =
    "bg-slate-100 text-slate-600 hover:bg-slate-200";

  return (
    <>
      <AdminHeader title="Quản lý tour" />
      <TourManageDrawer
        state={drawer}
        onClose={() => setDrawer(null)}
        onSaved={() => void loadTours()}
        onChangeMode={(mode) =>
          setDrawer((d) => (d && "tourId" in d ? { ...d, mode } : d))
        }
      />
      <main className="flex-1 space-y-4 overflow-auto p-5 sm:p-6">
        {hasActiveFilters ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600">
            <span className="text-slate-500">Đang lọc:</span>
            {q ? (
              <span className="inline-flex max-w-full items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                Từ khóa: &quot;{q}&quot;
              </span>
            ) : null}
            {departureLocationId ? (
              <span className="inline-flex max-w-[14rem] items-center truncate rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-900">
                Đi: {depLabel}
              </span>
            ) : null}
            {destinationLocationId ? (
              <span className="inline-flex max-w-[14rem] items-center truncate rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-900">
                Đến: {destLabel}
              </span>
            ) : null}
            {tourLine ? (
              <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                Dòng: {labelTourLine(tourLine)}
              </span>
            ) : null}
            {tagId ? (
              <span className="inline-flex max-w-[14rem] items-center truncate rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-900">
                Nhãn: {tagFilterLabel}
              </span>
            ) : null}
            <Link
              href="/tours"
              className="ml-1 font-medium text-sky-600 hover:underline"
            >
              Xóa lọc
            </Link>
          </div>
        ) : null}

        {err ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {err}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
            <form
              onSubmit={applySearch}
              className="flex min-w-0 flex-1 items-center gap-2"
            >
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden
                />
                <input
                  type="search"
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  placeholder="Tìm kiếm tour…"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/80 py-2 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#ff6600] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ff6600]/25"
                  autoComplete="off"
                />
              </div>
              <button
                type="submit"
                className="hidden shrink-0 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 sm:inline"
              >
                Tìm
              </button>
            </form>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <span className="shrink-0 text-sm font-medium text-slate-600">
                Trạng thái:
              </span>
              <div className="flex rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setVisibilityTab("shown");
                    setPage(1);
                  }}
                  className={`${tabBtn} flex-1 sm:flex-none ${
                    visibilityTab === "shown" ? tabBtnActive : tabBtnIdle
                  }`}
                >
                  Tour hiển thị
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVisibilityTab("hidden");
                    setPage(1);
                  }}
                  className={`${tabBtn} flex-1 sm:flex-none ${
                    visibilityTab === "hidden" ? tabBtnActive : tabBtnIdle
                  }`}
                >
                  Tour không hiển thị
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
              <button
                type="button"
                disabled={rows.length === 0}
                onClick={() => exportToursToCsv(rows)}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Xuất thành Excel
              </button>
              <button
                type="button"
                onClick={() => setDrawer({ mode: "create" })}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#ff6600] px-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e65c00]"
              >
                <Plus className="h-4 w-4" />
                Thêm tour
              </button>
            </div>
          </div>

          {loading ? (
            <p className="py-16 text-center text-sm text-slate-500">
              Đang tải…
            </p>
          ) : rows.length === 0 && !err ? (
            <p className="py-16 text-center text-sm text-slate-500">
              {q
                ? "Không có tour khớp từ khóa."
                : hasActiveFilters
                  ? "Không có tour khớp bộ lọc."
                  : visibilityTab === "hidden"
                    ? "Không có tour đang ẩn."
                    : "Chưa có tour."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-5">
                      Tên tour
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-5">
                      Mô tả
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-5">
                      Giá
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-5 whitespace-nowrap">
                      Trạng thái hiển thị
                    </th>
                    <th className="w-px px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-5">
                      Hành động
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const active = row.isActive !== false;
                    return (
                      <tr
                        key={row.id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                      >
                        <td className="px-4 py-3 sm:px-5">
                          <div className="flex items-center gap-3">
                            <TourImage
                              url={row.thumbnailUrl}
                              name={row.name}
                              variant="thumb"
                            />
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900">
                                {row.name}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="max-w-md px-4 py-3 text-slate-600 sm:px-5">
                          <p className="line-clamp-2">
                            {row.description?.trim() || "—"}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-[#ff6600] sm:px-5">
                          {formatVnd(row.basePrice ?? null)}
                        </td>
                        <td className="px-4 py-3 sm:px-5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                active
                                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                                  : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                              }`}
                            >
                              {active ? "Hiển thị" : "Đang ẩn"}
                            </span>
                            <button
                              type="button"
                              disabled={togglingId === row.id}
                              onClick={() => handleToggleActive(row)}
                              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition disabled:opacity-50 ${
                                active
                                  ? "bg-red-500 text-white hover:bg-red-600"
                                  : "bg-emerald-500 text-white hover:bg-emerald-600"
                              }`}
                            >
                              {togglingId === row.id
                                ? "…"
                                : active
                                  ? "Tắt"
                                  : "Bật"}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right sm:px-5">
                          <div className="inline-flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() =>
                                setDrawer({ tourId: row.id, mode: "view" })
                              }
                              className="inline-flex rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                              aria-label="Xem chi tiết"
                              title="Xem chi tiết"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDrawer({ tourId: row.id, mode: "edit" })
                              }
                              className="inline-flex rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-[#ff6600]"
                              aria-label="Sửa"
                              title="Chỉnh sửa"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              disabled={deletingId === row.id}
                              onClick={() => handleDelete(row.id, row.name)}
                              className="inline-flex rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                              aria-label="Xóa"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && rows.length > 0 ? (
            <AdminPagination
              page={page}
              pageSize={pageSize}
              total={total}
              itemsLabel="tour"
              pageSizeOptions={[5, 10, 15, 20, 50]}
              onPageChange={setPage}
              onPageSizeChange={(n) => {
                setPageSize(n);
                setPage(1);
              }}
            />
          ) : null}
        </div>
      </main>
    </>
  );
}

export default function AdminToursPage() {
  return (
    <Suspense
      fallback={
        <>
          <AdminHeader title="Quản lý tour" />
          <main className="flex-1 p-6">
            <p className="text-center text-slate-500">Đang tải…</p>
          </main>
        </>
      }
    >
      <AdminToursPageInner />
    </Suspense>
  );
}
