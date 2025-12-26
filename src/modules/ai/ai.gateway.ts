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
import { JwtService } from '@nestjs/jwt';
import { AiService } from './ai.service';
import { AiChatService } from '../ai-chat/ai-chat.service';

@WebSocketGateway({
  namespace: '/ai',
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        process.env.FRONTEND_URL,
        'https://stm-frontend.vercel.app',
      ].filter(Boolean);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) return callback(null, true);
      if (origin.match(/https:\/\/.*\.vercel\.app$/)) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class AiGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AiGateway.name);

  constructor(
    private aiService: AiService,
    private aiChatService: AiChatService,
    private jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Extract JWT from handshake
      const token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        this.logger.warn('AI connection rejected: No token provided');
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      // Verify token
      let payload;
      try {
        payload = await this.jwtService.verifyAsync(token, {
          secret: process.env.JWT_SECRET,
        });
      } catch (tokenError: any) {
        this.logger.warn(`AI connection rejected: Token error - ${tokenError.message}`);
        client.emit('error', { 
          message: 'Authentication failed - ' + (tokenError.message || 'Invalid token'),
          code: tokenError.name 
        });
        client.disconnect();
        return;
      }

      if (!payload || !payload.sub) {
        this.logger.warn('AI connection rejected: Invalid token payload');
        client.emit('error', { message: 'Invalid authentication' });
        client.disconnect();
        return;
      }

      // Store user info in socket data
      client.data.userId = payload.sub;
      client.data.userRole = payload.role;

      this.logger.log(
        `✅ AI client connected - User ${payload.sub} (${payload.role}) - Socket ID: ${client.id}`,
      );
      client.emit('connected', { message: 'Connected to SPS AI assistant', userId: payload.sub });
    } catch (error) {
      this.logger.error('AI auth failed:', error);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`AI client disconnected - Socket ID: ${client.id}`);
  }

  @SubscribeMessage('message')
  async handleAiMessage(
    @MessageBody() data: { message: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = client.data.userId;
      
      if (!userId) {
        this.logger.warn('AI message rejected: No user in socket data');
        client.emit('ai-response', { error: 'Authentication required' });
        return;
      }

      if (!data || !data.message) {
        this.logger.warn(`AI message rejected: Empty message from user ${userId}`);
        client.emit('ai-response', { error: 'Message is required' });
        return;
      }

      this.logger.log(`📨 User ${userId} sending AI message: "${data.message.substring(0, 50)}..."`);

      // Get or create active AI chat session
      let session = await this.aiChatService.getActiveSession(userId);
      
      if (!session) {
        this.logger.log(`Creating new AI session for user ${userId}`);
        const newSession = await this.aiChatService.createSession(userId);
        // Fetch full session with messages
        session = await this.aiChatService.getActiveSession(userId);
        if (!session) {
          throw new Error('Failed to retrieve created session');
        }
      }

      // Send message and persist via AiChatService
      const result = await this.aiChatService.sendMessage(
        session.sessionId,
        userId,
        { message: data.message },
      );

      // Emit AI response back to socket
      client.emit('ai-response', {
        message: result.aiMessage.message,
        sessionId: session.sessionId,
      });

      this.logger.log(`✅ AI response sent to user ${userId}`);
    } catch (error) {
      this.logger.error('Error handling AI message:', error);
      client.emit('ai-response', {
        error: 'Failed to process message. ' + (error instanceof Error ? error.message : 'Unknown error'),
      });
    }
  }
}
