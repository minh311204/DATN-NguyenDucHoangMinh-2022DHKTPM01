"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Bus,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  MapPin,
  Plane,
  Share2,
  Star,
  Tag,
  Users,
  Utensils,
} from "lucide-react";
import type { TourDetail, TourListItem } from "@/lib/api-types";
import { formatVnd } from "@/lib/format";
import { TOUR_SCHEDULE_TAB_HASH } from "@/lib/tour-detail-nav";
import {
  SITE_HEADER_HIDE_AFTER_PX,
  SITE_HEADER_SHOW_WHEN_UNDER_PX,
} from "@/lib/site-header-scroll";
import { WishlistButton } from "./wishlist-button";
import { trackBehavior } from "@/lib/client-preference";
import { MotionInView } from "@/components/motion-in-view";
import TourReviews from "./tour-reviews";
import { RelatedTourPrograms } from "./related-tour-programs";
import {
  BookingCornerToast,
  type BookingCornerToastPayload,
} from "./bookings/booking-cancel-feedback";

/* ────────────────── helpers ────────────────── */

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function utcYmd(d: Date) {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** Khớp API `createBooking`: không cho chọn lịch đã qua thời điểm khởi hành */
function isScheduleBookable(isoStart: string) {
  return new Date(isoStart).getTime() >= Date.now();
}

function formatVnDate(d: Date) {
  return `${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

function formatDmDate(d: Date) {
  return `${pad2(d.getUTCDate())}-${pad2(d.getUTCMonth() + 1)}-${d.getUTCFullYear()}`;
}

function formatPriceK(price: number): string {
  const k = Math.round(price / 1000);
  return `${k.toLocaleString("vi-VN")}K`;
}

function transportLabel(v?: string | null): string {
  if (!v) return "Đang cập nhật";
  if (v === "FLIGHT" || v === "PLANE") return "Máy bay";
  if (v === "BUS" || v === "CAR") return "Xe";
  if (v === "MIXED") return "Máy bay, Xe";
  if (v === "TRAIN") return "Tàu hỏa";
  if (v === "BOAT") return "Tàu/Thuyền";
  return v;
}

function durationLabel(days?: number | null): string {
  if (!days) return "Đang cập nhật";
  return `${days}N${Math.max(days - 1, 0)}Đ`;
}

function addHoursUtc(d: Date, hours: number): Date {
  return new Date(d.getTime() + hours * 60 * 60 * 1000);
}

function subHoursUtc(d: Date, hours: number): Date {
  return new Date(d.getTime() - hours * 60 * 60 * 1000);
}

function formatClockUtc(d: Date): string {
  return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
}

/** Bỏ hậu tố mô tả điểm đón/trả (dữ liệu seed/API cũ). */
function cleanTransportPlaceLabel(s: string): string {
  return s
    .replace(/\s*[–-]\s*bến xe\s*\/\s*điểm đón khách\s*$/iu, "")
    .replace(/\s*[–-]\s*điểm trả theo chương trình\s*$/iu, "")
    .trim();
}

function transportPlaceOrFallback(legVal: string | null | undefined, fallback: string): string {
  const v = legVal?.trim();
  if (!v) return fallback;
  const cleaned = cleanTransportPlaceLabel(v);
  return cleaned || fallback;
}

/** Tiêu đề khối nội dung kiểu Travela (h3 trái, gạch dưới nhạt) */
const TD_SECTION_TITLE =
  "mb-5 border-b border-stone-200 pb-3 text-xl font-bold leading-snug tracking-tight text-stone-900 sm:text-[22px] sm:leading-snug";

/** Tiêu đề phía trên thẻ accordion (không gạch ngang — giống mẫu Vietravel) */
const TD_SECTION_TITLE_CARD =
  "mb-4 text-xl font-bold leading-snug tracking-tight text-stone-900 sm:text-[22px] sm:leading-snug";

/** Khung thẻ trắng bo tròn — dùng cho lịch trình, lưu ý, v.v. */
const TD_CONTENT_CARD =
  "overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]";

/** Hàng accordion trong thẻ (có vạch chia) */
const TD_ACCORDION_ROW_BTN =
  "flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-stone-50/80 sm:px-5 sm:py-4";

function TourStarRow({ rating }: { rating: number | null }) {
  const r =
    rating != null
      ? Math.min(5, Math.max(0, Math.round(Number(rating))))
      : 0;
  return (
    <div
      className="flex gap-0.5 text-amber-400"
      aria-label={
        rating != null ? `Đánh giá trung bình ${rating.toFixed(1)} trên 5` : "Chưa có đánh giá"
      }
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-[1.05rem] w-[1.05rem] sm:h-5 sm:w-5 ${i < r ? "fill-amber-400" : "fill-transparent text-amber-200"}`}
          strokeWidth={1.35}
        />
      ))}
    </div>
  );
}

/** Chỉ hiển thị mã chuyến (VD: VN1660); bỏ mô tả dài trong vehicleDetail. */
function extractFlightDisplayCode(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const s = raw.trim();
  const m = s.match(/\b([A-Z]{2})\s*(\d{3,4})\b/i);
  if (m) return `${m[1].toUpperCase()}${m[2]}`;
  const compact = s.replace(/\s/g, "");
  if (/^[A-Z]{2}\d{3,4}$/i.test(compact)) return compact.toUpperCase();
  if (/chuyến|đưa|theo hãng|điểm dừng|chỗ|ghế|xe |bus|ô tô|đón|đưa đoàn/i.test(s)) return null;
  if (s.length <= 10) return s;
  return null;
}

type Schedule = TourDetail["schedules"][number];
type TransportRow = NonNullable<TourDetail["transports"]>[number];

const SCHEDULE_SOLD_OUT_MSG =
  "Đã chết chỗ, vui lòng chọn lịch khác";

/** null = không công bố số chỗ (hiển thị Liên hệ — vẫn cho vào bước đặt). */
function remainingSeatsForScheduleRow(s: Schedule): number | null {
  if (s.availableSeats == null) return null;
  return Math.max(s.availableSeats - (s.bookedSeats ?? 0), 0);
}

/** Ưu tiên suất còn chỗ hoặc suất không báo số chỗ; chỉ fallback suất đầu khi buộc hiển thị lịch hết chỗ. */
function preferredScheduleIdForDay(schedulesForDay: Schedule[]): number | null {
  if (schedulesForDay.length === 0) return null;
  const ok = schedulesForDay.find((s) => {
    const r = remainingSeatsForScheduleRow(s);
    return r === null || r > 0;
  });
  return (ok ?? schedulesForDay[0]).id;
}

/** Hai chặng đi / về: giờ khởi hành – đến (máy bay/xe) + mã chuyến nếu có */
function buildScheduleLegTimes(
  schedule: Schedule,
  tour: TourDetail,
  isFlightTour: boolean,
): {
  outbound: {
    dep: Date;
    arr: Date;
    code: string | null;
    depPlace: string;
    arrPlace: string;
  };
  inbound: {
    dep: Date;
    arr: Date;
    code: string | null;
    depPlace: string;
    arrPlace: string;
  };
} {
  const sorted = [...(tour.transports ?? [])].sort((a, b) => a.legOrder - b.legOrder);
  const flightLegs = sorted.filter((t) => t.vehicleType === "FLIGHT");

  let legOut: TransportRow | undefined;
  let legIn: TransportRow | undefined;

  if (isFlightTour && flightLegs.length > 0) {
    legOut = flightLegs[0];
    legIn = flightLegs[1] ?? flightLegs[0];
  } else {
    legOut = sorted[0];
    legIn = sorted[1] ?? sorted[0];
  }

  const start = new Date(schedule.startDate);
  const end = new Date(schedule.endDate);

  const hOut = legOut?.estimatedHours != null ? Number(legOut.estimatedHours) : isFlightTour ? 1.2 : 6;
  const hIn = legIn?.estimatedHours != null ? Number(legIn.estimatedHours) : isFlightTour ? 1.2 : 6;

  const outDep = start;
  const outArr = addHoursUtc(outDep, hOut);
  const inArr = end;
  const inDep = subHoursUtc(inArr, hIn);

  const outCode = isFlightTour ? extractFlightDisplayCode(legOut?.vehicleDetail) : null;
  const inCode = isFlightTour ? extractFlightDisplayCode(legIn?.vehicleDetail) : null;

  return {
    outbound: {
      dep: outDep,
      arr: outArr,
      code: outCode,
      depPlace: transportPlaceOrFallback(legOut?.departurePoint, tour.departureLocation?.name ?? "—"),
      arrPlace: transportPlaceOrFallback(legOut?.arrivalPoint, tour.destinationLocation?.name ?? "—"),
    },
    inbound: {
      dep: inDep,
      arr: inArr,
      code: inCode,
      depPlace: transportPlaceOrFallback(legIn?.departurePoint, tour.destinationLocation?.name ?? "—"),
      arrPlace: transportPlaceOrFallback(legIn?.arrivalPoint, tour.departureLocation?.name ?? "—"),
    },
  };
}

