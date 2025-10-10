"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const bcrypt = __importStar(require("bcryptjs"));
const prisma_service_1 = require("../../../prisma/prisma.service");
const user_role_enum_1 = require("../users/enums/user-role.enum");
let OAuthService = class OAuthService {
    constructor(prisma, jwtService, configService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.configService = configService;
    }
    mapUserRoleToPrisma(role) {
        const normalizedRole = typeof role === 'string' ? role.toUpperCase() : role;
        switch (normalizedRole) {
            case user_role_enum_1.UserRole.CUSTOMER:
            case 'CUSTOMER':
                return 'customer';
            case user_role_enum_1.UserRole.PROVIDER:
            case 'PROVIDER':
                return 'service_provider';
            case user_role_enum_1.UserRole.LSM:
            case 'LSM':
                return 'local_service_manager';
            case user_role_enum_1.UserRole.ADMIN:
            case 'ADMIN':
                return 'admin';
            default:
                throw new common_1.BadRequestException(`Invalid role: ${role}. Valid roles are: CUSTOMER, PROVIDER, LSM, ADMIN`);
        }
    }
    convertExperienceToYears(experienceLevel) {
        const experienceMap = {
            'Less than 1 year': 0,
            '1-2 years': 1,
            '3-5 years': 3,
            '6-10 years': 6,
            'More than 10 years': 10,
        };
        return experienceMap[experienceLevel] ?? 0;
    }
    async hashPassword(password) {
        const saltRounds = 12;
        return bcrypt.hash(password, saltRounds);
    }
    async comparePassword(password, hash) {
        return bcrypt.compare(password, hash);
    }
    async register(registerDto) {
        const { email, password, firstName, lastName, phoneNumber, role, region, zipcode, address, location, experience, businessName, serviceType, experienceLevel, description, zipCodes, minPrice, maxPrice, acceptedTerms, } = registerDto;
        const existingUser = await this.prisma.users.findUnique({
            where: { email },
        });
        if (existingUser) {
            throw new common_1.ConflictException('User with this email already exists');
        }
        const hashedPassword = await this.hashPassword(password);
        const user = await this.prisma.$transaction(async (prisma) => {
            const newUser = await prisma.users.create({
                data: {
                    email,
                    password: hashedPassword,
                    first_name: firstName,
                    last_name: lastName,
                    phone_number: phoneNumber,
                    role: this.mapUserRoleToPrisma(role),
                },
            });
            switch (role) {
                case user_role_enum_1.UserRole.CUSTOMER:
                    if (!region) {
                        throw new common_1.BadRequestException('Region is required for customer registration. Please specify the region.');
                    }
                    await prisma.customers.create({
                        data: {
                            user: {
                                connect: { id: newUser.id }
                            },
                            address: address || 'Not provided',
                            region: region,
                            zipcode: zipcode || null,
                        },
                    });
                    break;
                case user_role_enum_1.UserRole.PROVIDER:
                    if (!region) {
                        throw new common_1.BadRequestException('Region is required for provider registration. Please specify the region.');
                    }
                    const availableLSM = await prisma.local_service_managers.findFirst({
                        where: {
                            status: 'active',
                            region: region
                        },
                        orderBy: { created_at: 'asc' }
                    });
                    if (!availableLSM) {
                        throw new common_1.BadRequestException(`No active LSM available in region "${region}". Please contact admin to create an LSM for this region.`);
                    }
                    const experienceYears = experienceLevel
                        ? this.convertExperienceToYears(experienceLevel)
                        : (experience || 0);
                    if (minPrice !== undefined && maxPrice !== undefined && maxPrice < minPrice) {
                        throw new common_1.BadRequestException('Maximum price must be greater than minimum price.');
                    }
                    const serviceProvider = await prisma.service_providers.create({
                        data: {
                            user_id: newUser.id,
                            business_name: businessName || null,
                            experience: experienceYears,
                            experience_level: experienceLevel || null,
                            description: description || null,
                            location: location || 'Not provided',
                            zipcode: zipCodes?.[0] || zipcode || null,
                            min_price: minPrice || null,
                            max_price: maxPrice || null,
                            lsm_id: availableLSM.id,
                            status: 'pending',
                            terms_accepted_at: acceptedTerms ? new Date() : null,
                        },
                    });
                    if (zipCodes && zipCodes.length > 0) {
                        await prisma.provider_service_areas.createMany({
                            data: zipCodes.map((zip, index) => ({
                                provider_id: serviceProvider.id,
                                zipcode: zip.trim(),
                                is_primary: index === 0,
                            })),
                            skipDuplicates: true,
                        });
                    }
                    if (serviceType) {
                        const service = await prisma.services.findFirst({
                            where: {
                                name: { equals: serviceType, mode: 'insensitive' },
                            },
                        });
                        if (service) {
                            await prisma.provider_services.create({
                                data: {
                                    provider_id: serviceProvider.id,
                                    service_id: service.id,
                                    is_active: true,
                                },
                            });
                        }
                    }
                    await prisma.notifications.create({
                        data: {
                            recipient_type: 'local_service_manager',
                            recipient_id: availableLSM.user_id,
                            type: 'system',
                            title: 'New Provider Registration',
                            message: `New service provider "${businessName || firstName + ' ' + lastName}" registered in your region. Review their onboarding application.`,
                        },
                    });
                    break;
                case user_role_enum_1.UserRole.LSM:
                    if (!region) {
                        throw new common_1.BadRequestException('Region is required for LSM registration. Please specify the region.');
                    }
                    const existingLSM = await prisma.local_service_managers.findFirst({
                        where: {
                            region: region,
                            status: 'active',
                        },
                        include: {
                            user: {
                                select: {
                                    first_name: true,
                                    last_name: true,
                                    email: true,
                                },
                            },
                        },
                    });
                    if (existingLSM) {
                        throw new common_1.ConflictException(`An active LSM already exists for region "${region}". ` +
                            `LSM: ${existingLSM.user.first_name} ${existingLSM.user.last_name} (${existingLSM.user.email}). ` +
                            `Only one LSM is allowed per region. Please contact admin to replace the existing LSM.`);
                    }
                    await prisma.local_service_managers.create({
                        data: {
                            user_id: newUser.id,
                            region: region,
                        },
                    });
                    break;
                case user_role_enum_1.UserRole.ADMIN:
                    await prisma.admin.create({
                        data: {
                            user_id: newUser.id,
                        },
                    });
                    break;
            }
            return newUser;
        });
        const tokens = await this.generateTokens(user);
        await this.updateRefreshToken(user.id, tokens.refreshToken);
        return {
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
            },
            ...tokens,
        };
    }
    async validateUser(email, password) {
        const user = await this.prisma.users.findUnique({
            where: { email },
        });
        if (!user) {
            return null;
        }
        const isPasswordValid = await this.comparePassword(password, user.password);
        if (!isPasswordValid) {
            return null;
        }
        await this.prisma.users.update({
            where: { id: user.id },
            data: { last_login: new Date() },
        });
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
    async login(user) {
        const tokens = await this.generateTokens(user);
        await this.updateRefreshToken(user.id, tokens.refreshToken);
        return {
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
            },
            ...tokens,
        };
    }
    async generateTokens(user) {
        const payload = {
            email: user.email,
            sub: user.id,
            role: user.role,
        };
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret: this.configService.get('JWT_SECRET'),
                expiresIn: this.configService.get('JWT_EXPIRES_IN', '24h'),
            }),
            this.jwtService.signAsync(payload, {
                secret: this.configService.get('JWT_SECRET'),
                expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
            }),
        ]);
        return {
            accessToken,
            refreshToken,
        };
    }
    async updateRefreshToken(userId, refreshToken) {
        const hashedRefreshToken = await this.hashPassword(refreshToken);
        await this.prisma.users.update({
            where: { id: userId },
            data: { refresh_token: hashedRefreshToken },
        });
    }
    async refreshTokens(refreshToken) {
        try {
            const payload = await this.jwtService.verifyAsync(refreshToken, {
                secret: this.configService.get('JWT_SECRET'),
            });
            const user = await this.prisma.users.findUnique({
                where: { id: payload.sub },
            });
            if (!user || !user.refresh_token) {
                throw new common_1.UnauthorizedException('Invalid refresh token');
            }
            const isRefreshTokenValid = await this.comparePassword(refreshToken, user.refresh_token);
            if (!isRefreshTokenValid) {
                throw new common_1.UnauthorizedException('Invalid refresh token');
            }
            const tokens = await this.generateTokens(user);
            await this.updateRefreshToken(user.id, tokens.refreshToken);
            return {
                ...tokens,
            };
        }
        catch (error) {
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
    }
    async getProfile(userId) {
        const user = await this.prisma.users.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                first_name: true,
                last_name: true,
                phone_number: true,
                role: true,
                created_at: true,
                updated_at: true,
                last_login: true,
                is_email_verified: true,
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        let roleSpecificData = null;
        switch (user.role) {
            case 'customer':
                roleSpecificData = await this.prisma.customers.findUnique({
                    where: { user_id: userId },
                    include: {
                        _count: {
                            select: {
                                jobs: true,
                                feedbacks: true,
                                chats: true,
                                service_requests: true,
                            },
                        },
                    },
                });
                break;
            case 'service_provider':
                roleSpecificData = await this.prisma.service_providers.findUnique({
                    where: { user_id: userId },
                    include: {
                        local_service_manager: {
                            select: {
                                id: true,
                                user: {
                                    select: {
                                        first_name: true,
                                        last_name: true,
                                        email: true,
                                    },
                                },
                                region: true,
                            },
                        },
                        service_areas: {
                            select: {
                                id: true,
                                zipcode: true,
                                is_primary: true,
                            },
                            orderBy: {
                                is_primary: 'desc',
                            },
                        },
                        documents: {
                            select: {
                                id: true,
                                file_name: true,
                                description: true,
                                status: true,
                                created_at: true,
                            },
                            orderBy: {
                                created_at: 'desc',
                            },
                        },
                        provider_services: {
                            include: {
                                service: {
                                    select: {
                                        id: true,
                                        name: true,
                                        category: true,
                                    },
                                },
                            },
                        },
                        _count: {
                            select: {
                                jobs: true,
                                feedbacks: true,
                                provider_services: true,
                                service_areas: true,
                                documents: true,
                            },
                        },
                    },
                });
                break;
            case 'local_service_manager':
                roleSpecificData = await this.prisma.local_service_managers.findUnique({
                    where: { user_id: userId },
                    include: {
                        _count: {
                            select: {
                                service_providers: true,
                                chats: true,
                            },
                        },
                    },
                });
                break;
            case 'admin':
                roleSpecificData = await this.prisma.admin.findUnique({
                    where: { user_id: userId },
                });
                break;
        }
        return {
            ...user,
            roleData: roleSpecificData,
        };
    }
    async logout(userId) {
        await this.prisma.users.update({
            where: { id: userId },
            data: { refresh_token: null },
        });
    }
    async updateProfile(userId, dto) {
        const updateData = {};
        if (dto.firstName !== undefined)
            updateData.first_name = dto.firstName;
        if (dto.lastName !== undefined)
            updateData.last_name = dto.lastName;
        if (dto.phoneNumber !== undefined)
            updateData.phone_number = dto.phoneNumber;
        if (dto.profilePicture !== undefined)
            updateData.profile_picture = dto.profilePicture;
        if (Object.keys(updateData).length === 0) {
            return this.prisma.users.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    email: true,
                    first_name: true,
                    last_name: true,
                    phone_number: true,
                    role: true,
                    profile_picture: true,
                    updated_at: true,
                },
            });
        }
        const updated = await this.prisma.users.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                email: true,
                first_name: true,
                last_name: true,
                phone_number: true,
                role: true,
                profile_picture: true,
                updated_at: true,
            },
        });
        return updated;
    }
};
exports.OAuthService = OAuthService;
exports.OAuthService = OAuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService])
], OAuthService);
//# sourceMappingURL=oauth.service.js.map