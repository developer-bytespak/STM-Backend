import { Module, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JobTimeoutService } from './modules/shared/services/job-timeout.service';

// Import all modules
import { OAuthModule } from './modules/oauth/oauth.module';
import { UsersModule } from './modules/users/users.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { LsmModule } from './modules/lsm/lsm.module';
import { ProviderOnboardingModule } from './modules/provider-onboarding/provider-onboarding.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { ChatModule } from './modules/chat/chat.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ServicesModule } from './modules/services/search-matching.module';
import { PaymentsModule } from './modules/payments/payment.module';
import { RatingsModule } from './modules/ratings/ratings-feedback.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { OfficeSpacesModule } from './modules/office-spaces/office-real-estate.module';
import { AdminModule } from './modules/admin/admin.module';
import { HomepageModule } from './modules/homepage/homepage.module';
import { UtilsModule } from './modules/utils/utils.module';
import { VoiceModule } from './modules/voice/voice.module';

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
    ScheduleModule.forRoot(), // Enable cron jobs
    PrismaModule, // Global singleton Prisma instance
    // Core modules
    OAuthModule,
    UsersModule,
    CustomersModule,
    ProvidersModule,
    LsmModule,
    ProviderOnboardingModule,
    JobsModule,
    ChatModule,
    NotificationsModule,
    ServicesModule,
    PaymentsModule,
    RatingsModule,
    AnalyticsModule,
    OfficeSpacesModule,
    AdminModule,
    HomepageModule,
    UtilsModule,
    VoiceModule,
  ],
  controllers: [AppController],
  providers: [AppService, Logger, JobTimeoutService],
})
export class AppModule {}
