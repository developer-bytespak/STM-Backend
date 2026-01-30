import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  Body,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../oauth/guards/jwt-auth.guard';
import { RolesGuard } from '../oauth/guards/roles.guard';
import { Roles } from '../oauth/decorators/roles.decorator';
import { CurrentUser } from '../oauth/decorators/current-user.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { SendNegotiationOfferDto, RespondToNegotiationDto } from './dto/negotiation.dto';

@Controller('chat')
@ApiTags('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * Get all chats for customer
   */
  @Get('customer/chats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all chats for current customer' })
  @ApiResponse({ status: 200, description: 'Chats retrieved successfully' })
  async getCustomerChats(@CurrentUser('id') userId: number) {
    return this.chatService.getCustomerChats(userId);
  }

  /**
   * Get all chats for provider
   */
  @Get('provider/chats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all chats for current provider' })
  @ApiResponse({ status: 200, description: 'Chats retrieved successfully' })
  async getProviderChats(@CurrentUser('id') userId: number) {
    return this.chatService.getProviderChats(userId);
  }

  /**
   * Get all chats for LSM (Local Service Manager)
   */
  @Get('lsm/chats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LSM)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all chats for current LSM' })
  @ApiResponse({ status: 200, description: 'Chats retrieved successfully' })
  async getLSMChats(@CurrentUser('id') userId: number) {
    return this.chatService.getLSMChats(userId);
  }

  /**
   * Get messages for a specific chat
   * Used for loading message history when opening a chat
   */
  @Get(':id/messages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all messages in a chat (message history)' })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Chat not found' })
  async getChatMessages(
    @CurrentUser('id') userId: number,
    @CurrentUser('role') userRole: string,
    @Param('id') chatId: string,
  ) {
    return this.chatService.getChatMessages(userId, chatId, userRole);
  }

  /**
   * Upload files for chat
   * Returns URLs of uploaded files that can be sent as messages
   */
  @Post('upload-files')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload files for chat messages' })
  @ApiResponse({ 
    status: 201, 
    description: 'Files uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        urls: {
          type: 'array',
          items: { type: 'string' },
          example: ['data:application/pdf;base64,JVBERi0xLj...', 'data:image/png;base64,iVBORw0KGgo...']
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid file or validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseInterceptors(FilesInterceptor('files', 10)) // Allow up to 10 files
  async uploadChatFiles(
    @CurrentUser('id') userId: number,
    @UploadedFiles() files: Array<{
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    }>,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    return this.chatService.uploadChatFiles(userId, files);
  }

  /**
   * Send negotiation offer (both provider and customer)
   */
  @Post('negotiation/send-offer')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send negotiation offer in chat (price, date, notes)' })
  @ApiResponse({ status: 200, description: 'Offer sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async sendNegotiationOffer(
    @CurrentUser('id') userId: number,
    @CurrentUser('role') userRole: string,
    @Body() dto: SendNegotiationOfferDto,
  ) {
    return this.chatService.sendNegotiationOffer(userId, userRole, dto);
  }

  /**
   * Respond to negotiation offer (accept, decline, counter)
   */
  @Post('negotiation/respond')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Respond to offer (accept, decline, counter)' })
  @ApiResponse({ status: 200, description: 'Response sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async respondToNegotiationOffer(
    @CurrentUser('id') userId: number,
    @CurrentUser('role') userRole: string,
    @Body() dto: RespondToNegotiationDto,
  ) {
    return this.chatService.respondToNegotiationOffer(userId, userRole, dto);
  }

  /**
   * Get negotiation history for a job
   */
  @Get('negotiation/job/:jobId/history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get negotiation history for a job' })
  @ApiResponse({ status: 200, description: 'Negotiation history retrieved' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getNegotiationHistory(
    @CurrentUser('id') userId: number,
    @Param('jobId') jobId: string,
  ) {
    return this.chatService.getNegotiationHistory(parseInt(jobId), userId);
  }

  // Note: Sending messages is now handled via Socket.IO (chat.gateway.ts)
  // Use the 'send_message' Socket.IO event for real-time messaging
}