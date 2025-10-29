import { Module } from '@nestjs/common';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';
import { ProvidersImagesService } from './providers-images.service';

@Module({
  controllers: [ProvidersController],
  providers: [ProvidersService, ProvidersImagesService],
  exports: [ProvidersService, ProvidersImagesService],
})
export class ProvidersModule {}