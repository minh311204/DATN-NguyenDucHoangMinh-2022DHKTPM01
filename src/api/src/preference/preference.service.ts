import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prima.service'

type UpsertPreferenceInput = {
  preferredLocations?: string | null
  budgetRange?: string | null
  travelStyle?: string | null
}

function mapTour(t: any) {
  return {
    id: t.id,
    departureLocationId: t.departureLocationId,
    destinationLocationId: t.destinationLocationId,
    name: t.name,
    slug: t.slug ?? null,
    description: t.description ?? null,
    durationDays: t.durationDays ?? null,
    basePrice: t.basePrice ? Number(t.basePrice) : null,
    maxPeople: t.maxPeople ?? null,
    thumbnailUrl: t.thumbnailUrl ?? null,
    ratingAvg: t.ratingAvg ?? null,
    totalReviews: t.totalReviews ?? null,
    tourLine: t.tourLine ?? null,
    transportType: t.transportType ?? null,
    isActive: t.isActive ?? null,
    createdAtUtc: t.createdAtUtc ? t.createdAtUtc.toISOString() : null,
    departureLocation: t.departureLocation ?? undefined,
    destinationLocation: t.destinationLocation ?? undefined,
  }
}

const tourSelect = {
  id: true,
  departureLocationId: true,
  destinationLocationId: true,
  name: true,
  slug: true,
  description: true,
  durationDays: true,
  basePrice: true,
  maxPeople: true,
  thumbnailUrl: true,
  ratingAvg: true,
  totalReviews: true,
  tourLine: true,
  transportType: true,
  isActive: true,
  createdAtUtc: true,
  departureLocation: { select: { id: true, name: true } },
  destinationLocation: { select: { id: true, name: true } },
}

