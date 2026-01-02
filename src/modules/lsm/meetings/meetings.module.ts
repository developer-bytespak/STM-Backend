import { Module } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { MeetingsController } from './meetings.controller';
import { ZoomTokenService } from './services/zoom.token.service';
import { ZoomClientService } from './services/zoom-client.service';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [MeetingsController],
  providers: [MeetingsService, ZoomTokenService, ZoomClientService, PrismaService],
  exports: [MeetingsService, ZoomTokenService, ZoomClientService],
})
export class MeetingsModule {}
