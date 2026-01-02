import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ZoomClientService } from './services/zoom-client.service';
import { ScheduleMeetingDto } from './dto/schedule-meeting.dto';
import { RescheduleMeetingDto } from './dto/reschedule-meeting.dto';
import { v4 as uuidv4 } from 'uuid';
import sgMail from '@sendgrid/mail';

@Injectable()
export class MeetingsService {
  private readonly logger = new Logger(MeetingsService.name);

  constructor(
    private prisma: PrismaService,
    private zoomClient: ZoomClientService,
  ) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  }

  /**
   * Schedule a meeting with a provider
   */
  async scheduleMeeting(
    userId: number,
    dto: ScheduleMeetingDto,
  ): Promise<any> {
    try {
      // Get LSM by user_id
      const lsm = await this.prisma.local_service_managers.findUnique({
        where: { user_id: userId },
        include: { user: true },
      });

      if (!lsm) {
        throw new BadRequestException('LSM not found for this user');
      }

      // Validate provider exists
      const provider = await this.prisma.service_providers.findUnique({
        where: { id: dto.provider_id },
        include: { user: true },
      });

      if (!provider) {
        throw new BadRequestException('Provider not found');
      }

      // Validate times
      const startTime = new Date(dto.scheduled_start);
      const endTime = new Date(dto.scheduled_end);

      if (startTime >= endTime) {
        throw new BadRequestException(
          'Start time must be before end time',
        );
      }

      if (startTime < new Date()) {
        throw new BadRequestException(
          'Cannot schedule meeting in the past',
        );
      }

      // Create Zoom meeting
      const meetingTitle =
        dto.title || `Onboarding Meeting - ${provider.business_name}`;
      const meetingDescription =
        dto.meeting_description || `Provider onboarding meeting for ${provider.business_name}`;

      // Calculate duration in minutes
      const duration = Math.ceil((endTime.getTime() - startTime.getTime()) / 60000);

      // Create Zoom meeting via Zoom API
      const zoomMeetingData = await this.zoomClient.createMeeting({
        topic: meetingTitle,
        start_time: startTime.toISOString(),
        duration: duration,
        timezone: dto.timezone || 'UTC',
      });

      // Create meeting record in database
      const meeting = await this.prisma.meetings.create({
        data: {
          id: uuidv4(),
          provider_id: dto.provider_id,
          lsm_id: lsm.id,
          provider_email: provider.user.email,
          provider_business_name: provider.business_name,
          zoom_meeting_id: String(zoomMeetingData.id),
          zoom_join_url: zoomMeetingData.join_url,
          zoom_start_url: zoomMeetingData.start_url,
          scheduled_start: startTime,
          scheduled_end: endTime,
          timezone: dto.timezone || 'UTC',
          title: meetingTitle,
          meeting_description: meetingDescription,
          meeting_status: 'scheduled',
        },
        include: {
          provider: {
            include: { user: true },
          },
          lsm: {
            include: { user: true },
          },
        },
      });

      this.logger.log(
        `✅ Zoom meeting scheduled successfully: ${meeting.id}`,
      );

      // Log to console
      console.log(`
╔════════════════════════════════════════════════════════════╗
║        ✅ ZOOM MEETING SCHEDULED SUCCESSFULLY              ║
╚════════════════════════════════════════════════════════════╝
📅 Meeting Details:
  - Meeting ID: ${meeting.id}
  - Zoom Meeting ID: ${zoomMeetingData.id}
  - Provider: ${provider.business_name}
  - Provider Email: ${provider.user.email}
  - LSM: ${lsm.user.first_name} ${lsm.user.last_name}
  - Scheduled Start: ${startTime.toLocaleString()}
  - Scheduled End: ${endTime.toLocaleString()}
  - Timezone: ${dto.timezone || 'UTC'}
  - Duration: ${duration} minutes
  
🔗 Zoom Join Link (Provider):
  ${zoomMeetingData.join_url}

🚀 Zoom Start Link (LSM):
  ${zoomMeetingData.start_url}

🔐 Meeting Password: ${zoomMeetingData.password}

📧 Email will be sent to provider with join link and password

════════════════════════════════════════════════════════════
      `);

      // Send email to provider with meeting details
      await this.sendMeetingEmailToProvider(
        provider.user.email,
        provider.business_name,
        `${lsm.user.first_name} ${lsm.user.last_name}`,
        meetingTitle,
        startTime,
        endTime,
        dto.timezone || 'UTC',
        zoomMeetingData.join_url,
        zoomMeetingData.password,
      );

      return {
        ...meeting,
        zoom_password: zoomMeetingData.password,
      };
    } catch (error) {
      this.logger.error('Failed to schedule meeting', error);
      throw error;
    }
  }

  /**
   * Send meeting scheduled email to provider
   */
  private async sendMeetingEmailToProvider(
    providerEmail: string,
    providerName: string,
    lsmName: string,
    title: string,
    startTime: Date,
    endTime: Date,
    timezone: string,
    joinUrl: string,
    password: string,
  ): Promise<void> {
    try {
      const startDate = startTime.toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: timezone,
      });

      const endDate = endTime.toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: timezone,
      });

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Zoom Meeting Scheduled</h2>
          <p>Hi <strong>${providerName}</strong>,</p>
          
          <p>Your meeting <strong>"${title}"</strong> has been scheduled with <strong>${lsmName}</strong>.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>📅 Date & Time:</strong> ${startDate} — ${endDate}</p>
            <p><strong>⏰ Timezone:</strong> ${timezone}</p>
            <p><strong>🔐 Passcode:</strong> <code style="background: #e0e0e0; padding: 2px 6px;">${password}</code></p>
          </div>

          <div style="margin: 20px 0;">
            <a href="${joinUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2D8CFF; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Join Meeting
            </a>
          </div>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;" />
          <p style="color: #666; font-size: 12px;">
            If you have questions, please contact your service manager.
          </p>
          <p style="color: #666; font-size: 12px;">
            <strong>STM Team</strong>
          </p>
        </div>
      `;

      const plainTextContent = `
