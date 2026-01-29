import { Module, forwardRef } from '@nestjs/common';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';
import { ProvidersImagesService } from './providers-images.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [forwardRef(() => NotificationsModule)],
  controllers: [ProvidersController],
  providers: [ProvidersService, ProvidersImagesService],
  exports: [ProvidersService, ProvidersImagesService],
})
export class ProvidersModule {}