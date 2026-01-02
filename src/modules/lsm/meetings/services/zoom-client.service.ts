import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { ZoomTokenService } from './zoom.token.service';

interface ZoomMeetingResponse {
  id: number;
  uuid: string;
  host_id: string;
  host_email: string;
  topic: string;
  type: number;
  status: string;
  start_time: string;
  duration: number;
  timezone: string;
  created_at: string;
  join_url: string;
  start_url: string;
  password: string;
  h323_password: string;
  pstn_password: string;
  settings?: any;
}

interface CreateMeetingPayload {
  topic: string;
  type?: number; // 1 = instant, 2 = scheduled (default: 2)
  start_time: string; // RFC3339 format
  duration: number; // minutes
  timezone?: string;
  password?: string;
  settings?: {
    host_video?: boolean;
    participant_video?: boolean;
    cn_meeting?: boolean;
    in_meeting?: boolean;
    join_before_host?: boolean;
    mute_upon_entry?: boolean;
    watermark?: boolean;
    use_pmi?: boolean;
    waiting_room?: boolean;
    approval_type?: number;
    audio?: string;
    auto_recording?: string;
    enforce_login?: boolean;
    registrants_confirmation_email?: boolean;
  };
}

@Injectable()
export class ZoomClientService {
  private readonly logger = new Logger(ZoomClientService.name);
  private axiosInstance: AxiosInstance;
  private apiBase: string;

  constructor(
    private configService: ConfigService,
    private tokenService: ZoomTokenService,
  ) {
    this.apiBase = this.configService.get<string>('ZOOM_API_BASE') || 'https://api.zoom.us/v2';
    this.initializeAxios();
  }

  private initializeAxios() {
    this.axiosInstance = axios.create({
      baseURL: this.apiBase,
      timeout: 10000,
    });

    // Add token to all requests
    this.axiosInstance.interceptors.request.use(async (config) => {
      const token = await this.tokenService.getToken();
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
  }

  /**
   * Create a new Zoom meeting
   */
  async createMeeting(payload: CreateMeetingPayload): Promise<ZoomMeetingResponse> {
    try {
      this.logger.log(`Creating Zoom meeting: ${payload.topic}`);

      const response = await this.axiosInstance.post<ZoomMeetingResponse>(
        '/users/me/meetings',
        {
          topic: payload.topic,
          type: payload.type || 2, // Scheduled by default
          start_time: payload.start_time,
          duration: payload.duration,
          timezone: payload.timezone || 'UTC',
          password: payload.password || this.generatePassword(),
          settings: payload.settings || this.getDefaultSettings(),
        },
      );

      this.logger.log(`✅ Zoom meeting created: ${response.data.id}`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to create Zoom meeting', error);
      throw new BadRequestException('Failed to create Zoom meeting');
    }
  }

  /**
   * Reschedule an existing Zoom meeting
   */
  async rescheduleMeeting(
    meetingId: string,
    startTime: string,
    duration: number,
    timezone?: string,
  ): Promise<void> {
    try {
      this.logger.log(`Rescheduling Zoom meeting: ${meetingId}`);

      await this.axiosInstance.patch(`/meetings/${meetingId}`, {
        start_time: startTime,
        duration: duration,
        timezone: timezone || 'UTC',
      });

      this.logger.log(`✅ Zoom meeting rescheduled: ${meetingId}`);
    } catch (error) {
      this.logger.error(`Failed to reschedule Zoom meeting: ${meetingId}`, error);
      throw new BadRequestException('Failed to reschedule Zoom meeting');
    }
  }

  /**
   * Delete a Zoom meeting
   */
  async deleteMeeting(meetingId: string): Promise<void> {
    try {
      this.logger.log(`Deleting Zoom meeting: ${meetingId}`);

      await this.axiosInstance.delete(`/meetings/${meetingId}`);

      this.logger.log(`✅ Zoom meeting deleted: ${meetingId}`);
    } catch (error) {
      this.logger.error(`Failed to delete Zoom meeting: ${meetingId}`, error);
      throw new BadRequestException('Failed to delete Zoom meeting');
    }
  }

  /**
   * Get meeting details
   */
  async getMeetingDetails(meetingId: string): Promise<ZoomMeetingResponse> {
    try {
      const response = await this.axiosInstance.get<ZoomMeetingResponse>(
        `/meetings/${meetingId}`,
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch Zoom meeting details: ${meetingId}`, error);
      throw new BadRequestException('Failed to fetch Zoom meeting details');
    }
  }

  /**
   * Generate a random password for the meeting
   */
  private generatePassword(): string {
    return Math.random().toString(36).substring(2, 11).toUpperCase();
  }

  /**
   * Default meeting settings for secure meetings
   */
  private getDefaultSettings() {
    return {
      host_video: true,
      participant_video: true,
      cn_meeting: false,
      in_meeting: true,
      join_before_host: false,
      mute_upon_entry: false,
      watermark: false,
      use_pmi: false,
      waiting_room: false,
      approval_type: 0, // Automatically approve
      audio: 'both', // both, telephony, voip
      auto_recording: 'none', // none, local, cloud
      enforce_login: false,
      registrants_confirmation_email: false,
    };
  }
}
