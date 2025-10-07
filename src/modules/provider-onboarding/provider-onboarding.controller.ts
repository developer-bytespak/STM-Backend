import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ProviderOnboardingService } from './provider-onboarding.service';
import { JwtAuthGuard } from '../oauth/guards/jwt-auth.guard';
import { RolesGuard } from '../oauth/guards/roles.guard';
import { Roles } from '../oauth/decorators/roles.decorator';
import { CurrentUser } from '../oauth/decorators/current-user.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { UploadDocumentDto } from './dto/upload-document.dto';

@Controller('provider-onboarding')
@ApiTags('provider-onboarding')
export class ProviderOnboardingController {
  constructor(
    private readonly providerOnboardingService: ProviderOnboardingService,
  ) {}

  /**
   * Upload a document for service provider
   * Requires authentication and PROVIDER role
   */
  @Post('documents/upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a document for service provider verification' })
  @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only providers can upload' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @CurrentUser('id') userId: number,
    @UploadedFile() file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    },
    @Body() dto: UploadDocumentDto,
  ) {
    return this.providerOnboardingService.uploadDocument(
      userId,
      file,
      dto.description,
    );
  }

  /**
   * Get all documents for current provider
   */
  @Get('documents')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all documents for current provider' })
  @ApiResponse({ status: 200, description: 'Documents retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Provider profile not found' })
  async getMyDocuments(@CurrentUser('id') userId: number) {
    return this.providerOnboardingService.getMyDocuments(userId);
  }

  /**
   * Delete a document
   */
  @Delete('documents/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a document' })
  @ApiResponse({ status: 200, description: 'Document deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Can only delete own documents' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async deleteDocument(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) documentId: number,
  ) {
    return this.providerOnboardingService.deleteDocument(userId, documentId);
  }
}
