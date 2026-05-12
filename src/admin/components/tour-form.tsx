"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import type {
  CreateTourInput,
  CreateTourItineraryInput,
  CreateTourScheduleInput,
  CreateTourTransportInput,
  LocationRow,
  Supplier,
  TourAccommodation,
  TourDetail,
  TourImage,
  TourItinerary,
  TourMeal,
  TourSchedule,
  TourTagRow,
  TourTransport,
  TourLine,
  TransportType,
  VehicleType,
  MealType,
  UpdateTourInput,
} from "@/lib/api-types";
import {
  addItineraryAccommodation,
  addItineraryMeal,
  addTourImage,
  addTourItinerary,
  addTourSchedule,
  addTourTransport,
  createTour,
  fetchSuppliers,
  fetchTourTags,
  removeItineraryAccommodation,
  removeItineraryMeal,
  removeTourImage,
  removeTourItinerary,
  removeTourSchedule,
  removeTourTransport,
  setTourTags,
  updateItineraryAccommodation,
  updateItineraryMeal,
  updateTourItinerary,
  updateTourSchedule,
  updateTourTransport,
  updateTour,
  uploadAdminImage,
} from "@/lib/admin-api";
import { errorMessage, formatDateTimeVi } from "@/lib/format";
import { TourImage as TourImagePreview } from "@/components/tour-image";

type Fields = {
  name: string;
  slug: string;
  description: string;
  departureLocationId: string;
  destinationLocationId: string;
  durationDays: string;
  basePrice: string;
  thumbnailUrl: string;
  tourLine: string;
  transportType: string;
  isActive: boolean;
  isFeatured: boolean;
  inclusions: string;
  exclusions: string;
  cancellationPolicy: string;
};

type TransportDraft = {
  supplierId: string;
  legOrder: string;
  vehicleType: VehicleType;
  vehicleDetail: string;
  seatClass: string;
  departurePoint: string;
  arrivalPoint: string;
  estimatedHours: string;
  notes: string;
};

type AccommodationDraft = {
  supplierId: string;
  hotelName: string;
  starRating: string;
  roomType: string;
  checkInNote: string;
  checkOutNote: string;
  address: string;
  mapUrl: string;
};

type MealDraft = {
  supplierId: string;
  mealType: MealType;
  restaurantName: string;
  menuStyle: string;
  dietaryNotes: string;
};

const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  CAR_4: "Xe 4 chỗ",
  CAR_7: "Xe 7 chỗ",
  BUS_16: "Xe 16 chỗ",
  BUS_29: "Xe 29 chỗ",
  BUS_45: "Xe 45 chỗ",
  FLIGHT: "Máy bay",
  TRAIN: "Tàu hỏa",
  BOAT: "Tàu/Thuyền",
  CABLE_CAR: "Cáp treo",
};

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  BREAKFAST: "Bữa sáng",
  LUNCH: "Bữa trưa",
  DINNER: "Bữa tối",
  SNACK: "Ăn vặt/Snack",
};

/** Khớp TourScheduleStatusSchema — hiển thị trên form */
const TOUR_SCHEDULE_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "OPEN", label: "Mở bán" },
  { value: "ACTIVE", label: "Đang chạy" },
  { value: "FULL", label: "Hết chỗ" },
  { value: "CANCELLED", label: "Đã hủy (ẩn trên site)" },
];

/** Lưới 2 nút (Lưu | + Thêm …) — cùng kích thước mọi section (lịch / lịch trình / chặng) */
const SECTION_HEADER_ACTIONS_GRID =
  "grid w-max max-w-full shrink-0 grid-cols-[7.25rem_12rem] gap-1.5";

function labelScheduleStatus(s: string | null | undefined) {
  if (!s) return "—";
  const o = TOUR_SCHEDULE_STATUS_OPTIONS.find((x) => x.value === s);
  return o?.label ?? s;
}

type ScheduleDraft = {
  startDate: string; // datetime-local
  endDate: string; // datetime-local
  availableSeats: string;
  priceOverride: string;
  status: string;
};

type ItineraryDraft = {
  dayNumber: string;
  title: string;
  description: string;
};

function isEmptyItineraryDraft(d: ItineraryDraft) {
  return !d.dayNumber && !d.title && !d.description;
}

function parseOptionalNumberFloat(
  raw: string,
): { ok: true; value?: number } | { ok: false; error: string } {
  const t = raw.trim();
  if (!t) return { ok: true, value: undefined };
  const n = Number(t);
  if (!Number.isFinite(n)) {
    return { ok: false, error: "Giá trị không hợp lệ." };
  }
  return { ok: true, value: n };
}

/** Số chỗ trên lịch — bắt buộc khi đã nhập thông tin lịch */
function parseRequiredPositiveInt(
  raw: string,
): { ok: true; value: number } | { ok: false; error: string } {
  const t = raw.trim();
  if (!t) {
    return { ok: false, error: "Nhập số chỗ" };
  }
  const n = Number(t);
  if (!Number.isFinite(n) || Math.floor(n) !== n) {
    return { ok: false, error: "Số chỗ phải là số nguyên." };
  }
  if (n < 1) {
    return { ok: false, error: "Số chỗ phải ≥ 1." };
  }
  return { ok: true, value: n };
}

type TourFormFieldErrorKey =
  | "name"
  | "slug"
  | "departureLocationId"
  | "destinationLocationId"
  | "durationDays"
  | "basePrice"
  | "thumbnailUrl"
  | "description"
  | "inclusions"
  | "exclusions"
  | "cancellationPolicy";

type ScheduleFieldErrorKey =
  | "startDate"
  | "endDate"
  | "availableSeats"
  | "priceOverride"
  | "status"
  | "_row";

function ringError(active: boolean) {
  return active
    ? "border-red-500 ring-2 ring-red-200 focus:border-red-500 focus:ring-red-200"
    : "border-slate-200 focus:border-slate-200 focus:ring-0";
}

function InlineFieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs font-medium text-red-700">{message}</p>;
}

/** Validate ngay khi gõ — Số ngày */
function tourDurationDaysInlineError(raw: string): string | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const d = Number(t);
  if (!Number.isFinite(d) || Math.floor(d) !== d || d < 1) {
    return "Số ngày >= 1";
  }
  return undefined;
}

/** Validate ngay khi gõ — Giá cơ bản: số hợp lệ và > 0 */
function tourBasePriceInlineError(raw: string): string | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const p = Number(t);
  if (!Number.isFinite(p)) {
    return "Nhập số hợp lệ.";
  }
  if (p <= 0) {
    return "Giá cơ bản phải lớn hơn 0.";
  }
  return undefined;
}

/** Lỗi từng ô form tour — dùng cho hiển thị inline */
function collectTourFieldErrors(
  fields: Fields,
  dep: number,
  dest: number,
  opts?: { requireBasePrice?: boolean },
): Partial<Record<TourFormFieldErrorKey, string>> {
  const e: Partial<Record<TourFormFieldErrorKey, string>> = {};
  if (!fields.name.trim()) {
    e.name = "Nhập tên tour.";
  }
  if (!dep || Number.isNaN(dep)) {
    e.departureLocationId = "Chọn điểm khởi hành.";
  }
  if (!dest || Number.isNaN(dest)) {
    e.destinationLocationId = "Chọn điểm đến.";
  }
  if (dep && dest && dep === dest) {
    e.destinationLocationId = "Điểm đến phải khác điểm khởi hành.";
  }

  const slug = fields.slug.trim();
  if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug)) {
    e.slug = "Chỉ dùng chữ, số và dấu gạch ngang (vd: tour-mien-tay).";
  } else if (slug.length > 120) {
    e.slug = "Tối đa 120 ký tự.";
  }

  const thumb = fields.thumbnailUrl.trim();
  if (thumb) {
    try {
      void new URL(thumb);
    } catch {
      e.thumbnailUrl = "URL không hợp lệ.";
    }
  }

  if (fields.durationDays.trim()) {
    const msg = tourDurationDaysInlineError(fields.durationDays);
    if (msg) e.durationDays = "Nhập số ngày(phải lớn hơn 0)";
  }

  const bp = fields.basePrice.trim();
  if (opts?.requireBasePrice && !bp) {
    e.basePrice = "Nhập giá cơ bản (phải lớn hơn 0).";
  } else if (bp) {
    const msg = tourBasePriceInlineError(bp);
    if (msg) e.basePrice = msg;
  }

  if (fields.description.trim().length > 50_000) {
    e.description = "Tối đa 50.000 ký tự.";
  }
  if (fields.inclusions.trim().length > 20_000) {
    e.inclusions = "Tối đa 20.000 ký tự.";
  }
  if (fields.exclusions.trim().length > 20_000) {
    e.exclusions = "Tối đa 20.000 ký tự.";
  }
  if (fields.cancellationPolicy.trim().length > 20_000) {
    e.cancellationPolicy = "Tối đa 20.000 ký tự.";
  }

  return e;
}

function scheduleStatusMeaningful(d: ScheduleDraft) {
  return d.status && d.status !== "OPEN";
}

function isEmptyScheduleDraft(d: ScheduleDraft) {
  return (
    !d.startDate &&
    !d.endDate &&
    !d.availableSeats &&
    !d.priceOverride &&
    !scheduleStatusMeaningful(d)
  );
}

