import { Module } from '@nestjs/common';
import { LsmController } from './lsm.controller';
import { LsmService } from './lsm.service';
import { MeetingsModule } from './meetings/meetings.module';

@Module({
  imports: [MeetingsModule],
  controllers: [LsmController],
  providers: [LsmService],
  exports: [LsmService],
})
export class LsmModule {}