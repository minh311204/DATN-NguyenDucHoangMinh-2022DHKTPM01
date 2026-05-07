import type { LocationRow, TourDetail, TourListItem } from "./api-types";
import { API_BASE_URL } from "./env";

export { API_BASE_URL };

type NextFetch = RequestInit & { next?: { revalidate?: number } };

export type RegionRow = {
  id: number;
  name?: string | null;
};

export type ProvinceRow = {
  id: number;
  regionId: number;
  name?: string | null;
};

async function readBody(res: Response): Promise<unknown> {
  const t = res.headers.get("content-type");
  if (t?.includes("application/json")) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }
  return res.text();
}

export async function apiGet<T>(
  path: string,
  init?: NextFetch,
): Promise<
  { ok: true; data: T } | { ok: false; status: number; body: unknown }
> {
  const { next, ...rest } = init ?? {};
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(rest.headers as Record<string, string>),
      },
      next,
    });
    const body = await readBody(res);
    if (!res.ok) return { ok: false, status: res.status, body };
    return { ok: true, data: body as T };
  } catch {
    return {
      ok: false,
      status: 0,
      body: { message: "Không kết nối được API (kiểm tra backend đang chạy)." },
    };
  }
}

function buildQuery(q: Record<string, string | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v !== undefined && v !== "") p.set(k, v);
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

/** Khi gửi `page` / `pageSize` lên API — GET /tours trả về object thay vì mảng */
export type TourListPaginated = {
  items: TourListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export function fetchTours(
  query: Record<string, string | undefined>,
  init?: NextFetch,
) {
  return apiGet<TourListItem[] | TourListPaginated>(
    `/tours${buildQuery(query)}`,
    init,
  );
}

export function unwrapTourListResponse(
  data: TourListItem[] | TourListPaginated,
): { tours: TourListItem[]; total: number } {
  if (Array.isArray(data)) {
    return { tours: data, total: data.length };
  }
  return { tours: data.items, total: data.total };
}

export function fetchTourById(id: number, init?: NextFetch) {
  return apiGet<TourDetail>(`/tours/${id}`, init);
}

export type TourTagPublic = {
  id: number;
  name: string;
  description?: string | null;
  tourCount?: number;
};

/** GET /tours/tags — công khai */
export function fetchTourTags(
  query: Record<string, string | undefined> = {},
  init?: NextFetch,
) {
  return apiGet<TourTagPublic[]>(`/tours/tags${buildQuery(query)}`, init);
}

export function fetchLocations(init?: NextFetch) {
  return apiGet<LocationRow[]>(`/locations/locations`, init);
}

export function fetchRegions(init?: NextFetch) {
  return apiGet<RegionRow[]>(`/locations/regions`, init);
}

export function fetchProvinces(init?: NextFetch) {
  return apiGet<ProvinceRow[]>(`/locations/provinces`, init);
}