@Injectable()
export class PreferenceService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyPreference(userId: number) {
    const pref = await this.prisma.userPreference.findUnique({
      where: { userId },
    })
    if (!pref) return null
    return {
      id: pref.id,
      userId: pref.userId,
      preferredLocations: pref.preferredLocations ?? null,
      budgetRange: pref.budgetRange ?? null,
      travelStyle: pref.travelStyle ?? null,
    }
  }

  async upsertMyPreference(userId: number, data: UpsertPreferenceInput) {
    /**
     * Quy ước cập nhật từng phần:
     *  - key vắng mặt trong body  → giữ nguyên (Prisma: undefined)
     *  - key có giá trị null      → xoá (set NULL)
     *  - key có giá trị chuỗi     → ghi đè
     * Tránh `?? undefined` vì sẽ làm sập case "người dùng muốn xoá lựa chọn".
     */
    const pref = await this.prisma.userPreference.upsert({
      where: { userId },
      update: {
        preferredLocations: data.preferredLocations,
        budgetRange: data.budgetRange,
        travelStyle: data.travelStyle,
      },
      create: {
        userId,
        preferredLocations: data.preferredLocations ?? null,
        budgetRange: data.budgetRange ?? null,
        travelStyle: data.travelStyle ?? null,
      },
    })
    return {
      id: pref.id,
      userId: pref.userId,
      preferredLocations: pref.preferredLocations ?? null,
      budgetRange: pref.budgetRange ?? null,
      travelStyle: pref.travelStyle ?? null,
    }
  }

  async trackBehavior(userId: number, tourId: number, action: string) {
    const tour = await this.prisma.tour.findUnique({
      where: { id: tourId },
      select: { id: true },
    })
    if (!tour) throw new NotFoundException('Tour not found')

    const behavior = await this.prisma.userBehavior.create({
      data: { userId, tourId, action },
    })
    return {
      id: behavior.id,
      userId: behavior.userId,
      tourId: behavior.tourId,
      action: behavior.action,
      createdAtUtc: behavior.createdAtUtc
        ? behavior.createdAtUtc.toISOString()
        : null,
    }
  }

  async getMyBehaviors(
    userId: number,
    opts: { action?: string; limit?: number },
  ) {
    const rows = await this.prisma.userBehavior.findMany({
      where: {
        userId,
        ...(opts.action ? { action: opts.action } : {}),
      },
      orderBy: { createdAtUtc: 'desc' },
      take: opts.limit ?? 50,
    })
    return rows.map((b) => ({
      id: b.id,
      userId: b.userId,
      tourId: b.tourId,
      action: b.action,
      createdAtUtc: b.createdAtUtc ? b.createdAtUtc.toISOString() : null,
    }))
  }

  /**
   * Gợi ý tour theo nhiều tầng, ưu tiên giảm dần:
   *   T1. Khớp sở thích đã lưu (locations + style + budget)
   *   T2. Tương tự tour đã xem/yêu thích/đặt (destination, tourLine)
   *   T3. Tour hot (rating + reviews)
   * Budget (nếu user đã đặt) luôn là filter cứng ở mọi tầng — người dùng nói
   *   "dưới 5 triệu" thì không gợi ý tour 50 triệu.
   *
   * Lưu ý: ngoài UserBehavior, ta cũng đọc trực tiếp bảng Booking để cover
   * những booking cũ trước khi feature tracking 'book' được triển khai, và
   * để không phụ thuộc vào việc fire-and-forget tracking có chạy hay không.
   * Tour đã đặt (bất kỳ trạng thái nào không phải CANCELLED) được coi là tín
   * hiệu mạnh hơn 'view' — vừa loại khỏi gợi ý vừa dùng làm seed cho T2.
   */
  async getRecommendations(userId: number, limit = 10) {
    const [pref, behaviors, bookedScheduleRows] = await Promise.all([
      this.prisma.userPreference.findUnique({ where: { userId } }),
      this.prisma.userBehavior.findMany({
        where: { userId, action: { in: ['view', 'wishlist', 'book'] } },
        orderBy: { createdAtUtc: 'desc' },
        take: 30,
        select: { tourId: true },
      }),
      this.prisma.booking.findMany({
        where: { userId, status: { not: 'CANCELLED' } },
        orderBy: { bookingDateUtc: 'desc' },
        take: 30,
        select: { schedule: { select: { tourId: true } } },
      }),
    ])

    const bookedTourIds = bookedScheduleRows
      .map((b) => b.schedule?.tourId)
      .filter((id): id is number => typeof id === 'number')

    const interactedTourIds = [
      ...new Set<number>([
        ...behaviors.map((b) => b.tourId),
        ...bookedTourIds,
      ]),
    ]
    const budgetWhere = budgetRangeToWhere(pref?.budgetRange ?? null)
    const collected = new Map<number, any>()

    const baseWhere = (extraExclude: number[] = []) => ({
      isActive: true,
      ...(interactedTourIds.length || extraExclude.length
        ? { id: { notIn: [...interactedTourIds, ...extraExclude] } }
        : {}),
      ...(budgetWhere ?? {}),
    })

    const push = (rows: any[]) => {
      for (const r of rows) {
        if (!collected.has(r.id)) collected.set(r.id, r)
        if (collected.size >= limit) break
      }
    }

    // T1. Sở thích đã lưu
    const prefSoftWhere = buildPreferenceSoftWhere(pref)
    if (prefSoftWhere) {
      const tier1 = await this.prisma.tour.findMany({
        where: { ...baseWhere(), ...prefSoftWhere },
        orderBy: [{ ratingAvg: 'desc' }, { totalReviews: 'desc' }],
        take: limit,
        select: tourSelect,
      })
      push(tier1)
    }

    // T2. Tương tự hành vi
    if (collected.size < limit && interactedTourIds.length > 0) {
      const interactedTours = await this.prisma.tour.findMany({
        where: { id: { in: interactedTourIds } },
        select: { destinationLocationId: true, tourLine: true },
      })
      const destIds = [
        ...new Set(interactedTours.map((t) => t.destinationLocationId)),
      ]
      const tourLines = [
        ...new Set(interactedTours.map((t) => t.tourLine).filter(Boolean)),
      ] as string[]

      const behaviorOr: any[] = []
      if (destIds.length) behaviorOr.push({ destinationLocationId: { in: destIds } })
      if (tourLines.length) behaviorOr.push({ tourLine: { in: tourLines as any } })

      if (behaviorOr.length > 0) {
        const tier2 = await this.prisma.tour.findMany({
          where: { ...baseWhere([...collected.keys()]), OR: behaviorOr },
          orderBy: [{ ratingAvg: 'desc' }, { totalReviews: 'desc' }],
          take: limit - collected.size,
          select: tourSelect,
        })
        push(tier2)
      }
    }

    // T3. Hot tours (vẫn tôn trọng budget nếu user đặt)
    if (collected.size < limit) {
      const tier3 = await this.prisma.tour.findMany({
        where: baseWhere([...collected.keys()]),
        orderBy: [{ ratingAvg: 'desc' }, { totalReviews: 'desc' }],
        take: limit - collected.size,
        select: tourSelect,
      })
      push(tier3)
    }

    // Fallback cuối: nếu budget quá hẹp khiến rỗng, bỏ ràng buộc budget
    if (collected.size === 0 && budgetWhere) {
      const fallback = await this.prisma.tour.findMany({
        where: { isActive: true },
        orderBy: [{ ratingAvg: 'desc' }, { totalReviews: 'desc' }],
        take: limit,
        select: tourSelect,
      })
      push(fallback)
    }

    return Array.from(collected.values()).slice(0, limit).map(mapTour)
  }
}

