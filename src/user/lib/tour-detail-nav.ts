/** Hash mở sẵn tab Lịch khởi hành trên trang chi tiết tour */
export const TOUR_SCHEDULE_TAB_HASH = "lich-khoi-hanh";

/** Query đồng bộ ngày đã chọn (YYYY-MM-DD, UTC như trang chi tiết) */
export const TOUR_SCHEDULE_DATE_QUERY = "departureDate";

export function tourDetailScheduleHref(
  tourId: string | number,
  options?: { dateYmd?: string },
): string {
  const id = String(tourId);
  const hash = `#${TOUR_SCHEDULE_TAB_HASH}`;
  const y = options?.dateYmd?.trim();
  if (y && /^\d{4}-\d{2}-\d{2}$/.test(y)) {
    return `/tours/${id}?${TOUR_SCHEDULE_DATE_QUERY}=${encodeURIComponent(y)}${hash}`;
  }
  return `/tours/${id}${hash}`;
}
