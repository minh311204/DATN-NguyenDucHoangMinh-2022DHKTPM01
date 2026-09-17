import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prima.service'
import {
  NotificationGateway,
  type BookingUpdatedRealtimePayload,
} from './notification.gateway'

function mapNotification(n: any) {
  return {
    id: n.id,
    userId: n.userId,
    title: n.title ?? null,
    content: n.content ?? null,
    isRead: n.isRead,
    createdAtUtc: n.createdAtUtc ? n.createdAtUtc.toISOString() : null,
  }
}

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationGateway,
  ) {}

  async create(userId: number, data: { title: string; content: string }) {
    const n = await this.prisma.notification.create({
      data: {
        userId,
        title: data.title,
        content: data.content,
        isRead: false,
      },
    })
    const mapped = mapNotification(n)
    const { count: unreadCount } = await this.getUnreadCount(userId)
    this.gateway.emitToUser(userId, { notification: mapped, unreadCount })
    return mapped
  }

  /** Realtime cập nhật một booking trong danh sách khách (đã map giống API list). */
  emitBookingUpdated(userId: number, booking: Record<string, unknown>) {
    const payload: BookingUpdatedRealtimePayload = { booking }
    this.gateway.emitBookingUpdated(userId, payload)
  }

  async getNotifications(
    userId: number,
    opts: { unreadOnly?: boolean; limit?: number },
  ) {
    const rows = await this.prisma.notification.findMany({
      where: {
        userId,
        ...(opts.unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAtUtc: 'desc' },
      take: opts.limit ?? 30,
    })
    return rows.map(mapNotification)
  }

  async getUnreadCount(userId: number) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    })
    return { count }
  }

  async markAsRead(userId: number, id: number) {
    const n = await this.prisma.notification.findUnique({ where: { id } })
    if (!n || n.userId !== userId) throw new NotFoundException('Notification not found')

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    })
    return mapNotification(updated)
  }

  async markAllAsRead(userId: number) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    })
    return { count: result.count }
  }

  async deleteNotification(userId: number, id: number) {
    const n = await this.prisma.notification.findUnique({ where: { id } })
    if (!n || n.userId !== userId) throw new NotFoundException('Notification not found')

    await this.prisma.notification.delete({ where: { id } })
    return { message: 'Đã xoá thông báo' }
  }
}
