'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BedDouble,
  Bus,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Info,
  Percent,
  Plane,
  Plus,
  Shield,
  Train,
  Utensils,
  Users,
  Zap,
  X,
  XCircle,
} from 'lucide-react';
import type {
  TourDetail,
  TourTransport,
  TourItinerary,
  TourAccommodation,
  TourMeal,
} from '@/lib/api-types';
import { formatVnd, errorMessage } from '@/lib/format';
import {
  AUTH_CHANGED_EVENT,
  AUTH_KEYS,
  getStoredUserEmail,
  hasAccessToken,
} from '@/lib/auth-storage';
import { ensureSessionFresh, getMe } from '@/lib/client-auth';
import {
  createBooking,
  createVnpayPayment,
  getMyBookings,
  previewPromo,
  type BookingListItem,
  type CreateBookingInput,
} from '@/lib/client-booking';
import { schedulesOverlapUtc } from '@/lib/booking-schedule-overlap';
import { PassengerDobPicker } from '@/components/booking/passenger-dob-picker';
import { BookingFlowStepper } from '@/components/booking/booking-flow-stepper';
import { PaymentMethodDrawer } from '@/components/booking/payment-method-drawer';
import {
  ageBandTooltipLines,
  validateDobForCategory,
} from '@/lib/booking-passenger-age';

/* ══════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════ */

/** Đặt `true` nếu cần hiện lại ô nhập mã giảm giá + modal. */
const SHOW_PROMO_CODE_UI = false;

type PassengerForm = {
  fullName: string;
  dateOfBirth: string;
  /** Mọi nhóm tuổi — bắt buộc khi hoàn tất bước 1 */
  gender: string;
  /** Người lớn — phòng đơn */
  wantsSingleRoom?: boolean;
  /** Chỉ giao diện / lưu form — API booking hiện chưa có trường */
  phone?: string;
};

type FullSchedule = {
  id: number;
  tourId: number;
  startDate: string;
  endDate: string;
  availableSeats?: number | null;
  bookedSeats?: number | null;
  remainingSeats?: number | null;
  priceOverride?: number | null;
  status?: string | null;
};

