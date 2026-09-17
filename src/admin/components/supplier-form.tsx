"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import type {
  CreateSupplierInput,
  Supplier,
  SupplierType,
  UpdateSupplierInput,
} from "@/lib/api-types";
import { createSupplier, updateSupplier } from "@/lib/admin-api";
import { errorMessage } from "@/lib/format";

const TYPE_OPTIONS: { value: SupplierType; label: string }[] = [
  { value: "TRANSPORT", label: "Vận chuyển" },
  { value: "HOTEL", label: "Khách sạn" },
  { value: "RESTAURANT", label: "Nhà hàng" },
  { value: "GUIDE", label: "Hướng dẫn viên" },
  { value: "ACTIVITY", label: "Hoạt động / dịch vụ" },
];

function emptyToUndef(s: string): string | undefined {
  const t = s.trim();
  return t === "" ? undefined : t;
}

type Props =
  | { mode: "create"; initial?: null }
  | { mode: "edit"; initial: Supplier };

export function SupplierForm(props: Props) {
  const router = useRouter();
  const isEdit = props.mode === "edit";
  const s = isEdit ? props.initial : null;

  const [name, setName] = useState(s?.name ?? "");
  const [type, setType] = useState<SupplierType>(s?.type ?? "TRANSPORT");
  const [phone, setPhone] = useState(s?.phone ?? "");
  const [email, setEmail] = useState(s?.email ?? "");
  const [address, setAddress] = useState(s?.address ?? "");
  const [website, setWebsite] = useState(s?.website ?? "");
  const [taxCode, setTaxCode] = useState(s?.taxCode ?? "");
  const [notes, setNotes] = useState(s?.notes ?? "");
  const [isActive, setIsActive] = useState(s?.isActive !== false);

  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const nameTrim = name.trim();
    if (!nameTrim) {
      setErr("Nhập tên nhà cung cấp.");
      return;
    }

    setSaving(true);
    try {
      if (isEdit && s) {
        const body: UpdateSupplierInput = {
          name: nameTrim,
          type,
          phone: emptyToUndef(phone),
          email: emptyToUndef(email),
          address: emptyToUndef(address),
          website: emptyToUndef(website),
          taxCode: emptyToUndef(taxCode),
          notes: emptyToUndef(notes),
          isActive,
        };
        const res = await updateSupplier(s.id, body);
        if (!res.ok) {
          setErr(errorMessage(res.body, res.status));
          return;
        }
      } else {
        const body: CreateSupplierInput = {
          name: nameTrim,
          type,
          phone: emptyToUndef(phone),
          email: emptyToUndef(email),
          address: emptyToUndef(address),
          website: emptyToUndef(website),
          taxCode: emptyToUndef(taxCode),
          notes: emptyToUndef(notes),
          isActive,
        };
        const res = await createSupplier(body);
        if (!res.ok) {
          setErr(errorMessage(res.body, res.status));
          return;
        }
      }
      router.push("/suppliers");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20";

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto max-w-3xl space-y-5 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm ring-1 ring-slate-900/[0.04]"
    >
      <div>
        <Link
          href="/suppliers"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-sky-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách
        </Link>
      </div>

      {err ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {err}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700">
            Tên <span className="text-red-500">*</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            required
            autoComplete="organization"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Loại <span className="text-red-500">*</span>
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as SupplierType)}
            className={inputClass}
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end pb-1">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-slate-300"
            />
            Đang hoạt động
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Điện thoại
          </label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
            inputMode="tel"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            autoComplete="email"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700">
            Địa chỉ
          </label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Website
          </label>
          <input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className={inputClass}
            placeholder="https://…"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Mã số thuế
          </label>
          <input
            value={taxCode}
            onChange={(e) => setTaxCode(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700">
            Ghi chú
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-4">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-md transition hover:from-sky-500 hover:to-indigo-500 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saving ? "Đang lưu…" : isEdit ? "Cập nhật" : "Tạo mới"}
        </button>
        <Link
          href="/suppliers"
          className="inline-flex items-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Hủy
        </Link>
      </div>
    </form>
  );
}
