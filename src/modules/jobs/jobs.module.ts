import { Module, forwardRef } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { JobImagesController } from './job-images.controller';
import { JobImagesService } from './job-images.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailService } from '../shared/services/email.service';

@Module({
  imports: [forwardRef(() => NotificationsModule)],
  controllers: [JobsController, JobImagesController],
  providers: [JobsService, JobImagesService, EmailService],
  exports: [JobsService],
})
export class JobsModule {}
