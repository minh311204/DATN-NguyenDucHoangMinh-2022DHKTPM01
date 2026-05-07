"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import type {
  CreateTourInput,
  CreateTourItineraryInput,
  CreateTourScheduleInput,
  LocationRow,
  Supplier,
  TourAccommodation,
  TourDetail,
  TourImage,
  TourItinerary,
  TourMeal,
  TourSchedule,
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
  removeItineraryAccommodation,
  removeItineraryMeal,
  removeTourImage,
  removeTourItinerary,
  removeTourSchedule,
  removeTourTransport,
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
  maxPeople: string;
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

type ScheduleDraft = {
  startDate: string; // datetime-local
  endDate: string; // datetime-local
  availableSeats: string;
  bookedSeats: string;
  priceOverride: string;
  status: string;
};

type ItineraryDraft = {
  dayNumber: string;
  title: string;
  description: string;
};

function isEmptyScheduleDraft(d: ScheduleDraft) {
  return (
    !d.startDate &&
    !d.endDate &&
    !d.availableSeats &&
    !d.bookedSeats &&
    !d.priceOverride &&
    !d.status
  );
}

function isEmptyItineraryDraft(d: ItineraryDraft) {
  return !d.dayNumber && !d.title && !d.description;
}

function parseOptionalNumberInt(
  raw: string,
): { ok: true; value?: number } | { ok: false; error: string } {
  const t = raw.trim();
  if (!t) return { ok: true, value: undefined };
  const n = Number(t);
  if (!Number.isFinite(n) || Math.floor(n) !== n) {
    return { ok: false, error: "Giá trị phải là số nguyên." };
  }
  return { ok: true, value: n };
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
      maxPeople: "",
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
    maxPeople: initial.maxPeople != null ? String(initial.maxPeople) : "",
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
  const [saving, setSaving] = useState(false);
  const [scheduleDrafts, setScheduleDrafts] = useState<ScheduleDraft[]>([]);
  const [itineraryDrafts, setItineraryDrafts] = useState<ItineraryDraft[]>([]);
  const [mutating, setMutating] = useState(false);
  const [savingNewSchedules, setSavingNewSchedules] = useState(false);
  const [savingNewItineraries, setSavingNewItineraries] = useState(false);

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
    bookedSeats: "",
    priceOverride: "",
    status: "",
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

  useEffect(() => {
    setFields(buildInitialFields(initialDetail, locations));
    setScheduleDrafts([]);
    setItineraryDrafts([]);
    setLocalSchedules(initialDetail?.schedules ?? []);
    setLocalItineraries(initialDetail?.itineraries ?? []);
    setLocalTransports(initialDetail?.transports ?? []);
    setLocalImages(initialDetail?.images ?? []);
    setPendingGallery([]);
    setTransportDrafts([]);
    setEditingScheduleId(null);
    setEditingItineraryId(null);
    setEditingTransportId(null);
  }, [initialDetail, locations]);

  // Load suppliers once in edit mode
  useEffect(() => {
    if (mode !== "edit") return;
    fetchSuppliers().then((res) => {
      if (!res.ok) return;
      const d = res.data;
      setSuppliers(Array.isArray(d) ? d : d.items);
    });
  }, [mode]);

  function set<K extends keyof Fields>(key: K, value: Fields[K]) {
    setFields((f) => ({ ...f, [key]: value }));
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
    const dep = Number(fields.departureLocationId);
    const dest = Number(fields.destinationLocationId);
    if (!fields.name.trim()) {
      setErr("Nhập tên tour.");
      return;
    }
    if (!dep || !dest) {
      setErr("Chọn đủ điểm khởi hành và điểm đến.");
      return;
    }

    const schedulesToCreate: CreateTourScheduleInput[] = [];
    for (const d of scheduleDrafts) {
      if (isEmptyScheduleDraft(d)) continue;
      if (!d.startDate || !d.endDate) {
        setErr("Lịch khởi hành: cần chọn cả ngày bắt đầu và ngày kết thúc.");
        return;
      }
      const start = new Date(d.startDate);
      const end = new Date(d.endDate);
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
        setErr("Lịch khởi hành: ngày không hợp lệ.");
        return;
      }

      const a = parseOptionalNumberInt(d.availableSeats);
      if (!a.ok) {
        setErr(`Lịch khởi hành: availableSeats - ${a.error}`);
        return;
      }
      const b = parseOptionalNumberInt(d.bookedSeats);
      if (!b.ok) {
        setErr(`Lịch khởi hành: bookedSeats - ${b.error}`);
        return;
      }
      const p = parseOptionalNumberFloat(d.priceOverride);
      if (!p.ok) {
        setErr(`Lịch khởi hành: priceOverride - ${p.error}`);
        return;
      }

      const status = d.status.trim() || undefined;
      schedulesToCreate.push({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        availableSeats: a.value,
        bookedSeats: b.value,
        priceOverride: p.value,
        status,
      });
    }

    const itinerariesToCreate: CreateTourItineraryInput[] = [];
    for (const it of itineraryDrafts) {
      if (isEmptyItineraryDraft(it)) continue;
      const day = Number(it.dayNumber);
      if (!Number.isFinite(day) || Math.floor(day) !== day || day < 1) {
        setErr("Lịch trình: dayNumber phải là số nguyên >= 1.");
        return;
      }
      const title = it.title.trim() || undefined;
      const description = it.description.trim() || undefined;
      itinerariesToCreate.push({
        dayNumber: day,
        title,
        description,
      });
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
          maxPeople: fields.maxPeople ? Number(fields.maxPeople) : undefined,
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
        maxPeople: fields.maxPeople ? Number(fields.maxPeople) : null,
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
    setEditingScheduleId(s.id);
    setScheduleEditDraft({
      startDate: isoToDatetimeLocal(s.startDate),
      endDate: isoToDatetimeLocal(s.endDate),
      availableSeats: s.availableSeats != null ? String(s.availableSeats) : "",
      bookedSeats: s.bookedSeats != null ? String(s.bookedSeats) : "",
      priceOverride:
        s.priceOverride != null ? String(s.priceOverride) : "",
      status: s.status ?? "",
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
    if (!scheduleEditDraft.startDate || !scheduleEditDraft.endDate) {
      setErr("Lịch khởi hành: cần chọn cả ngày bắt đầu và kết thúc.");
      return;
    }

    const start = new Date(scheduleEditDraft.startDate);
    const end = new Date(scheduleEditDraft.endDate);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
      setErr("Lịch khởi hành: ngày không hợp lệ.");
      return;
    }

    setErr(null);
    setMutating(true);
    try {
      const a = parseOptionalNumberInt(scheduleEditDraft.availableSeats);
      if (!a.ok) {
        setErr(`Lịch khởi hành: availableSeats - ${a.error}`);
        return;
      }
      const b = parseOptionalNumberInt(scheduleEditDraft.bookedSeats);
      if (!b.ok) {
        setErr(`Lịch khởi hành: bookedSeats - ${b.error}`);
        return;
      }
      const p = parseOptionalNumberFloat(scheduleEditDraft.priceOverride);
      if (!p.ok) {
        setErr(`Lịch khởi hành: priceOverride - ${p.error}`);
        return;
      }

      const status = scheduleEditDraft.status.trim() || undefined;
      const body = {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        availableSeats: a.value,
        bookedSeats: b.value,
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
      setEditingScheduleId(null);
    } finally {
      setMutating(false);
    }
  }

  async function handleDeleteSchedule(scheduleId: number) {
    if (mutating) return;
    if (
      !window.confirm(
        "Xóa lịch khởi hành này? Hành động này không thể hoàn tác.",
      )
    ) {
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
      if (editingScheduleId === scheduleId) setEditingScheduleId(null);
    } finally {
      setMutating(false);
    }
  }

  async function handleUpdateItinerary(itineraryId: number) {
    if (mutating) return;
    const day = Number(itineraryEditDraft.dayNumber);
    if (!Number.isFinite(day) || Math.floor(day) !== day || day < 1) {
      setErr("Lịch trình: dayNumber phải là số nguyên >= 1.");
      return;
    }

    setErr(null);
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

  async function handleAddTransport(draft: TransportDraft) {
    if (tourId == null || mutating) return;
    if (!draft.departurePoint.trim() || !draft.arrivalPoint.trim()) {
      setErr("Vận chuyển: cần nhập điểm xuất phát và điểm đến.");
      return;
    }
    setErr(null);
    setMutating(true);
    try {
      const res = await addTourTransport(tourId, {
        supplierId: draft.supplierId ? Number(draft.supplierId) : undefined,
        legOrder: Number(draft.legOrder) || 1,
        vehicleType: draft.vehicleType,
        vehicleDetail: draft.vehicleDetail.trim() || undefined,
        seatClass: draft.seatClass.trim() || undefined,
        departurePoint: draft.departurePoint.trim(),
        arrivalPoint: draft.arrivalPoint.trim(),
        estimatedHours: draft.estimatedHours ? Number(draft.estimatedHours) : undefined,
        notes: draft.notes.trim() || undefined,
      });
      if (!res.ok) { setErr(errorMessage(res.body, res.status)); return; }
      setLocalTransports((prev) => [...prev, res.data]);
      setTransportDrafts((prev) => prev.filter((d) => d !== draft));
    } finally {
      setMutating(false);
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
    const schedulesToCreate: CreateTourScheduleInput[] = [];
    for (const d of scheduleDrafts) {
      if (isEmptyScheduleDraft(d)) continue;
      if (!d.startDate || !d.endDate) {
        setErr(
          "Lịch khởi hành: cần chọn cả ngày bắt đầu và ngày kết thúc.",
        );
        return;
      }
      const start = new Date(d.startDate);
      const end = new Date(d.endDate);
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
        setErr("Lịch khởi hành: ngày không hợp lệ.");
        return;
      }

      const a = parseOptionalNumberInt(d.availableSeats);
      if (!a.ok) {
        setErr(`Lịch khởi hành: availableSeats - ${a.error}`);
        return;
      }
      const b = parseOptionalNumberInt(d.bookedSeats);
      if (!b.ok) {
        setErr(`Lịch khởi hành: bookedSeats - ${b.error}`);
        return;
      }
      const p = parseOptionalNumberFloat(d.priceOverride);
      if (!p.ok) {
        setErr(`Lịch khởi hành: priceOverride - ${p.error}`);
        return;
      }

      const status = d.status.trim() || undefined;
      schedulesToCreate.push({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        availableSeats: a.value,
        bookedSeats: b.value,
        priceOverride: p.value,
        status,
      });
    }

    if (schedulesToCreate.length === 0) {
      setErr("Chưa có lịch khởi hành mới hợp lệ để lưu.");
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
      router.refresh();
    } finally {
      setSavingNewSchedules(false);
    }
  }

  async function saveNewItinerariesOnly() {
    if (mode !== "edit" || tourId == null) return;
    setErr(null);
    const itinerariesToCreate: CreateTourItineraryInput[] = [];
    for (const it of itineraryDrafts) {
      if (isEmptyItineraryDraft(it)) continue;
      const day = Number(it.dayNumber);
      if (!Number.isFinite(day) || Math.floor(day) !== day || day < 1) {
        setErr("Lịch trình: dayNumber phải là số nguyên >= 1.");
        return;
      }
      const title = it.title.trim() || undefined;
      const description = it.description.trim() || undefined;
      itinerariesToCreate.push({
        dayNumber: day,
        title,
        description,
      });
    }

    if (itinerariesToCreate.length === 0) {
      setErr("Chưa có lịch trình mới hợp lệ để lưu.");
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
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-slate-600">Slug</label>
          <input
            value={fields.slug}
            onChange={(e) => set("slug", e.target.value)}
            placeholder="tour-mien-tay"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-slate-600">
            Điểm khởi hành *
          </label>
          <select
            value={fields.departureLocationId}
            onChange={(e) => set("departureLocationId", e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900"
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name ?? `#${l.id}`}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-slate-600">
            Điểm đến *
          </label>
          <select
            value={fields.destinationLocationId}
            onChange={(e) => set("destinationLocationId", e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900"
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name ?? `#${l.id}`}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-slate-600">
            Số ngày
          </label>
          <input
            type="number"
            min={1}
            value={fields.durationDays}
            onChange={(e) => set("durationDays", e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-slate-600">
            Giá cơ bản (VND)
          </label>
          <input
            type="number"
            min={0}
            value={fields.basePrice}
            onChange={(e) => set("basePrice", e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-slate-600">
            Số khách tối đa
          </label>
          <input
            type="number"
            min={1}
            value={fields.maxPeople}
            onChange={(e) => set("maxPeople", e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900"
          />
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
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900"
              />
              <button
                type="button"
                disabled={uploadingThumb}
                onClick={() => thumbInputRef.current?.click()}
                className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-100 disabled:opacity-50"
              >
                {uploadingThumb ? "Đang tải…" : "Tải ảnh lên (Cloudinary / S3)"}
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
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900"
          />
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
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900"
          />
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
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900"
          />
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
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900"
          />
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
              Tour nổi bật (trang chủ, /tours?featured=true)
            </label>
          </div>
        </div>
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
                            Trạng thái: {s.status}
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
            onMouseDown={() => setEditingScheduleId(null)}
          />
          <div className="relative w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Sửa lịch khởi hành #{editingScheduleId}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Cập nhật thông tin lịch khởi hành (tác động ngay).
                </p>
              </div>
              <button
                type="button"
                disabled={mutating}
                onClick={() => setEditingScheduleId(null)}
                className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Đóng
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-slate-600">
                  Bắt đầu *
                </label>
                <input
                  type="datetime-local"
                  value={scheduleEditDraft.startDate}
                  onChange={(e) =>
                    setScheduleEditDraft((prev) => ({
                      ...prev,
                      startDate: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-slate-600">
                  Kết thúc *
                </label>
                <input
                  type="datetime-local"
                  value={scheduleEditDraft.endDate}
                  onChange={(e) =>
                    setScheduleEditDraft((prev) => ({
                      ...prev,
                      endDate: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-600">
                  Available seats
                </label>
                <input
                  type="number"
                  min={0}
                  value={scheduleEditDraft.availableSeats}
                  onChange={(e) =>
                    setScheduleEditDraft((prev) => ({
                      ...prev,
                      availableSeats: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-600">
                  Booked seats
                </label>
                <input
                  type="number"
                  min={0}
                  value={scheduleEditDraft.bookedSeats}
                  onChange={(e) =>
                    setScheduleEditDraft((prev) => ({
                      ...prev,
                      bookedSeats: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-600">
                  Price override
                </label>
                <input
                  type="number"
                  min={0}
                  value={scheduleEditDraft.priceOverride}
                  onChange={(e) =>
                    setScheduleEditDraft((prev) => ({
                      ...prev,
                      priceOverride: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-600">
                  Status
                </label>
                <input
                  value={scheduleEditDraft.status}
                  onChange={(e) =>
                    setScheduleEditDraft((prev) => ({
                      ...prev,
                      status: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
                />
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
                onClick={() => setEditingScheduleId(null)}
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
                onClick={() => setEditingItineraryId(null)}
                className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Đóng
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-slate-600">
                  Day number *
                </label>
                <input
                  type="number"
                  min={1}
                  value={itineraryEditDraft.dayNumber}
                  onChange={(e) =>
                    setItineraryEditDraft((prev) => ({
                      ...prev,
                      dayNumber: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
                />
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
                onClick={() => setEditingItineraryId(null)}
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
            Khi tạo tour mới, lịch khởi hành và lịch trình được lưu cùng lúc với
            nút <span className="font-medium">Tạo tour</span>. Nút{" "}
            <span className="font-medium">Lưu</span> ở từng khối chỉ dùng khi{" "}
            <span className="font-medium">sửa tour</span> (đã có mã tour).
          </p>
        ) : null}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-800">
              Lịch khởi hành (tạo mới)
            </h2>
            <div className="flex flex-wrap items-center gap-2">
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
                className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
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
                      bookedSeats: "",
                      priceOverride: "",
                      status: "",
                    },
                  ])
                }
                disabled={saving || savingNewSchedules || mutating}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                + Thêm lịch
              </button>
            </div>
          </div>

          {scheduleDrafts.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              Chưa có lịch mới nào để tạo.
            </p>
          ) : (
            <div className="mt-3 space-y-4">
              {scheduleDrafts.map((d, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-slate-200 bg-white p-3"
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
                      onClick={() =>
                        setScheduleDrafts((prev) =>
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
                        Bắt đầu *
                      </label>
                      <input
                        type="datetime-local"
                        value={d.startDate}
                        onChange={(e) =>
                          setScheduleDrafts((prev) =>
                            prev.map((x, i) =>
                              i === idx ? { ...x, startDate: e.target.value } : x,
                            ),
                          )
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-600">
                        Kết thúc *
                      </label>
                      <input
                        type="datetime-local"
                        value={d.endDate}
                        onChange={(e) =>
                          setScheduleDrafts((prev) =>
                            prev.map((x, i) =>
                              i === idx ? { ...x, endDate: e.target.value } : x,
                            ),
                          )
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs text-slate-600">
                        Available seats
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={d.availableSeats}
                        onChange={(e) =>
                          setScheduleDrafts((prev) =>
                            prev.map((x, i) =>
                              i === idx
                                ? { ...x, availableSeats: e.target.value }
                                : x,
                            ),
                          )
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-600">
                        Booked seats
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={d.bookedSeats}
                        onChange={(e) =>
                          setScheduleDrafts((prev) =>
                            prev.map((x, i) =>
                              i === idx
                                ? { ...x, bookedSeats: e.target.value }
                                : x,
                            ),
                          )
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs text-slate-600">
                        Price override
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={d.priceOverride}
                        onChange={(e) =>
                          setScheduleDrafts((prev) =>
                            prev.map((x, i) =>
                              i === idx
                                ? { ...x, priceOverride: e.target.value }
                                : x,
                            ),
                          )
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-600">
                        Status
                      </label>
                      <input
                        value={d.status}
                        onChange={(e) =>
                          setScheduleDrafts((prev) =>
                            prev.map((x, i) =>
                              i === idx ? { ...x, status: e.target.value } : x,
                            ),
                          )
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-800">
              Lịch trình (tạo mới)
            </h2>
            <div className="flex flex-wrap items-center gap-2">
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
                className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
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
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                + Thêm ngày
              </button>
            </div>
          </div>

          {itineraryDrafts.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              Chưa có lịch trình mới nào để tạo.
            </p>
          ) : (
            <div className="mt-3 space-y-4">
              {itineraryDrafts.map((d, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-slate-200 bg-white p-3"
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
                        Day number *
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={d.dayNumber}
                        onChange={(e) =>
                          setItineraryDrafts((prev) =>
                            prev.map((x, i) =>
                              i === idx
                                ? { ...x, dayNumber: e.target.value }
                                : x,
                            ),
                          )
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
                      />
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
              ))}
            </div>
          )}
        </section>

        {mode === "edit" ? (
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-800">
                Chặng vận chuyển (thêm mới)
              </h2>
              <button
                type="button"
                onClick={() =>
                  setTransportDrafts((prev) => [
                    ...prev,
                    emptyTransportDraft(localTransports.length + prev.length + 1),
                  ])
                }
                disabled={saving || mutating}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                + Thêm chặng
              </button>
            </div>

            {transportDrafts.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                Chưa có chặng mới nào. Nhấn &quot;+ Thêm chặng&quot; để bổ sung.
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
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={mutating}
                          onClick={() => void handleAddTransport(d)}
                          className="rounded-lg bg-sky-600 px-3 py-1 text-xs font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
                        >
                          {mutating ? "Đang lưu..." : "Lưu chặng"}
                        </button>
                        <button
                          type="button"
                          disabled={mutating}
                          onClick={() =>
                            setTransportDrafts((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                        >
                          Xóa
                        </button>
                      </div>
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
        ) : null}
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
