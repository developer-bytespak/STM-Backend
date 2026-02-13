import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ProviderAvailabilityReminderService } from '../shared/services/provider-availability-reminder.service';
import { EmailService } from '../shared/services/email.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService, ProviderAvailabilityReminderService, EmailService],
  exports: [AdminService, ProviderAvailabilityReminderService],
})
export class AdminModule {}
