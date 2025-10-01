import { Controller } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // Chat Controller - Messaging and call tracking endpoints
  // TODO: Implement messaging, call logs, real-time chat via Socket.io
}

