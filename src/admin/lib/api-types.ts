/** Khớp dữ liệu API tour / location — không import shared (tránh bundler). */

export type LocationBrief = {
  id: number;
  name?: string | null;
};

export type TourListItem = {
  id: number;
  departureLocationId: number;
  destinationLocationId: number;
  name: string;
  slug?: string | null;
  description?: string | null;
  durationDays?: number | null;
  basePrice?: number | null;
  maxPeople?: number | null;
  thumbnailUrl?: string | null;
  ratingAvg?: number | null;
  totalReviews?: number | null;
  tourLine?: string | null;
  transportType?: string | null;
  isActive?: boolean | null;
  isFeatured?: boolean | null;
  departureLocation?: LocationBrief;
  destinationLocation?: LocationBrief;
  /** Nhãn TourTag — list tour từ API có thể kèm */
  tags?: { id: number; name: string; description?: string | null }[];
  /** ISO — từ API list tour */
  createdAtUtc?: string | null;
};

export type TourImage = {
  id: number;
  tourId: number;
  imageUrl: string;
  isThumbnail?: boolean | null;
};

export type TourItinerary = {
  id: number;
  tourId: number;
  dayNumber: number;
  title?: string | null;
  description?: string | null;
  accommodations?: TourAccommodation[];
  meals?: TourMeal[];
};

export type TourSchedule = {
  id: number;
  tourId: number;
  startDate: string;
  endDate: string;
  availableSeats?: number | null;
  bookedSeats?: number | null;
  priceOverride?: number | null;
  status?: string | null;
};

export type TourTagRow = {
  id: number;
  name: string;
  description?: string | null;
  tourCount?: number;
};

export type TourDetail = TourListItem & {
  images: TourImage[];
  videos: { id: number; tourId: number; videoUrl: string }[];
  schedules: TourSchedule[];
  itineraries: TourItinerary[];
  tags: { id: number; name: string; description?: string | null }[];
  transports: TourTransport[];
  inclusions?: string | null;
  exclusions?: string | null;
  cancellationPolicy?: string | null;
};

export type RegionRow = {
  id: number;
  name?: string | null;
};

export type ProvinceRow = {
  id: number;
  regionId: number;
  name?: string | null;
};

export type LocationRow = {
  id: number;
  provinceId: number;
  name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  description?: string | null;
  isActive?: boolean | null;
};

/** Khớp TourLine / TransportType trong Prisma & API. */
export type TourLine = "PREMIUM" | "STANDARD" | "ECONOMY" | "GOOD_VALUE";
export type TransportType = "BUS" | "FLIGHT" | "MIXED";
export type SupplierType =
  | "TRANSPORT"
  | "HOTEL"
  | "RESTAURANT"
  | "GUIDE"
  | "ACTIVITY";
export type VehicleType =
  | "CAR_4"
  | "CAR_7"
  | "BUS_16"
  | "BUS_29"
  | "BUS_45"
  | "FLIGHT"
  | "TRAIN"
  | "BOAT"
  | "CABLE_CAR";
export type MealType = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";

export type SupplierBrief = {
  id: number;
  name: string;
  type: SupplierType;
  phone?: string | null;
};

export type Supplier = {
  id: number;
  name: string;
  type: SupplierType;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  website?: string | null;
  taxCode?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAtUtc?: string | null;
};

export type CreateSupplierInput = {
  name: string;
  type: SupplierType;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  taxCode?: string;
  notes?: string;
  isActive?: boolean;
};

export type UpdateSupplierInput = Partial<CreateSupplierInput>;

export type TourTransport = {
  id: number;
  tourId: number;
  supplierId?: number | null;
  supplier?: SupplierBrief | null;
  legOrder: number;
  vehicleType: VehicleType;
  vehicleDetail?: string | null;
  seatClass?: string | null;
  departurePoint: string;
  arrivalPoint: string;
  estimatedHours?: number | null;
  notes?: string | null;
};

