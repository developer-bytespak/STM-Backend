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
const swagger_1 = require("@nestjs/swagger");
const providers_service_1 = require("./providers.service");
const request_service_dto_1 = require("./dto/request-service.dto");
const add_service_dto_1 = require("./dto/add-service.dto");
const jwt_auth_guard_1 = require("../oauth/guards/jwt-auth.guard");
const roles_guard_1 = require("../oauth/guards/roles.guard");
const roles_decorator_1 = require("../oauth/decorators/roles.decorator");
const current_user_decorator_1 = require("../oauth/decorators/current-user.decorator");
const user_role_enum_1 = require("../users/enums/user-role.enum");
let ProvidersController = class ProvidersController {
    constructor(providersService) {
        this.providersService = providersService;
    }
    async requestNewService(userId, dto) {
        return this.providersService.requestNewService(userId, dto);
    }
    async getMyServiceRequests(userId) {
        return this.providersService.getMyServiceRequests(userId);
    }
    async addService(userId, dto) {
        return this.providersService.addService(userId, dto);
    }
};
exports.ProvidersController = ProvidersController;
__decorate([
    (0, common_1.Post)('request-new-service'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.PROVIDER),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Request a new service to be added to the platform' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Service request created successfully' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Service already exists or request pending' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, request_service_dto_1.RequestServiceDto]),
    __metadata("design:returntype", Promise)
], ProvidersController.prototype, "requestNewService", null);
__decorate([
    (0, common_1.Get)('my-service-requests'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.PROVIDER),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all service requests for current provider' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Service requests retrieved successfully' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], ProvidersController.prototype, "getMyServiceRequests", null);
__decorate([
    (0, common_1.Post)('add-service'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.PROVIDER),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Add an existing approved service to provider profile' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Service added successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Service not found' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Already offering this service' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, add_service_dto_1.AddServiceDto]),
    __metadata("design:returntype", Promise)
], ProvidersController.prototype, "addService", null);
exports.ProvidersController = ProvidersController = __decorate([
    (0, common_1.Controller)('provider'),
    (0, swagger_1.ApiTags)('providers'),
    __metadata("design:paramtypes", [providers_service_1.ProvidersService])
], ProvidersController);
//# sourceMappingURL=providers.controller.js.map