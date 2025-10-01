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
exports.JobController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../../oauth/guards/jwt-auth.guard");
const roles_guard_1 = require("../../oauth/guards/roles.guard");
const decorators_1 = require("../../oauth/decorators");
const user_role_enum_1 = require("../../user-management/enums/user-role.enum");
let JobController = class JobController {
    async createJob(user, jobData) {
        return {
            message: '✅ Job created successfully!',
            createdBy: {
                id: user.id,
                email: user.email,
                role: user.role,
            },
            job: {
                id: 1,
                description: jobData.description || 'Sample job',
                status: 'pending',
                customerId: user.id,
            },
            note: 'RBAC working! Only customers (or admins) can create jobs.',
        };
    }
    async getMyJobs(user) {
        return {
            message: '✅ Your jobs retrieved',
            customerId: user.id,
            role: user.role,
            jobs: [
                { id: 1, description: 'Fix sink', status: 'pending' },
                { id: 2, description: 'Paint wall', status: 'completed' },
            ],
        };
    }
    async getAssignedJobs(user) {
        return {
            message: '✅ Assigned jobs retrieved',
            providerId: user.id,
            role: user.role,
            jobs: [
                { id: 1, description: 'Fix sink', status: 'in_progress', customer: 'John Doe' },
                { id: 3, description: 'Install lights', status: 'assigned', customer: 'Jane Smith' },
            ],
            note: 'RBAC working! Only providers (or admins) can see this.',
        };
    }
    async updateJobStatus(jobId, user, statusData) {
        return {
            message: '✅ Job status updated!',
            jobId,
            newStatus: statusData.status || 'completed',
            updatedBy: {
                id: user.id,
                email: user.email,
                role: user.role,
            },
            note: 'RBAC working! Only providers (or admins) can update job status.',
        };
    }
    async getAllJobs(user) {
        return {
            message: '✅ All jobs retrieved',
            viewedBy: {
                id: user.id,
                email: user.email,
                role: user.role,
            },
            totalJobs: 10,
            jobs: [
                { id: 1, description: 'Fix sink', status: 'pending', customer: 'John Doe' },
                { id: 2, description: 'Paint wall', status: 'completed', customer: 'Jane Smith' },
                { id: 3, description: 'Install lights', status: 'assigned', provider: 'Bob Builder' },
            ],
            note: 'RBAC working! Only LSM/Admin can see all jobs.',
        };
    }
    async deleteJob(jobId, user) {
        return {
            message: '✅ Job deleted!',
            jobId,
            deletedBy: {
                id: user.id,
                email: user.email,
                role: user.role,
            },
            note: 'RBAC working! Only admins can delete jobs.',
        };
    }
    async testAuth(user) {
        return {
            message: '✅ You are authenticated!',
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
            },
            note: 'This endpoint requires authentication but no specific role.',
        };
    }
};
exports.JobController = JobController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, decorators_1.Roles)(user_role_enum_1.UserRole.CUSTOMER),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new job (Customer only)' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Job created successfully' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - Customer role required' }),
    __param(0, (0, decorators_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], JobController.prototype, "createJob", null);
__decorate([
    (0, common_1.Get)('my-jobs'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, decorators_1.Roles)(user_role_enum_1.UserRole.CUSTOMER),
    (0, swagger_1.ApiOperation)({ summary: 'Get my jobs (Customer only)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Jobs retrieved' }),
    __param(0, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], JobController.prototype, "getMyJobs", null);
__decorate([
    (0, common_1.Get)('assigned'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, decorators_1.Roles)(user_role_enum_1.UserRole.PROVIDER),
    (0, swagger_1.ApiOperation)({ summary: 'Get assigned jobs (Provider only)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Assigned jobs retrieved' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - Provider role required' }),
    __param(0, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], JobController.prototype, "getAssignedJobs", null);
__decorate([
    (0, common_1.Put)(':id/status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, decorators_1.Roles)(user_role_enum_1.UserRole.PROVIDER),
    (0, swagger_1.ApiOperation)({ summary: 'Update job status (Provider only)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Job status updated' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - Provider role required' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, decorators_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", Promise)
], JobController.prototype, "updateJobStatus", null);
__decorate([
    (0, common_1.Get)('all'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, decorators_1.Roles)(user_role_enum_1.UserRole.LSM, user_role_enum_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get all jobs (LSM/Admin only)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'All jobs retrieved' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - LSM or Admin role required' }),
    __param(0, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], JobController.prototype, "getAllJobs", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, decorators_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a job (Admin only)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Job deleted' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - Admin role required' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], JobController.prototype, "deleteJob", null);
__decorate([
    (0, common_1.Get)('test-auth'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Test authentication (any authenticated user)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Authentication working' }),
    __param(0, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], JobController.prototype, "testAuth", null);
exports.JobController = JobController = __decorate([
    (0, common_1.Controller)('jobs'),
    (0, swagger_1.ApiTags)('Jobs'),
    (0, swagger_1.ApiBearerAuth)()
], JobController);
//# sourceMappingURL=job.controller.js.map