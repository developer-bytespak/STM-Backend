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
exports.ProviderOnboardingController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const provider_onboarding_service_1 = require("./provider-onboarding.service");
const jwt_auth_guard_1 = require("../oauth/guards/jwt-auth.guard");
const roles_guard_1 = require("../oauth/guards/roles.guard");
const roles_decorator_1 = require("../oauth/decorators/roles.decorator");
const current_user_decorator_1 = require("../oauth/decorators/current-user.decorator");
const user_role_enum_1 = require("../users/enums/user-role.enum");
const upload_document_dto_1 = require("./dto/upload-document.dto");
let ProviderOnboardingController = class ProviderOnboardingController {
    constructor(providerOnboardingService) {
        this.providerOnboardingService = providerOnboardingService;
    }
    async uploadDocument(userId, file, dto) {
        return this.providerOnboardingService.uploadDocument(userId, file, dto.description);
    }
    async getMyDocuments(userId) {
        return this.providerOnboardingService.getMyDocuments(userId);
    }
    async deleteDocument(userId, documentId) {
        return this.providerOnboardingService.deleteDocument(userId, documentId);
    }
};
exports.ProviderOnboardingController = ProviderOnboardingController;
__decorate([
    (0, common_1.Post)('documents/upload'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.PROVIDER),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiOperation)({ summary: 'Upload a document for service provider verification' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Document uploaded successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid file or validation error' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - Only providers can upload' }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, upload_document_dto_1.UploadDocumentDto]),
    __metadata("design:returntype", Promise)
], ProviderOnboardingController.prototype, "uploadDocument", null);
__decorate([
    (0, common_1.Get)('documents'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.PROVIDER),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all documents for current provider' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Documents retrieved successfully' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Provider profile not found' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], ProviderOnboardingController.prototype, "getMyDocuments", null);
__decorate([
    (0, common_1.Delete)('documents/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.PROVIDER),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a document' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Document deleted successfully' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - Can only delete own documents' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Document not found' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], ProviderOnboardingController.prototype, "deleteDocument", null);
exports.ProviderOnboardingController = ProviderOnboardingController = __decorate([
    (0, common_1.Controller)('provider-onboarding'),
    (0, swagger_1.ApiTags)('provider-onboarding'),
    __metadata("design:paramtypes", [provider_onboarding_service_1.ProviderOnboardingService])
], ProviderOnboardingController);
//# sourceMappingURL=provider-onboarding.controller.js.map