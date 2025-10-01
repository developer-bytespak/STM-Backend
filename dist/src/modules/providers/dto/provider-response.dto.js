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
exports.ProviderResponseDto = exports.PerformanceMetricsDto = exports.LSMResponseDto = exports.UserResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const client_1 = require("@prisma/client");
class UserResponseDto {
}
exports.UserResponseDto = UserResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Number)
], UserResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", String)
], UserResponseDto.prototype, "first_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", String)
], UserResponseDto.prototype, "last_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", String)
], UserResponseDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", String)
], UserResponseDto.prototype, "phone_number", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", String)
], UserResponseDto.prototype, "role", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Date)
], UserResponseDto.prototype, "created_at", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Date)
], UserResponseDto.prototype, "updated_at", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Boolean)
], UserResponseDto.prototype, "is_email_verified", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Date)
], UserResponseDto.prototype, "last_login", void 0);
__decorate([
    (0, class_transformer_1.Exclude)(),
    __metadata("design:type", String)
], UserResponseDto.prototype, "password", void 0);
__decorate([
    (0, class_transformer_1.Exclude)(),
    __metadata("design:type", String)
], UserResponseDto.prototype, "refresh_token", void 0);
class LSMResponseDto {
}
exports.LSMResponseDto = LSMResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Number)
], LSMResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", String)
], LSMResponseDto.prototype, "region", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", String)
], LSMResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Number)
], LSMResponseDto.prototype, "closed_deals_count", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Number)
], LSMResponseDto.prototype, "earnings", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Date)
], LSMResponseDto.prototype, "created_at", void 0);
class PerformanceMetricsDto {
}
exports.PerformanceMetricsDto = PerformanceMetricsDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Number)
], PerformanceMetricsDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Number)
], PerformanceMetricsDto.prototype, "job_count", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Number)
], PerformanceMetricsDto.prototype, "avg_rating", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Number)
], PerformanceMetricsDto.prototype, "punctuality_score", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Number)
], PerformanceMetricsDto.prototype, "avg_response_time", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Date)
], PerformanceMetricsDto.prototype, "created_at", void 0);
class ProviderResponseDto {
}
exports.ProviderResponseDto = ProviderResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Number)
], ProviderResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Number)
], ProviderResponseDto.prototype, "experience", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", String)
], ProviderResponseDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Number)
], ProviderResponseDto.prototype, "rating", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.ProviderTier }),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", String)
], ProviderResponseDto.prototype, "tier", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", String)
], ProviderResponseDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Boolean)
], ProviderResponseDto.prototype, "is_active", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.ProviderStatus }),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", String)
], ProviderResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Number)
], ProviderResponseDto.prototype, "earning", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Number)
], ProviderResponseDto.prototype, "total_jobs", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: UserResponseDto }),
    (0, class_transformer_1.Type)(() => UserResponseDto),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", UserResponseDto)
], ProviderResponseDto.prototype, "user", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: LSMResponseDto }),
    (0, class_transformer_1.Type)(() => LSMResponseDto),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", LSMResponseDto)
], ProviderResponseDto.prototype, "local_service_manager", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [PerformanceMetricsDto] }),
    (0, class_transformer_1.Type)(() => PerformanceMetricsDto),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Array)
], ProviderResponseDto.prototype, "performance_metrics", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", PerformanceMetricsDto)
], ProviderResponseDto.prototype, "latest_performance", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Number)
], ProviderResponseDto.prototype, "total_services_created", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Number)
], ProviderResponseDto.prototype, "total_available_services", void 0);
//# sourceMappingURL=provider-response.dto.js.map