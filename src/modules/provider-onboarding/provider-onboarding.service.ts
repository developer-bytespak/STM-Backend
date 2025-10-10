import { 
  Injectable, 
  NotFoundException, 
  BadRequestException,
  ForbiddenException 
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ProviderOnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Upload a document for a service provider
   * @param userId - User ID from JWT token
   * @param file - Uploaded file (multipart)
   * @param description - Document description
   * @returns Created document record
   */
  async uploadDocument(
    userId: number,
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    },
    description: string,
  ) {
    // Verify user is a service provider
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      include: { service_provider: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'service_provider') {
      throw new ForbiddenException('Only service providers can upload documents');
    }

    if (!user.service_provider) {
      throw new NotFoundException('Service provider profile not found');
    }

    // Validate file
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File size must be less than 10MB');
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Only PDF, PNG, JPG, and DOCX files are allowed',
      );
    }

    // For now, store file as base64 (in production, use S3/cloud storage)
    const base64File = file.buffer.toString('base64');
    const filePath = `data:${file.mimetype};base64,${base64File}`;

    // If provider was rejected, automatically change status back to pending
    // This gives them a chance to resubmit after addressing LSM feedback
    if (user.service_provider.status === 'rejected') {
      await this.prisma.service_providers.update({
        where: { id: user.service_provider.id },
        data: {
          status: 'pending',
          // Keep rejection_reason for reference but status is now pending again
        },
      });
    }

    // Create document record
    const document = await this.prisma.provider_documents.create({
      data: {
        provider_id: user.service_provider.id,
        file_name: file.originalname,
        file_path: filePath,
        file_type: file.mimetype,
        file_size: file.size,
        description: description,
        status: 'pending',
      },
    });

    return {
      id: document.id,
      file_name: document.file_name,
      description: document.description,
      status: document.status,
      file_size: document.file_size,
      created_at: document.created_at,
      provider_status_updated: user.service_provider.status === 'rejected' ? 'pending' : null,
      message: user.service_provider.status === 'rejected' 
        ? 'Document uploaded successfully. Your application status has been changed to pending for review.'
        : 'Document uploaded successfully.',
    };
  }

  /**
   * Get all documents for current service provider
   * @param userId - User ID from JWT token
   * @returns List of documents
   */
  async getMyDocuments(userId: number) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      include: { service_provider: true },
    });

    if (!user || !user.service_provider) {
      throw new NotFoundException('Service provider profile not found');
    }

    const documents = await this.prisma.provider_documents.findMany({
      where: { provider_id: user.service_provider.id },
      select: {
        id: true,
        file_name: true,
        file_type: true,
        file_size: true,
        description: true,
        status: true,
        verified_at: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });

    return documents;
  }

  /**
   * Delete a document
   * @param userId - User ID from JWT token
   * @param documentId - Document ID to delete
   */
  async deleteDocument(userId: number, documentId: number) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      include: { service_provider: true },
    });

    if (!user || !user.service_provider) {
      throw new NotFoundException('Service provider profile not found');
    }

    // Verify document belongs to this provider
    const document = await this.prisma.provider_documents.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.provider_id !== user.service_provider.id) {
      throw new ForbiddenException('You can only delete your own documents');
    }

    await this.prisma.provider_documents.delete({
      where: { id: documentId },
    });

    return { message: 'Document deleted successfully' };
  }
}
