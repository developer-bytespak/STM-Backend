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
exports.CustomersController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const customers_service_1 = require("./customers.service");
const create_customer_dto_1 = require("./dto/create-customer.dto");
const update_customer_dto_1 = require("./dto/update-customer.dto");
const customer_filters_dto_1 = require("./dto/customer-filters.dto");
const customer_response_dto_1 = require("./dto/customer-response.dto");
let CustomersController = class CustomersController {
    constructor(customersService) {
        this.customersService = customersService;
    }
    async create(createCustomerDto, profilePicture) {
        if (profilePicture) {
            createCustomerDto.profile_picture = profilePicture.buffer;
        }
        return this.customersService.create(createCustomerDto);
    }
    async findAll(filters) {
        return this.customersService.findAll(filters);
    }
    async getCustomerStats() {
        return this.customersService.getCustomerStats();
    }
    async findByUserId(userId) {
        return this.customersService.findByUserId(userId);
    }
    async findOne(id) {
        return this.customersService.findOne(id);
    }
    async update(id, updateCustomerDto, profilePicture) {
        if (profilePicture) {
            updateCustomerDto.profile_picture = profilePicture.buffer;
        }
        return this.customersService.update(id, updateCustomerDto);
    }
    async remove(id) {
        return this.customersService.remove(id);
    }
};
exports.CustomersController = CustomersController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new customer' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Customer created successfully', type: customer_response_dto_1.CustomerResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Bad request - validation failed' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Conflict - email already exists' }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('profile_picture')),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_customer_dto_1.CreateCustomerDto, Object]),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all customers with filtering and pagination' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Customers retrieved successfully' }),
    (0, swagger_1.ApiQuery)({ name: 'search', required: false, description: 'Search by name or email' }),
    (0, swagger_1.ApiQuery)({ name: 'email', required: false, description: 'Filter by email' }),
    (0, swagger_1.ApiQuery)({ name: 'phone_number', required: false, description: 'Filter by phone number' }),
    (0, swagger_1.ApiQuery)({ name: 'retention_status', required: false, description: 'Filter by retention status' }),
    (0, swagger_1.ApiQuery)({ name: 'is_email_verified', required: false, description: 'Filter by email verification status' }),
    (0, swagger_1.ApiQuery)({ name: 'min_total_jobs', required: false, description: 'Filter by minimum total jobs' }),
    (0, swagger_1.ApiQuery)({ name: 'max_total_jobs', required: false, description: 'Filter by maximum total jobs' }),
    (0, swagger_1.ApiQuery)({ name: 'min_total_spent', required: false, description: 'Filter by minimum total spent' }),
    (0, swagger_1.ApiQuery)({ name: 'max_total_spent', required: false, description: 'Filter by maximum total spent' }),
    (0, swagger_1.ApiQuery)({ name: 'created_from', required: false, description: 'Filter by created date from' }),
    (0, swagger_1.ApiQuery)({ name: 'created_to', required: false, description: 'Filter by created date to' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, description: 'Page number for pagination' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, description: 'Number of items per page' }),
    (0, swagger_1.ApiQuery)({ name: 'sort_by', required: false, description: 'Sort field' }),
    (0, swagger_1.ApiQuery)({ name: 'sort_order', required: false, description: 'Sort order (asc/desc)' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [customer_filters_dto_1.CustomerFiltersDto]),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Get customer statistics' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Customer statistics retrieved successfully' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "getCustomerStats", null);
__decorate([
    (0, common_1.Get)('user/:userId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get customer by user ID' }),
    (0, swagger_1.ApiParam)({ name: 'userId', description: 'User ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Customer retrieved successfully', type: customer_response_dto_1.CustomerResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Customer not found' }),
    __param(0, (0, common_1.Param)('userId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "findByUserId", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get customer by ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Customer ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Customer retrieved successfully', type: customer_response_dto_1.CustomerResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Customer not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update customer by ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Customer ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Customer updated successfully', type: customer_response_dto_1.CustomerResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Bad request - validation failed' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Customer not found' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Conflict - email already exists' }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('profile_picture')),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_customer_dto_1.UpdateCustomerDto, Object]),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Delete customer by ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Customer ID' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'Customer deleted successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Customer not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "remove", null);
exports.CustomersController = CustomersController = __decorate([
    (0, swagger_1.ApiTags)('Customers'),
    (0, common_1.Controller)('customers'),
    __metadata("design:paramtypes", [customers_service_1.CustomersService])
], CustomersController);
//# sourceMappingURL=customers.controller.js.map