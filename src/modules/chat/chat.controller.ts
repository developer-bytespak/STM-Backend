import {
  Controller,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../oauth/guards/jwt-auth.guard';
import { RolesGuard } from '../oauth/guards/roles.guard';
import { Roles } from '../oauth/decorators/roles.decorator';
import { CurrentUser } from '../oauth/decorators/current-user.decorator';
import { UserRole } from '../users/enums/user-role.enum';

@Controller()
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
   * Get messages for a specific chat
   * Used for loading message history when opening a chat
   */
  @Get('chat/:id/messages')
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

  // Note: Sending messages is now handled via Socket.IO (chat.gateway.ts)
  // Use the 'send_message' Socket.IO event for real-time messaging
}