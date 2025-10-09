import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class JobTimeoutService {
  private readonly logger = new Logger(JobTimeoutService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Smart timeout checker - runs every 15 minutes
   * Only checks jobs that are:
   * 1. Created 65+ minutes ago (past the 1-hour deadline + 5min grace)
   * 2. Still in 'new' status
   * 3. Not yet timed out
   */
  @Cron('*/15 * * * *') // Every 15 minutes
  async checkJobTimeouts() {
    this.logger.log('Running job timeout checker...');

    try {
      // Calculate threshold: 65 minutes ago (1 hour deadline + 5 min grace)
      const thresholdTime = new Date(Date.now() - 65 * 60 * 1000);

      // Find jobs that have expired (created > 65 mins ago, still 'new', SP hasn't responded)
      const expiredJobs = await this.prisma.jobs.findMany({
        where: {
          status: 'new',
          sp_accepted: false, // SP hasn't accepted yet
          pending_approval: false, // Not in negotiation
          created_at: { lt: thresholdTime }, // Created before threshold
          response_deadline: { lt: new Date() }, // Past deadline
        },
        include: {
          service: { select: { name: true } },
          service_provider: {
            include: {
              user: { select: { id: true, first_name: true, last_name: true } },
            },
          },
          customer: {
            include: {
              user: { select: { id: true, email: true, first_name: true } },
            },
          },
        },
        take: 50, // Process in batches to avoid overload
      });

      if (expiredJobs.length === 0) {
        this.logger.log('No expired jobs found');
        return;
      }

      this.logger.log(`Found ${expiredJobs.length} expired jobs. Processing...`);

      for (const job of expiredJobs) {
        await this.handleTimeout(job);
      }

      this.logger.log('Job timeout check completed');
    } catch (error) {
      this.logger.error('Error in job timeout checker:', error);
    }
  }

  /**
   * Handle individual job timeout
   */
  private async handleTimeout(job: any) {
    try {
      await this.prisma.$transaction(async (tx) => {
        // 1. Increment SP warning count
        const currentWarnings = job.service_provider.warnings || 0;
        const newWarnings = currentWarnings + 1;

        await tx.service_providers.update({
          where: { id: job.service_provider.id },
          data: {
            warnings: newWarnings,
          },
        });

        // 2. Update job with timeout flag (add to rejection_reason)
        await tx.jobs.update({
          where: { id: job.id },
          data: {
            rejection_reason: 'Provider did not respond within deadline',
          },
        });

        // 3. Notify customer
        await tx.notifications.create({
          data: {
            recipient_type: 'customer',
            recipient_id: job.customer.user.id,
            type: 'job',
            title: 'Job Response Timeout',
            message: `Service provider did not respond to your ${job.service.name} request (#${job.id}). You can select a different provider.`,
          },
        });

        // 4. Notify SP about warning
        const warningMessage =
          newWarnings >= 3
            ? `You missed responding to job #${job.id}. Warning ${newWarnings}/3 - Your account will be reviewed by LSM.`
            : `You missed responding to job #${job.id}. Warning ${newWarnings}/3`;

        await tx.notifications.create({
          data: {
            recipient_type: 'service_provider',
            recipient_id: job.service_provider.user.id,
            type: 'system',
            title: 'Response Deadline Missed',
            message: warningMessage,
          },
        });

        // 5. If 3+ warnings, notify LSM for review
        if (newWarnings >= 3) {
          await tx.notifications.create({
            data: {
              recipient_type: 'local_service_manager',
              recipient_id: job.service_provider.lsm_id,
              type: 'system',
              title: 'Provider Review Required',
              message: `Service provider ${job.service_provider.business_name || job.service_provider.user.first_name} has reached ${newWarnings} warnings. Manual review required.`,
            },
          });
        }

        this.logger.log(
          `Processed timeout for job #${job.id}. SP warnings: ${newWarnings}`,
        );
      });
    } catch (error) {
      this.logger.error(`Error handling timeout for job #${job.id}:`, error);
    }
  }

  /**
   * Manual method to check and process a specific job timeout
   * Can be called from API if needed
   */
  async checkSpecificJob(jobId: number) {
    const job = await this.prisma.jobs.findUnique({
      where: { id: jobId },
      include: {
        service: { select: { name: true } },
        service_provider: {
          include: {
            user: { select: { id: true, first_name: true, last_name: true } },
          },
        },
        customer: {
          include: {
            user: { select: { id: true, email: true, first_name: true } },
          },
        },
      },
    });

    if (!job) {
      throw new Error('Job not found');
    }

    if (job.status !== 'new') {
      return { message: 'Job is not in new status' };
    }

    if (new Date() < job.response_deadline) {
      return { message: 'Deadline not yet passed' };
    }

    await this.handleTimeout(job);
    return { message: 'Timeout processed successfully' };
  }
}

