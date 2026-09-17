"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { AdminHeader } from "@/components/admin-header";
import type { AdminUser } from "@/lib/api-types";
import { deleteUser, fetchUsers, unwrapUserList } from "@/lib/admin-api";
import { AdminPagination } from "@/components/admin-pagination";
import { errorMessage } from "@/lib/format";

function nameOf(u: AdminUser) {
  const first = u.firstName?.trim() ?? "";
  const last = u.lastName?.trim() ?? "";
  const full = `${first} ${last}`.trim();
  return full || u.email;
}

function statusBadge(status: AdminUser["status"]) {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "INACTIVE":
      return "bg-slate-100 text-slate-700 border-slate-200";
    case "BANNED":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function roleBadge(role: AdminUser["role"]) {
  return role === "ADMIN"
    ? "bg-sky-50 text-sky-700 border-sky-200"
    : "bg-violet-50 text-violet-700 border-violet-200";
}

export default function AdminUsersPage() {
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    const res = await fetchUsers({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (res.ok) {
      const { items, total: t } = unwrapUserList(res.data);
      setRows(items);
      setTotal(t);
    } else setErr(errorMessage(res.body, res.status));
    setLoading(false);
  }, [page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDelete(id: number, email: string) {
    if (!window.confirm(`Xóa người dùng "${email}"? Thao tác này chỉ chuyển INACTIVE.`)) {
      return;
    }
    setDeletingId(id);
    setErr(null);
    const res = await deleteUser(id);
    setDeletingId(null);
    if (!res.ok) {
      setErr(errorMessage(res.body, res.status));
      return;
    }
    await load();
  }

  return (
    <>
      <AdminHeader title="Quản lý người dùng" />
      <main className="flex-1 overflow-auto p-5 sm:p-6">
        {err ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {err}
          </div>
        ) : null}

        {loading ? (
          <p className="py-12 text-center text-slate-500">Đang tải…</p>
        ) : rows.length === 0 ? (
          <p className="py-12 text-center text-slate-500">Chưa có user.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Tên</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Trạng thái</th>
                  <th className="px-4 py-3 font-medium text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">
                      {u.email}
                    </td>
                    <td className="px-4 py-3 text-slate-800">
                      {nameOf(u)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${roleBadge(
                          u.role,
                        )}`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadge(
                          u.status,
                        )}`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/users/${u.id}/edit`}
                          className="inline-flex rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-sky-600"
                          aria-label="Sửa"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          disabled={deletingId === u.id}
                          onClick={() => handleDelete(u.id, u.email)}
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
              itemsLabel="user"
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

