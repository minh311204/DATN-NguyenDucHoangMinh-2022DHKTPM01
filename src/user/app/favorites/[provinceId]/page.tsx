import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Clock3, Plane, Ticket } from "lucide-react";
import type { TourListItem } from "@/lib/api-types";
import { errorMessage, formatVnd } from "@/lib/format";
import {
  fetchLocations,
  fetchProvinces,
  fetchTours,
  unwrapTourListResponse,
} from "@/lib/server-api";
import { FilterSidebar } from "@/components/filter-sidebar";
import { FavoritesToolbar } from "@/components/favorites-toolbar";
import type { ToolbarSortKey } from "@/components/favorites-toolbar";
import { TourScheduleStrip } from "@/components/tour-schedule-strip";

type Props = {
  params: Promise<{ provinceId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type SortKey = ToolbarSortKey;

function budgetMatch(price: number | null | undefined, budget: string): boolean {
  if (!budget) return true;
  if (price == null || !Number.isFinite(price)) return false;
  if (budget === "under_5m") return price < 5_000_000;
  if (budget === "5_10m") return price >= 5_000_000 && price <= 10_000_000;
  if (budget === "10_20m") return price > 10_000_000 && price <= 20_000_000;
  if (budget === "over_20m") return price > 20_000_000;
  return true;
}

function parseSearch(sp: Record<string, string | string[] | undefined>) {
  const get = (k: string) => {
    const v = sp[k];
    if (Array.isArray(v)) return v[0] ?? "";
    return v ?? "";
  };
  const sort = get("sortBy");
  const sortBy: SortKey =
    sort === "price_asc" ||
    sort === "price_desc" ||
    sort === "newest" ||
    sort === "nearest" ||
    sort === "all"
      ? sort
      : "all";
  return {
    budget: get("budget"),
    departureLocationId: get("departureLocationId"),
    departureDate: get("departureDate"),
    tourLine: get("tourLine"),
    transportType: get("transportType"),
    q: get("q").trim(),
    sortBy,
  };
}

function provinceDescription(name: string): string {
  const n = (name || "").toUpperCase();
  if (n.includes("HÀ NỘI")) {
    return `Khám phá vẻ đẹp Thủ đô ngàn năm văn hiến qua hành trình tour ${name} tham quan Hồ Gươm, Cầu Thê Húc, Lăng Bác, Hoàng thành Thăng Long, và 36 phố phường đặc sắc. Trải nghiệm tour du lịch ${name} cảm nhận sắc thái riêng bốn mùa đầy hoài niệm, thưởng thức hương vị Phở, Chả cá Lã Vọng, bánh tôm Hồ Tây.\nĐăng ký tour ${name} cùng chúng tôi, Quý khách có thể đến khám phá các điểm đến nổi bật sau: Hồ Hoàn Kiếm, Đền Ngọc Sơn, 36 Phố Cổ, Chợ Đồng Xuân, Văn Miếu, Chùa Trần Quốc,... Để hiểu hơn về ${name}, mời Quý khách Kinh nghiệm du lịch ${name}.`;
  }
  if (n.includes("QUẢNG NINH")) {
    return "Nơi đây nổi tiếng với Vịnh Hạ Long, Yên Tử và nhiều điểm tham quan biển đảo đặc sắc. Khám phá các chương trình tour nổi bật để trải nghiệm trọn vẹn Quảng Ninh.";
  }
  return `Khám phá các điểm đến nổi bật tại ${name} với nhiều chương trình tour phù hợp theo ngân sách, thời gian và nhu cầu trải nghiệm của bạn.`;
}

function sortTours(items: TourListItem[], sortBy: SortKey): TourListItem[] {
  const tours = [...items];
  if (sortBy === "price_asc") {
    tours.sort((a, b) => (a.basePrice ?? Number.MAX_SAFE_INTEGER) - (b.basePrice ?? Number.MAX_SAFE_INTEGER));
    return tours;
  }
  if (sortBy === "price_desc") {
    tours.sort((a, b) => (b.basePrice ?? 0) - (a.basePrice ?? 0));
    return tours;
  }
  if (sortBy === "newest") {
    tours.sort((a, b) => b.id - a.id);
    return tours;
  }
  // all | nearest: ổn định theo id
  tours.sort((a, b) => a.id - b.id);
  return tours;
}

function transportLabel(v?: string | null): string {
  if (!v) return "Đang cập nhật";
  if (v === "PLANE" || v === "FLIGHT") return "Máy bay";
  if (v === "BUS" || v === "CAR") return "Xe";
  if (v === "MIXED") return "Kết hợp";
  return v;
}

export default async function FavoritesProvincePage({ params, searchParams }: Props) {
  const { provinceId } = await params;
  const sp = await searchParams;
  const id = Number(provinceId);
  if (!Number.isFinite(id)) notFound();

  const selected = parseSearch(sp);

  const [locationsRes, provincesRes] = await Promise.all([
    fetchLocations({ next: { revalidate: 300 } }),
    fetchProvinces({ next: { revalidate: 300 } }),
  ]);

  const allProvinces = provincesRes.ok ? provincesRes.data : [];
  const provinceName = allProvinces.find((p) => p.id === id)?.name ?? null;
  const allLocations = locationsRes.ok ? locationsRes.data : [];
  const locationRows = allLocations.filter((l) => l.provinceId === id && l.isActive !== false);
  const locationIds = locationRows.map((l) => l.id);

  if (locationIds.length === 0) {
    return (
      <div className="mx-auto max-w-[1180px] px-4 py-12 sm:px-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm hover:bg-stone-50">
            Quay lại
          </Link>
          <h1 className="text-lg font-semibold">{provinceName ?? `Tỉnh #${id}`}</h1>
        </div>
        <p className="mt-6 text-sm text-stone-600">Không có điểm đến (location) nào cho tỉnh này.</p>
      </div>
    );
  }

  const jobs = locationIds.map((locationId) =>
    fetchTours({ isActive: "true", destinationLocationId: String(locationId) }, { next: { revalidate: 60 } }),
  );
  const settled = await Promise.allSettled(jobs);
  const uniq = new Map<number, TourListItem>();
  const errors: string[] = [];

  for (const s of settled) {
    if (s.status === "fulfilled") {
      if (s.value.ok) {
        unwrapTourListResponse(s.value.data).tours.forEach((t) =>
          uniq.set(t.id, t),
        );
      }
      else errors.push(errorMessage(s.value.body));
    } else {
      errors.push(String(s.reason ?? "Lỗi khi gọi API"));
    }
  }

  const allTours = Array.from(uniq.values());
  const filtered = allTours.filter((t) => {
    if (selected.departureLocationId && String(t.departureLocationId) !== selected.departureLocationId) return false;
    if (!budgetMatch(t.basePrice ?? null, selected.budget)) return false;
    if (selected.tourLine && (t.tourLine ?? "") !== selected.tourLine) return false;
    if (selected.transportType && (t.transportType ?? "") !== selected.transportType) return false;
    if (selected.q) {
      const q = selected.q.toLowerCase();
      const inName = t.name.toLowerCase().includes(q);
      const inDesc = (t.description ?? "").toLowerCase().includes(q);
      if (!inName && !inDesc) return false;
    }
    return true;
  });
  const tours = sortTours(filtered, selected.sortBy);
  const provinceLabel = provinceName ?? `Tỉnh #${id}`;

  const departureLocations = allLocations
    .filter((l) => l.isActive !== false && l.name)
    .map((l) => ({ id: l.id, name: l.name! }));

  const provinceOptions = allProvinces
    .filter((p) => (p.name ?? "").trim().length > 0)
    .map((p) => ({ id: p.id, name: p.name! }));

  return (
    <main className="bg-[#efefef] py-8">
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
        <section className="bg-transparent px-2 py-4">
          <h1 className="text-center text-3xl font-extrabold uppercase tracking-wide text-[#0b5ea8] sm:text-4xl">
            Du lịch {provinceLabel}
          </h1>
          <p className="mx-auto mt-4 max-w-5xl whitespace-pre-line text-left text-[14px] leading-7 text-stone-700">
            {provinceDescription(provinceLabel)}
          </p>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <FavoritesToolbar provinceId={id} tourCount={tours.length} sortBy={selected.sortBy} />

          <FilterSidebar
            provinceId={id}
            provinces={provinceOptions}
            departureLocations={departureLocations}
            initial={{
              budget: selected.budget,
              departureLocationId: selected.departureLocationId,
              departureDate: selected.departureDate,
              tourLine: selected.tourLine,
              transportType: selected.transportType,
            }}
          />

          <div>
            {errors.length ? (
              <p className="mt-3 text-sm text-amber-700">{errors[0]}</p>
            ) : null}

            {tours.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-stone-300 bg-white p-8 text-sm text-stone-600">
                Không có tour phù hợp với bộ lọc hiện tại.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {tours.map((t) => (
                  <article
                    key={t.id}
                    className="grid gap-0 overflow-hidden border border-[#d9d9d9] bg-white sm:grid-cols-[300px_minmax(0,1fr)]"
                  >
                    <div className="relative h-[210px] bg-stone-100 sm:h-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={t.thumbnailUrl || "/assets/images/default-tour.jpg"}
                        alt={t.name}
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute bottom-2 left-2 inline-flex items-center rounded bg-[#ef2f88] px-2 py-1 text-xs font-bold text-white">
                        Tiết kiệm
                      </span>
                    </div>
                    <div className="flex flex-col p-4">
                      <h3 className="line-clamp-2 text-base font-bold leading-snug text-[#1c1c1c] sm:text-lg">
                        {t.name}
                      </h3>
                      <div className="mt-2 grid gap-x-4 gap-y-1.5 text-[13px] text-stone-700 sm:grid-cols-2">
                        <p className="inline-flex items-center gap-1.5">
                          <Ticket className="h-3.5 w-3.5 text-stone-400" />
                          Mã tour: <strong>NDSGN{t.id}</strong>
                        </p>
                        <p className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5 text-stone-400" />
                          Khởi hành:{" "}
                          <strong className="text-[#0b5ea8]">{t.departureLocation?.name ?? "Đang cập nhật"}</strong>
                        </p>
                        <p className="inline-flex items-center gap-1.5">
                          <Clock3 className="h-3.5 w-3.5 text-stone-400" />
                          Thời gian:{" "}
                          <strong>
                            {t.durationDays ? `${t.durationDays}N${Math.max(t.durationDays - 1, 0)}Đ` : "Đang cập nhật"}
                          </strong>
                        </p>
                        <p className="inline-flex items-center gap-1.5">
                          <Plane className="h-3.5 w-3.5 text-stone-400" />
                          Phương tiện: <strong>{transportLabel(t.transportType)}</strong>
                        </p>
                      </div>

                      <div className="mt-3 min-w-0 text-[13px] text-stone-700">
                        <TourScheduleStrip
                          schedules={t.schedules ?? []}
                          tourId={String(t.id)}
                        />
                      </div>

                      <div className="mt-3 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-xs text-stone-500">Giá từ:</p>
                          <p className="text-2xl font-extrabold leading-none text-[#d61f1f] sm:text-3xl">
                            {formatVnd(t.basePrice ?? 0)}
                          </p>
                        </div>
                        <Link
                          href={`/tours/${t.id}`}
                          className="inline-flex shrink-0 items-center rounded border border-[#0b5ea8] px-4 py-1.5 text-sm font-semibold text-[#0b5ea8] hover:bg-[#0b5ea8] hover:text-white transition-colors"
                        >
                          Xem chi tiết
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
