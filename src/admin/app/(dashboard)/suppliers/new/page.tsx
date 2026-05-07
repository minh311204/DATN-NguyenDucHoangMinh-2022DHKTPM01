"use client";

import { AdminHeader } from "@/components/admin-header";
import { SupplierForm } from "@/components/supplier-form";

export default function AdminNewSupplierPage() {
  return (
    <>
      <AdminHeader
        title="Thêm nhà cung cấp"
        subtitle="Quản lý cung cấp — tạo đối tác dùng trong tour (vận chuyển, lưu trú, …)."
      />
      <main className="flex-1 overflow-auto p-5 sm:p-6">
        <SupplierForm mode="create" />
      </main>
    </>
  );
}
