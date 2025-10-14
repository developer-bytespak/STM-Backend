import { Module } from '@nestjs/common';
import { HomepageController } from './homepage.controller';
import { PublicProvidersController } from './public-providers.controller';
import { HomepageService } from './homepage.service';
import { PrismaService } from '../../../prisma/prisma.service';

@Module({
  controllers: [HomepageController, PublicProvidersController],
  providers: [HomepageService, PrismaService],
  exports: [HomepageService],
})
export class HomepageModule {}