Zoom Meeting Scheduled

Hi ${providerName},

Your meeting "${title}" has been scheduled with ${lsmName}.

Date & Time: ${startDate} — ${endDate}
Timezone: ${timezone}
Passcode: ${password}

Join Link: ${joinUrl}

If you have questions, please contact your service manager.

Best regards,
STM Team
      `.trim();

      const message = {
        to: providerEmail,
        from: process.env.EMAIL_FROM || 'noreply@stmapp.com',
        subject: `Zoom Meeting Scheduled: ${title}`,
        text: plainTextContent,
        html: htmlContent,
      };

      await sgMail.send(message);
      this.logger.log(`✅ Meeting email sent to ${providerEmail}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send meeting email to ${providerEmail}`, error);
      // Don't throw - log but don't block meeting creation
    }
  }

  /**
   * Get all meetings for a provider
   */
  async getProviderMeetings(
    providerId: number,
  ): Promise<any[]> {
    return this.prisma.meetings.findMany({
      where: { provider_id: providerId },
      include: {
        provider: {
          include: { user: true },
        },
        lsm: {
          include: { user: true },
        },
      },
      orderBy: { scheduled_start: 'asc' },
    });
  }

  /**
   * Get all meetings for an LSM
   */
  async getLsmMeetings(userId: number): Promise<any[]> {
    const lsm = await this.prisma.local_service_managers.findUnique({
      where: { user_id: userId },
    });

    if (!lsm) {
      throw new BadRequestException('LSM not found for this user');
    }

    return this.prisma.meetings.findMany({
      where: { lsm_id: lsm.id },
      include: {
        provider: {
          include: { user: true },
        },
        lsm: {
          include: { user: true },
        },
      },
      orderBy: { scheduled_start: 'asc' },
    });
  }

  /**
   * Get pending meetings (not confirmed/completed)
   */
  async getPendingMeetings(userId: number): Promise<any[]> {
    const lsm = await this.prisma.local_service_managers.findUnique({
      where: { user_id: userId },
    });

    if (!lsm) {
      throw new BadRequestException('LSM not found for this user');
    }

    return this.prisma.meetings.findMany({
      where: {
        lsm_id: lsm.id,
        meeting_status: {
          in: ['pending', 'scheduled'],
        },
      },
      include: {
        provider: {
          include: { user: true },
        },
      },
      orderBy: { scheduled_start: 'asc' },
    });
  }

  /**
   * Get meeting by ID
   */
  async getMeetingById(meetingId: string): Promise<any> {
    const meeting = await this.prisma.meetings.findUnique({
      where: { id: meetingId },
      include: {
        provider: {
          include: { user: true },
        },
        lsm: {
          include: { user: true },
        },
      },
    });

    if (!meeting) {
      throw new BadRequestException('Meeting not found');
    }

    return meeting;
  }

  /**
   * Reschedule a meeting
   */
  async rescheduleMeeting(
    meetingId: string,
    userId: number,
    dto: RescheduleMeetingDto,
  ): Promise<any> {
    try {
      const meeting = await this.getMeetingById(meetingId);

      // Get LSM
      const lsm = await this.prisma.local_service_managers.findUnique({
        where: { user_id: userId },
      });

      if (!lsm) {
        throw new BadRequestException('LSM not found for this user');
      }

      // Verify LSM owns this meeting
      if (meeting.lsm_id !== lsm.id) {
        throw new BadRequestException(
          'You do not have permission to reschedule this meeting',
        );
      }

      const newStartTime = new Date(dto.scheduled_start);
      const newEndTime = new Date(dto.scheduled_end);

      if (newStartTime >= newEndTime) {
        throw new BadRequestException(
          'Start time must be before end time',
        );
      }

      if (newStartTime < new Date()) {
        throw new BadRequestException(
          'Cannot schedule meeting in the past',
        );
      }

      // Calculate duration in minutes
      const duration = Math.ceil((newEndTime.getTime() - newStartTime.getTime()) / 60000);

      // Reschedule via Zoom API (PATCH request to update existing meeting)
      await this.zoomClient.rescheduleMeeting(
        meeting.zoom_meeting_id,
        newStartTime.toISOString(),
        duration,
        meeting.timezone,
      );

      // Update meeting in database
      const updatedMeeting = await this.prisma.meetings.update({
        where: { id: meetingId },
        data: {
          scheduled_start: newStartTime,
          scheduled_end: newEndTime,
          is_rescheduled: true,
          rescheduled_at: new Date(),
          meeting_status: 'scheduled',
        },
        include: {
          provider: {
            include: { user: true },
          },
          lsm: {
            include: { user: true },
          },
        },
      });

      this.logger.log(`✅ Zoom meeting rescheduled: ${meetingId}`);
      console.log(`
