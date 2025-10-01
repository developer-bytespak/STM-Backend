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
exports.CustomerFiltersDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const client_1 = require("@prisma/client");
class CustomerFiltersDto {
    constructor() {
        this.page = 1;
        this.limit = 10;
        this.sort_by = 'created_at';
        this.sort_order = 'desc';
    }
}
exports.CustomerFiltersDto = CustomerFiltersDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Search by name or email' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CustomerFiltersDto.prototype, "search", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by email' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], CustomerFiltersDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by phone number' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CustomerFiltersDto.prototype, "phone_number", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by retention status' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.RetentionStatus),
    __metadata("design:type", String)
], CustomerFiltersDto.prototype, "retention_status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by email verification status' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => value === 'true'),
    __metadata("design:type", Boolean)
], CustomerFiltersDto.prototype, "is_email_verified", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by minimum total jobs' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CustomerFiltersDto.prototype, "min_total_jobs", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by maximum total jobs' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CustomerFiltersDto.prototype, "max_total_jobs", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by minimum total spent' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CustomerFiltersDto.prototype, "min_total_spent", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by maximum total spent' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CustomerFiltersDto.prototype, "max_total_spent", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by created date from' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CustomerFiltersDto.prototype, "created_from", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by created date to' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CustomerFiltersDto.prototype, "created_to", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Page number for pagination', minimum: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CustomerFiltersDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Number of items per page', minimum: 1, maximum: 100 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CustomerFiltersDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Sort field', enum: ['created_at', 'first_name', 'last_name', 'email', 'total_jobs', 'total_spent'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CustomerFiltersDto.prototype, "sort_by", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Sort order', enum: ['asc', 'desc'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CustomerFiltersDto.prototype, "sort_order", void 0);
//# sourceMappingURL=customer-filters.dto.js.map