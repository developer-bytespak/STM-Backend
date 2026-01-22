import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../oauth/guards/jwt-auth.guard';
import { RolesGuard } from '../oauth/guards/roles.guard';
import { Roles } from '../oauth/decorators';
import { UserRole } from '../users/enums/user-role.enum';
import { JobImagesService } from './job-images.service';

@Controller('jobs')
@ApiTags('Job Images')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class JobImagesController {
  constructor(private readonly jobImagesService: JobImagesService) {}

  /**
   * Upload job request images (customer only)
   */
  @Post('images/upload')
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Upload job request images (Customer only)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('images', 10)) // Max 10 images
  async uploadJobImages(
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<{ imageUrls: string[] }> {
    return this.jobImagesService.uploadJobImages(files);
  }
}
