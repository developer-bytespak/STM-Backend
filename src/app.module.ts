import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Import all modules
import { OAuthModule } from './modules/oauth/oauth.module';
import { UsersModule } from './modules/users/users.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { LsmModule } from './modules/lsm/lsm.module';
import { ProviderOnboardingModule } from './modules/provider-onboarding/provider-onboarding.module';
import { JobManagementModule } from './modules/job-management/job-management.module';
import { ChatModule } from './modules/chat/chat.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ServicesModule } from './modules/services/services.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { RatingsModule } from './modules/ratings/ratings.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { OfficeSpacesModule } from './modules/office-spaces/office-spaces.module';
import { AdminModule } from './modules/admin/admin.module';

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
    UsersModule,
    CustomersModule,
    ProvidersModule,
    LsmModule,
    ProviderOnboardingModule,
    JobManagementModule,
    ChatModule,
    NotificationsModule,
    ServicesModule,
    PaymentsModule,
    RatingsModule,
    AnalyticsModule,
    OfficeSpacesModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
