import type {
  AdminDashboardStats,
  AdminPaymentListResponse,
  AdminPaymentRow,
  AdminUser,
  BookingDetail,
  BookingListItem,
  BookingListPaginated,
  CreateTourItineraryInput,
  CreateTourScheduleInput,
  CreateTourImageInput,
  CreateTourInput,
  DeleteTourResponse,
  DeleteUserResponse,
  LocationRow,
  ProvinceRow,
  RegionRow,
  TourDetail,
  TourImage,
  TourListItem,
  TourListPaginated,
  TourItinerary,
  TourSchedule,
  TourTagRow,
  UpdateTourItineraryInput,
  UpdateTourScheduleInput,
  UpdateBookingStatusBody,
  UpdateTourInput,
  UpdateUserInput,
  Supplier,
  CreateSupplierInput,
  UpdateSupplierInput,
  TourTransport,
  CreateTourTransportInput,
  UpdateTourTransportInput,
  TourAccommodation,
  CreateTourAccommodationInput,
  UpdateTourAccommodationInput,
  TourMeal,
  CreateTourMealInput,
  UpdateTourMealInput,
  UserListPaginated,
} from "./api-types";
import { ACCESS_TOKEN_KEY } from "./auth-constants";
import { API_BASE_URL } from "./env";

export { API_BASE_URL };

export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; status: number; body: unknown };
export type ApiResult<T> = ApiOk<T> | ApiErr;

type NextFetch = RequestInit & { next?: { revalidate?: number } };

/** POST /media/upload — multipart, field `file`; JWT ADMIN. */
export async function uploadAdminImage(
  file: File,
): Promise<ApiResult<{ url: string }>> {
  try {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem(ACCESS_TOKEN_KEY)
        : null;
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_BASE_URL}/media/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const body = await readBody(res);
    if (!res.ok) return { ok: false, status: res.status, body };
    return { ok: true, data: body as { url: string } };
  } catch {
    return {
      ok: false,
      status: 0,
      body: { message: "Không kết nối được API (kiểm tra backend đang chạy)." },
    };
  }
}

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

