import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prima.service'
import { TourTagService } from './tour-tag.service'
import { catalogTagTourWhereClause } from './catalog-tag-tour-line'
import {
  CreateTourSchema,
  TourListQuerySchema,
  UpdateTourSchema,
  CreateTourTransportSchema,
  UpdateTourTransportSchema,
  CreateTourAccommodationSchema,
  UpdateTourAccommodationSchema,
  CreateTourMealSchema,
  UpdateTourMealSchema,
} from '../../../shared/schema/tour.schema'
import type { z } from 'zod'

type CreateTourInput = z.infer<typeof CreateTourSchema>
type UpdateTourInput = z.infer<typeof UpdateTourSchema>
type TourListQuery = z.infer<typeof TourListQuerySchema>
type CreateTourTransportInput = z.infer<typeof CreateTourTransportSchema>
type UpdateTourTransportInput = z.infer<typeof UpdateTourTransportSchema>
type CreateTourAccommodationInput = z.infer<typeof CreateTourAccommodationSchema>
type UpdateTourAccommodationInput = z.infer<typeof UpdateTourAccommodationSchema>
type CreateTourMealInput = z.infer<typeof CreateTourMealSchema>
type UpdateTourMealInput = z.infer<typeof UpdateTourMealSchema>

function num(d: unknown): number | null {
  if (d == null) return null
  return Number(d)
}

function iso(d: Date | null | undefined): string | null {
  if (d == null) return null
  return d.toISOString()
}

/** Đọc deletedAt khi kiểu Prisma có thể chưa sync sau migrate/generate */
function scheduleDeletedAtIso(s: {
  id: number
  deletedAt?: Date | null
}): string | null {
  const d = s.deletedAt
  return d ? d.toISOString() : null
}

function validateSchedulePayload(
  startDate: Date,
  endDate: Date,
  availableSeats?: number | null,
  bookedSeats?: number | null,
) {
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new BadRequestException('Invalid schedule date')
  }
  if (endDate <= startDate) {
    throw new BadRequestException('Schedule endDate must be after startDate')
  }
  if (
    availableSeats != null &&
    bookedSeats != null &&
    bookedSeats > availableSeats
  ) {
    throw new BadRequestException(
      'Schedule bookedSeats cannot exceed availableSeats',
    )
  }
}

/** Lọc ngân sách theo basePrice (VND) — khớp UI: dưới 5tr / 5–10tr / … */
function budgetWhere(
  budget: z.infer<typeof TourListQuerySchema>['budget'],
): Prisma.TourWhereInput {
  if (!budget) return {}
  const m = 1_000_000
  switch (budget) {
    case 'under_5m':
      return { basePrice: { lt: 5 * m } }
    case '5_10m':
      return { basePrice: { gte: 5 * m, lt: 10 * m } }
    case '10_20m':
      return { basePrice: { gte: 10 * m, lt: 20 * m } }
    case 'over_20m':
      return { basePrice: { gte: 20 * m } }
    default:
      return {}
  }
}

