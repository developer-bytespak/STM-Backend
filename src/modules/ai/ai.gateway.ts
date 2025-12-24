import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { AiService } from './ai.service';

@WebSocketGateway({
  namespace: '/ai',
  cors: true,
})
export class AiGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AiGateway.name);

  constructor(private aiService: AiService) {}

  handleConnection(client: Socket) {
    this.logger.log(`AI client connected - Socket ID: ${client.id}`);
    client.emit('connected', { message: 'Connected to SPS AI assistant' });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`AI client disconnected - Socket ID: ${client.id}`);
  }

  @SubscribeMessage('ai_message')
  async handleAiMessage(
    @MessageBody() data: { message: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      if (!data || !data.message) {
        client.emit('ai_response', { error: 'Message is required' });
        return;
      }

      // Call AiService to get LLM answer
      const reply = await this.aiService.askAgent(data.message);

      // Return to this socket only
      client.emit('ai_response', { message: reply });
    } catch (err) {
      this.logger.error('AI handler error', (err as Error).message);
      client.emit('ai_response', { error: 'AI processing failed' });
    }
  }
}