function authHeaders(): HeadersInit {
  if (typeof window === "undefined") return {};
  try {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

async function apiFetchJson<T>(
  path: string,
  init?: NextFetch,
): Promise<ApiResult<T>> {
  const { next, ...rest } = init ?? {};
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
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

export async function apiGet<T>(
  path: string,
  init?: NextFetch,
): Promise<ApiResult<T>> {
  return apiFetchJson<T>(path, { ...init, method: "GET" });
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  init?: Omit<NextFetch, "body" | "method">,
): Promise<ApiResult<T>> {
  return apiFetchJson<T>(path, {
    ...init,
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function apiPut<T>(
  path: string,
  body: unknown,
  init?: Omit<NextFetch, "body" | "method">,
): Promise<ApiResult<T>> {
  return apiFetchJson<T>(path, {
    ...init,
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function apiPatch<T>(
  path: string,
  body: unknown,
  init?: Omit<NextFetch, "body" | "method">,
): Promise<ApiResult<T>> {
  return apiFetchJson<T>(path, {
    ...init,
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function apiDelete<T>(
  path: string,
  init?: Omit<NextFetch, "method">,
): Promise<ApiResult<T>> {
  return apiFetchJson<T>(path, { ...init, method: "DELETE" });
}

function buildQuery(q: Record<string, string | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v !== undefined && v !== "") p.set(k, v);
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

/** Danh sách tour (query tùy chọn; có `page`/`pageSize` → phân trang). */
export function fetchTours(
  query: Record<string, string | undefined>,
  init?: NextFetch,
) {
  return apiGet<TourListItem[] | TourListPaginated>(
    `/tours${buildQuery(query)}`,
    init,
  );
}

export function unwrapTourList(
  data: TourListItem[] | TourListPaginated,
): { items: TourListItem[]; total: number } {
  if (Array.isArray(data)) return { items: data, total: data.length };
  return { items: data.items, total: data.total };
}

export function fetchTourById(id: number, init?: NextFetch) {
  return apiGet<TourDetail>(`/tours/${id}`, init);
}

/** GET /tours/tags — công khai; `q` tìm theo tên hoặc mô tả. */
export function fetchTourTags(
  query: Record<string, string | undefined> = {},
  init?: NextFetch,
) {
  return apiGet<TourTagRow[]>(`/tours/tags${buildQuery(query)}`, init);
}

/** POST /tours/tags — ADMIN. */
export function createTourTag(body: {
  name: string;
  description?: string | null;
}) {
  return apiPost<TourTagRow>("/tours/tags", body);
}

/** PUT /tours/tags/:id — ADMIN. */
export function updateTourTag(
  id: number,
  body: { name?: string; description?: string | null },
) {
  return apiPut<TourTagRow>(`/tours/tags/${id}`, body);
}

/** DELETE /tours/tags/:id — ADMIN. */
export function deleteTourTag(id: number) {
  return apiDelete<{ message: string }>(`/tours/tags/${id}`);
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

export function createRegion(body: { name?: string | null }) {
  return apiPost<RegionRow>("/locations/regions", body);
}

export function updateRegion(id: number, body: { name?: string | null }) {
  return apiPut<RegionRow>(`/locations/regions/${id}`, body);
}

export function deleteRegion(id: number) {
  return apiDelete<{ message: string }>(`/locations/regions/${id}`);
}

export function createProvince(body: { regionId: number; name: string }) {
  return apiPost<ProvinceRow>("/locations/provinces", body);
}

export function updateProvince(
  id: number,
  body: { regionId?: number; name?: string },
) {
  return apiPut<ProvinceRow>(`/locations/provinces/${id}`, body);
}

export function deleteProvince(id: number) {
  return apiDelete<{ message: string }>(`/locations/provinces/${id}`);
}

export function createLocation(body: {
  provinceId: number;
  name: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  isActive?: boolean;
}) {
  return apiPost<LocationRow>("/locations/locations", body);
}

export function updateLocation(
  id: number,
  body: {
    provinceId?: number;
    name?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    description?: string | null;
    isActive?: boolean | null;
  },
) {
  return apiPut<LocationRow>(`/locations/locations/${id}`, body);
}

export function deleteLocation(id: number) {
  return apiDelete<{ message: string }>(`/locations/locations/${id}`);
}

/** POST /tours — cần JWT ADMIN. */
export function createTour(body: CreateTourInput) {
  return apiPost<TourDetail>("/tours", body);
}

/** POST /tours/:id/images — cần JWT ADMIN. */
export function addTourImage(tourId: number, body: CreateTourImageInput) {
  return apiPost<TourImage>(`/tours/${tourId}/images`, body);
}

/** DELETE /tours/:id/images/:imageId — cần JWT ADMIN. */
export function removeTourImage(tourId: number, imageId: number) {
  return apiDelete<{ message: string }>(`/tours/${tourId}/images/${imageId}`);
}

/** PUT /tours/:id — cần JWT ADMIN. */
export function updateTour(id: number, body: UpdateTourInput) {
  return apiPut<TourDetail>(`/tours/${id}`, body);
}

/** DELETE /tours/:id — cần JWT ADMIN. */
export function deleteTour(id: number) {
  return apiDelete<DeleteTourResponse>(`/tours/${id}`);
}

/** GET /users — ADMIN; có `page`/`pageSize` → phân trang. */
export function fetchUsers(
  query: Record<string, string | undefined> = {},
  init?: NextFetch,
) {
  return apiGet<AdminUser[] | UserListPaginated>(
    `/users${buildQuery(query)}`,
    init,
  );
}

export function unwrapUserList(
  data: AdminUser[] | UserListPaginated,
): { items: AdminUser[]; total: number } {
  if (Array.isArray(data)) return { items: data, total: data.length };
  return { items: data.items, total: data.total };
}

/** GET /users/:id — admin xem bất kỳ, user xem chính mình. */
export function fetchUserById(id: number, init?: NextFetch) {
  return apiGet<AdminUser>(`/users/${id}`, init);
}

/** PATCH /users/:id — admin sửa bất kỳ, user sửa chính mình. */
export function updateUser(id: number, body: UpdateUserInput) {
  return apiPatch<AdminUser>(`/users/${id}`, body);
}

/** DELETE /users/:id — cần JWT ADMIN. */
export function deleteUser(id: number) {
  return apiDelete<DeleteUserResponse>(`/users/${id}`);
}

/** GET /bookings — ADMIN; có `page`/`pageSize` → phân trang. */
export function fetchBookings(
  query: Record<string, string | undefined>,
  init?: NextFetch,
) {
  return apiGet<BookingListItem[] | BookingListPaginated>(
    `/bookings${buildQuery(query)}`,
    init,
  );
}

export function unwrapBookingList(
  data: BookingListItem[] | BookingListPaginated,
): { items: BookingListItem[]; total: number } {
  if (Array.isArray(data)) return { items: data, total: data.length };
  return { items: data.items, total: data.total };
}

/** GET /bookings/:id — xem chi tiết (ADMIN hoặc chủ đơn). */
export function fetchBookingById(id: number, init?: NextFetch) {
  return apiGet<BookingDetail>(`/bookings/${id}`, init);
}

/** PUT /bookings/:id/status — ADMIN. */
export function updateBookingStatus(id: number, body: UpdateBookingStatusBody) {
  return apiPut<BookingDetail>(`/bookings/${id}/status`, body);
}

export function approveBookingCancellation(id: number, init?: NextFetch) {
  return apiPost<BookingDetail>(`/bookings/${id}/cancellation/approve`, {}, init);
}

export function rejectBookingCancellation(
  id: number,
  body: { reason?: string },
  init?: NextFetch,
) {
  return apiPost<BookingDetail>(`/bookings/${id}/cancellation/reject`, body, init);
}

/** GET /payments/admin — ADMIN: danh sách (phân trang `page`/`pageSize`). */
export function fetchAdminPayments(
  query: Record<string, string | undefined>,
  init?: NextFetch,
) {
  return apiGet<AdminPaymentListResponse>(
    `/payments/admin${buildQuery(query)}`,
    init,
  );
}

/** GET /admin/dashboard/stats — thống kê + chuỗi doanh thu (lọc ngày/tháng/năm). */
export function fetchDashboardStats(
  query: Record<string, string | undefined>,
  init?: NextFetch,
) {
  return apiGet<AdminDashboardStats>(
    `/admin/dashboard/stats${buildQuery(query)}`,
    init,
  );
}

/** ========================= Tour Schedules / Itineraries (ADMIN) ========================= */

export function addTourSchedule(tourId: number, body: CreateTourScheduleInput) {
  return apiPost<TourSchedule>(`/tours/${tourId}/schedules`, body);
}

export function updateTourSchedule(
  scheduleId: number,
  body: UpdateTourScheduleInput,
) {
  return apiPut<TourSchedule>(`/tours/schedules/${scheduleId}`, body);
}

export function removeTourSchedule(scheduleId: number) {
  return apiDelete<{ message: string }>(
    `/tours/schedules/${scheduleId}`,
  );
}

export function addTourItinerary(
  tourId: number,
  body: CreateTourItineraryInput,
) {
  return apiPost<TourItinerary>(`/tours/${tourId}/itineraries`, body);
}

export function updateTourItinerary(
  itineraryId: number,
  body: UpdateTourItineraryInput,
) {
  return apiPut<TourItinerary>(`/tours/itineraries/${itineraryId}`, body);
}

export function removeTourItinerary(itineraryId: number) {
  return apiDelete<{ message: string }>(
    `/tours/itineraries/${itineraryId}`,
  );
}

/** ========================= Suppliers (ADMIN) ========================= */

export type SupplierListPaginated = {
  items: Supplier[];
  total: number;
  page: number;
  pageSize: number;
};

export function fetchSuppliers(
  query: Record<string, string | undefined> = {},
  init?: NextFetch,
) {
  return apiGet<Supplier[] | SupplierListPaginated>(
    `/suppliers${buildQuery(query)}`,
    init,
  );
}

export function unwrapSupplierList(
  data: Supplier[] | SupplierListPaginated,
): { items: Supplier[]; total: number } {
  if (Array.isArray(data)) {
    return { items: data, total: data.length };
  }
  return { items: data.items, total: data.total };
}

export function fetchSupplierById(id: number, init?: NextFetch) {
  return apiGet<Supplier>(`/suppliers/${id}`, init);
}

export function createSupplier(body: CreateSupplierInput) {
  return apiPost<Supplier>("/suppliers", body);
}

export function updateSupplier(id: number, body: UpdateSupplierInput) {
  return apiPut<Supplier>(`/suppliers/${id}`, body);
}

export function deleteSupplier(id: number) {
  return apiDelete<{ message: string }>(`/suppliers/${id}`);
}

/** ========================= Tour Transports (ADMIN) ========================= */

export function addTourTransport(tourId: number, body: CreateTourTransportInput) {
  return apiPost<TourTransport>(`/tours/${tourId}/transports`, body);
}

export function updateTourTransport(
  transportId: number,
  body: UpdateTourTransportInput,
) {
  return apiPut<TourTransport>(`/tours/transports/${transportId}`, body);
}

export function removeTourTransport(transportId: number) {
  return apiDelete<{ message: string }>(`/tours/transports/${transportId}`);
}

/** ========================= Itinerary Accommodations (ADMIN) ========================= */

export function addItineraryAccommodation(
  itineraryId: number,
  body: CreateTourAccommodationInput,
) {
  return apiPost<TourAccommodation>(
    `/tours/itineraries/${itineraryId}/accommodations`,
    body,
  );
}

export function updateItineraryAccommodation(
  accommodationId: number,
  body: UpdateTourAccommodationInput,
) {
  return apiPut<TourAccommodation>(
    `/tours/accommodations/${accommodationId}`,
    body,
  );
}

export function removeItineraryAccommodation(accommodationId: number) {
  return apiDelete<{ message: string }>(
    `/tours/accommodations/${accommodationId}`,
  );
}

/** ========================= Itinerary Meals (ADMIN) ========================= */

export function addItineraryMeal(
  itineraryId: number,
  body: CreateTourMealInput,
) {
  return apiPost<TourMeal>(`/tours/itineraries/${itineraryId}/meals`, body);
}

export function updateItineraryMeal(
  mealId: number,
  body: UpdateTourMealInput,
) {
  return apiPut<TourMeal>(`/tours/meals/${mealId}`, body);
}

export function removeItineraryMeal(mealId: number) {
  return apiDelete<{ message: string }>(`/tours/meals/${mealId}`);
}
