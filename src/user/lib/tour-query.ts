const BUDGETS = new Set(["under_5m", "5_10m", "10_20m", "over_20m"]);

const TOUR_LINES = new Set(["PREMIUM", "STANDARD", "ECONOMY", "GOOD_VALUE"]);

const TRANSPORT_TYPES = new Set(["BUS", "FLIGHT", "MIXED"]);

/** Khớp nhãn «Dòng tour» ↔ TourTag tên tiếng Việt (footer / bộ lọc danh mục). */
const TOUR_LINE_TO_TAG_LABEL: Record<string, string> = {
  PREMIUM: "Cao cấp",
  STANDARD: "Tiêu chuẩn",
  ECONOMY: "Tiết kiệm",
  GOOD_VALUE: "Giá tốt",
};

/** Query cố định cho «Tour nổi bật» — trang chủ & /tours?featured=true phải trùng để cùng thứ tự & dữ liệu */
export const FEATURED_TOURS_QUERY: Record<string, string> = {
  isActive: "true",
  featured: "true",
};

/**
 * Khi URL có `tourLine` (vd. link footer) nhưng chưa có `tagId` — chọn option Danh mục nhãn tương ứng.
 */
export function inferCatalogTagIdFromTourLine(
  tourLine: string | undefined,
  tags: { id: number; name: string }[],
): string | undefined {
  if (!tourLine || !TOUR_LINES.has(tourLine)) return undefined;
  const label = TOUR_LINE_TO_TAG_LABEL[tourLine];
  if (!label) return undefined;
  const tag = tags.find((t) => t.name.trim() === label);
  return tag != null ? String(tag.id) : undefined;
}

/** Map searchParams (URL) → query cho GET /tours (khớp TourListQuerySchema backend). */
export function parseTourListQuery(
  sp: Record<string, string | string[] | undefined>,
) {
  const get = (k: string) => {
    const v = sp[k];
    if (Array.isArray(v)) return v[0];
    return v;
  };

  const q: Record<string, string> = { isActive: "true" };

  const dest = get("destinationLocationId");
  const destNum = Number(dest);
  if (dest && Number.isInteger(destNum) && destNum > 0) q.destinationLocationId = String(destNum);

  const dep = get("departureLocationId");
  const depNum = Number(dep);
  if (dep && Number.isInteger(depNum) && depNum > 0) q.departureLocationId = String(depNum);

  const budget = get("budget");
  if (budget && BUDGETS.has(budget)) q.budget = budget;

  const departureDate = get("departureDate");
  if (departureDate && /^\d{4}-\d{2}-\d{2}$/.test(departureDate)) {
    q.departureDate = departureDate;
  }

  const text = get("q");
  if (text) q.q = text;

  const featured = get("featured");
  if (featured === "true" || featured === "1") {
    q.featured = FEATURED_TOURS_QUERY.featured;
  }

  const tagId = get("tagId");
  if (tagId && /^\d+$/.test(String(tagId))) {
    q.tagId = String(Number(tagId));
  }

  const tourLine = get("tourLine");
  if (tourLine && TOUR_LINES.has(String(tourLine))) {
    q.tourLine = String(tourLine);
  }

  const transportType = get("transportType");
  if (transportType && TRANSPORT_TYPES.has(String(transportType))) {
    q.transportType = String(transportType);
  }

  return q;
}
