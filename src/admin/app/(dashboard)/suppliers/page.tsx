"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminHeader } from "@/components/admin-header";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { Supplier } from "@/lib/api-types";
import {
  deleteSupplier,
  fetchSuppliers,
  unwrapSupplierList,
} from "@/lib/admin-api";
import { AdminPagination } from "@/components/admin-pagination";
import { errorMessage } from "@/lib/format";

export default function AdminSuppliersPage() {
  const [rows, setRows] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    const res = await fetchSuppliers({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (res.ok) {
      const { items, total: t } = unwrapSupplierList(res.data);
      setRows(items);
      setTotal(t);
    } else setErr(errorMessage(res.body, res.status));
    setLoading(false);
  }, [page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDelete(id: number, name: string) {
    if (
      !window.confirm(
        `Xóa nhà cung cấp "${name}"? Chỉ thực hiện được khi không còn tour gắn đối tác này.`,
      )
    ) {
      return;
    }
    setDeletingId(id);
    setErr(null);
    const res = await deleteSupplier(id);
    setDeletingId(null);
    if (!res.ok) {
      setErr(errorMessage(res.body, res.status));
      return;
    }
    await load();
  }

  return (
    <>
      <AdminHeader title="Quản lý cung cấp" />
      <main className="flex-1 space-y-4 overflow-auto p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
          </p>
          <Link
            href="/suppliers/new"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-md transition hover:from-sky-500 hover:to-indigo-500"
          >
            <Plus className="h-4 w-4" />
            Thêm mới
          </Link>
        </div>
        {err ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {err}
          </div>
        ) : null}
        {loading ? (
          <p className="py-12 text-center text-slate-500">Đang tải…</p>
        ) : rows.length === 0 && !err ? (
          <p className="py-12 text-center text-slate-500">Chưa có nhà cung cấp.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/90 text-slate-600">
                  <th className="px-4 py-3 font-medium">Tên</th>
                  <th className="px-4 py-3 font-medium">Loại</th>
                  <th className="px-4 py-3 font-medium">Điện thoại</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Trạng thái</th>
                  <th className="px-4 py-3 text-right font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {s.name}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{s.type}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {s.phone ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {s.email ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          s.isActive ? "text-emerald-700" : "text-slate-500"
                        }
                      >
                        {s.isActive ? "Hoạt động" : "Tắt"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/suppliers/${s.id}/edit`}
                          className="inline-flex rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-sky-600"
                          aria-label="Sửa"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          disabled={deletingId === s.id}
                          onClick={() => handleDelete(s.id, s.name)}
                          className="inline-flex rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-red-600 disabled:opacity-50"
                          aria-label="Xóa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <AdminPagination
              page={page}
              pageSize={pageSize}
              total={total}
              itemsLabel="nhà cung cấp"
              pageSizeOptions={[6, 9, 12, 15, 18, 24]}
              onPageChange={setPage}
              onPageSizeChange={(n) => {
                setPageSize(n);
                setPage(1);
              }}
            />
          </div>
        )}
      </main>
    </>
  );
}