/**
 * Map `budgetRange` của user (under_5m / 5_10m / 10_20m / over_20m) thành
 * điều kiện Prisma trên `basePrice`. Đơn vị: VND. Khớp convention của
 * `tour.service.ts` để gợi ý và tìm kiếm dùng cùng ngưỡng (5tr / 10tr / 20tr).
 */
function budgetRangeToWhere(
  budgetRange: string | null,
): { basePrice: { gte?: number; lt?: number } } | null {
  if (!budgetRange) return null
  const m = 1_000_000
  const map: Record<string, { gte?: number; lt?: number }> = {
    under_5m: { lt: 5 * m },
    '5_10m': { gte: 5 * m, lt: 10 * m },
    '10_20m': { gte: 10 * m, lt: 20 * m },
    over_20m: { gte: 20 * m },
  }
  const range = map[budgetRange]
  return range ? { basePrice: range } : null
}

/**
 * Soft-match cho gợi ý tầng 1: kết hợp OR giữa style → tourLine và
 * preferredLocations → tên điểm đến. Budget được xử lý ở tầng wrap base
 * (luôn áp dụng) nên không cộng vào đây.
 *
 * Style → TourLine (mềm, mapping nhiều khả năng):
 *   luxury     → PREMIUM
 *   budget     → ECONOMY, GOOD_VALUE
 *   family     → STANDARD, PREMIUM
 *   cultural   → STANDARD, PREMIUM
 *   relaxation → PREMIUM, STANDARD
 *   adventure  → STANDARD, ECONOMY
 */
function buildPreferenceSoftWhere(
  pref: {
    travelStyle?: string | null
    preferredLocations?: string | null
  } | null,
): { OR: any[] } | null {
  if (!pref) return null
  const or: any[] = []

  if (pref.travelStyle) {
    const styleMap: Record<string, string[]> = {
      luxury: ['PREMIUM'],
      budget: ['ECONOMY', 'GOOD_VALUE'],
      family: ['STANDARD', 'PREMIUM'],
      cultural: ['STANDARD', 'PREMIUM'],
      relaxation: ['PREMIUM', 'STANDARD'],
      adventure: ['STANDARD', 'ECONOMY'],
    }
    const lines = styleMap[pref.travelStyle]
    if (lines?.length) or.push({ tourLine: { in: lines as any } })
  }

  if (pref.preferredLocations) {
    const locs = pref.preferredLocations
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10)
    if (locs.length) {
      or.push({
        destinationLocation: {
          OR: locs.map((name) => ({ name: { contains: name } })),
        },
      })
    }
  }

  return or.length > 0 ? { OR: or } : null
}
