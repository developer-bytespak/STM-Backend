import { Module } from '@nestjs/common';
import { LsmController } from './lsm.controller';
import { LsmService } from './lsm.service';

@Module({
  controllers: [LsmController],
  providers: [LsmService],
  exports: [LsmService],
})
export class LsmModule {}