/** Giá trị `min` cho input datetime-local — chặn chọn thời điểm trước hiện tại (theo giờ máy). */
function datetimeLocalMinNow(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

/** `min` cho ô kết thúc: không trước hiện tại và không trước giờ bắt đầu (chuỗi datetime-local so sánh từ điển). */
function scheduleDraftEndDatetimeLocalMin(startVal: string): string {
  const now = datetimeLocalMinNow();
  const s = startVal.trim();
  if (!s) return now;
  return s.localeCompare(now) > 0 ? s : now;
}

/** Lỗi từng ô một dòng lịch — bỏ qua khi dòng đang trống */
function getScheduleRowFieldErrors(
  d: ScheduleDraft,
  opts?: { forbidPastDates?: boolean },
): Partial<Record<ScheduleFieldErrorKey, string>> {
  const e: Partial<Record<ScheduleFieldErrorKey, string>> = {};
  if (isEmptyScheduleDraft(d)) return e;

  if (!d.startDate.trim()) {
    e.startDate = "Chọn ngày giờ bắt đầu.";
  }
  if (!d.endDate.trim()) {
    e.endDate = "Chọn ngày giờ kết thúc.";
  }

  let startOk = false;
  let endOk = false;
  let startTs = 0;
  let endTs = 0;
  if (d.startDate) {
    const start = new Date(d.startDate);
    if (!Number.isFinite(start.getTime())) {
      e.startDate = "Thời điểm không hợp lệ.";
    } else {
      startOk = true;
      startTs = start.getTime();
    }
  }
  if (d.endDate) {
    const end = new Date(d.endDate);
    if (!Number.isFinite(end.getTime())) {
      e.endDate = "Thời điểm không hợp lệ.";
    } else {
      endOk = true;
      endTs = end.getTime();
    }
  }
  if (startOk && endOk && endTs <= startTs) {
    e.endDate = "Phải sau thời điểm bắt đầu.";
  }

  if (opts?.forbidPastDates) {
    const now = Date.now();
    if (startOk && startTs < now) {
      e.startDate = "Không được chọn ngày đã qua.";
    }
    if (endOk && endTs < now && !e.endDate) {
      e.endDate = "Không được chọn ngày đã qua.";
    }
  }

  const seats = parseRequiredPositiveInt(d.availableSeats);
  if (!seats.ok) {
    e.availableSeats = seats.error;
  }

  const p = parseOptionalNumberFloat(d.priceOverride);
  if (!p.ok) {
    e.priceOverride = p.error;
  } else if (p.value != null && p.value < 0) {
    e.priceOverride = "Không được âm.";
  }

  if (
    d.status &&
    !TOUR_SCHEDULE_STATUS_OPTIONS.some((o) => o.value === d.status) &&
    d.status.length > 64
  ) {
    e.status = "Giá trị không hợp lệ.";
  }

  return e;
}

function isoToDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function buildInitialFields(
  initial: TourDetail | null,
  locations: LocationRow[],
): Fields {
  const l0 = String(locations[0]?.id ?? "");
  const l1 = String(locations[1]?.id ?? l0);
  if (!initial) {
    return {
      name: "",
      slug: "",
      description: "",
      departureLocationId: l0,
      destinationLocationId: l1,
      durationDays: "",
      basePrice: "",
      thumbnailUrl: "",
      tourLine: "STANDARD",
      transportType: "BUS",
      isActive: true,
      isFeatured: false,
      inclusions: "",
      exclusions: "",
      cancellationPolicy: "",
    };
  }
  return {
    name: initial.name,
    slug: initial.slug ?? "",
    description: initial.description ?? "",
    departureLocationId: String(initial.departureLocationId),
    destinationLocationId: String(initial.destinationLocationId),
    durationDays:
      initial.durationDays != null ? String(initial.durationDays) : "",
    basePrice: initial.basePrice != null ? String(initial.basePrice) : "",
    thumbnailUrl: initial.thumbnailUrl ?? "",
    tourLine: initial.tourLine ?? "STANDARD",
    transportType: initial.transportType ?? "BUS",
    isActive: initial.isActive ?? true,
    isFeatured: initial.isFeatured ?? false,
    inclusions: initial.inclusions ?? "",
    exclusions: initial.exclusions ?? "",
    cancellationPolicy: initial.cancellationPolicy ?? "",
  };
}

function emptyTransportDraft(legOrder = 1): TransportDraft {
  return {
    supplierId: "",
    legOrder: String(legOrder),
    vehicleType: "BUS_45",
    vehicleDetail: "",
    seatClass: "",
    departurePoint: "",
    arrivalPoint: "",
    estimatedHours: "",
    notes: "",
  };
}

function transportDraftToCreateBody(
  d: TransportDraft,
): CreateTourTransportInput {
  return {
    supplierId: d.supplierId ? Number(d.supplierId) : undefined,
    legOrder: Number(d.legOrder) || 1,
    vehicleType: d.vehicleType,
    vehicleDetail: d.vehicleDetail.trim() || undefined,
    seatClass: d.seatClass.trim() || undefined,
    departurePoint: d.departurePoint.trim(),
    arrivalPoint: d.arrivalPoint.trim(),
    estimatedHours: d.estimatedHours ? Number(d.estimatedHours) : undefined,
    notes: d.notes.trim() || undefined,
  };
}

function emptyAccommodationDraft(): AccommodationDraft {
  return {
    supplierId: "",
    hotelName: "",
    starRating: "",
    roomType: "",
    checkInNote: "",
    checkOutNote: "",
    address: "",
    mapUrl: "",
  };
}

function emptyMealDraft(): MealDraft {
  return {
    supplierId: "",
    mealType: "BREAKFAST",
    restaurantName: "",
    menuStyle: "",
    dietaryNotes: "",
  };
}

type TourFormProps = {
  mode: "create" | "edit";
  tourId?: number;
  initialDetail: TourDetail | null;
  locations: LocationRow[];
  /** Nhúng trong drawer danh sách: sau khi lưu gọi thay vì chuyển trang */
  onSavedToList?: () => void;
};

export function TourForm({
  mode,
  tourId,
  initialDetail,
  locations,
  onSavedToList,
}: TourFormProps) {
  const router = useRouter();
  const [fields, setFields] = useState<Fields>(() =>
    buildInitialFields(initialDetail, locations),
  );
  const [err, setErr] = useState<string | null>(null);
  const [tourFieldErrors, setTourFieldErrors] = useState<
    Partial<Record<TourFormFieldErrorKey, string>>
  >({});
  const [scheduleDraftFieldErrors, setScheduleDraftFieldErrors] = useState<
    Record<number, Partial<Record<ScheduleFieldErrorKey, string>>>
  >({});
  const [scheduleModalFieldErrors, setScheduleModalFieldErrors] = useState<
    Partial<Record<ScheduleFieldErrorKey, string>>
  >({});
  /** Lỗi section "Lịch khởi hành tạo mới" — hiện trong section (VD: chưa có lịch hợp lệ) */
  const [scheduleNewSectionErr, setScheduleNewSectionErr] = useState<string | null>(null);
  /** Lỗi từng ô "Số ngày" trong block Lịch trình tạo mới */
  const [itineraryDraftDayErrors, setItineraryDraftDayErrors] = useState<Record<number, string>>({});
  /** Lỗi section "Lịch trình tạo mới" */
  const [itineraryNewSectionErr, setItineraryNewSectionErr] = useState<string | null>(null);
  /** Lỗi ô "Day number" trong modal sửa lịch trình */
  const [itineraryModalDayErr, setItineraryModalDayErr] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [scheduleDrafts, setScheduleDrafts] = useState<ScheduleDraft[]>([]);
  const [itineraryDrafts, setItineraryDrafts] = useState<ItineraryDraft[]>([]);
  const [mutating, setMutating] = useState(false);
  const [savingNewSchedules, setSavingNewSchedules] = useState(false);
  const [savingNewItineraries, setSavingNewItineraries] = useState(false);
  const [savingNewTransports, setSavingNewTransports] = useState(false);
  const [transportNewSectionErr, setTransportNewSectionErr] = useState<
    string | null
  >(null);

  const thumbInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  /** Tạo tour: ảnh phụ trước khi POST /tours */
  const [pendingGallery, setPendingGallery] = useState<
    { id: string; imageUrl: string }[]
  >([]);
  /** Sửa tour: ảnh phụ đồng bộ API */
  const [localImages, setLocalImages] = useState<TourImage[]>([]);

  // Dữ liệu schedule/itinerary hiện có (chỉ dùng cho UI edit/xóa inline)
  const [localSchedules, setLocalSchedules] = useState<TourSchedule[]>([]);
  const [localItineraries, setLocalItineraries] = useState<TourItinerary[]>([]);

  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(
    null,
  );
  const [scheduleEditDraft, setScheduleEditDraft] = useState<ScheduleDraft>({
    startDate: "",
    endDate: "",
    availableSeats: "",
    priceOverride: "",
    status: "OPEN",
  });

  const [editingItineraryId, setEditingItineraryId] = useState<number | null>(
    null,
  );
  const [itineraryEditDraft, setItineraryEditDraft] = useState<ItineraryDraft>(
    { dayNumber: "", title: "", description: "" },
  );

  // Transports
  const [localTransports, setLocalTransports] = useState<TourTransport[]>([]);
  const [transportDrafts, setTransportDrafts] = useState<TransportDraft[]>([]);
  const [editingTransportId, setEditingTransportId] = useState<number | null>(null);
  const [transportEditDraft, setTransportEditDraft] = useState<TransportDraft>(emptyTransportDraft());
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Accommodation + Meal đang thêm mới (theo itineraryId)
  const [addingAccomForItinerary, setAddingAccomForItinerary] = useState<number | null>(null);
  const [accomDraft, setAccomDraft] = useState<AccommodationDraft>(emptyAccommodationDraft());
  const [addingMealForItinerary, setAddingMealForItinerary] = useState<number | null>(null);
  const [mealDraft, setMealDraft] = useState<MealDraft>(emptyMealDraft());

  // Tags
  const [allTags, setAllTags] = useState<TourTagRow[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>(
    () => initialDetail?.tags?.map((t) => t.id) ?? [],
  );

  useEffect(() => {
    setFields(buildInitialFields(initialDetail, locations));
    setTourFieldErrors({});
    setScheduleDraftFieldErrors({});
    setScheduleModalFieldErrors({});
    setScheduleNewSectionErr(null);
    setItineraryDraftDayErrors({});
    setItineraryNewSectionErr(null);
    setItineraryModalDayErr(undefined);
    setTransportNewSectionErr(null);
    setScheduleDrafts([]);
    setItineraryDrafts([]);
    setLocalSchedules(initialDetail?.schedules ?? []);
    setLocalItineraries(initialDetail?.itineraries ?? []);
    setLocalTransports(initialDetail?.transports ?? []);
    setLocalImages(initialDetail?.images ?? []);
    setPendingGallery([]);
    setSelectedTagIds(initialDetail?.tags?.map((t) => t.id) ?? []);
    setTransportDrafts([]);
    setEditingScheduleId(null);
    setEditingItineraryId(null);
    setEditingTransportId(null);
  }, [initialDetail, locations]);

  // Load danh sách tags (cả create lẫn edit)
  useEffect(() => {
    fetchTourTags().then((res) => {
      if (res.ok) setAllTags(res.data);
    });
  }, []);

  // Load suppliers (chọn đơn vị vận chuyển khi tạo / sửa tour)
  useEffect(() => {
    fetchSuppliers().then((res) => {
      if (!res.ok) return;
      const d = res.data;
      setSuppliers(Array.isArray(d) ? d : d.items);
    });
  }, []);

  function set<K extends keyof Fields>(key: K, value: Fields[K]) {
    setFields((f) => ({ ...f, [key]: value }));
    setTourFieldErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete (next as Partial<Record<string, string>>)[key as string];
      return next;
    });
  }

  function closeScheduleEditModal() {
    setEditingScheduleId(null);
    setScheduleModalFieldErrors({});
  }

  /** Xóa lỗi inline một ô trong block “lịch tạo mới” #draftIndex */
  function clearScheduleDraftCell(
    draftIndex: number,
    cell: ScheduleFieldErrorKey,
  ) {
    if (cell === "_row") return;
    setScheduleDraftFieldErrors((prev) => {
      const row = prev[draftIndex];
      if (!row?.[cell]) return prev;
      const updated = { ...row };
      delete updated[cell];
      if (Object.keys(updated).length === 0) {
        const rest = { ...prev };
        delete rest[draftIndex];
        return rest;
      }
      return { ...prev, [draftIndex]: updated };
    });
  }

  function patchScheduleDraft(
    draftIndex: number,
    patch: Partial<ScheduleDraft>,
    touched?: ScheduleFieldErrorKey,
  ) {
    if (touched === "startDate" || touched === "endDate") {
      setScheduleDrafts((prev) => {
        const nextRow = { ...prev[draftIndex], ...patch };
        const fe = getScheduleRowFieldErrors(nextRow, {
          forbidPastDates: true,
        });
        setScheduleDraftFieldErrors((ePrev) => {
          const out = { ...ePrev };
          if (Object.keys(fe).length === 0) {
            delete out[draftIndex];
          } else {
            out[draftIndex] = fe;
          }
          return out;
        });
        return prev.map((row, i) =>
          i === draftIndex ? nextRow : row,
        );
      });
      return;
    }
    setScheduleDrafts((prev) =>
      prev.map((row, i) => (i === draftIndex ? { ...row, ...patch } : row)),
    );
    if (touched) clearScheduleDraftCell(draftIndex, touched);
  }

  function clearScheduleModalCell(cell: ScheduleFieldErrorKey) {
    setScheduleModalFieldErrors((prev) => {
      if (!prev[cell]) return prev;
      const next = { ...prev };
      delete next[cell];
      return next;
    });
  }

  async function onThumbFile(file: File | undefined) {
    if (!file) return;
    setUploadingThumb(true);
    setErr(null);
    const res = await uploadAdminImage(file);
    setUploadingThumb(false);
    if (!res.ok) {
      setErr(errorMessage(res.body, res.status));
      return;
    }
    set("thumbnailUrl", res.data.url);
  }

  async function onGalleryFile(file: File | undefined) {
    if (!file) return;
    setUploadingGallery(true);
    setErr(null);
    const res = await uploadAdminImage(file);
    if (!res.ok) {
      setUploadingGallery(false);
      setErr(errorMessage(res.body, res.status));
      return;
    }
    if (mode === "create") {
      setUploadingGallery(false);
      setPendingGallery((g) => [
        ...g,
        { id: `${Date.now()}-${g.length}`, imageUrl: res.data.url },
      ]);
      return;
    }
    if (tourId == null) {
      setUploadingGallery(false);
      return;
    }
    const r = await addTourImage(tourId, { imageUrl: res.data.url });
    setUploadingGallery(false);
    if (!r.ok) {
      setErr(errorMessage(r.body, r.status));
      return;
    }
    setLocalImages((prev) => [...prev, r.data]);
  }

  async function removeGalleryRow(img: TourImage) {
    if (mode !== "edit" || tourId == null) return;
    setMutating(true);
    setErr(null);
    const r = await removeTourImage(tourId, img.id);
    setMutating(false);
    if (!r.ok) {
      setErr(errorMessage(r.body, r.status));
      return;
    }
    setLocalImages((prev) => prev.filter((i) => i.id !== img.id));
  }

  function removePendingRow(id: string) {
    setPendingGallery((g) => g.filter((x) => x.id !== id));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setTourFieldErrors({});
    setScheduleDraftFieldErrors({});
    setItineraryDraftDayErrors({});

    const dep = Number(fields.departureLocationId);
    const dest = Number(fields.destinationLocationId);

    const tourFe = collectTourFieldErrors(fields, dep, dest, {
      requireBasePrice: mode === "create",
    });
    if (Object.keys(tourFe).length > 0) {
      setTourFieldErrors(tourFe);
      return;
    }

    const draftFe: Record<
      number,
      Partial<Record<ScheduleFieldErrorKey, string>>
    > = {};
    for (let i = 0; i < scheduleDrafts.length; i++) {
      const fe = getScheduleRowFieldErrors(scheduleDrafts[i], {
        forbidPastDates: true,
      });
      if (Object.keys(fe).length > 0) {
        draftFe[i] = fe;
      }
    }
    if (Object.keys(draftFe).length > 0) {
      setScheduleDraftFieldErrors(draftFe);
      return;
    }

    const schedulesToCreate: CreateTourScheduleInput[] = [];
    for (let i = 0; i < scheduleDrafts.length; i++) {
      const d = scheduleDrafts[i];
      if (isEmptyScheduleDraft(d)) continue;
      const start = new Date(d.startDate);
      const end = new Date(d.endDate);
      const seats = parseRequiredPositiveInt(d.availableSeats);
      const p = parseOptionalNumberFloat(d.priceOverride);
      if (!seats.ok || !p.ok) return;
      const st = (d.status.trim() || "OPEN") as
        | "OPEN"
        | "ACTIVE"
        | "FULL"
        | "CANCELLED";
      schedulesToCreate.push({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        availableSeats: seats.value,
        priceOverride: p.value,
        status: st,
      });
    }

    const itinerariesToCreate: CreateTourItineraryInput[] = [];
    const itDayErrors: Record<number, string> = {};
    for (let i = 0; i < itineraryDrafts.length; i++) {
      const it = itineraryDrafts[i];
      if (isEmptyItineraryDraft(it)) continue;
      const day = Number(it.dayNumber);
      if (!Number.isFinite(day) || Math.floor(day) !== day || day < 1) {
        itDayErrors[i] = "Số nguyên ≥ 1.";
      } else {
        itinerariesToCreate.push({
          dayNumber: day,
          title: it.title.trim() || undefined,
          description: it.description.trim() || undefined,
        });
      }
    }
    if (Object.keys(itDayErrors).length > 0) {
      setItineraryDraftDayErrors(itDayErrors);
      return;
    }

    setTransportNewSectionErr(null);
    if (transportDrafts.length > 0) {
      for (let i = 0; i < transportDrafts.length; i++) {
        const d = transportDrafts[i];
        if (!d.departurePoint.trim() || !d.arrivalPoint.trim()) {
          setTransportNewSectionErr(
            `Chặng #${i + 1}: nhập điểm xuất phát và điểm đến.`,
          );
          return;
        }
      }
    }

    setSaving(true);
    try {
      if (mode === "create") {
        const body: CreateTourInput = {
          departureLocationId: dep,
          destinationLocationId: dest,
          name: fields.name.trim(),
          slug: fields.slug.trim() || undefined,
          description: fields.description.trim() || undefined,
          durationDays: fields.durationDays
            ? Number(fields.durationDays)
            : undefined,
          basePrice: fields.basePrice ? Number(fields.basePrice) : undefined,
          thumbnailUrl: fields.thumbnailUrl.trim() || undefined,
          tourLine: fields.tourLine as TourLine,
          transportType: fields.transportType as TransportType,
          isActive: fields.isActive,
          isFeatured: fields.isFeatured,
          inclusions: fields.inclusions.trim() || undefined,
          exclusions: fields.exclusions.trim() || undefined,
          cancellationPolicy: fields.cancellationPolicy.trim() || undefined,
          schedules: schedulesToCreate.length ? schedulesToCreate : undefined,
          itineraries: itinerariesToCreate.length ? itinerariesToCreate : undefined,
          images: pendingGallery.length
            ? pendingGallery.map((p) => ({ imageUrl: p.imageUrl }))
            : undefined,
        };
        const res = await createTour(body);
        if (!res.ok) {
          setErr(errorMessage(res.body, res.status));
          return;
        }
        for (const d of transportDrafts) {
          const tr = await addTourTransport(
            res.data.id,
            transportDraftToCreateBody(d),
          );
          if (!tr.ok) {
            setErr(errorMessage(tr.body, tr.status));
            return;
          }
        }
        // Gán nhãn sau khi tạo tour thành công
        if (selectedTagIds.length > 0) {
          await setTourTags(res.data.id, selectedTagIds);
        }
        if (onSavedToList) {
          onSavedToList();
        } else {
          router.push("/tours");
          router.refresh();
        }
        return;
      }

      if (tourId == null) return;
      const body: UpdateTourInput = {
        departureLocationId: dep,
        destinationLocationId: dest,
        name: fields.name.trim(),
        slug: fields.slug.trim() || null,
        description: fields.description.trim() || null,
        durationDays: fields.durationDays
          ? Number(fields.durationDays)
          : null,
        basePrice: fields.basePrice ? Number(fields.basePrice) : null,
        thumbnailUrl: fields.thumbnailUrl.trim() || null,
        tourLine: fields.tourLine as TourLine | null,
        transportType: fields.transportType as TransportType | null,
        isActive: fields.isActive,
        isFeatured: fields.isFeatured,
        inclusions: fields.inclusions.trim() || null,
        exclusions: fields.exclusions.trim() || null,
        cancellationPolicy: fields.cancellationPolicy.trim() || null,
      };
      const res = await updateTour(tourId, body);
      if (!res.ok) {
        setErr(errorMessage(res.body, res.status));
        return;
      }

      // Cập nhật nhãn tour
      const tagRes = await setTourTags(tourId, selectedTagIds);
      if (!tagRes.ok) {
        setErr(errorMessage(tagRes.body, tagRes.status));
        return;
      }

      // ADMIN EDIT: Update Tour (basic fields) trước,
      // sau đó tạo schedule/itinerary mới qua các endpoint riêng.
      for (const s of schedulesToCreate) {
        const r = await addTourSchedule(tourId, s);
        if (!r.ok) {
          setErr(errorMessage(r.body, r.status));
          return;
        }
      }
      for (const it of itinerariesToCreate) {
        const r = await addTourItinerary(tourId, it);
        if (!r.ok) {
          setErr(errorMessage(r.body, r.status));
          return;
        }
      }
      for (const d of transportDrafts) {
        const r = await addTourTransport(tourId, transportDraftToCreateBody(d));
        if (!r.ok) {
          setErr(errorMessage(r.body, r.status));
          return;
        }
        setLocalTransports((prev) => [...prev, r.data]);
      }
      setTransportDrafts([]);

      if (onSavedToList) {
        onSavedToList();
      } else {
        router.push("/tours");
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  function beginEditSchedule(s: TourSchedule) {
    setScheduleModalFieldErrors({});
    setEditingScheduleId(s.id);
    const st = s.status?.trim() ?? "";
    const statusVal = TOUR_SCHEDULE_STATUS_OPTIONS.some((o) => o.value === st)
      ? st
      : st || "OPEN";
    setScheduleEditDraft({
      startDate: isoToDatetimeLocal(s.startDate),
      endDate: isoToDatetimeLocal(s.endDate),
      availableSeats: s.availableSeats != null ? String(s.availableSeats) : "",
      priceOverride:
        s.priceOverride != null ? String(s.priceOverride) : "",
      status: statusVal,
    });
  }

  function beginEditItinerary(it: TourItinerary) {
    setEditingItineraryId(it.id);
    setItineraryEditDraft({
      dayNumber: String(it.dayNumber),
      title: it.title ?? "",
      description: it.description ?? "",
    });
  }

  async function handleUpdateSchedule(scheduleId: number) {
    if (mutating) return;
    setErr(null);

    if (isEmptyScheduleDraft(scheduleEditDraft)) {
      setScheduleModalFieldErrors({
        _row: "Điền đủ thông tin lịch khởi hành.",
      });
      return;
    }

    const fe: Partial<Record<ScheduleFieldErrorKey, string>> = {
      ...getScheduleRowFieldErrors(scheduleEditDraft),
    };
    const seats = parseRequiredPositiveInt(scheduleEditDraft.availableSeats);
    const p = parseOptionalNumberFloat(scheduleEditDraft.priceOverride);
    const current = localSchedules.find((x) => x.id === scheduleId);
    const booked = current?.bookedSeats ?? 0;
    if (seats.ok && seats.value < booked) {
      fe.availableSeats = `Không được nhỏ hơn số đã đặt (${booked}).`;
    }

    if (Object.keys(fe).length > 0) {
      setScheduleModalFieldErrors(fe);
      return;
    }

    if (!seats.ok || !p.ok) {
      return;
    }

    const start = new Date(scheduleEditDraft.startDate);
    const end = new Date(scheduleEditDraft.endDate);

    setMutating(true);
    try {
      const status =
        scheduleEditDraft.status.trim().length > 0
          ? scheduleEditDraft.status.trim()
          : "OPEN";

      const body = {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        availableSeats: seats.value,
        priceOverride: p.value,
        status,
      };

      const res = await updateTourSchedule(scheduleId, body);
      if (!res.ok) {
        setErr(errorMessage(res.body, res.status));
        return;
      }

      setLocalSchedules((prev) =>
        prev.map((x) => (x.id === scheduleId ? res.data : x)),
      );
      closeScheduleEditModal();
    } finally {
      setMutating(false);
    }
  }

  async function handleDeleteSchedule(scheduleId: number) {
    if (mutating) return;
    const row = localSchedules.find((x) => x.id === scheduleId);
    const booked = row?.bookedSeats ?? 0;
    const msg =
      booked > 0
        ? `Lịch này ghi nhận ${booked} chỗ đã đặt (theo dữ liệu lịch). Nếu đã có booking trên hệ thống, việc xóa sẽ bị từ chối cho đến khi không còn booking.\n\nBạn vẫn muốn thử xóa?`
        : "Xóa lịch khởi hành này? Hành động này không thể hoàn tác.";
    if (!window.confirm(msg)) {
      return;
    }

    setErr(null);
    setMutating(true);
    try {
      const res = await removeTourSchedule(scheduleId);
      if (!res.ok) {
        setErr(errorMessage(res.body, res.status));
        return;
      }
      setLocalSchedules((prev) => prev.filter((x) => x.id !== scheduleId));
      if (editingScheduleId === scheduleId) closeScheduleEditModal();
    } finally {
      setMutating(false);
    }
  }

  async function handleUpdateItinerary(itineraryId: number) {
    if (mutating) return;
    const day = Number(itineraryEditDraft.dayNumber);
    if (!Number.isFinite(day) || Math.floor(day) !== day || day < 1) {
      setItineraryModalDayErr("Số ngày phải là số nguyên ≥ 1.");
      return;
    }
    setItineraryModalDayErr(undefined);
    setMutating(true);
    try {
      const title = itineraryEditDraft.title.trim() || undefined;
      const description = itineraryEditDraft.description.trim() || undefined;
      const res = await updateTourItinerary(itineraryId, {
        dayNumber: day,
        title,
        description,
      });
      if (!res.ok) {
        setErr(errorMessage(res.body, res.status));
        return;
      }

      setLocalItineraries((prev) =>
        prev.map((x) => (x.id === itineraryId ? res.data : x)),
      );
      setEditingItineraryId(null);
    } finally {
      setMutating(false);
    }
  }

  async function handleDeleteItinerary(itineraryId: number) {
    if (mutating) return;
    if (
      !window.confirm(
        "Xóa lịch trình này? Hành động này không thể hoàn tác.",
      )
    ) {
      return;
    }

    setErr(null);
    setMutating(true);
    try {
      const res = await removeTourItinerary(itineraryId);
      if (!res.ok) {
        setErr(errorMessage(res.body, res.status));
        return;
      }
      setLocalItineraries((prev) =>
        prev.filter((x) => x.id !== itineraryId),
      );
      if (editingItineraryId === itineraryId) setEditingItineraryId(null);
    } finally {
      setMutating(false);
    }
  }

  // ---------- Transport handlers ----------

  async function saveNewTransportsOnly() {
    if (mode !== "edit" || tourId == null) return;
    setErr(null);
    setTransportNewSectionErr(null);

    if (transportDrafts.length === 0) {
      setTransportNewSectionErr(
        "Chưa có chặng mới nào để lưu. Nhấn «+ Thêm chặng» để thêm dòng.",
      );
      return;
    }

    for (let i = 0; i < transportDrafts.length; i++) {
      const d = transportDrafts[i];
      if (!d.departurePoint.trim() || !d.arrivalPoint.trim()) {
        setTransportNewSectionErr(
          `Chặng #${i + 1}: nhập điểm xuất phát và điểm đến.`,
        );
        return;
      }
    }

    setSavingNewTransports(true);
    try {
      for (const d of transportDrafts) {
        const res = await addTourTransport(
          tourId,
          transportDraftToCreateBody(d),
        );
        if (!res.ok) {
          setErr(errorMessage(res.body, res.status));
          return;
        }
        setLocalTransports((prev) => [...prev, res.data]);
      }
      setTransportDrafts([]);
      router.refresh();
    } finally {
      setSavingNewTransports(false);
    }
  }

  function beginEditTransport(tr: TourTransport) {
    setEditingTransportId(tr.id);
    setTransportEditDraft({
      supplierId: tr.supplierId != null ? String(tr.supplierId) : "",
      legOrder: String(tr.legOrder),
      vehicleType: tr.vehicleType,
      vehicleDetail: tr.vehicleDetail ?? "",
      seatClass: tr.seatClass ?? "",
      departurePoint: tr.departurePoint,
      arrivalPoint: tr.arrivalPoint,
      estimatedHours: tr.estimatedHours != null ? String(tr.estimatedHours) : "",
      notes: tr.notes ?? "",
    });
  }

  async function handleUpdateTransport(transportId: number) {
    if (mutating) return;
    setErr(null);
    setMutating(true);
    try {
      const d = transportEditDraft;
      const res = await updateTourTransport(transportId, {
        supplierId: d.supplierId ? Number(d.supplierId) : undefined,
        legOrder: Number(d.legOrder) || 1,
        vehicleType: d.vehicleType,
        vehicleDetail: d.vehicleDetail.trim() || undefined,
        seatClass: d.seatClass.trim() || undefined,
        departurePoint: d.departurePoint.trim(),
        arrivalPoint: d.arrivalPoint.trim(),
        estimatedHours: d.estimatedHours ? Number(d.estimatedHours) : undefined,
        notes: d.notes.trim() || undefined,
      });
      if (!res.ok) { setErr(errorMessage(res.body, res.status)); return; }
      setLocalTransports((prev) => prev.map((x) => x.id === transportId ? res.data : x));
      setEditingTransportId(null);
    } finally {
      setMutating(false);
    }
  }

  async function handleDeleteTransport(transportId: number) {
    if (mutating) return;
    if (!window.confirm("Xóa chặng vận chuyển này?")) return;
    setErr(null);
    setMutating(true);
    try {
      const res = await removeTourTransport(transportId);
      if (!res.ok) { setErr(errorMessage(res.body, res.status)); return; }
      setLocalTransports((prev) => prev.filter((x) => x.id !== transportId));
      if (editingTransportId === transportId) setEditingTransportId(null);
    } finally {
      setMutating(false);
    }
  }

  // ---------- Accommodation handlers ----------

  async function handleAddAccommodation(itineraryId: number) {
    if (mutating) return;
    if (!accomDraft.hotelName.trim()) {
      setErr("Lưu trú: cần nhập tên khách sạn.");
      return;
    }
    setErr(null);
    setMutating(true);
    try {
      const res = await addItineraryAccommodation(itineraryId, {
        supplierId: accomDraft.supplierId ? Number(accomDraft.supplierId) : undefined,
        hotelName: accomDraft.hotelName.trim(),
        starRating: accomDraft.starRating ? Number(accomDraft.starRating) : undefined,
        roomType: accomDraft.roomType.trim() || undefined,
        checkInNote: accomDraft.checkInNote.trim() || undefined,
        checkOutNote: accomDraft.checkOutNote.trim() || undefined,
        address: accomDraft.address.trim() || undefined,
        mapUrl: accomDraft.mapUrl.trim() || undefined,
      });
      if (!res.ok) { setErr(errorMessage(res.body, res.status)); return; }
      setLocalItineraries((prev) => prev.map((it) =>
        it.id === itineraryId
          ? { ...it, accommodations: [...(it.accommodations ?? []), res.data] }
          : it
      ));
      setAddingAccomForItinerary(null);
      setAccomDraft(emptyAccommodationDraft());
    } finally {
      setMutating(false);
    }
  }

  async function handleDeleteAccommodation(itineraryId: number, accommodationId: number) {
    if (mutating) return;
    if (!window.confirm("Xóa khách sạn này?")) return;
    setErr(null);
    setMutating(true);
    try {
      const res = await removeItineraryAccommodation(accommodationId);
      if (!res.ok) { setErr(errorMessage(res.body, res.status)); return; }
      setLocalItineraries((prev) => prev.map((it) =>
        it.id === itineraryId
          ? { ...it, accommodations: (it.accommodations ?? []).filter((a) => a.id !== accommodationId) }
          : it
      ));
    } finally {
      setMutating(false);
    }
  }

  // ---------- Meal handlers ----------

  async function handleAddMeal(itineraryId: number) {
    if (mutating) return;
    setErr(null);
    setMutating(true);
    try {
      const res = await addItineraryMeal(itineraryId, {
        supplierId: mealDraft.supplierId ? Number(mealDraft.supplierId) : undefined,
        mealType: mealDraft.mealType,
        restaurantName: mealDraft.restaurantName.trim() || undefined,
        menuStyle: mealDraft.menuStyle.trim() || undefined,
        dietaryNotes: mealDraft.dietaryNotes.trim() || undefined,
      });
      if (!res.ok) { setErr(errorMessage(res.body, res.status)); return; }
      setLocalItineraries((prev) => prev.map((it) =>
        it.id === itineraryId
          ? { ...it, meals: [...(it.meals ?? []), res.data] }
          : it
      ));
      setAddingMealForItinerary(null);
      setMealDraft(emptyMealDraft());
    } finally {
      setMutating(false);
    }
  }

  async function handleDeleteMeal(itineraryId: number, mealId: number) {
    if (mutating) return;
    if (!window.confirm("Xóa bữa ăn này?")) return;
    setErr(null);
    setMutating(true);
    try {
      const res = await removeItineraryMeal(mealId);
      if (!res.ok) { setErr(errorMessage(res.body, res.status)); return; }
      setLocalItineraries((prev) => prev.map((it) =>
        it.id === itineraryId
          ? { ...it, meals: (it.meals ?? []).filter((m) => m.id !== mealId) }
          : it
      ));
    } finally {
      setMutating(false);
    }
  }

  async function saveNewSchedulesOnly() {
    if (mode !== "edit" || tourId == null) return;
    setErr(null);
    setScheduleDraftFieldErrors({});
    setScheduleNewSectionErr(null);

    const draftFe: Record<
      number,
      Partial<Record<ScheduleFieldErrorKey, string>>
    > = {};
    for (let i = 0; i < scheduleDrafts.length; i++) {
      const fe = getScheduleRowFieldErrors(scheduleDrafts[i], {
        forbidPastDates: true,
      });
      if (Object.keys(fe).length > 0) {
        draftFe[i] = fe;
      }
    }
    if (Object.keys(draftFe).length > 0) {
      setScheduleDraftFieldErrors(draftFe);
      return;
    }

    const schedulesToCreate: CreateTourScheduleInput[] = [];
    for (let i = 0; i < scheduleDrafts.length; i++) {
      const d = scheduleDrafts[i];
      if (isEmptyScheduleDraft(d)) continue;
      const start = new Date(d.startDate);
      const end = new Date(d.endDate);
      const seats = parseRequiredPositiveInt(d.availableSeats);
      const p = parseOptionalNumberFloat(d.priceOverride);
      if (!seats.ok || !p.ok) return;
      const st = (d.status.trim() || "OPEN") as
        | "OPEN"
        | "ACTIVE"
        | "FULL"
        | "CANCELLED";
      schedulesToCreate.push({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        availableSeats: seats.value,
        priceOverride: p.value,
        status: st,
      });
    }

    if (schedulesToCreate.length === 0) {
      setScheduleNewSectionErr("Chưa có lịch nào hợp lệ để lưu. Vui lòng kiểm tra lại các trường bắt buộc.");
      return;
    }

    setSavingNewSchedules(true);
    try {
      for (const s of schedulesToCreate) {
        const r = await addTourSchedule(tourId, s);
        if (!r.ok) {
          setErr(errorMessage(r.body, r.status));
          return;
        }
        setLocalSchedules((prev) => [...prev, r.data]);
      }
      setScheduleDrafts([]);
      setScheduleDraftFieldErrors({});
      router.refresh();
    } finally {
      setSavingNewSchedules(false);
    }
  }

  async function saveNewItinerariesOnly() {
    if (mode !== "edit" || tourId == null) return;
    setErr(null);
    setItineraryDraftDayErrors({});
    setItineraryNewSectionErr(null);

    const dayErrors: Record<number, string> = {};
    const itinerariesToCreate: CreateTourItineraryInput[] = [];
    for (let i = 0; i < itineraryDrafts.length; i++) {
      const it = itineraryDrafts[i];
      if (isEmptyItineraryDraft(it)) continue;
      const day = Number(it.dayNumber);
      if (!Number.isFinite(day) || Math.floor(day) !== day || day < 1) {
        dayErrors[i] = "Số nguyên ≥ 1.";
      } else {
        itinerariesToCreate.push({
          dayNumber: day,
          title: it.title.trim() || undefined,
          description: it.description.trim() || undefined,
        });
      }
    }
    if (Object.keys(dayErrors).length > 0) {
      setItineraryDraftDayErrors(dayErrors);
      return;
    }

    if (itinerariesToCreate.length === 0) {
      setItineraryNewSectionErr("Chưa có lịch trình nào hợp lệ để lưu. Vui lòng nhập số ngày.");
      return;
    }

    setSavingNewItineraries(true);
    try {
      for (const it of itinerariesToCreate) {
        const r = await addTourItinerary(tourId, it);
        if (!r.ok) {
          setErr(errorMessage(r.body, r.status));
          return;
        }
        setLocalItineraries((prev) => [...prev, r.data]);
      }
      setItineraryDrafts([]);
      router.refresh();
    } finally {
      setSavingNewItineraries(false);
    }
  }

  const disabled =
    saving ||
    savingNewSchedules ||
    savingNewItineraries ||
    locations.length === 0;

  return (
    <form className="mx-auto max-w-3xl space-y-6" onSubmit={onSubmit}>
      <Link
        href="/tours"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-sky-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Về danh sách
      </Link>

      {locations.length === 0 ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Thiếu địa điểm. Chạy seed / kiểm tra API locations.
        </p>
      ) : null}

      {err ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {err}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm text-slate-600">
            Tên tour *
          </label>
          <input
            required
            value={fields.name}
            onChange={(e) => set("name", e.target.value)}
            className={`w-full rounded-lg border bg-white px-3 py-2.5 text-slate-900 ${ringError(!!tourFieldErrors.name)}`}
          />
          <InlineFieldError message={tourFieldErrors.name} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-slate-600">Slug</label>
          <input
            value={fields.slug}
            onChange={(e) => set("slug", e.target.value)}
            placeholder="tour-mien-tay"
            className={`w-full rounded-lg border bg-white px-3 py-2.5 text-slate-900 ${ringError(!!tourFieldErrors.slug)}`}
          />
          <InlineFieldError message={tourFieldErrors.slug} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-slate-600">
            Điểm khởi hành *
          </label>
          <select
            value={fields.departureLocationId}
            onChange={(e) => set("departureLocationId", e.target.value)}
            className={`w-full rounded-lg border bg-white px-3 py-2.5 text-slate-900 ${ringError(
              !!tourFieldErrors.departureLocationId,
            )}`}
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name ?? `#${l.id}`}
              </option>
            ))}
          </select>
          <InlineFieldError message={tourFieldErrors.departureLocationId} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-slate-600">
            Điểm đến *
          </label>
          <select
            value={fields.destinationLocationId}
            onChange={(e) => set("destinationLocationId", e.target.value)}
            className={`w-full rounded-lg border bg-white px-3 py-2.5 text-slate-900 ${ringError(
              !!tourFieldErrors.destinationLocationId,
            )}`}
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name ?? `#${l.id}`}
              </option>
            ))}
          </select>
          <InlineFieldError message={tourFieldErrors.destinationLocationId} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-slate-600">
            Số ngày
          </label>
          <input
            type="number"
            min={1}
            value={fields.durationDays}
            onChange={(e) => {
              const v = e.target.value;
              setFields((f) => ({ ...f, durationDays: v }));
              setTourFieldErrors((prev) => {
                const next = { ...prev };
                const msg = tourDurationDaysInlineError(v);
                if (msg) next.durationDays = msg;
                else delete next.durationDays;
                return next;
              });
            }}
            className={`w-full rounded-lg border bg-white px-3 py-2.5 text-slate-900 ${ringError(
              !!tourFieldErrors.durationDays,
            )}`}
          />
          <InlineFieldError message={tourFieldErrors.durationDays} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-slate-600">
            Giá cơ bản (VND)
          </label>
          <input
            type="number"
            inputMode="numeric"
            step={1}
            value={fields.basePrice}
            onChange={(e) => {
              const v = e.target.value;
              setFields((f) => ({ ...f, basePrice: v }));
              setTourFieldErrors((prev) => {
                const next = { ...prev };
                const msg = tourBasePriceInlineError(v);
                if (msg) next.basePrice = msg;
                else delete next.basePrice;
                return next;
              });
            }}
            className={`w-full rounded-lg border bg-white px-3 py-2.5 text-slate-900 [-moz-appearance:textfield] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${ringError(
              !!tourFieldErrors.basePrice,
            )}`}
          />
          <InlineFieldError message={tourFieldErrors.basePrice} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-slate-600">
            Dòng tour
          </label>
          <select
            value={fields.tourLine}
            onChange={(e) => set("tourLine", e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900"
          >
            <option value="PREMIUM">Cao cấp</option>
            <option value="STANDARD">Tiêu chuẩn</option>
            <option value="ECONOMY">Tiết kiệm</option>
            <option value="GOOD_VALUE">Giá tốt</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-slate-600">
            Phương tiện
          </label>
          <select
            value={fields.transportType}
            onChange={(e) => set("transportType", e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900"
          >
            <option value="BUS">Xe khách</option>
            <option value="FLIGHT">Máy bay</option>
            <option value="MIXED">Kết hợp</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm text-slate-600">
            URL ảnh đại diện
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <input
              ref={thumbInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                void onThumbFile(f);
                e.target.value = "";
              }}
            />
            <div className="min-w-0 flex-1 space-y-2">
              <input
                type="url"
                value={fields.thumbnailUrl}
                onChange={(e) => set("thumbnailUrl", e.target.value)}
                placeholder="https://..."
                className={`w-full rounded-lg border bg-white px-3 py-2.5 text-slate-900 ${ringError(
                  !!tourFieldErrors.thumbnailUrl,
                )}`}
              />
              <InlineFieldError message={tourFieldErrors.thumbnailUrl} />
              <button
                type="button"
                disabled={uploadingThumb}
                onClick={() => thumbInputRef.current?.click()}
                className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-100 disabled:opacity-50"
              >
                {uploadingThumb ? "Đang tải…" : "Tải ảnh lên"}
              </button>
            </div>
            {fields.thumbnailUrl.trim() ? (
              <div className="w-full shrink-0 sm:w-40">
                <TourImagePreview
                  url={fields.thumbnailUrl.trim()}
                  name="Ảnh đại diện"
                  className="max-h-28"
                />
              </div>
            ) : null}
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm text-slate-600">
            Ảnh bổ sung (thư viện)
          </label>
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              void onGalleryFile(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={uploadingGallery || (mode === "edit" && tourId == null)}
            onClick={() => galleryInputRef.current?.click()}
            className="mb-3 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-100 disabled:opacity-50"
          >
            {uploadingGallery ? "Đang tải…" : "Thêm ảnh vào thư viện"}
          </button>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mode === "create"
              ? pendingGallery.map((p) => (
                  <div
                    key={p.id}
                    className="relative overflow-hidden rounded-lg border border-slate-200"
                  >
                    <TourImagePreview
                      url={p.imageUrl}
                      name="Ảnh tour"
                      className="aspect-[16/10]"
                    />
                    <button
                      type="button"
                      onClick={() => removePendingRow(p.id)}
                      className="absolute right-2 top-2 rounded bg-white/90 px-2 py-0.5 text-xs text-red-700 shadow"
                    >
                      Xóa
                    </button>
                  </div>
                ))
              : localImages.map((im) => (
                  <div
                    key={im.id}
                    className="relative overflow-hidden rounded-lg border border-slate-200"
                  >
                    <TourImagePreview
                      url={im.imageUrl}
                      name="Ảnh tour"
                      className="aspect-[16/10]"
                    />
                    <button
                      type="button"
                      disabled={mutating}
                      onClick={() => void removeGalleryRow(im)}
                      className="absolute right-2 top-2 rounded bg-white/90 px-2 py-0.5 text-xs text-red-700 shadow disabled:opacity-50"
                    >
                      Xóa
                    </button>
                  </div>
                ))}
          </div>
          {mode === "create" && !pendingGallery.length ? (
            <p className="text-xs text-slate-500">
              Tùy chọn. Có thể thêm sau khi đã tạo tour (mục sửa tour).
            </p>
          ) : null}
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm text-slate-600">Mô tả</label>
          <textarea
            rows={4}
            value={fields.description}
            onChange={(e) => set("description", e.target.value)}
            className={`w-full rounded-lg border bg-white px-3 py-2.5 text-slate-900 ${ringError(
              !!tourFieldErrors.description,
            )}`}
          />
          <InlineFieldError message={tourFieldErrors.description} />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm text-slate-600">
            Dịch vụ bao gồm
          </label>
          <textarea
            rows={3}
            value={fields.inclusions}
            onChange={(e) => set("inclusions", e.target.value)}
            placeholder="VD: Vé máy bay khứ hồi, Khách sạn 4 sao, Ăn sáng mỗi ngày..."
            className={`w-full rounded-lg border bg-white px-3 py-2.5 text-slate-900 ${ringError(
              !!tourFieldErrors.inclusions,
            )}`}
          />
          <InlineFieldError message={tourFieldErrors.inclusions} />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm text-slate-600">
            Dịch vụ không bao gồm
          </label>
          <textarea
            rows={3}
            value={fields.exclusions}
            onChange={(e) => set("exclusions", e.target.value)}
            placeholder="VD: Visa, Chi phí cá nhân, Bữa ăn tự chọn..."
            className={`w-full rounded-lg border bg-white px-3 py-2.5 text-slate-900 ${ringError(
              !!tourFieldErrors.exclusions,
            )}`}
          />
          <InlineFieldError message={tourFieldErrors.exclusions} />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm text-slate-600">
            Chính sách hủy tour
          </label>
          <textarea
            rows={3}
            value={fields.cancellationPolicy}
            onChange={(e) => set("cancellationPolicy", e.target.value)}
            placeholder="VD: Hủy trước 15 ngày: hoàn 100%. Hủy trước 7 ngày: hoàn 50%..."
            className={`w-full rounded-lg border bg-white px-3 py-2.5 text-slate-900 ${ringError(
              !!tourFieldErrors.cancellationPolicy,
            )}`}
          />
          <InlineFieldError message={tourFieldErrors.cancellationPolicy} />
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 sm:col-span-2">
          <div className="flex items-center gap-2">
            <input
              id="isActive"
              type="checkbox"
              checked={fields.isActive}
              onChange={(e) => set("isActive", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 bg-white"
            />
            <label htmlFor="isActive" className="text-sm text-slate-700">
              Tour đang mở bán
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="isFeatured"
              type="checkbox"
              checked={fields.isFeatured}
              onChange={(e) => set("isFeatured", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 bg-white"
            />
            <label htmlFor="isFeatured" className="text-sm text-slate-700">
              Tour nổi bật
            </label>
          </div>
        </div>

        {/* Nhãn danh mục */}
        {allTags.length > 0 && (
          <div className="sm:col-span-2">
            <p className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Nhãn danh mục
            </p>
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => {
                const active = selectedTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() =>
                      setSelectedTagIds((prev) =>
                        active ? prev.filter((id) => id !== tag.id) : [...prev, tag.id],
                      )
                    }
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      active
                        ? "border-teal-500 bg-teal-50 text-teal-700"
                        : "border-slate-200 text-slate-600 hover:border-teal-300 hover:bg-teal-50"
                    }`}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
            {selectedTagIds.length === 0 && (
              <p className="mt-1 text-xs text-slate-400">Chưa chọn nhãn nào</p>
            )}
          </div>
        )}
      </div>

      {mode === "edit" && localTransports.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">
            Chặng vận chuyển hiện có
          </h2>
          <div className="mt-3 space-y-2">
            {localTransports.map((tr) => (
              <div
                key={tr.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-semibold text-slate-800">
                      Chặng {tr.legOrder}:
                    </span>{" "}
                    {VEHICLE_TYPE_LABELS[tr.vehicleType as VehicleType] ?? tr.vehicleType}{" "}
                    {tr.vehicleDetail ? `(${tr.vehicleDetail})` : ""}
                    <div className="mt-1 text-slate-600">
                      {tr.departurePoint} → {tr.arrivalPoint}
                      {tr.estimatedHours ? ` · ${tr.estimatedHours}h` : ""}
                    </div>
                    {tr.supplier ? (
                      <div className="mt-0.5 text-slate-500">
                        Đơn vị: {tr.supplier.name}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => beginEditTransport(tr)}
                      disabled={mutating}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteTransport(tr.id)}
                      disabled={mutating}
                      className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {mode === "edit" &&
      (localSchedules.length > 0 || localItineraries.length > 0) ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-800">
              Lịch khởi hành hiện có
            </h2>
            <div className="mt-3 space-y-3">
              {localSchedules.length ? (
                localSchedules.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-lg border border-slate-200 bg-white p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {formatDateTimeVi(s.startDate)} -{" "}
                          {formatDateTimeVi(s.endDate)}
                        </div>
                        <div className="mt-1 text-xs text-slate-600">
                          Chỗ:{" "}
                          {s.availableSeats != null
                            ? String(s.availableSeats)
                            : "—"}{" "}
                          / Đã đặt:{" "}
                          {s.bookedSeats != null
                            ? String(s.bookedSeats)
                            : "—"}{" "}
                          {s.priceOverride != null
                            ? `| Giá override: ${s.priceOverride}`
                            : ""}
                        </div>
                        {s.status ? (
                          <div className="mt-1 text-xs text-slate-600">
                            Trạng thái: {labelScheduleStatus(s.status)}
                          </div>
                        ) : null}
                        {s.deletedAt ? (
                          <div className="mt-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900">
                            Đã ẩn khỏi site user — toàn bộ lịch tour đã kết
                            thúc
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => beginEditSchedule(s)}
                          disabled={mutating}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteSchedule(s.id)}
                          disabled={mutating}
                          className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  Chưa có lịch khởi hành.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-800">
              Lịch trình hiện có
            </h2>
            <div className="mt-3 space-y-3">
              {localItineraries.length ? (
                localItineraries.map((it) => (
                  <div
                    key={it.id}
                    className="rounded-lg border border-slate-200 bg-white p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          Ngày {it.dayNumber}
                        </div>
                        {it.title ? (
                          <div className="mt-1 text-xs font-medium text-slate-700">
                            {it.title}
                          </div>
                        ) : null}
                        {it.description ? (
                          <div className="mt-1 text-xs text-slate-600">
                            {it.description}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => beginEditItinerary(it)}
                          disabled={mutating}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteItinerary(it.id)}
                          disabled={mutating}
                          className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>

                    {/* Lưu trú */}
                    <div className="mt-3 border-t border-slate-100 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700">
                          🏨 Lưu trú
                        </span>
                        <button
                          type="button"
                          disabled={mutating}
                          onClick={() => {
                            setAddingAccomForItinerary(it.id);
                            setAccomDraft(emptyAccommodationDraft());
                          }}
                          className="rounded border border-slate-200 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        >
                          + Thêm
                        </button>
                      </div>
                      {(it.accommodations ?? []).length > 0 ? (
                        <div className="mt-1 space-y-1">
                          {(it.accommodations ?? []).map((a) => (
                            <div
                              key={a.id}
                              className="flex items-center justify-between rounded bg-blue-50 px-2 py-1 text-[11px] text-blue-900"
                            >
                              <span>
                                {a.hotelName}
                                {a.starRating ? ` ${"★".repeat(a.starRating)}` : ""}
                                {a.roomType ? ` · ${a.roomType}` : ""}
                                {a.supplier ? ` · ${a.supplier.name}` : ""}
                              </span>
                              <button
                                type="button"
                                disabled={mutating}
                                onClick={() => void handleDeleteAccommodation(it.id, a.id)}
                                className="ml-2 text-red-600 hover:text-red-800 disabled:opacity-50"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-1 text-[11px] text-slate-400">
                          Chưa có lưu trú.
                        </p>
                      )}
                    </div>

                    {/* Bữa ăn */}
                    <div className="mt-2 border-t border-slate-100 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700">
                          🍽 Bữa ăn
                        </span>
                        <button
                          type="button"
                          disabled={mutating}
                          onClick={() => {
                            setAddingMealForItinerary(it.id);
                            setMealDraft(emptyMealDraft());
                          }}
                          className="rounded border border-slate-200 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        >
                          + Thêm
                        </button>
                      </div>
                      {(it.meals ?? []).length > 0 ? (
                        <div className="mt-1 space-y-1">
                          {(it.meals ?? []).map((m) => (
                            <div
                              key={m.id}
                              className="flex items-center justify-between rounded bg-green-50 px-2 py-1 text-[11px] text-green-900"
                            >
                              <span>
                                {MEAL_TYPE_LABELS[m.mealType as MealType] ?? m.mealType}
                                {m.restaurantName ? ` · ${m.restaurantName}` : ""}
                                {m.menuStyle ? ` (${m.menuStyle})` : ""}
                              </span>
                              <button
                                type="button"
                                disabled={mutating}
                                onClick={() => void handleDeleteMeal(it.id, m.id)}
                                className="ml-2 text-red-600 hover:text-red-800 disabled:opacity-50"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-1 text-[11px] text-slate-400">
                          Chưa có bữa ăn.
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  Chưa có lịch trình.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {editingScheduleId != null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onMouseDown={() => closeScheduleEditModal()}
          />
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Sửa lịch khởi hành #{editingScheduleId}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                </p>
              </div>
              <button
                type="button"
                disabled={mutating}
                onClick={() => closeScheduleEditModal()}
                className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Đóng
              </button>
            </div>

            <InlineFieldError message={scheduleModalFieldErrors._row} />

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-slate-600">
                  Bắt đầu *
                </label>
                <input
                  type="datetime-local"
                  value={scheduleEditDraft.startDate}
                  onChange={(e) => {
                    setScheduleEditDraft((prev) => ({
                      ...prev,
                      startDate: e.target.value,
                    }));
                    clearScheduleModalCell("startDate");
                    clearScheduleModalCell("_row");
                  }}
                  className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 ${ringError(
                    !!scheduleModalFieldErrors.startDate,
                  )}`}
                />
                <InlineFieldError message={scheduleModalFieldErrors.startDate} />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-slate-600">
                  Kết thúc *
                </label>
                <input
                  type="datetime-local"
                  value={scheduleEditDraft.endDate}
                  onChange={(e) => {
                    setScheduleEditDraft((prev) => ({
                      ...prev,
                      endDate: e.target.value,
                    }));
                    clearScheduleModalCell("endDate");
                    clearScheduleModalCell("_row");
                  }}
                  className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 ${ringError(
                    !!scheduleModalFieldErrors.endDate,
                  )}`}
                />
                <InlineFieldError message={scheduleModalFieldErrors.endDate} />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-600">
                  Số chỗ *
                </label>
                <input
                  type="number"
                  min={1}
                  value={scheduleEditDraft.availableSeats}
                  onChange={(e) => {
                    setScheduleEditDraft((prev) => ({
                      ...prev,
                      availableSeats: e.target.value,
                    }));
                    clearScheduleModalCell("availableSeats");
                    clearScheduleModalCell("_row");
                  }}
                  className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 ${ringError(
                    !!scheduleModalFieldErrors.availableSeats,
                  )}`}
                />
                <InlineFieldError message={scheduleModalFieldErrors.availableSeats} />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-600">
                  Đã đặt 
                </label>
                <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                  {String(
                    localSchedules.find((x) => x.id === editingScheduleId)
                      ?.bookedSeats ?? 0,
                  )}
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-600">
                  Giá override (VND)
                </label>
                <input
                  type="number"
                  min={0}
                  value={scheduleEditDraft.priceOverride}
                  onChange={(e) => {
                    setScheduleEditDraft((prev) => ({
                      ...prev,
                      priceOverride: e.target.value,
                    }));
                    clearScheduleModalCell("priceOverride");
                    clearScheduleModalCell("_row");
                  }}
                  className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 ${ringError(
                    !!scheduleModalFieldErrors.priceOverride,
                  )}`}
                />
                <InlineFieldError message={scheduleModalFieldErrors.priceOverride} />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-600">
                  Trạng thái
                </label>
                <select
                  value={scheduleEditDraft.status}
                  onChange={(e) => {
                    setScheduleEditDraft((prev) => ({
                      ...prev,
                      status: e.target.value,
                    }));
                    clearScheduleModalCell("status");
                    clearScheduleModalCell("_row");
                  }}
                  className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 ${ringError(
                    !!scheduleModalFieldErrors.status,
                  )}`}
                >
                  {TOUR_SCHEDULE_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                  {scheduleEditDraft.status &&
                  !TOUR_SCHEDULE_STATUS_OPTIONS.some(
                    (o) => o.value === scheduleEditDraft.status,
                  ) ? (
                    <option value={scheduleEditDraft.status}>
                      {scheduleEditDraft.status} (trong DB)
                    </option>
                  ) : null}
                </select>
                <InlineFieldError message={scheduleModalFieldErrors.status} />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleUpdateSchedule(editingScheduleId)}
                disabled={mutating}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
              >
                {mutating ? "Đang lưu..." : "Lưu"}
              </button>
              <button
                type="button"
                onClick={() => closeScheduleEditModal()}
                disabled={mutating}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteSchedule(editingScheduleId)}
                disabled={mutating}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editingItineraryId != null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onMouseDown={() => setEditingItineraryId(null)}
          />
          <div className="relative w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Sửa lịch trình #{editingItineraryId}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Cập nhật lịch trình (tác động ngay).
                </p>
              </div>
              <button
                type="button"
                disabled={mutating}
                onClick={() => {
                  setEditingItineraryId(null);
                  setItineraryModalDayErr(undefined);
                }}
                className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Đóng
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-slate-600">
                  Số ngày *
                </label>
                <input
                  type="number"
                  min={1}
                  value={itineraryEditDraft.dayNumber}
                  onChange={(e) => {
                    setItineraryEditDraft((prev) => ({
                      ...prev,
                      dayNumber: e.target.value,
                    }));
                    setItineraryModalDayErr(undefined);
                  }}
                  className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 ${ringError(!!itineraryModalDayErr)}`}
                />
                <InlineFieldError message={itineraryModalDayErr} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">
                  Title
                </label>
                <input
                  value={itineraryEditDraft.title}
                  onChange={(e) =>
                    setItineraryEditDraft((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-slate-600">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={itineraryEditDraft.description}
                  onChange={(e) =>
                    setItineraryEditDraft((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  void handleUpdateItinerary(editingItineraryId)
                }
                disabled={mutating}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
              >
                {mutating ? "Đang lưu..." : "Lưu"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingItineraryId(null);
                  setItineraryModalDayErr(undefined);
                }}
                disabled={mutating}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteItinerary(editingItineraryId)}
                disabled={mutating}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        {mode === "create" ? (
          <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          </p>
        ) : null}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-800">
              Lịch khởi hành
            </h2>
            <div className={SECTION_HEADER_ACTIONS_GRID}>
              <button
                type="button"
                onClick={() => void saveNewSchedulesOnly()}
                disabled={
                  saving ||
                  savingNewSchedules ||
                  mutating ||
                  mode !== "edit" ||
                  tourId == null
                }
                className="inline-flex h-8 w-full items-center justify-center whitespace-nowrap rounded-md border border-transparent bg-sky-600 px-2 text-xs font-semibold leading-normal text-white hover:bg-sky-500 disabled:opacity-50"
              >
                {savingNewSchedules ? "Đang lưu…" : "Lưu"}
              </button>
              <button
                type="button"
                onClick={() =>
                  setScheduleDrafts((prev) => [
                    ...prev,
                    {
                      startDate: "",
                      endDate: "",
                      availableSeats: "",
                      priceOverride: "",
                      status: "OPEN",
                    },
                  ])
                }
                disabled={saving || savingNewSchedules || mutating}
                className="inline-flex h-8 w-full items-center justify-center whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold leading-normal text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                + Thêm lịch
              </button>
            </div>
          </div>

          {scheduleNewSectionErr ? (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {scheduleNewSectionErr}
            </p>
          ) : null}

          {scheduleDrafts.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              Chưa có lịch mới nào để tạo.
            </p>
          ) : (
            <div className="mt-3 space-y-4">
              {scheduleDrafts.map((d, idx) => {
                const rowFe = scheduleDraftFieldErrors[idx];
                const rowHasErr =
                  rowFe != null && Object.keys(rowFe).length > 0;
                return (
                <div
                  key={idx}
                  className={`rounded-lg border bg-white p-3 ${
                    rowHasErr ? "border-red-300" : "border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-xs font-semibold text-slate-700">
                      Lịch #{idx + 1}
                    </div>
                    <button
                      type="button"
                      disabled={
                        saving ||
                        savingNewSchedules ||
                        savingNewItineraries ||
                        mutating
                      }
                      onClick={() => {
                        setScheduleDraftFieldErrors({});
                        setScheduleDrafts((prev) =>
                          prev.filter((_, i) => i !== idx),
                        );
                      }}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Xóa
                    </button>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs text-slate-600">
                        Bắt đầu *
                      </label>
                      <input
                        type="datetime-local"
                        min={datetimeLocalMinNow()}
                        value={d.startDate}
                        onChange={(e) =>
                          patchScheduleDraft(idx, { startDate: e.target.value }, "startDate")
                        }
                        className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 ${ringError(
                          !!rowFe?.startDate,
                        )}`}
                      />
                      <InlineFieldError message={rowFe?.startDate} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-600">
                        Kết thúc *
                      </label>
                      <input
                        type="datetime-local"
                        min={scheduleDraftEndDatetimeLocalMin(d.startDate)}
                        value={d.endDate}
                        onChange={(e) =>
                          patchScheduleDraft(idx, { endDate: e.target.value }, "endDate")
                        }
                        className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 ${ringError(
                          !!rowFe?.endDate,
                        )}`}
                      />
                      <InlineFieldError message={rowFe?.endDate} />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs text-slate-600">
                        Số chỗ  *
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={d.availableSeats}
                        onChange={(e) =>
                          patchScheduleDraft(
                            idx,
                            { availableSeats: e.target.value },
                            "availableSeats",
                          )
                        }
                        className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 ${ringError(
                          !!rowFe?.availableSeats,
                        )}`}
                      />
                      <InlineFieldError message={rowFe?.availableSeats} />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs text-slate-600">
                        Giá override (VND)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={d.priceOverride}
                        onChange={(e) =>
                          patchScheduleDraft(
                            idx,
                            { priceOverride: e.target.value },
                            "priceOverride",
                          )
                        }
                        className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 ${ringError(
                          !!rowFe?.priceOverride,
                        )}`}
                      />
                      <InlineFieldError message={rowFe?.priceOverride} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-600">
                        Trạng thái
                      </label>
                      <select
                        value={d.status}
                        onChange={(e) =>
                          patchScheduleDraft(idx, { status: e.target.value }, "status")
                        }
                        className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 ${ringError(
                          !!rowFe?.status,
                        )}`}
                      >
                        {TOUR_SCHEDULE_STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <InlineFieldError message={rowFe?.status} />
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-800">
              Lịch trình
            </h2>
            <div className={SECTION_HEADER_ACTIONS_GRID}>
              <button
                type="button"
                onClick={() => void saveNewItinerariesOnly()}
                disabled={
                  saving ||
                  savingNewItineraries ||
                  mutating ||
                  mode !== "edit" ||
                  tourId == null
                }
                className="inline-flex h-8 w-full items-center justify-center whitespace-nowrap rounded-md border border-transparent bg-sky-600 px-2 text-xs font-semibold leading-normal text-white hover:bg-sky-500 disabled:opacity-50"
              >
                {savingNewItineraries ? "Đang lưu…" : "Lưu"}
              </button>
              <button
                type="button"
                onClick={() =>
                  setItineraryDrafts((prev) => [
                    ...prev,
                    { dayNumber: "", title: "", description: "" },
                  ])
                }
                disabled={saving || savingNewItineraries || mutating}
                className="inline-flex h-8 w-full items-center justify-center whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold leading-normal text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                + Thêm ngày
              </button>
            </div>
          </div>

          {itineraryNewSectionErr ? (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {itineraryNewSectionErr}
            </p>
          ) : null}

          {itineraryDrafts.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              Chưa có lịch trình mới nào để tạo.
            </p>
          ) : (
            <div className="mt-3 space-y-4">
              {itineraryDrafts.map((d, idx) => {
                const dayErr = itineraryDraftDayErrors[idx];
                return (
                <div
                  key={idx}
                  className={`rounded-lg border bg-white p-3 ${dayErr ? "border-red-300" : "border-slate-200"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-xs font-semibold text-slate-700">
                      Lịch trình #{idx + 1}
                    </div>
                    <button
                      type="button"
                      disabled={
                        saving ||
                        savingNewSchedules ||
                        savingNewItineraries ||
                        mutating
                      }
                      onClick={() =>
                        setItineraryDrafts((prev) =>
                          prev.filter((_, i) => i !== idx),
                        )
                      }
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Xóa
                    </button>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs text-slate-600">
                        Số ngày *
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={d.dayNumber}
                        onChange={(e) => {
                          setItineraryDrafts((prev) =>
                            prev.map((x, i) =>
                              i === idx
                                ? { ...x, dayNumber: e.target.value }
                                : x,
                            ),
                          );
                          setItineraryDraftDayErrors((prev) => {
                            if (!prev[idx]) return prev;
                            const next = { ...prev };
                            delete next[idx];
                            return next;
                          });
                          setItineraryNewSectionErr(null);
                        }}
                        className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 ${ringError(!!dayErr)}`}
                      />
                      <InlineFieldError message={dayErr} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-600">
                        Title
                      </label>
                      <input
                        value={d.title}
                        onChange={(e) =>
                          setItineraryDrafts((prev) =>
                            prev.map((x, i) =>
                              i === idx ? { ...x, title: e.target.value } : x,
                            ),
                          )
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs text-slate-600">
                        Description
                      </label>
                      <textarea
                        rows={3}
                        value={d.description}
                        onChange={(e) =>
                          setItineraryDrafts((prev) =>
                            prev.map((x, i) =>
                              i === idx
                                ? { ...x, description: e.target.value }
                                : x,
                            ),
                          )
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
                      />
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-800">
                Chặng vận chuyển
              </h2>
              <div className={SECTION_HEADER_ACTIONS_GRID}>
                <button
                  type="button"
                  onClick={() => void saveNewTransportsOnly()}
                  disabled={
                    saving ||
                    savingNewTransports ||
                    mutating ||
                    mode !== "edit" ||
                    tourId == null
                  }
                  className="inline-flex h-8 w-full items-center justify-center whitespace-nowrap rounded-md border border-transparent bg-sky-600 px-2 text-xs font-semibold leading-normal text-white hover:bg-sky-500 disabled:opacity-50"
                >
                  {savingNewTransports ? "Đang lưu…" : "Lưu"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTransportNewSectionErr(null);
                    setTransportDrafts((prev) => [
                      ...prev,
                      emptyTransportDraft(
                        localTransports.length + prev.length + 1,
                      ),
                    ]);
                  }}
                  disabled={saving || savingNewTransports || mutating}
                  className="inline-flex h-8 w-full items-center justify-center whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold leading-normal text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  + Thêm chặng
                </button>
              </div>
            </div>

            {transportNewSectionErr ? (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {transportNewSectionErr}
              </p>
            ) : null}

            {transportDrafts.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                Chưa có chặng vận chuyển mới nào để tạo.
              </p>
            ) : (
              <div className="mt-3 space-y-4">
                {transportDrafts.map((d, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700">
                        Chặng #{idx + 1}
                      </span>
                      <button
                        type="button"
                        disabled={
                          saving || savingNewTransports || mutating
                        }
                        onClick={() =>
                          setTransportDrafts((prev) =>
                            prev.filter((_, i) => i !== idx),
                          )
                        }
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                      >
                        Xóa
                      </button>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs text-slate-600">
                          Thứ tự chặng *
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={d.legOrder}
                          onChange={(e) =>
                            setTransportDrafts((prev) =>
                              prev.map((x, i) => i === idx ? { ...x, legOrder: e.target.value } : x)
                            )
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-600">
                          Loại phương tiện *
                        </label>
                        <select
                          value={d.vehicleType}
                          onChange={(e) =>
                            setTransportDrafts((prev) =>
                              prev.map((x, i) => i === idx ? { ...x, vehicleType: e.target.value as VehicleType } : x)
                            )
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                        >
                          {Object.entries(VEHICLE_TYPE_LABELS).map(([v, label]) => (
                            <option key={v} value={v}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-600">
                          Chi tiết phương tiện
                        </label>
                        <input
                          value={d.vehicleDetail}
                          placeholder="VD: Boeing 737, Xe Phương Trang"
                          onChange={(e) =>
                            setTransportDrafts((prev) =>
                              prev.map((x, i) => i === idx ? { ...x, vehicleDetail: e.target.value } : x)
                            )
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-600">
                          Hạng ghế
                        </label>
                        <input
                          value={d.seatClass}
                          placeholder="VD: Economy, Ghế mềm"
                          onChange={(e) =>
                            setTransportDrafts((prev) =>
                              prev.map((x, i) => i === idx ? { ...x, seatClass: e.target.value } : x)
                            )
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-600">
                          Điểm xuất phát *
                        </label>
                        <input
                          value={d.departurePoint}
                          placeholder="VD: Sân bay Nội Bài"
                          onChange={(e) =>
                            setTransportDrafts((prev) =>
                              prev.map((x, i) => i === idx ? { ...x, departurePoint: e.target.value } : x)
                            )
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-600">
                          Điểm đến *
                        </label>
                        <input
                          value={d.arrivalPoint}
                          placeholder="VD: Sân bay Đà Nẵng"
                          onChange={(e) =>
                            setTransportDrafts((prev) =>
                              prev.map((x, i) => i === idx ? { ...x, arrivalPoint: e.target.value } : x)
                            )
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-600">
                          Thời gian ước tính (giờ)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={0.5}
                          value={d.estimatedHours}
                          onChange={(e) =>
                            setTransportDrafts((prev) =>
                              prev.map((x, i) => i === idx ? { ...x, estimatedHours: e.target.value } : x)
                            )
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-600">
                          Đơn vị vận chuyển
                        </label>
                        <select
                          value={d.supplierId}
                          onChange={(e) =>
                            setTransportDrafts((prev) =>
                              prev.map((x, i) => i === idx ? { ...x, supplierId: e.target.value } : x)
                            )
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                        >
                          <option value="">— Chưa chọn —</option>
                          {suppliers
                            .filter((s) => s.type === "TRANSPORT" && s.isActive)
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
      </div>

      {/* Modal thêm lưu trú */}
      {addingAccomForItinerary != null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onMouseDown={() => setAddingAccomForItinerary(null)}
          />
          <div className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Thêm lưu trú cho ngày lịch trình
              </h3>
              <button
                type="button"
                onClick={() => setAddingAccomForItinerary(null)}
                className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
              >
                Đóng
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-slate-600">Tên khách sạn *</label>
                <input
                  value={accomDraft.hotelName}
                  onChange={(e) => setAccomDraft((p) => ({ ...p, hotelName: e.target.value }))}
                  placeholder="VD: KS Mường Thanh Grand Đà Nẵng"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">Sao (1–5)</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={accomDraft.starRating}
                  onChange={(e) => setAccomDraft((p) => ({ ...p, starRating: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">Loại phòng</label>
                <input
                  value={accomDraft.roomType}
                  placeholder="VD: Phòng đôi Standard"
                  onChange={(e) => setAccomDraft((p) => ({ ...p, roomType: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-slate-600">Địa chỉ</label>
                <input
                  value={accomDraft.address}
                  onChange={(e) => setAccomDraft((p) => ({ ...p, address: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">Đơn vị (nhà cung cấp)</label>
                <select
                  value={accomDraft.supplierId}
                  onChange={(e) => setAccomDraft((p) => ({ ...p, supplierId: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  <option value="">— Chưa chọn —</option>
                  {suppliers
                    .filter((s) => s.type === "HOTEL" && s.isActive)
                    .map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={mutating}
                onClick={() => void handleAddAccommodation(addingAccomForItinerary)}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
              >
                {mutating ? "Đang lưu..." : "Thêm"}
              </button>
              <button
                type="button"
                onClick={() => setAddingAccomForItinerary(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Modal thêm bữa ăn */}
      {addingMealForItinerary != null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onMouseDown={() => setAddingMealForItinerary(null)}
          />
          <div className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Thêm bữa ăn cho ngày lịch trình
              </h3>
              <button
                type="button"
                onClick={() => setAddingMealForItinerary(null)}
                className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
              >
                Đóng
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-slate-600">Loại bữa *</label>
                <select
                  value={mealDraft.mealType}
                  onChange={(e) => setMealDraft((p) => ({ ...p, mealType: e.target.value as MealType }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  {Object.entries(MEAL_TYPE_LABELS).map(([v, label]) => (
                    <option key={v} value={v}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">Nhà hàng</label>
                <input
                  value={mealDraft.restaurantName}
                  placeholder="VD: Nhà hàng Biển Đông"
                  onChange={(e) => setMealDraft((p) => ({ ...p, restaurantName: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">Hình thức</label>
                <input
                  value={mealDraft.menuStyle}
                  placeholder="VD: Buffet, Set menu"
                  onChange={(e) => setMealDraft((p) => ({ ...p, menuStyle: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">Đơn vị (nhà hàng)</label>
                <select
                  value={mealDraft.supplierId}
                  onChange={(e) => setMealDraft((p) => ({ ...p, supplierId: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  <option value="">— Chưa chọn —</option>
                  {suppliers
                    .filter((s) => s.type === "RESTAURANT" && s.isActive)
                    .map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-slate-600">Ghi chú ăn kiêng</label>
                <input
                  value={mealDraft.dietaryNotes}
                  placeholder="VD: Có phần chay, Hải sản"
                  onChange={(e) => setMealDraft((p) => ({ ...p, dietaryNotes: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={mutating}
                onClick={() => void handleAddMeal(addingMealForItinerary)}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
              >
                {mutating ? "Đang lưu..." : "Thêm"}
              </button>
              <button
                type="button"
                onClick={() => setAddingMealForItinerary(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Modal sửa transport */}
      {editingTransportId != null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onMouseDown={() => setEditingTransportId(null)}
          />
          <div className="relative w-full max-w-xl rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Sửa chặng vận chuyển #{editingTransportId}
              </h3>
              <button
                type="button"
                disabled={mutating}
                onClick={() => setEditingTransportId(null)}
                className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Đóng
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-slate-600">Thứ tự chặng</label>
                <input
                  type="number"
                  min={1}
                  value={transportEditDraft.legOrder}
                  onChange={(e) => setTransportEditDraft((p) => ({ ...p, legOrder: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">Loại phương tiện</label>
                <select
                  value={transportEditDraft.vehicleType}
                  onChange={(e) => setTransportEditDraft((p) => ({ ...p, vehicleType: e.target.value as VehicleType }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  {Object.entries(VEHICLE_TYPE_LABELS).map(([v, label]) => (
                    <option key={v} value={v}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">Chi tiết</label>
                <input
                  value={transportEditDraft.vehicleDetail}
                  onChange={(e) => setTransportEditDraft((p) => ({ ...p, vehicleDetail: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">Điểm xuất phát</label>
                <input
                  value={transportEditDraft.departurePoint}
                  onChange={(e) => setTransportEditDraft((p) => ({ ...p, departurePoint: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">Điểm đến</label>
                <input
                  value={transportEditDraft.arrivalPoint}
                  onChange={(e) => setTransportEditDraft((p) => ({ ...p, arrivalPoint: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">Đơn vị vận chuyển</label>
                <select
                  value={transportEditDraft.supplierId}
                  onChange={(e) => setTransportEditDraft((p) => ({ ...p, supplierId: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  <option value="">— Chưa chọn —</option>
                  {suppliers
                    .filter((s) => s.type === "TRANSPORT" && s.isActive)
                    .map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={mutating}
                onClick={() => void handleUpdateTransport(editingTransportId)}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
              >
                {mutating ? "Đang lưu..." : "Lưu"}
              </button>
              <button
                type="button"
                onClick={() => setEditingTransportId(null)}
                disabled={mutating}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={disabled}
          className="rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
        >
          {saving ? "Đang lưu…" : mode === "create" ? "Tạo tour" : "Cập nhật"}
        </button>
        <Link
          href="/tours"
          className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          Hủy
        </Link>
      </div>
    </form>
  );
}
