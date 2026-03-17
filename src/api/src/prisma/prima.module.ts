import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prima.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}