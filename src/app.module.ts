import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Import all modules
import { OAuthModule } from './modules/oauth/oauth.module';
import { UserManagementModule } from './modules/user-management/user-management.module';
import { ProviderOnboardingModule } from './modules/provider-onboarding/provider-onboarding.module';
import { JobManagementModule } from './modules/job-management/job-management.module';
import { CommunicationModule } from './modules/communication/communication.module';
import { SearchMatchingModule } from './modules/search-matching/search-matching.module';
import { PaymentModule } from './modules/payment/payment.module';
import { RatingsFeedbackModule } from './modules/ratings-feedback/ratings-feedback.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { OfficeRealEstateModule } from './modules/office-real-estate/office-real-estate.module';
import { AdminDashboardModule } from './modules/admin-dashboard/admin-dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
    // Core modules
    OAuthModule,
    UserManagementModule,
    ProviderOnboardingModule,
    JobManagementModule,
    CommunicationModule,
    SearchMatchingModule,
    PaymentModule,
    RatingsFeedbackModule,
    AnalyticsModule,
    OfficeRealEstateModule,
    AdminDashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
