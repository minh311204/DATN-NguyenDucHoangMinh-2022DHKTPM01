import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prima.service'

@Injectable()
export class LocationService {
    constructor(private prisma: PrismaService) { }

    // REGION
    async getRegions() {
        return this.prisma.region.findMany()
    }

    async getRegionById(id: number) {
        const region = await this.prisma.region.findUnique({
            where: { id }
        })
        if (!region) {
            throw new NotFoundException('Region not found')
        }

        return {
            id: region.id,
            name: region.name,
        }
    }

    async createRegion(data: { name?: string | null }) {
        const isExist = await this.prisma.region.findFirst({
            where: { name: data.name }
        })

        if (isExist) {
            throw new ConflictException('Region already exists')
        }

        const region = await this.prisma.region.create({
            data: {
                name: data.name,
            }
        })
        return {
            id: region.id,
            name: region.name,
        }
    }

    async updateRegion(id: number, data: { name?: string | null }) {
        const region = await this.prisma.region.update({
            where: { id },
            data: {
                name: data.name,
            }
        })
        return {
            id: region.id,
            name: region.name,
        }
    }

    async deleteRegion(id: number) {
        const isExist = await this.prisma.region.findUnique({
            where: { id }
        })

        if (!isExist) {
            throw new NotFoundException('Region not found')
        }

        await this.prisma.region.delete({
            where: { id }
        })

        return {
            message: 'Region deleted successfully'
        }
    }

    // PROVINCE
    async getProvinces() {
        return this.prisma.province.findMany()
    }

    async getProvinceById(id: number) {
        const province = await this.prisma.province.findUnique({
            where: { id }
        })

        if (!province) {
            throw new NotFoundException('Province not found')
        }

        return {
            id: province.id,
            regionId: province.regionId,
            name: province.name,
        }
    }

    async createProvince(data: { regionId: number, name: string }) {
        const isExist = await this.prisma.province.findFirst({
            where: { name: data.name }
        })

        if (isExist) {
            throw new ConflictException('Province already exists')
        }

        const province = await this.prisma.province.create({
            data: { regionId: data.regionId, name: data.name }
        })
        return {
            id: province.id,
            regionId: province.regionId,
            name: province.name,
        }
    }

    async updateProvince(id: number, data: { regionId?: number, name?: string }) {
        const province = await this.prisma.province.update({
            where: { id },
            data: { regionId: data.regionId, name: data.name }
        })
        return {
            id: province.id,
            regionId: province.regionId,
            name: province.name,
        }
    }

    async deleteProvince(id: number) {
        const isExist = await this.prisma.province.findUnique({
            where: { id }
        })

        if (!isExist) {
            throw new NotFoundException('Province not found')
        }

        await this.prisma.province.delete({
            where: { id }
        })
        return {
            message: 'Province deleted successfully'
        }
    }

    // Location
    async getLocations() {
        const locations = await this.prisma.location.findMany({ where: { isActive: true } })
        return locations.map((location) => ({
            id: location.id,
            provinceId: location.provinceId,
            name: location.name,
            latitude: location.latitude !== null && location.latitude !== undefined ? Number(location.latitude) : null,
            longitude: location.longitude !== null && location.longitude !== undefined ? Number(location.longitude) : null,
            description: location.description,
            isActive: location.isActive,
        }))
    }

    async getLocationById(id: number) {
        const location = await this.prisma.location.findUnique({
            where: { id },
        })
        if (!location) {
            throw new NotFoundException('Location not found')
        }
        return {
            id: location.id,
            provinceId: location.provinceId,
            name: location.name,
            latitude: location.latitude !== null && location.latitude !== undefined ? Number(location.latitude) : null,
            longitude: location.longitude !== null && location.longitude !== undefined ? Number(location.longitude) : null,
            description: location.description,
            isActive: location.isActive,
        }
    }

    async createLocation(data: { provinceId: number, name: string, latitude?: number, longitude?: number, description?: string, isActive?: boolean }) {
        const isExist = await this.prisma.location.findFirst({
            where: { name: data.name }
        })

        if (isExist) {
            throw new ConflictException('Location already exists')
        }

        const location = await this.prisma.location.create({
            data: {
                provinceId: data.provinceId,
                name: data.name,
                latitude: data.latitude,
                longitude: data.longitude,
                description: data.description,
                isActive: data.isActive,
            },
        })
        return {
            id: location.id,
            provinceId: location.provinceId,
            name: location.name,
            latitude: location.latitude !== null && location.latitude !== undefined ? Number(location.latitude) : null,
            longitude: location.longitude !== null && location.longitude !== undefined ? Number(location.longitude) : null,
            description: location.description,
            isActive: location.isActive,
        }
    }

    async updateLocation(id: number, data: { provinceId?: number, name?: string | null, latitude?: number | null, longitude?: number | null, description?: string | null, isActive?: boolean | null }) {
        const location = await this.prisma.location.update({
            where: { id },
            data: {
                provinceId: data.provinceId,
                name: data.name,
                latitude: data.latitude,
                longitude: data.longitude,
                description: data.description,
                isActive: data.isActive,
            },
        })

        return {
            id: location.id,
            provinceId: location.provinceId,
            name: location.name,
            latitude: location.latitude !== null && location.latitude !== undefined ? Number(location.latitude) : null,
            longitude: location.longitude !== null && location.longitude !== undefined ? Number(location.longitude) : null,
            description: location.description,
            isActive: location.isActive,
        }
    }

    async deleteLocation(id: number) {
        const isExist = await this.prisma.location.findUnique({
            where: { id }
        })

        if (!isExist) {
            throw new NotFoundException('Location not found')
        }

        await this.prisma.location.delete({
            where: { id }
        })

        return {
            message: 'Location deleted successfully'
        }
    }
}