import { Module } from '@nestjs/common';
import { ServicesController } from './services.controller';
import { SearchMatchingService } from './search-matching.service';

@Module({
  controllers: [ServicesController],
  providers: [SearchMatchingService],
  exports: [SearchMatchingService],
})
export class ServicesModule {}