export type CreateTourTransportInput = {
  supplierId?: number;
  legOrder: number;
  vehicleType: VehicleType;
  vehicleDetail?: string;
  seatClass?: string;
  departurePoint: string;
  arrivalPoint: string;
  estimatedHours?: number;
  notes?: string;
};

export type UpdateTourTransportInput = Partial<CreateTourTransportInput>;

export type TourAccommodation = {
  id: number;
  itineraryId: number;
  supplierId?: number | null;
  supplier?: SupplierBrief | null;
  hotelName: string;
  starRating?: number | null;
  roomType?: string | null;
  checkInNote?: string | null;
  checkOutNote?: string | null;
  address?: string | null;
  mapUrl?: string | null;
};

export type CreateTourAccommodationInput = {
  supplierId?: number;
  hotelName: string;
  starRating?: number;
  roomType?: string;
  checkInNote?: string;
  checkOutNote?: string;
  address?: string;
  mapUrl?: string;
};

export type UpdateTourAccommodationInput = Partial<CreateTourAccommodationInput>;

export type TourMeal = {
  id: number;
  itineraryId: number;
  supplierId?: number | null;
  supplier?: SupplierBrief | null;
  mealType: MealType;
  restaurantName?: string | null;
  menuStyle?: string | null;
  dietaryNotes?: string | null;
};

export type CreateTourMealInput = {
  supplierId?: number;
  mealType: MealType;
  restaurantName?: string;
  menuStyle?: string;
  dietaryNotes?: string;
};

export type UpdateTourMealInput = Partial<CreateTourMealInput>;

export type CreateTourImageInput = {
  imageUrl: string;
  isThumbnail?: boolean;
};

export type CreateTourVideoInput = {
  videoUrl: string;
};

/** ISO 8601 datetime (`z.string().datetime()` trên backend). */
export type CreateTourScheduleInput = {
  startDate: string;
  endDate: string;
  availableSeats?: number;
  bookedSeats?: number;
  priceOverride?: number;
  status?: string;
};

export type UpdateTourScheduleInput = Partial<CreateTourScheduleInput>;

export type CreateTourItineraryInput = {
  dayNumber: number;
  title?: string;
  description?: string;
};

export type UpdateTourItineraryInput = Partial<CreateTourItineraryInput>;

/** Body POST /tours (ADMIN). */
export type CreateTourInput = {
  departureLocationId: number;
  destinationLocationId: number;
  name: string;
  slug?: string;
  description?: string;
  durationDays?: number;
  basePrice?: number;
  maxPeople?: number;
  thumbnailUrl?: string;
  tourLine?: TourLine;
  transportType?: TransportType;
  isActive?: boolean;
  isFeatured?: boolean;
  inclusions?: string;
  exclusions?: string;
  cancellationPolicy?: string;
  tagIds?: number[];
  images?: CreateTourImageInput[];
  videos?: CreateTourVideoInput[];
  schedules?: CreateTourScheduleInput[];
  itineraries?: CreateTourItineraryInput[];
};

/** Body PUT /tours/:id (ADMIN). */
export type UpdateTourInput = {
  departureLocationId?: number;
  destinationLocationId?: number;
  name?: string;
  slug?: string | null;
  description?: string | null;
  durationDays?: number | null;
  basePrice?: number | null;
  maxPeople?: number | null;
  thumbnailUrl?: string | null;
  tourLine?: TourLine | null;
  transportType?: TransportType | null;
  isActive?: boolean | null;
  isFeatured?: boolean | null;
  inclusions?: string | null;
  exclusions?: string | null;
  cancellationPolicy?: string | null;
  tagIds?: number[];
};

export type DeleteTourResponse = {
  message: string;
};

/** ========================= Users (ADMIN) ========================= */

export type UserRole = "ADMIN" | "USER";
export type UserStatus = "ACTIVE" | "INACTIVE" | "BANNED";

export type AdminUser = {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: UserStatus;
  role: UserRole;
};

export type UpdateUserInput = {
  firstName?: string;
  lastName?: string;
};