function TransportLegBlock({
  heading,
  dateStr,
  dep,
  arr,
  depPlace,
  arrPlace,
  variant,
  lineCode,
}: {
  heading: string;
  dateStr: string;
  dep: Date;
  arr: Date;
  depPlace: string;
  arrPlace: string;
  variant: "flight" | "ground";
  /** Mã chuyến (VD: VN1660) — chỉ dùng khi variant flight */
  lineCode: string | null;
}) {
  const showLocations = variant === "ground";

  return (
    <div className="flex h-full min-h-0 flex-col">
      {variant === "flight" ? (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1">
          <p className="min-w-0 text-sm font-bold leading-snug text-stone-900">
            {heading} - {dateStr}
          </p>
          <span className="flex shrink-0 items-center justify-self-end gap-1.5 whitespace-nowrap text-sm font-bold text-[#0b5ea8]">
            <Plane className="h-4 w-4 shrink-0" aria-hidden />
            {lineCode?.trim() || "—"}
          </span>
        </div>
      ) : (
        <p className="text-xs font-semibold text-stone-900 sm:text-sm">
          {heading} - {dateStr}
        </p>
      )}
      <div className="mt-2 flex w-full items-baseline justify-between gap-2 tabular-nums">
        <span className="text-lg font-bold text-stone-900 sm:text-xl">{formatClockUtc(dep)}</span>
        <span className="text-lg font-bold text-stone-900 sm:text-xl">{formatClockUtc(arr)}</span>
      </div>
      <div className="relative mt-3 h-8 w-full shrink-0">
        <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-stone-300" />
        <div className="absolute left-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 bg-stone-500" />
        <div className="absolute right-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 bg-stone-500" />
        {variant === "ground" ? (
          <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white p-0.5 ring-2 ring-white">
            <Bus className="h-4 w-4 text-stone-900" aria-hidden />
          </div>
        ) : null}
      </div>
      {showLocations ? (
        <div className="mt-2 flex justify-between gap-3 text-sm font-medium text-stone-800">
          <span className="min-w-0 flex-1 text-left leading-snug">{depPlace}</span>
          <span className="min-w-0 flex-1 text-right leading-snug">{arrPlace}</span>
        </div>
      ) : null}
    </div>
  );
}

/* ────────────────── calendar ────────────────── */

type CalendarCell = { day: number; currentMonth: boolean; ymd: string };

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const;

function buildCalendarGrid(year: number, month: number): CalendarCell[] {
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const lastDay = new Date(Date.UTC(year, month, 0));
  const mondayOffset = (firstDay.getUTCDay() + 6) % 7;

  const cells: CalendarCell[] = [];

  const prevEnd = new Date(Date.UTC(year, month - 1, 0)).getUTCDate();
  for (let i = mondayOffset - 1; i >= 0; i--) {
    const d = prevEnd - i;
    const m = month === 1 ? 12 : month - 1;
    const y = month === 1 ? year - 1 : year;
    cells.push({ day: d, currentMonth: false, ymd: `${y}-${pad2(m)}-${pad2(d)}` });
  }

  for (let d = 1; d <= lastDay.getUTCDate(); d++) {
    cells.push({ day: d, currentMonth: true, ymd: `${year}-${pad2(month)}-${pad2(d)}` });
  }

  const rows = Math.ceil(cells.length / 7);
  const total = rows * 7;
  const nm = month === 12 ? 1 : month + 1;
  const ny = month === 12 ? year + 1 : year;
  for (let d = 1; cells.length < total; d++) {
    cells.push({ day: d, currentMonth: false, ymd: `${ny}-${pad2(nm)}-${pad2(d)}` });
  }

  return cells;
}

/* ────────────────── types ────────────────── */

type TabKey = "overview" | "schedule" | "itinerary" | "notes" | "others" | "reviews";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Tổng quan" },
  { key: "schedule", label: "Lịch khởi hành" },
  { key: "itinerary", label: "Lịch trình" },
  { key: "notes", label: "Lưu ý" },
  { key: "others", label: "Chương trình khác" },
  { key: "reviews", label: "Đánh giá" },
];

/* ════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════ */

