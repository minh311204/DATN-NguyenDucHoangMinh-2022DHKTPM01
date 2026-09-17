import { Injectable, Logger } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import type { Server, Socket } from 'socket.io'
import { PrismaService } from '../prisma/prima.service'

const WS_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
]

export type NotificationRealtimePayload = {
  notification: {
    id: number
    userId: number
    title: string | null
    content: string | null
    isRead: boolean
    createdAtUtc: string | null
  }
  unreadCount: number
}

@Injectable()
@WebSocketGateway({
  namespace: '/notifications',
  cors: { origin: WS_ORIGINS, credentials: true },
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server

  private readonly log = new Logger(NotificationGateway.name)

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    const raw =
      (client.handshake.auth as { token?: string } | undefined)?.token ??
      client.handshake.query?.token
    const token = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : ''
    if (!token) {
      client.disconnect(true)
      return
    }
    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: number
        jti?: string
      }>(token)
      const userId = Number(payload.sub)
      if (!userId) {
        client.disconnect(true)
        return
      }
      if (payload.jti) {
        const blacklisted = await this.prisma.blacklistedAccessToken.findFirst({
          where: {
            userId,
            jti: payload.jti,
            expiredDateTimeUtc: { gt: new Date() },
          },
        })
        if (blacklisted) {
          client.disconnect(true)
          return
        }
      }
      const user = await this.prisma.user.findUnique({ where: { id: userId } })
      if (!user) {
        client.disconnect(true)
        return
      }
      client.data.userId = userId
      await client.join(this.userRoom(userId))
    } catch {
      client.disconnect(true)
    }
  }

  handleDisconnect(_client: Socket) {}

  private userRoom(userId: number) {
    return `user:${userId}`
  }

  emitToUser(userId: number, payload: NotificationRealtimePayload) {
    try {
      this.server.to(this.userRoom(userId)).emit('notification', payload)
    } catch (e) {
      this.log.warn(`emit notification failed: ${String(e)}`)
    }
  }
}
