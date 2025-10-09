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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LsmController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const lsm_service_1 = require("./lsm.service");
const prisma_service_1 = require("../../../prisma/prisma.service");
const reject_service_request_dto_1 = require("./dto/reject-service-request.dto");
const document_action_dto_1 = require("./dto/document-action.dto");
const set_provider_status_dto_1 = require("./dto/set-provider-status.dto");
const request_ban_dto_1 = require("./dto/request-ban.dto");
const resolve_dispute_dto_1 = require("./dto/resolve-dispute.dto");
const jwt_auth_guard_1 = require("../oauth/guards/jwt-auth.guard");
const roles_guard_1 = require("../oauth/guards/roles.guard");
const roles_decorator_1 = require("../oauth/decorators/roles.decorator");
const current_user_decorator_1 = require("../oauth/decorators/current-user.decorator");
const user_role_enum_1 = require("../users/enums/user-role.enum");
let LsmController = class LsmController {
    constructor(lsmService, prisma) {
        this.lsmService = lsmService;
        this.prisma = prisma;
    }
    async getPendingServiceRequests(userId) {
        return this.lsmService.getPendingServiceRequests(userId);
    }
    async approveServiceRequest(userId, requestId) {
        return this.lsmService.approveServiceRequest(userId, requestId);
    }
    async rejectServiceRequest(userId, requestId, dto) {
        return this.lsmService.rejectServiceRequest(userId, requestId, dto);
    }
    async getProvidersInRegion(userId) {
        return this.lsmService.getProvidersInRegion(userId);
    }
    async handleDocument(userId, providerId, documentId, dto) {
        return this.lsmService.handleDocument(userId, providerId, documentId, dto);
    }
    async getDashboard(userId) {
        return this.lsmService.getDashboard(userId);
    }
    async getPendingOnboarding(userId) {
        return this.lsmService.getPendingOnboarding(userId);
    }
    async getProviderDetails(userId, providerId) {
        return this.lsmService.getProviderDetails(userId, providerId);
    }
    async approveOnboarding(userId, providerId) {
        return this.lsmService.approveOnboarding(userId, providerId);
    }
    async setProviderStatus(userId, providerId, dto) {
        return this.lsmService.setProviderStatus(userId, providerId, dto);
    }
    async requestBan(userId, providerId, dto) {
        return this.lsmService.requestBan(userId, providerId, dto);
    }
    async getDisputes(userId, status, page, limit) {
        return this.lsmService.getDisputes(userId, {
            status,
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
        });
    }
    async getDisputeDetails(userId, disputeId) {
        return this.lsmService.getDisputeDetails(userId, disputeId);
    }
    async joinDisputeChat(userId, disputeId) {
        return this.lsmService.joinDisputeChat(userId, disputeId);
    }
    async resolveDispute(userId, disputeId, dto) {
        return this.lsmService.resolveDispute(userId, disputeId, dto);
    }
    async getJobsInRegion(userId, status, providerId, fromDate, toDate, page, limit) {
        return this.lsmService.getJobsInRegion(userId, {
            status,
            providerId: providerId ? parseInt(providerId) : undefined,
            fromDate,
            toDate,
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
        });
    }
    async getServiceRequestsHistory(userId, status, page, limit) {
        return this.lsmService.getServiceRequestsHistory(userId, {
            status,
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
        });
    }
    async getDebugInfo(userId) {
        const lsm = await this.prisma.local_service_managers.findUnique({
            where: { user_id: userId },
            include: {
                user: true,
            },
        });
        if (!lsm) {
            return { error: 'LSM profile not found' };
        }
        const allProviders = await this.prisma.service_providers.findMany({
            where: { lsm_id: lsm.id },
            select: {
                id: true,
                user_id: true,
                business_name: true,
                status: true,
                location: true,
                created_at: true,
                user: {
                    select: {
                        first_name: true,
                        last_name: true,
                        email: true,
                    },
                },
            },
        });
        const pendingProviders = allProviders.filter((p) => p.status === 'pending');
        return {
            lsm: {
                id: lsm.id,
                user_id: lsm.user_id,
                region: lsm.region,
                status: lsm.status,
            },
            totalProvidersAssigned: allProviders.length,
            pendingCount: pendingProviders.length,
            allProviders: allProviders.map((p) => ({
                id: p.id,
                user_id: p.user_id,
                name: `${p.user.first_name} ${p.user.last_name}`,
                email: p.user.email,
                businessName: p.business_name,
                status: p.status,
                location: p.location,
                createdAt: p.created_at,
            })),
            pendingProviders: pendingProviders.map((p) => ({
                id: p.id,
                user_id: p.user_id,
                name: `${p.user.first_name} ${p.user.last_name}`,
                businessName: p.business_name,
            })),
        };
    }
    async getProviderReviews(userId, providerId, minRating, maxRating, page, limit) {
        return this.lsmService.getProviderReviews(userId, providerId, {
            minRating: minRating ? parseInt(minRating) : undefined,
            maxRating: maxRating ? parseInt(maxRating) : undefined,
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
        });
    }
    async getProviderReviewStats(userId, providerId) {
        return this.lsmService.getProviderReviewStats(userId, providerId);
    }
};
exports.LsmController = LsmController;
__decorate([
    (0, common_1.Get)('service-requests/pending'),
    (0, swagger_1.ApiOperation)({ summary: 'Get pending service requests in LSM region' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Requests retrieved successfully' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], LsmController.prototype, "getPendingServiceRequests", null);
__decorate([
    (0, common_1.Post)('service-requests/:id/approve'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Approve a service request (sends to admin)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Request approved successfully' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Request not in your region' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Request not found' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], LsmController.prototype, "approveServiceRequest", null);
__decorate([
    (0, common_1.Post)('service-requests/:id/reject'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Reject a service request' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Request rejected successfully' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Request not in your region' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Request not found' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, reject_service_request_dto_1.RejectServiceRequestDto]),
    __metadata("design:returntype", Promise)
], LsmController.prototype, "rejectServiceRequest", null);
__decorate([
    (0, common_1.Get)('providers'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all service providers in LSM region' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Providers retrieved successfully' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], LsmController.prototype, "getProvidersInRegion", null);
__decorate([
    (0, common_1.Post)('providers/:providerId/documents/:documentId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Verify or reject a provider document' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Document action completed' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Provider not in your region' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Provider or document not found' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('providerId', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Param)('documentId', common_1.ParseIntPipe)),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Number, document_action_dto_1.DocumentActionDto]),
    __metadata("design:returntype", Promise)
], LsmController.prototype, "handleDocument", null);
__decorate([
    (0, common_1.Get)('dashboard'),
    (0, swagger_1.ApiOperation)({ summary: 'Get LSM dashboard with region statistics' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Dashboard data retrieved successfully' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], LsmController.prototype, "getDashboard", null);
__decorate([
    (0, common_1.Get)('onboarding/pending'),
    (0, swagger_1.ApiOperation)({ summary: 'Get pending provider onboarding applications in region' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Pending providers retrieved successfully' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], LsmController.prototype, "getPendingOnboarding", null);
__decorate([
    (0, common_1.Get)('providers/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get provider details by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Provider retrieved successfully' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Provider not in your region' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Provider not found' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], LsmController.prototype, "getProviderDetails", null);
__decorate([
    (0, common_1.Post)('providers/:id/approve-onboarding'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Approve provider onboarding and activate account' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Provider approved and activated' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Not all documents verified' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Provider not in your region' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Provider not found' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], LsmController.prototype, "approveOnboarding", null);
__decorate([
    (0, common_1.Post)('providers/:id/set-status'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Set provider status (activate or deactivate)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Provider status updated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Active jobs exist without force flag' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Provider not in your region' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Provider not found' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, set_provider_status_dto_1.SetProviderStatusDto]),
    __metadata("design:returntype", Promise)
], LsmController.prototype, "setProviderStatus", null);
__decorate([
    (0, common_1.Post)('providers/:id/request-ban'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Request admin to ban a provider' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Ban request submitted successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Ban request already pending or provider banned' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Provider not in your region' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Provider not found' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, request_ban_dto_1.RequestBanDto]),
    __metadata("design:returntype", Promise)
], LsmController.prototype, "requestBan", null);
__decorate([
    (0, common_1.Get)('disputes'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all disputes in LSM region' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Disputes retrieved successfully' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, String, String]),
    __metadata("design:returntype", Promise)
], LsmController.prototype, "getDisputes", null);
__decorate([
    (0, common_1.Get)('disputes/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get dispute details with chat history' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Dispute retrieved successfully' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Dispute not in your region' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Dispute not found' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], LsmController.prototype, "getDisputeDetails", null);
__decorate([
    (0, common_1.Post)('disputes/:id/join-chat'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Accept dispute invitation and join chat' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Successfully joined chat' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Not invited or already joined' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Dispute not in your region' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Dispute not found' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], LsmController.prototype, "joinDisputeChat", null);
__decorate([
    (0, common_1.Post)('disputes/:id/resolve'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Resolve a dispute with decision notes' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Dispute resolved successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Dispute already resolved' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Dispute not in your region' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Dispute not found' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, resolve_dispute_dto_1.ResolveDisputeDto]),
    __metadata("design:returntype", Promise)
], LsmController.prototype, "resolveDispute", null);
__decorate([
    (0, common_1.Get)('jobs'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all jobs in LSM region with filters' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Jobs retrieved successfully' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('providerId')),
    __param(3, (0, common_1.Query)('fromDate')),
    __param(4, (0, common_1.Query)('toDate')),
    __param(5, (0, common_1.Query)('page')),
    __param(6, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], LsmController.prototype, "getJobsInRegion", null);
__decorate([
    (0, common_1.Get)('service-requests'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all service requests in region (not just pending)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Service requests retrieved successfully' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, String, String]),
    __metadata("design:returntype", Promise)
], LsmController.prototype, "getServiceRequestsHistory", null);
__decorate([
    (0, common_1.Get)('debug/info'),
    (0, swagger_1.ApiOperation)({ summary: 'DEBUG: Get LSM info and assigned providers' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Debug info retrieved' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], LsmController.prototype, "getDebugInfo", null);
__decorate([
    (0, common_1.Get)('providers/:id/reviews'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all reviews for a provider in your region' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Reviews retrieved successfully' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Provider not in your region' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Provider not found' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('minRating')),
    __param(3, (0, common_1.Query)('maxRating')),
    __param(4, (0, common_1.Query)('page')),
    __param(5, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String, String, String]),
    __metadata("design:returntype", Promise)
], LsmController.prototype, "getProviderReviews", null);
__decorate([
    (0, common_1.Get)('providers/:id/reviews/stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Get review statistics for a provider' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Statistics retrieved successfully' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Provider not in your region' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Provider not found' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], LsmController.prototype, "getProviderReviewStats", null);
exports.LsmController = LsmController = __decorate([
    (0, common_1.Controller)('lsm'),
    (0, swagger_1.ApiTags)('lsm'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.LSM),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [lsm_service_1.LsmService,
        prisma_service_1.PrismaService])
], LsmController);
//# sourceMappingURL=lsm.controller.js.map