"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AdminHeader } from "@/components/admin-header";
import { SupplierForm } from "@/components/supplier-form";
import type { Supplier } from "@/lib/api-types";
import { fetchSupplierById } from "@/lib/admin-api";
import { errorMessage } from "@/lib/format";

export default function AdminEditSupplierPage() {
  const params = useParams();
  const rawId = params?.id;
  const id = useMemo(() => {
    if (typeof rawId === "string") return Number(rawId);
    if (Array.isArray(rawId)) return Number(rawId[0]);
    return NaN;
  }, [rawId]);

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!Number.isFinite(id) || id < 1) {
      setErr("Mã nhà cung cấp không hợp lệ.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setErr(null);
      setLoading(true);
      const res = await fetchSupplierById(id);
      if (cancelled) return;
      if (!res.ok) setErr(errorMessage(res.body, res.status));
      else setSupplier(res.data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <>
      <AdminHeader
        title="Sửa nhà cung cấp"
        subtitle={supplier?.name ?? (loading ? "Đang tải…" : "")}
      />
      <main className="flex-1 overflow-auto p-5 sm:p-6">
        {err && !supplier ? (
          <div className="mx-auto max-w-3xl rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {err}
          </div>
        ) : null}
        {supplier ? <SupplierForm mode="edit" initial={supplier} /> : null}
        {loading && !supplier ? (
          <p className="py-12 text-center text-slate-500">Đang tải…</p>
        ) : null}
      </main>
    </>
  );
}
