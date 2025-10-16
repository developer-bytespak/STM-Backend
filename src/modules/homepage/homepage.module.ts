import { Module } from '@nestjs/common';
import { HomepageController } from './homepage.controller';
import { PublicProvidersController } from './public-providers.controller';
import { HomepageService } from './homepage.service';

@Module({
  controllers: [HomepageController, PublicProvidersController],
  providers: [HomepageService],
  exports: [HomepageService],
})
export class HomepageModule {}