function pad2(n: number) {
  return String(n).padStart(2, '0');
}
function utcYmd(d: Date) {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}
function utcMonthKey(d: Date) {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`;
}

/** Khớp API `createBooking`: chỉ lịch chưa qua thời điểm khởi hành */
function isScheduleBookable(isoStart: string) {
  return new Date(isoStart).getTime() >= Date.now();
}

function remainingSeatsForSchedule(dep: FullSchedule): number | null {
  if (dep.availableSeats == null) return null;
  return Math.max(dep.availableSeats - (dep.bookedSeats ?? 0), 0);
}

function isScheduleSoldOut(dep: FullSchedule): boolean {
  const rem = remainingSeatsForSchedule(dep);
  return rem != null && rem <= 0;
}

function firstScheduleWithSeats(schedules: FullSchedule[]) {
  return schedules.find((s) => !isScheduleSoldOut(s)) ?? null;
}

/** Booking của user đang chiếm khung ngày trên lịch (PENDING còn hạn / CONFIRMED). */
function myBookingBlocksOverlap(b: BookingListItem, nowMs: number): boolean {
  if (b.status === 'CANCELLED' || b.status === 'COMPLETED') return false;
  if (b.status === 'CONFIRMED') return true;
  if (b.status === 'PENDING') {
    if (b.expiredAtUtc == null || b.expiredAtUtc === '') return true;
    return new Date(b.expiredAtUtc).getTime() > nowMs;
  }
  return false;
}
function formatVnDate(d: Date) {
  return `${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}
function formatVnTime(d: Date) {
  return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
}
function formatVnDobYmd(ymd: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return '—';
  const [y, m, d] = ymd.split('-').map(Number);
  return `${pad2(d)}/${pad2(m)}/${y}`;
}
function monthLabel(ym: string) {
  const [y, m] = ym.split('-');
  return `Tháng ${Number(m)}/${y}`;
}

function PassengerAgeHint({
  departure,
  band,
}: {
  departure: Date | null;
  band: 'ADULT' | 'CHILD' | 'INFANT';
}) {
  const label =
    band === 'ADULT'
      ? 'Gợi ý ngày sinh nhóm người lớn'
      : band === 'CHILD'
        ? 'Gợi ý ngày sinh nhóm trẻ em'
        : 'Gợi ý ngày sinh nhóm trẻ nhỏ';
  const lines = departure ? ageBandTooltipLines(departure, band) : [];

  if (!departure) {
    return (
      <span
        className="inline-flex shrink-0 text-stone-300"
        title="Chọn lịch khởi hành để xem gợi ý khoảng ngày sinh"
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
      </span>
    );
  }

  return (
    <span className="group relative inline-flex shrink-0 align-middle">
      <button
        type="button"
        className="rounded-full p-0.5 text-sky-600 outline-none ring-offset-2 hover:bg-sky-100 focus-visible:ring-2 focus-visible:ring-sky-400"
        aria-label={label}
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none invisible absolute bottom-[calc(100%+6px)] left-1/2 z-30 w-max max-w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-2 text-left text-[11px] font-medium leading-snug text-[#0b5ea8] opacity-0 shadow-md transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
      >
        {lines.map((line) => (
          <span key={`${band}-${line}`} className="block">
            {line}
          </span>
        ))}
      </span>
    </span>
  );
}

function vehicleLabel(v: string) {
  const map: Record<string, string> = {
    CAR_4: 'Xe 4 chỗ',
    CAR_7: 'Xe 7 chỗ',
    BUS_16: 'Xe 16 chỗ',
    BUS_29: 'Xe 29 chỗ',
    BUS_45: 'Xe 45 chỗ',
    FLIGHT: 'Máy bay',
    TRAIN: 'Tàu hỏa',
    BOAT: 'Tàu/Thuyền',
    CABLE_CAR: 'Cáp treo',
  };
  return map[v] ?? v;
}

function mealLabel(m: string) {
  const map: Record<string, string> = {
    BREAKFAST: 'Bữa sáng',
    LUNCH: 'Bữa trưa',
    DINNER: 'Bữa tối',
    SNACK: 'Bữa nhẹ',
  };
  return map[m] ?? m;
}

function VehicleIcon({ type }: { type: string }) {
  if (type === 'FLIGHT') return <Plane className="h-3.5 w-3.5" />;
  if (type === 'TRAIN') return <Train className="h-3.5 w-3.5" />;
  return <Bus className="h-3.5 w-3.5" />;
}

/* ══════════════════════════════════════════════
   STEP INDICATOR (căn giữa — trang đặt tour)
══════════════════════════════════════════════ */
/** Bước hiển thị trên stepper: 1 = nhập thông tin, 2 = thanh toán, 3 = hoàn tất (trang đặt chỉ tới bước 2) */
const STEP_SUBLINE: Record<1 | 2, string> = {
  1: 'Hãy đảm bảo tất cả thông tin chi tiết trên trang này đã chính xác trước khi tiến hành thanh toán.',
  2: 'Kiểm tra lại và xác nhận thanh toán',
};

/* ══════════════════════════════════════════════
   TRANSPORT SECTION
══════════════════════════════════════════════ */
function TransportSection({ transports }: { transports: TourTransport[] }) {
  const [open, setOpen] = useState(false);
  if (!transports.length) return null;
  const sorted = [...transports].sort((a, b) => a.legOrder - b.legOrder);
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 border-b border-stone-100 pb-3 text-left transition hover:opacity-90"
        aria-expanded={open}
      >
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
            <Plane className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-stone-900">
              Phương tiện di chuyển
            </h3>
            <p className="text-xs text-stone-400">
              Chi tiết các chặng di chuyển của tour
            </p>
          </div>
        </div>
        {open ? (
          <ChevronDown
            className="h-5 w-5 shrink-0 text-stone-400"
            aria-hidden
          />
        ) : (
          <ChevronRight
            className="h-5 w-5 shrink-0 text-stone-400"
            aria-hidden
          />
        )}
      </button>

      {open ? (
        <div className="mt-4 space-y-3">
          {sorted.map((t) => (
            <div key={t.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                  <VehicleIcon type={t.vehicleType} />
                </div>
                {sorted.indexOf(t) < sorted.length - 1 && (
                  <div className="my-1 w-0.5 flex-1 bg-stone-200" />
                )}
              </div>
              <div className="min-w-0 flex-1 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700">
                    {vehicleLabel(t.vehicleType)}
                  </span>
                  {t.seatClass ? (
                    <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700">
                      {t.seatClass}
                    </span>
                  ) : null}
                  {t.estimatedHours ? (
                    <span className="flex items-center gap-1 text-[11px] text-stone-400">
                      <Clock className="h-3 w-3" />~{t.estimatedHours}h
                    </span>
                  ) : null}
                </div>
                <div className="mt-1.5 flex items-center gap-2 text-sm">
                  <span className="font-medium text-stone-800">
                    {t.departurePoint}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-stone-400" />
                  <span className="font-medium text-stone-800">
                    {t.arrivalPoint}
                  </span>
                </div>
                {t.vehicleDetail ? (
                  <p className="mt-0.5 text-xs text-stone-500">
                    {t.vehicleDetail}
                  </p>
                ) : null}
                {t.supplier ? (
                  <p className="mt-0.5 text-[11px] text-stone-400">
                    Đơn vị:{' '}
                    <span className="font-medium text-stone-600">
                      {t.supplier.name}
                    </span>
                    {t.supplier.phone ? ` · ${t.supplier.phone}` : ''}
                  </p>
                ) : null}
                {t.notes ? (
                  <p className="mt-1 text-xs italic text-stone-400">
                    {t.notes}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ══════════════════════════════════════════════
   ITINERARY SECTION (with meals & accommodation)
══════════════════════════════════════════════ */
function AccommodationRow({ acc }: { acc: TourAccommodation }) {
  const stars = acc.starRating ? '★'.repeat(acc.starRating) : null;
  return (
    <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
      <div className="flex items-start gap-2">
        <BedDouble className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-sm text-stone-800">
              {acc.hotelName}
            </span>
            {stars ? (
              <span className="text-xs text-amber-500">{stars}</span>
            ) : null}
          </div>
          {acc.roomType ? (
            <p className="mt-0.5 text-xs text-stone-500">
              Phòng: {acc.roomType}
            </p>
          ) : null}
          {acc.address ? (
            <p className="mt-0.5 text-xs text-stone-400">{acc.address}</p>
          ) : null}
          {acc.checkInNote || acc.checkOutNote ? (
            <p className="mt-0.5 text-xs text-stone-400">
              {acc.checkInNote ? `Check-in: ${acc.checkInNote}` : ''}
              {acc.checkInNote && acc.checkOutNote ? ' · ' : ''}
              {acc.checkOutNote ? `Check-out: ${acc.checkOutNote}` : ''}
            </p>
          ) : null}
          {acc.supplier ? (
            <p className="mt-0.5 text-[11px] text-stone-400">
              Đối tác: <span className="font-medium">{acc.supplier.name}</span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MealRow({ meal }: { meal: TourMeal }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50/50 p-2.5">
      <Utensils className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
      <div className="min-w-0">
        <span className="text-xs font-bold text-amber-800">
          {mealLabel(meal.mealType)}
        </span>
        {meal.restaurantName ? (
          <span className="ml-1.5 text-xs text-stone-600">
            · {meal.restaurantName}
          </span>
        ) : null}
        {meal.menuStyle ? (
          <p className="mt-0.5 text-[11px] text-stone-500">{meal.menuStyle}</p>
        ) : null}
        {meal.dietaryNotes ? (
          <p className="mt-0.5 text-[11px] italic text-stone-400">
            {meal.dietaryNotes}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ItinerarySection({ itineraries }: { itineraries: TourItinerary[] }) {
  const [sectionOpen, setSectionOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const sorted = [...itineraries].sort((a, b) => a.dayNumber - b.dayNumber);

  if (!sorted.length) return null;

  function toggle(day: number) {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(day)) n.delete(day);
      else n.add(day);
      return n;
    });
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <button
        type="button"
        onClick={() => setSectionOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 border-b border-stone-100 pb-3 text-left transition hover:opacity-90"
        aria-expanded={sectionOpen}
      >
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
            <Calendar className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-stone-900">
              Chương trình tour chi tiết
            </h3>
            <p className="text-xs text-stone-400">
              Bao gồm nơi lưu trú và bữa ăn từng ngày
            </p>
          </div>
        </div>
        {sectionOpen ? (
          <ChevronDown
            className="h-5 w-5 shrink-0 text-stone-400"
            aria-hidden
          />
        ) : (
          <ChevronRight
            className="h-5 w-5 shrink-0 text-stone-400"
            aria-hidden
          />
        )}
      </button>

      {sectionOpen ? (
        <div className="mt-4 space-y-2">
          {sorted.map((day) => {
            const open = expanded.has(day.dayNumber);
            const hasMeals = (day.meals?.length ?? 0) > 0;
            const hasAcc = (day.accommodations?.length ?? 0) > 0;

            return (
              <div
                key={day.id}
                className="overflow-hidden rounded-xl border border-stone-200"
              >
                <button
                  type="button"
                  onClick={() => toggle(day.dayNumber)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-stone-50"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">
                      {day.dayNumber}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-stone-900">
                        Ngày {day.dayNumber}
                        {day.title ? ` — ${day.title}` : ''}
                      </p>
                      {!open ? (
                        <div className="mt-0.5 flex flex-wrap items-center gap-2">
                          {hasMeals ? (
                            <span className="flex items-center gap-1 text-[11px] text-amber-600">
                              <Utensils className="h-3 w-3" />
                              {day.meals!.length} bữa
                            </span>
                          ) : null}
                          {hasAcc ? (
                            <span className="flex items-center gap-1 text-[11px] text-indigo-600">
                              <BedDouble className="h-3 w-3" />
                              {day.accommodations!.length} khách sạn
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center self-center">
                    {open ? (
                      <ChevronDown
                        className="h-4 w-4 text-stone-400"
                        aria-hidden
                      />
                    ) : (
                      <ChevronRight
                        className="h-4 w-4 text-stone-400"
                        aria-hidden
                      />
                    )}
                  </span>
                </button>

                {open ? (
                  <div className="border-t border-stone-100 px-4 pb-4 pt-3 space-y-3">
                    {day.description ? (
                      <p className="text-xs leading-relaxed text-stone-600 whitespace-pre-wrap">
                        {day.description}
                      </p>
                    ) : null}

                    {hasAcc ? (
                      <div>
                        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-indigo-600">
                          Lưu trú
                        </p>
                        <div className="space-y-2">
                          {day.accommodations!.map((a) => (
                            <AccommodationRow key={a.id} acc={a} />
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {hasMeals ? (
                      <div>
                        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-600">
                          Bữa ăn
                        </p>
                        <div className="space-y-1.5">
                          {day.meals!.map((m) => (
                            <MealRow key={m.id} meal={m} />
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {!day.description && !hasMeals && !hasAcc ? (
                      <p className="text-xs text-stone-400">
                        Chưa có thông tin chi tiết ngày này.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

type PassengerDraftBundle = {
  adultP: PassengerForm[];
  childP: PassengerForm[];
  infantP: PassengerForm[];
};

function shallowClonePassengerLists(
  adultP: PassengerForm[],
  childP: PassengerForm[],
  infantP: PassengerForm[],
): PassengerDraftBundle {
  return {
    adultP: adultP.map((p) => ({ ...p })),
    childP: childP.map((p) => ({ ...p })),
    infantP: infantP.map((p) => ({ ...p })),
  };
}

/** Modal nhập đầy đủ hành khách (mẫu ảnh 2) */
function PassengerDetailsModal({
  draft,
  setDraft,
  departureDate,
  singleRoomPrice,
  error,
  onClose,
  onConfirm,
  onReset,
}: {
  draft: PassengerDraftBundle;
  setDraft: React.Dispatch<React.SetStateAction<PassengerDraftBundle>>;
  departureDate: Date | null;
  singleRoomPrice: number | null;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
  onReset: () => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const showSingle = singleRoomPrice != null && singleRoomPrice > 0;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="passenger-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[min(90vh,820px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-stone-200/80 sm:max-w-xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-stone-100 px-5 py-4">
          <h2
            id="passenger-modal-title"
            className="text-lg font-bold text-stone-900"
          >
            Thông tin hành khách
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {showSingle ? (
            <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs leading-relaxed text-[#0b5ea8]">
              Phòng đơn áp dụng cho khách trong nhóm người lớn (sinh trước
              18/05/2014); giá phòng đơn là:{' '}
              <strong>{formatVnd(singleRoomPrice!)} / phòng</strong>
            </div>
          ) : null}

          {error ? (
            <p className="mb-3 text-sm font-medium text-red-600">{error}</p>
          ) : null}

          <div className="space-y-8">
            {draft.adultP.map((p, i) => {
              const hint =
                departureDate != null
                  ? ageBandTooltipLines(departureDate, 'ADULT').join(' ')
                  : '';
              const wants = p.wantsSingleRoom ?? false;
              return (
                <div
                  key={`m-a-${i}`}
                  className="rounded-xl border border-stone-200 bg-stone-50/40 p-4"
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-dashed border-stone-200 pb-3">
                    <Users className="h-4 w-4 shrink-0 text-[#0b5ea8]" />
                    <span className="text-sm font-bold text-[#0b5ea8]">
                      Người lớn
                      {hint ? (
                        <span className="font-normal"> ({hint})</span>
                      ) : null}
                    </span>
                    {departureDate ? (
                      <PassengerAgeHint departure={departureDate} band="ADULT" />
                    ) : null}
                  </div>
                  <p className="mb-3 text-xs font-semibold text-stone-500">
                    #{i + 1}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-stone-600">
                        Họ tên (*)
                      </label>
                      <input
                        type="text"
                        value={p.fullName}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            adultP: d.adultP.map((x, j) =>
                              j === i
                                ? { ...x, fullName: e.target.value }
                                : x,
                            ),
                          }))
                        }
                        placeholder="Ví dụ: Nguyễn Văn A"
                        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-[#0b5ea8] focus:outline-none focus:ring-2 focus:ring-sky-200"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-stone-600">
                        Ngày sinh (*)
                      </label>
                      <PassengerDobPicker
                        value={p.dateOfBirth}
                        onChange={(dateOfBirth) =>
                          setDraft((d) => ({
                            ...d,
                            adultP: d.adultP.map((x, j) =>
                              j === i ? { ...x, dateOfBirth } : x,
                            ),
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-stone-600">
                        Giới tính (*)
                      </label>
                      <select
                        value={p.gender}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            adultP: d.adultP.map((x, j) =>
                              j === i ? { ...x, gender: e.target.value } : x,
                            ),
                          }))
                        }
                        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-[#0b5ea8] focus:outline-none focus:ring-2 focus:ring-sky-200"
                      >
                        <option value="">Chọn</option>
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                        <option value="Khác">Khác</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-end">
                      <div className="min-w-0 flex-1">
                        <label className="mb-1 block text-xs font-medium text-stone-600">
                          Số điện thoại
                        </label>
                        <input
                          type="tel"
                          value={p.phone ?? ''}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              adultP: d.adultP.map((x, j) =>
                                j === i
                                  ? { ...x, phone: e.target.value }
                                  : x,
                              ),
                            }))
                          }
                          placeholder="Ví dụ: 0901234567 / +84901234567"
                          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-[#0b5ea8] focus:outline-none focus:ring-2 focus:ring-sky-200"
                        />
                      </div>
                      {showSingle ? (
                        <div className="flex shrink-0 items-center gap-3 rounded-lg border border-stone-200 bg-white px-3 py-2 sm:min-w-[220px]">
                          <span className="text-xs font-medium text-stone-600">
                            Phòng đơn
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={wants}
                            onClick={() => {
                              setDraft((d) => ({
                                ...d,
                                adultP: d.adultP.map((x, j) =>
                                  j === i
                                    ? {
                                        ...x,
                                        wantsSingleRoom: !(
                                          x.wantsSingleRoom ?? false
                                        ),
                                      }
                                    : x,
                                ),
                              }));
                            }}
                            className={[
                              'relative ml-auto h-7 w-12 shrink-0 rounded-full transition-colors',
                              wants ? 'bg-[#0b5ea8]' : 'bg-stone-300',
                            ].join(' ')}
                          >
                            <span
                              className={[
                                'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform',
                                wants ? 'left-6' : 'left-0.5',
                              ].join(' ')}
                            />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}

            {draft.childP.map((p, i) => {
              const hint =
                departureDate != null
                  ? ageBandTooltipLines(departureDate, 'CHILD').join(' ')
                  : '';
              return (
                <div
                  key={`m-c-${i}`}
                  className="rounded-xl border border-stone-200 bg-stone-50/40 p-4"
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-dashed border-stone-200 pb-3">
                    <Users className="h-4 w-4 shrink-0 text-[#0b5ea8]" />
                    <span className="text-sm font-bold text-[#0b5ea8]">
                      Trẻ em
                      {hint ? (
                        <span className="font-normal"> ({hint})</span>
                      ) : null}
                    </span>
                    {departureDate ? (
                      <PassengerAgeHint departure={departureDate} band="CHILD" />
                    ) : null}
                  </div>
                  <p className="mb-3 text-xs font-semibold text-stone-500">
                    #{i + 1}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-stone-600">
                        Họ tên (*)
                      </label>
                      <input
                        type="text"
                        value={p.fullName}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            childP: d.childP.map((x, j) =>
                              j === i
                                ? { ...x, fullName: e.target.value }
                                : x,
                            ),
                          }))
                        }
                        placeholder="Ví dụ: Nguyễn Văn A"
                        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-[#0b5ea8] focus:outline-none focus:ring-2 focus:ring-sky-200"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-stone-600">
                        Ngày sinh (*)
                      </label>
                      <PassengerDobPicker
                        value={p.dateOfBirth}
                        onChange={(dateOfBirth) =>
                          setDraft((d) => ({
                            ...d,
                            childP: d.childP.map((x, j) =>
                              j === i ? { ...x, dateOfBirth } : x,
                            ),
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-stone-600">
                        Giới tính (*)
                      </label>
                      <select
                        value={p.gender}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            childP: d.childP.map((x, j) =>
                              j === i ? { ...x, gender: e.target.value } : x,
                            ),
                          }))
                        }
                        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-[#0b5ea8] focus:outline-none focus:ring-2 focus:ring-sky-200"
                      >
                        <option value="">Chọn</option>
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                        <option value="Khác">Khác</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}

            {draft.infantP.map((p, i) => {
              const hint =
                departureDate != null
                  ? ageBandTooltipLines(departureDate, 'INFANT').join(' ')
                  : '';
              return (
                <div
                  key={`m-i-${i}`}
                  className="rounded-xl border border-stone-200 bg-stone-50/40 p-4"
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-dashed border-stone-200 pb-3">
                    <Users className="h-4 w-4 shrink-0 text-[#0b5ea8]" />
                    <span className="text-sm font-bold text-[#0b5ea8]">
                      Trẻ nhỏ
                      {hint ? (
                        <span className="font-normal"> ({hint})</span>
                      ) : null}
                    </span>
                    {departureDate ? (
                      <PassengerAgeHint departure={departureDate} band="INFANT" />
                    ) : null}
                  </div>
                  <p className="mb-3 text-xs font-semibold text-stone-500">
                    #{i + 1}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-stone-600">
                        Họ tên (*)
                      </label>
                      <input
                        type="text"
                        value={p.fullName}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            infantP: d.infantP.map((x, j) =>
                              j === i
                                ? { ...x, fullName: e.target.value }
                                : x,
                            ),
                          }))
                        }
                        placeholder="Ví dụ: Nguyễn Văn A"
                        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-[#0b5ea8] focus:outline-none focus:ring-2 focus:ring-sky-200"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-stone-600">
                        Ngày sinh (*)
                      </label>
                      <PassengerDobPicker
                        value={p.dateOfBirth}
                        onChange={(dateOfBirth) =>
                          setDraft((d) => ({
                            ...d,
                            infantP: d.infantP.map((x, j) =>
                              j === i ? { ...x, dateOfBirth } : x,
                            ),
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-stone-600">
                        Giới tính (*)
                      </label>
                      <select
                        value={p.gender}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            infantP: d.infantP.map((x, j) =>
                              j === i ? { ...x, gender: e.target.value } : x,
                            ),
                          }))
                        }
                        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-[#0b5ea8] focus:outline-none focus:ring-2 focus:ring-sky-200"
                      >
                        <option value="">Chọn</option>
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                        <option value="Khác">Khác</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-stone-100 bg-white px-5 py-4">
          <button
            type="button"
            onClick={onReset}
            className="rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-stone-800 hover:bg-stone-50"
          >
            Đặt lại
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-[#0b5ea8] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#0a5190]"
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   ORDER SUMMARY SIDEBAR
══════════════════════════════════════════════ */
function SidebarFlightSnippet({ transports }: { transports: TourTransport[] }) {
  const legs = [...transports]
    .filter((t) => t.vehicleType === 'FLIGHT')
    .sort((a, b) => a.legOrder - b.legOrder);
  if (!legs.length) return null;
  return (
    <div className="mt-3 border-t border-stone-100 pt-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-[#0b5ea8]">
        Thông tin chuyến bay
      </p>
      <div className="mt-2 space-y-2">
        {legs.map((leg, i) => (
          <div
            key={leg.id}
            className="rounded-lg border border-sky-100 bg-sky-50/70 p-2.5 text-[11px] leading-snug"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-stone-900">
                {i === 0 ? 'Chiều đi' : i === 1 ? 'Chiều về' : `Chặng ${i + 1}`}
              </span>
              <Plane
                className="h-3.5 w-3.5 shrink-0 text-sky-600"
                aria-hidden
              />
            </div>
            <p className="mt-1 font-medium text-stone-700">
              {leg.departurePoint} → {leg.arrivalPoint}
            </p>
            {leg.vehicleDetail ? (
              <p className="mt-0.5 text-stone-500">{leg.vehicleDetail}</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function OrderSummary({
  tour,
  selectedSchedule,
  bookingStep,
  adults,
  childPassengerQty,
  infants,
  unitPrice,
  totalAmount,
  singleRoomCount,
  appliedPromoCode,
  appliedDiscountAmount,
  onOpenPromo,
  onClearPromo,
  agreedToTerms = false,
  onAgreedToTermsChange,
  termsHighlight,
  onPrimaryCta,
  primaryCtaLabel,
  primaryCtaSentenceCase,
  primaryCtaDisabled,
}: {
  tour: TourDetail;
  selectedSchedule: FullSchedule | null;
  bookingStep: 1 | 2;
  adults: number;
  childPassengerQty: number;
  infants: number;
  unitPrice: number | null;
  totalAmount: number | null;
  singleRoomCount: number;
  appliedPromoCode: string | null;
  appliedDiscountAmount: number;
  onOpenPromo: () => void;
  onClearPromo: () => void;
  agreedToTerms?: boolean;
  onAgreedToTermsChange: (v: boolean) => void;
  termsHighlight?: boolean;
  onPrimaryCta: () => void;
  primaryCtaLabel: string;
  /** true = chữ thường, không tracking hoa (dùng cho câu nhắc dài) */
  primaryCtaSentenceCase?: boolean;
  primaryCtaDisabled?: boolean;
}) {
  const heroUrl =
    tour.thumbnailUrl ??
    tour.images.find((i) => i.isThumbnail)?.imageUrl ??
    tour.images[0]?.imageUrl ??
    null;
  const selStart = selectedSchedule
    ? new Date(selectedSchedule.startDate)
    : null;
  const selEnd = selectedSchedule ? new Date(selectedSchedule.endDate) : null;
  const remainingSeats =
    selectedSchedule?.availableSeats != null
      ? Math.max(
          selectedSchedule.availableSeats - (selectedSchedule.bookedSeats ?? 0),
          0,
        )
      : null;
  const priceChild5to11 =
    unitPrice != null ? Math.round(unitPrice * 0.9) : null;
  const priceInfant2to4 =
    unitPrice != null ? Math.round(unitPrice * 0.5) : null;
  const srPer = tour.singleRoomSupplement ?? null;
  const singleRoomTotal =
    srPer != null && srPer > 0 ? singleRoomCount * srPer : 0;
  /** Khớp `booking.service` createBooking (làm tròn theo nhóm hành khách). */
  const passengerSubtotal =
    unitPrice != null
      ? Math.round(unitPrice * adults) +
        Math.round(unitPrice * 0.9 * childPassengerQty) +
        Math.round(unitPrice * 0.5 * infants)
      : null;
  const subtotalBeforeDiscount =
    passengerSubtotal != null ? passengerSubtotal + singleRoomTotal : null;

  const tourCodeLine = tour.tourLine ?? tour.slug ?? null;
  const showUrgencyBlock =
    (remainingSeats != null && remainingSeats <= 10) ||
    appliedDiscountAmount > 0;

  /** Bước 1 nhãn «Nhập thông tin…» — cùng lúc với primaryCtaSentenceCase từ parent */
  const ctaIncompleteReminderLook =
    bookingStep === 1 && Boolean(primaryCtaSentenceCase);

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      {heroUrl ? (
        // Tour ảnh có thể từ CDN ngoài; giữ img để không cấu hình remotePatterns cho mọi host.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={heroUrl} alt="" className="h-32 w-full object-cover" />
      ) : (
        <div className="h-24 bg-gradient-to-br from-[#0b5ea8] to-sky-900" />
      )}

      <div className="border-b border-stone-100 bg-stone-50/80 px-4 py-2.5">
        <p className="text-center text-[11px] font-bold uppercase tracking-wide text-[#0b5ea8]">
          {bookingStep === 1 ? 'Tóm tắt chuyến đi' : 'Phiếu xác nhận booking'}
        </p>
      </div>

      <div className="p-4">
        <p className="line-clamp-3 text-sm font-bold leading-snug text-stone-900">
          {tour.name}
        </p>
        {tourCodeLine ? (
          <p className="mt-1.5 text-[11px] text-stone-500">
            Mã tour:{' '}
            <span className="font-semibold text-stone-700">{tourCodeLine}</span>
          </p>
        ) : null}

        <SidebarFlightSnippet transports={tour.transports ?? []} />

        <div className="mt-3 border-t border-stone-100 pt-3">
          {selectedSchedule && selStart && selEnd ? (
            <div className="space-y-1.5 text-xs text-stone-700">
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 shrink-0 text-[#0b5ea8]" />
                <span>
                  <strong>{formatVnDate(selStart)}</strong>
                  <span className="text-stone-400"> → </span>
                  <strong>{formatVnDate(selEnd)}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 text-stone-600">
                <Clock className="h-3.5 w-3.5 shrink-0 text-[#0b5ea8]" />
                Khởi hành lúc {formatVnTime(selStart)}
              </div>
              {remainingSeats != null && remainingSeats <= 10 ? (
                <div
                  className={`flex items-center gap-1.5 font-semibold ${
                    remainingSeats <= 3 ? 'text-red-600' : 'text-amber-600'
                  }`}
                >
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {remainingSeats <= 3
                    ? `Chỉ còn ${remainingSeats} chỗ!`
                    : `Còn ${remainingSeats} chỗ`}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-stone-300 px-3 py-2 text-center text-xs text-stone-400">
              Chưa chọn lịch khởi hành
            </div>
          )}
        </div>

        {showUrgencyBlock ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
              <span className="text-[11px] font-bold uppercase text-amber-900">
                Ưu đãi / chỗ cuối
              </span>
            </div>
            {remainingSeats != null && remainingSeats <= 10 ? (
              <p className="mt-1 text-xs font-semibold text-red-700">
                Còn {remainingSeats} chỗ
              </p>
            ) : null}
            {appliedDiscountAmount > 0 ? (
              <p className="mt-1 text-xs text-emerald-800">
                Đã áp giảm: <strong>−{formatVnd(appliedDiscountAmount)}</strong>
              </p>
            ) : null}
          </div>
        ) : null}

        {SHOW_PROMO_CODE_UI && unitPrice != null ? (
          <div className="mt-3 border-y border-stone-200 py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                  <Percent className="h-4 w-4" strokeWidth={2.5} />
                </span>
                <span className="text-xs font-bold uppercase tracking-wide text-stone-900">
                  Mã giảm giá
                </span>
              </div>
              {appliedPromoCode ? (
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                    {appliedPromoCode}
                  </span>
                  <button
                    type="button"
                    onClick={onClearPromo}
                    className="text-stone-400 hover:text-red-600"
                    aria-label="Xóa mã"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onOpenPromo}
                  className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-red-500 text-red-600">
                    <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </span>
                  Thêm mã giảm giá
                </button>
              )}
            </div>
          </div>
        ) : null}

        {unitPrice != null ? (
          <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-3">
            <div className="rounded-lg bg-white/90 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2 border-b border-stone-100 pb-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Users className="h-4 w-4 shrink-0 text-stone-700" />
                  <span className="text-[11px] font-bold uppercase tracking-wide text-stone-900">
                    Khách hàng
                  </span>
                </div>
                {subtotalBeforeDiscount != null ? (
                  <span className="text-sm font-bold text-red-600">
                    {formatVnd(subtotalBeforeDiscount)}
                  </span>
                ) : (
                  <span className="text-sm font-bold text-stone-400">—</span>
                )}
              </div>
              <div className="mt-2 space-y-2 text-xs">
                {adults > 0 ? (
                  <div className="flex justify-between gap-2 text-stone-700">
                    <span>Người lớn</span>
                    <span className="shrink-0 tabular-nums">
                      {adults} × {formatVnd(unitPrice)}
                    </span>
                  </div>
                ) : null}
                {childPassengerQty > 0 && priceChild5to11 != null ? (
                  <div className="flex justify-between gap-2 text-stone-700">
                    <span>Trẻ em</span>
                    <span className="shrink-0 tabular-nums">
                      {childPassengerQty} × {formatVnd(priceChild5to11)}
                    </span>
                  </div>
                ) : null}
                {infants > 0 && priceInfant2to4 != null ? (
                  <div className="flex justify-between gap-2 text-stone-700">
                    <span>Trẻ nhỏ</span>
                    <span className="shrink-0 tabular-nums">
                      {infants} × {formatVnd(priceInfant2to4)}
                    </span>
                  </div>
                ) : null}
                {singleRoomTotal > 0 ? (
                  <div className="flex justify-between gap-2 text-stone-700">
                    <span>Phụ thu phòng đơn</span>
                    <span className="shrink-0 font-medium tabular-nums text-stone-900">
                      {formatVnd(singleRoomTotal)}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            {appliedDiscountAmount > 0 && appliedPromoCode ? (
              <div className="mt-2 flex justify-between gap-2 text-xs text-emerald-700">
                <span>Giảm ({appliedPromoCode})</span>
                <span className="font-semibold">
                  −{formatVnd(appliedDiscountAmount)}
                </span>
              </div>
            ) : null}

            <div className="mt-3 flex items-end justify-between border-t border-stone-200 pt-3">
              <span className="text-sm font-bold text-stone-800">
                Tổng tiền
              </span>
              <span className="text-xl font-black tabular-nums text-red-600 sm:text-2xl">
                {totalAmount != null ? formatVnd(totalAmount) : '—'}
              </span>
            </div>
            <p className="mt-0.5 text-[10px] text-stone-400">
              Đã bao gồm thuế và phí dịch vụ
            </p>
          </div>
        ) : null}

        {bookingStep === 1 ? (
          <label
            className={[
              'mt-4 flex cursor-pointer items-start gap-3 text-[11px] leading-relaxed text-stone-700 transition',
              termsHighlight
                ? 'rounded-lg ring-2 ring-red-400 ring-offset-2'
                : '',
            ].join(' ')}
          >
            <input
              type="checkbox"
              checked={!!agreedToTerms}
              onChange={(e) => onAgreedToTermsChange(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 rounded border-stone-300 text-[#0b5ea8] accent-[#0b5ea8] focus:ring-[#0b5ea8]"
            />
            <span>
              Tôi đồng ý với{' '}
              <Link
                href="#"
                className="font-semibold text-[#0b5ea8] underline"
                onClick={(e) => e.stopPropagation()}
              >
                Chính sách bảo vệ dữ liệu cá nhân
              </Link>{' '}
              và{' '}
              <Link
                href="#"
                className="font-semibold text-[#0b5ea8] underline"
                onClick={(e) => e.stopPropagation()}
              >
                các điều khoản
              </Link>
              .
            </span>
          </label>
        ) : null}

        <button
          type="button"
          disabled={primaryCtaDisabled}
          onClick={onPrimaryCta}
          className={[
            'mt-4 w-full text-center text-sm font-bold shadow-md transition disabled:cursor-not-allowed disabled:opacity-50',
            ctaIncompleteReminderLook
              ? [
                  'rounded-[6px] bg-[#b22222] px-2 py-3.5 normal-case leading-snug tracking-normal shadow-sm',
                  'text-[#d9d4d4]',
                  primaryCtaDisabled
                    ? 'cursor-default shadow-none hover:bg-[#b22222]'
                    : 'hover:bg-[#9f1f1f] hover:text-[#f0eaea] active:bg-[#8e1b1b]',
                ].join(' ')
              : [
                  'rounded-lg bg-[#d42b2f] py-3 text-white shadow-md hover:bg-[#b92227]',
                  primaryCtaSentenceCase
                    ? 'normal-case leading-snug tracking-normal'
                    : 'uppercase tracking-wide',
                ].join(' '),
          ].join(' ')}
        >
          {primaryCtaLabel}
        </button>

        {bookingStep === 1 ? (
          <ul className="mt-3 space-y-1.5 text-[10px] leading-relaxed text-stone-500">
            <li className="flex gap-2">
              <CheckCircle2
                className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600"
                aria-hidden
              />
              Thanh toán trực tuyến ở bước tiếp theo.
            </li>
            <li className="flex gap-2">
              <CheckCircle2
                className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600"
                aria-hidden
              />
              Xác nhận booking được gửi qua email / thông báo trong tài khoản.
            </li>
            <li className="flex gap-2">
              <CheckCircle2
                className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600"
                aria-hidden
              />
              Kiểm tra kỹ thông tin và lịch trước khi nhấn Đặt ngay.
            </li>
          </ul>
        ) : null}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   BƯỚC NHẬP THÔNG TIN — lịch, liên hệ, hành khách, ghi chú
══════════════════════════════════════════════ */
function StepEnterInfo({
  tour,
  contact,
  setContact,
  notes,
  setNotes,
  loggedIn,
  bookingForOthers,
  onBookingForOthersChange,
  scheduleHasOverlap,
  scheduleAvailabilityPending,
  monthKeys,
  activeMonthKey,
  setActiveMonthKey,
  activeDateGroups,
  selectedScheduleId,
  setSelectedScheduleId,
  adults,
  setAdults,
  childPassengerQty,
  setChildPassengerQty,
  infants,
  setInfants,
  adultP,
  setAdultP,
  childP,
  setChildP,
  infantP,
  setInfantP,
  stepErr,
}: {
  tour: TourDetail;
  contact: { fullName: string; email: string; phone: string; address: string };
  setContact: React.Dispatch<
    React.SetStateAction<{
      fullName: string;
      email: string;
      phone: string;
      address: string;
    }>
  >;
  notes: string;
  setNotes: (s: string) => void;
  loggedIn: boolean;
  bookingForOthers: boolean;
  onBookingForOthersChange: (v: boolean) => void;
  scheduleHasOverlap: (dep: FullSchedule) => boolean;
  /** Đang chờ /bookings/me — chưa khóa suất trùng */
  scheduleAvailabilityPending: boolean;
  monthKeys: string[];
  activeMonthKey: string;
  setActiveMonthKey: (k: string) => void;
  activeDateGroups: {
    ymd: string;
    dateLabel: string;
    departures: FullSchedule[];
  }[];
  selectedScheduleId: number | null;
  setSelectedScheduleId: (id: number) => void;
  adults: number;
  setAdults: (n: number) => void;
  childPassengerQty: number;
  setChildPassengerQty: (n: number) => void;
  infants: number;
  setInfants: (n: number) => void;
  adultP: PassengerForm[];
  setAdultP: React.Dispatch<React.SetStateAction<PassengerForm[]>>;
  childP: PassengerForm[];
  setChildP: React.Dispatch<React.SetStateAction<PassengerForm[]>>;
  infantP: PassengerForm[];
  setInfantP: React.Dispatch<React.SetStateAction<PassengerForm[]>>;
  stepErr: string | null;
}) {
  const { transports = [], itineraries = [] } = tour;
  const [scheduleSectionOpen, setScheduleSectionOpen] = useState(true);

  useEffect(() => {
    if (scheduleAvailabilityPending) setScheduleSectionOpen(true);
  }, [scheduleAvailabilityPending]);

  const departureDate = useMemo(() => {
    for (const g of activeDateGroups) {
      const hit = g.departures.find((d) => d.id === selectedScheduleId);
      if (hit) return new Date(hit.startDate);
    }
    return null;
  }, [activeDateGroups, selectedScheduleId]);

  const singleRoomSupplement = tour.singleRoomSupplement ?? null;
  const hasSingleRoomPricing =
    singleRoomSupplement != null && singleRoomSupplement > 0;

  const passengerModalSnapRef = useRef<PassengerDraftBundle | null>(null);
  const [passengerDraft, setPassengerDraft] =
    useState<PassengerDraftBundle | null>(null);
  const [passengerModalErr, setPassengerModalErr] = useState<string | null>(
    null,
  );

  function openPassengerModal() {
    const snap = shallowClonePassengerLists(adultP, childP, infantP);
    passengerModalSnapRef.current = snap;
    setPassengerDraft(snap);
    setPassengerModalErr(null);
  }

  function closePassengerModal() {
    setPassengerDraft(null);
    setPassengerModalErr(null);
  }

  function resetPassengerModal() {
    const base = passengerModalSnapRef.current;
    if (!base) return;
    setPassengerDraft(
      shallowClonePassengerLists(base.adultP, base.childP, base.infantP),
    );
    setPassengerModalErr(null);
  }

  function confirmPassengerModal() {
    if (!passengerDraft) return;
    if (!departureDate) {
      setPassengerModalErr(
        'Vui lòng chọn ngày khởi hành trước khi xác nhận thông tin hành khách.',
      );
      return;
    }
    const dep = departureDate;
    const d = passengerDraft;

    for (let i = 0; i < d.adultP.length; i++) {
      const p = d.adultP[i];
      if (!p.fullName.trim()) {
        setPassengerModalErr(`Vui lòng nhập họ tên người lớn #${i + 1}.`);
        return;
      }
      if (!p.dateOfBirth) {
        setPassengerModalErr(`Vui lòng chọn ngày sinh người lớn #${i + 1}.`);
        return;
      }
      if (!p.gender.trim()) {
        setPassengerModalErr(`Vui lòng chọn giới tính người lớn #${i + 1}.`);
        return;
      }
      const errAge = validateDobForCategory(p.dateOfBirth, 'ADULT', dep);
      if (errAge) {
        setPassengerModalErr(`Người lớn #${i + 1}: ${errAge}`);
        return;
      }
    }

    for (let i = 0; i < d.childP.length; i++) {
      const p = d.childP[i];
      if (!p.fullName.trim()) {
        setPassengerModalErr(`Vui lòng nhập họ tên trẻ em #${i + 1}.`);
        return;
      }
      if (!p.dateOfBirth) {
        setPassengerModalErr(`Vui lòng chọn ngày sinh trẻ em #${i + 1}.`);
        return;
      }
      if (!p.gender.trim()) {
        setPassengerModalErr(`Vui lòng chọn giới tính trẻ em #${i + 1}.`);
        return;
      }
      const errAge = validateDobForCategory(p.dateOfBirth, 'CHILD', dep);
      if (errAge) {
        setPassengerModalErr(`Trẻ em #${i + 1}: ${errAge}`);
        return;
      }
    }

    for (let i = 0; i < d.infantP.length; i++) {
      const p = d.infantP[i];
      if (!p.fullName.trim()) {
        setPassengerModalErr(`Vui lòng nhập họ tên trẻ nhỏ #${i + 1}.`);
        return;
      }
      if (!p.dateOfBirth) {
        setPassengerModalErr(`Vui lòng chọn ngày sinh trẻ nhỏ #${i + 1}.`);
        return;
      }
      if (!p.gender.trim()) {
        setPassengerModalErr(`Vui lòng chọn giới tính trẻ nhỏ #${i + 1}.`);
        return;
      }
      const errAge = validateDobForCategory(p.dateOfBirth, 'INFANT', dep);
      if (errAge) {
        setPassengerModalErr(`Trẻ nhỏ #${i + 1}: ${errAge}`);
        return;
      }
    }

    const canBookSingle =
      singleRoomSupplement != null && singleRoomSupplement > 0;
    setAdultP(
      d.adultP.map((x) => ({
        ...x,
        wantsSingleRoom: canBookSingle ? (x.wantsSingleRoom ?? false) : false,
      })),
    );
    setChildP(d.childP.map((x) => ({ ...x })));
    setInfantP(d.infantP.map((x) => ({ ...x })));
    closePassengerModal();
  }

  function patchPassengerDraft(
    next: React.SetStateAction<PassengerDraftBundle>,
  ) {
    setPassengerDraft((prev) => {
      if (prev == null) return prev;
      return typeof next === 'function'
        ? (next as (p: PassengerDraftBundle) => PassengerDraftBundle)(prev)
        : next;
    });
  }

  return (
    <div className="space-y-5">
      {/* Transport + Itinerary */}
      {transports.length > 0 && <TransportSection transports={transports} />}
      {itineraries.length > 0 && <ItinerarySection itineraries={itineraries} />}

      {/* Inclusions / Exclusions */}
      {tour.inclusions || tour.exclusions ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {tour.inclusions ? (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-800">
                  Dịch vụ bao gồm
                </span>
              </div>
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-stone-700">
                {tour.inclusions}
              </p>
            </div>
          ) : null}
          {tour.exclusions ? (
            <div className="rounded-2xl border border-red-100 bg-red-50/60 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-xs font-bold text-red-800">
                  Không bao gồm
                </span>
              </div>
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-stone-700">
                {tour.exclusions}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Chọn ngày khởi hành — đặt trước phần liên hệ để luôn khóa suất trùng tại bước chọn lịch */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <button
          type="button"
          onClick={() => setScheduleSectionOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 border-b border-stone-100 pb-3 text-left transition hover:opacity-90"
          aria-expanded={scheduleSectionOpen}
        >
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
              <Calendar className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-stone-900">
                Chọn ngày khởi hành
              </h3>
            </div>
          </div>
          {scheduleSectionOpen ? (
            <ChevronDown
              className="h-5 w-5 shrink-0 text-stone-400"
              aria-hidden
            />
          ) : (
            <ChevronRight
              className="h-5 w-5 shrink-0 text-stone-400"
              aria-hidden
            />
          )}
        </button>

        {scheduleSectionOpen ? (
          <>
            {scheduleAvailabilityPending ? (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2.5 text-xs text-sky-950">
                <Info className="mt-0.5 h-4 w-4 shrink-0 animate-pulse text-sky-600" />
                <p>
                  Đang tải các tour bạn đã đặt để{' '}
                  <span className="font-semibold">vô hiệu hóa suất trùng thời gian</span>.
                  Vui lòng đợi vài giây rồi mới chọn lịch — tránh chọn nhầm suất
                  chưa được kiểm tra.
                </p>
              </div>
            ) : null}
            {/* Month tabs */}
            <div className="mt-4 flex flex-wrap gap-2">
              {monthKeys.map((k) => (
                <button
                  key={k}
                  type="button"
                  disabled={scheduleAvailabilityPending}
                  onClick={() => setActiveMonthKey(k)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                    scheduleAvailabilityPending
                      ? 'cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400'
                      : k === activeMonthKey
                        ? 'border-teal-600 bg-teal-600 text-white shadow-sm'
                        : 'border-stone-200 bg-white text-stone-600 hover:border-teal-300 hover:bg-teal-50'
                  }`}
                >
                  {monthLabel(k)}
                </button>
              ))}
            </div>

            {/* Date groups */}
            <div className="mt-4 space-y-4">
              {activeDateGroups.length === 0 ? (
                <p className="text-sm text-stone-400">
                  Không có lịch trong tháng này.
                </p>
              ) : (
                activeDateGroups.map((g) => (
                  <div
                    key={g.ymd}
                    className="rounded-xl border border-stone-200 bg-stone-50"
                  >
                    <div className="flex items-center gap-2 border-b border-stone-200 px-4 py-2.5">
                      <Calendar className="h-4 w-4 text-teal-600" />
                      <span className="text-sm font-semibold text-stone-800">
                        Ngày {g.dateLabel}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 p-3">
                      {g.departures.map((dep) => {
                        const depStart = new Date(dep.startDate);
                        const depEnd = new Date(dep.endDate);
                        const rem = remainingSeatsForSchedule(dep);
                        const unitP =
                          dep.priceOverride ?? tour.basePrice ?? null;
                        const isSelected = dep.id === selectedScheduleId;
                        const isSoldOut = isScheduleSoldOut(dep);
                        const overlapBlock = scheduleHasOverlap(dep);
                        const disabled =
                          scheduleAvailabilityPending ||
                          isSoldOut ||
                          overlapBlock;

                        return (
                          <button
                            key={dep.id}
                            type="button"
                            disabled={disabled}
                            onClick={() => setSelectedScheduleId(dep.id)}
                            className={`min-w-[170px] flex-1 rounded-xl border p-3 text-left transition ${
                              isSelected
                                ? 'border-teal-600 bg-teal-50 ring-1 ring-teal-500 shadow-sm'
                                : disabled
                                  ? overlapBlock
                                    ? 'cursor-not-allowed border-amber-200 bg-amber-50/80 opacity-70'
                                    : 'cursor-not-allowed border-stone-200 bg-stone-100 opacity-50'
                                  : 'border-stone-200 bg-white hover:border-teal-300 hover:bg-teal-50'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-teal-600" />
                                <span className="text-sm font-bold text-stone-900">
                                  {formatVnTime(depStart)}
                                </span>
                              </div>
                              {isSelected ? (
                                <span className="rounded-full bg-teal-600 px-2 py-0.5 text-[10px] font-bold text-white">
                                  ✓ Chọn
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-2 space-y-0.5">
                              <div className="flex justify-between text-xs text-stone-500">
                                <span>Kết thúc:</span>
                                <span className="font-medium text-stone-700">
                                  {formatVnDate(depEnd)}
                                </span>
                              </div>
                              <div className="flex justify-between text-xs text-stone-500">
                                <span>Số chỗ còn:</span>
                                <span
                                  className={`font-semibold ${
                                    rem == null
                                      ? 'text-stone-600'
                                      : rem === 0
                                        ? 'text-red-600'
                                        : rem <= 5
                                          ? 'text-amber-600'
                                          : 'text-emerald-600'
                                  }`}
                                >
                                  {rem == null
                                    ? 'Liên hệ'
                                    : isSoldOut
                                      ? 'Hết chỗ'
                                      : rem}
                                </span>
                              </div>
                              {overlapBlock ? (
                                <p className="text-[11px] font-semibold text-amber-800">
                                  Trùng thời gian với tour bạn đã đặt
                                </p>
                              ) : null}
                              <div className="flex justify-between text-xs text-stone-500">
                                <span>Giá/người:</span>
                                <span className="font-bold text-teal-700">
                                  {unitP == null ? 'Liên hệ' : formatVnd(unitP)}
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : null}
      </div>

      {/* Thông tin liên lạc */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 border-b border-stone-100 pb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-[#0b5ea8]">
            <Users className="h-4 w-4" />
          </div>
          <h3 className="text-[13px] font-bold uppercase tracking-wide text-[#0b5ea8]">
            Thông tin liên lạc
          </h3>
        </div>
        {!loggedIn ? (
          <div className="mb-4 flex flex-wrap items-start gap-2 rounded-lg border border-sky-100 bg-sky-50 px-4 py-3 text-xs leading-snug text-sky-950">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
            <p>
              Đăng nhập để tích điểm và lưu nhanh thông tin đặt tour.{' '}
              <Link
                href="/login"
                className="font-bold text-[#0b5ea8] underline"
              >
                Đăng nhập
              </Link>
            </p>
          </div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-700">
              Họ tên *
            </label>
            <input
              type="text"
              value={contact.fullName}
              onChange={(e) =>
                setContact((c) => ({ ...c, fullName: e.target.value }))
              }
              placeholder="Như trên CCCD / hộ chiếu"
              className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm text-stone-900 focus:border-[#0b5ea8] focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-700">
              Điện thoại *
            </label>
            <input
              type="tel"
              value={contact.phone}
              onChange={(e) =>
                setContact((c) => ({ ...c, phone: e.target.value }))
              }
              placeholder="0901 234 567"
              className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm text-stone-900 focus:border-[#0b5ea8] focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-700">
              Email *
            </label>
            <input
              type="email"
              value={contact.email}
              onChange={(e) =>
                setContact((c) => ({ ...c, email: e.target.value }))
              }
              placeholder="email@example.com"
              className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm text-stone-900 focus:border-[#0b5ea8] focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-700">
              Địa chỉ
            </label>
            <input
              type="text"
              value={contact.address}
              onChange={(e) =>
                setContact((c) => ({ ...c, address: e.target.value }))
              }
              placeholder="Tỉnh/Thành phố..."
              className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm text-stone-900 focus:border-[#0b5ea8] focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
          </div>
        </div>
        {loggedIn ? (
          <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-lg border border-amber-100 bg-amber-50/80 px-4 py-3 text-xs text-stone-800">
            <input
              type="checkbox"
              checked={bookingForOthers}
              onChange={(e) => onBookingForOthersChange(e.target.checked)}
              className="h-4 w-4 shrink-0 rounded border-stone-300 text-[#0b5ea8] accent-[#0b5ea8]"
            />
            <span className="font-bold text-amber-950">
              Đặt hộ cho người khác
            </span>
          </label>
        ) : null}
      </div>

      {/* Hành khách */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 border-b border-stone-100 pb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-[#0b5ea8]">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold uppercase tracking-wide text-[#0b5ea8]">
              Hành khách
            </h3>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              {
                label: 'Người lớn',
                sub: 'Từ 12 tuổi trở lên',
                band: 'ADULT' as const,
                val: adults,
                min: 1,
                set: setAdults,
                emphasize: adults >= 1,
              },
              {
                label: 'Trẻ em',
                sub: 'Từ 5 - 11 tuổi',
                band: 'CHILD' as const,
                val: childPassengerQty,
                min: 0,
                set: setChildPassengerQty,
                emphasize: false,
              },
              {
                label: 'Trẻ nhỏ',
                sub: 'Từ 2 - 4 tuổi',
                band: 'INFANT' as const,
                val: infants,
                min: 0,
                set: setInfants,
                emphasize: false,
              },
            ] as const
          ).map((item) => (
            <div
              key={item.label}
              className={[
                'rounded-xl border-2 bg-white p-3 transition-colors',
                item.emphasize
                  ? 'border-[#0b5ea8] shadow-sm'
                  : 'border-stone-200',
              ].join(' ')}
            >
              <p className="text-xs font-bold text-stone-900">{item.label}</p>
              <div className="mt-0.5 flex items-center gap-1">
                <p className="text-[11px] text-stone-500">{item.sub}</p>
                <PassengerAgeHint departure={departureDate} band={item.band} />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => item.set(Math.max(item.min, item.val - 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-stone-50 text-lg font-bold text-stone-700 hover:bg-white"
                >
                  −
                </button>
                <span className="text-2xl font-extrabold text-stone-900">
                  {item.val}
                </span>
                <button
                  type="button"
                  onClick={() => item.set(Math.min(20, item.val + 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-stone-50 text-lg font-bold text-stone-700 hover:bg-white"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 space-y-8 border-t border-stone-100 pt-6">
          <h3 className="text-base font-bold text-stone-900">
            Thông tin hành khách
          </h3>

          {/* Người lớn — mẫu ảnh 1 */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-[#0b5ea8]">
              <Users className="h-4 w-4 shrink-0" />
              <span>Người lớn</span>
              {departureDate ? (
                <PassengerAgeHint departure={departureDate} band="ADULT" />
              ) : null}
            </div>
            {hasSingleRoomPricing ? (
              <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-relaxed text-[#0b5ea8] sm:text-sm">
                Phòng đơn áp dụng cho khách trong nhóm người lớn (sinh trước
                18/05/2014); giá phòng đơn là:{' '}
                <strong>{formatVnd(singleRoomSupplement)} / phòng</strong>
              </div>
            ) : null}
            <div className="space-y-3">
              {adultP.map((p, i) => {
                const wants = p.wantsSingleRoom ?? false;
                const filled = p.fullName.trim() && p.dateOfBirth && p.gender.trim();
                return (
                  <div
                    key={`row-a-${i}`}
                    className="flex flex-wrap items-center gap-3 sm:flex-nowrap"
                  >
                    <span className="w-8 shrink-0 text-sm font-semibold text-stone-600">
                      #{i + 1}
                    </span>
                    <button
                      type="button"
                      onClick={openPassengerModal}
                      className={[
                        'flex min-h-[52px] min-w-0 flex-1 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition',
                        filled
                          ? 'border-stone-200 bg-white hover:border-[#0b5ea8] hover:bg-sky-50/50'
                          : 'border-dashed border-stone-300 bg-white hover:border-[#0b5ea8] hover:bg-sky-50/50',
                      ].join(' ')}
                    >
                      {filled ? (
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="truncate text-sm font-semibold text-stone-900">{p.fullName}</span>
                          <span className="text-xs text-stone-500">
                            {p.gender} · {formatVnDobYmd(p.dateOfBirth)}
                          </span>
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-rose-600">
                          Người lớn (*)
                        </span>
                      )}
                      <span className={['shrink-0 text-sm font-semibold', filled ? 'text-[#0b5ea8]' : 'text-red-600'].join(' ')}>
                        {filled ? 'Sửa →' : 'Nhập thông tin →'}
                      </span>
                    </button>
                    {hasSingleRoomPricing ? (
                      <div className="flex shrink-0 flex-col items-center gap-1 pl-1 sm:w-[120px]">
                        <span className="text-center text-[11px] font-medium text-stone-600">
                          Phòng đơn:
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={wants}
                          title="Bật nếu người này đăng ký phòng đơn"
                          onClick={() =>
                            setAdultP((arr) =>
                              arr.map((x, j) =>
                                j === i
                                  ? {
                                      ...x,
                                      wantsSingleRoom: !(
                                        x.wantsSingleRoom ?? false
                                      ),
                                    }
                                  : x,
                              ),
                            )
                          }
                          className={[
                            'relative h-8 w-14 shrink-0 rounded-full transition-colors',
                            wants ? 'bg-[#0b5ea8]' : 'bg-stone-300',
                          ].join(' ')}
                        >
                          <span
                            className={[
                              'absolute top-0.5 h-7 w-7 rounded-full bg-white shadow transition-transform',
                              wants ? 'left-7' : 'left-0.5',
                            ].join(' ')}
                          />
                        </button>
                        <span className="text-center text-[10px] font-medium text-[#0b5ea8]">
                          Phòng đơn
                        </span>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Trẻ em */}
          {childP.length > 0 ? (
            <section className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-[#0b5ea8]">
                <Users className="h-4 w-4 shrink-0" />
                <span>Trẻ em</span>
                {departureDate ? (
                  <PassengerAgeHint departure={departureDate} band="CHILD" />
                ) : null}
              </div>
              <div className="space-y-3">
                {childP.map((p, i) => {
                  const filled = p.fullName.trim() && p.dateOfBirth && p.gender.trim();
                  return (
                    <div
                      key={`row-c-${i}`}
                      className="flex items-center gap-3"
                    >
                      <span className="w-8 shrink-0 text-sm font-semibold text-stone-600">
                        #{i + 1}
                      </span>
                      <button
                        type="button"
                        onClick={openPassengerModal}
                        className={[
                          'flex min-h-[52px] flex-1 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition',
                          filled
                            ? 'border-stone-200 bg-white hover:border-[#0b5ea8] hover:bg-sky-50/50'
                            : 'border-dashed border-stone-300 bg-white hover:border-[#0b5ea8] hover:bg-sky-50/50',
                        ].join(' ')}
                      >
                        {filled ? (
                          <span className="flex min-w-0 flex-col gap-0.5">
                            <span className="truncate text-sm font-semibold text-stone-900">{p.fullName}</span>
                            <span className="text-xs text-stone-500">
                              {p.gender} · {formatVnDobYmd(p.dateOfBirth)}
                            </span>
                          </span>
                        ) : (
                          <span className="text-sm font-medium text-rose-600">
                            Trẻ em (*)
                          </span>
                        )}
                        <span className={['shrink-0 text-sm font-semibold', filled ? 'text-[#0b5ea8]' : 'text-red-600'].join(' ')}>
                          {filled ? 'Sửa →' : 'Nhập thông tin →'}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* Trẻ nhỏ */}
          {infantP.length > 0 ? (
            <section className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-[#0b5ea8]">
                <Users className="h-4 w-4 shrink-0" />
                <span>Trẻ nhỏ</span>
                {departureDate ? (
                  <PassengerAgeHint departure={departureDate} band="INFANT" />
                ) : null}
              </div>
              <div className="space-y-3">
                {infantP.map((p, i) => {
                  const filled = p.fullName.trim() && p.dateOfBirth && p.gender.trim();
                  return (
                    <div
                      key={`row-i-${i}`}
                      className="flex items-center gap-3"
                    >
                      <span className="w-8 shrink-0 text-sm font-semibold text-stone-600">
                        #{i + 1}
                      </span>
                      <button
                        type="button"
                        onClick={openPassengerModal}
                        className={[
                          'flex min-h-[52px] flex-1 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition',
                          filled
                            ? 'border-stone-200 bg-white hover:border-[#0b5ea8] hover:bg-sky-50/50'
                            : 'border-dashed border-stone-300 bg-white hover:border-[#0b5ea8] hover:bg-sky-50/50',
                        ].join(' ')}
                      >
                        {filled ? (
                          <span className="flex min-w-0 flex-col gap-0.5">
                            <span className="truncate text-sm font-semibold text-stone-900">{p.fullName}</span>
                            <span className="text-xs text-stone-500">
                              {p.gender} · {formatVnDobYmd(p.dateOfBirth)}
                            </span>
                          </span>
                        ) : (
                          <span className="text-sm font-medium text-rose-600">
                            Trẻ nhỏ (*)
                          </span>
                        )}
                        <span className={['shrink-0 text-sm font-semibold', filled ? 'text-[#0b5ea8]' : 'text-red-600'].join(' ')}>
                          {filled ? 'Sửa →' : 'Nhập thông tin →'}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-lg border border-sky-100 bg-sky-50/80 px-3 py-2.5 text-xs text-sky-900">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600" />
          Họ tên hành khách phải trùng khớp giấy tờ khi làm thủ tục.
        </div>
      </div>

      {/* Ghi chú */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2 border-b border-stone-100 pb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-stone-600">
            <Info className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold uppercase tracking-wide text-stone-900">
              Ghi chú
            </h3>
            <p className="text-xs text-stone-500">
              Yêu cầu ăn uống, hỗ trợ đặc biệt…
            </p>
          </div>
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Nhập ghi chú cho đơn vị lữ hành (nếu có)…"
          className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm text-stone-900 focus:border-[#0b5ea8] focus:outline-none focus:ring-2 focus:ring-sky-100"
        />
      </div>

      {stepErr ? (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          {stepErr}
        </div>
      ) : null}
      {passengerDraft ? (
        <PassengerDetailsModal
          draft={passengerDraft}
          setDraft={patchPassengerDraft}
          departureDate={departureDate}
          singleRoomPrice={singleRoomSupplement}
          error={passengerModalErr}
          onClose={closePassengerModal}
          onConfirm={confirmPassengerModal}
          onReset={resetPassengerModal}
        />
      ) : null}
    </div>
  );
}

/* ── mask helpers cho bước thanh toán ── */
function maskName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return '****';
  return parts.map((p, i) => (i === parts.length - 1 ? p : '****')).join(' ');
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '****';
  const visible = local.slice(-3);
  return `${'*'.repeat(Math.max(1, local.length - 3))}${visible}@${domain}`;
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return '****';
  return '*'.repeat(digits.length - 4) + digits.slice(-4);
}

/* ══════════════════════════════════════════════
   Bước thanh toán — xác nhận giống phiếu Vietravel (trước khi tạo booking)
══════════════════════════════════════════════ */
function StepPaymentReview({
  tour,
  selectedSchedule,
  adultP,
  childP,
  infantP,
  contact,
  notes,
  unitPrice,
  totalAmount,
  appliedPromoCode,
  appliedDiscountAmount,
  submitErr,
  cancellationPolicy,
}: {
  tour: TourDetail;
  selectedSchedule: FullSchedule | null;
  adultP: PassengerForm[];
  childP: PassengerForm[];
  infantP: PassengerForm[];
  contact: { fullName: string; email: string; phone: string; address: string };
  notes: string;
  unitPrice: number | null;
  totalAmount: number | null;
  appliedPromoCode: string | null;
  appliedDiscountAmount: number;
  submitErr: string | null;
  cancellationPolicy?: string | null;
}) {
  const selStart = selectedSchedule
    ? new Date(selectedSchedule.startDate)
    : null;
  const selEnd = selectedSchedule ? new Date(selectedSchedule.endDate) : null;
  const allPassengers = [...adultP, ...childP, ...infantP];
  const [passengersOpen, setPassengersOpen] = useState(false);

  return (
    <div className="space-y-4">
      {/* ── THÔNG TIN LIÊN LẠC ── */}
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <p className="border-b border-stone-200 px-5 py-3 text-[13px] font-bold uppercase tracking-wide text-[#0b5ea8]">
          Thông tin liên lạc
        </p>
        <div className="px-5 py-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs font-medium text-stone-400">Họ tên</p>
              <p className="mt-1 font-medium text-stone-900">{maskName(contact.fullName)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-stone-400">Email</p>
              <p className="mt-1 break-all text-stone-700">{maskEmail(contact.email)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-stone-400">Điện thoại</p>
              <p className="mt-1 text-stone-700">{maskPhone(contact.phone)}</p>
            </div>
          </div>
          {notes ? (
            <div className="mt-3 border-t border-stone-100 pt-3 text-sm">
              <p className="text-xs font-medium text-stone-400">Ghi chú</p>
              <p className="mt-1 text-stone-600">{notes}</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* ── CHI TIẾT BOOKING ── */}
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <p className="border-b border-stone-200 px-5 py-3 text-[13px] font-bold uppercase tracking-wide text-[#0b5ea8]">
          Chi tiết booking
        </p>
        <div className="bg-white">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-stone-100">
                <td className="w-48 px-5 py-2.5 text-stone-500">Mã đặt chỗ:</td>
                <td className="px-5 py-2.5 font-bold text-red-600">
                  (Sẽ tạo sau khi xác nhận)
                </td>
              </tr>
              <tr className="border-b border-stone-100">
                <td className="px-5 py-2.5 text-stone-500">Ngày tạo:</td>
                <td className="px-5 py-2.5 text-stone-800">
                  {new Date().toLocaleString('vi-VN', {
                    timeZone: 'Asia/Ho_Chi_Minh',
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </td>
              </tr>
              <tr className="border-b border-stone-100">
                <td className="w-48 px-5 py-2.5 text-stone-500">Trị giá booking:</td>
                <td className="px-5 py-2.5 font-semibold text-stone-900">
                  {totalAmount != null ? formatVnd(totalAmount) : 'Liên hệ'}
                </td>
              </tr>
              {appliedDiscountAmount > 0 && appliedPromoCode ? (
                <tr className="border-b border-stone-100">
                  <td className="px-5 py-2.5 text-stone-500">Giảm giá ({appliedPromoCode}):</td>
                  <td className="px-5 py-2.5 font-semibold text-emerald-700">
                    −{formatVnd(appliedDiscountAmount)}
                  </td>
                </tr>
              ) : null}
              <tr className="border-b border-stone-100">
                <td className="px-5 py-2.5 text-stone-500">Số tiền đã thanh toán:</td>
                <td className="px-5 py-2.5 font-bold text-stone-900">{formatVnd(0)}</td>
              </tr>
              <tr className="border-b border-stone-100">
                <td className="px-5 py-2.5 text-stone-500">Số tiền còn lại:</td>
                <td className="px-5 py-2.5 font-semibold text-stone-900">
                  {totalAmount != null ? formatVnd(totalAmount) : 'Liên hệ'}
                </td>
              </tr>
              <tr className="border-b border-stone-100">
                <td className="px-5 py-2.5 text-stone-500">Tình trạng:</td>
                <td className="px-5 py-2.5 font-bold italic text-[#0b5ea8]">
                  Chờ xác nhận thanh toán
                </td>
              </tr>
              <tr>
                <td className="px-5 py-2.5 text-stone-500">Thời hạn thanh toán:</td>
                <td className="px-5 py-2.5">
                  <span className="font-bold text-red-600">
                    Sau khi xác nhận
                  </span>
                  <span className="ml-1 text-xs italic text-red-500">
                    - (Theo giờ Việt Nam. Booking sẽ tự động hủy nếu quá thời hạn thanh toán)
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── DANH SÁCH HÀNH KHÁCH (collapsible) ── */}
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setPassengersOpen((v) => !v)}
          className="flex w-full items-center justify-between border-b border-stone-200 px-5 py-3 text-left"
        >
          <span className="text-[13px] font-bold uppercase tracking-wide text-[#0b5ea8]">
            Danh sách hành khách
          </span>
          {passengersOpen ? (
            <ChevronDown className="h-5 w-5 text-stone-400 rotate-180 transition-transform" />
          ) : (
            <ChevronDown className="h-5 w-5 text-stone-400 transition-transform" />
          )}
        </button>
        {passengersOpen ? (
          <div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-left text-[11px] font-semibold uppercase text-stone-500">
                    <th className="px-5 py-2.5">Họ tên</th>
                    <th className="px-5 py-2.5">Ngày sinh</th>
                    <th className="px-5 py-2.5">Giới tính</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {allPassengers.map((p, idx) => (
                    <tr key={`row-${idx}`}>
                      <td className="px-5 py-2.5 font-medium text-stone-900">
                        {p.fullName || '—'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-2.5 text-stone-600">
                        {formatVnDobYmd(p.dateOfBirth)}
                      </td>
                      <td className="px-5 py-2.5 text-stone-600">
                        {p.gender?.trim() || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>

      {cancellationPolicy ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
          <Shield
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
            aria-hidden
          />
          <div>
            <p className="text-xs font-bold text-amber-900">
              Chính sách hủy tour
            </p>
            <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-stone-700">
              {cancellationPolicy}
            </p>
          </div>
        </div>
      ) : null}

      {submitErr ? (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          {submitErr}
        </div>
      ) : null}
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
export default function TourBookingClient({
  tour,
  preselectedScheduleId,
}: {
  tour: TourDetail;
  preselectedScheduleId?: number;
}) {
  const bookingPageStartRef = useRef<HTMLDivElement>(null);

  const schedules = useMemo<FullSchedule[]>(
    () =>
      [...(tour.schedules ?? [])]
        .filter((s) => isScheduleBookable(s.startDate))
        .sort(
          (a, b) =>
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
        ) as FullSchedule[],
    [tour.schedules],
  );

  /* ── auth ── */
  const [mounted, setMounted] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  useEffect(() => {
    let alive = true;
    setMounted(true);
    void ensureSessionFresh().finally(() => {
      if (!alive) return;
      setLoggedIn(hasAccessToken());
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    function onAuth() {
      setLoggedIn(hasAccessToken());
    }
    window.addEventListener(AUTH_CHANGED_EVENT, onAuth);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, onAuth);
  }, []);

  /* ── step ── */
  const [step, setStep] = useState<1 | 2>(1);
  const [stepErr, setStepErr] = useState<string | null>(null);

  /* ── schedule ── */
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(
    () => {
      if (preselectedScheduleId) {
        const m = schedules.find((s) => s.id === preselectedScheduleId);
        if (m && !isScheduleSoldOut(m)) return m.id;
      }
      return firstScheduleWithSeats(schedules)?.id ?? null;
    },
  );
  useEffect(() => {
    if (schedules.length === 0) {
      if (selectedScheduleId != null) setSelectedScheduleId(null);
    }
  }, [schedules.length, selectedScheduleId]);

  const monthKeys = useMemo(() => {
    const k = new Set<string>();
    schedules.forEach((s) => k.add(utcMonthKey(new Date(s.startDate))));
    return [...k].sort();
  }, [schedules]);

  const [activeMonthKey, setActiveMonthKey] = useState(() => {
    const first = schedules[0];
    return first ? utcMonthKey(new Date(first.startDate)) : '';
  });
  useEffect(() => {
    if (!selectedScheduleId) return;
    const s = schedules.find((x) => x.id === selectedScheduleId);
    if (s) setActiveMonthKey(utcMonthKey(new Date(s.startDate)));
  }, [selectedScheduleId, schedules]);

  const groupedByDate = useMemo(() => {
    const map = new Map<
      string,
      { ymd: string; dateLabel: string; departures: FullSchedule[] }
    >();
    for (const s of schedules) {
      const d = new Date(s.startDate);
      const ymd = utcYmd(d);
      if (!map.has(ymd))
        map.set(ymd, {
          ymd,
          dateLabel: formatVnDate(d),
          departures: [] as FullSchedule[],
        });
      map.get(ymd)!.departures.push(s);
    }
    return [...map.values()].sort(
      (a, b) =>
        new Date(a.departures[0].startDate).getTime() -
        new Date(b.departures[0].startDate).getTime(),
    );
  }, [schedules]);

  const activeDateGroups = useMemo(
    () =>
      groupedByDate.filter(
        (g) =>
          utcMonthKey(new Date(g.departures[0].startDate)) === activeMonthKey,
      ),
    [groupedByDate, activeMonthKey],
  );

  const selectedSchedule = useMemo<FullSchedule | null>(
    () =>
      selectedScheduleId
        ? (schedules.find((s) => s.id === selectedScheduleId) ?? null)
        : null,
    [selectedScheduleId, schedules],
  );

  /* ── passengers ── */
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [adultP, setAdultP] = useState<PassengerForm[]>([
    {
      fullName: '',
      dateOfBirth: '',
      gender: '',
      wantsSingleRoom: false,
      phone: '',
    },
  ]);
  const [childP, setChildP] = useState<PassengerForm[]>([]);
  const [infantP, setInfantP] = useState<PassengerForm[]>([]);

  useEffect(() => {
    setAdultP((p) =>
      Array.from({ length: adults }, (_, i) => {
        const prev = p[i];
        if (prev) return prev;
        return {
          fullName: '',
          dateOfBirth: '',
          gender: '',
          wantsSingleRoom: false,
          phone: '',
        };
      }),
    );
  }, [adults]);
  useEffect(() => {
    setChildP((p) =>
      Array.from(
        { length: children },
        (_, i) =>
          p[i] ?? {
            fullName: '',
            dateOfBirth: '',
            gender: '',
            phone: '',
          },
      ),
    );
  }, [children]);
  useEffect(() => {
    setInfantP((p) =>
      Array.from(
        { length: infants },
        (_, i) =>
          p[i] ?? {
            fullName: '',
            dateOfBirth: '',
            gender: '',
            phone: '',
          },
      ),
    );
  }, [infants]);

  /** Tour không cấu hình phụ thu phòng đơn → tắt hết cờ phòng đơn */
  useEffect(() => {
    const sr = tour.singleRoomSupplement;
    if (sr != null && Number(sr) > 0) return;
    setAdultP((arr) => {
      if (!arr.some((p) => p.wantsSingleRoom)) return arr;
      return arr.map((p) => ({ ...p, wantsSingleRoom: false }));
    });
  }, [tour.id, tour.singleRoomSupplement]);

  /* ── contact ── */
  const storedEmail = useMemo(() => getStoredUserEmail(), []);
  const [contact, setContact] = useState({
    fullName: '',
    email: storedEmail ?? '',
    phone: '',
    address: '',
  });
  const [notes, setNotes] = useState('');

  const [bookingForOthers, setBookingForOthers] = useState(false);
  const [profileDefaults, setProfileDefaults] = useState<{
    fullName: string;
    email: string;
    phone: string;
    address: string;
  } | null>(null);
  const [myBookings, setMyBookings] = useState<BookingListItem[]>([]);
  const [myBookingsLoading, setMyBookingsLoading] = useState(false);
  const prevBookingForOthers = useRef(false);

  const singleRoomCount = useMemo(
    () => adultP.filter((p) => p.wantsSingleRoom).length,
    [adultP],
  );

  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(false);
  const [termsHighlight, setTermsHighlight] = useState(false);

  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);
  const [appliedDiscountAmount, setAppliedDiscountAmount] = useState(0);
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoDraft, setPromoDraft] = useState('');
  const [promoErr, setPromoErr] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);

  useEffect(() => {
    setAppliedPromoCode(null);
    setAppliedDiscountAmount(0);
  }, [adults, children, infants, singleRoomCount, selectedScheduleId]);

  useEffect(() => {
    if (!loggedIn) setBookingForOthers(false);
  }, [loggedIn]);

  useEffect(() => {
    if (!(mounted && loggedIn)) {
      setProfileDefaults(null);
      return;
    }
    const token = localStorage.getItem(AUTH_KEYS.accessToken);
    if (!token) return;
    void getMe(token).then((r) => {
      if (!r.ok) return;
      const d = r.data;
      const fn = [d.firstName, d.lastName].filter(Boolean).join(' ').trim();
      setProfileDefaults({
        fullName: fn,
        email: d.email ?? '',
        phone: d.phone ?? '',
        address: '',
      });
    });
  }, [mounted, loggedIn]);

  useEffect(() => {
    if (!loggedIn || bookingForOthers) {
      setMyBookings([]);
      setMyBookingsLoading(false);
      return;
    }
    setMyBookingsLoading(true);
    void getMyBookings().then((r) => {
      if (r.ok) setMyBookings(r.data);
      else setMyBookings([]);
      setMyBookingsLoading(false);
    });
  }, [loggedIn, bookingForOthers]);

  useEffect(() => {
    if (!loggedIn || bookingForOthers || !profileDefaults) return;
    setContact((c) => {
      if (c.fullName.trim() && c.phone.trim()) return c;
      return {
        ...profileDefaults,
        address: c.address,
        email: c.email.trim() || profileDefaults.email,
      };
    });
  }, [loggedIn, bookingForOthers, profileDefaults]);

  useEffect(() => {
    const prev = prevBookingForOthers.current;
    prevBookingForOthers.current = bookingForOthers;

    if (bookingForOthers && !prev) {
      setContact({ fullName: '', email: '', phone: '', address: '' });
      setNotes('');
      setAdults(1);
      setChildren(0);
      setInfants(0);
      setAdultP([
        {
          fullName: '',
          dateOfBirth: '',
          gender: '',
          wantsSingleRoom: false,
          phone: '',
        },
      ]);
      setChildP([]);
      setInfantP([]);
      setAppliedPromoCode(null);
      setAppliedDiscountAmount(0);
    } else if (!bookingForOthers && prev && profileDefaults) {
      setContact(profileDefaults);
      setAdultP([
        {
          fullName: '',
          dateOfBirth: '',
          gender: '',
          wantsSingleRoom: false,
          phone: '',
        },
      ]);
      setChildP([]);
      setInfantP([]);
    }
  }, [bookingForOthers, profileDefaults]);

  const scheduleHasOverlap = useMemo(() => {
    if (!loggedIn || bookingForOthers) return () => false;
    const nowMs = Date.now();
    const ranges = myBookings
      .filter((b) => myBookingBlocksOverlap(b, nowMs))
      .map((b) => ({
        start: new Date(b.schedule.startDate),
        end: new Date(b.schedule.endDate),
      }));
    return (s: FullSchedule) => {
      const ns = new Date(s.startDate);
      const ne = new Date(s.endDate);
      return ranges.some((r) =>
        schedulesOverlapUtc(ns, ne, r.start, r.end),
      );
    };
  }, [loggedIn, bookingForOthers, myBookings]);

  useEffect(() => {
    if (schedules.length === 0) return;
    const exists =
      selectedScheduleId != null &&
      schedules.some((s) => s.id === selectedScheduleId);
    if (!exists) {
      if (selectedScheduleId != null) {
        const pick =
          schedules.find(
            (s) =>
              !isScheduleSoldOut(s) &&
              !(loggedIn && !bookingForOthers && scheduleHasOverlap(s)),
          ) ??
          schedules.find((s) => !isScheduleSoldOut(s));
        if (pick) setSelectedScheduleId(pick.id);
      }
      return;
    }
    const current = schedules.find((x) => x.id === selectedScheduleId);
    if (current && isScheduleSoldOut(current)) {
      setSelectedScheduleId(null);
      setStepErr('Đã hết chỗ — vui lòng chọn lịch khởi hành khác.');
      return;
    }
    if (
      loggedIn &&
      !bookingForOthers &&
      !myBookingsLoading &&
      selectedScheduleId != null
    ) {
      const s = schedules.find((x) => x.id === selectedScheduleId);
      if (s && scheduleHasOverlap(s)) {
        setSelectedScheduleId(null);
        setStepErr(
          'Lịch bạn chọn trùng thời gian với tour đã đặt. Vui lòng chọn một suất khác trong danh sách (các suất trùng đã bị vô hiệu hóa).',
        );
      }
    }
  }, [
    schedules,
    selectedScheduleId,
    loggedIn,
    bookingForOthers,
    scheduleHasOverlap,
    myBookingsLoading,
  ]);

  /* ── price ── */
  const unitPrice = selectedSchedule?.priceOverride ?? tour.basePrice ?? null;
  const priceChild5to11 =
    unitPrice != null ? Math.round(unitPrice * 0.9) : null;
  const priceInfant2to4 =
    unitPrice != null ? Math.round(unitPrice * 0.5) : null;
  const srPer = tour.singleRoomSupplement ?? null;
  const singleRoomSupplementTotal =
    srPer != null && srPer > 0 ? singleRoomCount * srPer : 0;
  const passengerSubtotal =
    unitPrice != null
      ? Math.round(unitPrice * adults) +
        Math.round(unitPrice * 0.9 * children) +
        Math.round(unitPrice * 0.5 * infants)
      : null;
  const subtotalBeforeDiscount =
    passengerSubtotal != null
      ? passengerSubtotal + singleRoomSupplementTotal
      : null;
  const totalAmount =
    subtotalBeforeDiscount != null
      ? Math.max(0, Math.round(subtotalBeforeDiscount - appliedDiscountAmount))
      : null;

  /** Lịch + liên lạc + hành khách đủ (chưa kể tích điều khoản). */
  const step1EssentialInfoComplete = useMemo(() => {
    if (!selectedScheduleId) return false;
    const em = contact.email.trim();
    if (!contact.fullName.trim() || !em || !contact.phone.trim()) return false;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return false;
    const passengers = [...adultP, ...childP, ...infantP];
    if (
      passengers.some(
        (p) => !p.fullName.trim() || !p.dateOfBirth || !p.gender.trim(),
      )
    ) {
      return false;
    }
    return true;
  }, [selectedScheduleId, contact, adultP, childP, infantP]);

  const step1AgeOk = useMemo(() => {
    if (!selectedSchedule) return false;
    const dep = new Date(selectedSchedule.startDate);
    const rows: { dateOfBirth: string; c: 'ADULT' | 'CHILD' | 'INFANT' }[] = [
      ...adultP.map((p) => ({ dateOfBirth: p.dateOfBirth, c: 'ADULT' as const })),
      ...childP.map((p) => ({ dateOfBirth: p.dateOfBirth, c: 'CHILD' as const })),
      ...infantP.map((p) => ({ dateOfBirth: p.dateOfBirth, c: 'INFANT' as const })),
    ];
    for (const row of rows) {
      if (!row.dateOfBirth?.trim()) return false;
      if (validateDobForCategory(row.dateOfBirth, row.c, dep)) return false;
    }
    return true;
  }, [selectedSchedule, adultP, childP, infantP]);

  /** Nút «Đặt ngay» chỉ khi đủ thông tin, tuổi khớp nhóm, và đã tích đồng ý điều khoản. */
  const step1ShowsBookNow =
    step1EssentialInfoComplete && agreedToTerms && step1AgeOk;

  async function applyPromoFromModal() {
    setPromoErr(null);
    const code = promoDraft.trim();
    if (!code) {
      setPromoErr('Vui lòng nhập mã giảm giá.');
      return;
    }
    if (subtotalBeforeDiscount == null || subtotalBeforeDiscount <= 0) {
      setPromoErr('Chưa có tổng tiền để áp dụng mã.');
      return;
    }
    setPromoLoading(true);
    try {
      const res = await previewPromo({
        code,
        tourId: tour.id,
        subtotalBeforeDiscount,
      });
      if (!res.ok) {
        setPromoErr(errorMessage(res.body));
        return;
      }
      setAppliedPromoCode(code.toUpperCase());
      setAppliedDiscountAmount(res.data.discountAmount);
      setPromoOpen(false);
      setPromoDraft('');
    } finally {
      setPromoLoading(false);
    }
  }

  /* ── submit ── */
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  /** Bước 2 (/book): mở drawer chọn phương thức / xác nhận trước khi tạo booking */
  const [paymentDrawerOpen, setPaymentDrawerOpen] = useState(false);

  useEffect(() => {
    if (step !== 2) setPaymentDrawerOpen(false);
  }, [step]);

  useEffect(() => {
    if (selectedScheduleId != null) setStepErr(null);
  }, [selectedScheduleId]);

  /* ── step nav ── */
  function goToPaymentStep() {
    setStepErr(null);
    setTermsHighlight(false);
    if (!selectedScheduleId) {
      setStepErr('Vui lòng chọn lịch khởi hành.');
      return;
    }
    if (loggedIn && !bookingForOthers && myBookingsLoading) {
      setStepErr('Đang kiểm tra lịch trùng với tour bạn đã đặt. Vui lòng đợi thêm giây lát.');
      return;
    }
    if (selectedSchedule && scheduleHasOverlap(selectedSchedule)) {
      setStepErr(
        'Lịch này trùng thời gian với tour bạn đã đặt. Chọn ngày khác hoặc tick «Đặt hộ cho người khác».',
      );
      return;
    }
    if (selectedSchedule && isScheduleSoldOut(selectedSchedule)) {
      setStepErr('Đã hết chỗ — vui lòng chọn lịch khởi hành khác.');
      return;
    }
    const partySize = adults + children + infants;
    const seatsLeft = selectedSchedule
      ? remainingSeatsForSchedule(selectedSchedule)
      : null;
    if (seatsLeft != null && partySize > seatsLeft) {
      setStepErr(
        seatsLeft <= 0
          ? 'Đã hết chỗ — vui lòng chọn lịch khởi hành khác.'
          : `Lịch này chỉ còn ${seatsLeft} chỗ — không đủ cho nhóm của bạn (${partySize} người). Vui lòng giảm số lượng hoặc chọn lịch khác.`,
      );
      return;
    }
    if (
      !contact.fullName.trim() ||
      !contact.email.trim() ||
      !contact.phone.trim()
    ) {
      setStepErr('Vui lòng điền đầy đủ họ tên, email và số điện thoại.');
      return;
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim());
    if (!emailOk) {
      setStepErr('Email không hợp lệ.');
      return;
    }
    const allP = [...adultP, ...childP, ...infantP];
    if (allP.some((p) => !p.fullName.trim() || !p.dateOfBirth)) {
      setStepErr(
        'Vui lòng điền đầy đủ họ tên và ngày sinh cho tất cả hành khách.',
      );
      return;
    }
    if (allP.some((p) => !p.gender.trim())) {
      setStepErr('Vui lòng chọn giới tính cho tất cả hành khách.');
      return;
    }
    const dep = selectedSchedule
      ? new Date(selectedSchedule.startDate)
      : null;
    if (!dep || Number.isNaN(dep.getTime())) {
      setStepErr('Không xác định được ngày khởi hành. Vui lòng chọn lịch lại.');
      return;
    }
    for (let i = 0; i < adultP.length; i++) {
      const err = validateDobForCategory(
        adultP[i].dateOfBirth,
        'ADULT',
        dep,
      );
      if (err) {
        setStepErr(`Người lớn #${i + 1}: ${err}`);
        return;
      }
    }
    for (let i = 0; i < childP.length; i++) {
      const err = validateDobForCategory(
        childP[i].dateOfBirth,
        'CHILD',
        dep,
      );
      if (err) {
        setStepErr(`Trẻ em #${i + 1}: ${err}`);
        return;
      }
    }
    for (let i = 0; i < infantP.length; i++) {
      const err = validateDobForCategory(
        infantP[i].dateOfBirth,
        'INFANT',
        dep,
      );
      if (err) {
        setStepErr(`Trẻ nhỏ #${i + 1}: ${err}`);
        return;
      }
    }
    if (!agreedToTerms) {
      setTermsHighlight(true);
      setStepErr(
        'Vui lòng đánh dấu đồng ý với Chính sách bảo vệ dữ liệu cá nhân và các điều khoản.',
      );
      return;
    }
    setStep(2);
    bookingPageStartRef.current?.scrollIntoView({
      block: 'start',
      behavior: 'smooth',
    });
  }

  async function onSubmit() {
    setSubmitErr(null);
    setSubmitting(true);
    try {
      const payload: CreateBookingInput = {
        tourScheduleId: selectedScheduleId!,
        contact: {
          fullName: contact.fullName.trim(),
          email: contact.email.trim(),
          phone: contact.phone.trim(),
          address: contact.address.trim() || undefined,
        },
        passengerCounts: { adults, children, infants },
        passengers: [
          ...adultP.map((p) => ({
            fullName: p.fullName.trim(),
            dateOfBirth: p.dateOfBirth,
            gender: p.gender.trim() || undefined,
            ageCategory: 'ADULT' as const,
          })),
          ...childP.map((p) => ({
            fullName: p.fullName.trim(),
            dateOfBirth: p.dateOfBirth,
            gender: p.gender.trim() || undefined,
            ageCategory: 'CHILD' as const,
          })),
          ...infantP.map((p) => ({
            fullName: p.fullName.trim(),
            dateOfBirth: p.dateOfBirth,
            gender: p.gender.trim() || undefined,
            ageCategory: 'INFANT' as const,
          })),
        ],
        notes: notes.trim() || undefined,
        singleRoomCount,
        ...(appliedPromoCode ? { discountCode: appliedPromoCode } : {}),
        bookingForSelf: !bookingForOthers,
      };
      const res = await createBooking(payload);
      if (!res.ok) {
        setSubmitErr(errorMessage(res.body));
        setPaymentDrawerOpen(false);
        return;
      }
      const pay = await createVnpayPayment(
        res.data.id,
        payload.contact.email,
      );
      if (!pay.ok) {
        setSubmitErr(
          errorMessage(pay.body) ||
            'Không tạo được liên kết VNPAY. Bạn có thể thanh toán sau tại mục Đặt chỗ của tôi.',
        );
        setPaymentDrawerOpen(false);
        return;
      }
      window.location.href = pay.data.paymentUrl;
    } finally {
      setSubmitting(false);
    }
  }

  /* ── no schedules ── */
  if (!schedules.length) {
    return (
      <div
        ref={bookingPageStartRef}
        className="mx-auto max-w-xl px-4 py-16 text-center"
      >
        <AlertCircle className="mx-auto h-12 w-12 text-amber-400" />
        <h1 className="mt-4 text-xl font-bold text-stone-900">
          {tour.schedules && tour.schedules.length > 0
            ? 'Không còn lịch khởi hành phù hợp'
            : 'Chưa có lịch khởi hành'}
        </h1>
        <p className="mt-2 text-sm text-stone-500">
          {tour.schedules && tour.schedules.length > 0
            ? 'Các lịch đã qua hoặc không còn mở đặt chỗ. Vui lòng chọn tour khác hoặc liên hệ tư vấn.'
            : 'Tour này hiện chưa có lịch khởi hành. Vui lòng quay lại sau.'}
        </p>
        <Link
          href={`/tours/${tour.id}`}
          className="mt-6 inline-block rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
        >
          ← Quay lại tour
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* ── Page header: Quay lại + tiêu đề + bước (căn giữa) ── */}
      <div
        ref={bookingPageStartRef}
        className="border-b border-stone-200 bg-white"
      >
        <div className="mx-auto max-w-6xl px-4 pb-8 pt-5 sm:px-6 sm:pb-10 sm:pt-6">
          <div className="flex w-full justify-start">
            <Link
              href={`/tours/${tour.id}`}
              className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-stone-600 transition hover:text-[#0b5ea8]"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              Quay lại
            </Link>
          </div>
          <h1 className="mt-6 text-center text-2xl font-bold tracking-tight text-[#0b5ea8] sm:mt-8 sm:text-3xl">
            Đặt tour của bạn
          </h1>
          <p className="mx-auto mt-2 max-w-2xl px-2 text-center text-sm text-stone-600 sm:mt-3">
            {STEP_SUBLINE[step]}
          </p>
          <BookingFlowStepper variant="booking" activeStep={step} />
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* ── MAIN CONTENT ── */}
          <div className="lg:col-span-2">
            {step === 1 && (
              <>
                {tour.cancellationPolicy ? (
                  <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4">
                    <Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                    <div>
                      <p className="text-xs font-bold text-amber-900">
                        Chính sách hủy tour
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-stone-700">
                        {tour.cancellationPolicy}
                      </p>
                    </div>
                  </div>
                ) : null}
                <StepEnterInfo
                  tour={tour}
                  loggedIn={loggedIn}
                  bookingForOthers={bookingForOthers}
                  onBookingForOthersChange={setBookingForOthers}
                  scheduleHasOverlap={scheduleHasOverlap}
                  scheduleAvailabilityPending={myBookingsLoading}
                  contact={contact}
                  setContact={setContact}
                  notes={notes}
                  setNotes={setNotes}
                  monthKeys={monthKeys}
                  activeMonthKey={activeMonthKey}
                  setActiveMonthKey={setActiveMonthKey}
                  activeDateGroups={activeDateGroups}
                  selectedScheduleId={selectedScheduleId}
                  setSelectedScheduleId={setSelectedScheduleId}
                  adults={adults}
                  setAdults={setAdults}
                  childPassengerQty={children}
                  setChildPassengerQty={setChildren}
                  infants={infants}
                  setInfants={setInfants}
                  adultP={adultP}
                  setAdultP={setAdultP}
                  childP={childP}
                  setChildP={setChildP}
                  infantP={infantP}
                  setInfantP={setInfantP}
                  stepErr={stepErr}
                />
              </>
            )}
            {step === 2 && (
              <StepPaymentReview
                tour={tour}
                selectedSchedule={selectedSchedule}
                adultP={adultP}
                childP={childP}
                infantP={infantP}
                contact={contact}
                notes={notes}
                unitPrice={unitPrice}
                totalAmount={totalAmount}
                appliedPromoCode={appliedPromoCode}
                appliedDiscountAmount={appliedDiscountAmount}
                submitErr={submitErr}
                cancellationPolicy={tour.cancellationPolicy}
              />
            )}

            {mounted && !loggedIn && step === 1 ? (
              <p className="mt-3 text-center text-xs text-stone-500">
                Bạn có thể đặt không cần đăng nhập.{' '}
                <Link
                  href="/login"
                  className="font-semibold text-[#0b5ea8] hover:underline"
                >
                  Đăng nhập
                </Link>{' '}
                để quản lý đặt chỗ dễ hơn.
              </p>
            ) : null}
          </div>

          {/* ── SIDEBAR ── */}
          <div className="lg:col-span-1">
            <div className="sticky top-20">
              <OrderSummary
                tour={tour}
                selectedSchedule={selectedSchedule}
                bookingStep={step}
                adults={adults}
                childPassengerQty={children}
                infants={infants}
                unitPrice={unitPrice}
                totalAmount={totalAmount}
                singleRoomCount={singleRoomCount}
                appliedPromoCode={appliedPromoCode}
                appliedDiscountAmount={appliedDiscountAmount}
                onOpenPromo={() => {
                  setPromoErr(null);
                  setPromoOpen(true);
                }}
                onClearPromo={() => {
                  setAppliedPromoCode(null);
                  setAppliedDiscountAmount(0);
                }}
                agreedToTerms={agreedToTerms}
                onAgreedToTermsChange={(v) => {
                  setAgreedToTerms(Boolean(v));
                  if (v) setTermsHighlight(false);
                }}
                termsHighlight={termsHighlight}
                onPrimaryCta={
                  step === 1
                    ? goToPaymentStep
                    : () => setPaymentDrawerOpen(true)
                }
                primaryCtaLabel={
                  step === 1
                    ? step1ShowsBookNow
                      ? 'Đặt ngay'
                      : 'Nhập thông tin để đặt tour'
                    : 'THANH TOÁN NGAY'
                }
                primaryCtaSentenceCase={step === 1 && !step1ShowsBookNow}
                primaryCtaDisabled={step === 1 ? false : submitting}
              />
            </div>
          </div>
        </div>
      </div>

      <PaymentMethodDrawer
        open={step === 2 && paymentDrawerOpen}
        onClose={() => {
          if (!submitting) setPaymentDrawerOpen(false);
        }}
        onConfirm={() => void onSubmit()}
        submitting={submitting}
      />

      {SHOW_PROMO_CODE_UI && promoOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="promo-dialog-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-stone-200/80">
            <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-3">
              <h2
                id="promo-dialog-title"
                className="text-lg font-bold text-stone-900"
              >
                Sử dụng mã giảm giá
              </h2>
              <button
                type="button"
                onClick={() => setPromoOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-stretch">
              <input
                type="text"
                value={promoDraft}
                onChange={(e) => setPromoDraft(e.target.value.toUpperCase())}
                placeholder="Thêm mã giảm giá"
                className="min-w-0 flex-1 rounded-xl border border-stone-300 px-3 py-2.5 text-sm uppercase tracking-wide text-stone-900 placeholder:normal-case placeholder:tracking-normal focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void applyPromoFromModal();
                }}
              />
              <button
                type="button"
                disabled={promoLoading}
                onClick={() => void applyPromoFromModal()}
                className="shrink-0 rounded-xl border-2 border-sky-400 bg-white px-5 py-2.5 text-sm font-bold text-sky-600 hover:bg-sky-50 disabled:opacity-50"
              >
                {promoLoading ? '…' : 'SỬ DỤNG'}
              </button>
            </div>
            {promoErr ? (
              <p className="mt-2 text-xs font-medium text-red-600">
                {promoErr}
              </p>
            ) : null}
            <p className="mt-4 border-t border-stone-100 pt-3 text-[11px] leading-relaxed text-stone-400">
              * Đã hiển thị hết mã ưu đãi bạn có thể sử dụng
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
