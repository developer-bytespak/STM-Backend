import {
  Controller,
  Get,
  Post,
  Body,
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
import { SendMessageDto } from './dto/send-message.dto';
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
   */
  @Get('chat/:id/messages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all messages in a chat' })
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
   * Send a message in a chat
   */
  @Post('chat/:id/messages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send a message in a chat' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Chat not found' })
  async sendMessage(
    @CurrentUser('id') userId: number,
    @CurrentUser('role') userRole: string,
    @Param('id') chatId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(userId, chatId, dto, userRole);
  }
}