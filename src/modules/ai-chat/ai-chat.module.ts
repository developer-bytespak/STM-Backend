import { Module, forwardRef } from '@nestjs/common';
import { AiChatController } from './ai-chat.controller';
import { AiChatService } from './ai-chat.service';
import { AiModule } from '../ai/ai.module';
import { HomepageModule } from '../homepage/homepage.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [forwardRef(() => AiModule), HomepageModule, ChatModule],
  controllers: [AiChatController],
  providers: [AiChatService],
  exports: [AiChatService],
})
export class AiChatModule {}

