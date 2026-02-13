import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../../prisma/prisma.service';
import { EmailService } from './email.service';

@Injectable()
export class ProviderAvailabilityReminderService {
  private readonly logger = new Logger(ProviderAvailabilityReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Manually call this to send reminders to all active providers
   * Can be called from API endpoint for testing
   */
  async sendRemindersToAllActiveProviders(): Promise<{
    success: number;
    failed: number;
    total: number;
  }> {
    this.logger.log('🔔 Starting provider availability reminders...');

    try {
      // Get all active providers
      const activeProviders = await this.prisma.service_providers.findMany({
        where: {
          status: 'active',
          is_active: true,
          is_deleted: false,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              first_name: true,
              last_name: true,
            },
          },
          service_areas: {
            select: {
              zipcode: true,
            },
          },
          provider_services: {
            select: {
              service: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      if (activeProviders.length === 0) {
        this.logger.log('📭 No active providers found');
        return { success: 0, failed: 0, total: 0 };
      }

      this.logger.log(
        `📤 Found ${activeProviders.length} active providers. Sending reminders...`,
      );

      let successCount = 0;
      let failureCount = 0;

      for (const provider of activeProviders) {
        try {
          if (!provider.user.email) {
            this.logger.warn(
              `⚠️ Provider #${provider.id} has no email, skipping`,
            );
            failureCount++;
            continue;
          }

          const serviceAreas = provider.service_areas
            .map((sa) => sa.zipcode)
            .filter(Boolean)
            .join(', ') || 'Not specified';

          const services = provider.provider_services
            .map((ps) => ps.service.name)
            .join(', ') || 'Not specified';

          const providerDetails = {
            id: provider.id,
            name: `${provider.user.first_name} ${provider.user.last_name}`,
            rating: Number(provider.rating),
            tier: provider.tier,
            totalJobs: provider.total_jobs,
            serviceAreas,
            services,
          };

          // Send email
          await this.emailService.sendAvailabilityConfirmationReminder(
            provider.user.email,
            providerDetails,
          );

          // Create notification
          // await this.prisma.notifications.create({
          //   data: {
          //     recipient_type: 'service_provider',
          //     recipient_id: provider.id,
          //     type: 'system',
          //     title: 'Weekly Availability Confirmation',
          //     message: `Please confirm your availability and verify your profile details`,
          //     is_read: false,
          //   },
          // });

          successCount++;
          this.logger.log(
            `✅ Reminder sent to provider #${provider.id}`,
          );
        } catch (error) {
          failureCount++;
          this.logger.error(
            `❌ Failed to send reminder to provider #${provider.id}:`,
            error,
          );
        }
      }

      const result = {
        success: successCount,
        failed: failureCount,
        total: activeProviders.length,
      };

      this.logger.log(
        `✅ Reminders completed: ${successCount} sent, ${failureCount} failed`,
      );

      return result;
    } catch (error) {
      this.logger.error('❌ Error sending reminders:', error);
      throw error;
    }
  }

  /**
   * Automated - runs every Monday at 9 AM
   * DISABLED FOR TESTING - Use manual trigger instead
   * To enable: uncomment @Cron decorator below
   */
  // @Cron('0 9 * * 1')
  async scheduledWeeklyReminder() {
    this.logger.log('⏰ Running scheduled weekly reminder (Monday 9 AM)');
    await this.sendRemindersToAllActiveProviders();
  }
}
