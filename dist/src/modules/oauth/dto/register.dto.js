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
exports.RegisterDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const user_role_enum_1 = require("../../users/enums/user-role.enum");
const class_transformer_1 = require("class-transformer");
class RegisterDto {
}
exports.RegisterDto = RegisterDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User email address',
        example: 'user@example.com',
    }),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User phone number',
        example: '+1234567890',
    }),
    (0, class_validator_1.IsPhoneNumber)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "phoneNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User password',
        example: 'password123',
        minLength: 6,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(6),
    __metadata("design:type", String)
], RegisterDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User first name',
        example: 'John',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User last name',
        example: 'Doe',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User role',
        enum: user_role_enum_1.UserRole,
        example: user_role_enum_1.UserRole.CUSTOMER,
    }),
    (0, class_validator_1.IsEnum)(user_role_enum_1.UserRole),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "role", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Region (required for CUSTOMER and PROVIDER roles)',
        example: 'New York',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "region", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Zipcode for location-based assignment',
        example: '10001',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "zipcode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Address (required for CUSTOMER role)',
        example: '123 Main St, New York, NY 10001',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Location (required for PROVIDER role)',
        example: 'New York, NY',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Experience in years (for PROVIDER role)',
        example: 5,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], RegisterDto.prototype, "experience", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Business name (for PROVIDER role)',
        example: 'ABC Plumbing Services',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "businessName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Primary service type (for PROVIDER role)',
        example: 'Plumbing',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "serviceType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Experience level string (for PROVIDER role)',
        example: '3-5 years',
        enum: [
            'Less than 1 year',
            '1-2 years',
            '3-5 years',
            '6-10 years',
            'More than 10 years',
        ],
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "experienceLevel", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Service description (for PROVIDER role)',
        example: 'Professional plumbing services with 10+ years experience',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Array of service zip codes (for PROVIDER role)',
        example: ['10001', '10002', '10003'],
        type: [String],
    }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], RegisterDto.prototype, "zipCodes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Minimum service price in USD (for PROVIDER role)',
        example: 100,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Min)(0),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], RegisterDto.prototype, "minPrice", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Maximum service price in USD (for PROVIDER role)',
        example: 500,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Min)(0),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], RegisterDto.prototype, "maxPrice", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Terms and conditions acceptance (for PROVIDER role)',
        example: true,
    }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], RegisterDto.prototype, "acceptedTerms", void 0);
//# sourceMappingURL=register.dto.js.map