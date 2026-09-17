/**
 * Hai khung giờ lịch tour (UTC, start/end từ TourSchedule) giao nhau
 * → không thể đặt thêm chuyến cho cùng một người (đặt cho bản thân).
 */
export function schedulesOverlapUtc(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return (
    aStart.getTime() <= bEnd.getTime() && bStart.getTime() <= aEnd.getTime()
  )
}
