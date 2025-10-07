import { Module } from '@nestjs/common';
import { ProviderOnboardingController } from './provider-onboarding.controller';
import { ProviderOnboardingService } from './provider-onboarding.service';
import { PrismaService } from '../../../prisma/prisma.service';

@Module({
  imports: [],
  controllers: [ProviderOnboardingController],
  providers: [ProviderOnboardingService, PrismaService],
  exports: [ProviderOnboardingService],
})
export class ProviderOnboardingModule {}
