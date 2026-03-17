import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prima.service';

@Controller('prisma')
export class PrismaController {
  constructor(private prisma: PrismaService) {}

  @Get('health')
  async healthCheck() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'Database connected' };
  }
}