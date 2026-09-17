"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Download,
  Eye,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { TourTagRow } from "@/lib/api-types";
import {
  createTourTag,
  deleteTourTag,
  fetchTourTags,
  updateTourTag,
} from "@/lib/admin-api";
import { AdminPagination } from "@/components/admin-pagination";
import { errorMessage } from "@/lib/format";

const ORANGE = "#ff6600";

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-[#ff6600] focus:outline-none focus:ring-2 focus:ring-[#ff6600]/25";

function exportTagsToCsv(tags: TourTagRow[]) {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const lines = [
    ["Tên danh mục", "Mô tả", "Số tour đang hoạt động"].join(","),
    ...tags.map((r) =>
      [
        esc(r.name),
        esc((r.description ?? "").replace(/\r?\n/g, " ")),
        String(r.tourCount ?? ""),
      ].join(","),
    ),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `danh-muc-tour-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function CatalogTourTagsPanel() {
  const [rows, setRows] = useState<TourTagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tagErr, setTagErr] = useState<string | null>(null);
  const [qInput, setQInput] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  const [tagPage, setTagPage] = useState(1);
  const [tagPageSize, setTagPageSize] = useState(5);

  const [viewRow, setViewRow] = useState<TourTagRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editId, setEditId] = useState<number | null>(null);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(qInput.trim()), 320);
    return () => clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    setTagPage(1);
  }, [debouncedQ]);

  const loadTags = useCallback(async () => {
    setTagErr(null);
    setLoading(true);
    const res = await fetchTourTags(debouncedQ ? { q: debouncedQ } : {});
    if (!res.ok) setTagErr(errorMessage(res.body, res.status));
    else setRows(res.data);
    setLoading(false);
  }, [debouncedQ]);

  useEffect(() => {
    void loadTags();
  }, [loadTags]);

  useEffect(() => {
    const maxP = Math.max(1, Math.ceil(rows.length / tagPageSize));
    if (tagPage > maxP) setTagPage(maxP);
  }, [rows.length, tagPageSize, tagPage]);

  const tagTotalPages = Math.max(1, Math.ceil(rows.length / tagPageSize));
  const safeTagPage = Math.min(tagPage, tagTotalPages);
  const paginatedRows = rows.slice(
    (safeTagPage - 1) * tagPageSize,
    safeTagPage * tagPageSize,
  );

  function openAdd() {
    setFormMode("add");
    setEditId(null);
    setFormName("");
    setFormDesc("");
    setFormOpen(true);
    setTagErr(null);
  }

  function openEdit(row: TourTagRow) {
    setFormMode("edit");
    setEditId(row.id);
    setFormName(row.name);
    setFormDesc(row.description ?? "");
    setFormOpen(true);
    setTagErr(null);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    const name = formName.trim();
    if (!name) {
      setTagErr("Nhập tên danh mục.");
      return;
    }
    const descTrim = formDesc.trim();
    const description = descTrim === "" ? null : descTrim;

    setSaving(true);
    setTagErr(null);
    try {
      if (formMode === "add") {
        const res = await createTourTag({ name, description });
        if (!res.ok) {
          setTagErr(errorMessage(res.body, res.status));
          return;
        }
      } else if (editId != null) {
        const res = await updateTourTag(editId, {
          name,
          description,
        });
        if (!res.ok) {
          setTagErr(errorMessage(res.body, res.status));
          return;
        }
      }
      setFormOpen(false);
      await loadTags();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row: TourTagRow) {
    if (
      !window.confirm(
        `Xóa danh mục "${row.name}"? Các tour đang gắn sẽ bỏ liên kết với danh mục này.`,
      )
    ) {
      return;
    }
    setDeletingId(row.id);
    setTagErr(null);
    const res = await deleteTourTag(row.id);
    setDeletingId(null);
    if (!res.ok) {
      setTagErr(errorMessage(res.body, res.status));
      return;
    }
    await loadTags();
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
        {/* Thanh công cụ */}
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative min-w-0 flex-1 max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder="Tìm kiếm danh mục…"
                className="h-11 w-full rounded-full border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-[#ff6600] focus:outline-none focus:ring-2 focus:ring-[#ff6600]/25"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <button
                type="button"
                onClick={() => exportTagsToCsv(rows)}
                disabled={rows.length === 0}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-4 w-4 text-slate-500" />
                Xuất file
              </button>
              <button
                type="button"
                onClick={openAdd}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-[#ff6600] px-5 text-sm font-semibold text-white shadow-md transition hover:bg-[#e65c00]"
              >
                <Plus className="h-4 w-4" />
                Thêm danh mục
              </button>
            </div>
          </div>
        </div>

        {tagErr ? (
          <div className="mx-5 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {tagErr}
          </div>
        ) : null}

        {loading ? (
          <p className="py-16 text-center text-slate-500">Đang tải…</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/95">
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Tên danh mục
                    </th>
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Mô tả
                    </th>
                    <th className="w-44 px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-5 py-14 text-center text-slate-500"
                      >
                        {debouncedQ
                          ? "Không có danh mục khớp tìm kiếm."
                          : "Chưa có danh mục. Nhấn Thêm danh mục để tạo."}
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row) => {
                      const initial = row.name.trim().charAt(0).toUpperCase() || "?";
                      return (
                        <tr
                          key={row.id}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <span
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white shadow-sm"
                                style={{ backgroundColor: ORANGE }}
                              >
                                {initial}
                              </span>
                              <span className="font-medium text-slate-900">
                                {row.name}
                              </span>
                            </div>
                          </td>
                          <td className="max-w-md px-5 py-3.5 text-slate-600">
                            <span className="line-clamp-2 whitespace-pre-wrap">
                              {row.description?.trim() || "—"}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex flex-wrap items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => setViewRow(row)}
                                className="inline-flex rounded-lg p-2 text-sky-600 transition hover:bg-sky-50"
                                aria-label="Xem"
                                title="Xem"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openEdit(row)}
                                className="inline-flex rounded-lg p-2 text-[#ff6600] transition hover:bg-orange-50"
                                aria-label="Sửa"
                                title="Sửa"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                disabled={deletingId === row.id}
                                onClick={() => handleDelete(row)}
                                className="inline-flex rounded-lg p-2 text-[#ff6600] transition hover:bg-orange-50 disabled:opacity-50"
                                aria-label="Xóa"
                                title="Xóa"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {rows.length > 0 ? (
              <AdminPagination
                page={safeTagPage}
                pageSize={tagPageSize}
                total={rows.length}
                itemsLabel="danh mục"
                pageSizeOptions={[5, 9, 10, 15, 20]}
                onPageChange={setTagPage}
                onPageSizeChange={(n) => {
                  setTagPageSize(n);
                  setTagPage(1);
                }}
              />
            ) : null}
          </>
        )}
      </section>

      {viewRow ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="view-tag-title"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <h2
                id="view-tag-title"
                className="text-lg font-semibold text-slate-900"
              >
                Chi tiết danh mục
              </h2>
              <button
                type="button"
                onClick={() => setViewRow(null)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="font-medium text-slate-500">Tên</dt>
                <dd className="mt-0.5 text-slate-900">{viewRow.name}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Mô tả</dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-slate-800">
                  {viewRow.description?.trim() || "—"}
                </dd>
              </div>
              {viewRow.tourCount != null ? (
                <div>
                  <dt className="font-medium text-slate-500">
                    Số tour đang hoạt động
                  </dt>
                  <dd className="mt-0.5 tabular-nums text-slate-900">
                    {viewRow.tourCount}
                  </dd>
                </div>
              ) : null}
            </dl>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setViewRow(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  const r = viewRow;
                  setViewRow(null);
                  openEdit(r);
                }}
                className="rounded-lg bg-[#ff6600] px-4 py-2 text-sm font-medium text-white hover:bg-[#e65c00]"
              >
                Sửa
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {formOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="form-tag-title"
        >
          <form
            onSubmit={submitForm}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <h2
                id="form-tag-title"
                className="text-lg font-semibold text-slate-900"
              >
                {formMode === "add" ? "Thêm danh mục" : "Sửa danh mục"}
              </h2>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {tagErr ? (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {tagErr}
              </div>
            ) : null}
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Tên danh mục <span className="text-red-500">*</span>
                </label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className={inputClass}
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Mô tả
                </label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={4}
                  className={inputClass}
                  placeholder="Tùy chọn — giới thiệu ngắn về nhóm tour này."
                />
              </div>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-[#ff6600] px-4 py-2 text-sm font-medium text-white hover:bg-[#e65c00] disabled:opacity-60"
              >
                {saving ? "Đang lưu…" : formMode === "add" ? "Tạo" : "Lưu"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
