import { Module } from '@nestjs/common';
import { LsmController } from './lsm.controller';
import { LsmService } from './lsm.service';
import { PrismaService } from '../../../prisma/prisma.service';

@Module({
  controllers: [LsmController],
  providers: [LsmService, PrismaService],
  exports: [LsmService],
})
export class LsmModule {}