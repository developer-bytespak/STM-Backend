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
const reject_service_request_dto_1 = require("./dto/reject-service-request.dto");
const document_action_dto_1 = require("./dto/document-action.dto");
const jwt_auth_guard_1 = require("../oauth/guards/jwt-auth.guard");
const roles_guard_1 = require("../oauth/guards/roles.guard");
const roles_decorator_1 = require("../oauth/decorators/roles.decorator");
const current_user_decorator_1 = require("../oauth/decorators/current-user.decorator");
const user_role_enum_1 = require("../users/enums/user-role.enum");
let LsmController = class LsmController {
    constructor(lsmService) {
        this.lsmService = lsmService;
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
exports.LsmController = LsmController = __decorate([
    (0, common_1.Controller)('lsm'),
    (0, swagger_1.ApiTags)('lsm'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.LSM),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [lsm_service_1.LsmService])
], LsmController);
//# sourceMappingURL=lsm.controller.js.map