✅ Zoom Meeting rescheduled successfully!
🔗 Join Link (unchanged): ${meeting.zoom_join_url}
📅 New Time: ${newStartTime.toLocaleString()}
⏱️  Duration: ${duration} minutes
      `);

      return updatedMeeting;
    } catch (error) {
      this.logger.error('Failed to reschedule meeting', error);
      throw error;
    }
  }

  /**
   * Cancel a meeting
   */
  async cancelMeeting(
    meetingId: string,
    userId: number,
    reason?: string,
  ): Promise<any> {
    try {
      const meeting = await this.getMeetingById(meetingId);

      // Get LSM
      const lsm = await this.prisma.local_service_managers.findUnique({
        where: { user_id: userId },
      });

      if (!lsm) {
        throw new BadRequestException('LSM not found for this user');
      }

      // Verify LSM owns this meeting
      if (meeting.lsm_id !== lsm.id) {
        throw new BadRequestException(
          'You do not have permission to cancel this meeting',
        );
      }

      // Try to delete via Zoom API, but don't fail if it returns 400
      try {
        await this.zoomClient.deleteMeeting(meeting.zoom_meeting_id);
        this.logger.log(`✅ Zoom meeting deleted: ${meeting.zoom_meeting_id}`);
      } catch (zoomError) {
        // Log the error but continue - some meetings can't be deleted (already occurred, within 30 mins, etc)
        this.logger.warn(
          `⚠️  Could not delete Zoom meeting (may have already occurred or within 30 mins): ${meeting.zoom_meeting_id}`,
        );
      }

      // Update DB status to cancelled regardless of Zoom API result
      const cancelledMeeting = await this.prisma.meetings.update({
        where: { id: meetingId },
        data: {
          meeting_status: 'cancelled',
          meeting_description: reason
            ? `${meeting.meeting_description}\n\nCancellation Reason: ${reason}`
            : meeting.meeting_description,
        },
        include: {
          provider: {
            include: { user: true },
          },
          lsm: {
            include: { user: true },
          },
        },
      });

      this.logger.log(`✅ Meeting marked as cancelled in DB: ${meetingId}`);
      console.log(`
✅ Meeting cancelled successfully
Meeting ID: ${meetingId}
Zoom Meeting ID: ${meeting.zoom_meeting_id}
Provider: ${cancelledMeeting.provider.business_name}
Cancellation Reason: ${reason || 'Not specified'}
      `);

      return cancelledMeeting;
    } catch (error) {
      this.logger.error('Failed to cancel meeting', error);
      throw error;
    }
  }

  /**
   * Mark meeting as completed
   */
  async completeMeeting(
    meetingId: string,
    userId: number,
    notes?: string,
  ): Promise<any> {
    try {
      const meeting = await this.getMeetingById(meetingId);

      // Get LSM
      const lsm = await this.prisma.local_service_managers.findUnique({
        where: { user_id: userId },
      });

      if (!lsm) {
        throw new BadRequestException('LSM not found for this user');
      }

      // Verify LSM owns this meeting
      if (meeting.lsm_id !== lsm.id) {
        throw new BadRequestException(
          'You do not have permission to update this meeting',
        );
      }

      const completedMeeting = await this.prisma.meetings.update({
        where: { id: meetingId },
        data: {
          meeting_status: 'completed',
          meeting_description: notes
            ? `${meeting.meeting_description}\n\nMeeting Notes: ${notes}`
            : meeting.meeting_description,
        },
        include: {
          provider: {
            include: { user: true },
          },
          lsm: {
            include: { user: true },
          },
        },
      });

      this.logger.log(`Meeting marked as completed: ${meetingId}`);
      console.log(`
✅ Meeting marked as completed!
Meeting ID: ${meetingId}
Provider: ${completedMeeting.provider.business_name}
      `);

      return completedMeeting;
    } catch (error) {
      this.logger.error('Failed to complete meeting', error);
      throw error;
    }
  }
}
