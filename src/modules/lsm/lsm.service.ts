import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RejectServiceRequestDto } from './dto/reject-service-request.dto';
import { DocumentActionDto, DocumentAction } from './dto/document-action.dto';

@Injectable()
export class LsmService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get pending service requests in LSM's region
   */
  async getPendingServiceRequests(userId: number) {
    const lsm = await this.prisma.local_service_managers.findUnique({
      where: { user_id: userId },
    });

    if (!lsm) {
      throw new NotFoundException('LSM profile not found');
    }

    const requests = await this.prisma.service_requests.findMany({
      where: {
        region: lsm.region,
        final_status: 'pending',
        lsm_approved: false,
      },
      include: {
        provider: {
          include: {
            user: {
              select: {
                first_name: true,
                last_name: true,
                email: true,
                phone_number: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return requests.map((req) => ({
      id: req.id,
      serviceName: req.service_name,
      category: req.category,
      description: req.description,
      provider: {
        id: req.provider.id,
        businessName: req.provider.business_name,
        user: req.provider.user,
      },
      created_at: req.created_at,
    }));
  }

  /**
   * Approve a service request (sends to admin)
   */
  async approveServiceRequest(userId: number, requestId: number) {
    const lsm = await this.prisma.local_service_managers.findUnique({
      where: { user_id: userId },
    });

    if (!lsm) {
      throw new NotFoundException('LSM profile not found');
    }

    const request = await this.prisma.service_requests.findUnique({
      where: { id: requestId },
      include: {
        provider: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Service request not found');
    }

    // Verify request is in LSM's region
    if (request.region !== lsm.region) {
      throw new ForbiddenException('This request is not in your region');
    }

    if (request.lsm_approved) {
      throw new BadRequestException('Request already approved by LSM');
    }

    // Update request
    const updated = await this.prisma.service_requests.update({
      where: { id: requestId },
      data: {
        lsm_approved: true,
        lsm_reviewed_by: userId,
        lsm_reviewed_at: new Date(),
      },
    });

    // Notify all admins
    const admins = await this.prisma.admin.findMany({
      include: { user: true },
    });

    for (const admin of admins) {
      await this.prisma.notifications.create({
        data: {
          recipient_type: 'admin',
          recipient_id: admin.user_id,
          type: 'system',
          title: 'Service Request Needs Approval',
          message: `LSM approved: ${request.service_name} in ${request.category}`,
        },
      });
    }

    return {
      id: updated.id,
      status: 'pending_admin_approval',
      message: 'Service request approved and sent to admin for final approval',
    };
  }

  /**
   * Reject a service request
   */
  async rejectServiceRequest(
    userId: number,
    requestId: number,
    dto: RejectServiceRequestDto,
  ) {
    const lsm = await this.prisma.local_service_managers.findUnique({
      where: { user_id: userId },
    });

    if (!lsm) {
      throw new NotFoundException('LSM profile not found');
    }

    const request = await this.prisma.service_requests.findUnique({
      where: { id: requestId },
      include: {
        provider: {
          include: { user: true },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Service request not found');
    }

    if (request.region !== lsm.region) {
      throw new ForbiddenException('This request is not in your region');
    }

    // Update request
    const updated = await this.prisma.service_requests.update({
      where: { id: requestId },
      data: {
        final_status: 'rejected',
        lsm_reviewed_by: userId,
        lsm_reviewed_at: new Date(),
        lsm_rejection_reason: dto.reason,
        reviewed: true,
      },
    });

    // Notify provider
    await this.prisma.notifications.create({
      data: {
        recipient_type: 'service_provider',
        recipient_id: request.provider.user_id,
        type: 'system',
        title: 'Service Request Rejected',
        message: `Your request for "${request.service_name}" was rejected. Reason: ${dto.reason}`,
      },
    });

    return {
      id: updated.id,
      status: 'rejected',
      reason: dto.reason,
      message: 'Service request rejected',
    };
  }

  /**
   * Get all providers in LSM's region
   */
  async getProvidersInRegion(userId: number) {
    const lsm = await this.prisma.local_service_managers.findUnique({
      where: { user_id: userId },
    });

    if (!lsm) {
      throw new NotFoundException('LSM profile not found');
    }

    const providers = await this.prisma.service_providers.findMany({
      where: { lsm_id: lsm.id },
      include: {
        user: {
          select: {
            first_name: true,
            last_name: true,
            email: true,
            phone_number: true,
          },
        },
        service_areas: true,
        provider_services: {
          include: {
            service: {
              select: {
                name: true,
                category: true,
              },
            },
          },
        },
        _count: {
          select: {
            jobs: true,
            documents: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return providers.map((provider) => ({
      id: provider.id,
      businessName: provider.business_name,
      status: provider.status,
      rating: parseFloat(provider.rating.toString()),
      experience: provider.experience,
      totalJobs: provider.total_jobs,
      user: provider.user,
      serviceAreas: provider.service_areas.map((area) => area.zipcode),
      services: provider.provider_services.map((ps) => ps.service),
      documentCount: provider._count.documents,
      jobCount: provider._count.jobs,
      created_at: provider.created_at,
    }));
  }

  /**
   * Handle document verification/rejection
   */
  async handleDocument(
    userId: number,
    providerId: number,
    documentId: number,
    dto: DocumentActionDto,
  ) {
    const lsm = await this.prisma.local_service_managers.findUnique({
      where: { user_id: userId },
    });

    if (!lsm) {
      throw new NotFoundException('LSM profile not found');
    }

    // Verify provider is in LSM's region
    const provider = await this.prisma.service_providers.findUnique({
      where: { id: providerId },
      include: { user: true },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    if (provider.lsm_id !== lsm.id) {
      throw new ForbiddenException('This provider is not in your region');
    }

    // Get document
    const document = await this.prisma.provider_documents.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.provider_id !== providerId) {
      throw new BadRequestException('Document does not belong to this provider');
    }

    if (dto.action === DocumentAction.REJECT && !dto.reason) {
      throw new BadRequestException('Rejection reason is required');
    }

    // Update document
    const updated = await this.prisma.provider_documents.update({
      where: { id: documentId },
      data: {
        status: dto.action === DocumentAction.VERIFY ? 'verified' : 'rejected',
        verified_by: userId,
        verified_at: new Date(),
      },
    });

    // Notify provider
    await this.prisma.notifications.create({
      data: {
        recipient_type: 'service_provider',
        recipient_id: provider.user_id,
        type: 'system',
        title:
          dto.action === DocumentAction.VERIFY
            ? 'Document Verified'
            : 'Document Rejected',
        message:
          dto.action === DocumentAction.VERIFY
            ? `Your document "${document.file_name}" has been verified`
            : `Your document "${document.file_name}" was rejected. Reason: ${dto.reason}`,
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      action: dto.action,
      message:
        dto.action === DocumentAction.VERIFY
          ? 'Document verified successfully'
          : 'Document rejected',
    };
  }
}