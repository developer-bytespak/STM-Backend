import { ApiProperty } from '@nestjs/swagger';

export class MeetingResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  provider_id: number;

  @ApiProperty()
  lsm_id: number;

  @ApiProperty({ description: 'Zoom Meeting ID - required for reschedule/delete' })
  zoom_meeting_id: string;

  @ApiProperty({ description: 'Join URL for provider and LSM' })
  zoom_join_url: string;

  @ApiProperty({ description: 'Start URL for LSM to start meeting' })
  zoom_start_url: string;

  @ApiProperty()
  scheduled_start: Date;

  @ApiProperty()
  scheduled_end: Date;

  @ApiProperty()
  timezone: string;

  @ApiProperty()
  meeting_status: string;

  @ApiProperty()
  title?: string;

  @ApiProperty()
  meeting_description?: string;

  @ApiProperty()
  provider_email?: string;

  @ApiProperty()
  provider_business_name?: string;

  @ApiProperty()
  email_sent: boolean;

  @ApiProperty()
  email_sent_at?: Date;

  @ApiProperty()
  is_rescheduled: boolean;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;

}