export default function TourDetailClient({
  tour,
  initialScheduleYmd,
  relatedTours = [],
}: {
  tour: TourDetail;
  /** YYYY-MM-DD (UTC) từ URL — khớp ngày đã chọn trên thẻ tour */
  initialScheduleYmd?: string | null;
  relatedTours?: TourListItem[];
}) {
  /* ── images ── */
  const allImages = useMemo(() => {
    const imgs = tour.images.map((i) => i.imageUrl);
    if (tour.thumbnailUrl && !imgs.includes(tour.thumbnailUrl)) imgs.unshift(tour.thumbnailUrl);
    return imgs;
  }, [tour.images, tour.thumbnailUrl]);

  const [mainImgIdx, setMainImgIdx] = useState(0);

  /* ── schedules (chỉ lịch còn đặt được — khớp backend booking) ── */
  const schedules = useMemo(
    () =>
      [...(tour.schedules ?? [])]
        .filter((s) => isScheduleBookable(s.startDate))
        .sort((a, b) => +new Date(a.startDate) - +new Date(b.startDate)),
    [tour.schedules],
  );

  const scheduleDateMap = useMemo(() => {
    const map = new Map<string, { minPrice: number; schedules: Schedule[] }>();
    for (const s of schedules) {
      const ymd = utcYmd(new Date(s.startDate));
      const price = s.priceOverride ?? (tour.basePrice as number | null) ?? 0;
      if (!map.has(ymd)) map.set(ymd, { minPrice: price, schedules: [] });
      const e = map.get(ymd)!;
      e.schedules.push(s);
      if (price < e.minPrice) e.minPrice = price;
    }
    return map;
  }, [schedules, tour.basePrice]);

  const availableMonths = useMemo(() => {
    const s = new Set<string>();
    for (const sc of schedules) {
      const d = new Date(sc.startDate);
      s.add(`${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`);
    }
    return [...s].sort();
  }, [schedules]);

  /* ── calendar state ── */
  const [calMonth, setCalMonth] = useState(() => {
    if (schedules[0]) {
      const d = new Date(schedules[0].startDate);
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
    }
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() + 1 };
  });

  const calCells = useMemo(() => buildCalendarGrid(calMonth.year, calMonth.month), [calMonth]);

  const goPrev = useCallback(() => {
    setCalMonth((c) => (c.month === 1 ? { year: c.year - 1, month: 12 } : { ...c, month: c.month - 1 }));
  }, []);
  const goNext = useCallback(() => {
    setCalMonth((c) => (c.month === 12 ? { year: c.year + 1, month: 1 } : { ...c, month: c.month + 1 }));
  }, []);

  /* ── selected date / schedule ── */
  const [selDate, setSelDate] = useState<string | null>(null);
  const [selSchedId, setSelSchedId] = useState<number | null>(null);

  const selDateScheds = useMemo(
    () => (selDate ? scheduleDateMap.get(selDate)?.schedules ?? [] : []),
    [selDate, scheduleDateMap],
  );

  const selSchedule = useMemo(
    () => (selSchedId != null ? schedules.find((s) => s.id === selSchedId) ?? null : null),
    [selSchedId, schedules],
  );

  function pickDate(ymd: string) {
    const e = scheduleDateMap.get(ymd);
    if (!e || !e.schedules.length) return;
    const [yy, mm] = ymd.split("-").map(Number);
    setCalMonth({ year: yy, month: mm });
    setSelDate(ymd);
    setSelSchedId(preferredScheduleIdForDay(e.schedules));
    scheduleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function clearDate() {
    setSelDate(null);
    setSelSchedId(null);
  }

  /* ── itineraries ── */
  const itineraries = useMemo(
    () => [...tour.itineraries].sort((a, b) => a.dayNumber - b.dayNumber),
    [tour.itineraries],
  );
  /** Mặc định tất cả ngày đều đóng; chỉ mở khi người dùng bấm */
  const [openItinId, setOpenItinId] = useState<number | null>(null);

  /** Chi tiết vận chuyển — accordion từng chặng */
  const [openTransportId, setOpenTransportId] = useState<number | null>(null);

  /** Khám phá tour — thu gọn / mở rộng mô tả dài */
  const [exploreExpanded, setExploreExpanded] = useState(false);
  const exploreDescInnerRef = useRef<HTMLDivElement>(null);
  const [exploreContentHeight, setExploreContentHeight] = useState(0);

  /** Chiều cao đo được → animation max-height mượt (không dùng 9999px). */
  useLayoutEffect(() => {
    const el = exploreDescInnerRef.current;
    if (!el || !tour.description || tour.description.length <= 280) {
      setExploreContentHeight(0);
      return;
    }
    const measure = () => setExploreContentHeight(el.scrollHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [tour.description, tour.id]);

  useEffect(() => {
    setExploreExpanded(false);
  }, [tour.id]);

  /* ── notes accordion ── */
  const [openNoteIdx, setOpenNoteIdx] = useState<number | null>(null);
  const isFlight = tour.transportType === "FLIGHT";
  const defaultInclusions = isFlight
    ? "- Xe tham quan (15, 25, 35, 45 chỗ tùy theo số lượng khách) theo chương trình\n- Vé máy bay khứ hồi\n- Khách sạn tiêu chuẩn 2 khách/phòng hoặc 3 khách/phòng\n- Các bữa ăn theo chương trình\n- Vé tham quan theo chương trình\n- Hướng dẫn viên tiếng Việt nối tuyến\n- Bảo hiểm du lịch với mức bồi thường cao nhất 120.000.000đ/vụ\n- Nón Vietravel + Nước suối + Khăn lạnh\n- Thuế VAT"
    : "- Xe tham quan (16, 29, 35, 45 chỗ tùy theo số lượng khách) theo chương trình\n- Khách sạn tiêu chuẩn 2 khách/phòng hoặc 3 khách/phòng\n- Vé tham quan theo chương trình\n- Ăn theo chương trình tiêu chuẩn từ 100.000 ~ 130.000 vnđ/bữa\n- Hướng dẫn viên tiếng Việt nối tuyến\n- Bảo hiểm du lịch với mức bồi thường cao nhất 120.000.000đ/vụ\n- Nón Vietravel + Nước suối + Khăn lạnh\n- Thuế VAT";

  /** Thứ tự mục giống giao diện “Những thông tin cần lưu ý” (mẫu tham khảo). */
  const NOTE_ITEMS = [
    {
      label: "Giá tour bao gồm",
      content: tour.inclusions?.trim() || defaultInclusions,
    },
    {
      label: "Giá tour không bao gồm",
      content: tour.exclusions?.trim() || (isFlight
        ? "- Chi phí cá nhân: ăn uống ngoài chương trình, giặt ủi, chi phí hủy đổi hành trình và nâng hạng chuyến bay, hành lý quá cước, phụ thu phòng đơn,…\n- Tham quan ngoài chương trình"
        : "- Chi phí cá nhân: ăn uống ngoài chương trình, giặt ủi, hành lý quá cước, phụ thu phòng đơn,…\n- Tham quan ngoài chương trình"),
    },
    {
      label: "Lưu ý giá trẻ em",
      content: "- Trẻ em dưới 5 tuổi: không thu phí dịch vụ, bố mẹ tự lo cho bé và thanh toán các chi phí phát sinh (đối với các dịch vụ tính phí theo chiều cao…). Hai người lớn chỉ được kèm 1 trẻ em dưới 5 tuổi, trẻ em thứ 2 sẽ đóng phí theo quy định dành cho độ tuổi từ 5 đến dưới 12 tuổi và phụ thu phòng đơn. Vé máy bay, tàu hỏa, phương tiện vận chuyển công cộng mua vé theo quy định của các đơn vị vận chuyển.\n- Trẻ em từ 5 tuổi đến dưới 12 tuổi: 75% giá tour người lớn (không có chế độ giường riêng). Hai người lớn chỉ được kèm 1 trẻ em từ 5 – dưới 12 tuổi, em thứ hai trở lên phải mua 1 suất giường đơn.\n- Trẻ em từ 12 tuổi trở lên: mua một vé như người lớn.\n- Vé máy bay phải mua theo quy định của từng hãng hàng không.",
    },
    {
      label: "Điều kiện thanh toán",
      content: "- Khi đăng ký đặt cọc 50% số tiền tour.\n- Số tiền còn lại thanh toán hết trước ngày khởi hành 7–10 ngày (áp dụng tour ngày thường), trước ngày khởi hành 20–25 ngày (áp dụng tour lễ tết).",
    },
    {
      label: "Điều kiện đăng ký",
      content: "- Khi đăng ký vui lòng cung cấp giấy tờ tùy thân tất cả người đi: Căn cước công dân/Hộ chiếu (Passport)/Giấy khai sinh (trẻ em dưới 14 tuổi). Trong trường hợp đăng ký trực tuyến vui lòng nhập tên chính xác theo thứ tự: Họ/tên lót/tên xuất vé máy bay.\n- Quy định giấy tờ tùy thân khi đi tour:\n  • Khách quốc tịch Việt Nam: Trẻ em dưới 14 tuổi cần đem theo Giấy khai sinh bản chính/Hộ chiếu bản chính còn giá trị sử dụng. Trẻ em từ 14 tuổi trở lên và Người lớn cần đem theo căn cước công dân/Hộ chiếu bản chính còn giá trị sử dụng.\n  • Khách quốc tịch nước ngoài hoặc là Việt kiều: Vui lòng mang theo hộ chiếu bản chính (Passport) hoặc thẻ xanh kèm thị thực nhập cảnh còn giá trị sử dụng.\n- Giờ nhận phòng khách sạn: sau 14:00 giờ và trả phòng trước 12:00 giờ.\n- Khách nữ từ 55 tuổi trở lên và khách nam từ 60 trở lên: nên có người thân dưới 55 tuổi đi cùng. Riêng khách từ 70 tuổi trở lên: Bắt buộc phải có người thân dưới 55 tuổi đi cùng và nộp kèm giấy khám sức khỏe có xác nhận đủ sức khỏe của bác sĩ.\n- Quý khách đang mang thai vui lòng báo cho nhân viên bán tour ngay tại thời điểm đăng ký và phải có ý kiến của bác sĩ trước khi đi tour.\n- Thông tin hành lý: Xách tay dưới 7kg/khách. Ký gửi: 20kg/khách.\n- Thông tin tập trung: Tại sân bay Tân Sơn Nhất, Ga đi trong nước, trước giờ bay 2 tiếng (ngày thường), trước 2 tiếng 30 phút (Lễ Tết).",
    },
    {
      label: "Lưu ý về chuyển hoặc hủy tour",
      content: "- Sau khi đóng tiền, nếu Quý khách muốn chuyển/hủy tour xin vui lòng mang Vé Du Lịch đến văn phòng đăng ký tour để làm thủ tục chuyển/hủy tour và chịu mất phí theo quy định của Vietravel. Không giải quyết các trường hợp liên hệ chuyển/hủy tour qua điện thoại.\n- Thời gian hủy chuyến du lịch được tính cho ngày làm việc, không tính thứ 7, Chủ Nhật và các ngày Lễ, Tết.",
    },
    {
      label: "Các điều kiện hủy tour đối với ngày thường",
      content: "- Được chuyển sang các tuyến du lịch khác trước ngày khởi hành 20 ngày: Không mất chi phí.\n- Nếu hủy hoặc chuyển sang các chuyến du lịch khác ngay sau khi đăng ký từ 15–19 ngày trước ngày khởi hành: Chi phí hủy tour: 50% tiền cọc tour.\n- Nếu hủy hoặc chuyển sang các chuyến du lịch khác từ 12–14 ngày trước ngày khởi hành: Chi phí hủy tour: 100% tiền cọc tour.\n- Nếu hủy chuyến du lịch trong vòng từ 08–11 ngày trước ngày khởi hành: Chi phí hủy tour: 50% trên giá tour du lịch.\n- Nếu hủy chuyến du lịch trong vòng từ 05–07 ngày trước ngày khởi hành: Chi phí hủy tour: 70% trên giá tour du lịch.\n- Nếu hủy chuyến du lịch trong vòng từ 02–04 ngày trước ngày khởi hành: Chi phí hủy tour: 90% trên giá tour du lịch.\n- Nếu hủy chuyến du lịch trong vòng 1 ngày trước ngày khởi hành: Chi phí hủy tour: 100% trên giá tour du lịch.",
    },
    {
      label: "Các điều kiện hủy tour đối với ngày lễ, Tết",
      content: "- Được chuyển sang các tuyến du lịch khác trước ngày khởi hành 30 ngày: Không mất chi phí.\n- Nếu hủy hoặc chuyển sang các chuyến du lịch khác ngay sau khi đăng ký từ 25–29 ngày trước ngày khởi hành: Chi phí hủy tour: 50% tiền cọc tour.\n- Nếu hủy hoặc chuyển sang các chuyến du lịch khác từ 20–24 ngày trước ngày khởi hành: Chi phí hủy tour: 100% tiền cọc tour.\n- Nếu hủy chuyến du lịch trong vòng từ 17–19 ngày trước ngày khởi hành: Chi phí hủy tour: 50% trên giá tour du lịch.\n- Nếu hủy chuyến du lịch trong vòng từ 08–16 ngày trước ngày khởi hành: Chi phí hủy tour: 70% trên giá tour du lịch.\n- Nếu hủy chuyến du lịch trong vòng từ 02–07 ngày trước ngày khởi hành: Chi phí hủy tour: 90% trên giá tour du lịch.\n- Nếu hủy chuyến du lịch trong vòng 1 ngày trước ngày khởi hành: Chi phí hủy tour: 100% trên giá tour du lịch.",
    },
    {
      label: "Trường hợp bất khả kháng",
      content: "- Nếu chương trình du lịch bị hủy bỏ hoặc thay đổi bởi một trong hai bên vì lý do bất khả kháng (hỏa hoạn, thời tiết, tai nạn, thiên tai, chiến tranh, dịch bệnh, hoãn, dời và hủy chuyến hoặc thay đổi khác của các phương tiện vận chuyển công cộng hoặc các sự kiện bất khả kháng khác theo quy định pháp luật…), thì hai bên sẽ không chịu bất kỳ nghĩa vụ bồi hoàn các tổn thất đã xảy ra và không chịu bất kỳ trách nhiệm pháp lý nào. Tuy nhiên mỗi bên có trách nhiệm cố gắng tối đa để giúp đỡ bên bị thiệt hại nhằm giảm thiểu các tổn thất gây ra vì lý do bất khả kháng.",
    },
    {
      label: "Liên hệ",
      content: "Tổng đài Vietravel: 1800-646-888 (08:00 – 23:00)\n\nTrụ sở Vietravel: 190 Pasteur, Phường Xuân Hoà, Tp. Hồ Chí Minh",
    },
  ];

  /* ── tabs ── */
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const overviewRef = useRef<HTMLDivElement>(null);
  const scheduleRef = useRef<HTMLDivElement>(null);
  const itineraryRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<HTMLDivElement>(null);
  const othersRef = useRef<HTMLDivElement>(null);
  const reviewsRef = useRef<HTMLDivElement>(null);

  const tabRefs: Record<TabKey, React.RefObject<HTMLDivElement | null>> = {
    overview: overviewRef,
    schedule: scheduleRef,
    itinerary: itineraryRef,
    notes: notesRef,
    others: othersRef,
    reviews: reviewsRef,
  };

  function scrollTab(t: TabKey) {
    setActiveTab(t);
    tabRefs[t].current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /** Ghim thanh mục lục (vd. từ nút Chọn ngày) rồi cuộn tới section */
  function revealTabBarAndScroll(t: TabKey) {
    setTabBarPinnedByButton(true);
    scrollTab(t);
  }

  useEffect(() => {
    const apply = () => {
      const rawHash =
        typeof window !== "undefined"
          ? window.location.hash.replace(/^#/, "").toLowerCase()
          : "";
      const hashWants =
        rawHash === TOUR_SCHEDULE_TAB_HASH || rawHash === "schedule";
      const qRaw = initialScheduleYmd?.trim() ?? "";
      const ymdFromQuery = /^\d{4}-\d{2}-\d{2}$/.test(qRaw) ? qRaw : null;

      if (!hashWants && !ymdFromQuery) return;

      setActiveTab("schedule");

      const pick = (ymd: string) => {
        const entry = scheduleDateMap.get(ymd);
        if (!entry?.schedules.length) return false;
        const [yy, mm] = ymd.split("-").map(Number);
        setCalMonth({ year: yy, month: mm });
        setSelDate(ymd);
        setSelSchedId(preferredScheduleIdForDay(entry.schedules));
        return true;
      };

      if (!(ymdFromQuery && pick(ymdFromQuery)) && schedules[0]?.startDate) {
        pick(utcYmd(new Date(schedules[0].startDate)));
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scheduleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });
    };

    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, [initialScheduleYmd, schedules, scheduleDateMap]);

  /* ── Thanh tab cố định: mở khóa sau sentinel + 2 nấc cuộn (hoặc đã cuộn xuống đủ) / bấm « Chọn ngày »; giữ khi cuộn lại tới Tổng quan; chỉ tắt gần đầu trang ── */
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [sentinelPast, setSentinelPast] = useState(false);
  const [tabRevealSteps, setTabRevealSteps] = useState(0);
  const tabWheelLockUntil = useRef(0);
  const sentinelPastRef = useRef(false);
  sentinelPastRef.current = sentinelPast;
  /** Bấm « Chọn ngày khởi hành » / « Chọn ngày » */
  const [tabBarPinnedByButton, setTabBarPinnedByButton] = useState(false);
  /**
   * Đã mở khóa thanh tab: bật một lần thì giữ (cuộn lên Tổng quan không tắt),
   * chỉ reset khi gần đỉnh trang.
   */
  const [stickyTabBarUnlocked, setStickyTabBarUnlocked] = useState(false);

  /** Đã cuộn xuống đủ xa (px) — không phụ thuộc sentinel (màn hình cao vẫn đếm được 2 nấc). */
  const [scrollDeep, setScrollDeep] = useState(false);

  useEffect(() => {
    if (
      tabBarPinnedByButton ||
      ((sentinelPast || scrollDeep) && tabRevealSteps >= 2)
    ) {
      setStickyTabBarUnlocked(true);
    }
  }, [tabBarPinnedByButton, sentinelPast, scrollDeep, tabRevealSteps]);

  const showFixedTabs = stickyTabBarUnlocked;

  /** Giống SiteHeader (trang không phải chủ): header cố định còn nhìn thấy khi đầu trang / cuộn nhẹ */
  const [siteHeaderDocked, setSiteHeaderDocked] = useState(true);

  /** Cuộn: deep flag + chỉ tắt thanh tab khi gần đỉnh trang */
  useEffect(() => {
    function onDocScroll() {
      const y = window.scrollY ?? document.documentElement.scrollTop;
      setScrollDeep(y >= 120);
      if (y < 28) {
        setStickyTabBarUnlocked(false);
        setTabRevealSteps(0);
        setTabBarPinnedByButton(false);
        tabWheelLockUntil.current = 0;
      }
    }
    onDocScroll();
    window.addEventListener("scroll", onDocScroll, { passive: true });
    return () => window.removeEventListener("scroll", onDocScroll);
  }, []);

  useEffect(() => {
    let raf: number | null = null;
    function onScroll() {
      if (raf != null) return;
      raf = window.requestAnimationFrame(() => {
        raf = null;
        const y = window.scrollY ?? document.documentElement.scrollTop;
        setSiteHeaderDocked((visible) => {
          if (visible) {
            return y < SITE_HEADER_HIDE_AFTER_PX;
          }
          return y < SITE_HEADER_SHOW_WHEN_UNDER_PX;
        });
      });
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf != null) window.cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const past = !entry.isIntersecting;
        setSentinelPast(past);
      },
      { threshold: 0, rootMargin: "-1px 0px 0px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /** Hai nấc cuộn xuống — deps `[]` + ref/`scrollY` để tránh cảnh báo đổi độ dài mảng deps (React Compiler / Strict) */
  useEffect(() => {
    let prevGate = false;
    let markY = 0;

    function gateOpen() {
      const y = window.scrollY ?? document.documentElement.scrollTop;
      return sentinelPastRef.current || y >= 120;
    }

    function syncMark() {
      const open = gateOpen();
      if (open && !prevGate) {
        markY = window.scrollY ?? document.documentElement.scrollTop;
      }
      prevGate = open;
      return open;
    }

    function onWheel(e: WheelEvent) {
      if (!syncMark()) return;
      if (e.deltaY < 26) return;
      const y = window.scrollY ?? document.documentElement.scrollTop;
      if (y < 72 && !sentinelPastRef.current) return;
      const now = performance.now();
      if (now < tabWheelLockUntil.current) return;
      tabWheelLockUntil.current = now + 380;
      setTabRevealSteps((n) => (n >= 2 ? 2 : n + 1));
    }

    function onScrollExtra() {
      if (!syncMark()) return;
      const y = window.scrollY ?? document.documentElement.scrollTop;
      const extra = y - markY;
      setTabRevealSteps((n) =>
        Math.max(n, extra >= 200 ? 2 : extra >= 80 ? 1 : 0),
      );
    }

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("scroll", onScrollExtra, { passive: true });
    onScrollExtra();
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onScrollExtra);
    };
  }, []);

  // Track lượt xem tour
  useEffect(() => {
    void trackBehavior(tour.id, "view");
  }, [tour.id]);

  /* ── price helpers ── */
  const basePrice = tour.basePrice ?? null;
  const displayPrice = selSchedule?.priceOverride ?? basePrice;
  const singleRoomSupplement = tour.singleRoomSupplement ?? null;
  const hasSingleRoomSupplement =
    singleRoomSupplement != null && Number(singleRoomSupplement) > 0;
  const remaining =
    selSchedule != null ? remainingSeatsForScheduleRow(selSchedule) : null;
  const selectedScheduleSoldOut = remaining !== null && remaining <= 0;
  const [scheduleSoldOutToast, setScheduleSoldOutToast] =
    useState<BookingCornerToastPayload | null>(null);
  const dismissScheduleSoldOutToast = useCallback(
    () => setScheduleSoldOutToast(null),
    [],
  );
  const showScheduleSoldOutToast = useCallback(() => {
    setScheduleSoldOutToast({
      variant: "error",
      message: SCHEDULE_SOLD_OUT_MSG,
    });
  }, []);
  const tourCode = `NNSGN${tour.id}`;
  const selMonthKey = selDate?.slice(0, 7) ?? null;

  const legTimes = useMemo(
    () => (selSchedule ? buildScheduleLegTimes(selSchedule, tour, isFlight) : null),
    [selSchedule, tour, isFlight],
  );

  const destinationLabel = useMemo(
    () =>
      tour.destinationLocation?.name?.trim() ||
      tour.departureLocation?.name?.trim() ||
      tour.name,
    [tour.departureLocation?.name, tour.destinationLocation?.name, tour.name],
  );

  const onShareTour = useCallback(() => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    const title = tour.name;
    if (typeof navigator !== "undefined" && navigator.share) {
      void navigator.share({ title, url }).catch(() => {});
      return;
    }
    void navigator.clipboard.writeText(url).catch(() => {});
  }, [tour.name]);

  /* ════════════════════ RENDER ════════════════════ */

  return (
    <main className="min-h-screen bg-[#f3f3f3] pb-20">
      {/* ── Fixed full-width tab bar khi cuộn (z cao hơn nội dung; header site vẫn hoạt động bình thường) ── */}
      <div
        className={[
          "fixed left-0 right-0 z-50 transition-[transform,top] duration-300 ease-out will-change-[transform,top]",
          showFixedTabs ? "translate-y-0" : "-translate-y-full pointer-events-none",
        ].join(" ")}
        style={{
          top:
            showFixedTabs && siteHeaderDocked
              ? "var(--site-header-h, 96px)"
              : 0,
        }}
      >
        <div className="bg-white shadow-sm">
          <nav
            aria-label="Mục lục trang tour"
            className="mx-auto flex w-full max-w-[1100px] border-b border-stone-200 px-4 sm:px-6"
          >
            {TABS.map((t, i) => (
              <button
                key={`${t.key}-${i}`}
                type="button"
                aria-current={activeTab === t.key ? "page" : undefined}
                onClick={() => scrollTab(t.key)}
                className="group relative whitespace-nowrap px-5 py-3.5 text-sm font-semibold text-stone-600 transition-colors duration-200 hover:text-[#0b5ea8]"
              >
                <span className="relative z-10">{t.label}</span>
                <span
                  aria-hidden
                  className="absolute bottom-0 left-2 right-2 h-[3px] origin-left scale-x-0 rounded-sm bg-[#0b5ea8] transition-transform duration-300 ease-out group-hover:scale-x-100"
                />
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* ── Travela-style page banner (điểm đến + breadcrumb) ── */}
      <div className="relative z-[1] border-b border-stone-200/90 bg-white">
        <div className="mx-auto max-w-[1100px] px-4 pt-5 pb-6 sm:px-6">
          <MotionInView axis="left" once className="w-full">
            <h2 className="mb-3 text-center text-2xl font-bold text-stone-900 sm:text-3xl md:text-[34px] md:leading-tight">
              {destinationLabel}
            </h2>
          </MotionInView>
          <MotionInView axis="right" once delayMs={120} className="w-full">
            <nav aria-label="Breadcrumb">
              <p className="mx-auto max-w-4xl text-center text-sm leading-relaxed text-stone-600 sm:text-[15px]">
                <Link
                  href="/"
                  className="text-[#0b5ea8] transition hover:text-[#063d6b] hover:underline"
                >
                  Trang chủ
                </Link>
                <span className="px-1.5 text-stone-300" aria-hidden>
                  /
                </span>
                <span className="font-medium text-balance text-stone-900 break-words">
                  {tour.name}
                </span>
              </p>
            </nav>
          </MotionInView>
        </div>
      </div>

      <div className="mx-auto max-w-[1100px] px-4 pt-5 sm:px-6">
        {/* ── Main grid: content + sidebar (giữ bố cục cũ) ── */}
        <div className="mt-2 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* ═══════ LEFT COLUMN ═══════ */}
          <div>
            {/* ── Gallery: thumb + main (giữ layout; bo + khe giống Travela) ── */}
            <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-2.5">
              <MotionInView axis="left" once delayMs={0} className="flex flex-col gap-2">
                {allImages.slice(0, 4).map((url, idx) => {
                  const isOverflow = idx === 3 && allImages.length > 4;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setMainImgIdx(idx)}
                      className={[
                        "group relative h-[88px] w-full overflow-hidden rounded-none bg-stone-200 shadow-sm ring-1 ring-stone-200/80 sm:rounded-sm",
                        idx === mainImgIdx ? "ring-2 ring-[#0b5ea8]" : "",
                      ].join(" ")}
                    >
                      {url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={url}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110"
                        />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-teal-600 to-cyan-800 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105" />
                      )}
                      {isOverflow && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-bold text-white">
                          +{allImages.length - 4}
                        </div>
                      )}
                    </button>
                  );
                })}
                {allImages.length === 0 && (
                  <div className="h-[88px] w-full rounded bg-stone-200" />
                )}
              </MotionInView>

              <MotionInView axis="right" once delayMs={120} className="relative h-[370px] overflow-hidden rounded-none bg-stone-200 shadow-md ring-1 ring-stone-200/80 sm:rounded-sm">
                <div className="group h-full w-full">
                  {allImages[mainImgIdx] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={allImages[mainImgIdx]}
                      alt={tour.name}
                      className="h-full w-full object-cover transition-transform duration-[1.1s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-teal-600 to-cyan-800 transition-transform duration-[1.1s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105" />
                  )}
                </div>
              </MotionInView>
            </div>

            {/* Tour header — Travela tour-header-area */}
            <MotionInView axis="up" once className="mt-8 w-full">
              <div className="flex flex-col gap-5 sm:gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 lg:block">
                    <p className="inline-flex w-fit max-w-full items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-[#0b5ea8]">
                      <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="text-balance break-words">{destinationLabel}</span>
                    </p>
                    <div className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-2 border-t border-stone-200 pt-3 sm:justify-end sm:border-t-0 sm:pt-0 lg:hidden">
                      <button
                        type="button"
                        onClick={onShareTour}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-stone-800 transition hover:text-[#0b5ea8]"
                      >
                        <Share2 className="h-4 w-4 shrink-0" aria-hidden />
                        Chia sẻ tour
                      </button>
                      <WishlistButton tourId={tour.id} tourName={tour.name} variant="text" />
                    </div>
                  </div>
                  <div className="pb-2 pt-3 lg:pt-4">
                    <h1 className="text-balance break-words text-2xl font-bold leading-snug tracking-tight text-stone-900 sm:text-[26px] sm:leading-snug md:text-[28px] lg:text-[30px] lg:leading-tight">
                      {tour.name}
                    </h1>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <TourStarRow rating={tour.ratingAvg ?? null} />
                    {tour.totalReviews != null && tour.totalReviews > 0 ? (
                      <span className="text-sm text-stone-500">
                        ({tour.totalReviews} đánh giá)
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="hidden shrink-0 flex-row flex-wrap items-center justify-end gap-x-6 gap-y-2 lg:flex">
                  <button
                    type="button"
                    onClick={onShareTour}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-stone-800 transition hover:text-[#0b5ea8]"
                  >
                    <Share2 className="h-4 w-4 shrink-0" aria-hidden />
                    Chia sẻ tour
                  </button>
                  <WishlistButton tourId={tour.id} tourName={tour.name} variant="text" />
                </div>
              </div>
            </MotionInView>

            <hr className="my-8 border-0 border-t border-stone-200 lg:my-10" />

            {/* Sentinel: when this scrolls out of view, fixed tab bar appears */}
            <div ref={sentinelRef} className="mt-2" />

            {/* ═══ Section: Tổng quan ═══ */}
            <section ref={overviewRef} className="mt-8 scroll-mt-16 sm:mt-10">
              <MotionInView axis="up" once>
                <div className={`${TD_CONTENT_CARD} p-5 transition-shadow duration-500 hover:shadow-md sm:p-6`}>
                  <h3 className="mb-4 text-lg font-bold text-stone-900 sm:text-xl">Khám phá tour</h3>
                  {tour.description ? (
                    <>
                      {tour.description.length > 280 ? (
                        <>
                          <div
                            className="relative overflow-hidden"
                            style={{
                              maxHeight: exploreExpanded
                                ? exploreContentHeight || 124
                                : Math.min(124, exploreContentHeight || 124),
                              transition:
                                "max-height 0.55s cubic-bezier(0.33, 1, 0.68, 1)",
                            }}
                          >
                            <div
                              ref={exploreDescInnerRef}
                              className="whitespace-pre-wrap text-sm leading-[1.75] text-stone-700"
                            >
                              {tour.description}
                            </div>
                            <div
                              className={[
                                "pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white via-white/90 to-transparent",
                                "transition-opacity duration-500 ease-out",
                                exploreExpanded ? "opacity-0" : "opacity-100",
                              ].join(" ")}
                              aria-hidden
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setExploreExpanded((exp) => !exp)
                            }
                            className="mt-3 text-sm font-semibold text-[#0b5ea8] transition-colors duration-200 ease-out hover:text-[#063d6b] active:scale-[0.98]"
                          >
                            {exploreExpanded ? "Thu gọn" : "Xem thêm"}
                          </button>
                        </>
                      ) : (
                        <div className="whitespace-pre-wrap text-sm leading-[1.75] text-stone-700">
                          {tour.description}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm italic text-stone-500">Chưa có mô tả cho tour này.</p>
                  )}
                </div>
              </MotionInView>

              <MotionInView axis="up" once delayMs={80} className="mt-10 block w-full">
                <h3 className={TD_SECTION_TITLE}>Thông tin thêm về chuyến đi</h3>
              </MotionInView>
              <MotionInView
                axis="up"
                once
                className={`-mt-2 ${TD_CONTENT_CARD} p-4 sm:p-5`}
                delayMs={40}
              >
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-3">
                  {(
                    [
                      { icon: Eye, label: "Điểm tham quan", value: tour.destinationLocation?.name ?? "Đang cập nhật" },
                      { icon: Utensils, label: "Ẩm thực", value: "Theo thực đơn" },
                      { icon: Users, label: "Đối tượng thích hợp", value: "Cặp đôi, Gia đình, Thanh niên, Trẻ em" },
                      { icon: Calendar, label: "Thời gian lý tưởng", value: "Quanh năm" },
                      { icon: Bus, label: "Phương tiện", value: transportLabel(tour.transportType) },
                      { icon: Tag, label: "Khuyến mãi", value: "Đã bao gồm ưu đãi trong giá tour" },
                    ] as const
                  ).map((item) => (
                    <div
                      key={item.label}
                      className="flex items-start gap-3 rounded-xl border border-stone-100 bg-stone-50/60 px-4 py-3.5 transition-colors hover:border-stone-200 hover:bg-white sm:py-4"
                    >
                      <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-[#0b5ea8]" aria-hidden />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-stone-800">{item.label}</p>
                        <p className="mt-1 text-xs leading-relaxed text-stone-600">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </MotionInView>
            </section>

            {/* ═══ Section: Lịch khởi hành ═══ */}
            <section
              ref={scheduleRef}
              id={TOUR_SCHEDULE_TAB_HASH}
              className="mt-10 scroll-mt-16"
            >
              <MotionInView axis="up" once className="w-full">
                <h2 className={TD_SECTION_TITLE}>
                  Lịch khởi hành
                </h2>
              </MotionInView>

              {schedules.length === 0 ? (
                <div className="mt-5 rounded-sm border border-stone-200 bg-stone-50/90 px-4 py-8 text-center text-sm leading-relaxed text-stone-600 sm:px-6">
                  {(tour.schedules?.length ?? 0) > 0 ? (
                    <p>
                      Các lịch khởi hành hiện tại đã qua; hệ thống không mở đặt chỗ cho lịch đã
                      khởi hành. Vui lòng xem tour khác hoặc liên hệ tư vấn.
                    </p>
                  ) : (
                    <p>Tour này chưa có lịch khởi hành. Vui lòng quay lại sau.</p>
                  )}
                </div>
              ) : (
              <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,180px)_minmax(0,1fr)] lg:items-stretch">
                {/* ── Month column (always visible) — stretches to match right column height ── */}
                <MotionInView axis="up" once className="h-full min-h-0">
                  <aside className="flex h-full min-h-0 flex-col rounded-sm border border-stone-200/80 bg-[#fafafa] p-4 shadow-sm transition-shadow duration-500 hover:shadow-md">
                    <p className="border-b border-stone-200 pb-2 text-center text-sm font-bold text-stone-900">
                      Chọn tháng
                    </p>
                  <div className="mt-3 flex flex-col gap-2">
                    {availableMonths.map((ym) => {
                      const [y, m] = ym.split("-");
                      const yNum = Number(y);
                      const mNum = Number(m);
                      const isActive = selMonthKey
                        ? ym === selMonthKey
                        : calMonth.year === yNum && calMonth.month === mNum;
                      return (
                        <button
                          key={ym}
                          type="button"
                          onClick={() => {
                            if (selDate) {
                              if (selMonthKey === ym) {
                                clearDate();
                                setCalMonth({ year: yNum, month: mNum });
                                return;
                              }
                              clearDate();
                            }
                            setCalMonth({ year: yNum, month: mNum });
                          }}
                          className={[
                            "rounded-lg px-3 py-2.5 text-sm font-semibold transition",
                            isActive
                              ? "bg-[#0b5ea8] text-white shadow-sm"
                              : "border border-transparent bg-white text-[#0b5ea8] hover:bg-sky-50",
                          ].join(" ")}
                        >
                          {mNum}/{yNum}
                        </button>
                      );
                    })}
                  </div>
                  </aside>
                </MotionInView>

                {/* ── Calendar or date detail ── */}
                <MotionInView axis="up" once delayMs={100} className="h-full min-h-0">
                {selDate ? (
                  <div className="flex h-full min-h-0 flex-col rounded-sm border border-stone-200/80 bg-white p-4 shadow-md transition-shadow duration-500 hover:shadow-lg sm:p-5">
                    <div className="shrink-0 flex flex-wrap items-start justify-between gap-2 border-b border-stone-100 pb-3">
                      <button
                        type="button"
                        onClick={clearDate}
                        className="inline-flex cursor-pointer items-center gap-1 text-sm font-semibold text-[#0b5ea8] hover:text-[#063d6b]"
                      >
                        <ChevronLeft className="h-4 w-4" /> Quay lại
                      </button>
                      <span className="text-2xl font-bold tabular-nums text-[#d92d20] sm:text-3xl">
                        {selDate.split("-").reverse().join("/")}
                      </span>
                    </div>

                    <div className="mt-3 shrink-0 flex flex-wrap gap-2">
                      {selDateScheds.map((s) => {
                        const d = new Date(s.startDate);
                        const code = `${tourCode}-${String(s.id).padStart(3, "0")}-${pad2(d.getUTCDate())}${pad2(d.getUTCMonth() + 1)}${String(d.getUTCFullYear()).slice(2)}`;
                        const remSlot = remainingSeatsForScheduleRow(s);
                        const slotSoldOut = remSlot !== null && remSlot <= 0;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setSelSchedId(s.id)}
                            className={[
                              "rounded-lg border px-2.5 py-1.5 text-left text-[11px] leading-tight transition sm:text-xs",
                              s.id === selSchedId
                                ? slotSoldOut
                                  ? "border-red-400 bg-red-50 font-bold text-red-900 shadow-sm"
                                  : "border-[#0b5ea8] bg-sky-50 font-bold text-[#0b5ea8] shadow-sm"
                                : slotSoldOut
                                  ? "border-stone-200 bg-stone-50 text-stone-500 hover:border-stone-300 hover:bg-stone-100"
                                  : "border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50",
                            ].join(" ")}
                          >
                            {code}
                            {slotSoldOut ? (
                              <span className="mt-0.5 block text-[9px] font-bold uppercase text-red-600">
                                Hết chỗ
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>

                    {selSchedule && legTimes && (
                      <div className="mt-4 shrink-0">
                        <h4 className="text-center text-sm font-bold text-[#0b5ea8] sm:text-base">
                          Phương tiện di chuyển
                        </h4>
                        {isFlight ? (
                          <div className="mt-3 grid min-w-0 grid-cols-1 sm:grid-cols-2 sm:items-stretch sm:divide-x sm:divide-stone-200">
                            <div className="flex min-h-0 min-w-0 flex-col border-stone-200 p-3 sm:border-0 sm:p-4">
                              <TransportLegBlock
                                heading="Ngày đi"
                                dateStr={formatVnDate(legTimes.outbound.dep)}
                                dep={legTimes.outbound.dep}
                                arr={legTimes.outbound.arr}
                                depPlace={legTimes.outbound.depPlace}
                                arrPlace={legTimes.outbound.arrPlace}
                                variant="flight"
                                lineCode={legTimes.outbound.code}
                              />
                            </div>
                            <div className="flex min-h-0 min-w-0 flex-col border-t border-stone-200 p-3 sm:border-t-0 sm:p-4">
                              <TransportLegBlock
                                heading="Ngày về"
                                dateStr={formatVnDate(legTimes.inbound.dep)}
                                dep={legTimes.inbound.dep}
                                arr={legTimes.inbound.arr}
                                depPlace={legTimes.inbound.depPlace}
                                arrPlace={legTimes.inbound.arrPlace}
                                variant="flight"
                                lineCode={legTimes.inbound.code}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3 grid min-w-0 grid-cols-1 sm:grid-cols-2 sm:items-stretch sm:divide-x sm:divide-stone-200">
                            <div className="flex min-h-0 min-w-0 flex-col border-stone-200 p-3 sm:border-0 sm:p-4">
                              <TransportLegBlock
                                heading="Ngày đi"
                                dateStr={formatVnDate(legTimes.outbound.dep)}
                                dep={legTimes.outbound.dep}
                                arr={legTimes.outbound.arr}
                                depPlace={legTimes.outbound.depPlace}
                                arrPlace={legTimes.outbound.arrPlace}
                                variant="ground"
                                lineCode={null}
                              />
                            </div>
                            <div className="flex min-h-0 min-w-0 flex-col border-t border-stone-200 p-3 sm:border-t-0 sm:p-4">
                              <TransportLegBlock
                                heading="Ngày về"
                                dateStr={formatVnDate(legTimes.inbound.dep)}
                                dep={legTimes.inbound.dep}
                                arr={legTimes.inbound.arr}
                                depPlace={legTimes.inbound.depPlace}
                                arrPlace={legTimes.inbound.arrPlace}
                                variant="ground"
                                lineCode={null}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-4 shrink-0 sm:mt-5">
                      <h4 className="text-center text-sm font-bold text-[#0b5ea8] sm:text-base">Giá</h4>
                      <div className="mt-2 grid grid-cols-2 gap-0 border-y border-stone-200 sm:mt-3">
                        <div className="border-b border-stone-200 p-3">
                          <p className="text-xs font-semibold text-stone-900 sm:text-sm">Người lớn</p>
                          <p className="text-[11px] text-stone-500 sm:text-xs">Từ 12 tuổi trở lên</p>
                          <p className="mt-1 text-base font-bold text-[#d92d20] sm:text-lg">{formatVnd(displayPrice)}</p>
                        </div>
                        <div className="border-b border-l border-stone-200 p-3">
                          <p className="text-xs font-semibold text-stone-900 sm:text-sm">Trẻ nhỏ</p>
                          <p className="text-[11px] text-stone-500 sm:text-xs">Từ 2 - 4 tuổi</p>
                          <p className="mt-1 text-base font-bold text-[#d92d20] sm:text-lg">
                            {displayPrice != null ? formatVnd(Math.round(displayPrice * 0.5)) : "Liên hệ"}
                          </p>
                        </div>
                        <div
                          className={`p-3 ${!hasSingleRoomSupplement ? 'col-span-2 sm:col-span-2' : ''}`}
                        >
                          <p className="text-xs font-semibold text-stone-900 sm:text-sm">Trẻ em</p>
                          <p className="text-[11px] text-stone-500 sm:text-xs">Từ 5 - 11 tuổi</p>
                          <p className="mt-1 text-base font-bold text-[#d92d20] sm:text-lg">
                            {displayPrice != null ? formatVnd(Math.round(displayPrice * 0.9)) : "Liên hệ"}
                          </p>
                        </div>
                        {hasSingleRoomSupplement ? (
                        <div className="border-l border-stone-200 p-3">
                          <p className="text-xs font-semibold text-stone-900 sm:text-sm">
                            Phụ thu phòng đơn
                          </p>
                          <p className="text-[11px] text-stone-500 sm:text-xs">
                            Mỗi suất đăng ký
                          </p>
                          <p
                            className="mt-1 text-base font-bold text-[#d92d20] sm:text-lg"
                          >
                            {formatVnd(Number(singleRoomSupplement))}
                          </p>
                        </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="min-h-0 flex-1" aria-hidden />

                    <div className="mt-3 shrink-0 rounded-lg border border-amber-200/90 bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-950 sm:px-3.5 sm:py-2.5 sm:text-xs">
                      Trường hợp hủy hoặc thay đổi chuyến bay do thời tiết, khai thác hoặc sự cố kỹ thuật,
                      vui lòng liên hệ hotline{" "}
                      <a href="tel:1800646888" className="font-semibold text-amber-900 underline">
                        1800 646 888
                      </a>{" "}
                      để được hỗ trợ.
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full min-h-0 flex-col rounded-sm border border-stone-200/80 bg-white p-5 shadow-md transition-shadow duration-500 hover:shadow-lg">
                    <div className="flex shrink-0 items-center justify-center gap-6">
                      <button type="button" onClick={goPrev} className="p-1 text-stone-500 hover:text-stone-800">
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <h3 className="text-base font-bold text-stone-900">
                        Tháng {calMonth.month}/{calMonth.year}
                      </h3>
                      <button type="button" onClick={goNext} className="p-1 text-stone-500 hover:text-stone-800">
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="mt-4 grid shrink-0 grid-cols-7 text-center text-sm font-bold">
                      {WEEKDAYS.map((d, i) => (
                        <div
                          key={d}
                          className={[
                            "py-2",
                            i === 5 ? "text-[#0b5ea8]" : i === 6 ? "text-[#d92d20]" : "text-stone-700",
                          ].join(" ")}
                        >
                          {d}
                        </div>
                      ))}
                    </div>

                    <div className="grid shrink-0 grid-cols-7 text-center text-sm">
                      {calCells.map((cell, idx) => {
                        const entry = cell.currentMonth ? scheduleDateMap.get(cell.ymd) : undefined;
                        const has = !!entry;
                        return (
                          <button
                            key={idx}
                            type="button"
                            disabled={!has}
                            onClick={() => has && pickDate(cell.ymd)}
                            className={[
                              "flex h-[68px] flex-col items-center justify-center transition",
                              !cell.currentMonth && "text-stone-300",
                              has && "cursor-pointer rounded border border-[#ff9999] hover:bg-red-50",
                              !has && cell.currentMonth && "text-stone-600",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          >
                            <span>{cell.day}</span>
                            {has && (
                              <>
                                <span className="text-[10px]">🚌</span>
                                <span className="text-[10px] font-bold leading-none text-[#d92d20]">
                                  {formatPriceK(entry!.minPrice)}
                                </span>
                              </>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="min-h-0 flex-1" aria-hidden />

                    <p className="shrink-0 text-xs italic text-[#d92d20]">
                      Quý khách vui lòng chọn ngày phù hợp
                    </p>
                  </div>
                )}
                </MotionInView>
              </div>
              )}
            </section>

            {/* ═══ Section: Lịch trình ═══ */}
            <section ref={itineraryRef} className="mt-10 scroll-mt-16">
              <MotionInView axis="up" once className="w-full">
              <h2 className={TD_SECTION_TITLE_CARD}>Lịch trình</h2>

              {itineraries.length === 0 ? (
                <p className="mt-4 text-sm text-stone-500">Chưa có lịch trình cho tour này.</p>
              ) : (
                <div className={`${TD_CONTENT_CARD} mt-4`}>
                  {itineraries.map((day, dayIndex) => {
                    const isOpen = openItinId === day.id;
                    const rowSep = dayIndex < itineraries.length - 1;
                    const raw = day.title?.trim() || "";
                    const routePart = raw && !/^Ngày\s+\d+/i.test(raw) ? raw : raw.replace(/^Ngày\s+\d+[:\s]*/i, "").trim();
                    const MEAL_LABELS: Record<string, string> = {
                      BREAKFAST: "sáng",
                      LUNCH: "trưa",
                      DINNER: "chiều",
                      SNACK: "snack",
                    };
                    const meals = day.meals ?? [];
                    const mealCount = meals.length;
                    const mealNames = meals
                      .map((m) => MEAL_LABELS[m.mealType] ?? m.mealType.toLowerCase())
                      .join(", ");
                    const rowTitle = `Ngày ${day.dayNumber}${routePart ? `: ${routePart}` : ""}`;
                    const mealSubtitle =
                      mealCount > 0
                        ? `Ăn ${mealNames}`
                        : null;
                    const hasAccom = (day.accommodations?.length ?? 0) > 0;
                    return (
                      <div key={day.id} className={rowSep ? "border-b border-stone-100" : ""}>
                        <button
                          type="button"
                          onClick={() => setOpenItinId(isOpen ? null : day.id)}
                          className={`${TD_ACCORDION_ROW_BTN} items-start sm:items-center`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold leading-snug text-stone-900 sm:text-[15px]">
                              {rowTitle}
                            </p>
                            {mealSubtitle ? (
                              <p className="mt-1 flex items-center gap-1.5 text-xs leading-relaxed text-stone-600">
                                <Utensils className="h-3.5 w-3.5 shrink-0 text-stone-400" aria-hidden />
                                {mealSubtitle}
                              </p>
                            ) : null}
                          </div>
                          <ChevronRight
                            className={[
                              "mt-0.5 h-4 w-4 shrink-0 text-stone-400 transition-transform duration-200 sm:mt-0",
                              isOpen ? "rotate-90" : "",
                            ].join(" ")}
                            aria-hidden
                          />
                        </button>
                        {isOpen && (
                          <div className="border-t border-stone-100 bg-stone-50/50 px-4 py-4 space-y-4 sm:px-5">
                            {day.description && (
                              <p className="text-sm leading-relaxed text-stone-700 whitespace-pre-wrap">
                                {day.description}
                              </p>
                            )}
                            {hasAccom && (
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-2">Lưu trú</p>
                                <div className="space-y-2">
                                  {day.accommodations!.map((a) => (
                                    <div key={a.id} className="flex items-start gap-3 rounded-lg bg-blue-50 p-3">
                                      <span className="text-base">🏨</span>
                                      <div className="text-sm">
                                        <p className="font-semibold text-stone-800">
                                          {a.hotelName}
                                          {a.starRating ? <span className="ml-1 text-amber-500">{"★".repeat(a.starRating)}</span> : null}
                                        </p>
                                        {a.roomType && <p className="text-xs text-stone-500">Phòng: {a.roomType}</p>}
                                        {a.address && <p className="text-xs text-stone-500">{a.address}</p>}
                                        {a.supplier && <p className="text-xs text-stone-400">Đơn vị: {a.supplier.name}</p>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {mealCount > 0 && (
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-2">Bữa ăn</p>
                                <div className="space-y-2">
                                  {meals.map((m) => (
                                    <div key={m.id} className="flex items-start gap-3 rounded-lg bg-green-50 p-3">
                                      <span className="text-base">🍽</span>
                                      <div className="text-sm">
                                        <p className="font-semibold text-stone-800">
                                          {MEAL_LABELS[m.mealType] ?? m.mealType}
                                          {m.restaurantName ? ` — ${m.restaurantName}` : ""}
                                        </p>
                                        {m.menuStyle && <p className="text-xs text-stone-500">{m.menuStyle}</p>}
                                        {m.dietaryNotes && <p className="text-xs text-stone-400">{m.dietaryNotes}</p>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {!day.description && !hasAccom && mealCount === 0 && (
                              <p className="text-sm text-stone-400 italic">Chưa có thông tin chi tiết cho ngày này.</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              </MotionInView>
            </section>

            {/* ═══ Section: Vận chuyển ═══ */}
            {(tour.transports?.length ?? 0) > 0 && (
              <section className="mt-10 scroll-mt-16">
                <MotionInView axis="up" once className="w-full">
                <h2 className={TD_SECTION_TITLE_CARD}>Chi tiết vận chuyển</h2>
                <div className={`${TD_CONTENT_CARD} mt-4`}>
                  {([...(tour.transports ?? [])].sort((a, b) => a.legOrder - b.legOrder)).map((tr, ti, tarr) => {
                    const VEHICLE_LABELS: Record<string, string> = {
                      CAR_4: "Xe 4 chỗ", CAR_7: "Xe 7 chỗ", BUS_16: "Xe 16 chỗ",
                      BUS_29: "Xe 29 chỗ", BUS_45: "Xe 45 chỗ", FLIGHT: "Máy bay",
                      TRAIN: "Tàu hỏa", BOAT: "Tàu/Thuyền", CABLE_CAR: "Cáp treo",
                    };
                    const isOpen = openTransportId === tr.id;
                    const rowSep = ti < tarr.length - 1;
                    const label = VEHICLE_LABELS[tr.vehicleType] ?? tr.vehicleType;
                    return (
                      <div key={tr.id} className={rowSep ? "border-b border-stone-100" : ""}>
                        <button
                          type="button"
                          onClick={() => setOpenTransportId(isOpen ? null : tr.id)}
                          className={`${TD_ACCORDION_ROW_BTN} items-start sm:items-center`}
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-50 text-lg">
                            {tr.vehicleType === "FLIGHT" ? "✈️" : tr.vehicleType === "BOAT" ? "🚢" : tr.vehicleType === "TRAIN" ? "🚆" : "🚌"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold leading-snug text-stone-900 sm:text-[15px]">
                              Chặng {tr.legOrder}: {label}
                            </p>
                            <p className="mt-1 text-xs leading-relaxed text-stone-600">
                              {tr.departurePoint} → {tr.arrivalPoint}
                              {tr.estimatedHours != null ? ` · ~${tr.estimatedHours} giờ` : ""}
                            </p>
                          </div>
                          <ChevronRight
                            className={[
                              "mt-2 h-4 w-4 shrink-0 text-stone-400 transition-transform duration-200 sm:mt-0",
                              isOpen ? "rotate-90" : "",
                            ].join(" ")}
                            aria-hidden
                          />
                        </button>
                        {isOpen && (
                          <div className="border-t border-stone-100 bg-stone-50/50 px-4 py-4 text-sm sm:px-5">
                            {tr.vehicleDetail?.trim() ? (
                              <p className="whitespace-pre-wrap leading-relaxed text-stone-700">
                                {tr.vehicleDetail}
                              </p>
                            ) : null}
                            {tr.seatClass?.trim() ? (
                              <p className={tr.vehicleDetail?.trim() ? "mt-2" : ""}>
                                <span className="font-semibold text-stone-800">Hạng chỗ: </span>
                                <span className="text-stone-600">{tr.seatClass}</span>
                              </p>
                            ) : null}
                            {tr.supplier ? (
                              <p className="mt-2 text-stone-600">
                                <span className="font-semibold text-stone-800">Đơn vị: </span>
                                {tr.supplier.name}
                                {tr.supplier.phone ? ` · ${tr.supplier.phone}` : ""}
                              </p>
                            ) : null}
                            {!tr.vehicleDetail?.trim() && !tr.seatClass?.trim() && !tr.supplier ? (
                              <p className="text-stone-500 italic">Không có thêm chi tiết cho chặng này.</p>
                            ) : null}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                </MotionInView>
              </section>
            )}

            {/* ═══ Section: Bao gồm / Không bao gồm ═══ */}
            {(tour.inclusions || tour.exclusions) && (
              <section className="mt-10">
                <MotionInView axis="up" once className="w-full">
                <h2 className={TD_SECTION_TITLE}>
                  Giá tour bao gồm
                </h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {tour.inclusions && (
                    <div className="tour-include-exclude rounded-sm border border-green-200/90 bg-white p-5 shadow-sm">
                      <h5 className="mb-3 border-b border-green-200/80 pb-2 text-base font-bold text-green-900">
                        Bao gồm
                      </h5>
                      <p className="whitespace-pre-wrap text-sm leading-[1.75] text-green-900/85">
                        {tour.inclusions}
                      </p>
                    </div>
                  )}
                  {tour.exclusions && (
                    <div className="tour-include-exclude rounded-sm border border-red-200/90 bg-white p-5 shadow-sm">
                      <h5 className="mb-3 border-b border-red-200/80 pb-2 text-base font-bold text-red-900">
                        Không bao gồm
                      </h5>
                      <p className="whitespace-pre-wrap text-sm leading-[1.75] text-red-900/85">
                        {tour.exclusions}
                      </p>
                    </div>
                  )}
                </div>
                {tour.cancellationPolicy && (
                  <div className="mt-4 rounded-sm border border-amber-200/90 bg-amber-50/80 p-5 shadow-sm">
                    <h5 className="mb-3 border-b border-amber-300/60 pb-2 text-base font-bold text-amber-900">
                      Chính sách hủy tour
                    </h5>
                    <p className="whitespace-pre-wrap text-sm leading-[1.75] text-amber-950/90">
                      {tour.cancellationPolicy}
                    </p>
                  </div>
                )}
                </MotionInView>
              </section>
            )}

            {/* ═══ Section: Lưu ý ═══ */}
            <section ref={notesRef} className="mt-10 scroll-mt-16">
              <MotionInView axis="up" once className="w-full">
              <h2 className={TD_SECTION_TITLE_CARD}>Những thông tin cần lưu ý</h2>
              <div className={`${TD_CONTENT_CARD} mt-4`}>
                {NOTE_ITEMS.map((item, idx) => {
                  const isOpen = openNoteIdx === idx;
                  const rowSep = idx < NOTE_ITEMS.length - 1;
                  return (
                    <div key={idx} className={rowSep ? "border-b border-stone-100" : ""}>
                      <button
                        type="button"
                        onClick={() => setOpenNoteIdx(isOpen ? null : idx)}
                        className={`${TD_ACCORDION_ROW_BTN} items-center`}
                      >
                        <span className="min-w-0 flex-1 text-sm font-semibold leading-snug text-stone-900 sm:text-[15px]">
                          {item.label}
                        </span>
                        <ChevronDown
                          className={[
                            "h-4 w-4 shrink-0 text-stone-400 transition-transform duration-200",
                            isOpen ? "rotate-180" : "",
                          ].join(" ")}
                          aria-hidden
                        />
                      </button>
                      {isOpen && (
                        <div className="border-t border-stone-100 bg-stone-50/50 px-4 py-3 text-sm leading-relaxed text-stone-600 sm:px-5 sm:py-4 whitespace-pre-wrap">
                          {item.content}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              </MotionInView>
            </section>
          </div>

          {/* ═══════ RIGHT SIDEBAR (sticky, desktop only) ═══════ */}
          <aside className="hidden lg:block">
            <div
              className={[
                "sticky space-y-4 transition-[top] duration-300 ease-out",
              ].join(" ")}
              style={{
                top: showFixedTabs
                  ? siteHeaderDocked
                    ? "calc(var(--site-header-h, 96px) + 52px)"
                    : 52
                  : 96,
              }}
            >
              <MotionInView axis="up" once delayMs={80} className="w-full">
              <div className="rounded-sm border border-stone-200/90 bg-[#f8f8f8] p-5 pb-6 shadow-sm transition-shadow duration-500 hover:shadow-md">
                {selSchedule ? (
                  /* ── State 2: date selected ── */
                  <>
                    <p className="text-sm font-semibold text-stone-600">Giá</p>
                    {basePrice != null && displayPrice != null && displayPrice < basePrice && (
                      <p className="text-sm text-stone-400 line-through">{formatVnd(basePrice)}</p>
                    )}
                    <p className="text-[28px] font-extrabold leading-tight text-[#d92d20]">
                      {formatVnd(displayPrice)}
                      <span className="text-sm font-normal text-stone-600"> / Khách</span>
                    </p>

                    <div className="mt-4 space-y-2.5 border-t border-stone-200/90 pt-4 text-sm text-stone-700">
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 text-stone-400">⚙️</span>
                        <span>
                          Mã tour:{" "}
                          <strong>
                            {tourCode}-{String(selSchedule.id).padStart(3, "0")}-
                            {pad2(new Date(selSchedule.startDate).getUTCDate())}
                            {pad2(new Date(selSchedule.startDate).getUTCMonth() + 1)}
                          </strong>
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
                        <span>
                          Khởi hành:{" "}
                          <strong className="text-[#0b5ea8]">
                            {tour.departureLocation?.name ?? "Đang cập nhật"}
                          </strong>
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
                        <span>
                          Ngày khởi hành:{" "}
                          <strong>{formatDmDate(new Date(selSchedule.startDate))}</strong>
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
                        <span>
                          Thời gian: <strong>{durationLabel(tour.durationDays)}</strong>
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Users className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
                        <span>
                          Số chỗ còn:{" "}
                          <strong
                            className={
                              remaining === 0 ? "font-bold text-red-600" : undefined
                            }
                          >
                            {remaining == null
                              ? "Liên hệ"
                              : remaining === 0
                                ? "Hết chỗ"
                                : remaining}
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 flex gap-2">
                      <button
                        type="button"
                        onClick={clearDate}
                        className="flex-1 rounded border border-stone-300 px-3 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
                      >
                        Ngày khác
                      </button>
                      {selectedScheduleSoldOut ? (
                        <button
                          type="button"
                          onClick={showScheduleSoldOutToast}
                          className="flex-1 rounded bg-[#d92d20] px-3 py-2.5 text-center text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#b91c1c] hover:shadow-lg active:translate-y-0"
                        >
                          Đặt ngay
                        </button>
                      ) : (
                        <Link
                          href={`/book/${tour.id}?scheduleId=${selSchedule.id}`}
                          className="flex-1 rounded bg-[#d92d20] px-3 py-2.5 text-center text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#b91c1c] hover:shadow-lg active:translate-y-0"
                        >
                          Đặt ngay
                        </Link>
                      )}
                    </div>
                    <div className="mt-2">
                      <WishlistButton tourId={tour.id} tourName={tour.name} variant="button" className="w-full justify-center" />
                    </div>
                  </>
                ) : (
                  /* ── State 1: no date selected ── */
                  <>
                    <p className="text-sm font-semibold text-stone-600">Giá từ</p>
                    <p className="text-[28px] font-extrabold leading-tight text-[#d92d20]">
                      {formatVnd(basePrice)}
                      <span className="text-sm font-normal text-stone-600"> / Khách</span>
                    </p>

                    <div className="mt-3 flex items-center gap-2 border-t border-stone-200/90 pt-3 text-sm text-stone-600">
                      <span>⚙️</span>
                      <span>
                        Mã chương trình: <strong>{tourCode}</strong>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => revealTabBarAndScroll("schedule")}
                      className="mt-5 w-full rounded bg-[#0b5ea8] px-4 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#084f8f] hover:shadow-md active:translate-y-0"
                    >
                      🗓️ Chọn ngày khởi hành
                    </button>
                    <div className="mt-2">
                      <WishlistButton tourId={tour.id} tourName={tour.name} variant="button" className="w-full justify-center" />
                    </div>
                  </>
                )}
              </div>
              </MotionInView>
            </div>
          </aside>
        </div>

        {/* Sau hàng 2 cột (lưu ý + sidebar đặt chỗ): chương trình khác & đánh giá trải rộng cả khối */}
        <section ref={othersRef} className="mt-10 scroll-mt-16">
          <MotionInView axis="up" once className="w-full">
            <RelatedTourPrograms tours={relatedTours} />
            {relatedTours.length === 0 && (
              <>
                <h2 className={TD_SECTION_TITLE}>Chương trình khác</h2>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-stone-600">
                  Hiện chưa có chương trình tương tự để gợi ý.
                </p>
              </>
            )}
          </MotionInView>
        </section>

        <section ref={reviewsRef} id="reviews" className="mt-10 scroll-mt-16">
          <MotionInView axis="up" once className="w-full">
            <h2 className={TD_SECTION_TITLE}>Đánh giá từ khách hàng</h2>
            <div className="mt-4">
              <TourReviews
                tourId={tour.id}
                initialRatingAvg={tour.ratingAvg}
                initialTotalReviews={tour.totalReviews}
              />
            </div>
          </MotionInView>
        </section>
      </div>

      {/* ── Mobile bottom bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between gap-4 border-t border-stone-200 bg-white px-4 py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.08)] lg:hidden">
        <div className="flex items-center gap-3">
          <WishlistButton tourId={tour.id} tourName={tour.name} variant="icon" />
          <div>
            <p className="text-xs text-stone-500">{selSchedule ? "Giá" : "Giá từ"}</p>
            <p className="text-xl font-extrabold text-[#d92d20]">{formatVnd(displayPrice ?? basePrice)}</p>
          </div>
        </div>
        {selSchedule ? (
          selectedScheduleSoldOut ? (
            <button
              type="button"
              onClick={showScheduleSoldOutToast}
              className="shrink-0 rounded bg-[#d92d20] px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#b91c1c] hover:shadow-lg active:translate-y-0"
            >
              Đặt ngay
            </button>
          ) : (
            <Link
              href={`/book/${tour.id}?scheduleId=${selSchedule.id}`}
              className="rounded bg-[#d92d20] px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#b91c1c] hover:shadow-lg active:translate-y-0"
            >
              Đặt ngay
            </Link>
          )
        ) : (
          <button
            type="button"
            onClick={() => revealTabBarAndScroll("schedule")}
            className="rounded bg-[#0b5ea8] px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#084f8f] hover:shadow-md active:translate-y-0"
          >
            Chọn ngày
          </button>
        )}
      </div>
      <BookingCornerToast
        toast={scheduleSoldOutToast}
        onDismiss={dismissScheduleSoldOutToast}
      />
    </main>
  );
}