@Injectable()
export class TourService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tourTagService: TourTagService,
  ) {}

  // ---------- Tours (list & detail) ----------

  async getTours(
    rawQuery: unknown,
    opts?: { canQueryInactive?: boolean },
  ) {
    await this.softArchiveAllFullyCompletedTours()
    const query = TourListQuerySchema.parse(rawQuery)
    /**
     * Công khai: luôn chỉ tour đang mở (`isActive === true`), bất kể query — tránh `?isActive=false`.
     * ADMIN (JWT): được lọc theo `isActive` true/false cho trang quản lý.
     */
    const isActive =
      opts?.canQueryInactive === true
        ? query.isActive === 'true'
          ? true
          : query.isActive === 'false'
            ? false
            : true
        : true

    let catalogTagFilter: Prisma.TourWhereInput | undefined
    if (query.tagId != null) {
      const tag = await this.prisma.tourTag.findUnique({
        where: { id: query.tagId },
        select: { name: true },
      })
      catalogTagFilter = tag
        ? catalogTagTourWhereClause(query.tagId, tag.name)
        : { tags: { some: { tagId: query.tagId } } }
    }

    let departureScheduleFilter: Prisma.TourWhereInput | undefined
    if (query.departureDate) {
      const start = new Date(`${query.departureDate}T00:00:00.000Z`)
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
      const departureSchedulesSome = {
        startDate: { gte: start, lt: end },
        status: { not: 'CANCELLED' as const },
        deletedAt: null,
      }
      departureScheduleFilter = {
        schedules: {
          some: departureSchedulesSome,
        },
      }
    }

    const where: Prisma.TourWhereInput = {
      ...(query.departureLocationId != null
        ? { departureLocationId: query.departureLocationId }
        : {}),
      ...(query.destinationLocationId != null
        ? { destinationLocationId: query.destinationLocationId }
        : {}),
      isActive,
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q } },
              { description: { contains: query.q } },
              { departureLocation: { name: { contains: query.q } } },
              { destinationLocation: { name: { contains: query.q } } },
            ],
          }
        : {}),
      ...budgetWhere(query.budget),
      ...(query.tourLine ? { tourLine: query.tourLine } : {}),
      ...(query.transportType ? { transportType: query.transportType } : {}),
      ...(query.featured === 'true' ? { isFeatured: true } : {}),
      ...(catalogTagFilter ?? {}),
      ...(departureScheduleFilter ?? {}),
    }

    const listInclude = {
      departureLocation: { select: { id: true, name: true } },
      destinationLocation: { select: { id: true, name: true } },
      schedules: {
        where: this.scheduleWhereVisibleToUser(),
        orderBy: { startDate: 'asc' as const },
      },
      tags: {
        select: {
          tag: { select: { id: true, name: true, description: true } },
        },
      },
    } satisfies Prisma.TourInclude

    const paginate = query.page != null || query.pageSize != null

    if (paginate) {
      const page = query.page ?? 1
      const pageSize = query.pageSize ?? 12
      const [total, rows] = await Promise.all([
        this.prisma.tour.count({ where }),
        this.prisma.tour.findMany({
          where,
          include: listInclude,
          orderBy: [{ createdAtUtc: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ])
      return {
        items: rows.map((t) => this.mapTourListRow(t)),
        total,
        page,
        pageSize,
      }
    }

    const rows = await this.prisma.tour.findMany({
      where,
      include: listInclude,
      orderBy: [{ createdAtUtc: 'desc' }, { id: 'desc' }],
    })

    return rows.map((t) => this.mapTourListRow(t))
  }

  private mapTourListRow(t: {
    id: number
    departureLocationId: number
    destinationLocationId: number
    name: string
    slug: string | null
    description: string | null
    durationDays: number | null
    basePrice: unknown
    maxPeople: number | null
    thumbnailUrl: string | null
    ratingAvg: unknown
    totalReviews: number | null
    tourLine: string | null
    transportType: string | null
    isActive: boolean | null
    isFeatured: boolean | null
    createdAtUtc: Date | null
    departureLocation: { id: number; name: string | null } | null
    destinationLocation: { id: number; name: string | null } | null
    schedules: Array<{
      id: number
      startDate: Date
      priceOverride: unknown
      availableSeats: number | null
      bookedSeats: number | null
    }>
    tags?: Array<{
      tag: { id: number; name: string; description: string | null }
    }>
  }) {
    return {
      id: t.id,
      departureLocationId: t.departureLocationId,
      destinationLocationId: t.destinationLocationId,
      name: t.name,
      slug: t.slug,
      description: t.description,
      durationDays: t.durationDays,
      basePrice: num(t.basePrice),
      maxPeople: t.maxPeople,
      thumbnailUrl: t.thumbnailUrl,
      ratingAvg: t.ratingAvg,
      totalReviews: t.totalReviews,
      tourLine: t.tourLine,
      transportType: t.transportType,
      isActive: t.isActive,
      isFeatured: t.isFeatured ?? false,
      createdAtUtc: iso(t.createdAtUtc),
      departureLocation: t.departureLocation
        ? { id: t.departureLocation.id, name: t.departureLocation.name }
        : undefined,
      destinationLocation: t.destinationLocation
        ? { id: t.destinationLocation.id, name: t.destinationLocation.name }
        : undefined,
      tags:
        t.tags?.map((m) => ({
          id: m.tag.id,
          name: m.tag.name,
          description: m.tag.description,
        })) ?? undefined,
      schedules: t.schedules.map((s) => ({
        id: s.id,
        startDate: iso(s.startDate),
        priceOverride: num(s.priceOverride),
        remainingSeats:
          s.availableSeats != null && s.bookedSeats != null
            ? s.availableSeats - s.bookedSeats
            : null,
      })),
    }
  }

  /** Lịch còn hiển thị / đặt chỗ trên site user (chưa xóa mềm, không hủy). */
  private scheduleWhereVisibleToUser(): Prisma.TourScheduleWhereInput {
    const w = {
      deletedAt: null,
      NOT: { status: 'CANCELLED' as const },
    }
    return w
  }

  /**
   * Khi mọi lịch của tour (chưa xóa mềm) đều đã kết thúc → gán deletedAt (ẩn khỏi user).
   */
  private async softArchiveSchedulesIfTourFullyCompleted(tourId: number) {
    const now = new Date()
    const activeWhere = { tourId, deletedAt: null }
    const active = await this.prisma.tourSchedule.findMany({
      where: activeWhere,
      select: { endDate: true },
    })
    if (active.length === 0) return
    if (!active.every((s) => s.endDate < now)) return
    const archiveData = { deletedAt: now }
    await this.prisma.tourSchedule.updateMany({
      where: activeWhere,
      data: archiveData,
    })
  }

  /** Dùng trước danh sách tour: cập nhật hàng loạt các tour thỏa điều kiện. */
  private async softArchiveAllFullyCompletedTours() {
    const now = new Date()
    const rows = await this.prisma.$queryRaw<{ tourId: number }[]>(
      Prisma.sql`
        SELECT s.tourId FROM TourSchedule s
        WHERE s.deletedAt IS NULL
        GROUP BY s.tourId
        HAVING MAX(s.endDate) < ${now}
      `,
    )
    for (const row of rows) {
      const rowWhere = { tourId: row.tourId, deletedAt: null }
      const rowData = { deletedAt: now }
      await this.prisma.tourSchedule.updateMany({
        where: rowWhere,
        data: rowData,
      })
    }
  }

  private async loadTourDetail(
    id: number,
    opts?: { includeDeletedSchedules?: boolean },
  ) {
    await this.softArchiveSchedulesIfTourFullyCompleted(id)
    let scheduleWhere: Prisma.TourScheduleWhereInput | undefined
    if (opts?.includeDeletedSchedules) {
      scheduleWhere = undefined
    } else {
      const onlyVisible = { deletedAt: null } as Prisma.TourScheduleWhereInput
      scheduleWhere = onlyVisible
    }

    const t = await this.prisma.tour.findUnique({
      where: { id },
      include: {
        departureLocation: { select: { id: true, name: true } },
        destinationLocation: { select: { id: true, name: true } },
        images: { orderBy: { id: 'asc' } },
        videos: { orderBy: { id: 'asc' } },
        schedules: {
          ...(scheduleWhere != null ? { where: scheduleWhere } : {}),
          orderBy: { startDate: 'asc' },
        },
        itineraries: {
          orderBy: { dayNumber: 'asc' },
          include: {
            accommodations: {
              include: { supplier: { select: { id: true, name: true, type: true, phone: true } } },
              orderBy: { id: 'asc' },
            },
            meals: {
              include: { supplier: { select: { id: true, name: true, type: true, phone: true } } },
              orderBy: { id: 'asc' },
            },
          },
        },
        tags: { include: { tag: true } },
        transports: {
          include: { supplier: { select: { id: true, name: true, type: true, phone: true } } },
          orderBy: { legOrder: 'asc' },
        },
      },
    })
    if (!t) return null

    return {
      id: t.id,
      departureLocationId: t.departureLocationId,
      destinationLocationId: t.destinationLocationId,
      name: t.name,
      slug: t.slug,
      description: t.description,
      durationDays: t.durationDays,
      basePrice: num(t.basePrice),
      maxPeople: t.maxPeople,
      thumbnailUrl: t.thumbnailUrl,
      ratingAvg: t.ratingAvg,
      totalReviews: t.totalReviews,
      tourLine: t.tourLine,
      transportType: t.transportType,
      isActive: t.isActive,
      isFeatured: t.isFeatured ?? false,
      createdAtUtc: iso(t.createdAtUtc),
      singleRoomSupplement: num(t.singleRoomSupplement),
      inclusions: t.inclusions,
      exclusions: t.exclusions,
      cancellationPolicy: t.cancellationPolicy,
      departureLocation: t.departureLocation
        ? { id: t.departureLocation.id, name: t.departureLocation.name }
        : undefined,
      destinationLocation: t.destinationLocation
        ? { id: t.destinationLocation.id, name: t.destinationLocation.name }
        : undefined,
      images: t.images.map((i) => ({
        id: i.id,
        tourId: i.tourId,
        imageUrl: i.imageUrl,
        isThumbnail: i.isThumbnail,
      })),
      videos: t.videos.map((v) => ({
        id: v.id,
        tourId: v.tourId,
        videoUrl: v.videoUrl,
      })),
      schedules: t.schedules.map((s) => ({
        id: s.id,
        tourId: s.tourId,
        startDate: s.startDate.toISOString(),
        endDate: s.endDate.toISOString(),
        availableSeats: s.availableSeats,
        bookedSeats: s.bookedSeats,
        priceOverride: num(s.priceOverride),
        status: s.status,
        deletedAt: scheduleDeletedAtIso(s),
      })),
      itineraries: t.itineraries.map((it) => ({
        id: it.id,
        tourId: it.tourId,
        dayNumber: it.dayNumber,
        title: it.title,
        description: it.description,
        accommodations: it.accommodations.map((a) => ({
          id: a.id,
          itineraryId: a.itineraryId,
          supplierId: a.supplierId,
          supplier: a.supplier,
          hotelName: a.hotelName,
          starRating: a.starRating,
          roomType: a.roomType,
          checkInNote: a.checkInNote,
          checkOutNote: a.checkOutNote,
          address: a.address,
          mapUrl: a.mapUrl,
        })),
        meals: it.meals.map((m) => ({
          id: m.id,
          itineraryId: m.itineraryId,
          supplierId: m.supplierId,
          supplier: m.supplier,
          mealType: m.mealType,
          restaurantName: m.restaurantName,
          menuStyle: m.menuStyle,
          dietaryNotes: m.dietaryNotes,
        })),
      })),
      tags: t.tags.map((m) => ({
        id: m.tag.id,
        name: m.tag.name,
        description: m.tag.description ?? null,
      })),
      transports: t.transports.map((tr) => ({
        id: tr.id,
        tourId: tr.tourId,
        supplierId: tr.supplierId,
        supplier: tr.supplier,
        legOrder: tr.legOrder,
        vehicleType: tr.vehicleType,
        vehicleDetail: tr.vehicleDetail,
        seatClass: tr.seatClass,
        departurePoint: tr.departurePoint,
        arrivalPoint: tr.arrivalPoint,
        estimatedHours: num(tr.estimatedHours),
        notes: tr.notes,
      })),
    }
  }

  /**
   * Chi tiết tour.
   * Khách (site User): chỉ `isActive === true`. ADMIN (JWT): có thể xem cả tour đã tắt.
   */
  async getTourById(id: number, opts?: { allowInactive?: boolean }) {
    const detail = await this.loadTourDetail(id, {
      includeDeletedSchedules: opts?.allowInactive === true,
    })
    if (!detail) throw new NotFoundException('Tour not found')
    const allowInactive = opts?.allowInactive === true
    if (!allowInactive && detail.isActive !== true) {
      throw new NotFoundException('Tour not found')
    }
    return detail
  }

  async createTour(body: CreateTourInput) {
    const [depLoc, destLoc] = await Promise.all([
      this.prisma.location.findUnique({ where: { id: body.departureLocationId } }),
      this.prisma.location.findUnique({ where: { id: body.destinationLocationId } }),
    ])
    if (!depLoc || !destLoc) throw new NotFoundException('Location not found')

    if (body.tagIds?.length) {
      await this.tourTagService.assertTagsExist(body.tagIds)
    }

    body.schedules?.forEach((s) => {
      validateSchedulePayload(
        new Date(s.startDate),
        new Date(s.endDate),
        s.availableSeats,
        0,
      )
    })

    const created = await this.prisma.$transaction(async (tx) => {
      const tour = await tx.tour.create({
        data: {
          departureLocationId: body.departureLocationId,
          destinationLocationId: body.destinationLocationId,
          name: body.name,
          slug: body.slug,
          description: body.description,
          durationDays: body.durationDays,
          basePrice: body.basePrice,
          maxPeople: body.maxPeople,
          thumbnailUrl: body.thumbnailUrl || undefined,
          tourLine: body.tourLine,
          transportType: body.transportType,
          isActive: body.isActive ?? true,
          isFeatured: body.isFeatured ?? false,
          inclusions: body.inclusions,
          exclusions: body.exclusions,
          cancellationPolicy: body.cancellationPolicy,
          images: body.images?.length
            ? {
                create: body.images.map((im) => ({
                  imageUrl: im.imageUrl,
                  isThumbnail: im.isThumbnail ?? false,
                })),
              }
            : undefined,
          videos: body.videos?.length
            ? {
                create: body.videos.map((v) => ({ videoUrl: v.videoUrl })),
              }
            : undefined,
          schedules: body.schedules?.length
            ? {
                create: body.schedules.map((s) => ({
                  startDate: new Date(s.startDate),
                  endDate: new Date(s.endDate),
                  availableSeats: s.availableSeats,
                  bookedSeats: 0,
                  priceOverride: s.priceOverride,
                  status: s.status,
                })),
              }
            : undefined,
          itineraries: body.itineraries?.length
            ? {
                create: body.itineraries.map((it) => ({
                  dayNumber: it.dayNumber,
                  title: it.title,
                  description: it.description,
                })),
              }
            : undefined,
          tags: body.tagIds?.length
            ? {
                create: body.tagIds.map((tagId) => ({ tagId })),
              }
            : undefined,
        },
      })
      return tour.id
    })

    const detail = await this.loadTourDetail(created)
    if (!detail) throw new NotFoundException('Tour not found after create')
    return detail
  }

  async updateTour(id: number, body: UpdateTourInput) {
    const existing = await this.prisma.tour.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException('Tour not found')

    if (body.departureLocationId != null) {
      const l = await this.prisma.location.findUnique({
        where: { id: body.departureLocationId },
      })
      if (!l) throw new NotFoundException('Departure location not found')
    }
    if (body.destinationLocationId != null) {
      const l = await this.prisma.location.findUnique({
        where: { id: body.destinationLocationId },
      })
      if (!l) throw new NotFoundException('Destination location not found')
    }
    if (body.tagIds) {
      await this.tourTagService.assertTagsExist(body.tagIds)
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.tour.update({
        where: { id },
        data: {
          departureLocationId: body.departureLocationId,
          destinationLocationId: body.destinationLocationId,
          name: body.name,
          slug: body.slug,
          description: body.description,
          durationDays: body.durationDays,
          basePrice: body.basePrice,
          maxPeople: body.maxPeople,
          thumbnailUrl: body.thumbnailUrl,
          tourLine: body.tourLine,
          transportType: body.transportType,
          isActive: body.isActive,
          isFeatured: body.isFeatured ?? undefined,
          inclusions: body.inclusions,
          exclusions: body.exclusions,
          cancellationPolicy: body.cancellationPolicy,
        },
      })

      if (body.tagIds) {
        await tx.tourTagMapping.deleteMany({ where: { tourId: id } })
        if (body.tagIds.length) {
          await tx.tourTagMapping.createMany({
            data: body.tagIds.map((tagId) => ({ tourId: id, tagId })),
          })
        }
      }
    })

    return this.getTourById(id, { allowInactive: true })
  }

  async deleteTour(id: number) {
    const existing = await this.prisma.tour.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException('Tour not found')

    const scheduleCount = await this.prisma.tourSchedule.count({ where: { tourId: id } })
    if (scheduleCount > 0) {
      throw new BadRequestException('Tour đã có lịch khởi hành, không thể xóa')
    }

    await this.prisma.tour.delete({ where: { id } })
    return { message: 'Tour deleted' }
  }

  async setTourTags(tourId: number, tagIds: number[]) {
    await this.getTourById(tourId, { allowInactive: true })
    await this.tourTagService.assertTagsExist(tagIds)

    await this.prisma.$transaction(async (tx) => {
      await tx.tourTagMapping.deleteMany({ where: { tourId } })
      if (tagIds.length) {
        await tx.tourTagMapping.createMany({
          data: tagIds.map((tagId) => ({ tourId, tagId })),
        })
      }
    })

    return this.getTourById(tourId, { allowInactive: true })
  }

  // ---------- Schedules ----------

  async addSchedule(
    tourId: number,
    body: {
      startDate: string
      endDate: string
      availableSeats?: number
      priceOverride?: number
      status?: string
    },
  ) {
    await this.getTourById(tourId, { allowInactive: true })
    const startDate = new Date(body.startDate)
    const endDate = new Date(body.endDate)
    validateSchedulePayload(
      startDate,
      endDate,
      body.availableSeats,
      0,
    )
    const s = await this.prisma.tourSchedule.create({
      data: {
        tourId,
        startDate,
        endDate,
        availableSeats: body.availableSeats,
        bookedSeats: 0,
        priceOverride: body.priceOverride,
        status: body.status,
      },
    })
    return {
      id: s.id,
      tourId: s.tourId,
      startDate: s.startDate.toISOString(),
      endDate: s.endDate.toISOString(),
      availableSeats: s.availableSeats,
      bookedSeats: s.bookedSeats,
      priceOverride: num(s.priceOverride),
      status: s.status,
      deletedAt: scheduleDeletedAtIso(s),
    }
  }

  async updateSchedule(
    scheduleId: number,
    body: Partial<{
      startDate: string
      endDate: string
      availableSeats: number
      priceOverride: number
      status: string
    }>,
  ) {
    const current = await this.prisma.tourSchedule.findUnique({
      where: { id: scheduleId },
    })
    if (!current) throw new NotFoundException('Schedule not found')

    const nextStartDate = body.startDate
      ? new Date(body.startDate)
      : current.startDate
    const nextEndDate = body.endDate ? new Date(body.endDate) : current.endDate
    const nextAvailableSeats = body.availableSeats ?? current.availableSeats
    /** bookedSeats chỉ thay đổi qua luồng đặt tour, không qua API chỉnh sửa lịch */
    const nextBookedSeats = current.bookedSeats

    validateSchedulePayload(
      nextStartDate,
      nextEndDate,
      nextAvailableSeats,
      nextBookedSeats,
    )

    const reviveArchived =
      nextEndDate >= new Date()
        ? (() => {
            const x = { deletedAt: null }
            return x
          })()
        : {}

    const s = await this.prisma.tourSchedule.update({
      where: { id: scheduleId },
      data: {
        startDate: body.startDate ? nextStartDate : undefined,
        endDate: body.endDate ? nextEndDate : undefined,
        availableSeats: body.availableSeats,
        priceOverride: body.priceOverride,
        status: body.status,
        ...reviveArchived,
      },
    })
    return {
      id: s.id,
      tourId: s.tourId,
      startDate: s.startDate.toISOString(),
      endDate: s.endDate.toISOString(),
      availableSeats: s.availableSeats,
      bookedSeats: s.bookedSeats,
      priceOverride: num(s.priceOverride),
      status: s.status,
      deletedAt: scheduleDeletedAtIso(s),
    }
  }

  async removeSchedule(scheduleId: number) {
    const row = await this.prisma.tourSchedule.findUnique({
      where: { id: scheduleId },
    })
    if (!row) throw new NotFoundException('Schedule not found')

    const passengerBookings = await this.prisma.booking.count({
      where: {
        tourScheduleId: scheduleId,
        status: { not: 'CANCELLED' },
      },
    })
    if (passengerBookings > 0) {
      throw new BadRequestException('Lịch khởi hành đã có hành khách')
    }

    await this.prisma.tourSchedule.delete({ where: { id: scheduleId } })
    return { message: 'Schedule removed' }
  }

  // ---------- Itineraries ----------

  async addItinerary(
    tourId: number,
    body: { dayNumber: number; title?: string; description?: string },
  ) {
    await this.getTourById(tourId, { allowInactive: true })
    const it = await this.prisma.tourItinerary.create({
      data: {
        tourId,
        dayNumber: body.dayNumber,
        title: body.title,
        description: body.description,
      },
    })
    return {
      id: it.id,
      tourId: it.tourId,
      dayNumber: it.dayNumber,
      title: it.title,
      description: it.description,
    }
  }

  async updateItinerary(
    itineraryId: number,
    body: Partial<{ dayNumber: number; title: string; description: string }>,
  ) {
    const it = await this.prisma.tourItinerary.update({
      where: { id: itineraryId },
      data: {
        dayNumber: body.dayNumber,
        title: body.title,
        description: body.description,
      },
    })
    return {
      id: it.id,
      tourId: it.tourId,
      dayNumber: it.dayNumber,
      title: it.title,
      description: it.description,
    }
  }

  async removeItinerary(itineraryId: number) {
    const row = await this.prisma.tourItinerary.findUnique({
      where: { id: itineraryId },
    })
    if (!row) throw new NotFoundException('Itinerary not found')
    await this.prisma.tourItinerary.delete({ where: { id: itineraryId } })
    return { message: 'Itinerary removed' }
  }

  // ---------- Transports ----------

  private formatTransport(tr: {
    id: number
    tourId: number
    supplierId: number | null
    supplier: { id: number; name: string; type: any; phone: string | null } | null
    legOrder: number
    vehicleType: any
    vehicleDetail: string | null
    seatClass: string | null
    departurePoint: string
    arrivalPoint: string
    estimatedHours: any
    notes: string | null
  }) {
    return {
      id: tr.id,
      tourId: tr.tourId,
      supplierId: tr.supplierId,
      supplier: tr.supplier,
      legOrder: tr.legOrder,
      vehicleType: tr.vehicleType,
      vehicleDetail: tr.vehicleDetail,
      seatClass: tr.seatClass,
      departurePoint: tr.departurePoint,
      arrivalPoint: tr.arrivalPoint,
      estimatedHours: num(tr.estimatedHours),
      notes: tr.notes,
    }
  }

  async addTransport(tourId: number, body: CreateTourTransportInput) {
    await this.getTourById(tourId, { allowInactive: true })
    const tr = await this.prisma.tourTransport.create({
      data: {
        tourId,
        supplierId: body.supplierId,
        legOrder: body.legOrder,
        vehicleType: body.vehicleType,
        vehicleDetail: body.vehicleDetail,
        seatClass: body.seatClass,
        departurePoint: body.departurePoint,
        arrivalPoint: body.arrivalPoint,
        estimatedHours: body.estimatedHours,
        notes: body.notes,
      },
      include: { supplier: { select: { id: true, name: true, type: true, phone: true } } },
    })
    return this.formatTransport(tr)
  }

  async updateTransport(transportId: number, body: UpdateTourTransportInput) {
    const existing = await this.prisma.tourTransport.findUnique({
      where: { id: transportId },
    })
    if (!existing) throw new NotFoundException('Transport not found')
    const tr = await this.prisma.tourTransport.update({
      where: { id: transportId },
      data: {
        supplierId: body.supplierId,
        legOrder: body.legOrder,
        vehicleType: body.vehicleType,
        vehicleDetail: body.vehicleDetail,
        seatClass: body.seatClass,
        departurePoint: body.departurePoint,
        arrivalPoint: body.arrivalPoint,
        estimatedHours: body.estimatedHours,
        notes: body.notes,
      },
      include: { supplier: { select: { id: true, name: true, type: true, phone: true } } },
    })
    return this.formatTransport(tr)
  }

  async removeTransport(transportId: number) {
    const row = await this.prisma.tourTransport.findUnique({
      where: { id: transportId },
    })
    if (!row) throw new NotFoundException('Transport not found')
    await this.prisma.tourTransport.delete({ where: { id: transportId } })
    return { message: 'Transport removed' }
  }

  // ---------- Accommodations ----------

  private formatAccommodation(a: {
    id: number
    itineraryId: number
    supplierId: number | null
    supplier: { id: number; name: string; type: any; phone: string | null } | null
    hotelName: string
    starRating: number | null
    roomType: string | null
    checkInNote: string | null
    checkOutNote: string | null
    address: string | null
    mapUrl: string | null
  }) {
    return {
      id: a.id,
      itineraryId: a.itineraryId,
      supplierId: a.supplierId,
      supplier: a.supplier,
      hotelName: a.hotelName,
      starRating: a.starRating,
      roomType: a.roomType,
      checkInNote: a.checkInNote,
      checkOutNote: a.checkOutNote,
      address: a.address,
      mapUrl: a.mapUrl,
    }
  }

  async addAccommodation(itineraryId: number, body: CreateTourAccommodationInput) {
    const itinerary = await this.prisma.tourItinerary.findUnique({
      where: { id: itineraryId },
    })
    if (!itinerary) throw new NotFoundException('Itinerary not found')

    const a = await this.prisma.tourAccommodation.create({
      data: {
        itineraryId,
        supplierId: body.supplierId,
        hotelName: body.hotelName,
        starRating: body.starRating,
        roomType: body.roomType,
        checkInNote: body.checkInNote,
        checkOutNote: body.checkOutNote,
        address: body.address,
        mapUrl: body.mapUrl,
      },
      include: { supplier: { select: { id: true, name: true, type: true, phone: true } } },
    })
    return this.formatAccommodation(a)
  }

  async updateAccommodation(accommodationId: number, body: UpdateTourAccommodationInput) {
    const existing = await this.prisma.tourAccommodation.findUnique({
      where: { id: accommodationId },
    })
    if (!existing) throw new NotFoundException('Accommodation not found')
    const a = await this.prisma.tourAccommodation.update({
      where: { id: accommodationId },
      data: {
        supplierId: body.supplierId,
        hotelName: body.hotelName,
        starRating: body.starRating,
        roomType: body.roomType,
        checkInNote: body.checkInNote,
        checkOutNote: body.checkOutNote,
        address: body.address,
        mapUrl: body.mapUrl,
      },
      include: { supplier: { select: { id: true, name: true, type: true, phone: true } } },
    })
    return this.formatAccommodation(a)
  }

  async removeAccommodation(accommodationId: number) {
    const row = await this.prisma.tourAccommodation.findUnique({
      where: { id: accommodationId },
    })
    if (!row) throw new NotFoundException('Accommodation not found')
    await this.prisma.tourAccommodation.delete({ where: { id: accommodationId } })
    return { message: 'Accommodation removed' }
  }

  // ---------- Meals ----------

  private formatMeal(m: {
    id: number
    itineraryId: number
    supplierId: number | null
    supplier: { id: number; name: string; type: any; phone: string | null } | null
    mealType: any
    restaurantName: string | null
    menuStyle: string | null
    dietaryNotes: string | null
  }) {
    return {
      id: m.id,
      itineraryId: m.itineraryId,
      supplierId: m.supplierId,
      supplier: m.supplier,
      mealType: m.mealType,
      restaurantName: m.restaurantName,
      menuStyle: m.menuStyle,
      dietaryNotes: m.dietaryNotes,
    }
  }

  async addMeal(itineraryId: number, body: CreateTourMealInput) {
    const itinerary = await this.prisma.tourItinerary.findUnique({
      where: { id: itineraryId },
    })
    if (!itinerary) throw new NotFoundException('Itinerary not found')

    const m = await this.prisma.tourMeal.create({
      data: {
        itineraryId,
        supplierId: body.supplierId,
        mealType: body.mealType,
        restaurantName: body.restaurantName,
        menuStyle: body.menuStyle,
        dietaryNotes: body.dietaryNotes,
      },
      include: { supplier: { select: { id: true, name: true, type: true, phone: true } } },
    })
    return this.formatMeal(m)
  }

  async updateMeal(mealId: number, body: UpdateTourMealInput) {
    const existing = await this.prisma.tourMeal.findUnique({ where: { id: mealId } })
    if (!existing) throw new NotFoundException('Meal not found')
    const m = await this.prisma.tourMeal.update({
      where: { id: mealId },
      data: {
        supplierId: body.supplierId,
        mealType: body.mealType,
        restaurantName: body.restaurantName,
        menuStyle: body.menuStyle,
        dietaryNotes: body.dietaryNotes,
      },
      include: { supplier: { select: { id: true, name: true, type: true, phone: true } } },
    })
    return this.formatMeal(m)
  }

  async removeMeal(mealId: number) {
    const row = await this.prisma.tourMeal.findUnique({ where: { id: mealId } })
    if (!row) throw new NotFoundException('Meal not found')
    await this.prisma.tourMeal.delete({ where: { id: mealId } })
    return { message: 'Meal removed' }
  }
}
