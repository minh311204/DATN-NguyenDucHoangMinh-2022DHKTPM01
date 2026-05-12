import { z } from 'zod'

/** ========================= TourTag ========================= */

export const TourTagResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable().optional(),
  /** Số tour đang hoạt động (nhãn TourTag hoặc đúng dòng tour nếu tên khớp Cao cấp / Tiêu chuẩn / …) */
  tourCount: z.number().int().nonnegative().optional(),
})

export const CreateTourTagSchema = z.object({
  name: z.string().min(1),
  description: z.string().max(20000).nullable().optional(),
})

export const UpdateTourTagSchema = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().max(20000).nullable().optional(),
  })
  .refine((d) => d.name !== undefined || d.description !== undefined, {
    message: 'Cần ít nhất một trường để cập nhật',
  })

/** ========================= Media ========================= */

export const TourImageResponseSchema = z.object({
  id: z.number(),
  tourId: z.number(),
  imageUrl: z.string(),
  isThumbnail: z.boolean().nullable().optional(),
})

export const CreateTourImageSchema = z.object({
  imageUrl: z.string().url(),
  isThumbnail: z.boolean().optional(),
})

export const TourVideoResponseSchema = z.object({
  id: z.number(),
  tourId: z.number(),
  videoUrl: z.string(),
})

export const CreateTourVideoSchema = z.object({
  videoUrl: z.string().url(),
})

/** ========================= Schedule ========================= */

/** Trạng thái lịch khởi hành (TourSchedule.status) — khớp seed & filter list */
export const TourScheduleStatusSchema = z.enum([
  'OPEN',
  'ACTIVE',
  'FULL',
  'CANCELLED',
])

export const TourScheduleResponseSchema = z.object({
  id: z.number(),
  tourId: z.number(),
  startDate: z.string(),
  endDate: z.string(),
  availableSeats: z.number().nullable().optional(),
  bookedSeats: z.number().nullable().optional(),
  priceOverride: z.number().nullable().optional(),
  status: z.string().nullable().optional(),
  /** ISO datetime — có khi đã ẩn khỏi site user (admin vẫn nhận bản ghi) */
  deletedAt: z.string().datetime().nullable().optional(),
})

export const CreateTourScheduleSchema = z
  .object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    availableSeats: z.number().int().min(1).optional(),
    priceOverride: z.number().optional(),
    status: TourScheduleStatusSchema.optional(),
  })
  .refine(
    (d) => new Date(d.endDate) > new Date(d.startDate),
    'endDate must be after startDate',
  )

export const UpdateTourScheduleSchema = z
  .object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    availableSeats: z.number().int().min(1).optional(),
    priceOverride: z.number().optional(),
    status: z
      .union([TourScheduleStatusSchema, z.string().max(64)])
      .optional(),
  })
  .refine(
    (d) => {
      if (d.startDate != null && d.endDate != null) {
        return new Date(d.endDate) > new Date(d.startDate)
      }
      return true
    },
    { message: 'endDate must be after startDate', path: ['endDate'] },
  )

/** ========================= Enums ========================= */

/** Dòng tour — khớp enum Prisma */
export const TourLineSchema = z.enum(['PREMIUM', 'STANDARD', 'ECONOMY', 'GOOD_VALUE'])

/** Phương tiện chính — khớp enum Prisma */
export const TransportTypeSchema = z.enum(['BUS', 'FLIGHT', 'MIXED'])

/** Loại nhà cung cấp */
export const SupplierTypeSchema = z.enum([
  'TRANSPORT',
  'HOTEL',
  'RESTAURANT',
  'GUIDE',
  'ACTIVITY',
])

/** Loại phương tiện cụ thể */
export const VehicleTypeSchema = z.enum([
  'CAR_4',
  'CAR_7',
  'BUS_16',
  'BUS_29',
  'BUS_45',
  'FLIGHT',
  'TRAIN',
  'BOAT',
  'CABLE_CAR',
])

