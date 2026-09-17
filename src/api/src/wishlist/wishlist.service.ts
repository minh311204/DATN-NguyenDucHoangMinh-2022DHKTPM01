import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prima.service'
import { NotificationService } from '../notification/notification.service'

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

function mapWishlistItem(w: any) {
  return {
    id: w.id,
    userId: w.userId,
    tourId: w.tourId,
    createdAtUtc: w.createdAtUtc ? w.createdAtUtc.toISOString() : null,
    tour: mapTour(w.tour),
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
export class WishlistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async getMyWishlist(userId: number) {
    const items = await this.prisma.wishlist.findMany({
      where: {
        userId,
        tour: { isActive: true },
      },
      include: { tour: { select: tourSelect } },
      orderBy: { createdAtUtc: 'desc' },
    })
    return items.map(mapWishlistItem)
  }

  async addToWishlist(userId: number, tourId: number) {
    const tour = await this.prisma.tour.findUnique({
      where: { id: tourId },
      select: tourSelect,
    })
    if (!tour) throw new NotFoundException('Tour not found')
    if (tour.isActive !== true) {
      throw new BadRequestException('Tour không còn mở bán')
    }

    const existing = await this.prisma.wishlist.findUnique({
      where: { userId_tourId: { userId, tourId } },
    })
    if (existing) throw new ConflictException('Tour already in wishlist')

    const item = await this.prisma.wishlist.create({
      data: { userId, tourId },
      include: { tour: { select: tourSelect } },
    })

    // Gửi notification
    await this.notificationService.create(userId, {
      title: 'Đã thêm vào yêu thích',
      content: `Tour "${tour.name}" đã được thêm vào danh sách yêu thích của bạn.`,
    })

    return mapWishlistItem(item)
  }

  async removeFromWishlist(userId: number, tourId: number) {
    const existing = await this.prisma.wishlist.findUnique({
      where: { userId_tourId: { userId, tourId } },
    })
    if (!existing) throw new NotFoundException('Wishlist item not found')

    await this.prisma.wishlist.delete({
      where: { userId_tourId: { userId, tourId } },
    })

    return { message: 'Đã xoá khỏi danh sách yêu thích' }
  }

  async checkWishlist(userId: number, tourId: number) {
    const tour = await this.prisma.tour.findUnique({
      where: { id: tourId },
      select: { isActive: true },
    })
    if (tour?.isActive !== true) return { inWishlist: false }

    const item = await this.prisma.wishlist.findUnique({
      where: { userId_tourId: { userId, tourId } },
      select: { id: true },
    })
    return { inWishlist: item != null }
  }
}
