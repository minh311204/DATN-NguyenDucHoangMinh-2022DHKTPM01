import {
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prima.service'
import { catalogTagTourWhereClause } from './catalog-tag-tour-line'

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
    },
    tourCount: number,
  ): TagRow {
    return {
      id: t.id,
      name: t.name,
      description: t.description,
      tourCount,
    }
  }

  private async countActiveToursForCatalogTag(
    tagId: number,
    tagName: string,
  ): Promise<number> {
    return this.prisma.tour.count({
      where: {
        isActive: true,
        ...catalogTagTourWhereClause(tagId, tagName),
      },
    })
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
    })
    const counts = await Promise.all(
      tags.map((t) => this.countActiveToursForCatalogTag(t.id, t.name)),
    )
    return tags.map((t, i) => this.toDto(t, counts[i] ?? 0))
  }

  async createTag(data: { name: string; description?: string | null }) {
    const name = data.name.trim()
    const description =
      data.description === undefined || data.description === null
        ? null
        : data.description.trim() || null

    const tag = await this.prisma.tourTag.create({
      data: { name, description },
    })
    const tourCount = await this.countActiveToursForCatalogTag(tag.id, tag.name)
    return this.toDto(tag, tourCount)
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
    })
    const tourCount = await this.countActiveToursForCatalogTag(tag.id, tag.name)
    return this.toDto(tag, tourCount)
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
