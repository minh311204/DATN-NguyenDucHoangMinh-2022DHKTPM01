import { AdminHeader } from "@/components/admin-header";
import { CatalogTourTagsPanel } from "@/components/catalog-tour-tags-panel";

export default function AdminCatalogPage() {
  return (
    <>
      <AdminHeader
        title="Quản lý danh mục"
      />
      <main className="flex-1 overflow-auto p-5 sm:p-6">
        <CatalogTourTagsPanel />
      </main>
    </>
  );
}
