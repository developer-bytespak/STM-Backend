import { Module } from '@nestjs/common';
import { ServicesController } from './services.controller';
import { SearchMatchingService } from './search-matching.service';
import { PrismaService } from '../../../prisma/prisma.service';

@Module({
  controllers: [ServicesController],
  providers: [SearchMatchingService, PrismaService],
  exports: [SearchMatchingService],
})
export class ServicesModule {}