/** Bữa ăn */
export const MealTypeSchema = z.enum(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'])

/** Ngân sách (lọc theo basePrice, đơn vị VND) */
export const TourBudgetFilterSchema = z.enum([
  'under_5m',
  '5_10m',
  '10_20m',
  'over_20m',
])

/** ========================= Supplier ========================= */

export const SupplierResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: SupplierTypeSchema,
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  taxCode: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  isActive: z.boolean(),
  createdAtUtc: z.string().nullable().optional(),
})

export const SupplierListPaginatedResponseSchema = z.object({
  items: z.array(SupplierResponseSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
})

export const CreateSupplierSchema = z.object({
  name: z.string().min(1),
  type: SupplierTypeSchema,
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  website: z.string().optional(),
  taxCode: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional().default(true),
})

export const UpdateSupplierSchema = CreateSupplierSchema.partial()

export const SupplierBriefSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: SupplierTypeSchema,
  phone: z.string().nullable().optional(),
})

/** ========================= TourTransport ========================= */

export const TourTransportResponseSchema = z.object({
  id: z.number(),
  tourId: z.number(),
  supplierId: z.number().nullable().optional(),
  supplier: SupplierBriefSchema.nullable().optional(),
  legOrder: z.number(),
  vehicleType: VehicleTypeSchema,
  vehicleDetail: z.string().nullable().optional(),
  seatClass: z.string().nullable().optional(),
  departurePoint: z.string(),
  arrivalPoint: z.string(),
  estimatedHours: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export const CreateTourTransportSchema = z.object({
  supplierId: z.number().int().optional(),
  legOrder: z.number().int().min(1),
  vehicleType: VehicleTypeSchema,
  vehicleDetail: z.string().optional(),
  seatClass: z.string().optional(),
  departurePoint: z.string().min(1),
  arrivalPoint: z.string().min(1),
  estimatedHours: z.number().optional(),
  notes: z.string().optional(),
})

export const UpdateTourTransportSchema = CreateTourTransportSchema.partial()

/** ========================= TourAccommodation ========================= */

export const TourAccommodationResponseSchema = z.object({
  id: z.number(),
  itineraryId: z.number(),
  supplierId: z.number().nullable().optional(),
  supplier: SupplierBriefSchema.nullable().optional(),
  hotelName: z.string(),
  starRating: z.number().nullable().optional(),
  roomType: z.string().nullable().optional(),
  checkInNote: z.string().nullable().optional(),
  checkOutNote: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  mapUrl: z.string().nullable().optional(),
})

export const CreateTourAccommodationSchema = z.object({
  supplierId: z.number().int().optional(),
  hotelName: z.string().min(1),
  starRating: z.number().int().min(1).max(5).optional(),
  roomType: z.string().optional(),
  checkInNote: z.string().optional(),
  checkOutNote: z.string().optional(),
  address: z.string().optional(),
  mapUrl: z.string().optional(),
})

export const UpdateTourAccommodationSchema = CreateTourAccommodationSchema.partial()

/** ========================= TourMeal ========================= */

export const TourMealResponseSchema = z.object({
  id: z.number(),
  itineraryId: z.number(),
  supplierId: z.number().nullable().optional(),
  supplier: SupplierBriefSchema.nullable().optional(),
  mealType: MealTypeSchema,
  restaurantName: z.string().nullable().optional(),
  menuStyle: z.string().nullable().optional(),
  dietaryNotes: z.string().nullable().optional(),
})

export const CreateTourMealSchema = z.object({
  supplierId: z.number().int().optional(),
  mealType: MealTypeSchema,
  restaurantName: z.string().optional(),
  menuStyle: z.string().optional(),
  dietaryNotes: z.string().optional(),
})

export const UpdateTourMealSchema = CreateTourMealSchema.partial()

/** ========================= Itinerary ========================= */

export const TourItineraryResponseSchema = z.object({
  id: z.number(),
  tourId: z.number(),
  dayNumber: z.number(),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  accommodations: z.array(TourAccommodationResponseSchema).optional(),
  meals: z.array(TourMealResponseSchema).optional(),
})

export const CreateTourItinerarySchema = z.object({
  dayNumber: z.number().int().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
})

export const UpdateTourItinerarySchema = CreateTourItinerarySchema.partial()

/** ========================= Tour ========================= */

const LocationBriefSchema = z.object({
  id: z.number(),
  name: z.string().nullable().optional(),
})

export const TourListItemSchema = z.object({
  id: z.number(),
  departureLocationId: z.number(),
  destinationLocationId: z.number(),
  name: z.string(),
  slug: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  durationDays: z.number().nullable().optional(),
  basePrice: z.number().nullable().optional(),
  maxPeople: z.number().nullable().optional(),
  thumbnailUrl: z.string().nullable().optional(),
  ratingAvg: z.number().nullable().optional(),
  totalReviews: z.number().nullable().optional(),
  tourLine: TourLineSchema.nullable().optional(),
  transportType: TransportTypeSchema.nullable().optional(),
  isActive: z.boolean().nullable().optional(),
  isFeatured: z.boolean().nullable().optional(),
  createdAtUtc: z.string().nullable().optional(),
  departureLocation: LocationBriefSchema.optional(),
  destinationLocation: LocationBriefSchema.optional(),
  /** Nhãn danh mục (TourTag) gắn tour — có trong response list khi API include */
  tags: z
    .array(
      TourTagResponseSchema.omit({ tourCount: true }),
    )
    .optional(),
})

export const TourDetailResponseSchema = z.object({
  id: z.number(),
  departureLocationId: z.number(),
  destinationLocationId: z.number(),
  name: z.string(),
  slug: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  durationDays: z.number().nullable().optional(),
  basePrice: z.number().nullable().optional(),
  maxPeople: z.number().nullable().optional(),
  thumbnailUrl: z.string().nullable().optional(),
  ratingAvg: z.number().nullable().optional(),
  totalReviews: z.number().nullable().optional(),
  tourLine: TourLineSchema.nullable().optional(),
  transportType: TransportTypeSchema.nullable().optional(),
  isActive: z.boolean().nullable().optional(),
  isFeatured: z.boolean().nullable().optional(),
  createdAtUtc: z.string().nullable().optional(),
  inclusions: z.string().nullable().optional(),
  exclusions: z.string().nullable().optional(),
  cancellationPolicy: z.string().nullable().optional(),
  /** Phụ thu phòng đơn (VND / suất) */
  singleRoomSupplement: z.number().nullable().optional(),
  departureLocation: LocationBriefSchema.optional(),
  destinationLocation: LocationBriefSchema.optional(),
  images: z.array(TourImageResponseSchema),
  videos: z.array(TourVideoResponseSchema),
  schedules: z.array(TourScheduleResponseSchema),
  itineraries: z.array(TourItineraryResponseSchema),
  tags: z.array(TourTagResponseSchema),
  transports: z.array(TourTransportResponseSchema),
})

export const CreateTourSchema = z
  .object({
    departureLocationId: z.number().int(),
    destinationLocationId: z.number().int(),
    name: z.string().min(1),
    slug: z.string().optional(),
    description: z.string().optional(),
    durationDays: z.number().int().optional(),
    basePrice: z.number().optional(),
    maxPeople: z.number().int().optional(),
    thumbnailUrl: z.string().optional(),
    tourLine: TourLineSchema.optional(),
    transportType: TransportTypeSchema.optional(),
    isActive: z.boolean().optional().default(true),
    isFeatured: z.boolean().optional().default(false),
    inclusions: z.string().optional(),
    exclusions: z.string().optional(),
    cancellationPolicy: z.string().optional(),
    tagIds: z.array(z.number().int()).optional(),
    images: z.array(CreateTourImageSchema).optional(),
    videos: z.array(CreateTourVideoSchema).optional(),
    schedules: z.array(CreateTourScheduleSchema).optional(),
    itineraries: z.array(CreateTourItinerarySchema).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.durationDays != null && data.durationDays < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'durationDays must be >= 1',
        path: ['durationDays'],
      })
    }
    if (data.basePrice != null && data.basePrice <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'basePrice must be > 0',
        path: ['basePrice'],
      })
    }
    if (data.maxPeople != null && data.maxPeople < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'maxPeople must be >= 1',
        path: ['maxPeople'],
      })
    }
    const slug = data.slug?.trim()
    if (slug) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid slug format',
          path: ['slug'],
        })
      }
    }
    const thumb = data.thumbnailUrl?.trim()
    if (thumb) {
      try {
        void new URL(thumb)
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid thumbnail URL',
          path: ['thumbnailUrl'],
        })
      }
    }
  })

