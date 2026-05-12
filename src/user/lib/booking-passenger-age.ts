/** Re-export để `@/lib/booking-passenger-age` và API dùng chung quy định ngày sinh. */

export type { PassengerAgeCategory } from '../../shared/lib/booking-passenger-age';
export {
  ageBandTooltipLines,
  parseBookingYmdUtc,
  validateDobForCategory,
  validateDobUtcForCategory,
} from '../../shared/lib/booking-passenger-age';
