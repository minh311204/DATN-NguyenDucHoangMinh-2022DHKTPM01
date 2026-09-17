import type { LocationRow } from "@/lib/api-types";

type Initial = {
  departureLocationId?: string;
  destinationLocationId?: string;
  tagId?: string;
  budget?: string;
  departureDate?: string;
  q?: string;
};

type TagOption = { id: number; name: string };

type Props = {
  locations: LocationRow[];
  tags: TagOption[];
  initial: Initial;
};

const budgets = [
  { value: "", label: "Mọi mức" },
  { value: "under_5m", label: "Dưới 5 triệu" },
  { value: "5_10m", label: "5 — 10 triệu" },
  { value: "10_20m", label: "10 — 20 triệu" },
  { value: "over_20m", label: "Trên 20 triệu" },
];

export function ToursFilterForm({ locations, tags, initial }: Props) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <form method="get" className="space-y-4">
        <p className="text-sm font-semibold text-stone-800">Bộ lọc</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-500">
              Điểm khởi hành
            </label>
            <select
              name="departureLocationId"
              defaultValue={initial.departureLocationId ?? ""}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
            >
              <option value="">Tất cả</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name ?? `Location #${l.id}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-500">
              Điểm đến
            </label>
            <select
              name="destinationLocationId"
              defaultValue={initial.destinationLocationId ?? ""}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
            >
              <option value="">Tất cả</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name ?? `Location #${l.id}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-500">
              Danh mục nhãn
            </label>
            <select
              name="tagId"
              defaultValue={initial.tagId ?? ""}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
            >
              <option value="">Tất cả</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-500">
              Ngân sách
            </label>
            <select
              name="budget"
              defaultValue={initial.budget ?? ""}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
            >
              {budgets.map((b) => (
                <option key={b.value || "all"} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-500">
              Ngày khởi hành
            </label>
            <input
              type="date"
              name="departureDate"
              defaultValue={initial.departureDate ?? ""}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <input
            type="search"
            name="q"
            defaultValue={initial.q ?? ""}
            placeholder="Từ khóa tên tour..."
            className="min-w-[200px] flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Áp dụng
          </button>
        </div>
      </form>
    </section>
  );
}
