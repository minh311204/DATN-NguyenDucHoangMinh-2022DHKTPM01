/** Khớp dữ liệu API tour / location — không import shared (tránh bundler). */

export type LocationBrief = {
  id: number;
  name?: string | null;
};

export type TourScheduleBrief = {
  id: number;
  startDate: string | null;
  priceOverride?: number | null;
  remainingSeats?: number | null;
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
  /** Phụ thu phòng đơn (VND / suất), null = chưa cấu hình */
  singleRoomSupplement?: number | null;
  maxPeople?: number | null;
  thumbnailUrl?: string | null;
  ratingAvg?: number | null;
  totalReviews?: number | null;
  tourLine?: string | null;
  transportType?: string | null;
  isActive?: boolean | null;
  /** Tour hiển thị khối nổi bật (admin) */
  isFeatured?: boolean | null;
  departureLocation?: LocationBrief;
  destinationLocation?: LocationBrief;
  /** Nhãn TourTag — API list tour có thể trả kèm */
  tags?: { id: number; name: string; description?: string | null }[];
  schedules?: TourScheduleBrief[];
};

export type TourImage = {
  id: number;
  tourId: number;
  imageUrl: string;
  isThumbnail?: boolean | null;
};

export type SupplierBrief = {
  id: number;
  name: string;
  type: string;
  phone?: string | null;
};

export type TourTransport = {
  id: number;
  tourId: number;
  supplierId?: number | null;
  supplier?: SupplierBrief | null;
  legOrder: number;
  vehicleType: string;
  vehicleDetail?: string | null;
  seatClass?: string | null;
  departurePoint: string;
  arrivalPoint: string;
  estimatedHours?: number | null;
  notes?: string | null;
};

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

export type TourMeal = {
  id: number;
  itineraryId: number;
  supplierId?: number | null;
  supplier?: SupplierBrief | null;
  mealType: string;
  restaurantName?: string | null;
  menuStyle?: string | null;
  dietaryNotes?: string | null;
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

export type TourDetail = TourListItem & {
  images: TourImage[];
  videos: { id: number; tourId: number; videoUrl: string }[];
  schedules: {
    id: number;
    tourId: number;
    startDate: string;
    endDate: string;
    availableSeats?: number | null;
    bookedSeats?: number | null;
    remainingSeats?: number | null;
    priceOverride?: number | null;
    status?: string | null;
  }[];
  itineraries: TourItinerary[];
  tags: { id: number; name: string; description?: string | null }[];
  transports?: TourTransport[];
  inclusions?: string | null;
  exclusions?: string | null;
  cancellationPolicy?: string | null;
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

export type UserResponse = {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  role: string;
  hasPassword: boolean;
};

export type TourRatingSummary = {
  ratingAvg: number | null;
  totalReviews: number | null;
};

export type TourReviewUser = {
  id: number;
  firstName: string | null;
  lastName: string | null;
};

export type TourReview = {
  id: number;
  tourId: number;
  userId: number;
  rating: number;
  comment: string | null;
  createdAtUtc: string | null;
  user: TourReviewUser;
};

export type UpsertTourReviewResponse = {
  review: TourReview;
  tour: TourRatingSummary;
};

export type DeleteReviewResponse = {
  message: string;
  tour: TourRatingSummary;
};

// ---- Wishlist ----

export type WishlistItem = {
  id: number;
  userId: number;
  tourId: number;
  createdAtUtc: string | null;
  tour: TourListItem;
};

export type WishlistCheck = {
  inWishlist: boolean;
};

// ---- Notification ----

export type Notification = {
  id: number;
  userId: number;
  title: string | null;
  content: string | null;
  isRead: boolean;
  createdAtUtc: string | null;
};

export type UnreadCount = {
  count: number;
};

/** Payload sự kiện socket `notification` (đồng bộ badge + danh sách). */
export type NotificationRealtimePayload = {
  notification: Notification;
  unreadCount: number;
};

// ---- Preference ----

export type UserPreference = {
  id: number;
  userId: number;
  preferredLocations: string | null;
  budgetRange: string | null;
  travelStyle: string | null;
};

export type UserBehavior = {
  id: number;
  userId: number;
  tourId: number;
  action: string;
  createdAtUtc: string | null;
};
