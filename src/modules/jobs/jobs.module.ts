import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { JobImagesController } from './job-images.controller';
import { JobImagesService } from './job-images.service';

@Module({
  controllers: [JobsController, JobImagesController],
  providers: [JobsService, JobImagesService],
  exports: [JobsService],
})
export class JobsModule {}
