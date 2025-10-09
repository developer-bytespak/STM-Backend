"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LsmService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const document_action_dto_1 = require("./dto/document-action.dto");
let LsmService = class LsmService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getPendingServiceRequests(userId) {
        const lsm = await this.prisma.local_service_managers.findUnique({
            where: { user_id: userId },
        });
        if (!lsm) {
            throw new common_1.NotFoundException('LSM profile not found');
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
    async approveServiceRequest(userId, requestId) {
        const lsm = await this.prisma.local_service_managers.findUnique({
            where: { user_id: userId },
        });
        if (!lsm) {
            throw new common_1.NotFoundException('LSM profile not found');
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
            throw new common_1.NotFoundException('Service request not found');
        }
        if (request.region !== lsm.region) {
            throw new common_1.ForbiddenException('This request is not in your region');
        }
        if (request.lsm_approved) {
            throw new common_1.BadRequestException('Request already approved by LSM');
        }
        const updated = await this.prisma.service_requests.update({
            where: { id: requestId },
            data: {
                lsm_approved: true,
                lsm_reviewed_by: userId,
                lsm_reviewed_at: new Date(),
            },
        });
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
    async rejectServiceRequest(userId, requestId, dto) {
        const lsm = await this.prisma.local_service_managers.findUnique({
            where: { user_id: userId },
        });
        if (!lsm) {
            throw new common_1.NotFoundException('LSM profile not found');
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
            throw new common_1.NotFoundException('Service request not found');
        }
        if (request.region !== lsm.region) {
            throw new common_1.ForbiddenException('This request is not in your region');
        }
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
    async getProvidersInRegion(userId) {
        const lsm = await this.prisma.local_service_managers.findUnique({
            where: { user_id: userId },
        });
        if (!lsm) {
            throw new common_1.NotFoundException('LSM profile not found');
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
    async handleDocument(userId, providerId, documentId, dto) {
        const lsm = await this.prisma.local_service_managers.findUnique({
            where: { user_id: userId },
        });
        if (!lsm) {
            throw new common_1.NotFoundException('LSM profile not found');
        }
        const provider = await this.prisma.service_providers.findUnique({
            where: { id: providerId },
            include: { user: true },
        });
        if (!provider) {
            throw new common_1.NotFoundException('Provider not found');
        }
        if (provider.lsm_id !== lsm.id) {
            throw new common_1.ForbiddenException('This provider is not in your region');
        }
        const document = await this.prisma.provider_documents.findUnique({
            where: { id: documentId },
        });
        if (!document) {
            throw new common_1.NotFoundException('Document not found');
        }
        if (document.provider_id !== providerId) {
            throw new common_1.BadRequestException('Document does not belong to this provider');
        }
        if (dto.action === document_action_dto_1.DocumentAction.REJECT && !dto.reason) {
            throw new common_1.BadRequestException('Rejection reason is required');
        }
        const updated = await this.prisma.provider_documents.update({
            where: { id: documentId },
            data: {
                status: dto.action === document_action_dto_1.DocumentAction.VERIFY ? 'verified' : 'rejected',
                verified_by: userId,
                verified_at: new Date(),
            },
        });
        await this.prisma.notifications.create({
            data: {
                recipient_type: 'service_provider',
                recipient_id: provider.user_id,
                type: 'system',
                title: dto.action === document_action_dto_1.DocumentAction.VERIFY
                    ? 'Document Verified'
                    : 'Document Rejected',
                message: dto.action === document_action_dto_1.DocumentAction.VERIFY
                    ? `Your document "${document.file_name}" has been verified`
                    : `Your document "${document.file_name}" was rejected. Reason: ${dto.reason}. Please re-upload the correct document.`,
            },
        });
        if (dto.action === document_action_dto_1.DocumentAction.VERIFY && provider.status === 'pending') {
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
            if (totalDocuments >= MIN_REQUIRED_DOCS && verifiedDocuments === totalDocuments) {
                await this.prisma.service_providers.update({
                    where: { id: providerId },
                    data: {
                        status: 'active',
                        approved_at: new Date(),
                    },
                });
                await this.prisma.notifications.create({
                    data: {
                        recipient_type: 'service_provider',
                        recipient_id: provider.user_id,
                        type: 'system',
                        title: '🎉 Account Activated!',
                        message: `Congratulations! All your documents have been verified. Your account is now active and you can start receiving job requests.`,
                    },
                });
                return {
                    id: updated.id,
                    status: updated.status,
                    action: dto.action,
                    providerStatus: 'active',
                    message: 'Document verified successfully. Provider account activated!',
                };
            }
        }
        if (dto.action === document_action_dto_1.DocumentAction.REJECT) {
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
            message: dto.action === document_action_dto_1.DocumentAction.VERIFY
                ? 'Document verified successfully'
                : 'Document rejected',
        };
    }
};
exports.LsmService = LsmService;
exports.LsmService = LsmService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LsmService);
//# sourceMappingURL=lsm.service.js.map