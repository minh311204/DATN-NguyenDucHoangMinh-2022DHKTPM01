/**
 * Quy định loại hành khách theo ngày sinh (so sánh UTC 00:00, cùng cách như booking API).
 */

export type PassengerAgeCategory = 'ADULT' | 'CHILD' | 'INFANT';

/** Người lớn: sinh trước ngày này */
const CHILD_BAND_START_EXCL_UPPER = new Date(Date.UTC(2014, 4, 18));
/** Trẻ em */
const CHILD_BAND_START_INCL = new Date(Date.UTC(2014, 4, 18));
const CHILD_BAND_END_INCL = new Date(Date.UTC(2021, 4, 17));
/** Trẻ nhỏ */
const INFANT_BAND_START_INCL = new Date(Date.UTC(2021, 4, 18));
const INFANT_BAND_END_INCL = new Date(Date.UTC(2024, 4, 17));

export function parseBookingYmdUtc(ymd: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(dt.getTime())) return null;
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return dt;
}

/** Gợi ý theo quy định ngày sinh cố định (không phụ thuộc ngày khởi hành). */
export function ageBandTooltipLines(
  _departureUtc: Date,
  band: PassengerAgeCategory,
): string[] {
  void _departureUtc;
  if (band === 'ADULT') {
    return ['Người lớn sinh trước ngày 18/05/2014'];
  }
  if (band === 'CHILD') {
    return ['Trẻ em sinh từ 18/05/2014 đến 17/05/2021'];
  }
  return ['Trẻ nhỏ sinh từ 18/05/2021 đến 17/05/2024'];
}

function isAdultBirthDate(dobUtc: Date): boolean {
  return dobUtc.getTime() < CHILD_BAND_START_EXCL_UPPER.getTime();
}

function isChildBirthDate(dobUtc: Date): boolean {
  const t = dobUtc.getTime();
  return (
    t >= CHILD_BAND_START_INCL.getTime() && t <= CHILD_BAND_END_INCL.getTime()
  );
}

function isInfantBirthDate(dobUtc: Date): boolean {
  const t = dobUtc.getTime();
  return (
    t >= INFANT_BAND_START_INCL.getTime() &&
    t <= INFANT_BAND_END_INCL.getTime()
  );
}

function isBirthAfterTrackedBands(dobUtc: Date): boolean {
  return dobUtc.getTime() > INFANT_BAND_END_INCL.getTime();
}

export function validateDobUtcForCategory(
  dobUtc: Date,
  category: PassengerAgeCategory,
  departureUtc: Date,
): string | null {
  if (Number.isNaN(dobUtc.getTime())) {
    return 'Ngày sinh không hợp lệ';
  }

  if (dobUtc.getTime() > departureUtc.getTime()) {
    return 'Ngày sinh không được sau ngày khởi hành';
  }

  if (isBirthAfterTrackedBands(dobUtc)) {
    return 'Hành khách sinh sau 17/05/2024: vui lòng liên hệ để được tư vấn.';
  }

  if (category === 'ADULT') {
    return isAdultBirthDate(dobUtc)
      ? null
      : 'Người lớn phải sinh trước ngày 18/05/2014.';
  }

  if (category === 'CHILD') {
    return isChildBirthDate(dobUtc)
      ? null
      : 'Trẻ em phải sinh từ 18/05/2014 đến 17/05/2021.';
  }

  return isInfantBirthDate(dobUtc)
    ? null
    : 'Trẻ nhỏ phải sinh từ 18/05/2021 đến 17/05/2024.';
}

export function validateDobForCategory(
  ymd: string,
  category: PassengerAgeCategory,
  departureUtc: Date,
): string | null {
  const dob = parseBookingYmdUtc(ymd);
  if (!dob) return 'Ngày sinh không hợp lệ';
  return validateDobUtcForCategory(dob, category, departureUtc);
}
