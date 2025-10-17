import { Module } from '@nestjs/common';
import {
  AdminOfficeController,
  ProviderOfficeController,
  AdminBookingController,
  ProviderBookingController,
} from './office-real-estate.controller';
import { OfficeRealEstateService } from './office-real-estate.service';
import { PrismaService } from '../../../prisma/prisma.service';

@Module({
  imports: [],
  controllers: [
    AdminOfficeController,
    ProviderOfficeController,
    AdminBookingController,
    ProviderBookingController,
  ],
  providers: [OfficeRealEstateService, PrismaService],
  exports: [OfficeRealEstateService],
})
export class OfficeSpacesModule {}