export const UpdateTourSchema = z
  .object({
    departureLocationId: z.number().int().optional(),
    destinationLocationId: z.number().int().optional(),
    name: z.string().min(1).optional(),
    slug: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    durationDays: z.number().int().nullable().optional(),
    basePrice: z.number().nullable().optional(),
    maxPeople: z.number().int().nullable().optional(),
    thumbnailUrl: z.string().nullable().optional(),
    tourLine: TourLineSchema.nullable().optional(),
    transportType: TransportTypeSchema.nullable().optional(),
    isActive: z.boolean().nullable().optional(),
    isFeatured: z.boolean().nullable().optional(),
    inclusions: z.string().nullable().optional(),
    exclusions: z.string().nullable().optional(),
    cancellationPolicy: z.string().nullable().optional(),
    tagIds: z.array(z.number().int()).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.basePrice != null && data.basePrice <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'basePrice must be > 0',
        path: ['basePrice'],
      })
    }
  })

export const SetTourTagsSchema = z.object({
  tagIds: z.array(z.number().int()),
})

export const TourListQuerySchema = z.object({
  departureLocationId: z.coerce.number().int().optional(),
  destinationLocationId: z.coerce.number().int().optional(),
  /** query: `true` | `false` */
  isActive: z.enum(['true', 'false']).optional(),
  q: z.string().optional(),
  /** Ngân sách: dưới 5tr / 5–10tr / 10–20tr / trên 20tr (theo basePrice) */
  budget: TourBudgetFilterSchema.optional(),
  /** Ngày khởi hành (YYYY-MM-DD) — tour có ít nhất một TourSchedule trùng ngày */
  departureDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  tourLine: TourLineSchema.optional(),
  transportType: TransportTypeSchema.optional(),
  /**
   * Lọc theo danh mục (TourTag): có mapping HOẶC khớp Dòng tour nếu tên tag trùng
   * Cao cấp / Tiêu chuẩn / … (xem catalog-tag-tour-line backend).
   */
  tagId: z.coerce.number().int().optional(),
  /** Chỉ lấy tour gắn cờ nổi bật (Tour nổi bật) */
  featured: z.enum(['true', 'false']).optional(),
  /** Phân trang — khi gửi `page` hoặc `pageSize`, API trả về `{ items, total, page, pageSize }` thay vì mảng */
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
})

/** Trả về khi GET /tours có tham số phân trang */
export const TourListPaginatedResponseSchema = z.object({
  items: z.array(TourListItemSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
})

/** ========================= Reviews ========================= */
export const TourRatingSchema = z.coerce
  .number()
  .int()
  .min(1)
  .max(5)

export const CreateOrUpdateTourReviewSchema = z.object({
  rating: TourRatingSchema,
  comment: z.string().max(1000).optional().nullable(),
})

export const TourReviewUserSchema = z.object({
  id: z.number(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
})

export const TourReviewResponseSchema = z.object({
  id: z.number(),
  tourId: z.number(),
  userId: z.number(),
  rating: z.number().int(),
  comment: z.string().nullable().optional(),
  createdAtUtc: z.string().nullable().optional(),
  user: TourReviewUserSchema,
})

export const TourRatingSummarySchema = z.object({
  ratingAvg: z.number().nullable(),
  totalReviews: z.number().nullable(),
})

export const UpsertTourReviewResponseSchema = z.object({
  review: TourReviewResponseSchema,
  tour: TourRatingSummarySchema,
})
