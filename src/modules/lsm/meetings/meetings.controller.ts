import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { MeetingsService } from './meetings.service';
import { ScheduleMeetingDto } from './dto/schedule-meeting.dto';
import { RescheduleMeetingDto } from './dto/reschedule-meeting.dto';
import { MeetingResponseDto } from './dto/meeting-response.dto';
import { JwtAuthGuard } from '../../oauth/guards/jwt-auth.guard';
import { RolesGuard } from '../../oauth/guards/roles.guard';
import { Roles } from '../../oauth/decorators/roles.decorator';
import { CurrentUser } from '../../oauth/decorators/current-user.decorator';
import { UserRole } from '../../users/enums/user-role.enum';

@Controller('lsm/meetings')
@ApiTags('LSM Meetings')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  /**
   * Schedule a new meeting with a provider
   */
  @Post('schedule')
  @Roles(UserRole.LSM)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Schedule a meeting with a provider' })
  @ApiResponse({
    status: 201,
    description: 'Meeting scheduled successfully',
    type: MeetingResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid data provided' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async scheduleMeeting(
    @CurrentUser('id') userId: number,
    @Body() dto: ScheduleMeetingDto,
  ) {
    return this.meetingsService.scheduleMeeting(userId, dto);
  }

  /**
   * Get all meetings for current LSM
   */
  @Get()
  @Roles(UserRole.LSM)
  @ApiOperation({ summary: 'Get all meetings for current LSM' })
  @ApiResponse({
    status: 200,
    description: 'Meetings retrieved successfully',
    type: [MeetingResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMeetings(@CurrentUser('id') lsmId: number) {
    return this.meetingsService.getLsmMeetings(lsmId);
  }

  /**
   * Get pending meetings (not confirmed/completed)
   */
  @Get('pending')
  @Roles(UserRole.LSM)
  @ApiOperation({ summary: 'Get pending meetings for current LSM' })
  @ApiResponse({
    status: 200,
    description: 'Pending meetings retrieved successfully',
    type: [MeetingResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPendingMeetings(@CurrentUser('id') lsmId: number) {
    return this.meetingsService.getPendingMeetings(lsmId);
  }

  /**
   * Get a specific meeting by ID
   */
  @Get(':id')
  @Roles(UserRole.LSM)
  @ApiOperation({ summary: 'Get a specific meeting by ID' })
  @ApiResponse({
    status: 200,
    description: 'Meeting retrieved successfully',
    type: MeetingResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Meeting not found' })
  async getMeetingById(@Param('id') meetingId: string) {
    return this.meetingsService.getMeetingById(meetingId);
  }

  /**
   * Reschedule a meeting
   */
  @Patch(':id/reschedule')
  @Roles(UserRole.LSM)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reschedule a meeting' })
  @ApiResponse({
    status: 200,
    description: 'Meeting rescheduled successfully',
    type: MeetingResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid data provided' })
  @ApiResponse({ status: 404, description: 'Meeting not found' })
  async rescheduleMeeting(
    @CurrentUser('id') userId: number,
    @Param('id') meetingId: string,
    @Body() dto: RescheduleMeetingDto,
  ) {
    return this.meetingsService.rescheduleMeeting(meetingId, userId, dto);
  }

  /**
   * Complete a meeting
   */
  @Patch(':id/complete')
  @Roles(UserRole.LSM)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a meeting as completed' })
  @ApiResponse({
    status: 200,
    description: 'Meeting marked as completed',
    type: MeetingResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Meeting not found' })
  async completeMeeting(
    @CurrentUser('id') userId: number,
    @Param('id') meetingId: string,
    @Body('notes') notes?: string,
  ) {
    return this.meetingsService.completeMeeting(meetingId, userId, notes);
  }

  /**
   * Cancel a meeting
   */
  @Delete(':id')
  @Roles(UserRole.LSM)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a meeting' })
  @ApiResponse({
    status: 200,
    description: 'Meeting cancelled successfully',
    type: MeetingResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Meeting not found' })
  async cancelMeeting(
    @CurrentUser('id') userId: number,
    @Param('id') meetingId: string,
    @Body('reason') reason?: string,
  ) {
    return this.meetingsService.cancelMeeting(meetingId, userId, reason);
  }
}
