import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AiChatService } from './ai-chat.service';
import { ChatService } from '../chat/chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { RecommendProvidersDto } from './dto/recommend-providers.dto';
import { CreateChatFromAiDto } from './dto/create-chat-from-ai.dto';
import { JwtAuthGuard } from '../oauth/guards/jwt-auth.guard';
import { RolesGuard } from '../oauth/guards/roles.guard';
import { Roles } from '../oauth/decorators/roles.decorator';
import { CurrentUser } from '../oauth/decorators/current-user.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { RateLimitInterceptor } from '../../common/interceptors/rate-limit.interceptor';

@ApiTags('AI Chat')
@Controller('customer/ai-chat')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(RateLimitInterceptor)
@Roles(UserRole.CUSTOMER)
@ApiBearerAuth()
export class AiChatController {
  constructor(
    private readonly aiChatService: AiChatService,
    private readonly chatService: ChatService,
  ) {}

  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new AI chat session' })
  @ApiResponse({ status: 201, description: 'Session created successfully' })
  @ApiResponse({ status: 404, description: 'Customer profile not found' })
  async createSession(@CurrentUser('id') userId: number) {
    return this.aiChatService.createSession(userId);
  }

  @Get('sessions/active')
  @ApiOperation({ summary: 'Get active AI chat session' })
  @ApiResponse({ status: 200, description: 'Active session retrieved' })
  @ApiResponse({ status: 404, description: 'No active session found' })
  async getActiveSession(@CurrentUser('id') userId: number) {
    return this.aiChatService.getActiveSession(userId);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Get AI chat session history' })
  @ApiResponse({ status: 200, description: 'Session history retrieved' })
  async getSessionHistory(@CurrentUser('id') userId: number) {
    return this.aiChatService.getSessionHistory(userId);
  }

  @Get('sessions/:sessionId')
  @ApiOperation({ summary: 'Get a specific AI chat session by ID' })
  @ApiResponse({ status: 200, description: 'Session retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getSessionById(
    @Param('sessionId') sessionId: string,
    @CurrentUser('id') userId: number,
  ) {
    return this.aiChatService.getSessionById(sessionId, userId);
  }

  @Post('sessions/:sessionId/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a message to AI assistant' })
  @ApiResponse({ status: 201, description: 'Message sent and AI response received' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @ApiResponse({ status: 400, description: 'Session is not active' })
  async sendMessage(
    @Param('sessionId') sessionId: string,
    @CurrentUser('id') userId: number,
    @Body() dto: SendMessageDto,
  ) {
    return this.aiChatService.sendMessage(sessionId, userId, dto);
  }

  @Post('sessions/:sessionId/summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate summary from conversation' })
  @ApiResponse({ status: 200, description: 'Summary generated successfully' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @ApiResponse({ status: 400, description: 'Failed to generate summary' })
  async generateSummary(
    @Param('sessionId') sessionId: string,
    @CurrentUser('id') userId: number,
    @Body() body?: { service?: string; zipcode?: string; budget?: string; requirements?: string },
  ) {
    const collectedData = body ? {
      service: body.service || null,
      zipcode: body.zipcode || null,
      budget: body.budget || null,
      requirements: body.requirements || null,
    } : undefined;
    return this.aiChatService.generateSummary(sessionId, userId, collectedData);
  }

  @Post('sessions/:sessionId/extract')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Extract structured data from conversation using AI' })
  @ApiResponse({ status: 200, description: 'Data extracted successfully' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async extractData(
    @Param('sessionId') sessionId: string,
    @CurrentUser('id') userId: number,
  ) {
    return this.aiChatService.extractDataFromConversation(sessionId, userId);
  }

  @Post('sessions/:sessionId/end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End an AI chat session' })
  @ApiResponse({ status: 200, description: 'Session ended successfully' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async endSession(
    @Param('sessionId') sessionId: string,
    @CurrentUser('id') userId: number,
  ) {
    return this.aiChatService.endSession(sessionId, userId);
  }

  @Post('providers/recommend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get top 3 recommended providers' })
  @ApiResponse({ status: 200, description: 'Providers recommended successfully' })
  async getRecommendedProviders(@Body() dto: RecommendProvidersDto) {
    return this.aiChatService.getRecommendedProviders(dto);
  }

  @Get('services/:serviceName/price-range')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get actual price range for a service from provider data' })
  @ApiResponse({ status: 200, description: 'Price range retrieved successfully' })
  async getServicePriceRange(@Param('serviceName') serviceName: string) {
    return this.aiChatService.getServicePriceRange(serviceName);
  }

  @Post('chats/create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a chat from AI flow with summary injection' })
  @ApiResponse({ status: 201, description: 'Chat created successfully' })
  @ApiResponse({ status: 404, description: 'Session or provider not found' })
  @ApiResponse({ status: 400, description: 'Unpaid job exists - payment required' })
  async createChatFromAI(
    @CurrentUser('id') userId: number,
    @Body() dto: CreateChatFromAiDto,
  ) {
    console.log('[AI Chat Controller] Creating chat from AI flow for user:', userId);
    console.log('[AI Chat Controller] DTO:', JSON.stringify(dto, null, 2));
    
    try {
      // Get session summary and extracted data
      const session = await this.aiChatService.getSessionById(dto.aiSessionId, userId);
      
      if (!session.summary) {
        throw new Error('Session summary not found. Please generate summary first.');
      }

      console.log('[AI Chat Controller] Session summary found, length:', session.summary.length);

      // Extract data from conversation for job creation
      const extractedData = await this.aiChatService.extractDataFromConversation(dto.aiSessionId, userId);
      
      console.log('[AI Chat Controller] Extracted data:', JSON.stringify(extractedData, null, 2));
      console.log('[AI Chat Controller] Images received:', dto.images?.length || 0);

      // Create chat with AI summary injection
      return this.chatService.createChatFromAI(
        userId,
        dto.providerId,
        session.session_id,
        session.summary,
        extractedData, // Pass extracted data for job creation
        dto.images, // Pass customer uploaded images
      );
    } catch (error) {
      // Handle unpaid job error specifically
      if (error.response && error.response.statusCode === 400 && error.response.message?.includes('unpaid job')) {
        // Extract job ID from error message (format: "You have an unpaid job (#30 - Service Name)")
        const jobIdMatch = error.response.message.match(/#(\d+)/);
        const unpaidJobId = jobIdMatch ? parseInt(jobIdMatch[1]) : null;
        
        throw new BadRequestException({
          message: error.response.message,
          unpaidJobId: unpaidJobId,
          requiresPayment: true,
        });
      }
      
      // Re-throw other errors
      throw error;
    }
  }
}