export type DeleteUserResponse = {
  success: boolean;
};

/** ========================= Bookings (ADMIN) ========================= */

export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";

export type BookingCancellationRequestState = "NONE" | "PENDING" | "REJECTED";

export type BookingPassengerRow = {
  id: number;
  bookingId: number;
  ageCategory: string;
  fullName: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  passportNumber?: string | null;
};

export type BookingScheduleList = {
  id: number;
  startDate: string;
  endDate: string;
  remainingSeats?: number | null;
  priceOverride?: number | null;
  adultPrice?: number | null;
  childPrice?: number | null;
  infantPrice?: number | null;
  tour: { id: number; name: string; basePrice?: number | null };
};

export type BookingScheduleFull = BookingScheduleList & {
  availableSeats?: number | null;
  bookedSeats?: number | null;
};

export type BookingListItem = {
  id: number;
  userId: number | null;
  tourScheduleId: number;
  numberOfPeople: number;
  bookingDateUtc?: string | null;
  totalAmount?: number | null;
  status: BookingStatus;
  /** Chính sách hủy — số ngày tối thiểu trước khởi hành (theo server) */
  cancelMinDaysBeforeDeparture: number;
  cancellationRequestState: BookingCancellationRequestState;
  cancellationRequestedAtUtc?: string | null;
  cancellationRejectedAtUtc?: string | null;
  cancellationApprovedAtUtc?: string | null;
  contact: {
    fullName: string;
    email: string;
    phone: string;
    address?: string;
  };
  notes?: string | null;
  passengerCounts: { adults: number; children: number; infants: number };
  schedule: BookingScheduleList;
  passengers: BookingPassengerRow[];
};

/** Chi tiết booking (admin): schedule đủ field ghế */
export type BookingDetail = Omit<BookingListItem, "schedule"> & {
  schedule: BookingScheduleFull;
};

export type UpdateBookingStatusBody = {
  status: BookingStatus;
};

/** ========================= Payments (ADMIN) ========================= */

export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED";

export type AdminPaymentRow = {
  id: number;
  bookingId: number;
  paymentGateway: string | null;
  paymentMethod: string | null;
  transactionCode: string | null;
  amount: number | null;
  status: PaymentStatus;
  paidAtUtc: string | null;
  booking: {
    id: number;
    contactName: string | null;
    contactEmail: string | null;
    bookingStatus: BookingStatus;
    totalAmount: number | null;
    tourName: string;
    tourId: number;
    departureStartUtc: string;
  };
};

export type AdminPaymentListResponse = {
  items: AdminPaymentRow[];
  total: number;
  page: number;
  pageSize: number;
};

export type BookingListPaginated = {
  items: BookingListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type UserListPaginated = {
  items: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
};

export type TourListPaginated = {
  items: TourListItem[];
  total: number;
  page: number;
  pageSize: number;
};

/** GET /admin/dashboard/stats */
export type AdminDashboardStats = {
  range: { startUtc: string; endUtc: string };
  granularity: "day" | "month" | "year";
  summary: {
    totalRevenueVnd: number;
    bookingCount: number;
    newUsersCount: number;
    pendingBookingsCount: number;
    completionRatePercent: number | null;
  };
  comparison: {
    prevRange: { startUtc: string; endUtc: string };
    revenueChangePercent: number | null;
    bookingChangePercent: number | null;
    usersChangePercent: number | null;
    totalRevenuePrevVnd: number;
    bookingCountPrev: number;
    newUsersPrev: number;
  };
  revenueSeries: {
    label: string;
    revenueVnd: number;
    bookingCount: number;
    paymentSuccessCount: number;
    conversionRatePercent: number;
  }[];
  bookingStatusBreakdown: Record<string, number>;
  heatmapWeekday: { label: string; count: number }[];
  toursByRegion: { regionName: string; bookingCount: number }[];
  supplierCountByType: { type: string; count: number }[];
  topTours: { tourId: number; tourName: string; bookingCount: number }[];
};
