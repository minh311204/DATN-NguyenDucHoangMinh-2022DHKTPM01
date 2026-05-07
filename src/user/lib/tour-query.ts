const BUDGETS = new Set(["under_5m", "5_10m", "10_20m", "over_20m"]);

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
  if (dest) q.destinationLocationId = String(Number(dest));

  const dep = get("departureLocationId");
  if (dep) q.departureLocationId = String(Number(dep));

  const budget = get("budget");
  if (budget && BUDGETS.has(budget)) q.budget = budget;

  const departureDate = get("departureDate");
  if (departureDate && /^\d{4}-\d{2}-\d{2}$/.test(departureDate)) {
    q.departureDate = departureDate;
  }

  const text = get("q");
  if (text) q.q = text;

  const featured = get("featured");
  if (featured === "true" || featured === "1") q.featured = "true";

  const tagId = get("tagId");
  if (tagId && /^\d+$/.test(String(tagId))) {
    q.tagId = String(Number(tagId));
  }

  return q;
}
