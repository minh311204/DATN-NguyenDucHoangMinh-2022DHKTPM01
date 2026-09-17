import {
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prima.service'

type TagRow = {
  id: number
  name: string
  description: string | null
  tourCount?: number
}

@Injectable()
export class TourTagService {
  constructor(private readonly prisma: PrismaService) {}

  private toDto(
    t: {
      id: number
      name: string
      description: string | null
      _count?: { tours: number }
    },
  ): TagRow {
    return {
      id: t.id,
      name: t.name,
      description: t.description,
      ...(t._count != null ? { tourCount: t._count.tours } : {}),
    }
  }

  async getTags(q?: string) {
    const term = q?.trim()
    const where =
      term && term.length > 0
        ? {
            OR: [
              { name: { contains: term } },
              { description: { contains: term } },
            ],
          }
        : {}

    const tags = await this.prisma.tourTag.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { _count: { select: { tours: true } } },
    })
    return tags.map((t) => this.toDto(t))
  }

  async createTag(data: { name: string; description?: string | null }) {
    const name = data.name.trim()
    const description =
      data.description === undefined || data.description === null
        ? null
        : data.description.trim() || null

    const tag = await this.prisma.tourTag.create({
      data: { name, description },
      include: { _count: { select: { tours: true } } },
    })
    return this.toDto(tag)
  }

  async updateTag(
    id: number,
    data: { name?: string; description?: string | null },
  ) {
    const existing = await this.prisma.tourTag.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException('Tag not found')

    const nextName = data.name !== undefined ? data.name.trim() : undefined
    const nextDesc =
      data.description === undefined
        ? undefined
        : data.description === null
          ? null
          : data.description.trim() || null

    const tag = await this.prisma.tourTag.update({
      where: { id },
      data: {
        ...(nextName !== undefined ? { name: nextName } : {}),
        ...(nextDesc !== undefined ? { description: nextDesc } : {}),
      },
      include: { _count: { select: { tours: true } } },
    })
    return this.toDto(tag)
  }

  async deleteTag(id: number) {
    const existing = await this.prisma.tourTag.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException('Tag not found')

    await this.prisma.tourTagMapping.deleteMany({ where: { tagId: id } })
    await this.prisma.tourTag.delete({ where: { id } })
    return { message: 'Tag deleted' }
  }

  async assertTagsExist(tagIds: number[]) {
    if (!tagIds.length) return
    const found = await this.prisma.tourTag.findMany({
      where: { id: { in: tagIds } },
      select: { id: true },
    })
    if (found.length !== tagIds.length) {
      throw new NotFoundException('One or more tags not found')
    }
  }
}
