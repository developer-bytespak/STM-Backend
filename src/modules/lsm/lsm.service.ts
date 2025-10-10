import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RejectServiceRequestDto } from './dto/reject-service-request.dto';
import { DocumentActionDto, DocumentAction } from './dto/document-action.dto';
import { SetProviderStatusDto } from './dto/set-provider-status.dto';
import { RequestBanDto } from './dto/request-ban.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';

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

    // Notify provider about document status
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
            : `Your document "${document.file_name}" was rejected. Reason: ${dto.reason}. Please re-upload the correct document.`,
      },
    });

    // NOTE: Auto-activation disabled - LSM must manually approve onboarding
    // Check if all documents are verified and notify LSM
    if (dto.action === DocumentAction.VERIFY && provider.status === 'pending') {
      const totalDocuments = await this.prisma.provider_documents.count({
        where: { provider_id: providerId },
      });

      const verifiedDocuments = await this.prisma.provider_documents.count({
        where: {
          provider_id: providerId,
          status: 'verified',
        },
      });

      const MIN_REQUIRED_DOCS = 2;

      // If all documents verified, notify LSM to approve onboarding
      if (totalDocuments >= MIN_REQUIRED_DOCS && verifiedDocuments === totalDocuments) {
        await this.prisma.notifications.create({
          data: {
            recipient_type: 'local_service_manager',
            recipient_id: userId,
            type: 'system',
            title: 'Provider Ready for Approval',
            message: `All documents verified for "${provider.business_name}". You can now approve their onboarding.`,
          },
        });

        return {
          id: updated.id,
          status: updated.status,
          action: dto.action,
          providerStatus: provider.status,
          message: 'Document verified successfully. All documents verified - provider ready for onboarding approval.',
        };
      }
    }

    // Document rejected - status remains pending
    if (dto.action === DocumentAction.REJECT) {
      return {
        id: updated.id,
        status: updated.status,
        action: dto.action,
        providerStatus: provider.status,
        message: 'Document rejected. Provider must re-upload. Account status remains pending.',
      };
    }

    return {
      id: updated.id,
      status: updated.status,
      action: dto.action,
      providerStatus: provider.status,
      message:
        dto.action === DocumentAction.VERIFY
          ? 'Document verified successfully'
          : 'Document rejected',
    };
  }

  // ==================== DASHBOARD ====================

  /**
   * Get LSM dashboard overview for their region
   */
  async getDashboard(userId: number) {
    const lsm = await this.prisma.local_service_managers.findUnique({
      where: { user_id: userId },
    });

    if (!lsm) {
      throw new NotFoundException('LSM profile not found');
    }

    // Execute all queries in parallel
    const [
      providerStats,
      jobStats,
      pendingServiceRequests,
      disputeStats,
      recentActivity,
    ] = await Promise.all([
      // Provider statistics
      this.prisma.service_providers.groupBy({
        by: ['status'],
        where: { lsm_id: lsm.id },
        _count: true,
      }),

      // Job statistics (via providers in region)
      this.getJobStatsForRegion(lsm.id),

      // Pending service requests
      this.prisma.service_requests.count({
        where: {
          region: lsm.region,
          lsm_approved: false,
          final_status: 'pending',
        },
      }),

      // Dispute statistics
      this.getDisputeStatsForRegion(lsm.id),

      // Recent activity (last 24 hours)
      this.getRecentActivityForRegion(lsm.id),
    ]);

    // Process provider stats
    const providerCounts = { pending: 0, active: 0, inactive: 0, banned: 0 };
    providerStats.forEach((stat) => {
      providerCounts[stat.status] = stat._count;
    });

    const totalProviders = Object.values(providerCounts).reduce((sum, count) => sum + count, 0);

    return {
      region: lsm.region,
      summary: {
        totalProviders,
        totalJobs: jobStats.total,
        pendingServiceRequests,
        pendingDisputes: disputeStats.pending,
      },
      providers: providerCounts,
      jobs: jobStats.byStatus,
      disputes: disputeStats,
      recentActivity,
    };
  }

  private async getJobStatsForRegion(lsmId: number) {
    const jobs = await this.prisma.jobs.groupBy({
      by: ['status'],
      where: {
        service_provider: {
          lsm_id: lsmId,
        },
      },
      _count: true,
    });

    const jobCounts = {
      new: 0,
      in_progress: 0,
      completed: 0,
      paid: 0,
      cancelled: 0,
      rejected_by_sp: 0,
    };

    jobs.forEach((job) => {
      jobCounts[job.status] = job._count;
    });

    const total = Object.values(jobCounts).reduce((sum, count) => sum + count, 0);

    return { total, byStatus: jobCounts };
  }

  private async getDisputeStatsForRegion(lsmId: number) {
    const disputes = await this.prisma.disputes.groupBy({
      by: ['status'],
      where: {
        job: {
          service_provider: {
            lsm_id: lsmId,
          },
        },
      },
      _count: true,
    });

    const stats = { pending: 0, resolved: 0 };
    disputes.forEach((dispute) => {
      stats[dispute.status] = dispute._count;
    });

    return stats;
  }

  private async getRecentActivityForRegion(lsmId: number) {
    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);

    const [newProviders, completedJobs, documentsVerified] = await Promise.all([
      this.prisma.service_providers.count({
        where: {
          lsm_id: lsmId,
          created_at: { gte: last24Hours },
        },
      }),
      this.prisma.jobs.count({
        where: {
          service_provider: { lsm_id: lsmId },
          status: 'completed',
          completed_at: { gte: last24Hours },
        },
      }),
      this.prisma.provider_documents.count({
        where: {
          provider: { lsm_id: lsmId },
          status: 'verified',
          verified_at: { gte: last24Hours },
        },
      }),
    ]);

    return {
      newProviders24h: newProviders,
      completedJobs24h: completedJobs,
      documentsVerified24h: documentsVerified,
    };
  }

  // ==================== ONBOARDING MANAGEMENT ====================

  /**
   * Get pending provider onboarding applications
   */
  async getPendingOnboarding(userId: number) {
    const lsm = await this.prisma.local_service_managers.findUnique({
      where: { user_id: userId },
    });

    if (!lsm) {
      throw new NotFoundException('LSM profile not found');
    }

    const providers = await this.prisma.service_providers.findMany({
      where: {
        lsm_id: lsm.id,
        status: 'pending',
      },
      include: {
        user: {
          select: {
            first_name: true,
            last_name: true,
            email: true,
            phone_number: true,
          },
        },
        documents: {
          select: {
            id: true,
            file_name: true,
            status: true,
            created_at: true,
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
      },
      orderBy: { created_at: 'asc' }, // Oldest first
    });

    return providers.map((provider) => {
      const totalDocs = provider.documents.length;
      const verifiedDocs = provider.documents.filter((d) => d.status === 'verified').length;
      const rejectedDocs = provider.documents.filter((d) => d.status === 'rejected').length;
      const pendingDocs = provider.documents.filter((d) => d.status === 'pending').length;

      return {
        id: provider.id,
        businessName: provider.business_name,
        user: {
          name: `${provider.user.first_name} ${provider.user.last_name}`,
          email: provider.user.email,
          phone: provider.user.phone_number,
        },
        status: provider.status,
        experience: provider.experience,
        experienceLevel: provider.experience_level,
        location: provider.location,
        serviceAreas: provider.service_areas.map((area) => area.zipcode),
        requestedServices: provider.provider_services.map((ps) => ps.service.name),
        documents: {
          total: totalDocs,
          verified: verifiedDocs,
          rejected: rejectedDocs,
          pending: pendingDocs,
          list: provider.documents.map((doc) => ({
            id: doc.id,
            fileName: doc.file_name,
            status: doc.status,
            uploadedAt: doc.created_at,
          })),
        },
        readyForActivation: totalDocs >= 2 && verifiedDocs === totalDocs,
        createdAt: provider.created_at,
      };
    });
  }

  /**
   * Get provider details (for review)
   */
  async getProviderDetails(userId: number, providerId: number) {
    const lsm = await this.prisma.local_service_managers.findUnique({
      where: { user_id: userId },
    });

    if (!lsm) {
      throw new NotFoundException('LSM profile not found');
    }

    const provider = await this.prisma.service_providers.findUnique({
      where: { id: providerId },
      include: {
        user: {
          select: {
            first_name: true,
            last_name: true,
            email: true,
            phone_number: true,
            created_at: true,
            last_login: true,
          },
        },
        documents: {
          select: {
            id: true,
            file_name: true,
            file_path: true,
            status: true,
            verified_by: true,
            verified_at: true,
            created_at: true,
          },
          orderBy: { created_at: 'desc' },
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
        jobs: {
          include: {
            service: {
              select: {
                name: true,
              },
            },
            customer: {
              select: {
                user: {
                  select: {
                    first_name: true,
                    last_name: true,
                  },
                },
              },
            },
          },
          orderBy: { created_at: 'desc' },
          take: 20,
        },
        feedbacks: {
          include: {
            customer: {
              select: {
                user: {
                  select: {
                    first_name: true,
                    last_name: true,
                  },
                },
              },
            },
          },
          orderBy: { created_at: 'desc' },
          take: 10,
        },
      },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    if (provider.lsm_id !== lsm.id) {
      throw new ForbiddenException('This provider is not in your region');
    }

    // Calculate statistics
    const totalJobs = provider.jobs.length;
    const completedJobs = provider.jobs.filter(
      (job) => job.status === 'completed' || job.status === 'paid',
    ).length;
    const cancelledJobs = provider.jobs.filter((job) => job.status === 'cancelled').length;
    const activeJobs = provider.jobs.filter((job) =>
      ['new', 'in_progress'].includes(job.status),
    ).length;

    const averageRating =
      provider.feedbacks.length > 0
        ? provider.feedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) /
          provider.feedbacks.length
        : 0;

    return {
      provider: {
        id: provider.id,
        businessName: provider.business_name,
        user: {
          name: `${provider.user.first_name} ${provider.user.last_name}`,
          email: provider.user.email,
          phone: provider.user.phone_number,
          joinedAt: provider.user.created_at,
          lastLogin: provider.user.last_login,
        },
        status: provider.status,
        rating: Number(provider.rating),
        experience: provider.experience,
        experienceLevel: provider.experience_level,
        description: provider.description,
        location: provider.location,
        warnings: provider.warnings,
        totalJobs: provider.total_jobs,
        earnings: Number(provider.earning),
        approvedAt: provider.approved_at,
        createdAt: provider.created_at,
      },
      statistics: {
        totalJobs,
        completedJobs,
        cancelledJobs,
        activeJobs,
        averageRating: Number(averageRating.toFixed(2)),
        totalReviews: provider.feedbacks.length,
      },
      documents: provider.documents.map((doc) => ({
        id: doc.id,
        fileName: doc.file_name,
        filePath: doc.file_path,
        status: doc.status,
        verifiedBy: doc.verified_by,
        verifiedAt: doc.verified_at,
        uploadedAt: doc.created_at,
      })),
      serviceAreas: provider.service_areas.map((area) => area.zipcode),
      services: provider.provider_services.map((ps) => ({
        name: ps.service.name,
        category: ps.service.category,
      })),
      recentJobs: provider.jobs.map((job) => ({
        id: job.id,
        service: job.service.name,
        customer: `${job.customer.user.first_name} ${job.customer.user.last_name}`,
        status: job.status,
        price: Number(job.price),
        createdAt: job.created_at,
        completedAt: job.completed_at,
      })),
      recentFeedback: provider.feedbacks.map((feedback) => ({
        id: feedback.id,
        rating: feedback.rating,
        feedback: feedback.feedback,
        customer: `${feedback.customer.user.first_name} ${feedback.customer.user.last_name}`,
        createdAt: feedback.created_at,
      })),
    };
  }

  /**
   * Manually approve provider onboarding (after documents verified)
   */
  async approveOnboarding(userId: number, providerId: number) {
    const lsm = await this.prisma.local_service_managers.findUnique({
      where: { user_id: userId },
    });

    if (!lsm) {
      throw new NotFoundException('LSM profile not found');
    }

    const provider = await this.prisma.service_providers.findUnique({
      where: { id: providerId },
      include: {
        user: true,
        documents: true,
      },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    if (provider.lsm_id !== lsm.id) {
      throw new ForbiddenException('This provider is not in your region');
    }

    if (provider.status !== 'pending') {
      throw new BadRequestException('Provider is not in pending status');
    }

    // Check if all documents are verified
    const totalDocs = provider.documents.length;
    const verifiedDocs = provider.documents.filter((d) => d.status === 'verified').length;

    if (totalDocs < 2) {
      throw new BadRequestException('Provider must have at least 2 documents uploaded');
    }

    if (verifiedDocs !== totalDocs) {
      throw new BadRequestException(
        `Not all documents are verified. ${verifiedDocs}/${totalDocs} verified.`,
      );
    }

    // Activate provider
    const updated = await this.prisma.service_providers.update({
      where: { id: providerId },
      data: {
        status: 'active',
        approved_at: new Date(),
      },
    });

    // Notify provider
    await this.prisma.notifications.create({
      data: {
        recipient_type: 'service_provider',
        recipient_id: provider.user_id,
        type: 'system',
        title: '🎉 Account Activated!',
        message:
          'Congratulations! Your account has been approved. You can now start receiving job requests.',
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      approvedAt: updated.approved_at,
      message: 'Provider approved and activated successfully',
    };
  }

  /**
   * Set provider status (active/inactive)
   */
  async setProviderStatus(userId: number, providerId: number, dto: SetProviderStatusDto) {
    const lsm = await this.prisma.local_service_managers.findUnique({
      where: { user_id: userId },
    });

    if (!lsm) {
      throw new NotFoundException('LSM profile not found');
    }

    const provider = await this.prisma.service_providers.findUnique({
      where: { id: providerId },
      include: {
        user: true,
        jobs: {
          where: {
            status: { in: ['new', 'in_progress'] },
          },
          include: {
            customer: {
              include: { user: true },
            },
            service: true,
          },
        },
      },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    if (provider.lsm_id !== lsm.id) {
      throw new ForbiddenException('This provider is not in your region');
    }

    // Validate status transition
    if (dto.status === provider.status) {
      throw new BadRequestException(`Provider is already ${dto.status}`);
    }

    // Check for active jobs
    const activeJobs = provider.jobs;

    if (dto.status === 'inactive' && activeJobs.length > 0 && !dto.forceDeactivate) {
      throw new BadRequestException(
        `Provider has ${activeJobs.length} active jobs. ` +
          `Set forceDeactivate=true to override (emergency only).`,
      );
    }

    // Transaction for status change
    return await this.prisma.$transaction(async (tx) => {
      // Update provider status
      await tx.service_providers.update({
        where: { id: providerId },
        data: { status: dto.status },
      });

      // If force-deactivating with active jobs, notify customers
      if (dto.status === 'inactive' && activeJobs.length > 0 && dto.forceDeactivate) {
        for (const job of activeJobs) {
          await tx.notifications.create({
            data: {
              recipient_type: 'customer',
              recipient_id: job.customer.user_id,
              type: 'system',
              title: 'Service Provider Unavailable',
              message: `Your service provider is no longer available. Please select a different provider for job #${job.id} (${job.service.name}).`,
            },
          });
        }

        // Notify provider
        await tx.notifications.create({
          data: {
            recipient_type: 'service_provider',
            recipient_id: provider.user_id,
            type: 'system',
            title: 'Account Deactivated',
            message: `Your account has been set to inactive by your LSM. ${dto.reason ? `Reason: ${dto.reason}` : ''} ${activeJobs.length} customers have been notified.`,
          },
        });

        return {
          id: provider.id,
          status: dto.status,
          reason: dto.reason,
          jobsAffected: activeJobs.length,
          message: `Provider set to ${dto.status}. ${activeJobs.length} customer(s) notified to select different provider.`,
        };
      }

      // Normal status change (no active jobs)
      await tx.notifications.create({
        data: {
          recipient_type: 'service_provider',
          recipient_id: provider.user_id,
          type: 'system',
          title: `Account ${dto.status === 'active' ? 'Activated' : 'Deactivated'}`,
          message: `Your account has been set to ${dto.status} by your LSM.${dto.reason ? ` Reason: ${dto.reason}` : ''}`,
        },
      });

      return {
        id: provider.id,
        status: dto.status,
        reason: dto.reason,
        message: `Provider set to ${dto.status} successfully`,
      };
    });
  }

  /**
   * Request admin to ban provider
   */
  async requestBan(userId: number, providerId: number, dto: RequestBanDto) {
    const lsm = await this.prisma.local_service_managers.findUnique({
      where: { user_id: userId },
      include: { user: true },
    });

    if (!lsm) {
      throw new NotFoundException('LSM profile not found');
    }

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

    if (provider.status === 'banned') {
      throw new BadRequestException('Provider is already banned');
    }

    // Check if ban request already exists
    const existingRequest = await this.prisma.ban_requests.findFirst({
      where: {
        provider_id: providerId,
        status: 'pending',
      },
    });

    if (existingRequest) {
      throw new BadRequestException('A ban request for this provider is already pending');
    }

    return await this.prisma.$transaction(async (tx) => {
      // Create ban request
      const banRequest = await tx.ban_requests.create({
        data: {
          provider_id: providerId,
          requested_by_lsm: lsm.user_id,
          reason: dto.reason,
          status: 'pending',
        },
      });

      // Optionally set provider to inactive immediately
      if (dto.immediateInactivate && provider.status !== 'inactive') {
        await tx.service_providers.update({
          where: { id: providerId },
          data: { status: 'inactive' },
        });
      }

      // Notify all admins
      const admins = await tx.admin.findMany({
        include: { user: true },
      });

      for (const admin of admins) {
        await tx.notifications.create({
          data: {
            recipient_type: 'admin',
            recipient_id: admin.user_id,
            type: 'system',
            title: 'Ban Request from LSM',
            message: `LSM ${lsm.user.first_name} ${lsm.user.last_name} (${lsm.region}) requested ban for provider "${provider.business_name}". Reason: ${dto.reason}`,
          },
        });
      }

      return {
        banRequestId: banRequest.id,
        providerId,
        status: 'pending',
        immediatelyInactivated: dto.immediateInactivate || false,
        message: 'Ban request submitted to admin for review',
      };
    });
  }

  // ==================== DISPUTE MANAGEMENT ====================

  /**
   * Get disputes in region
   */
  async getDisputes(
    userId: number,
    filters: { status?: string; page?: number; limit?: number },
  ) {
    const lsm = await this.prisma.local_service_managers.findUnique({
      where: { user_id: userId },
    });

    if (!lsm) {
      throw new NotFoundException('LSM profile not found');
    }

    const { status, page = 1, limit = 20 } = filters;
    const finalLimit = Math.min(limit, 100);

    const where: any = {
      job: {
        service_provider: {
          lsm_id: lsm.id,
        },
      },
    };

    if (status) {
      where.status = status;
    }

    const total = await this.prisma.disputes.count({ where });

    const disputes = await this.prisma.disputes.findMany({
      where,
      include: {
        job: {
          select: {
            id: true,
            price: true,
            service: {
              select: {
                name: true,
              },
            },
            customer: {
              select: {
                id: true,
                user: {
                  select: {
                    first_name: true,
                    last_name: true,
                  },
                },
              },
            },
            service_provider: {
              select: {
                id: true,
                business_name: true,
                user: {
                  select: {
                    first_name: true,
                    last_name: true,
                  },
                },
              },
            },
            chats: {
              select: {
                id: true,
                lsm_invited: true,
                lsm_joined: true,
              },
            },
          },
        },
      },
      orderBy: [{ status: 'asc' }, { created_at: 'desc' }],
      skip: (page - 1) * finalLimit,
      take: finalLimit,
    });

    return {
      data: disputes.map((dispute) => ({
        id: dispute.id,
        job: {
          id: dispute.job.id,
          service: dispute.job.service.name,
          price: Number(dispute.job.price),
        },
        customer: {
          id: dispute.job.customer.id,
          name: `${dispute.job.customer.user.first_name} ${dispute.job.customer.user.last_name}`,
        },
        provider: {
          id: dispute.job.service_provider.id,
          businessName:
            dispute.job.service_provider.business_name ||
            `${dispute.job.service_provider.user.first_name} ${dispute.job.service_provider.user.last_name}`,
        },
        raisedBy: dispute.raised_by_type,
        status: dispute.status,
        chatStatus: dispute.job.chats[0]
          ? {
              lsmInvited: dispute.job.chats[0].lsm_invited,
              lsmJoined: dispute.job.chats[0].lsm_joined,
            }
          : null,
        createdAt: dispute.created_at,
        resolvedAt: dispute.resolved_at,
      })),
      pagination: {
        total,
        page,
        limit: finalLimit,
        totalPages: Math.ceil(total / finalLimit),
      },
    };
  }

  /**
   * Get dispute details with chat history
   */
  async getDisputeDetails(userId: number, disputeId: number) {
    const lsm = await this.prisma.local_service_managers.findUnique({
      where: { user_id: userId },
    });

    if (!lsm) {
      throw new NotFoundException('LSM profile not found');
    }

    const dispute = await this.prisma.disputes.findUnique({
      where: { id: disputeId },
      include: {
        job: {
          include: {
            service: {
              select: {
                name: true,
                category: true,
              },
            },
            customer: {
              select: {
                id: true,
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
            service_provider: {
              select: {
                id: true,
                lsm_id: true,
                business_name: true,
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
            chats: {
              include: {
                messages: {
                  orderBy: { created_at: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    // Verify jurisdiction
    if (dispute.job.service_provider.lsm_id !== lsm.id) {
      throw new ForbiddenException('This dispute is not in your region');
    }

    const chat = dispute.job.chats[0];
    const chatHistory = chat
      ? chat.messages.map((msg) => ({
          id: msg.id,
          senderType: msg.sender_type,
          message: msg.message,
          messageType: msg.message_type,
          createdAt: msg.created_at,
        }))
      : [];

    return {
      dispute: {
        id: dispute.id,
        status: dispute.status,
        raisedBy: dispute.raised_by_type,
        resolvedBy: dispute.resolved_by,
        createdAt: dispute.created_at,
        resolvedAt: dispute.resolved_at,
      },
      job: {
        id: dispute.job.id,
        service: dispute.job.service.name,
        category: dispute.job.service.category,
        price: Number(dispute.job.price),
        status: dispute.job.status,
        scheduledAt: dispute.job.scheduled_at,
        completedAt: dispute.job.completed_at,
        answersJson: dispute.job.answers_json,
      },
      customer: {
        id: dispute.job.customer.id,
        name: `${dispute.job.customer.user.first_name} ${dispute.job.customer.user.last_name}`,
        email: dispute.job.customer.user.email,
        phone: dispute.job.customer.user.phone_number,
      },
      provider: {
        id: dispute.job.service_provider.id,
        businessName:
          dispute.job.service_provider.business_name ||
          `${dispute.job.service_provider.user.first_name} ${dispute.job.service_provider.user.last_name}`,
        ownerName: `${dispute.job.service_provider.user.first_name} ${dispute.job.service_provider.user.last_name}`,
        email: dispute.job.service_provider.user.email,
        phone: dispute.job.service_provider.user.phone_number,
      },
      chatStatus: chat
        ? {
            chatId: chat.id,
            lsmInvited: chat.lsm_invited,
            lsmJoined: chat.lsm_joined,
            lsmJoinedAt: chat.lsm_joined_at,
          }
        : null,
      chatHistory,
    };
  }

  /**
   * Join dispute chat (accept invitation)
   */
  async joinDisputeChat(userId: number, disputeId: number) {
    const lsm = await this.prisma.local_service_managers.findUnique({
      where: { user_id: userId },
    });

    if (!lsm) {
      throw new NotFoundException('LSM profile not found');
    }

    const dispute = await this.prisma.disputes.findUnique({
      where: { id: disputeId },
      include: {
        job: {
          include: {
            service_provider: true,
            chats: true,
          },
        },
      },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    // Verify jurisdiction
    if (dispute.job.service_provider.lsm_id !== lsm.id) {
      throw new ForbiddenException('This dispute is not in your region');
    }

    const chat = dispute.job.chats[0];
    if (!chat) {
      throw new NotFoundException('Chat not found for this dispute');
    }

    if (!chat.lsm_invited) {
      throw new BadRequestException('LSM has not been invited to this chat');
    }

    if (chat.lsm_joined) {
      throw new BadRequestException('LSM has already joined this chat');
    }

    // Join chat
    await this.prisma.chat.update({
      where: { id: chat.id },
      data: {
        lsm_id: lsm.id,
        lsm_joined: true,
        lsm_joined_at: new Date(),
      },
    });

    return {
      chatId: chat.id,
      disputeId: dispute.id,
      message: 'Successfully joined dispute chat',
    };
  }

  /**
   * Resolve dispute
   */
  async resolveDispute(userId: number, disputeId: number, dto: ResolveDisputeDto) {
    const lsm = await this.prisma.local_service_managers.findUnique({
      where: { user_id: userId },
    });

    if (!lsm) {
      throw new NotFoundException('LSM profile not found');
    }

    const dispute = await this.prisma.disputes.findUnique({
      where: { id: disputeId },
      include: {
        job: {
          include: {
            service_provider: true,
            customer: {
              include: { user: true },
            },
            chats: true,
          },
        },
      },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    // Verify jurisdiction
    if (dispute.job.service_provider.lsm_id !== lsm.id) {
      throw new ForbiddenException('This dispute is not in your region');
    }

    if (dispute.status === 'resolved') {
      throw new BadRequestException('Dispute is already resolved');
    }

    return await this.prisma.$transaction(async (tx) => {
      // Update dispute
      await tx.disputes.update({
        where: { id: disputeId },
        data: {
          status: 'resolved',
          resolved_by: lsm.user_id,
          resolved_at: new Date(),
        },
      });

      // Update chat - LSM leaves
      const chat = dispute.job.chats[0];
      if (chat) {
        await tx.chat.update({
          where: { id: chat.id },
          data: {
            lsm_invited: false,
            lsm_joined: false,
            lsm_id: null,
          },
        });
      }

      // Notify customer
      await tx.notifications.create({
        data: {
          recipient_type: 'customer',
          recipient_id: dispute.job.customer.user_id,
          type: 'system',
          title: 'Dispute Resolved',
          message: `Your dispute for job #${dispute.job.id} has been resolved by LSM. Resolution: ${dto.resolutionNotes}`,
        },
      });

      // Notify provider
      await tx.notifications.create({
        data: {
          recipient_type: 'service_provider',
          recipient_id: dispute.job.service_provider.user_id,
          type: 'system',
          title: 'Dispute Resolved',
          message: `The dispute for job #${dispute.job.id} has been resolved by LSM. Resolution: ${dto.resolutionNotes}`,
        },
      });

      return {
        id: dispute.id,
        status: 'resolved',
        resolvedBy: lsm.user_id,
        resolvedAt: new Date(),
        message: 'Dispute resolved successfully',
      };
    });
  }

  // ==================== JOBS MONITORING ====================

  /**
   * Get all jobs in region
   */
  async getJobsInRegion(
    userId: number,
    filters: {
      status?: string;
      providerId?: number;
      fromDate?: string;
      toDate?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const lsm = await this.prisma.local_service_managers.findUnique({
      where: { user_id: userId },
    });

    if (!lsm) {
      throw new NotFoundException('LSM profile not found');
    }

    const { status, providerId, fromDate, toDate, page = 1, limit = 20 } = filters;
    const finalLimit = Math.min(limit, 100);

    const where: any = {
      service_provider: {
        lsm_id: lsm.id,
      },
    };

    if (status) {
      where.status = status;
    }

    if (providerId) {
      where.provider_id = providerId;
    }

    if (fromDate || toDate) {
      where.created_at = {};
      if (fromDate) {
        where.created_at.gte = new Date(fromDate);
      }
      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        where.created_at.lte = endDate;
      }
    }

    const total = await this.prisma.jobs.count({ where });

    const jobs = await this.prisma.jobs.findMany({
      where,
      include: {
        service: {
          select: {
            name: true,
            category: true,
          },
        },
        customer: {
          select: {
            user: {
              select: {
                first_name: true,
                last_name: true,
              },
            },
          },
        },
        service_provider: {
          select: {
            business_name: true,
            user: {
              select: {
                first_name: true,
                last_name: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * finalLimit,
      take: finalLimit,
    });

    const totalValue = jobs.reduce((sum, job) => sum + Number(job.price), 0);

    return {
      data: jobs.map((job) => ({
        id: job.id,
        service: job.service.name,
        category: job.service.category,
        customer: `${job.customer.user.first_name} ${job.customer.user.last_name}`,
        provider:
          job.service_provider.business_name ||
          `${job.service_provider.user.first_name} ${job.service_provider.user.last_name}`,
        status: job.status,
        price: Number(job.price),
        scheduledAt: job.scheduled_at,
        completedAt: job.completed_at,
        createdAt: job.created_at,
      })),
      pagination: {
        total,
        page,
        limit: finalLimit,
        totalPages: Math.ceil(total / finalLimit),
      },
      summary: {
        totalJobs: total,
        totalValue,
      },
    };
  }

  // ==================== SERVICE REQUESTS HISTORY ====================

  /**
   * Get all service requests (not just pending)
   */
  async getServiceRequestsHistory(
    userId: number,
    filters: { status?: string; page?: number; limit?: number },
  ) {
    const lsm = await this.prisma.local_service_managers.findUnique({
      where: { user_id: userId },
    });

    if (!lsm) {
      throw new NotFoundException('LSM profile not found');
    }

    const { status, page = 1, limit = 20 } = filters;
    const finalLimit = Math.min(limit, 100);

    const where: any = {
      region: lsm.region,
    };

    if (status) {
      where.final_status = status;
    }

    const total = await this.prisma.service_requests.count({ where });

    const requests = await this.prisma.service_requests.findMany({
      where,
      include: {
        provider: {
          include: {
            user: {
              select: {
                first_name: true,
                last_name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * finalLimit,
      take: finalLimit,
    });

    return {
      data: requests.map((req) => ({
        id: req.id,
        serviceName: req.service_name,
        category: req.category,
        description: req.description,
        provider: {
          id: req.provider.id,
          businessName: req.provider.business_name,
          user: req.provider.user,
        },
        lsmApproved: req.lsm_approved,
        adminApproved: req.admin_approved,
        finalStatus: req.final_status,
        lsmReviewedAt: req.lsm_reviewed_at,
        adminReviewedAt: req.admin_reviewed_at,
        rejectionReason: req.lsm_rejection_reason || req.admin_rejection_reason,
        createdAt: req.created_at,
      })),
      pagination: {
        total,
        page,
        limit: finalLimit,
        totalPages: Math.ceil(total / finalLimit),
      },
    };
  }

  // ==================== REVIEW MANAGEMENT ====================

  /**
   * Get all reviews for a specific provider (paginated)
   */
  async getProviderReviews(
    lsmUserId: number,
    providerId: number,
    filters: { minRating?: number; maxRating?: number; page?: number; limit?: number },
  ) {
    const lsm = await this.prisma.local_service_managers.findUnique({
      where: { user_id: lsmUserId },
    });

    if (!lsm) {
      throw new NotFoundException('LSM profile not found');
    }

    // Verify provider is in LSM's region
    const provider = await this.prisma.service_providers.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    if (provider.lsm_id !== lsm.id) {
      throw new ForbiddenException('Provider is not in your region');
    }

    const { minRating, maxRating, page = 1, limit = 20 } = filters;
    const finalLimit = Math.min(limit, 100);

    const where: any = {
      provider_id: providerId,
    };

    // Filter by rating range
    if (minRating !== undefined || maxRating !== undefined) {
      where.rating = {};
      if (minRating !== undefined) {
        where.rating.gte = minRating;
      }
      if (maxRating !== undefined) {
        where.rating.lte = maxRating;
      }
    }

    const [total, reviews] = await Promise.all([
      this.prisma.ratings_feedback.count({ where }),
      this.prisma.ratings_feedback.findMany({
        where,
        include: {
          customer: {
            include: {
              user: {
                select: {
                  first_name: true,
                  last_name: true,
                  email: true,
                },
              },
            },
          },
          job: {
            select: {
              id: true,
              service: {
                select: {
                  name: true,
                  category: true,
                },
              },
              completed_at: true,
              price: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * finalLimit,
        take: finalLimit,
      }),
    ]);

    return {
      provider: {
        id: provider.id,
        businessName: provider.business_name,
        rating: Number(provider.rating),
        totalJobs: provider.total_jobs,
      },
      data: reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        feedback: review.feedback,
        punctualityRating: review.punctuality_rating,
        responseTime: review.response_time,
        customer: {
          name: `${review.customer.user.first_name} ${review.customer.user.last_name}`,
          email: review.customer.user.email,
        },
        job: {
          id: review.job.id,
          service: review.job.service.name,
          category: review.job.service.category,
          completedAt: review.job.completed_at,
          price: Number(review.job.price),
        },
        createdAt: review.created_at,
      })),
      pagination: {
        total,
        page,
        limit: finalLimit,
        totalPages: Math.ceil(total / finalLimit),
      },
    };
  }

  /**
   * Get review statistics for a provider
   */
  async getProviderReviewStats(lsmUserId: number, providerId: number) {
    const lsm = await this.prisma.local_service_managers.findUnique({
      where: { user_id: lsmUserId },
    });

    if (!lsm) {
      throw new NotFoundException('LSM profile not found');
    }

    // Verify provider is in LSM's region
    const provider = await this.prisma.service_providers.findUnique({
      where: { id: providerId },
      include: {
        feedbacks: {
          select: {
            rating: true,
            punctuality_rating: true,
            response_time: true,
          },
        },
      },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    if (provider.lsm_id !== lsm.id) {
      throw new ForbiddenException('Provider is not in your region');
    }

    const totalReviews = provider.feedbacks.length;

    if (totalReviews === 0) {
      return {
        provider: {
          id: provider.id,
          businessName: provider.business_name,
        },
        totalReviews: 0,
        averageRating: 0,
        averagePunctuality: 0,
        averageResponseTime: 0,
        ratingBreakdown: {
          5: 0,
          4: 0,
          3: 0,
          2: 0,
          1: 0,
        },
        percentages: {
          5: 0,
          4: 0,
          3: 0,
          2: 0,
          1: 0,
        },
      };
    }

    // Calculate averages
    const totalRating = provider.feedbacks.reduce((sum, f) => sum + (f.rating || 0), 0);
    const totalPunctuality = provider.feedbacks.reduce(
      (sum, f) => sum + (f.punctuality_rating || 0),
      0,
    );
    const totalResponseTime = provider.feedbacks.reduce(
      (sum, f) => sum + (f.response_time || 0),
      0,
    );

    const averageRating = totalRating / totalReviews;
    const averagePunctuality = totalPunctuality / totalReviews;
    const averageResponseTime = totalResponseTime / totalReviews;

    // Rating breakdown
    const ratingBreakdown = {
      5: provider.feedbacks.filter((f) => f.rating === 5).length,
      4: provider.feedbacks.filter((f) => f.rating === 4).length,
      3: provider.feedbacks.filter((f) => f.rating === 3).length,
      2: provider.feedbacks.filter((f) => f.rating === 2).length,
      1: provider.feedbacks.filter((f) => f.rating === 1).length,
    };

    return {
      provider: {
        id: provider.id,
        businessName: provider.business_name,
        totalJobs: provider.total_jobs,
      },
      totalReviews,
      averageRating: Number(averageRating.toFixed(2)),
      averagePunctuality: Number(averagePunctuality.toFixed(2)),
      averageResponseTime: Math.round(averageResponseTime),
      ratingBreakdown,
      percentages: {
        5: Math.round((ratingBreakdown[5] / totalReviews) * 100),
        4: Math.round((ratingBreakdown[4] / totalReviews) * 100),
        3: Math.round((ratingBreakdown[3] / totalReviews) * 100),
        2: Math.round((ratingBreakdown[2] / totalReviews) * 100),
        1: Math.round((ratingBreakdown[1] / totalReviews) * 100),
      },
    };
  }
}