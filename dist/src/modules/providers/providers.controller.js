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
exports.ProvidersController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const providers_service_1 = require("./providers.service");
const create_provider_dto_1 = require("./dto/create-provider.dto");
const update_provider_dto_1 = require("./dto/update-provider.dto");
const provider_management_dto_1 = require("./dto/provider-management.dto");
const provider_filters_dto_1 = require("./dto/provider-filters.dto");
const provider_response_dto_1 = require("./dto/provider-response.dto");
const create_service_dto_1 = require("./dto/create-service.dto");
let ProvidersController = class ProvidersController {
    constructor(providersService) {
        this.providersService = providersService;
    }
    async create(createProviderDto, documents) {
        if (documents && documents.length > 0) {
            createProviderDto.documents = documents;
        }
        return this.providersService.create(createProviderDto);
    }
    async findAll(filters) {
        return this.providersService.findAll(filters);
    }
    async getProviderStats() {
        return this.providersService.getProviderStats();
    }
    async findByUserId(userId) {
        return this.providersService.findByUserId(userId);
    }
    async findOne(id) {
        return this.providersService.findOne(id);
    }
    async update(id, updateProviderDto, documents) {
        if (documents && documents.length > 0) {
            updateProviderDto.documents = documents;
        }
        return this.providersService.update(id, updateProviderDto);
    }
    async updateManagement(id, managementDto) {
        return this.providersService.updateManagement(id, managementDto);
    }
    async remove(id) {
        return this.providersService.remove(id);
    }
    async getProviderServices(id) {
        return this.providersService.getProviderServices(id);
    }
    async createService(id, createServiceDto, documents) {
        if (documents && documents.length > 0) {
            createServiceDto.documents = documents;
        }
        return this.providersService.createService(id, createServiceDto);
    }
};
exports.ProvidersController = ProvidersController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new provider' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Provider created successfully', type: provider_response_dto_1.ProviderResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Bad request - validation failed' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Conflict - email already exists' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('documents')),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_provider_dto_1.CreateProviderDto, Array]),
    __metadata("design:returntype", Promise)
], ProvidersController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all providers with filtering and pagination' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Providers retrieved successfully' }),
    (0, swagger_1.ApiQuery)({ name: 'search', required: false, description: 'Search by name, email, or location' }),
    (0, swagger_1.ApiQuery)({ name: 'email', required: false, description: 'Filter by email' }),
    (0, swagger_1.ApiQuery)({ name: 'phone_number', required: false, description: 'Filter by phone number' }),
    (0, swagger_1.ApiQuery)({ name: 'location', required: false, description: 'Filter by location' }),
    (0, swagger_1.ApiQuery)({ name: 'tier', required: false, description: 'Filter by provider tier' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false, description: 'Filter by provider status' }),
    (0, swagger_1.ApiQuery)({ name: 'is_active', required: false, description: 'Filter by active status' }),
    (0, swagger_1.ApiQuery)({ name: 'lsm_id', required: false, description: 'Filter by Local Service Manager ID' }),
    (0, swagger_1.ApiQuery)({ name: 'is_email_verified', required: false, description: 'Filter by email verification status' }),
    (0, swagger_1.ApiQuery)({ name: 'min_rating', required: false, description: 'Filter by minimum rating' }),
    (0, swagger_1.ApiQuery)({ name: 'max_rating', required: false, description: 'Filter by maximum rating' }),
    (0, swagger_1.ApiQuery)({ name: 'min_experience', required: false, description: 'Filter by minimum experience' }),
    (0, swagger_1.ApiQuery)({ name: 'max_experience', required: false, description: 'Filter by maximum experience' }),
    (0, swagger_1.ApiQuery)({ name: 'min_total_jobs', required: false, description: 'Filter by minimum total jobs' }),
    (0, swagger_1.ApiQuery)({ name: 'max_total_jobs', required: false, description: 'Filter by maximum total jobs' }),
    (0, swagger_1.ApiQuery)({ name: 'min_earnings', required: false, description: 'Filter by minimum earnings' }),
    (0, swagger_1.ApiQuery)({ name: 'max_earnings', required: false, description: 'Filter by maximum earnings' }),
    (0, swagger_1.ApiQuery)({ name: 'created_from', required: false, description: 'Filter by created date from' }),
    (0, swagger_1.ApiQuery)({ name: 'created_to', required: false, description: 'Filter by created date to' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, description: 'Page number for pagination' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, description: 'Number of items per page' }),
    (0, swagger_1.ApiQuery)({ name: 'sort_by', required: false, description: 'Sort field' }),
    (0, swagger_1.ApiQuery)({ name: 'sort_order', required: false, description: 'Sort order (asc/desc)' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [provider_filters_dto_1.ProviderFiltersDto]),
    __metadata("design:returntype", Promise)
], ProvidersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Get provider statistics' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Provider statistics retrieved successfully' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ProvidersController.prototype, "getProviderStats", null);
__decorate([
    (0, common_1.Get)('user/:userId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get provider by user ID' }),
    (0, swagger_1.ApiParam)({ name: 'userId', description: 'User ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Provider retrieved successfully', type: provider_response_dto_1.ProviderResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Provider not found' }),
    __param(0, (0, common_1.Param)('userId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], ProvidersController.prototype, "findByUserId", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get provider by ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Provider ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Provider retrieved successfully', type: provider_response_dto_1.ProviderResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Provider not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], ProvidersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update provider by ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Provider ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Provider updated successfully', type: provider_response_dto_1.ProviderResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Bad request - validation failed' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Provider not found' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Conflict - email already exists' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('documents')),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_provider_dto_1.UpdateProviderDto, Array]),
    __metadata("design:returntype", Promise)
], ProvidersController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/management'),
    (0, swagger_1.ApiOperation)({ summary: 'Update provider management (status, tier, LSM assignment)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Provider ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Provider management updated successfully', type: provider_response_dto_1.ProviderResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Bad request - validation failed' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Provider not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, provider_management_dto_1.ProviderManagementDto]),
    __metadata("design:returntype", Promise)
], ProvidersController.prototype, "updateManagement", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Delete provider by ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Provider ID' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'Provider deleted successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Provider not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], ProvidersController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)(':id/services'),
    (0, swagger_1.ApiOperation)({ summary: 'Get provider services (created and available)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Provider ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Provider services retrieved successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Provider not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], ProvidersController.prototype, "getProviderServices", null);
__decorate([
    (0, common_1.Post)(':id/services'),
    (0, swagger_1.ApiOperation)({ summary: 'Create new service (requires LSM approval)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Provider ID' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Service created and submitted for approval' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Bad request - validation failed' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Provider not found' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('documents')),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, create_service_dto_1.CreateServiceDto, Array]),
    __metadata("design:returntype", Promise)
], ProvidersController.prototype, "createService", null);
exports.ProvidersController = ProvidersController = __decorate([
    (0, swagger_1.ApiTags)('Providers'),
    (0, common_1.Controller)('providers'),
    __metadata("design:paramtypes", [providers_service_1.ProvidersService])
], ProvidersController);
//# sourceMappingURL=providers.controller.js.map